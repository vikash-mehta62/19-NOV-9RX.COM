  import { useState, useCallback } from "react";
import { OrderFormValues, ShippingAddressData } from "../../schemas/orderSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Truck, MapPin, Package, Calendar, Edit, ExternalLink, 
  Copy, Check, Phone, Mail, Building, DollarSign, Clock, Save, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Helper function to generate tracking URL based on carrier
const getTrackingUrl = (method: string, trackingNumber: string): string => {
  const carrier = method?.toLowerCase() || "";
  
  if (carrier.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  } else if (carrier.includes("ups")) {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  } else if (carrier.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  } else if (carrier.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
  }
  return `https://www.google.com/search?q=${trackingNumber}+tracking`;
};

// Helper function to safely get address fields
const getAddressField = (
  shippingAddress: ShippingAddressData | undefined,
  type: "billing" | "shipping",
  field: string
): string => {
  if (!shippingAddress) return "";
  
  const addressObj = shippingAddress[type];
  if (addressObj && typeof addressObj === 'object') {
    const value = (addressObj as Record<string, string>)[field];
    if (value) return value;
  }
  
  if (shippingAddress.address && typeof shippingAddress.address === 'object') {
    const legacyAddress = shippingAddress.address as Record<string, string>;
    const fieldMap: Record<string, string> = {
      street1: 'street',
      city: 'city',
      state: 'state',
      zipCode: 'zip_code',
    };
    const mappedField = fieldMap[field] || field;
    if (legacyAddress[mappedField]) return legacyAddress[mappedField];
  }
  
  return "";
};

interface ShippingTabProps {
  order: OrderFormValues;
  onEdit?: () => void;
  orderId?: string;
  onOrderUpdate?: () => void;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
}

export const ShippingTab = ({ order, onEdit, orderId, onOrderUpdate, userRole }: ShippingTabProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const canEdit = userRole === "admin" && order.status !== "cancelled" && !order.void;
  
  // Edit states
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Address form state
  const [addressForm, setAddressForm] = useState({
    fullName: order.shippingAddress?.fullName || order.customerInfo?.name || "",
    email: order.shippingAddress?.email || "",
    phone: order.shippingAddress?.phone || "",
    companyName: getAddressField(order.shippingAddress, "shipping", "companyName"),
    street1: getAddressField(order.shippingAddress, "shipping", "street1") || order.shippingAddress?.address?.street || "",
    street2: getAddressField(order.shippingAddress, "shipping", "street2") || "",
    city: getAddressField(order.shippingAddress, "shipping", "city") || order.shippingAddress?.address?.city || "",
    state: getAddressField(order.shippingAddress, "shipping", "state") || order.shippingAddress?.address?.state || "",
    zipCode: getAddressField(order.shippingAddress, "shipping", "zipCode") || order.shippingAddress?.address?.zip_code || "",
  });

  // Get shipping address
  const shippingStreet = getAddressField(order.shippingAddress, "shipping", "street1") || 
                         order.shippingAddress?.address?.street || "";
  const shippingStreet2 = getAddressField(order.shippingAddress, "shipping", "street2") || "";
  const shippingCity = getAddressField(order.shippingAddress, "shipping", "city") || 
                       order.shippingAddress?.address?.city || "";
  const shippingState = getAddressField(order.shippingAddress, "shipping", "state") || 
                        order.shippingAddress?.address?.state || "";
  const shippingZip = getAddressField(order.shippingAddress, "shipping", "zipCode") || 
                      order.shippingAddress?.address?.zip_code || "";
  const shippingCompany = getAddressField(order.shippingAddress, "shipping", "companyName") || "";

  const fullAddress = [shippingStreet, shippingStreet2, shippingCity, shippingState, shippingZip]
    .filter(Boolean)
    .join(", ");

  const handleCopyAddress = () => {
    if (fullAddress) {
      navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      toast({ title: "Copied!", description: "Address copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyTracking = () => {
    if (order.shipping?.trackingNumber) {
      navigator.clipboard.writeText(order.shipping.trackingNumber);
      toast({ title: "Copied!", description: "Tracking number copied to clipboard" });
    }
  };

  // Handle save address
  const handleSaveAddress = useCallback(async () => {
    if (!orderId) return;
    
    setIsSaving(true);
    try {
      const updatedShippingAddress = {
        ...order.shippingAddress,
        fullName: addressForm.fullName,
        email: addressForm.email,
        phone: addressForm.phone,
        shipping: {
          companyName: addressForm.companyName,
          street1: addressForm.street1,
          street2: addressForm.street2,
          city: addressForm.city,
          state: addressForm.state,
          zipCode: addressForm.zipCode,
          phone: addressForm.phone,
        },
      };
      
      const { error } = await supabase
        .from("orders")
        .update({
          shippingAddress: updatedShippingAddress,
        })
        .eq("id", orderId);
      
      if (error) throw error;
      
      setIsEditingAddress(false);
      onOrderUpdate?.();
      toast({
        title: "Success",
        description: "Delivery address updated successfully",
      });
    } catch (error) {
      console.error("Error saving address:", error);
      toast({
        title: "Error",
        description: "Failed to save delivery address",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [orderId, addressForm, order.shippingAddress, onOrderUpdate, toast]);

  // Cancel editing
  const handleCancelEdit = () => {
    setAddressForm({
      fullName: order.shippingAddress?.fullName || order.customerInfo?.name || "",
      email: order.shippingAddress?.email || "",
      phone: order.shippingAddress?.phone || "",
      companyName: getAddressField(order.shippingAddress, "shipping", "companyName"),
      street1: getAddressField(order.shippingAddress, "shipping", "street1") || order.shippingAddress?.address?.street || "",
      street2: getAddressField(order.shippingAddress, "shipping", "street2") || "",
      city: getAddressField(order.shippingAddress, "shipping", "city") || order.shippingAddress?.address?.city || "",
      state: getAddressField(order.shippingAddress, "shipping", "state") || order.shippingAddress?.address?.state || "",
      zipCode: getAddressField(order.shippingAddress, "shipping", "zipCode") || order.shippingAddress?.address?.zip_code || "",
    });
    setIsEditingAddress(false);
  };

  // Calculate totals
  const totalItems = order.items.reduce(
    (total, item) => total + item.sizes.reduce((sum, size) => sum + size.quantity, 0),
    0
  );

  // Get status styling
  const getStatusStyle = () => {
    switch (order.status) {
      case "delivered":
        return { bg: "bg-green-100", text: "text-green-800", border: "border-green-300", label: "Delivered" };
      case "shipped":
        return { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", label: "Shipped" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300", label: "Not Shipped" };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <div className="space-y-6">
      {/* Shipping Status */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className={`border-b pb-4 ${
          order.status === "delivered" 
            ? "bg-gradient-to-r from-green-50 to-blue-50"
            : order.status === "shipped"
            ? "bg-gradient-to-r from-blue-50 to-indigo-50"
            : "bg-gradient-to-r from-gray-50 to-slate-50"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Truck className={`w-5 h-5 ${
                  order.status === "delivered" ? "text-green-600" :
                  order.status === "shipped" ? "text-blue-600" : "text-gray-600"
                }`} />
              </div>
              <div>
                <CardTitle className="text-lg">Shipping Status</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Delivery tracking information</p>
              </div>
            </div>
            <Badge className={`${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border px-4 py-1.5 font-semibold`}>
              {statusStyle.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {order.shipping && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Truck className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Shipping Method</p>
                  <p className="font-medium text-gray-900 capitalize">{order.shipping.method || "Standard"}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <DollarSign className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Shipping Cost</p>
                  <p className="font-medium text-gray-900">${parseFloat(order.shipping_cost || "0").toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {order.shipping?.trackingNumber && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Tracking Number</p>
                    <p className="font-mono text-blue-900 mt-1">{order.shipping.trackingNumber}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyTracking}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="mt-4">
                <a
                  href={getTrackingUrl(order.shipping.method, order.shipping.trackingNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Track Package
                </a>
              </div>
            </div>
          )}

          {order.shipping?.estimatedDelivery && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Estimated Delivery</p>
                <p className="font-medium text-amber-900">{order.shipping.estimatedDelivery}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Address */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Delivery Address</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Where the order will be delivered</p>
              </div>
            </div>
            {canEdit && !isEditingAddress && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingAddress(true)} className="gap-1.5 bg-white">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
            {isEditingAddress && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit} className="gap-1.5">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveAddress} disabled={isSaving} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                  {isSaving ? "Saving..." : <><Save className="w-4 h-4" /> Save</>}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {isEditingAddress ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipient Details</p>
                  <div>
                    <Label htmlFor="address-name">Full Name</Label>
                    <Input
                      id="address-name"
                      value={addressForm.fullName}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address-company">Company Name</Label>
                    <Input
                      id="address-company"
                      value={addressForm.companyName}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Company Name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address-email">Email</Label>
                    <Input
                      id="address-email"
                      type="email"
                      value={addressForm.email}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address-phone">Phone</Label>
                    <Input
                      id="address-phone"
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone Number"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Address</p>
                  <div>
                    <Label htmlFor="address-street1">Street Address</Label>
                    <Input
                      id="address-street1"
                      value={addressForm.street1}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, street1: e.target.value }))}
                      placeholder="Street Address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address-street2">Street Address 2</Label>
                    <Input
                      id="address-street2"
                      value={addressForm.street2}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, street2: e.target.value }))}
                      placeholder="Apt, Suite, etc."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="min-w-0">
                      <Label htmlFor="address-city">City</Label>
                      <Input
                        id="address-city"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="City"
                        className="w-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor="address-state">State</Label>
                      <Input
                        id="address-state"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="State"
                        className="w-full"
                      />
                    </div>
                    <div className="min-w-0">
                      <Label htmlFor="address-zip">ZIP Code</Label>
                      <Input
                        id="address-zip"
                        value={addressForm.zipCode}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, zipCode: e.target.value }))}
                        placeholder="ZIP"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Building className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Recipient</p>
                  <p className="font-semibold text-gray-900">
                    {order.shippingAddress?.fullName || order.customerInfo?.name || "N/A"}
                  </p>
                  {shippingCompany && (
                    <p className="text-sm text-gray-600">{shippingCompany}</p>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      {shippingStreet ? (
                        <>
                          <p className="font-medium text-gray-900">{shippingStreet}</p>
                          {shippingStreet2 && <p className="text-gray-600">{shippingStreet2}</p>}
                          <p className="text-gray-600">
                            {[shippingCity, shippingState].filter(Boolean).join(", ")} {shippingZip}
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-400 italic">No address provided</p>
                      )}
                    </div>
                  </div>
                  {fullAddress && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyAddress}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Phone</p>
                    <p className="font-medium text-gray-900">{order.shippingAddress?.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</p>
                    <p className="font-medium text-gray-900">{order.shippingAddress?.email || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Package Contents */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Package className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Package Contents</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">{order.items.length} products</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {order.items.map((item, index) => {
              const itemQty = item.sizes.reduce((sum, size) => sum + size.quantity, 0);
              const firstSize = item.sizes[0] as { type?: string } | undefined;
              const itemType = firstSize?.type?.toLowerCase() || "unit";
              
              return (
                <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.sizes.length} size{item.sizes.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                    {itemQty} {itemType}{itemQty > 1 ? "s" : ""}
                  </Badge>
                </div>
              );
            })}
          </div>
          
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-gray-700">Total Items</span>
              <span className="text-gray-900">{totalItems} units</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Date */}
      <Card className="p-4 border-0 shadow-sm bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Calendar className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Order Date</p>
            <p className="font-semibold text-gray-900">
              {new Date(order.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "UTC",
              })}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
