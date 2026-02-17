import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, Hospital, User, MapPin, Phone, Mail, Check, Package, ShoppingCart, Plus, Minus, Trash2, X, ChevronDown, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { calculateSubtotal, calculateShipping, calculateTax, calculateFinalTotal } from "@/utils/orderCalculations";
import CustomProductForm from "@/components/orders/Customitems";

// Types
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "Pharmacy" | "Hospital" | "Group";
  company_name?: string;
  billing_address?: {
    street?: string;
    street1?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  shipping_address?: {
    street?: string;
    street1?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  freeShipping?: boolean;
  tax_percentage?: number;
}

interface ProductSize {
  id: string;
  size_value: string;
  size_unit: string;
  price: number;
  price_per_case: number;
  stock: number;
  sku?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  image_url: string;
  product_sizes: ProductSize[];
}

interface QuickOrderCreationProps {
  onComplete?: (orderData: any) => void;
  onCancel?: () => void;
}

// Step type
type Step = "search" | "confirm" | "products";

const QuickOrderCreationComponent = ({ onComplete, onCancel }: QuickOrderCreationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart } = useCart();

  // State
  const [currentStep, setCurrentStep] = useState<Step>("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Product state
  const [productSearch, setProductSearch] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showCustomProductDialog, setShowCustomProductDialog] = useState(false);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoadingCustomers(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("status", "active")
          .in("type", ["pharmacy", "hospital", "group"])
          .order("created_at", { ascending: false });

        if (error) throw error;

        const formattedCustomers: Customer[] = (data || []).map((profile) => ({
          id: profile.id,
          name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "N/A",
          email: profile.email || "",
          phone: profile.mobile_phone || profile.work_phone || "",
          type: profile.type || "Pharmacy",
          company_name: profile.company_name || profile.display_name || "",
          billing_address: profile.billing_address || undefined,
          shipping_address: profile.shipping_address || undefined,
          freeShipping: profile.freeShipping || false,
          tax_percentage: profile.taxPercantage || 0,
        }));

        setCustomers(formattedCustomers);
      } catch (err) {
        console.error("Error fetching customers:", err);
        toast({ title: "Error", description: "Failed to load customers", variant: "destructive" });
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, [toast]);

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['quick-order-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, name, sku, category, image_url,
          product_sizes (id, size_value, size_unit, price, price_per_case, stock, sku)
        `)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter customers
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers.slice(0, 10);
    const term = searchTerm.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.company_name?.toLowerCase().includes(term) ||
      c.phone.includes(term)
    );
  }, [customers, searchTerm]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 30);
    const term = productSearch.toLowerCase();
    return products.filter((p: Product) =>
      p.name.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term)
    );
  }, [products, productSearch]);

  // Calculate totals
  const orderTotals = useMemo(() => {
    const subtotal = calculateSubtotal(cartItems);
    const taxPer = selectedCustomer?.tax_percentage || 0;
    const hasFreeShipping = selectedCustomer?.freeShipping || false;
    const shipping = calculateShipping(cartItems, hasFreeShipping);
    const tax = calculateTax(subtotal, taxPer);
    const total = calculateFinalTotal({ subtotal, shipping, tax, discount: 0 });
    const itemCount = cartItems.reduce((sum, item) => 
      sum + (item.sizes?.reduce((s: number, size: any) => s + size.quantity, 0) || item.quantity || 0), 0
    );
    return { subtotal, tax, shipping, total, itemCount };
  }, [cartItems, selectedCustomer]);

  // Handlers
  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    sessionStorage.setItem("taxper", (customer.tax_percentage || 0).toString());
    sessionStorage.setItem("shipping", (customer.freeShipping || false).toString());
    setCurrentStep("confirm");
  }, []);

  const handleConfirmCustomer = useCallback(() => {
    if (!selectedCustomer) return;
    setCurrentStep("products");
  }, [selectedCustomer]);

  const handleBackToSearch = useCallback(() => {
    setSelectedCustomer(null);
    setCurrentStep("search");
  }, []);

  const handleAddSize = useCallback(async (product: Product, size: ProductSize) => {
    try {
      const cartItem = {
        productId: product.id,
        name: product.name,
        sku: product.sku || "",
        image: product.image_url || "",
        price: size.price,
        quantity: 1,
        sizes: [{
          id: size.id,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: size.price,
          quantity: 1,
          type: "case",
          sku: size.sku || "",
        }],
        customizations: {},
        notes: "",
        shipping_cost: 0,
      };
      await addToCart(cartItem);
      toast({ title: "Added", description: `${product.name} added to order` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add product", variant: "destructive" });
    }
  }, [addToCart, toast]);

  const handleQuantityChange = useCallback(async (productId: string, sizeId: string, newQty: number) => {
    if (newQty < 1) return;
    try {
      await updateQuantity(productId, newQty, sizeId);
    } catch (error) {
      toast({ title: "Error", description: "Failed to update quantity", variant: "destructive" });
    }
  }, [updateQuantity, toast]);

  const handleRemoveItem = useCallback(async (productId: string) => {
    try {
      await removeFromCart(productId);
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
    }
  }, [removeFromCart, toast]);

  const handleCreateOrder = useCallback(async () => {
    if (!selectedCustomer || cartItems.length === 0) {
      toast({ title: "Error", description: "Please add products to order", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const billingAddr = selectedCustomer.billing_address || {};
      const shippingAddr = sameAsShipping ? billingAddr : (selectedCustomer.shipping_address || billingAddr);

      const orderData = {
        customer: selectedCustomer,
        customerId: selectedCustomer.id,
        billingAddress: {
          street: billingAddr.street1 || billingAddr.street || "",
          city: billingAddr.city || "",
          state: billingAddr.state || "",
          zip_code: billingAddr.zip_code || "",
        },
        shippingAddress: {
          fullName: selectedCustomer.name,
          email: selectedCustomer.email,
          phone: selectedCustomer.phone,
          street: shippingAddr.street1 || shippingAddr.street || "",
          city: shippingAddr.city || "",
          state: shippingAddr.state || "",
          zip_code: shippingAddr.zip_code || "",
        },
        cartItems,
        paymentMethod: "manual",
        specialInstructions: "",
        poNumber: "",
        termsAccepted: true,
        accuracyConfirmed: true,
        subtotal: orderTotals.subtotal,
        tax: orderTotals.tax,
        shipping: orderTotals.shipping,
        total: orderTotals.total,
        skipPayment: true,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      toast({ title: "Order Created", description: "Order has been created successfully" });
      onComplete?.(orderData);
    } catch (error) {
      console.error("Order creation error:", error);
      toast({ title: "Error", description: "Failed to create order", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedCustomer, cartItems, sameAsShipping, orderTotals, toast, onComplete]);

  // Helper functions
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Pharmacy": return <Building2 className="h-4 w-4" />;
      case "Hospital": return <Hospital className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Pharmacy": return "bg-blue-100 text-blue-800";
      case "Hospital": return "bg-green-100 text-green-800";
      default: return "bg-purple-100 text-purple-800";
    }
  };

  const formatAddress = (addr?: { street?: string; street1?: string; city?: string; state?: string; zip_code?: string }) => {
    if (!addr) return "No address";
    const street = addr.street1 || addr.street || "";
    const cityState = [addr.city, addr.state].filter(Boolean).join(", ");
    const zip = addr.zip_code || "";
    return [street, cityState, zip].filter(Boolean).join(", ") || "No address";
  };

  // Render Step 1: Search & Select Store
  const renderSearchStep = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center pb-4 border-b">
        <h2 className="text-xl font-bold text-gray-900">Quick Order</h2>
        <p className="text-sm text-gray-500 mt-1">Search and select a store to create order</p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by store name, email, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11"
          autoFocus
        />
      </div>

      {/* Customer List */}
      {isLoadingCustomers ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-8">
          <User className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">No stores found</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                onClick={() => handleCustomerSelect(customer)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(customer.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{customer.company_name || customer.name}</h3>
                        <Badge className={cn("text-xs flex-shrink-0", getTypeBadgeColor(customer.type))}>
                          {customer.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                      <p className="text-xs text-gray-400">{customer.phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  // Render Step 2: Confirm Store Details
  const renderConfirmStep = () => {
    if (!selectedCustomer) return null;
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Confirm Store Details</h2>
            <p className="text-sm text-gray-500 mt-1">Review and confirm before adding products</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleBackToSearch}>
            Change Store
          </Button>
        </div>

        {/* Store Info Card */}
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                {getTypeIcon(selectedCustomer.type)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{selectedCustomer.company_name || selectedCustomer.name}</h3>
                <Badge className={cn("text-xs mt-1", getTypeBadgeColor(selectedCustomer.type))}>
                  {selectedCustomer.type}
                </Badge>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700 truncate">{selectedCustomer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{selectedCustomer.phone || "N/A"}</span>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Billing Address */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Billing Address
                </h4>
                <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                  {formatAddress(selectedCustomer.billing_address)}
                </p>
              </div>

              {/* Shipping Address */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Shipping Address
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    id="sameAsShipping"
                    checked={sameAsShipping}
                    onCheckedChange={(checked) => setSameAsShipping(checked as boolean)}
                  />
                  <label htmlFor="sameAsShipping" className="text-xs text-gray-500 cursor-pointer">
                    Same as billing
                  </label>
                </div>
                <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                  {sameAsShipping 
                    ? formatAddress(selectedCustomer.billing_address)
                    : formatAddress(selectedCustomer.shipping_address)
                  }
                </p>
              </div>
            </div>

            {/* Tax & Shipping Info */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <Badge variant="outline" className="text-xs">
                Tax: {selectedCustomer.tax_percentage || 0}%
              </Badge>
              {selectedCustomer.freeShipping && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  Free Shipping ✓
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Confirm Button */}
        <Button 
          className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
          onClick={handleConfirmCustomer}
        >
          <Check className="h-5 w-5 mr-2" />
          Confirm & Add Products
        </Button>
      </div>
    );
  };

  // Render Step 3: Products & Order
  const renderProductsStep = () => (
    <div className="space-y-4">
      {/* Header with Store Info */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            {getTypeIcon(selectedCustomer?.type || "Pharmacy")}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{selectedCustomer?.company_name || selectedCustomer?.name}</h3>
            <p className="text-xs text-gray-500">{selectedCustomer?.email}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleBackToSearch}>
          Change Store
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Products Section */}
        <div className="col-span-1 lg:col-span-7 order-1 lg:order-1">
          <Card>
            <CardContent className="p-3">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>

              {/* Product List */}
              <ScrollArea className="h-[55vh] lg:h-[380px]">
                <div className="space-y-2">
                  {loadingProducts ? (
                    <div className="flex items-center justify-center h-24">
                      <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-6">
                      <Package className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                      <p className="text-sm text-gray-500">No products found</p>
                    </div>
                  ) : (
                    filteredProducts.map((product: Product) => (
                      <div key={product.id} className={cn(
                        "border rounded-lg overflow-hidden transition-all",
                        expandedProduct === product.id ? "border-blue-400 ring-1 ring-blue-100" : "hover:border-gray-300"
                      )}>
                        {/* Product Header */}
                        <div
                          className={cn(
                            "flex items-center gap-3 p-2.5 cursor-pointer",
                            expandedProduct === product.id ? "bg-blue-50" : "hover:bg-gray-50"
                          )}
                          onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border">
                            <img 
                              src={product.image_url || "/placeholder.svg"} 
                              alt="" 
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} 
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.product_sizes?.length || 0} sizes</p>
                          </div>
                          <ChevronDown className={cn(
                            "w-4 h-4 transition-transform",
                            expandedProduct === product.id ? "rotate-180 text-blue-600" : "text-gray-400"
                          )} />
                        </div>

                        {/* Expanded Sizes */}
                        {expandedProduct === product.id && product.product_sizes && (
                          <div className="border-t bg-gray-50 p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {product.product_sizes.map((size: ProductSize) => (
                              <div key={size.id} className="bg-white rounded-lg p-2 border text-center">
                                <p className="text-sm font-semibold text-gray-900">
                                  {size.size_value} {size.size_unit}
                                </p>
                                <p className="text-base text-emerald-600 font-bold">
                                  ${size.price?.toFixed(2)}
                                </p>
                                <Button 
                                  size="sm" 
                                  className="mt-2 h-8 w-full bg-blue-600 hover:bg-blue-700 text-xs"
                                  onClick={(e) => { e.stopPropagation(); handleAddSize(product, size); }}
                                >
                                  <Plus className="w-3 h-3 mr-1" /> Add
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Custom Item Button */}
              <Button 
                variant="outline" 
                className="w-full mt-3 h-9 text-xs border-dashed"
                onClick={() => setShowCustomProductDialog(true)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Add Custom Item
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="col-span-1 lg:col-span-5 order-2 lg:order-2">
          <Card className="lg:sticky lg:top-4">
            <CardContent className="p-3 space-y-3 lg:max-h-[70vh] lg:overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  Order ({orderTotals.itemCount})
                </h4>
                <span className="text-lg font-bold text-blue-600">${orderTotals.total.toFixed(2)}</span>
              </div>

              {/* Cart Items */}
              <div className="max-h-[50vh] lg:h-[220px] overflow-y-auto pr-1 mb-3">
                {cartItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">No items added</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cartItems.map((item) => (
                      <div key={item.productId} className="bg-gray-50 rounded-lg p-2">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 w-5 p-0 text-gray-400 hover:text-red-500"
                            onClick={() => handleRemoveItem(item.productId)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        {item.sizes?.map((size: any, idx: number) => (
                          <div key={`${size.id}-${idx}`} className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">{size.size_value} {size.size_unit}</span>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={() => handleQuantityChange(item.productId, size.id, size.quantity - 1)}
                                disabled={size.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">{size.quantity}</span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={() => handleQuantityChange(item.productId, size.id, size.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <p className="text-right text-sm font-semibold text-blue-600 mt-1">
                          ${item.price?.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1 py-2 border-t text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>${orderTotals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span>${orderTotals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Shipping</span>
                  <span>{orderTotals.shipping === 0 ? "FREE" : `$${orderTotals.shipping.toFixed(2)}`}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">${orderTotals.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Create Order Button */}
              <Button 
                className="w-full h-11 mt-3 bg-green-600 hover:bg-green-700 text-base"
                onClick={handleCreateOrder}
                disabled={isSubmitting || cartItems.length === 0}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Create Order
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile quick action bar */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 border-t shadow-2xl backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Total ({orderTotals.itemCount} items)</p>
            <p className="text-lg font-semibold text-blue-600">${orderTotals.total.toFixed(2)}</p>
          </div>
          <Button 
            className="h-11 px-4 bg-green-600 hover:bg-green-700"
            onClick={handleCreateOrder}
            disabled={isSubmitting || cartItems.length === 0}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Create Order</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6 pb-28">
      <div className="max-w-5xl mx-auto">
        {/* Cancel Button */}
        {onCancel && (
          <div className="flex justify-end mb-4">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        )}

        {/* Main Card */}
        <Card className="shadow-lg">
          <CardContent className="p-4 md:p-6">
            {currentStep === "search" && renderSearchStep()}
            {currentStep === "confirm" && renderConfirmStep()}
            {currentStep === "products" && renderProductsStep()}
          </CardContent>
        </Card>
      </div>

      {/* Custom Product Dialog */}
      <CustomProductForm 
        isOpen={showCustomProductDialog} 
        onClose={() => setShowCustomProductDialog(false)}
        isEditing={false}
        form={null}
      />
    </div>
  );
};

export const QuickOrderCreation = memo(QuickOrderCreationComponent);
export default QuickOrderCreation;
