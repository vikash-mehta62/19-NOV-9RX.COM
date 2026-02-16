import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form } from "@/components/ui/form";
import { OrderFormValues, orderFormSchema } from "./schemas/orderSchema";
import { OrderItemsSection } from "./sections/OrderItemsSection";
import { ShippingSection } from "./sections/ShippingSection";
import { OrderFormActions } from "./form/OrderFormActions";
import { useLocation, useNavigate } from "react-router-dom";
import { generatePurchaseOrderId } from "./utils/orderUtils";
import { supabase } from "@/supabaseClient";
import { useSelector, useDispatch } from "react-redux";
import { selectUserProfile } from "../../store/selectors/userSelectors";
import { useCart } from "@/hooks/use-cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Package, User, Plus, ShoppingCart, X, Edit2, Save } from "lucide-react";
import { OrderActivityService } from "@/services/orderActivityService";
import ProductShowcase from "../pharmacy/ProductShowcase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCartPrice } from "@/store/actions/cartActions";

interface CreatePurchaseOrderFormProps {
  vendorId: string;
}

export function CreatePurchaseOrderForm({ vendorId }: CreatePurchaseOrderFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isCus, setIsCus] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const userProfile = useSelector(selectUserProfile);
  const { cartItems, clearCart } = useCart();
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editableAddress, setEditableAddress] = useState({
    street1: "",
    street2: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
  });
  const [editingPriceFor, setEditingPriceFor] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");
  const [originalPrices, setOriginalPrices] = useState<Record<string, number>>({});

  // Fetch vendor information
  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", vendorId)
          .eq("type", "vendor")
          .single();

        if (error) throw error;
        setVendorInfo(data);
        
        // Initialize editable address
        setEditableAddress({
          street1: data?.billing_address?.street1 || "",
          street2: data?.billing_address?.street2 || "",
          city: data?.billing_address?.city || "",
          state: data?.billing_address?.state || "",
          zip_code: data?.billing_address?.zip_code || "",
          country: data?.billing_address?.country || "",
        });
      } catch (error) {
        console.error("Error fetching vendor:", error);
        toast({
          title: "Error",
          description: "Failed to load vendor information",
          variant: "destructive",
        });
        navigate("/admin/po");
      } finally {
        setLoadingVendor(false);
      }
    };

    if (vendorId) {
      fetchVendor();
    }
  }, [vendorId]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      id: "",
      customer: vendorId,
      date: new Date().toISOString(),
      total: "0",
      status: "new",
      payment_status: "unpaid",
      customization: false,
      poAccept: false, // This is a PO

      customerInfo: {
        cusid: vendorId,
        name: "",
        email: "",
        phone: "",
        type: "Pharmacy",
        address: {
          street: "",
          city: "",
          state: "",
          zip_code: "",
        },
      },

      // 9RX shipping address (where products will be delivered)
      shippingAddress: {
        fullName: "9RX",
        email: "info@9rx.com",
        phone: "18009696295",
        address: {
          street: "936 Broad River Ln",
          city: "Charlotte",
          state: "NC",
          zip_code: "28211",
        },
      },

      order_number: "",
      items: cartItems,
      shipping: {
        method: "FedEx",
        cost: 0,
        trackingNumber: "",
        estimatedDelivery: "",
      },
      payment: {
        method: "manual",
        notes: "",
      },
      specialInstructions: "",
      purchase_number_external: "",
    },
  });

  // Update vendor info in form when loaded
  useEffect(() => {
    if (vendorInfo) {
      form.setValue("customerInfo", {
        cusid: vendorInfo.id,
        name: `${vendorInfo.first_name} ${vendorInfo.last_name}`,
        email: vendorInfo.email || "",
        phone: vendorInfo.billing_address?.phone || vendorInfo.mobile_phone || "",
        type: "Pharmacy",
        address: {
          street: vendorInfo.billing_address?.street1 || "",
          city: vendorInfo.billing_address?.city || "",
          state: vendorInfo.billing_address?.state || "",
          zip_code: vendorInfo.billing_address?.zip_code || "",
        },
      });
    }
  }, [vendorInfo, form]);

  // Sync cart items with form
  useEffect(() => {
    form.setValue("items", cartItems);
    console.log("📦 Cart items synced to form:", cartItems);
  }, [cartItems, form]);

  const calculateOrderTotal = (items: any[], shippingCost: number) => {
    const itemsTotal = items.reduce((total, item) => {
      const itemTotal = item.sizes?.reduce(
        (sum: number, size: any) => sum + size.quantity * size.price,
        0
      ) || 0;
      return total + itemTotal;
    }, 0);
    return itemsTotal + shippingCost;
  };

  // Handle price editing for a specific size
  const handleEditPrice = (itemIndex: number, sizeIndex: number, currentPrice: number) => {
    const key = `${itemIndex}-${sizeIndex}`;
    setEditingPriceFor(key);
    setTempPrice(currentPrice.toFixed(2));
  };

  // Save edited price
  const handleSavePrice = (itemIndex: number, sizeIndex: number) => {
    const newPrice = parseFloat(tempPrice);
    
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    const item = cartItems[itemIndex];
    
    if (!item || !item.sizes || !item.sizes[sizeIndex]) {
      toast({
        title: "Error",
        description: "Invalid item or size",
        variant: "destructive",
      });
      return;
    }
    
    const size = item.sizes[sizeIndex];
    const priceKey = `${item.productId}-${size.id}`;
    
    // Store original price if not already stored
    if (!originalPrices[priceKey]) {
      setOriginalPrices(prev => ({
        ...prev,
        [priceKey]: size.price
      }));
    }
    
    // Update price in Redux store using the action
    dispatch(updateCartPrice(item.productId, size.id, newPrice));
    
    toast({
      title: "Price Updated",
      description: `Price updated to $${newPrice.toFixed(2)}`,
    });
    
    setEditingPriceFor(null);
    setTempPrice("");
  };

  // Cancel price editing
  const handleCancelPriceEdit = () => {
    setEditingPriceFor(null);
    setTempPrice("");
  };

  const onSubmit = async (data: OrderFormValues) => {
    try {
      setIsSubmitting(true);

      if (!userProfile?.id) {
        toast({
          title: "Authentication Error",
          description: "Please log in to create a purchase order.",
          variant: "destructive",
        });
        return;
      }

      if (cartItems.length === 0) {
        toast({
          title: "No Products",
          description: "Please add products to create a purchase order.",
          variant: "destructive",
        });
        return;
      }

      // Calculate totals
      const shippingCost = parseFloat(data.shipping?.cost?.toString() || "0");
      const totalAmount = calculateOrderTotal(cartItems, shippingCost);

      // Generate PO number
      let poNumber = await generatePurchaseOrderId();

      if (!poNumber) {
        throw new Error("Failed to generate purchase order number. Please try again.");
      }

      // Prepare PO data
      const poData: any = {
        order_number: poNumber,
        profile_id: vendorId, // Vendor is the "customer" for PO
        status: data.status,
        total_amount: totalAmount,
        shipping_cost: shippingCost,
        tax_amount: 0, // No tax on PO
        customization: false,
        items: cartItems,
        notes: data.specialInstructions,
        purchase_number_external: data.purchase_number_external,
        shipping_method: data.shipping?.method,
        customerInfo: {
          ...data.customerInfo,
          address: {
            street: editableAddress.street1,
            street2: editableAddress.street2,
            city: editableAddress.city,
            state: editableAddress.state,
            zip_code: editableAddress.zip_code,
            country: editableAddress.country,
          },
        },
        shippingAddress: data.shippingAddress,
        tracking_number: data.shipping?.trackingNumber,
        estimated_delivery:
          data.shipping?.estimatedDelivery ||
          new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        location_id: vendorId,
        poAccept: false, // Mark as PO
        payment_status: "unpaid",
      };

      // Create PO in database with retry logic for duplicate order numbers
      let poResponse: any = null;
      const MAX_PO_RETRIES = 5;

      for (let attempt = 0; attempt < MAX_PO_RETRIES; attempt++) {
        const { data: insertResult, error: poError } = await supabase
          .from("orders")
          .insert(poData)
          .select()
          .single();

        if (!poError) {
          poResponse = insertResult;
          break;
        }

        // If duplicate order number, generate a new one and retry
        if (poError.code === '23505' && poError.message.includes('orders_order_number_key')) {
          console.warn(`⚠️ Duplicate PO number detected (attempt ${attempt + 1}/${MAX_PO_RETRIES}), generating new one...`);
          const newPoNumber = await generatePurchaseOrderId();
          if (!newPoNumber) {
            // Fallback: timestamp-based PO number
            const fallback = `PO-9RX${Date.now().toString().slice(-8)}`;
            console.warn(`⚠️ RPC failed, using fallback PO number: ${fallback}`);
            poData.order_number = fallback;
            poNumber = fallback;
          } else {
            poData.order_number = newPoNumber;
            poNumber = newPoNumber;
          }
        } else {
          throw new Error(poError.message);
        }
      }

      if (!poResponse) {
        // Final emergency fallback
        const uuid = crypto.randomUUID().split('-')[0];
        const emergencyPO = `PO-9RX${uuid.toUpperCase()}`;
        poData.order_number = emergencyPO;
        poNumber = emergencyPO;
        const { data: emergencyResult, error: emergencyError } = await supabase
          .from("orders")
          .insert(poData)
          .select()
          .single();
        if (emergencyError) throw new Error(emergencyError.message);
        poResponse = emergencyResult;
      }

      // Insert order items into order_items table (for analytics and reporting)
      const orderItemsData = cartItems.flatMap((item: any) => {
        if (item.sizes && item.sizes.length > 0) {
          // For items with sizes, create separate entries for each size
          return item.sizes.map((size: any) => ({
            order_id: poResponse.id,
            product_id: item.productId,
            quantity: size.quantity,
            unit_price: size.price,
            total_price: size.quantity * size.price,
            product_size_id: size.id,
            notes: `Size: ${size.size_value} ${size.size_unit}`,
          }));
        } else {
          // For items without sizes
          return [{
            order_id: poResponse.id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.quantity * item.price,
            notes: item.notes || null,
          }];
        }
      });

      const { data: insertedItems, error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsData)
        .select();

      if (itemsError) {
        console.error("❌ PO CREATION - Failed to insert order items:", itemsError);
        // Don't throw error - PO is already created, just log the issue
        toast({
          title: "Warning",
          description: "PO created but some analytics data may be incomplete.",
          variant: "default",
        });
      } else {
        console.log('✅ PO CREATION - Order Items Inserted Successfully:', insertedItems?.length);
      }

      // Log PO creation activity
      try {
        await OrderActivityService.logOrderCreation({
          orderId: poResponse.id,
          orderNumber: poNumber,
          totalAmount: totalAmount,
          status: data.status,
          paymentMethod: "manual",
          performedBy: userProfile?.id,
          performedByName: `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() || "Admin",
          performedByEmail: userProfile?.email,
        });
      } catch (activityError) {
        console.error("Failed to log PO creation activity:", activityError);
      }

      // Clear cart and navigate
      localStorage.removeItem("cart");
      localStorage.removeItem("cartItems");
      await clearCart();

      toast({
        title: "Purchase Order Created",
        description: `PO ${poNumber} has been created successfully.`,
      });

      navigate("/admin/po");
    } catch (error) {
      console.error("PO creation error:", error);
      toast({
        title: "Error Creating Purchase Order",
        description:
          error instanceof Error
            ? error.message
            : "There was a problem creating the purchase order.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingVendor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vendor information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Vendor Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Building2 className="h-5 w-5" />
            Purchase Order - Vendor Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-medium text-gray-700">Vendor Name</p>
                <p className="text-base font-semibold text-gray-900">
                  {`${vendorInfo?.first_name} ${vendorInfo?.last_name}`}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Email</p>
              <p className="text-base text-gray-900">{vendorInfo?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Phone</p>
              <p className="text-base text-gray-900">
                {vendorInfo?.billing_address?.phone || vendorInfo?.mobile_phone || "N/A"}
              </p>
            </div>
          </div>
          
          {/* Vendor Address Section */}
          <div className="pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Vendor Address</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (isEditingAddress) {
                    // Save the address to database
                    try {
                      const { error } = await supabase
                        .from("profiles")
                        .update({
                          billing_address: {
                            ...vendorInfo.billing_address,
                            street1: editableAddress.street1,
                            street2: editableAddress.street2,
                            city: editableAddress.city,
                            state: editableAddress.state,
                            zip_code: editableAddress.zip_code,
                            country: editableAddress.country,
                          },
                        })
                        .eq("id", vendorId);

                      if (error) throw error;

                      // Update local state
                      setVendorInfo({
                        ...vendorInfo,
                        billing_address: {
                          ...vendorInfo.billing_address,
                          street1: editableAddress.street1,
                          street2: editableAddress.street2,
                          city: editableAddress.city,
                          state: editableAddress.state,
                          zip_code: editableAddress.zip_code,
                          country: editableAddress.country,
                        },
                      });

                      toast({
                        title: "Address Updated",
                        description: "Vendor address has been updated successfully in the database.",
                      });
                    } catch (error) {
                      console.error("Error updating vendor address:", error);
                      toast({
                        title: "Error",
                        description: "Failed to update vendor address. Please try again.",
                        variant: "destructive",
                      });
                      return; // Don't toggle edit mode if save failed
                    }
                  }
                  setIsEditingAddress(!isEditingAddress);
                }}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              >
                {isEditingAddress ? (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </>
                )}
              </Button>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              {isEditingAddress ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street1" className="text-sm">Street Address 1</Label>
                    <Input
                      id="street1"
                      value={editableAddress.street1}
                      onChange={(e) => setEditableAddress({ ...editableAddress, street1: e.target.value })}
                      placeholder="Enter street address"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="street2" className="text-sm">Street Address 2 (Optional)</Label>
                    <Input
                      id="street2"
                      value={editableAddress.street2}
                      onChange={(e) => setEditableAddress({ ...editableAddress, street2: e.target.value })}
                      placeholder="Apt, Suite, etc."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-sm">City</Label>
                    <Input
                      id="city"
                      value={editableAddress.city}
                      onChange={(e) => setEditableAddress({ ...editableAddress, city: e.target.value })}
                      placeholder="Enter city"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-sm">State</Label>
                    <Input
                      id="state"
                      value={editableAddress.state}
                      onChange={(e) => setEditableAddress({ ...editableAddress, state: e.target.value })}
                      placeholder="Enter state"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip_code" className="text-sm">ZIP Code</Label>
                    <Input
                      id="zip_code"
                      value={editableAddress.zip_code}
                      onChange={(e) => setEditableAddress({ ...editableAddress, zip_code: e.target.value })}
                      placeholder="Enter ZIP code"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-sm">Country</Label>
                    <Input
                      id="country"
                      value={editableAddress.country}
                      onChange={(e) => setEditableAddress({ ...editableAddress, country: e.target.value })}
                      placeholder="Enter country"
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {vendorInfo?.billing_address?.street1 || 
                   editableAddress.street1 ||
                   vendorInfo?.billing_address?.city || 
                   editableAddress.city ||
                   vendorInfo?.billing_address?.state || 
                   editableAddress.state ||
                   vendorInfo?.billing_address?.zip_code ||
                   editableAddress.zip_code ? (
                    <div className="space-y-1 text-gray-900">
                      {(vendorInfo?.billing_address?.street1 || editableAddress.street1) && (
                        <p>{vendorInfo?.billing_address?.street1 || editableAddress.street1}</p>
                      )}
                      {(vendorInfo?.billing_address?.street2 || editableAddress.street2) && (
                        <p>{vendorInfo?.billing_address?.street2 || editableAddress.street2}</p>
                      )}
                      <p>
                        {[
                          vendorInfo?.billing_address?.city || editableAddress.city,
                          vendorInfo?.billing_address?.state || editableAddress.state,
                          vendorInfo?.billing_address?.zip_code || editableAddress.zip_code
                        ].filter(Boolean).join(", ")}
                      </p>
                      {(vendorInfo?.billing_address?.country || editableAddress.country) && (
                        <p>{vendorInfo?.billing_address?.country || editableAddress.country}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No address available - Click Edit to add</p>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address Card (9RX) */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Package className="h-5 w-5" />
            Delivery Address (9RX)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="font-semibold text-gray-900">9RX</p>
            <p className="text-gray-700">936 Broad River Ln</p>
            <p className="text-gray-700">Charlotte, NC 28211</p>
            <p className="text-gray-700">Phone: 1-800-969-6295</p>
          </div>
        </CardContent>
      </Card>

      {/* Product Selection Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order Items
          </CardTitle>
          <Button
            type="button"
            onClick={() => setShowProductSelector(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Products
          </Button>
        </CardHeader>
        <CardContent>
          {cartItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No products added yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Click "Add Products" to select items for this purchase order
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item, index) => {
                // Calculate item total from sizes
                const itemTotal = item.sizes?.reduce(
                  (sum: number, size: any) => sum + (size.quantity * size.price),
                  0
                ) || (item.price * item.quantity);
                
                return (
                  <div
                    key={index}
                    className="flex items-start justify-between p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      {item.sizes && item.sizes.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {item.sizes.map((size: any, sizeIndex: number) => {
                            const editKey = `${index}-${sizeIndex}`;
                            const isEditing = editingPriceFor === editKey;
                            const priceKey = `${item.productId}-${size.id}`;
                            const originalPrice = originalPrices[priceKey];
                            const hasModifiedPrice = originalPrice && originalPrice !== size.price;
                            
                            return (
                              <div key={sizeIndex} className="bg-white p-3 rounded border">
                                <div className="flex justify-between items-start text-sm mb-2">
                                  <span className="text-gray-600 font-medium">
                                    Size: {size.size_value} {size.size_unit}
                                  </span>
                                  <span className="text-gray-500">Qty: {size.quantity}</span>
                                </div>
                                
                                {/* Price Editing Section */}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-gray-500">Price per unit:</span>
                                  {isEditing ? (
                                    <>
                                      <div className="flex items-center gap-1">
                                        <span className="text-sm">$</span>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0.01"
                                          value={tempPrice}
                                          onChange={(e) => setTempPrice(e.target.value)}
                                          className="w-24 h-7 text-sm"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              handleSavePrice(index, sizeIndex);
                                            } else if (e.key === 'Escape') {
                                              handleCancelPriceEdit();
                                            }
                                          }}
                                        />
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={() => handleSavePrice(index, sizeIndex)}
                                        className="h-7 px-2 bg-green-600 hover:bg-green-700"
                                      >
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelPriceEdit}
                                        className="h-7 px-2"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-sm font-semibold text-gray-900">
                                        ${size.price.toFixed(2)}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditPrice(index, sizeIndex, size.price)}
                                        className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                                
                                {/* Show original price if modified */}
                                {hasModifiedPrice && !isEditing && (
                                  <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                    <span>Original: ${originalPrice.toFixed(2)}</span>
                                    <span className="font-medium">(Modified ✓)</span>
                                  </div>
                                )}
                                
                                {/* Line total */}
                                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                  <span className="text-xs text-gray-500">Line Total:</span>
                                  <span className="text-sm font-bold text-gray-900">
                                    ${(size.quantity * size.price).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-6 min-w-[100px]">
                      <p className="font-semibold text-gray-900">
                        ${itemTotal.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Total Qty: {item.sizes?.reduce((sum: number, s: any) => sum + s.quantity, 0) || item.quantity}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Subtotal:</span>
                  <span className="text-purple-600">
                    ${cartItems.reduce((sum, item) => {
                      const itemTotal = item.sizes?.reduce(
                        (s: number, size: any) => s + (size.quantity * size.price),
                        0
                      ) || (item.price * item.quantity);
                      return sum + itemTotal;
                    }, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Shipping Details */}
          <ShippingSection form={form} />

          {/* Form Actions */}
          <OrderFormActions
            orderData={form.getValues()}
            form={form}
            isSubmitting={isSubmitting}
            isValidating={isValidating}
            isEditing={false}
            setModalIsOpen={setModalIsOpen}
            setIsCus={setIsCus}
            isCus={isCus}
            poIs={true}
          />
        </form>
      </Form>

      {/* Product Selection Modal */}
      {showProductSelector && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-xl w-[95%] md:w-[90%] lg:w-[85%] xl:w-[80%] max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-blue-50">
              <h2 className="text-xl font-semibold text-blue-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Select Products for Purchase Order
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProductSelector(false)}
                className="hover:bg-purple-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ProductShowcase groupShow={true} />
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowProductSelector(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowProductSelector(false);
                  toast({
                    title: "Products Added",
                    description: `${cartItems.length} product(s) added to purchase order`,
                  });
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Done - Add to PO
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
