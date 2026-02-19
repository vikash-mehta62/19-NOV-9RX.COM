import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PromoCodeDisplay } from "@/components/PromoCodeDisplay";
import { 
  validatePromoCode as validatePromoCodeNew, 
  preparePromoDisplayData, 
  calculateApplicableAmount,
  calculateItemDiscounts,
  type CartItem 
} from "@/services/promoCodeService";
import {
  Tag,
  Gift,
  Percent,
  Truck,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Star,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Wallet,
} from "lucide-react";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  offer_type: "percentage" | "flat" | "buy_get" | "free_shipping";
  discount_value: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  promo_code: string | null;
}

// Redeemed reward from reward_redemptions table
interface RedeemedReward {
  id: string;
  reward_name: string;
  reward_type: string;
  reward_value: number;
  points_spent: number;
  expires_at: string;
  status: string;
}

// Credit Memo interface
interface CreditMemo {
  id: string;
  memo_number: string;
  amount: number;
  balance: number;
  reason: string;
  status: string;
  expires_at: string;
}

interface AppliedDiscount {
  type: "promo" | "rewards" | "offer" | "redeemed_reward" | "credit_memo";
  name: string;
  amount: number;
  offerId?: string;
  promoCode?: string;
  pointsUsed?: number;
  redemptionId?: string;
  rewardType?: string;
  creditMemoId?: string;
  // Add item-level discount information
  itemDiscounts?: Map<string, number>; // productId -> discount amount
  discountType?: "percentage" | "flat" | "free_shipping";
  discountValue?: number;
  applicableTo?: string;
}

interface PromoDisplayData {
  promoCode: string;
  discountAmount: number;
  applicableAmount: number;
  totalAmount: number;
  applicableTo: "all" | "product" | "category" | "user_group" | "first_order";
  applicableItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    hasDiscount: boolean;
  }>;
  discountType: "percentage" | "flat" | "free_shipping";
  discountValue: number;
  offer: any;
}

interface PromoAndRewardsSectionProps {
  customerId?: string;
  subtotal: number;
  shipping?: number; // Shipping cost to include in credit memo calculation
  hasFreeShipping?: boolean; // User already has free shipping from profile
  onDiscountChange: (discounts: AppliedDiscount[], totalDiscount: number) => void;
  cartItems?: { productId: string; categoryId?: string; price: number; quantity: number; name?: string }[];
}

export function PromoAndRewardsSection({
  customerId,
  subtotal,
  shipping = 0,
  hasFreeShipping = false,
  onDiscountChange,
  cartItems = [],
}: PromoAndRewardsSectionProps) {
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedDiscount | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoDisplayData, setPromoDisplayData] = useState<PromoDisplayData | null>(null);

  // Rewards state
  const [userRewards, setUserRewards] = useState<{
    points: number;
    tier: string | null;
    pointValue: number;
  } | null>(null);
  const [useRewards, setUseRewards] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  // Available offers state
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);
  const [showOffers, setShowOffers] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);

  // Redeemed rewards state (from reward_redemptions table)
  const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
  const [appliedRedeemedReward, setAppliedRedeemedReward] = useState<RedeemedReward | null>(null);
  const [loadingRedeemed, setLoadingRedeemed] = useState(false);

  // Credit Memo state
  const [creditMemos, setCreditMemos] = useState<CreditMemo[]>([]);
  const [appliedCreditMemo, setAppliedCreditMemo] = useState<{ memo: CreditMemo; amountUsed: number } | null>(null);
  const [creditMemoAmountToUse, setCreditMemoAmountToUse] = useState(0);
  const [loadingCreditMemos, setLoadingCreditMemos] = useState(false);
  const [totalCreditBalance, setTotalCreditBalance] = useState(0);

  // Fetch redeemed rewards that are pending and not expired
  useEffect(() => {
    const fetchRedeemedRewards = async () => {
      if (!customerId) return;

      setLoadingRedeemed(true);
      try {
        const now = new Date().toISOString();
        const { data, error } = await (supabase as any)
          .from("reward_redemptions")
          .select("id, reward_name, reward_type, reward_value, points_spent, expires_at, status")
          .eq("user_id", customerId)
          .eq("status", "pending")
          .gt("expires_at", now)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching redeemed rewards:", error);
          return;
        }

        console.log("Fetched redeemed rewards:", data);
        
        // Filter out free shipping rewards if user already has free shipping
        let filteredRewards = data || [];
        if (hasFreeShipping) {
          filteredRewards = filteredRewards.filter(
            (r: RedeemedReward) => r.reward_type !== "shipping" && r.reward_type !== "free_shipping"
          );
        }
        
        setRedeemedRewards(filteredRewards);
      } catch (error) {
        console.error("Error fetching redeemed rewards:", error);
      } finally {
        setLoadingRedeemed(false);
      }
    };

    fetchRedeemedRewards();
  }, [customerId, hasFreeShipping]);

  // Fetch available credit memos
  useEffect(() => {
    const fetchCreditMemos = async () => {
      if (!customerId) return;

      setLoadingCreditMemos(true);
      try {
        const { data, error } = await (supabase as any)
          .from("credit_memos")
          .select("id, memo_number, amount, balance, reason, status, expires_at")
          .eq("customer_id", customerId)
          .in("status", ["issued", "partially_applied"])
          .gt("balance", 0)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching credit memos:", error);
          return;
        }

        setCreditMemos(data || []);
        
        // Calculate total available balance
        const totalBalance = (data || []).reduce((sum, m) => sum + (m.balance || 0), 0);
        setTotalCreditBalance(totalBalance);
      } catch (error) {
        console.error("Error fetching credit memos:", error);
      } finally {
        setLoadingCreditMemos(false);
      }
    };

    fetchCreditMemos();
  }, [customerId]);

  // Fetch user rewards
  useEffect(() => {
    const fetchUserRewards = async () => {
      if (!customerId) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("reward_points, reward_tier")
          .eq("id", customerId)
          .single();

        if (error) throw error;

        if (data) {
          // Get point value from rewards_config
          // points_per_dollar = how many points earned per $1
          // For redemption: if you earn 1 point per $1, then 100 points = $1 (point value = $0.01)
          const { data: config } = await (supabase as any)
            .from("rewards_config")
            .select("points_per_dollar, point_redemption_value")
            .limit(1)
            .maybeSingle();

          // Use point_redemption_value if set, otherwise calculate from points_per_dollar
          // Default: 100 points = $1, so 1 point = $0.01
          let pointValue = 0.01;
          if (config?.point_redemption_value) {
            pointValue = Number(config.point_redemption_value);
          } else if (config?.points_per_dollar) {
            // If earning 1 point per $1, redemption value = $0.01 per point (100 points = $1)
            pointValue = 1 / (Number(config.points_per_dollar) * 100);
          }

          setUserRewards({
            points: data.reward_points || 0,
            tier: data.reward_tier,
            pointValue,
          });
        }
      } catch (error) {
        console.error("Error fetching rewards:", error);
      }
    };

    fetchUserRewards();
  }, [customerId]);

  // Fetch available offers
  useEffect(() => {
    const fetchOffers = async () => {
      setLoadingOffers(true);
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("offers")
          .select("*")
          .eq("is_active", true)
          .lte("start_date", now)
          .gte("end_date", now)
          .order("discount_value", { ascending: false });

        if (error) throw error;

        const userType = sessionStorage.getItem("userType");
        const productIds = cartItems.map((item) => item.productId);

        // Fetch product categories for cart items (for category filtering)
        let cartCategories: string[] = [];
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, category")
            .in("id", productIds);
          cartCategories = (products || []).map((p) => p.category).filter(Boolean);
        }

        // Filter offers based on all criteria
        const qualifyingOffers = (data || []).filter((offer) => {
          // Check min order amount
          if (offer.min_order_amount && subtotal < offer.min_order_amount) {
            return false;
          }

          // Check usage limit
          if (offer.usage_limit && offer.used_count >= offer.usage_limit) {
            return false;
          }

          // Check applicable_to restrictions
          if (offer.applicable_to === "user_group" && offer.user_groups) {
            if (!userType || !offer.user_groups.includes(userType)) {
              return false;
            }
          }

          // For category offers: applicable_ids should contain category NAMES (strings)
          if (offer.applicable_to === "category") {
            // If no applicable_ids specified, reject (invalid configuration)
            if (!offer.applicable_ids || offer.applicable_ids.length === 0) {
              console.warn(`Offer ${offer.title} has category restriction but no applicable_ids`);
              return false;
            }
            // Check if any cart item's category matches
            const hasMatch = cartCategories.some((cat) => offer.applicable_ids.includes(cat));
            if (!hasMatch) {
              return false;
            }
          }

          // For product offers: applicable_ids should contain product IDs (UUIDs)
          if (offer.applicable_to === "product") {
            // If no applicable_ids specified, reject (invalid configuration)
            if (!offer.applicable_ids || offer.applicable_ids.length === 0) {
              console.warn(`Offer ${offer.title} has product restriction but no applicable_ids`);
              return false;
            }
            // Check if any cart item's product ID matches
            const hasMatch = productIds.some((id) => offer.applicable_ids.includes(id));
            if (!hasMatch) {
              return false;
            }
          }

          // For "all" offers, always qualify (no restrictions)
          // For "first_order" and "user_group", already checked above

          return true;
        });

        setAvailableOffers(qualifyingOffers as Offer[]);
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, [subtotal, cartItems]);

  // Calculate and notify parent of discount changes
  useEffect(() => {
    const discounts: AppliedDiscount[] = [];
    let totalDiscount = 0;

    // Add promo discount
    if (appliedPromo) {
      console.log('=== DISCOUNT CHANGE EFFECT ===');
      console.log('appliedPromo:', appliedPromo);
      console.log('appliedPromo.itemDiscounts:', appliedPromo.itemDiscounts);
      
      discounts.push(appliedPromo);
      totalDiscount += appliedPromo.amount;
    }

    // Add credit memo discount
    if (appliedCreditMemo) {
      discounts.push({
        type: "credit_memo",
        name: `Credit Memo ${appliedCreditMemo.memo.memo_number}`,
        amount: appliedCreditMemo.amountUsed,
        creditMemoId: appliedCreditMemo.memo.id,
      });
      totalDiscount += appliedCreditMemo.amountUsed;
    }

    // Add redeemed reward discount
    if (appliedRedeemedReward) {
      let rewardDiscount = 0;
      const rewardType = appliedRedeemedReward.reward_type;
      const rewardValue = Number(appliedRedeemedReward.reward_value) || 0;
      
      // Handle different reward types
      if (rewardType === "discount" || rewardType === "discount_percent") {
        // Percentage discount on subtotal
        rewardDiscount = (subtotal * rewardValue) / 100;
      } else if (rewardType === "credit" || rewardType === "store_credit") {
        // Fixed amount discount (can't exceed remaining total)
        rewardDiscount = Math.min(rewardValue, subtotal - totalDiscount);
      }
      // shipping/free_shipping is handled separately in shipping calculation
      
      // For free_shipping, we still need to add it to discounts so OrderCreationWizard knows
      if (rewardType === "shipping" || rewardType === "free_shipping") {
        discounts.push({
          type: "redeemed_reward",
          name: appliedRedeemedReward.reward_name,
          amount: 0, // No direct discount, shipping is handled separately
          redemptionId: appliedRedeemedReward.id,
          rewardType: rewardType,
        });
      } else if (rewardDiscount > 0) {
        discounts.push({
          type: "redeemed_reward",
          name: appliedRedeemedReward.reward_name,
          amount: rewardDiscount,
          redemptionId: appliedRedeemedReward.id,
          rewardType: rewardType,
        });
        totalDiscount += rewardDiscount;
      }
    }

    // Add rewards discount (points)
    if (useRewards && pointsToUse > 0 && userRewards) {
      const rewardsDiscount = pointsToUse * userRewards.pointValue;
      discounts.push({
        type: "rewards",
        name: `${pointsToUse} Reward Points`,
        amount: rewardsDiscount,
        pointsUsed: pointsToUse,
      });
      totalDiscount += rewardsDiscount;
    }

    console.log('=== CALLING onDiscountChange ===');
    console.log('discounts array:', discounts);
    console.log('totalDiscount:', totalDiscount);
    
    onDiscountChange(discounts, totalDiscount);
  }, [appliedPromo, appliedCreditMemo, appliedRedeemedReward, useRewards, pointsToUse, userRewards, subtotal, onDiscountChange]);

  // Validate promo code
  const handleApplyPromo = async () => {
      if (!promoCode.trim()) {
        setPromoError("Please enter a promo code");
        return;
      }

      setIsValidating(true);
      setPromoError("");

      try {
        // Get product IDs from cart
        const productIds = cartItems.map(item => item.productId);
        
        // Fetch product details (name and category) for validation and display
        const { data: products } = await supabase
          .from("products")
          .select("id, name, category")
          .in("id", productIds);

        const productMap = new Map(
          products?.map(p => [p.id, { name: p.name, category: p.category }]) || []
        );

        // Convert cart items to CartItem format with categories
        const cartItemsForValidation: CartItem[] = cartItems.map(item => ({
          productId: item.productId,
          categoryId: productMap.get(item.productId)?.category || item.categoryId,
          price: item.price,
          quantity: item.quantity
        }));

        // Use new validation service
        const userType = sessionStorage.getItem("userType") || undefined;
        const result = await validatePromoCodeNew(
          promoCode.toUpperCase(),
          subtotal,
          cartItemsForValidation,
          customerId,
          userType
        );

        if (!result.valid) {
          setPromoError(result.error || "Invalid promo code");
          return;
        }

        // Fetch offer details for display
        const { data: offer, error: offerError } = await supabase
          .from("offers")
          .select("*")
          .eq("id", result.offerId)
          .single();

        if (offerError || !offer) {
          setPromoError("Failed to load offer details");
          return;
        }

        // Prepare product names map for display
        const productNames = new Map(
          products?.map(p => [p.id, p.name]) || []
        );

        // Prepare display data
        const displayData = preparePromoDisplayData(
          result,
          offer,
          cartItemsForValidation,
          productNames
        );

        // Calculate item-level discounts
        const itemDiscounts = calculateItemDiscounts(
          cartItemsForValidation,
          offer,
          result.calculatedDiscount || 0
        );

        console.log('=== PROMO APPLY DEBUG ===');
        console.log('offer:', offer);
        console.log('result.calculatedDiscount:', result.calculatedDiscount);
        console.log('cartItemsForValidation:', cartItemsForValidation);
        console.log('itemDiscounts Map:', itemDiscounts);
        console.log('itemDiscounts size:', itemDiscounts.size);
        console.log('itemDiscounts entries:', Array.from(itemDiscounts.entries()));

        // Set applied promo with item discounts
        setAppliedPromo({
          type: "promo",
          name: offer.title,
          amount: result.calculatedDiscount,
          offerId: offer.id,
          promoCode: promoCode.toUpperCase(),
          itemDiscounts: itemDiscounts,
          discountType: result.discountType,
          discountValue: result.discountValue,
          applicableTo: offer.applicable_to,
        });

        // Set display data
        setPromoDisplayData({
          promoCode: promoCode.toUpperCase(),
          discountAmount: result.calculatedDiscount,
          applicableAmount: result.applicableAmount,
          totalAmount: subtotal,
          applicableTo: offer.applicable_to as any,
          applicableItems: displayData.applicableItems,
          discountType: result.discountType as any,
          discountValue: result.discountValue,
          offer: offer
        });

        toast({
          title: "Promo Code Applied! 🎉",
          description: `${offer.title} - You save $${result.calculatedDiscount.toFixed(2)}`,
        });

        setPromoCode("");
      } catch (error) {
        console.error("Error validating promo:", error);
        setPromoError("Failed to validate promo code");
      } finally {
        setIsValidating(false);
      }
    }

  // Remove applied promo
  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDisplayData(null);
    toast({
      title: "Promo Removed",
      description: "Promo code has been removed from your order",
    });
  };

  // Handle rewards toggle
  const handleRewardsToggle = (checked: boolean) => {
    setUseRewards(checked);
    if (checked && userRewards) {
      // Default to using all available points (up to order total)
      // Use Math.round to avoid floating point precision issues
      const maxPointsValue = subtotal / userRewards.pointValue;
      const maxPoints = Math.min(userRewards.points, Math.round(maxPointsValue));
      setPointsToUse(maxPoints);
    } else {
      setPointsToUse(0);
    }
  };

  // Apply offer directly
  const handleApplyOffer = async (offer: any) => {
      try {
        // Check first order restriction
        if (offer.applicable_to === "first_order" && customerId) {
          const { count } = await (supabase as any)
            .from("orders")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", customerId)
            .neq("status", "cancelled");

          if ((count || 0) > 0) {
            toast({
              title: "Cannot Apply Offer",
              description: "This offer is only valid for first orders",
              variant: "destructive",
            });
            return;
          }
        }

        // Get product IDs from cart
        const productIds = cartItems.map(item => item.productId);

        // Fetch product details (name and category) for validation and display
        const { data: products } = await supabase
          .from("products")
          .select("id, name, category")
          .in("id", productIds);

        const productMap = new Map(
          products?.map(p => [p.id, { name: p.name, category: p.category }]) || []
        );

        // Convert cart items to CartItem format with categories
        const cartItemsForValidation: CartItem[] = cartItems.map(item => ({
          productId: item.productId,
          categoryId: productMap.get(item.productId)?.category || item.categoryId,
          price: item.price,
          quantity: item.quantity
        }));

        // Calculate applicable amount based on offer type
        let applicableAmount = subtotal;

        if (offer.applicable_to === "product" && offer.applicable_ids) {
          applicableAmount = calculateApplicableAmount(cartItemsForValidation, offer.applicable_ids, 'product');
        } else if (offer.applicable_to === "category" && offer.applicable_ids) {
          applicableAmount = calculateApplicableAmount(cartItemsForValidation, offer.applicable_ids, 'category');
        }

        // Calculate discount
        let discountAmount = 0;
        if (offer.offer_type === "percentage") {
          discountAmount = (applicableAmount * (offer.discount_value || 0)) / 100;
          if (offer.max_discount_amount) {
            discountAmount = Math.min(discountAmount, offer.max_discount_amount);
          }
        } else if (offer.offer_type === "flat") {
          discountAmount = Math.min(offer.discount_value || 0, applicableAmount);
        }

        // Prepare product names map for display
        const productNames = new Map(
          products?.map(p => [p.id, p.name]) || []
        );

        // Prepare display data
        const displayData = preparePromoDisplayData(
          {
            valid: true,
            offerId: offer.id,
            discountType: offer.offer_type,
            discountValue: offer.discount_value,
            message: '',
            calculatedDiscount: discountAmount,
            applicableAmount: applicableAmount
          },
          offer,
          cartItemsForValidation,
          productNames
        );

        // Calculate item-level discounts
        const itemDiscounts = calculateItemDiscounts(
          cartItemsForValidation,
          offer,
          discountAmount
        );

        // Set applied promo with item discounts
        setAppliedPromo({
          type: "offer",
          name: offer.title,
          amount: discountAmount,
          offerId: offer.id,
          promoCode: offer.promo_code || undefined,
          itemDiscounts: itemDiscounts,
          discountType: offer.offer_type,
          discountValue: offer.discount_value,
          applicableTo: offer.applicable_to,
        });

        // Set display data
        setPromoDisplayData({
          promoCode: offer.promo_code || offer.title,
          discountAmount: discountAmount,
          applicableAmount: applicableAmount,
          totalAmount: subtotal,
          applicableTo: offer.applicable_to as any,
          applicableItems: displayData.applicableItems,
          discountType: offer.offer_type as any,
          discountValue: offer.discount_value,
          offer: offer
        });

        toast({
          title: "Offer Applied! 🎉",
          description: `${offer.title} - You save $${discountAmount.toFixed(2)}`,
        });

        setShowOffers(false);
      } catch (error) {
        console.error("Error applying offer:", error);
        toast({
          title: "Error",
          description: "Failed to apply offer",
          variant: "destructive",
        });
      }
    }

  // Apply redeemed reward
  const handleApplyRedeemedReward = (reward: RedeemedReward) => {
    setAppliedRedeemedReward(reward);
    
    let discountDescription = "";
    if (reward.reward_type === "discount_percent") {
      discountDescription = `${reward.reward_value}% off your order`;
    } else if (reward.reward_type === "store_credit") {
      discountDescription = `$${reward.reward_value} store credit`;
    } else if (reward.reward_type === "free_shipping") {
      discountDescription = "Free shipping on this order";
    }

    toast({
      title: "Reward Applied! 🎁",
      description: `${reward.reward_name} - ${discountDescription}`,
    });
  };

  // Remove applied redeemed reward
  const handleRemoveRedeemedReward = () => {
    setAppliedRedeemedReward(null);
    toast({
      title: "Reward Removed",
      description: "Redeemed reward has been removed from your order",
    });
  };

  // Apply credit memo
  const handleApplyCreditMemo = (memo: CreditMemo, amount: number) => {
    // Calculate max amount that can be applied (can cover subtotal + shipping, minus other discounts)
    const otherDiscounts = (appliedPromo?.amount || 0) + 
      (appliedRedeemedReward ? calculateRedeemedRewardDiscount() : 0) +
      (useRewards && userRewards ? pointsToUse * userRewards.pointValue : 0);
    // Credit memo can cover subtotal + shipping (full order total before tax)
    const orderTotalBeforeTax = subtotal + shipping;
    const maxApplicable = Math.min(memo.balance, orderTotalBeforeTax - otherDiscounts);
    const amountToApply = Math.min(amount, maxApplicable);

    if (amountToApply <= 0) {
      toast({
        title: "Cannot Apply Credit Memo",
        description: "Order total is already covered by other discounts",
        variant: "destructive",
      });
      return;
    }

    setAppliedCreditMemo({ memo, amountUsed: amountToApply });
    setCreditMemoAmountToUse(amountToApply);

    // Update local state - reduce balance from this memo and total
    // This prevents double usage in same session
    const newBalance = memo.balance - amountToApply;
    
    // Update credit memos list - if balance becomes 0, remove from list
    if (newBalance <= 0) {
      setCreditMemos(prev => prev.filter(m => m.id !== memo.id));
    } else {
      setCreditMemos(prev => prev.map(m => 
        m.id === memo.id ? { ...m, balance: newBalance } : m
      ));
    }
    
    // Update total credit balance
    setTotalCreditBalance(prev => Math.max(0, prev - amountToApply));

    toast({
      title: "Credit Memo Applied! 💳",
      description: `${memo.memo_number} - $${amountToApply.toFixed(2)} applied to your order`,
    });
  };

  // Remove applied credit memo - restore the balance
  const handleRemoveCreditMemo = () => {
    if (appliedCreditMemo) {
      const { memo, amountUsed } = appliedCreditMemo;
      
      // Restore the balance back to the memo
      const existingMemo = creditMemos.find(m => m.id === memo.id);
      if (existingMemo) {
        // Memo still in list, just update balance
        setCreditMemos(prev => prev.map(m => 
          m.id === memo.id ? { ...m, balance: m.balance + amountUsed } : m
        ));
      } else {
        // Memo was removed (balance was 0), add it back
        setCreditMemos(prev => [...prev, { ...memo, balance: amountUsed }]);
      }
      
      // Restore total credit balance
      setTotalCreditBalance(prev => prev + amountUsed);
    }
    
    setAppliedCreditMemo(null);
    setCreditMemoAmountToUse(0);
    toast({
      title: "Credit Memo Removed",
      description: "Credit memo has been removed from your order",
    });
  };

  // Helper to calculate redeemed reward discount
  const calculateRedeemedRewardDiscount = () => {
    if (!appliedRedeemedReward) return 0;
    const rewardType = appliedRedeemedReward.reward_type;
    const rewardValue = Number(appliedRedeemedReward.reward_value) || 0;
    
    if (rewardType === "discount" || rewardType === "discount_percent") {
      return (subtotal * rewardValue) / 100;
    } else if (rewardType === "credit" || rewardType === "store_credit") {
      return Math.min(rewardValue, subtotal);
    }
    return 0;
  };

  const getOfferIcon = (type: string) => {
    switch (type) {
      case "percentage":
        return <Percent className="h-4 w-4" />;
      case "flat":
        return <DollarSign className="h-4 w-4" />;
      case "free_shipping":
        return <Truck className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "discount_percent":
        return <Percent className="h-4 w-4" />;
      case "store_credit":
        return <DollarSign className="h-4 w-4" />;
      case "free_shipping":
        return <Truck className="h-4 w-4" />;
      default:
        return <Gift className="h-4 w-4" />;
    }
  };

  const formatExpiryDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 0) return "Expired";
    if (daysLeft === 1) return "Expires tomorrow";
    if (daysLeft <= 7) return `Expires in ${daysLeft} days`;
    return `Expires ${date.toLocaleDateString()}`;
  };

  const maxRewardsDiscount = userRewards
    ? Math.min(
        userRewards.points * userRewards.pointValue,
        subtotal - (appliedPromo?.amount || 0)
      )
    : 0;

  // Calculate max points that can be used (use Math.round to avoid floating point issues)
  const maxPointsCanUse = userRewards
    ? Math.min(
        userRewards.points,
        Math.round(maxRewardsDiscount / userRewards.pointValue)
      )
    : 0;

  return (
    <div className="space-y-4">
      {/* Promo Code Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="h-4 w-4 text-blue-600" />
            Promo Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appliedPromo && promoDisplayData ? (
            <div className="space-y-3">
              <PromoCodeDisplay
                promoCode={promoDisplayData.promoCode}
                discountAmount={promoDisplayData.discountAmount}
                applicableAmount={promoDisplayData.applicableAmount}
                totalAmount={promoDisplayData.totalAmount}
                applicableTo={promoDisplayData.applicableTo}
                applicableItems={promoDisplayData.applicableItems}
                discountType={promoDisplayData.discountType}
                discountValue={promoDisplayData.discountValue}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemovePromo}
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Remove Promo Code
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoError("");
                  }}
                  className="flex-1 min-w-0 uppercase"
                  onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                />
                <Button
                  onClick={handleApplyPromo}
                  disabled={isValidating || !promoCode.trim()}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto shrink-0"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
              {promoError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {promoError}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Rewards Points Section */}
      {userRewards && userRewards.points > 0 && (
        <Card className={useRewards ? "border-amber-200 bg-amber-50/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Reward Points</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {userRewards.tier && (
                    <Badge variant="outline" className="text-xs">
                      <Star className="h-3 w-3 mr-1 text-amber-500" />
                      {userRewards.tier}
                    </Badge>
                  )}
                  <Badge className="bg-amber-100 text-amber-800 text-xs">
                    {userRewards.points.toLocaleString()} pts
                  </Badge>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Use Reward Points</Label>
                <p className="text-xs text-muted-foreground">
                  {userRewards.points} points = ${(userRewards.points * userRewards.pointValue).toFixed(2)}
                </p>
              </div>
              <Switch
                checked={useRewards}
                onCheckedChange={handleRewardsToggle}
              />
            </div>

            {useRewards && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>Points to redeem:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={maxPointsCanUse}
                      value={pointsToUse}
                      onChange={(e) =>
                        setPointsToUse(
                          Math.min(
                            parseInt(e.target.value) || 0,
                            maxPointsCanUse
                          )
                        )
                      }
                      className="w-24 h-8 text-center"
                    />
                    <span className="text-muted-foreground">pts</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Discount:</span>
                  <span className="text-green-600">
                    -${(pointsToUse * userRewards.pointValue).toFixed(2)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setPointsToUse(maxPointsCanUse);
                  }}
                >
                  Use Maximum ({maxPointsCanUse} pts)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Offers Section */}
      {availableOffers.length > 0 && !appliedPromo && (
        <Card>
          <CardHeader className="pb-3">
            <button
              className="w-full flex items-center justify-between gap-2"
              onClick={() => setShowOffers(!showOffers)}
            >
              <CardTitle className="text-sm flex items-center gap-2 whitespace-nowrap">
                <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                <span>Offers ({availableOffers.length})</span>
              </CardTitle>
              {showOffers ? (
                <ChevronUp className="h-4 w-4 text-gray-500 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
              )}
            </button>
          </CardHeader>
          {showOffers && (
            <CardContent className="space-y-2">
              {loadingOffers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                availableOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                        {getOfferIcon(offer.offer_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 break-words">{offer.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {offer.offer_type === "percentage" &&
                            `${offer.discount_value}% off`}
                          {offer.offer_type === "flat" &&
                            `$${offer.discount_value} off`}
                          {offer.offer_type === "free_shipping" && "Free shipping"}
                          {offer.min_order_amount &&
                            ` • Min $${offer.min_order_amount}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyOffer(offer)}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50 w-full"
                    >
                      Apply
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Redeemed Rewards Section - Show rewards user has already redeemed */}
      {redeemedRewards.length > 0 && (
        <Card className={appliedRedeemedReward ? "border-pink-200 bg-pink-50/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-pink-600 shrink-0" />
                  <span>Your Redeemed Rewards</span>
                </div>
                <Badge className="bg-pink-100 text-pink-800 w-fit text-xs">
                  {redeemedRewards.length} available
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appliedRedeemedReward ? (
              <div className="flex items-center justify-between p-3 bg-pink-50 border border-pink-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                    {getRewardIcon(appliedRedeemedReward.reward_type)}
                  </div>
                  <div>
                    <p className="font-medium text-pink-800">{appliedRedeemedReward.reward_name}</p>
                    <p className="text-sm text-pink-600">
                      {(appliedRedeemedReward.reward_type === "discount" || appliedRedeemedReward.reward_type === "discount_percent") && `${appliedRedeemedReward.reward_value}% off`}
                      {(appliedRedeemedReward.reward_type === "credit" || appliedRedeemedReward.reward_type === "store_credit") && `$${appliedRedeemedReward.reward_value} credit`}
                      {(appliedRedeemedReward.reward_type === "shipping" || appliedRedeemedReward.reward_type === "free_shipping") && "Free shipping"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveRedeemedReward}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              loadingRedeemed ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : (
                redeemedRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="p-3 border border-pink-100 rounded-lg hover:bg-pink-50 transition-colors space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 shrink-0">
                        {getRewardIcon(reward.reward_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm break-words">{reward.reward_name}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {(reward.reward_type === "discount" || reward.reward_type === "discount_percent") && `${reward.reward_value}% off`}
                            {(reward.reward_type === "credit" || reward.reward_type === "store_credit") && `$${reward.reward_value} credit`}
                            {(reward.reward_type === "shipping" || reward.reward_type === "free_shipping") && "Free shipping"}
                          </span>
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="h-3 w-3" />
                            {formatExpiryDate(reward.expires_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApplyRedeemedReward(reward)}
                      className="bg-pink-600 hover:bg-pink-700 text-white w-full"
                    >
                      Apply
                    </Button>
                  </div>
                ))
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* Credit Memo Section */}
      {(creditMemos.length > 0 || totalCreditBalance > 0) && (
        <Card className={appliedCreditMemo ? "border-blue-200 bg-blue-50/50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Credit Memo Balance</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 w-fit text-xs">
                  ${totalCreditBalance.toFixed(2)} available
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appliedCreditMemo ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">{appliedCreditMemo.memo.memo_number}</p>
                    <p className="text-sm text-emerald-600">
                      Saving ${appliedCreditMemo.amountUsed.toFixed(2)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCreditMemo}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              loadingCreditMemos ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : creditMemos.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-2">
                  No credit memos available
                </p>
              ) : (
                creditMemos.map((memo) => (
                  <div
                    key={memo.id}
                    className="p-3 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm break-words">{memo.memo_number}</p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className="text-emerald-600 font-medium">
                            ${memo.balance.toFixed(2)} available
                          </span>
                          {memo.expires_at && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Clock className="h-3 w-3" />
                              {formatExpiryDate(memo.expires_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 break-words">
                          {memo.reason}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleApplyCreditMemo(memo, memo.balance)}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                    >
                      Apply
                    </Button>
                  </div>
                ))
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
