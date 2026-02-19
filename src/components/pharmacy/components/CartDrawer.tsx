import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Trash2, Plus, Minus, MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import { supabase } from "@/integrations/supabase/client";

// Fetch customer locations for group users - Using original logic
const fetchCustomerLocation = async (userId: string) => {
  try {
    console.log("CartDrawer: Fetching locations for group user:", userId);
    
    // Original logic: Fetch profiles where group_id matches the user ID
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("group_id", userId);

    if (error) {
      console.error("CartDrawer: Failed to fetch customer information:", error);
      throw new Error("Failed to fetch customer information: " + error.message);
    }

    if (!data || data.length === 0) {
      console.log("CartDrawer: No locations found with group_id:", userId);
      return [];
    }

    console.log("CartDrawer: Found locations:", data.length);
    return data;
  } catch (error) {
    console.error("CartDrawer: Error fetching customer info:", error);
    return [];
  }
};

export const CartDrawer = () => {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPharmacySelection, setShowPharmacySelection] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<string>("");
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const navigate = useNavigate();
  const userProfile = useSelector(selectUserProfile);

  // Fetch pharmacies for group users
  useEffect(() => {
    const fetchPharmacies = async () => {
      const userType = sessionStorage.getItem("userType")?.toLowerCase();
      if (userType === "group" && userProfile?.id) {
        try {
          const locations = await fetchCustomerLocation(userProfile.id);
          
          // Format locations for display - Using original logic
          const formattedPharmacies = await Promise.all(
            locations.map(async (location: any, index: number) => {
              // Extract address information
              const billingAddr = location.billing_address || {};
              const addressParts = [
                billingAddr.street1 || billingAddr.street || "N/A",
                billingAddr.city || "N/A", 
                billingAddr.zip_code || "N/A"
              ].filter(part => part !== "N/A");

              return {
                id: location.id || `temp-${index + 1}`,
                name: location.display_name?.trim() || 
                      location.first_name?.trim() || 
                      location.company_name?.trim() || 
                      `Pharmacy ${index + 1}`,
                address: addressParts.length > 0 ? addressParts.join(", ") : "Address not available",
                email: location.email || "N/A",
                phone: location.mobile_phone || location.phone || "N/A",
              };
            })
          );
          
          console.log("CartDrawer: Final formatted pharmacies:", formattedPharmacies);
          setPharmacies(formattedPharmacies);
        } catch (error) {
          console.error("Error fetching pharmacies:", error);
        }
      }
    };

    fetchPharmacies();
  }, [userProfile]);

  const shippingCost =
    sessionStorage.getItem("shipping") === "true"
      ? 0
      : Math.max(...cartItems.map((item) => item.shipping_cost || 0), 0);

  const total = cartItems.reduce((sum, item) => {
    const sizes = item.sizes || [];
    const itemTotal = sizes.reduce(
      (sizeSum, size) => sizeSum + (size.price || 0) * (size.quantity || 0),
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
    const userType = sessionStorage.getItem("userType")?.toLowerCase();
    
    // For group users, show pharmacy selection first
    if (userType === "group") {
      if (pharmacies.length === 0) {
        toast({
          title: "No Pharmacies Found",
          description: "No pharmacy locations found for your group. Please contact support.",
          variant: "destructive",
        });
        return;
      }
      
      if (pharmacies.length === 1) {
        // If only one pharmacy, auto-select it
        setSelectedPharmacy(pharmacies[0].id);
        proceedToOrder(pharmacies[0].id);
      } else {
        // Show pharmacy selection modal
        setShowPharmacySelection(true);
      }
      return;
    }

    // For other user types, proceed directly
    setIsProcessing(true);
    try {
      setIsOpen(false);
      
      if (userType === "pharmacy") navigate("/pharmacy/order/create");
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

  const proceedToOrder = async (pharmacyId?: string) => {
    setIsProcessing(true);
    try {
      const finalPharmacyId = pharmacyId || selectedPharmacy;
      
      if (finalPharmacyId) {
        // Set the selected pharmacy in session storage for group order
        sessionStorage.setItem("selectedPharmacyId", finalPharmacyId);
        
        // Fetch and set pharmacy data
        const selectedPharmacyData = pharmacies.find(p => p.id === finalPharmacyId);
        if (selectedPharmacyData) {
          sessionStorage.setItem("selectedPharmacyData", JSON.stringify(selectedPharmacyData));
        }
      }
      
      setIsOpen(false);
      setShowPharmacySelection(false);
      navigate("/group/order");
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
                    src={`https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/${item.image}`}
                    onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.svg")}
                    alt={item.name}
                    className="w-16 h-16 rounded object-cover border"
                  />
                  <div className="flex-1">
                    <h3 className="text-base font-semibold">{item.name}</h3>

                    {(item.sizes || [])
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
                            <span>${(size.price || 0).toFixed(2)} / {size.type as any}</span>
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
                                    ((item.sizes || []).find((s) => s.id === size.id)?.quantity || 1) - 1,
                                    size.id
                                  )
                                }
                                disabled={((item.sizes || []).find((s) => s.id === size.id)?.quantity || 1) <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-6 text-center">
                                {(item.sizes || []).find((s) => s.id === size.id)?.quantity}
                              </span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleQuantityChange(
                                    item.productId,
                                    ((item.sizes || []).find((s) => s.id === size.id)?.quantity || 0) + 1,
                                    size.id
                                  )
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <span className="text-sm font-medium">
                              Total: ${(
                                (size.quantity || 0) * (size.price || 0)
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2"
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
