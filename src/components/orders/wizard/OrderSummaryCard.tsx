import { CartItem } from "@/store/types/cartTypes";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import { useState, useMemo, memo } from "react";
import { cn } from "@/lib/utils";

export interface OrderSummaryCardProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  onEditItems?: () => void;
  className?: string;
}

const OrderSummaryCardComponent = ({
  items,
  subtotal,
  tax,
  shipping,
  total,
  onEditItems,
  className,
}: OrderSummaryCardProps) => {
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  
  // Memoize item count calculation
  const itemCount = useMemo(() => 
    items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  return (
    <Card
      className={cn(
        "bg-white shadow-lg border border-gray-200 animate-fade-in",
        // Desktop: fixed sidebar positioning
        "lg:sticky lg:top-8 lg:h-fit",
        // Mobile: full width
        "w-full",
        className
      )}
      role="region"
      aria-label="Order summary"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 pb-3 sm:pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" aria-hidden="true" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Order Summary
            </h3>
          </div>
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm"
            aria-label={`${itemCount} ${itemCount === 1 ? "item" : "items"} in cart`}
          >
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Items List (Collapsible) */}
      {items.length > 0 && (
        <>
          <div className="px-4 sm:px-6 py-3 sm:py-4">
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
                      <p className="font-medium text-gray-900 truncate text-xs sm:text-sm">
                        {item.name}
                      </p>
                      <p className="text-gray-500 text-xs">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-medium text-gray-900 text-xs sm:text-sm" aria-label={`Item total: $${(item.price * item.quantity).toFixed(2)}`}>
                        ${(item.price * item.quantity).toFixed(2)}
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
        </>
      )}

      {/* Pricing Breakdown */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3" role="region" aria-label="Pricing breakdown">
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium text-gray-900" aria-label={`Subtotal: $${subtotal.toFixed(2)}`}>
            ${subtotal.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-600">Tax</span>
          <span className="font-medium text-gray-900" aria-label={`Tax: $${tax.toFixed(2)}`}>
            ${tax.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-600">Shipping</span>
          <span className="font-medium text-gray-900" aria-label={shipping === 0 ? "Shipping: Free" : `Shipping: $${shipping.toFixed(2)}`}>
            {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
          </span>
        </div>

        <Separator className="my-2 sm:my-3" role="presentation" />

        {/* Total Amount */}
        <div className="flex justify-between items-center pt-1 sm:pt-2">
          <span className="text-sm sm:text-base font-semibold text-gray-900">Total</span>
          <span className="text-xl sm:text-2xl font-bold text-green-600" aria-label={`Order total: $${total.toFixed(2)}`}>
            ${total.toFixed(2)}
          </span>
        </div>
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
    </Card>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const OrderSummaryCard = memo(OrderSummaryCardComponent);
