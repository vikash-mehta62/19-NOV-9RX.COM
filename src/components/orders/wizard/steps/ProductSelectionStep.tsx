import { useState, memo, useCallback, useMemo } from "react";
import ProductShowcase from "@/components/pharmacy/ProductShowcase";
import { useCart } from "@/hooks/use-cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Package, ShoppingCart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export interface ProductSelectionStepProps {
  onCartUpdate?: () => void;
}

const ProductSelectionStepComponent = ({ onCartUpdate }: ProductSelectionStepProps) => {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const [showCustomization, setShowCustomization] = useState(false);
  const { toast } = useToast();

  // Memoize total item count to prevent unnecessary recalculations
  const totalItemCount = useMemo(() => 
    cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const handleRemoveItem = useCallback(async (productId: string) => {
    try {
      await removeFromCart(productId);
      onCartUpdate?.();
      toast({
        title: "Item Removed",
        description: "Product removed from cart",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    }
  }, [removeFromCart, onCartUpdate, toast]);

  const handleQuantityChange = useCallback(async (productId: string, sizeId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateQuantity(productId, newQuantity, sizeId);
      onCartUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  }, [updateQuantity, onCartUpdate, toast]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Select Products</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Browse and add products to your order
          </p>
        </div>
        {cartItems.length > 0 && (
          <Badge variant="secondary" className="text-sm sm:text-lg px-3 py-1 sm:px-4 sm:py-2 self-start sm:self-auto" aria-label={`${totalItemCount} ${totalItemCount === 1 ? "item" : "items"} in cart`}>
            <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" aria-hidden="true" />
            {totalItemCount} {totalItemCount === 1 ? "Item" : "Items"}
          </Badge>
        )}
      </div>

      <Separator />

      {/* Current Cart Items */}
      {cartItems.length > 0 && (
        <Card role="region" aria-label="Current order items">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" aria-hidden="true" />
              Current Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-4" role="list" aria-label="Cart items">
                {cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md animate-fade-in"
                    role="listitem"
                  >
                    {/* Product Image */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                        aria-hidden="true"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {item.name}
                      </h4>
                      
                      {/* Size Details */}
                      <div className="mt-2 space-y-2">
                        {item.sizes?.map((size: any, index: number) => (
                          <div
                            key={`${size.id}-${index}`}
                            className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">
                                {size.size_value} {size.size_unit}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {size.type === "unit" ? "Unit" : "Case"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 transition-all duration-200 hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px]"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      size.id,
                                      size.quantity - 1
                                    )
                                  }
                                  disabled={size.quantity <= 1}
                                  aria-label={`Decrease quantity for ${size.size_value} ${size.size_unit}`}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center font-medium" aria-label={`Quantity: ${size.quantity}`}>
                                  {size.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 transition-all duration-200 hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px]"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      size.id,
                                      size.quantity + 1
                                    )
                                  }
                                  aria-label={`Increase quantity for ${size.size_value} ${size.size_unit}`}
                                >
                                  +
                                </Button>
                              </div>
                              <span className="font-semibold text-gray-900 min-w-[80px] text-right">
                                ${(size.price * size.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total Price for Item */}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Item Total:</span>
                        <span className="font-bold text-gray-900">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200 hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px]"
                      onClick={() => handleRemoveItem(item.productId)}
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Product Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Browse Products</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductShowcase groupShow={true} isEditing={false} />
        </CardContent>
      </Card>
    </div>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const ProductSelectionStep = memo(ProductSelectionStepComponent);
