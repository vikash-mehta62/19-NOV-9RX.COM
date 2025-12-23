import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface AppliedDiscount {
  type: "promo" | "rewards" | "offer";
  name: string;
  amount: number;
  offerId?: string;
  promoCode?: string;
  pointsUsed?: number;
}

interface PromoAndRewardsSectionProps {
  customerId?: string;
  subtotal: number;
  onDiscountChange: (discounts: AppliedDiscount[], totalDiscount: number) => void;
}

export function PromoAndRewardsSection({
  customerId,
  subtotal,
  onDiscountChange,
}: PromoAndRewardsSectionProps) {
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<AppliedDiscount | null>(null);
  const [promoError, setPromoError] = useState("");

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
          const { data: config } = await supabase
            .from("rewards_config")
            .select("points_per_dollar, point_redemption_value")
            .limit(1)
            .single();

          // Use point_redemption_value if set, otherwise calculate from points_per_dollar
          // Default: 100 points = $1, so 1 point = $0.01
          let pointValue = 0.01;
          if (config?.point_redemption_value) {
            pointValue = config.point_redemption_value;
          } else if (config?.points_per_dollar) {
            // If earning 1 point per $1, redemption value = $0.01 per point (100 points = $1)
            pointValue = 1 / (config.points_per_dollar * 100);
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

        // Filter offers based on min order amount
        const qualifyingOffers = (data || []).filter((offer) => {
          if (offer.min_order_amount && subtotal < offer.min_order_amount) {
            return false;
          }
          return true;
        });

        setAvailableOffers(qualifyingOffers);
      } catch (error) {
        console.error("Error fetching offers:", error);
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, [subtotal]);

  // Calculate and notify parent of discount changes
  useEffect(() => {
    const discounts: AppliedDiscount[] = [];
    let totalDiscount = 0;

    // Add promo discount
    if (appliedPromo) {
      discounts.push(appliedPromo);
      totalDiscount += appliedPromo.amount;
    }

    // Add rewards discount
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

    onDiscountChange(discounts, totalDiscount);
  }, [appliedPromo, useRewards, pointsToUse, userRewards, onDiscountChange]);

  // Validate promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }

    setIsValidating(true);
    setPromoError("");

    try {
      // Find the offer with this promo code
      const { data: offer, error } = await supabase
        .from("offers")
        .select("*")
        .eq("promo_code", promoCode.toUpperCase())
        .eq("is_active", true)
        .lte("start_date", new Date().toISOString())
        .gte("end_date", new Date().toISOString())
        .single();

      if (error || !offer) {
        setPromoError("Invalid or expired promo code");
        return;
      }

      // Check usage limit
      if (offer.usage_limit && offer.used_count >= offer.usage_limit) {
        setPromoError("This promo code has reached its usage limit");
        return;
      }

      // Check minimum order amount
      if (offer.min_order_amount && subtotal < offer.min_order_amount) {
        setPromoError(
          `Minimum order amount of $${offer.min_order_amount.toFixed(2)} required`
        );
        return;
      }

      // Calculate discount
      let discountAmount = 0;
      if (offer.offer_type === "percentage") {
        discountAmount = (subtotal * (offer.discount_value || 0)) / 100;
        if (offer.max_discount_amount) {
          discountAmount = Math.min(discountAmount, offer.max_discount_amount);
        }
      } else if (offer.offer_type === "flat") {
        discountAmount = offer.discount_value || 0;
      } else if (offer.offer_type === "free_shipping") {
        // Free shipping is handled separately
        discountAmount = 0;
      }

      setAppliedPromo({
        type: "promo",
        name: offer.title,
        amount: discountAmount,
        offerId: offer.id,
        promoCode: promoCode.toUpperCase(),
      });

      toast({
        title: "Promo Code Applied! 🎉",
        description: `${offer.title} - You save $${discountAmount.toFixed(2)}`,
      });

      setPromoCode("");
    } catch (error) {
      console.error("Error validating promo:", error);
      setPromoError("Failed to validate promo code");
    } finally {
      setIsValidating(false);
    }
  };

  // Remove applied promo
  const handleRemovePromo = () => {
    setAppliedPromo(null);
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
      const maxPointsValue = subtotal / userRewards.pointValue;
      const maxPoints = Math.min(userRewards.points, Math.floor(maxPointsValue));
      setPointsToUse(maxPoints);
    } else {
      setPointsToUse(0);
    }
  };

  // Apply offer directly
  const handleApplyOffer = (offer: Offer) => {
    let discountAmount = 0;
    if (offer.offer_type === "percentage") {
      discountAmount = (subtotal * (offer.discount_value || 0)) / 100;
      if (offer.max_discount_amount) {
        discountAmount = Math.min(discountAmount, offer.max_discount_amount);
      }
    } else if (offer.offer_type === "flat") {
      discountAmount = offer.discount_value || 0;
    }

    setAppliedPromo({
      type: "offer",
      name: offer.title,
      amount: discountAmount,
      offerId: offer.id,
    });

    toast({
      title: "Offer Applied! 🎉",
      description: `${offer.title} - You save $${discountAmount.toFixed(2)}`,
    });

    setShowOffers(false);
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

  const maxRewardsDiscount = userRewards
    ? Math.min(
        userRewards.points * userRewards.pointValue,
        subtotal - (appliedPromo?.amount || 0)
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
          {appliedPromo ? (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{appliedPromo.name}</p>
                  <p className="text-sm text-green-600">
                    {appliedPromo.promoCode && `Code: ${appliedPromo.promoCode} • `}
                    Saving ${appliedPromo.amount.toFixed(2)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemovePromo}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoError("");
                  }}
                  className="flex-1 uppercase"
                  onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                />
                <Button
                  onClick={handleApplyPromo}
                  disabled={isValidating || !promoCode.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
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
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-amber-600" />
                Reward Points
                {userRewards.tier && (
                  <Badge variant="outline" className="text-xs">
                    <Star className="h-3 w-3 mr-1 text-amber-500" />
                    {userRewards.tier}
                  </Badge>
                )}
              </div>
              <Badge className="bg-amber-100 text-amber-800">
                {userRewards.points.toLocaleString()} pts available
              </Badge>
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
                      max={Math.min(
                        userRewards.points,
                        Math.floor(maxRewardsDiscount / userRewards.pointValue)
                      )}
                      value={pointsToUse}
                      onChange={(e) =>
                        setPointsToUse(
                          Math.min(
                            parseInt(e.target.value) || 0,
                            userRewards.points,
                            Math.floor(maxRewardsDiscount / userRewards.pointValue)
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
                    const maxPoints = Math.min(
                      userRewards.points,
                      Math.floor(maxRewardsDiscount / userRewards.pointValue)
                    );
                    setPointsToUse(maxPoints);
                  }}
                >
                  Use Maximum ({Math.min(
                    userRewards.points,
                    Math.floor(maxRewardsDiscount / userRewards.pointValue)
                  )} pts)
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
              className="w-full flex items-center justify-between"
              onClick={() => setShowOffers(!showOffers)}
            >
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                Available Offers ({availableOffers.length})
              </CardTitle>
              {showOffers ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
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
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        {getOfferIcon(offer.offer_type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{offer.title}</p>
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
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
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
    </div>
  );
}
