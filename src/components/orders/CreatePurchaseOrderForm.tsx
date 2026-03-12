import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { Building2, Package, User, Plus, ShoppingCart, X, Edit2, Save, ClipboardList, Truck, Receipt, Sparkles, ScanLine } from "lucide-react";
import { OrderActivityService } from "@/services/orderActivityService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCartPrice } from "@/store/actions/cartActions";
import { Textarea } from "@/components/ui/textarea";
import { v4 as uuidv4 } from "uuid";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

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
  const { cartItems, clearCart, addToCart } = useCart();
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
  const [productPickerMode, setProductPickerMode] = useState<"catalog" | "manual">("catalog");
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [sizeSelections, setSizeSelections] = useState<Record<string, number>>({});
  const [sizePriceOverrides, setSizePriceOverrides] = useState<Record<string, string>>({});
  const [manualProduct, setManualProduct] = useState({
    name: "",
    sku: "",
    size: "",
    unit: "unit",
    quantity: "1",
    price: "",
    notes: "",
  });

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
        estimatedDelivery: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
      payment: {
        method: "manual",
        notes: "",
        includePricingInPdf: true,
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

  useEffect(() => {
    const fetchCatalogProducts = async () => {
      if (!showProductSelector || productPickerMode !== "catalog") return;

      setCatalogLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, sku, category, description, image_url, images, product_sizes(*)")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw error;
        setCatalogProducts(data || []);
      } catch (error) {
        console.error("Error loading PO catalog:", error);
        toast({
          title: "Catalog unavailable",
          description: "Failed to load products for purchase order selection.",
          variant: "destructive",
        });
      } finally {
        setCatalogLoading(false);
      }
    };

    fetchCatalogProducts();
  }, [showProductSelector, productPickerMode]);

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

  const handleManualProductAdd = async () => {
    const quantity = Number(manualProduct.quantity);
    const price = Number(manualProduct.price);

    if (!manualProduct.name.trim()) {
      toast({
        title: "Product name required",
        description: "Enter a product name for the manual PO item.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Unit price must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    const productId = `manual-po-${uuidv4()}`;
    const sizeId = `${productId}-size`;

    await addToCart({
      productId,
      name: manualProduct.name.trim(),
      sku: manualProduct.sku.trim() || `MANUAL-${Date.now()}`,
      price: quantity * price,
      image: "",
      description: manualProduct.notes.trim(),
      quantity,
      sizes: [
        {
          id: sizeId,
          size_value: manualProduct.size.trim() || "Standard",
          size_unit: manualProduct.unit.trim() || "unit",
          price,
          quantity,
          sku: manualProduct.sku.trim() || "",
          type: "manual",
        },
      ],
      customizations: {},
      notes: manualProduct.notes.trim(),
      shipping_cost: 0,
    });

    setManualProduct({
      name: "",
      sku: "",
      size: "",
      unit: "unit",
      quantity: "1",
      price: "",
      notes: "",
    });

    toast({
      title: "Manual item added",
      description: "The custom product was added to this purchase order.",
    });
  };

  const catalogCategories = useMemo(() => {
    const categories = Array.from(
      new Set(catalogProducts.map((product) => product.category).filter(Boolean))
    ) as string[];

    return categories.sort((a, b) => a.localeCompare(b));
  }, [catalogProducts]);

  const filteredCatalogProducts = useMemo(() => {
    return catalogProducts.filter((product) => {
      const matchesCategory =
        catalogCategory === "all" ||
        String(product.category || "").toLowerCase() === catalogCategory.toLowerCase();

      const query = catalogSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        String(product.name || "").toLowerCase().includes(query) ||
        String(product.sku || "").toLowerCase().includes(query) ||
        String(product.description || "").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [catalogProducts, catalogCategory, catalogSearch]);

  const handleCatalogAdd = async (product: any, size: any) => {
    const quantity = Math.max(1, Number(sizeSelections[size.id] || 1));
    const price = Number(sizePriceOverrides[size.id] ?? size.price ?? 0);

    if (!price || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Enter a valid vendor cost before adding this item.",
        variant: "destructive",
      });
      return;
    }

    await addToCart({
      productId: String(product.id),
      name: product.name,
      sku: product.sku || size.sku || "",
      price: quantity * price,
      image: product.image_url || product.images?.[0] || "",
      description: product.description || "",
      quantity,
      sizes: [
        {
          id: size.id,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price,
          quantity,
          sku: size.sku || "",
          type: "case",
          shipping_cost: Number(size.shipping_cost || 0),
        },
      ],
      customizations: {},
      notes: "",
      shipping_cost: Number(size.shipping_cost || 0),
    });

    setSizeSelections((prev) => ({ ...prev, [size.id]: 1 }));
    setSizePriceOverrides((prev) => ({
      ...prev,
      [size.id]: String(Number(size.price || 0).toFixed(2)),
    }));
    toast({
      title: "Product added",
      description: `${product.name} ${size.size_value} ${size.size_unit} added to purchase order.`,
    });
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
          new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        location_id: vendorId,
        poAccept: false, // Mark as PO
        payment_status: "unpaid",
        payment_method: data.payment?.method || "manual",
        payment_notes: data.payment?.notes || null,
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

  const subtotal = cartItems.reduce((sum, item) => {
    const itemTotal =
      item.sizes?.reduce((sizeSum: number, size: any) => sizeSum + size.quantity * size.price, 0) ||
      item.price * item.quantity;
    return sum + itemTotal;
  }, 0);

  const shippingCost = Number(form.watch("shipping.cost") || 0);
  const totalQuantity = cartItems.reduce(
    (sum, item) =>
      sum +
      (item.sizes?.reduce((sizeSum: number, size: any) => sizeSum + size.quantity, 0) || item.quantity || 0),
    0
  );

  return (
    <div className="container mx-auto space-y-6 py-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-800 text-white shadow-xl">
        <CardContent className="grid gap-5 p-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-blue-100">Purchase Order Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold">Create vendor PO with pricing and delivery control</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-100/90">
              Select catalog items, adjust vendor cost before submission, and store a vendor reference so the PO stays usable after approval.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-blue-100">Items</p>
              <p className="mt-2 text-2xl font-semibold">{cartItems.length}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-blue-100">Units</p>
              <p className="mt-2 text-2xl font-semibold">{totalQuantity}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-blue-100">Estimated Total</p>
              <p className="mt-2 text-2xl font-semibold">${(subtotal + shippingCost).toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Receipt className="h-5 w-5 text-blue-600" />
                PO Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="purchase_number_external"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Reference / External PO Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter supplier reference" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping.method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Method</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="FedEx, UPS, LTL, Pickup" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shipping.estimatedDelivery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Delivery Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment.method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned Payment Method</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ACH, check, wire, card" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment.includePricingInPdf"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <FormLabel>Include pricing on PO PDF</FormLabel>
                        <p className="mt-1 text-sm text-slate-500">
                          Turn this off for quantity-only purchase orders sent to vendors without cost visibility.
                        </p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes for this purchase order</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder="Add vendor notes, receiving instructions, expected lead time, or special handling details."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

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

          <ShippingSection form={form} />

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
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <ClipboardList className="h-5 w-5 text-blue-600" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Vendor</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {vendorInfo?.company_name || `${vendorInfo?.first_name} ${vendorInfo?.last_name}`}
                </p>
                <p className="text-sm text-slate-500">{vendorInfo?.email}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-slate-900">Delivery to 9RX</p>
                </div>
                <p className="mt-2 text-sm text-slate-600">936 Broad River Ln, Charlotte, NC 28211</p>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Product lines</span>
                  <span>{cartItems.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Total units</span>
                  <span>{totalQuantity}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Shipping</span>
                  <span>${shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-3 text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>${(subtotal + shippingCost).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
            <div className="border-b bg-white px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Add from catalog or enter manually</p>
                  <p className="text-sm text-slate-500">
                    Use catalog products when available. Use manual entry for one-off vendor items, freight lines, or non-catalog purchases.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setProductPickerMode("catalog")}
                    className={productPickerMode === "catalog" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}
                  >
                    <ScanLine className="mr-2 h-4 w-4" />
                    Catalog
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setProductPickerMode("manual")}
                    className={productPickerMode === "manual" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600"}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Manual Item
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {productPickerMode === "catalog" ? (
                <div className="space-y-4">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_220px_auto]">
                    <Input
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Search by product name, SKU, or description"
                    />
                    <select
                      value={catalogCategory}
                      onChange={(e) => setCatalogCategory(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="all">All categories</option>
                      {catalogCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProductPickerMode("manual")}
                      className="whitespace-nowrap"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Manual Item
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Catalog results</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{filteredCatalogProducts.length}</p>
                      <p className="text-sm text-slate-500">Filter products and add directly to this PO.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Current PO lines</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{cartItems.length}</p>
                      <p className="text-sm text-slate-500">Existing items already added to this order.</p>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-600">Quick add flow</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">Expand a product, pick a size, set qty, add.</p>
                      <p className="text-sm text-slate-500">No page change, no separate product screen.</p>
                    </div>
                  </div>

                  <ScrollArea className="h-[52vh] rounded-2xl border border-slate-200">
                    <div className="space-y-3 p-4">
                      {catalogLoading ? (
                        <div className="py-10 text-center text-slate-500">Loading products...</div>
                      ) : filteredCatalogProducts.length === 0 ? (
                        <div className="py-10 text-center text-slate-500">
                          No matching products found. Try a different search or use Manual Item.
                        </div>
                      ) : (
                        filteredCatalogProducts.map((product) => {
                          const isExpanded = expandedProductId === product.id;
                          const sizes = (product.product_sizes || []).filter((size: any) => Number(size.stock || 0) >= 0);
                          const existingLine = cartItems.find(
                            (item: any) => String(item.productId) === String(product.id)
                          );
                          const existingUnits = existingLine?.sizes?.reduce(
                            (sum: number, size: any) => sum + Number(size.quantity || 0),
                            0
                          ) || 0;

                          return (
                            <div key={product.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                              <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold text-slate-900">{product.name}</p>
                                    <Badge variant="outline">{sizes.length} sizes</Badge>
                                    {existingUnits > 0 && (
                                      <Badge className="border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                        {existingUnits} already on PO
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                    <span>{product.category || "Uncategorized"}</span>
                                    {product.sku && <span>SKU: {product.sku}</span>}
                                    <span>{sizes.length ? `${sizes.length} purchasable sizes` : "No sizes configured"}</span>
                                  </div>
                                  <p className="mt-3 max-w-3xl text-sm text-slate-600">
                                    {product.description || "No description available."}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant={isExpanded ? "default" : "outline"}
                                    className={isExpanded ? "bg-blue-600 hover:bg-blue-700" : ""}
                                    onClick={() =>
                                      setExpandedProductId((prev) => (prev === product.id ? null : product.id))
                                    }
                                  >
                                    {isExpanded ? "Hide sizes" : "Select size and add"}
                                  </Button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                                  {sizes.length === 0 ? (
                                    <p className="text-sm text-slate-500">No sizes configured for this product.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="hidden rounded-2xl bg-slate-100 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 lg:grid lg:grid-cols-[minmax(0,1.35fr)_130px_140px_90px_100px_140px]">
                                        <span>Size</span>
                                        <span>Pack</span>
                                        <span>PO cost</span>
                                        <span>Stock</span>
                                        <span>Qty</span>
                                        <span>Add</span>
                                      </div>
                                      {sizes.map((size: any) => (
                                        <div
                                          key={size.id}
                                          className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:grid-cols-[minmax(0,1.35fr)_130px_140px_90px_100px_140px] lg:items-center"
                                        >
                                          <div>
                                            <p className="font-medium text-slate-900">
                                              {size.size_value} {size.size_unit}
                                            </p>
                                            {size.sku && <p className="text-xs text-slate-500">Size SKU: {size.sku}</p>}
                                          </div>
                                          <div className="text-sm text-slate-600">
                                            {size.quantity_per_case
                                              ? `${size.quantity_per_case} units/case`
                                              : "Pack not set"}
                                          </div>
                                          <div>
                                            <Label className="text-xs text-slate-500 lg:sr-only">PO cost</Label>
                                            <Input
                                              type="number"
                                              min="0.01"
                                              step="0.01"
                                              value={sizePriceOverrides[size.id] ?? String(Number(size.price || 0).toFixed(2))}
                                              onChange={(e) =>
                                                setSizePriceOverrides((prev) => ({
                                                  ...prev,
                                                  [size.id]: e.target.value,
                                                }))
                                              }
                                              className="h-10"
                                            />
                                            <p className="mt-1 text-xs text-slate-500">
                                              Catalog: ${Number(size.price || 0).toFixed(2)}
                                            </p>
                                          </div>
                                          <div className="text-sm text-slate-600">
                                            {Number(size.stock || 0)}
                                          </div>
                                          <div>
                                            <Label className="text-xs text-slate-500 lg:sr-only">Qty</Label>
                                            <Input
                                              type="number"
                                              min="1"
                                              value={sizeSelections[size.id] || 1}
                                              onChange={(e) =>
                                                setSizeSelections((prev) => ({
                                                  ...prev,
                                                  [size.id]: Math.max(1, Number(e.target.value) || 1),
                                                }))
                                              }
                                              className="h-10"
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            className="bg-blue-600 hover:bg-blue-700"
                                            onClick={() => handleCatalogAdd(product, size)}
                                          >
                                            Add to PO
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Manual purchase order item</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Add vendor-specific products or charges that are not in the product catalog.
                    </p>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <Label htmlFor="manual-name">Product name</Label>
                        <Input
                          id="manual-name"
                          value={manualProduct.name}
                          onChange={(e) => setManualProduct((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter item name"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="manual-sku">SKU / Vendor code</Label>
                        <Input
                          id="manual-sku"
                          value={manualProduct.sku}
                          onChange={(e) => setManualProduct((prev) => ({ ...prev, sku: e.target.value }))}
                          placeholder="Optional reference"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="manual-size">Pack / size</Label>
                        <Input
                          id="manual-size"
                          value={manualProduct.size}
                          onChange={(e) => setManualProduct((prev) => ({ ...prev, size: e.target.value }))}
                          placeholder="Ex: 1 case, 500 ct, pallet"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="manual-unit">Unit</Label>
                        <Input
                          id="manual-unit"
                          value={manualProduct.unit}
                          onChange={(e) => setManualProduct((prev) => ({ ...prev, unit: e.target.value }))}
                          placeholder="case"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="manual-quantity">Quantity</Label>
                        <Input
                          id="manual-quantity"
                          type="number"
                          min="1"
                          value={manualProduct.quantity}
                          onChange={(e) => setManualProduct((prev) => ({ ...prev, quantity: e.target.value }))}
                          className="mt-1"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="manual-price">Unit price</Label>
                        <Input
                          id="manual-price"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={manualProduct.price}
                          onChange={(e) => setManualProduct((prev) => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                          className="mt-1"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="manual-notes">Notes</Label>
                        <Textarea
                          id="manual-notes"
                          rows={4}
                          value={manualProduct.notes}
                          onChange={(e) => setManualProduct((prev) => ({ ...prev, notes: e.target.value }))}
                          placeholder="Add vendor item notes, specifications, or internal receiving comments."
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Estimated line total</p>
                        <p className="text-2xl font-semibold text-blue-700">
                          ${((Number(manualProduct.quantity) || 0) * (Number(manualProduct.price) || 0)).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleManualProductAdd}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Add Manual Item to PO
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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
