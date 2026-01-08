import { CartItem } from "@/store/types/cartTypes";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, ShoppingCart, Tag, Gift, Package, Sparkles, ArrowRight } from "lucide-react";
import { useState, useMemo, memo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PromoAndRewardsSection } from "./PromoAndRewardsSection";

interface AppliedDiscount {
  type: "promo" | "rewards" | "offer" | "redeemed_reward";
  name: string;
  amount: number;
  offerId?: string;
  promoCode?: string;
  pointsUsed?: number;
  redemptionId?: string;
  rewardType?: string;
}

export interface OrderSummaryCardProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  onEditItems?: () => void;
  className?: string;
  customerId?: string;
  hasFreeShipping?: boolean;
  onDiscountChange?: (discounts: AppliedDiscount[], totalDiscount: number) => void;
}

const OrderSummaryCardComponent = ({
  items,
  subtotal,
  tax,
  shipping,
  total,
  onEditItems,
  className,
  customerId,
  hasFreeShipping = false,
  onDiscountChange,
}: OrderSummaryCardProps) => {
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedDiscount[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);
  
  // Memoize item count calculation
  const itemCount = useMemo(() => 
    items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  // Handle discount changes from PromoAndRewardsSection
  const handleDiscountChange = useCallback((discounts: AppliedDiscount[], discount: number) => {
    setAppliedDiscounts(discounts);
    setTotalDiscount(discount);
    onDiscountChange?.(discounts, discount);
  }, [onDiscountChange]);

  // Calculate final total with discounts
  const finalTotal = useMemo(() => {
    return Math.max(0, total - totalDiscount);
  }, [total, totalDiscount]);

  // Empty Cart State Component
  const EmptyCartState = () => (
    <div className="px-4 sm:px-6 py-6 sm:py-8">
      <div className="text-center">
        {/* Animated Icon */}
        <div className="relative mx-auto w-20 h-20 mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full animate-pulse"></div>
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center shadow-inner">
            <Package className="w-8 h-8 text-blue-500" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-400 animate-bounce" />
        </div>
        
        {/* Message */}
        <h4 className="text-base font-semibold text-gray-800 mb-1">
          Your cart is empty
        </h4>
        <p className="text-sm text-gray-500 mb-4">
          Browse our products and add items to get started
        </p>
        
        {/* Quick Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 text-left space-y-2">
          <p className="text-xs font-medium text-blue-700 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Quick Tips
          </p>
          <ul className="text-xs text-gray-600 space-y-1.5">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
              <span>Search products by name or SKU</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
              <span>Click on a product to see available sizes</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
              <span>Add custom items if needed</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <Card
      className={cn(
        "bg-white shadow-lg border border-gray-200 rounded-xl overflow-hidden",
        "lg:sticky lg:top-8 lg:h-fit",
        "w-full max-w-full",
        className
      )}
      role="region"
      aria-label="Order summary"
    >
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-white/90" aria-hidden="true" />
            <h3 className="text-base sm:text-lg font-semibold text-white">
              Order Summary
            </h3>
          </div>
          <Badge
            className="bg-white/20 text-white hover:bg-white/30 text-xs sm:text-sm border-0"
            aria-label={`${itemCount} ${itemCount === 1 ? "item" : "items"} in cart`}
          >
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </Badge>
        </div>
      </div>

      {/* Empty Cart State or Items List */}
      {items.length === 0 ? (
        <EmptyCartState />
      ) : (
        <>
          {/* Items List (Collapsible) */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto hover:bg-transparent min-h-[44px]"
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              aria-expanded={isItemsExpanded}
              aria-controls="order-items-list"
              aria-label={isItemsExpanded ? "Collapse items list" : "Expand items list"}
            >
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                Items in order
              </span>
              {isItemsExpanded ? (
                <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" aria-hidden="true" />
              )}
            </Button>

            {isItemsExpanded && (
              <div 
                id="order-items-list"
                className="mt-3 sm:mt-4 space-y-2 sm:space-y-3 max-h-48 sm:max-h-64 overflow-y-auto animate-slide-up"
                role="list"
                aria-label="Order items"
              >
                {items.map((item, index) => (
                  <div
                    key={`${item.productId}-${index}`}
                    className="flex gap-2 sm:gap-3 text-xs sm:text-sm transition-all duration-200 hover:bg-gray-50 rounded p-1"
                    role="listitem"
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover flex-shrink-0"
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-xs sm:text-sm" title={item.name}>
                        {item.name}
                      </p>
                      {item.sku && (
                        <p className="text-gray-400 text-xs">
                          SKU: {item.sku}
                        </p>
                      )}
                      {/* Show sizes with SKU */}
                      {item.sizes && item.sizes.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.sizes.map((size: any, sizeIdx: number) => (
                            <div key={sizeIdx} className="text-xs text-gray-500">
                              <span>{size.size_value} {size.size_unit} × {size.quantity}</span>
                              {size.sku && <span className="text-gray-400 ml-1">(SKU: {size.sku})</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium text-gray-900 text-xs sm:text-sm">
                        ${(item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0
                          ? item.sizes.reduce((sum, size) => sum + ((size.quantity || 0) * (size.price || 0)), 0)
                          : item.price
                        ).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {onEditItems && (
              <Button
                variant="link"
                className="w-full mt-2 sm:mt-3 text-blue-600 hover:text-blue-700 p-0 h-auto text-xs sm:text-sm transition-all duration-200 hover:scale-105 min-h-[44px]"
                onClick={onEditItems}
                aria-label="Edit order items"
              >
                Edit items
              </Button>
            )}
          </div>

          <Separator />

          {/* Promo & Rewards Section */}
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            <PromoAndRewardsSection
              customerId={customerId}
              subtotal={subtotal}
              shipping={shipping}
              hasFreeShipping={hasFreeShipping}
              onDiscountChange={handleDiscountChange}
            />
          </div>

          <Separator />

          {/* Pricing Breakdown */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3" role="region" aria-label="Pricing breakdown">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">
                ${subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium text-gray-900">
                ${tax.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium text-gray-900">
                {shipping === 0 ? "FREE" : `${shipping.toFixed(2)}`}
              </span>
            </div>

            {/* Applied Discounts */}
            {appliedDiscounts.length > 0 && (
              <>
                <Separator className="my-2" />
                {appliedDiscounts.map((discount, index) => (
                  <div key={index} className="flex justify-between text-xs sm:text-sm">
                    <span className="text-blue-600 flex items-center gap-1">
                      {discount.type === "promo" && <Tag className="h-3 w-3" />}
                      {discount.type === "rewards" && <Gift className="h-3 w-3" />}
                      {discount.type === "offer" && <Tag className="h-3 w-3" />}
                      {discount.name}
                    </span>
                    <span className="font-medium text-blue-600">
                      -${discount.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </>
            )}

            <Separator className="my-2 sm:my-3" role="presentation" />

            {/* Total Amount */}
            <div className="flex justify-between items-center pt-1 sm:pt-2">
              <span className="text-sm sm:text-base font-semibold text-gray-900">Total</span>
              <div className="text-right">
                {totalDiscount > 0 && (
                  <span className="text-sm text-gray-400 line-through mr-2">
                    ${total.toFixed(2)}
                  </span>
                )}
                <span className="text-xl sm:text-2xl font-bold text-blue-600">
                  ${finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {totalDiscount > 0 && (
              <div className="text-right">
                <Badge className="bg-green-100 text-green-800 text-xs">
                  You save ${totalDiscount.toFixed(2)}!
                </Badge>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="px-4 sm:px-6 pb-4 sm:pb-6" role="note" aria-label="Order notes">
            <div className="bg-gray-50 rounded-lg p-2 sm:p-3 space-y-1">
              <p className="text-xs text-gray-600">
                * Tax calculated based on shipping address
              </p>
              <p className="text-xs text-gray-600 hidden sm:block">
                * Shipping costs may vary based on location
              </p>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const OrderSummaryCard = memo(OrderSummaryCardComponent);
