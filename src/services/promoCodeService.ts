// Promo Code Service - Validate and apply promo codes
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  productId: string;
  categoryId?: string;
  price: number;
  quantity: number;
}

interface PromoValidationResult {
  valid: boolean;
  offerId?: string;
  discountType?: "percentage" | "flat" | "free_shipping";
  discountValue?: number;
  maxDiscount?: number;
  message: string;
  error?: string;
  calculatedDiscount?: number;
  applicableAmount?: number; // Amount the discount applies to
}

interface Offer {
  id: string;
  title: string;
  offer_type: string;
  discount_value: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  promo_code: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  applicable_to: string;
  applicable_ids: string[] | null;
  user_groups: string[] | null;
}

// Helper function to calculate applicable amount for product/category specific offers
export function calculateApplicableAmount(
  cartItems: CartItem[],
  applicableIds: string[],
  applicationType: 'product' | 'category'
): number {
  return cartItems
    .filter(item => {
      if (applicationType === 'product') {
        return applicableIds.includes(item.productId);
      } else {
        return item.categoryId && applicableIds.includes(item.categoryId);
      }
    })
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Validate promo code (new signature with cart items)
export async function validatePromoCode(
  code: string,
  orderAmount: number,
  cartItems: CartItem[],
  userId?: string,
  userType?: string
): Promise<PromoValidationResult> {
  try {
    if (!code || code.trim() === "") {
      return { valid: false, message: "Please enter a promo code" };
    }

    // Find the offer
    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .eq("promo_code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !offer) {
      return { valid: false, message: "Invalid or expired promo code" };
    }

    // Check dates
    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);

    if (now < startDate) {
      return { valid: false, message: "This promo code is not yet active" };
    }

    if (now > endDate) {
      return { valid: false, message: "This promo code has expired" };
    }

    // Check usage limit
    if (offer.usage_limit && offer.used_count >= offer.usage_limit) {
      return { valid: false, message: "This promo code has reached its usage limit" };
    }

    // Check minimum order amount
    if (offer.min_order_amount && orderAmount < offer.min_order_amount) {
      return { 
        valid: false, 
        message: `Minimum order amount is $${offer.min_order_amount}` 
      };
    }

    // Check first order restriction
    if (offer.applicable_to === "first_order" && userId) {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId)
        .neq("status", "cancelled");

      if ((count || 0) > 0) {
        return { valid: false, message: "This offer is only for first orders" };
      }
    }

    // Check user group restriction
    if (offer.applicable_to === "user_group" && offer.user_groups) {
      if (!userType || !offer.user_groups.includes(userType)) {
        return { valid: false, message: "This offer is not available for your account type" };
      }
    }

    // Extract product and category IDs from cart
    const productIds = cartItems.map(item => item.productId);
    const categoryIds = cartItems
      .map(item => item.categoryId)
      .filter((id): id is string => id !== undefined);

    // Check category restriction
    if (offer.applicable_to === "category" && offer.applicable_ids && categoryIds.length > 0) {
      const hasMatchingCategory = categoryIds.some(id => offer.applicable_ids!.includes(id));
      if (!hasMatchingCategory) {
        return { valid: false, message: "This offer is not applicable to items in your cart" };
      }
    }

    // Check product restriction
    if (offer.applicable_to === "product" && offer.applicable_ids && productIds.length > 0) {
      const hasMatchingProduct = productIds.some(id => offer.applicable_ids!.includes(id));
      if (!hasMatchingProduct) {
        return { valid: false, message: "This offer is not applicable to items in your cart" };
      }
    }

    // Calculate applicable amount based on offer type
    let applicableAmount = orderAmount; // Default to full order

    if (offer.applicable_to === "product" && offer.applicable_ids) {
      // Calculate only for matching products
      applicableAmount = calculateApplicableAmount(cartItems, offer.applicable_ids, 'product');
      
      if (applicableAmount === 0) {
        return { valid: false, message: "This offer is not applicable to items in your cart" };
      }
    } else if (offer.applicable_to === "category" && offer.applicable_ids) {
      // Calculate only for matching categories
      applicableAmount = calculateApplicableAmount(cartItems, offer.applicable_ids, 'category');
      
      if (applicableAmount === 0) {
        return { valid: false, message: "This offer is not applicable to items in your cart" };
      }
    }

    // Calculate discount based on applicable amount
    let calculatedDiscount = 0;
    
    if (offer.offer_type === "percentage") {
      calculatedDiscount = (applicableAmount * (offer.discount_value || 0)) / 100;
      if (offer.max_discount_amount && calculatedDiscount > offer.max_discount_amount) {
        calculatedDiscount = offer.max_discount_amount;
      }
    } else if (offer.offer_type === "flat") {
      calculatedDiscount = Math.min(offer.discount_value || 0, applicableAmount);
    } else if (offer.offer_type === "free_shipping") {
      // Free shipping - discount will be applied to shipping cost
      calculatedDiscount = 0; // Handled separately
    }

    const savingsMessage = offer.offer_type === "free_shipping" 
      ? `${offer.title} applied! Free shipping on this order`
      : `${offer.title} applied! You save $${calculatedDiscount.toFixed(2)}`;

    return {
      valid: true,
      offerId: offer.id,
      discountType: offer.offer_type as any,
      discountValue: offer.discount_value || 0,
      maxDiscount: offer.max_discount_amount || undefined,
      message: savingsMessage,
      calculatedDiscount,
      applicableAmount,
    };
  } catch (error: any) {
    console.error("Error validating promo code:", error);
    return { valid: false, message: "Error validating promo code" };
  }
}

// Backward compatible wrapper (deprecated - use validatePromoCode with cartItems)
export async function validatePromoCodeLegacy(
  code: string,
  orderAmount: number,
  userId?: string,
  userType?: string,
  categoryIds?: string[],
  productIds?: string[]
): Promise<PromoValidationResult> {
  // Convert to new format
  const cartItems: CartItem[] = [];
  
  if (productIds && productIds.length > 0) {
    // Create cart items from product IDs (price will be estimated)
    for (const productId of productIds) {
      cartItems.push({
        productId,
        categoryId: categoryIds?.[0], // Approximate
        price: orderAmount / productIds.length, // Estimate equal distribution
        quantity: 1
      });
    }
  } else {
    // Fallback: single item with full amount
    cartItems.push({
      productId: 'unknown',
      categoryId: categoryIds?.[0],
      price: orderAmount,
      quantity: 1
    });
  }
  
  return validatePromoCode(code, orderAmount, cartItems, userId, userType);
}

// Apply promo code (increment usage count)
export async function applyPromoCode(
  offerId: string,
  discountAmount: number
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("apply_promo_code", {
      p_offer_id: offerId,
      p_discount_amount: discountAmount,
    });

    if (error) {
      // Fallback to direct update if RPC doesn't exist
      const { data: offer } = await supabase
        .from("offers")
        .select("used_count, total_discount_given, total_orders")
        .eq("id", offerId)
        .single();

      if (offer) {
        await supabase
          .from("offers")
          .update({
            used_count: (offer.used_count || 0) + 1,
            total_discount_given: (offer.total_discount_given || 0) + discountAmount,
            total_orders: (offer.total_orders || 0) + 1,
          })
          .eq("id", offerId);
      }
    }

    return true;
  } catch (error) {
    console.error("Error applying promo code:", error);
    return false;
  }
}

// Get active offers for display
export async function getActiveOffers(): Promise<Offer[]> {
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
    return data || [];
  } catch (error) {
    console.error("Error fetching active offers:", error);
    return [];
  }
}

// Get auto-apply offers (no promo code required)
export async function getAutoApplyOffers(
  orderAmount: number,
  userType?: string,
  categoryIds?: string[],
  productIds?: string[]
): Promise<Offer[]> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true)
      .is("promo_code", null)
      .lte("start_date", now)
      .gte("end_date", now);

    if (error) throw error;
    if (!data) return [];

    // Filter offers based on conditions
    return data.filter(offer => {
      // Check min order amount
      if (offer.min_order_amount && orderAmount < offer.min_order_amount) {
        return false;
      }

      // Check usage limit
      if (offer.usage_limit && offer.used_count >= offer.usage_limit) {
        return false;
      }

      // Check user group
      if (offer.applicable_to === "user_group" && offer.user_groups) {
        if (!userType || !offer.user_groups.includes(userType)) {
          return false;
        }
      }

      // Check category
      if (offer.applicable_to === "category" && offer.applicable_ids && categoryIds) {
        if (!categoryIds.some(id => offer.applicable_ids!.includes(id))) {
          return false;
        }
      }

      // Check product
      if (offer.applicable_to === "product" && offer.applicable_ids && productIds) {
        if (!productIds.some(id => offer.applicable_ids!.includes(id))) {
          return false;
        }
      }

      return true;
    });
  } catch (error) {
    console.error("Error fetching auto-apply offers:", error);
    return [];
  }
}

// Calculate best discount from multiple offers
export function calculateBestDiscount(
  offers: Offer[],
  orderAmount: number
): { offer: Offer | null; discount: number } {
  let bestOffer: Offer | null = null;
  let bestDiscount = 0;

  for (const offer of offers) {
    let discount = 0;

    if (offer.offer_type === "percentage") {
      discount = (orderAmount * (offer.discount_value || 0)) / 100;
      if (offer.max_discount_amount && discount > offer.max_discount_amount) {
        discount = offer.max_discount_amount;
      }
    } else if (offer.offer_type === "flat") {
      discount = offer.discount_value || 0;
    }

    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestOffer = offer;
    }
  }

  return { offer: bestOffer, discount: bestDiscount };
}

// Helper function to prepare promo code display data
export function preparePromoDisplayData(
  validationResult: PromoValidationResult,
  offer: Offer,
  cartItems: CartItem[],
  productNames?: Map<string, string>
): {
  applicableItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    hasDiscount: boolean;
  }>;
  applicableTo: string;
} {
  const applicableItems = cartItems.map(item => {
    let hasDiscount = false;

    // Check if this item gets the discount
    if (offer.applicable_to === "all") {
      hasDiscount = true;
    } else if (offer.applicable_to === "product" && offer.applicable_ids) {
      hasDiscount = offer.applicable_ids.includes(item.productId);
    } else if (offer.applicable_to === "category" && offer.applicable_ids && item.categoryId) {
      hasDiscount = offer.applicable_ids.includes(item.categoryId);
    }

    return {
      id: item.productId,
      name: productNames?.get(item.productId) || `Product ${item.productId.slice(0, 8)}`,
      price: item.price,
      quantity: item.quantity,
      hasDiscount,
    };
  });

  return {
    applicableItems,
    applicableTo: offer.applicable_to,
  };
}

// Calculate item-level discounts for display
export function calculateItemDiscounts(
  cartItems: CartItem[],
  offer: Offer,
  totalDiscount: number
): Map<string, number> {
  const itemDiscounts = new Map<string, number>();

  if (offer.applicable_to === "all") {
    // Distribute discount proportionally across all items
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    cartItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      const itemDiscount = (itemTotal / totalAmount) * totalDiscount;
      itemDiscounts.set(item.productId, itemDiscount);
    });
  } else if (offer.applicable_to === "product" && offer.applicable_ids) {
    // Calculate discount only for matching products
    const applicableItems = cartItems.filter(item => 
      offer.applicable_ids!.includes(item.productId)
    );
    const applicableAmount = applicableItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    applicableItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      const itemDiscount = (itemTotal / applicableAmount) * totalDiscount;
      itemDiscounts.set(item.productId, itemDiscount);
    });
  } else if (offer.applicable_to === "category" && offer.applicable_ids) {
    // Calculate discount only for matching categories
    const applicableItems = cartItems.filter(item => 
      item.categoryId && offer.applicable_ids!.includes(item.categoryId)
    );
    const applicableAmount = applicableItems.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    );

    applicableItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      const itemDiscount = (itemTotal / applicableAmount) * totalDiscount;
      itemDiscounts.set(item.productId, itemDiscount);
    });
  }

  return itemDiscounts;
}
