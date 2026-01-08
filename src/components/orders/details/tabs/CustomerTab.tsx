import { useState, useCallback } from "react";
import { OrderFormValues, ShippingAddressData } from "../../schemas/orderSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, Mail, Phone, MapPin, Building, Edit, 
  FileText, Copy, Check, AlertCircle, Truck, Save, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CustomerTabProps {
  customerInfo?: OrderFormValues["customerInfo"];
  shippingAddress?: ShippingAddressData;
  companyName?: string;
  poIs?: boolean;
  onEdit?: () => void;
  orderId?: string;
  onOrderUpdate?: () => void;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
  orderStatus?: string;
  isVoid?: boolean;
}

// Helper function to safely get address fields from different structures
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

// Format full address
const formatFullAddress = (
  shippingAddress: ShippingAddressData | undefined,
  type: "billing" | "shipping"
): string => {
  const street1 = getAddressField(shippingAddress, type, "street1");
  const street2 = getAddressField(shippingAddress, type, "street2");
  const city = getAddressField(shippingAddress, type, "city");
  const state = getAddressField(shippingAddress, type, "state");
  const zipCode = getAddressField(shippingAddress, type, "zipCode");
  
  const parts = [street1, street2, city, state, zipCode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "";
};

// Info Row Component
const InfoRow = ({ 
  icon: Icon, 
  label, 
  value, 
  copyable = false,
  highlight = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string; 
  copyable?: boolean;
  highlight?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const handleCopy = () => {
    if (value && value !== "N/A") {
      navigator.clipboard.writeText(value);
      setCopied(true);
      toast({ title: "Copied!", description: `${label} copied to clipboard` });
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const isEmpty = !value || value === "N/A";
  
  return (
    <div className={`
      flex items-start gap-3 p-3 rounded-lg transition-colors group
      ${highlight ? 'bg-blue-50/50' : 'hover:bg-gray-50'}
      ${isEmpty ? 'opacity-60' : ''}
    `}>
      <div className={`
        p-2 rounded-lg 
        ${isEmpty ? 'bg-gray-100' : 'bg-gradient-to-br from-emerald-50 to-teal-50'}
      `}>
        <Icon className={`w-4 h-4 ${isEmpty ? 'text-gray-400' : 'text-emerald-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`font-medium mt-0.5 ${isEmpty ? 'text-gray-400 italic' : 'text-gray-900'}`}>
          {value || "N/A"}
        </p>
      </div>
      {copyable && !isEmpty && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-100"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4 text-gray-400" />
          )}
        </Button>
      )}
    </div>
  );
};

export const CustomerTab = ({
  customerInfo,
  shippingAddress,
  companyName,
  poIs,
  onEdit,
  orderId,
  onOrderUpdate,
  userRole,
  orderStatus,
  isVoid,
}: CustomerTabProps) => {
  const { toast } = useToast();
  const canEdit = userRole === "admin" && orderStatus !== "cancelled" && !isVoid;
  
  // Edit states
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Billing form state
  const [billingForm, setBillingForm] = useState({
    name: customerInfo?.name || "",
    email: customerInfo?.email || "",
    phone: customerInfo?.phone || "",
    street1: getAddressField(shippingAddress, "billing", "street1"),
    street2: getAddressField(shippingAddress, "billing", "street2"),
    city: getAddressField(shippingAddress, "billing", "city"),
    state: getAddressField(shippingAddress, "billing", "state"),
    zipCode: getAddressField(shippingAddress, "billing", "zipCode"),
  });
  
  // Shipping form state
  const [shippingForm, setShippingForm] = useState({
    fullName: shippingAddress?.fullName || customerInfo?.name || "",
    email: shippingAddress?.email || customerInfo?.email || "",
    phone: shippingAddress?.phone || "",
    companyName: getAddressField(shippingAddress, "shipping", "companyName"),
    street1: getAddressField(shippingAddress, "shipping", "street1"),
    street2: getAddressField(shippingAddress, "shipping", "street2"),
    city: getAddressField(shippingAddress, "shipping", "city"),
    state: getAddressField(shippingAddress, "shipping", "state"),
    zipCode: getAddressField(shippingAddress, "shipping", "zipCode"),
  });

  // Handle save billing
  const handleSaveBilling = useCallback(async () => {
    if (!orderId) return;
    
    setIsSaving(true);
    try {
      // Update customerInfo
      const updatedCustomerInfo = {
        ...customerInfo,
        name: billingForm.name,
        email: billingForm.email,
        phone: billingForm.phone,
      };
      
      // Update shippingAddress billing section
      const updatedShippingAddress = {
        ...shippingAddress,
        billing: {
          street1: billingForm.street1,
          street2: billingForm.street2,
          city: billingForm.city,
          state: billingForm.state,
          zipCode: billingForm.zipCode,
          phone: billingForm.phone,
        },
      };
      
      const { error } = await supabase
        .from("orders")
        .update({
          customerInfo: updatedCustomerInfo,
          shippingAddress: updatedShippingAddress,
        })
        .eq("id", orderId);
      
      if (error) throw error;
      
      setIsEditingBilling(false);
      onOrderUpdate?.();
      toast({
        title: "Success",
        description: "Billing information updated successfully",
      });
    } catch (error) {
      console.error("Error saving billing:", error);
      toast({
        title: "Error",
        description: "Failed to save billing information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [orderId, billingForm, customerInfo, shippingAddress, onOrderUpdate, toast]);

  // Handle save shipping
  const handleSaveShipping = useCallback(async () => {
    if (!orderId) return;
    
    setIsSaving(true);
    try {
      const updatedShippingAddress = {
        ...shippingAddress,
        fullName: shippingForm.fullName,
        email: shippingForm.email,
        phone: shippingForm.phone,
        shipping: {
          companyName: shippingForm.companyName,
          street1: shippingForm.street1,
          street2: shippingForm.street2,
          city: shippingForm.city,
          state: shippingForm.state,
          zipCode: shippingForm.zipCode,
          phone: shippingForm.phone,
        },
      };
      
      const { error } = await supabase
        .from("orders")
        .update({
          shippingAddress: updatedShippingAddress,
        })
        .eq("id", orderId);
      
      if (error) throw error;
      
      setIsEditingShipping(false);
      onOrderUpdate?.();
      toast({
        title: "Success",
        description: "Shipping information updated successfully",
      });
    } catch (error) {
      console.error("Error saving shipping:", error);
      toast({
        title: "Error",
        description: "Failed to save shipping information",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [orderId, shippingForm, shippingAddress, onOrderUpdate, toast]);

  // Cancel editing
  const handleCancelBilling = () => {
    setBillingForm({
      name: customerInfo?.name || "",
      email: customerInfo?.email || "",
      phone: customerInfo?.phone || "",
      street1: getAddressField(shippingAddress, "billing", "street1"),
      street2: getAddressField(shippingAddress, "billing", "street2"),
      city: getAddressField(shippingAddress, "billing", "city"),
      state: getAddressField(shippingAddress, "billing", "state"),
      zipCode: getAddressField(shippingAddress, "billing", "zipCode"),
    });
    setIsEditingBilling(false);
  };

  const handleCancelShipping = () => {
    setShippingForm({
      fullName: shippingAddress?.fullName || customerInfo?.name || "",
      email: shippingAddress?.email || customerInfo?.email || "",
      phone: shippingAddress?.phone || "",
      companyName: getAddressField(shippingAddress, "shipping", "companyName"),
      street1: getAddressField(shippingAddress, "shipping", "street1"),
      street2: getAddressField(shippingAddress, "shipping", "street2"),
      city: getAddressField(shippingAddress, "shipping", "city"),
      state: getAddressField(shippingAddress, "shipping", "state"),
      zipCode: getAddressField(shippingAddress, "shipping", "zipCode"),
    });
    setIsEditingShipping(false);
  };
  
  if (!customerInfo) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No customer information available</p>
          <p className="text-sm text-gray-400 mt-1">Customer details will appear here once added</p>
        </CardContent>
      </Card>
    );
  }

  // Get billing address info
  const billingStreet1 = getAddressField(shippingAddress, "billing", "street1");
  const billingStreet2 = getAddressField(shippingAddress, "billing", "street2");
  const billingCity = getAddressField(shippingAddress, "billing", "city");
  const billingState = getAddressField(shippingAddress, "billing", "state");
  const billingZip = getAddressField(shippingAddress, "billing", "zipCode");
  const billingPhone = getAddressField(shippingAddress, "billing", "phone");
  
  // Get shipping address info
  const shippingStreet1 = getAddressField(shippingAddress, "shipping", "street1");
  const shippingStreet2 = getAddressField(shippingAddress, "shipping", "street2");
  const shippingCity = getAddressField(shippingAddress, "shipping", "city");
  const shippingState = getAddressField(shippingAddress, "shipping", "state");
  const shippingZip = getAddressField(shippingAddress, "shipping", "zipCode");
  const shippingPhone = getAddressField(shippingAddress, "shipping", "phone") || shippingAddress?.phone;
  const shippingCompany = getAddressField(shippingAddress, "shipping", "companyName");
  const shippingName = shippingAddress?.fullName || customerInfo?.name;
  const shippingEmail = shippingAddress?.email || customerInfo?.email;

  // Format addresses for display
  const formatAddress = (street1: string, street2: string, city: string, state: string, zip: string) => {
    if (!street1 && !city) return null;
    return (
      <div className="space-y-0.5">
        {street1 && <p className="font-medium text-gray-900">{street1}</p>}
        {street2 && <p className="text-gray-600">{street2}</p>}
        {(city || state || zip) && (
          <p className="text-gray-600">
            {[city, state].filter(Boolean).join(", ")} {zip}
          </p>
        )}
      </div>
    );
  };

  const billingAddressDisplay = formatAddress(billingStreet1, billingStreet2, billingCity, billingState, billingZip);
  const shippingAddressDisplay = formatAddress(shippingStreet1, shippingStreet2, shippingCity, shippingState, shippingZip);

  // Check if addresses are the same
  const addressesMatch = billingStreet1 === shippingStreet1 && 
                         billingCity === shippingCity && 
                         billingState === shippingState;

  return (
    <div className="space-y-6">
      {/* Billing/Vendor Information */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {poIs ? "Vendor Information" : "Billing Information"}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {poIs ? "Vendor contact and address details" : "Customer billing details"}
                </p>
              </div>
            </div>
            {canEdit && !isEditingBilling && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingBilling(true)} className="gap-1.5 bg-white">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
            {isEditingBilling && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelBilling} className="gap-1.5">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveBilling} disabled={isSaving} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                  {isSaving ? "Saving..." : <><Save className="w-4 h-4" /> Save</>}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isEditingBilling ? (
            <div className="p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact Details</p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="billing-name">Name</Label>
                      <Input
                        id="billing-name"
                        value={billingForm.name}
                        onChange={(e) => setBillingForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Full Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billing-email">Email</Label>
                      <Input
                        id="billing-email"
                        type="email"
                        value={billingForm.email}
                        onChange={(e) => setBillingForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billing-phone">Phone</Label>
                      <Input
                        id="billing-phone"
                        value={billingForm.phone}
                        onChange={(e) => setBillingForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone Number"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Billing Address</p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="billing-street1">Street Address</Label>
                      <Input
                        id="billing-street1"
                        value={billingForm.street1}
                        onChange={(e) => setBillingForm(prev => ({ ...prev, street1: e.target.value }))}
                        placeholder="Street Address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billing-street2">Street Address 2</Label>
                      <Input
                        id="billing-street2"
                        value={billingForm.street2}
                        onChange={(e) => setBillingForm(prev => ({ ...prev, street2: e.target.value }))}
                        placeholder="Apt, Suite, etc."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="billing-city">City</Label>
                        <Input
                          id="billing-city"
                          value={billingForm.city}
                          onChange={(e) => setBillingForm(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing-state">State</Label>
                        <Input
                          id="billing-state"
                          value={billingForm.state}
                          onChange={(e) => setBillingForm(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing-zip">ZIP Code</Label>
                        <Input
                          id="billing-zip"
                          value={billingForm.zipCode}
                          onChange={(e) => setBillingForm(prev => ({ ...prev, zipCode: e.target.value }))}
                          placeholder="ZIP"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Contact Info */}
              <div className="p-4 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact Details</p>
                
                {companyName && (
                  <InfoRow icon={Building} label="Company" value={companyName} />
                )}
                <InfoRow icon={User} label="Name" value={customerInfo?.name || ""} copyable />
                <InfoRow icon={Mail} label="Email" value={customerInfo?.email || ""} copyable />
                <InfoRow icon={Phone} label="Phone" value={customerInfo?.phone || billingPhone || ""} copyable />
                
                {!poIs && customerInfo?.type && (
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50">
                      <FileText className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer Type</p>
                      <Badge variant="secondary" className="mt-1 capitalize bg-purple-100 text-purple-700">
                        {customerInfo.type}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Billing Address */}
              <div className="p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Billing Address</p>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="p-2 rounded-lg bg-white shadow-sm">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    {billingAddressDisplay || (
                      <p className="text-gray-400 italic">No billing address provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Information */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-teal-50 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Shipping Information</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">Delivery address and contact</p>
              </div>
              {addressesMatch && billingStreet1 && !isEditingShipping && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 ml-2">
                  Same as Billing
                </Badge>
              )}
            </div>
            {canEdit && !isEditingShipping && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingShipping(true)} className="gap-1.5 bg-white">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            )}
            {isEditingShipping && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelShipping} className="gap-1.5">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveShipping} disabled={isSaving} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                  {isSaving ? "Saving..." : <><Save className="w-4 h-4" /> Save</>}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isEditingShipping ? (
            <div className="p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipient Details</p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="shipping-name">Full Name</Label>
                      <Input
                        id="shipping-name"
                        value={shippingForm.fullName}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Full Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping-company">Company Name</Label>
                      <Input
                        id="shipping-company"
                        value={shippingForm.companyName}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Company Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping-email">Email</Label>
                      <Input
                        id="shipping-email"
                        type="email"
                        value={shippingForm.email}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping-phone">Phone</Label>
                      <Input
                        id="shipping-phone"
                        value={shippingForm.phone}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone Number"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Delivery Address</p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="shipping-street1">Street Address</Label>
                      <Input
                        id="shipping-street1"
                        value={shippingForm.street1}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, street1: e.target.value }))}
                        placeholder="Street Address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="shipping-street2">Street Address 2</Label>
                      <Input
                        id="shipping-street2"
                        value={shippingForm.street2}
                        onChange={(e) => setShippingForm(prev => ({ ...prev, street2: e.target.value }))}
                        placeholder="Apt, Suite, etc."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="shipping-city">City</Label>
                        <Input
                          id="shipping-city"
                          value={shippingForm.city}
                          onChange={(e) => setShippingForm(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <Label htmlFor="shipping-state">State</Label>
                        <Input
                          id="shipping-state"
                          value={shippingForm.state}
                          onChange={(e) => setShippingForm(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <Label htmlFor="shipping-zip">ZIP Code</Label>
                        <Input
                          id="shipping-zip"
                          value={shippingForm.zipCode}
                          onChange={(e) => setShippingForm(prev => ({ ...prev, zipCode: e.target.value }))}
                          placeholder="ZIP"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {/* Shipping Contact */}
              <div className="p-4 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recipient Details</p>
                
                {shippingCompany && (
                  <InfoRow icon={Building} label="Company" value={shippingCompany} />
                )}
                <InfoRow icon={User} label="Name" value={shippingName || ""} copyable />
                <InfoRow icon={Mail} label="Email" value={shippingEmail || ""} copyable />
                <InfoRow icon={Phone} label="Phone" value={shippingPhone || ""} copyable />
              </div>
              
              {/* Shipping Address */}
              <div className="p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Delivery Address</p>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="p-2 rounded-lg bg-white shadow-sm">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    {shippingAddressDisplay || (
                      <p className="text-gray-400 italic">No shipping address provided</p>
                    )}
                  </div>
                </div>
                
                {/* Copy Full Address Button */}
                {shippingAddressDisplay && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      const fullAddress = formatFullAddress(shippingAddress, "shipping");
                      if (fullAddress) {
                        navigator.clipboard.writeText(fullAddress);
                        toast({ title: "Copied!", description: "Address copied to clipboard" });
                      }
                    }}
                  >
                    <Copy className="w-4 h-4 mr-1.5" />
                    Copy Full Address
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
