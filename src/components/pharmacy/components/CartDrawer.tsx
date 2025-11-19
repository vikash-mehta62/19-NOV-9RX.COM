import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const CartDrawer = () => {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const shippingCost =
    sessionStorage.getItem("shipping") === "true"
      ? 0
      : Math.max(...cartItems.map((item) => item.shipping_cost || 0));

  const total = cartItems.reduce((sum, item) => {
    const itemTotal = item.sizes.reduce(
      (sizeSum, size) => sizeSum + size.price * size.quantity,
      0
    );
    return sum + itemTotal + (sessionStorage.getItem("shipping") === "true" ? 0 : shippingCost);
  }, 0);

  const handleQuantityChange = async (
    productId: string,
    newQuantity: number,
    sizeId: string
  ) => {
    const success = await updateQuantity(productId, newQuantity, sizeId);
    if (!success) {
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const handleRemoveItem = async (productId: string) => {
    const success = await removeFromCart(productId);
    toast({
      title: success ? "Item Removed" : "Error",
      description: success
        ? "Item has been removed from your cart"
        : "Failed to remove item",
      variant: success ? "default" : "destructive",
    });
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      const orderItems = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || "",
        shipping_cost: item.shipping_cost,
      }));
      localStorage.setItem("pendingOrderItems", JSON.stringify(orderItems));
      setIsOpen(false);

      const userType = sessionStorage.getItem("userType")?.toLowerCase();
      if (userType === "group") navigate("/group/order");
      else if (userType === "pharmacy") navigate("/pharmacy/order");
      else if (userType === "admin") navigate("/admin/orders", { state: { createOrder: true } });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process checkout",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {cartItems.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center font-bold">
              {cartItems.length}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">Shopping Cart</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-[90vh] pt-4">
          <ScrollArea className="flex-1 space-y-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-center text-gray-600">
                <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">Your cart is empty</p>
                <p className="text-sm text-gray-500">Add items to get started</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.productId}
                  className="flex gap-4 p-4 rounded-lg bg-gray-50 shadow-sm"
                >
                  <img
                    src={`https://cfyqeilfmodrbiamqgme.supabase.co/storage/v1/object/public/product-images/${item.image}`}
                    onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                    alt={item.name}
                    className="w-16 h-16 rounded object-cover border"
                  />
                  <div className="flex-1">
                    <h3 className="text-base font-semibold">{item.name}</h3>

                    {item.sizes
                      .filter((s) => s.quantity > 0)
                      .map((size) => (
                        <div
                          key={size.id}
                          className="mt-2 p-2 border rounded-md text-sm space-y-1"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">
                              Size: {size.size_value} {size.size_unit}
                            </span>
                            <span>${size.price.toFixed(2)} / {size.type as any}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 mt-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleQuantityChange(
                                    item.productId,
                                    (item.sizes.find((s) => s.id === size.id)?.quantity || 1) - 1,
                                    size.id
                                  )
                                }
                                disabled={(item.sizes.find((s) => s.id === size.id)?.quantity || 1) <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-6 text-center">
                                {item.sizes.find((s) => s.id === size.id)?.quantity}
                              </span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleQuantityChange(
                                    item.productId,
                                    (item.sizes.find((s) => s.id === size.id)?.quantity || 0) + 1,
                                    size.id
                                  )
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <span className="text-sm font-medium">
                              Total: ${(
                                size.quantity * size.price
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveItem(item.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </ScrollArea>

          {cartItems.length > 0 && (
            <div className="mt-6 border-t pt-4 space-y-3 text-sm">
              <div className="flex justify-between font-medium">
                <span>Shipping Cost</span>
                <span>
                  {sessionStorage.getItem("shipping") === "true"
                    ? "Free"
                    : `$${shippingCost}`}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white mt-2"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Proceed to Order"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
