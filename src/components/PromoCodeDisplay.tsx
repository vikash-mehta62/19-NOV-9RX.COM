import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Tag, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromoCodeDisplayProps {
  promoCode: string;
  discountAmount: number;
  applicableAmount: number;
  totalAmount: number;
  applicableTo: "all" | "product" | "category" | "user_group" | "first_order";
  applicableItems?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    hasDiscount: boolean;
  }>;
  discountType: "percentage" | "flat" | "free_shipping";
  discountValue: number;
}

export function PromoCodeDisplay({
  promoCode,
  discountAmount,
  applicableAmount,
  totalAmount,
  applicableTo,
  applicableItems = [],
  discountType,
  discountValue,
}: PromoCodeDisplayProps) {
  const isPartialDiscount = applicableAmount < totalAmount;

  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-900">Promo Code Applied</span>
          </div>
          <Badge variant="secondary" className="font-mono">
            {promoCode}
          </Badge>
        </div>

        {/* Discount Summary */}
        <div className="flex items-center justify-between py-2 border-t border-green-200">
          <span className="text-sm text-green-800">
            {discountType === "percentage" && `${discountValue}% off`}
            {discountType === "flat" && `$${discountValue} off`}
            {discountType === "free_shipping" && "Free Shipping"}
          </span>
          <span className="font-bold text-green-900">
            -${discountAmount.toFixed(2)}
          </span>
        </div>

        {/* Applicable Scope Indicator */}
        {applicableTo !== "all" && (
          <div className="bg-white rounded-md p-3 border border-green-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {applicableTo === "product" && "Applied to specific products"}
                  {applicableTo === "category" && "Applied to specific categories"}
                  {applicableTo === "user_group" && "Applied to your account type"}
                  {applicableTo === "first_order" && "First order discount"}
                </p>
                
                {isPartialDiscount && (
                  <p className="text-xs text-gray-600">
                    Discount applies to ${applicableAmount.toFixed(2)} of ${totalAmount.toFixed(2)} total
                  </p>
                )}
              </div>
            </div>

            {/* Show which items have discount */}
            {applicableItems.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-gray-700">Items in this offer:</p>
                <div className="space-y-1">
                  {applicableItems.map((item) => {
                    // Calculate item discount
                    const itemTotal = item.price * item.quantity;
                    let itemDiscount = 0;
                    
                    if (item.hasDiscount) {
                      // Calculate this item's share of the total discount
                      if (discountType === "percentage") {
                        itemDiscount = (itemTotal * discountValue) / 100;
                      } else if (discountType === "flat") {
                        // For flat discounts, distribute proportionally among discounted items
                        const discountedItemsTotal = applicableItems
                          .filter(i => i.hasDiscount)
                          .reduce((sum, i) => sum + (i.price * i.quantity), 0);
                        itemDiscount = (itemTotal / discountedItemsTotal) * discountAmount;
                      }
                    }
                    
                    const discountedPrice = itemTotal - itemDiscount;
                    
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-start gap-3 text-xs py-3 px-3 rounded-md",
                          item.hasDiscount
                            ? "bg-green-100 text-green-900"
                            : "bg-gray-50 text-gray-500"
                        )}
                      >
                        {/* Icon */}
                        {item.hasDiscount ? (
                          <Tag className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="h-4 w-4 flex-shrink-0" />
                        )}
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Product Name */}
                          <div className="font-semibold text-sm text-gray-900">
                            {item.name}
                          </div>
                          
                          {/* Price Row */}
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-gray-600 text-xs whitespace-nowrap">
                              Qty: {item.quantity}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.hasDiscount ? (
                                <>
                                  <span className="line-through text-gray-400 text-xs whitespace-nowrap">
                                    ${itemTotal.toFixed(2)}
                                  </span>
                                  <span className="font-bold text-green-700 text-sm whitespace-nowrap">
                                    ${discountedPrice.toFixed(2)}
                                  </span>
                                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-green-200 text-green-800 whitespace-nowrap">
                                    Discounted
                                  </Badge>
                                </>
                              ) : (
                                <span className="font-medium text-sm whitespace-nowrap">${itemTotal.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Products Indicator */}
        {applicableTo === "all" && (
          <div className="flex items-center gap-2 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4" />
            <span>Applied to entire order</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for cart summary
export function PromoCodeBadge({
  promoCode,
  discountAmount,
  applicableTo,
  onRemove,
}: {
  promoCode: string;
  discountAmount: number;
  applicableTo: string;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-md">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-green-600" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-green-900">
              {promoCode}
            </span>
            {applicableTo !== "all" && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {applicableTo === "product" && "Specific items"}
                {applicableTo === "category" && "Category"}
              </Badge>
            )}
          </div>
          <span className="text-xs text-green-700">
            Saving ${discountAmount.toFixed(2)}
          </span>
        </div>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          Remove
        </button>
      )}
    </div>
  );
}

// Inline item discount indicator
export function ItemDiscountBadge({
  originalPrice,
  discountedPrice,
  promoCode,
}: {
  originalPrice: number;
  discountedPrice: number;
  promoCode: string;
}) {
  const savings = originalPrice - discountedPrice;
  const percentOff = Math.round((savings / originalPrice) * 100);

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm line-through text-gray-400">
        ${originalPrice.toFixed(2)}
      </span>
      <span className="text-sm font-semibold text-green-600">
        ${discountedPrice.toFixed(2)}
      </span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
        <Tag className="h-2.5 w-2.5 mr-1" />
        {promoCode} (-{percentOff}%)
      </Badge>
    </div>
  );
}
