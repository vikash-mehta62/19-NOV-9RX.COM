import { useState, useEffect } from "react";
import { MapPin, Edit2, Check, User, Lock, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAddressPredictions, getPlaceDetails } from "@/utils/googleAddressHelper";

export interface BillingAddress {
  company_name?: string;
  attention?: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  type?: string;
}

export interface SavedLocation {
  id?: string;
  name?: string;
  type?: string;
  status?: string;
  manager?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: {
    street1?: string;
    street2?: string;
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    countryRegion?: string;
    phone?: string;
    attention?: string;
  };
}

export interface CustomerAndAddressStepProps {
  customer?: Customer | null;
  billingAddress?: BillingAddress;
  shippingAddress?: ShippingAddress;
  onBillingAddressChange: (address: BillingAddress) => void;
  onShippingAddressChange: (address: ShippingAddress) => void;
  isGroupMode?: boolean;
  selectedPharmacyName?: string;
  savedLocations?: SavedLocation[];
  profileBillingAddress?: {
    street1?: string;
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    attention?: string;
  };
  profileShippingAddress?: {
    street1?: string;
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    attention?: string;
  };
}

export const CustomerAndAddressStep = ({
  customer,
  billingAddress,
  shippingAddress,
  onBillingAddressChange,
  onShippingAddressChange,
  isGroupMode = false,
  selectedPharmacyName,
  savedLocations = [],
  profileBillingAddress,
  profileShippingAddress,
}: CustomerAndAddressStepProps) => {
  const [isEditingBilling, setIsEditingBilling] = useState(!billingAddress?.street);
  const [isEditingShipping, setIsEditingShipping] = useState(!shippingAddress?.street);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedBillingLocation, setSelectedBillingLocation] = useState<string>("");
  const [selectedShippingLocation, setSelectedShippingLocation] = useState<string>("");
  
  // Google Address API suggestions
  const [billingSuggestions, setBillingSuggestions] = useState<any[]>([]);
  const [shippingSuggestions, setShippingSuggestions] = useState<any[]>([]);

  // Filter valid locations with addresses (only active ones)
  const validLocations = savedLocations.filter((loc) => {
    if (!loc.address || typeof loc.address !== 'object') return false;
    const addr = loc.address as any;
    const hasAddress = addr.street1 || addr.street || addr.city;
    const isActive = loc.status !== "inactive";
    return hasAddress && isActive;
  });

  // Helper to get street from location address
  const getStreet = (addr: any) => addr?.street1 || addr?.street || "";

  // Check if profile has billing address
  const hasProfileBilling = profileBillingAddress && (profileBillingAddress.street1 || profileBillingAddress.street || profileBillingAddress.city);
  
  // Check if profile has shipping address
  const hasProfileShipping = profileShippingAddress && (profileShippingAddress.street1 || profileShippingAddress.street || profileShippingAddress.city);

  const [billingForm, setBillingForm] = useState<BillingAddress>({
    company_name: billingAddress?.company_name || "",
    attention: billingAddress?.attention || "",
    street: billingAddress?.street || "",
    city: billingAddress?.city || "",
    state: billingAddress?.state || "",
    zip_code: billingAddress?.zip_code || "",
  });

  const [shippingForm, setShippingForm] = useState<ShippingAddress>({
    fullName: shippingAddress?.fullName || customer?.name || "",
    email: shippingAddress?.email || customer?.email || "",
    phone: shippingAddress?.phone || customer?.phone || "",
    street: shippingAddress?.street || "",
    city: shippingAddress?.city || "",
    state: shippingAddress?.state || "",
    zip_code: shippingAddress?.zip_code || "",
  });

  // Handle saved location selection for billing
  const handleBillingLocationSelect = (locationId: string) => {
    setSelectedBillingLocation(locationId);
    
    // Check if profile billing address is selected
    if (locationId === "profile-billing" && profileBillingAddress) {
      const newBilling: BillingAddress = {
        company_name: customer?.company_name || billingForm.company_name || "",
        attention: profileBillingAddress.attention || "",
        street: profileBillingAddress.street1 || profileBillingAddress.street || "",
        city: profileBillingAddress.city || "",
        state: profileBillingAddress.state || "",
        zip_code: profileBillingAddress.zip_code || "",
      };
      setBillingForm(newBilling);
      onBillingAddressChange(newBilling);
      setIsEditingBilling(false);
      return;
    }
    
    const location = validLocations.find((loc) => loc.id === locationId || loc.name === locationId);
    if (location?.address) {
      const addr = location.address as any;
      const newBilling: BillingAddress = {
        company_name: customer?.company_name || billingForm.company_name || "",
        attention: addr.attention || "",
        street: addr.street1 || addr.street || "",
        city: addr.city || "",
        state: addr.state || "",
        zip_code: addr.zip_code || "",
      };
      setBillingForm(newBilling);
      onBillingAddressChange(newBilling);
      setIsEditingBilling(false);
    }
  };

  // Handle saved location selection for shipping
  const handleShippingLocationSelect = (locationId: string) => {
    setSelectedShippingLocation(locationId);
    setSameAsBilling(false);
    
    // Check if profile shipping address is selected
    if (locationId === "profile-shipping" && profileShippingAddress) {
      const newShipping: ShippingAddress = {
        fullName: shippingForm.fullName || customer?.name || "",
        email: shippingForm.email || customer?.email || "",
        phone: profileShippingAddress.phone || shippingForm.phone || customer?.phone || "",
        street: profileShippingAddress.street1 || profileShippingAddress.street || "",
        city: profileShippingAddress.city || "",
        state: profileShippingAddress.state || "",
        zip_code: profileShippingAddress.zip_code || "",
      };
      setShippingForm(newShipping);
      onShippingAddressChange(newShipping);
      setIsEditingShipping(false);
      return;
    }
    
    const location = validLocations.find((loc) => loc.id === locationId || loc.name === locationId);
    if (location?.address) {
      const addr = location.address as any;
      const newShipping: ShippingAddress = {
        fullName: shippingForm.fullName || customer?.name || "",
        email: shippingForm.email || customer?.email || "",
        phone: addr.phone || shippingForm.phone || customer?.phone || "",
        street: addr.street1 || addr.street || "",
        city: addr.city || "",
        state: addr.state || "",
        zip_code: addr.zip_code || "",
      };
      setShippingForm(newShipping);
      onShippingAddressChange(newShipping);
      setIsEditingShipping(false);
    }
  };

  // Update shipping form when customer info changes
  useEffect(() => {
    if (!shippingAddress?.fullName && customer?.name) {
      setShippingForm((prev) => ({ ...prev, fullName: customer.name }));
    }
    if (!shippingAddress?.email && customer?.email) {
      setShippingForm((prev) => ({ ...prev, email: customer.email }));
    }
    if (!shippingAddress?.phone && customer?.phone) {
      setShippingForm((prev) => ({ ...prev, phone: customer.phone }));
    }
  }, [customer, shippingAddress]);

  // Handle "Same as billing" checkbox
  useEffect(() => {
    if (sameAsBilling && billingForm.street) {
      const updatedShipping: ShippingAddress = {
        fullName: shippingForm.fullName || customer?.name || "",
        email: shippingForm.email || customer?.email || "",
        phone: shippingForm.phone || customer?.phone || "",
        street: billingForm.street,
        city: billingForm.city,
        state: billingForm.state,
        zip_code: billingForm.zip_code,
      };
      setShippingForm(updatedShipping);
      onShippingAddressChange(updatedShipping);
      setIsEditingShipping(false);
    }
  }, [sameAsBilling, billingForm]);

  // Google Address API - Handle billing address change
  const handleBillingStreetChange = (value: string) => {
    setBillingForm({ ...billingForm, street: value });
    getAddressPredictions(value, setBillingSuggestions);
  };

  // Google Address API - Handle shipping address change
  const handleShippingStreetChange = (value: string) => {
    setShippingForm({ ...shippingForm, street: value });
    getAddressPredictions(value, setShippingSuggestions);
  };

  // Google Address API - Handle billing suggestion click
  const handleBillingSuggestionClick = (suggestion: any) => {
    getPlaceDetails(suggestion.place_id, (address) => {
      if (address) {
        setBillingForm({
          ...billingForm,
          street: address.street,
          city: address.city,
          state: address.state,
          zip_code: address.zip_code,
        });
      }
    });
    setBillingSuggestions([]);
  };

  // Google Address API - Handle shipping suggestion click
  const handleShippingSuggestionClick = (suggestion: any) => {
    getPlaceDetails(suggestion.place_id, (address) => {
      if (address) {
        setShippingForm({
          ...shippingForm,
          street: address.street,
          city: address.city,
          state: address.state,
          zip_code: address.zip_code,
        });
      }
    });
    setShippingSuggestions([]);
  };

  // Validation function for address
  const validateAddress = (address: Partial<BillingAddress>, prefix: string): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!address.street || address.street.trim() === "") {
      newErrors[`${prefix}.street`] = "Street address is required";
      isValid = false;
    }
    if (!address.city || address.city.trim() === "") {
      newErrors[`${prefix}.city`] = "City is required";
      isValid = false;
    }
    if (!address.state || address.state.trim() === "") {
      newErrors[`${prefix}.state`] = "State is required";
      isValid = false;
    }
    if (!address.zip_code || address.zip_code.trim() === "") {
      newErrors[`${prefix}.zip_code`] = "ZIP code is required";
      isValid = false;
    } else if (!/^\d{5}(-\d{4})?$/.test(address.zip_code)) {
      newErrors[`${prefix}.zip_code`] = "Invalid ZIP code format (e.g., 12345)";
      isValid = false;
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return isValid;
  };

  // Validation function for shipping contact
  const validateShippingContact = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!shippingForm.fullName || shippingForm.fullName.trim() === "") {
      newErrors["shipping.fullName"] = "Full name is required";
      isValid = false;
    }
    if (!shippingForm.email || shippingForm.email.trim() === "") {
      newErrors["shipping.email"] = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingForm.email)) {
      newErrors["shipping.email"] = "Invalid email format";
      isValid = false;
    }
    if (!shippingForm.phone || shippingForm.phone.trim() === "") {
      newErrors["shipping.phone"] = "Phone is required";
      isValid = false;
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return isValid;
  };

  const handleSaveBilling = () => {
    // Clear previous billing errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith("billing.")) delete newErrors[key];
      });
      return newErrors;
    });

    if (validateAddress(billingForm, "billing")) {
      onBillingAddressChange(billingForm);
      setIsEditingBilling(false);
    }
  };

  const handleSaveShipping = () => {
    // Clear previous shipping errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith("shipping.")) delete newErrors[key];
      });
      return newErrors;
    });

    const contactValid = validateShippingContact();
    const addressValid = validateAddress(shippingForm, "shipping");

    if (contactValid && addressValid) {
      onShippingAddressChange(shippingForm);
      setIsEditingShipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          {isGroupMode ? "Pharmacy & Address Information" : "Customer & Address Information"}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {isGroupMode 
            ? "Review selected pharmacy information and confirm addresses for this order"
            : "Review your information and confirm addresses for this order"
          }
        </p>
        {isGroupMode && selectedPharmacyName && (
          <div className="mt-2 flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
              <MapPin className="w-3 h-3 mr-1" />
              {selectedPharmacyName}
            </Badge>
          </div>
        )}
      </div>

      {/* Customer Info Card - Read-only */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              {isGroupMode ? "Selected Pharmacy Information" : "Your Information"}
            </CardTitle>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              <Lock className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Name</p>
              <p className="text-sm font-medium text-gray-900">{customer?.name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Company</p>
              <p className="text-sm font-medium text-gray-900">{customer?.company_name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Email</p>
              <p className="text-sm font-medium text-gray-900 break-words">{customer?.email || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Phone</p>
              <p className="text-sm font-medium text-gray-900">{customer?.phone || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Address Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Billing Address */}
        <Card className={`transition-all duration-300 ${isEditingBilling ? "border-blue-500 shadow-lg" : ""}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Billing Address
              </CardTitle>
              {!isEditingBilling && billingForm.street && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingBilling(true)} className="h-8">
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Saved Locations Dropdown */}
            {(validLocations.length > 0 || hasProfileBilling) && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-xs text-blue-700 font-medium flex items-center gap-1.5 mb-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Select Saved Location
                </Label>
                <Select value={selectedBillingLocation} onValueChange={handleBillingLocationSelect}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choose a saved location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Profile Billing Address Option */}
                    {hasProfileBilling && (
                      <SelectItem value="profile-billing">
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-600">📍 Profile Billing Address</span>
                          <span className="text-xs text-gray-500">
                            {getStreet(profileBillingAddress)}, {profileBillingAddress?.city}, {profileBillingAddress?.state}
                          </span>
                        </div>
                      </SelectItem>
                    )}
                    {validLocations.map((location, index) => (
                      <SelectItem key={location.id || index} value={location.id || location.name || `loc-${index}`}>
                        <div className="flex flex-col">
                          <span className="font-medium">{location.name || `Location ${index + 1}`}</span>
                          <span className="text-xs text-gray-500">
                            {getStreet(location.address)}, {location.address?.city}, {location.address?.state}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isEditingBilling ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Company Name</Label>
                    <Input placeholder="Company" value={billingForm.company_name} onChange={(e) => setBillingForm({ ...billingForm, company_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Attention</Label>
                    <Input placeholder="Attn" value={billingForm.attention} onChange={(e) => setBillingForm({ ...billingForm, attention: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1 relative">
                  <Label className="text-xs">Street Address <span className="text-red-500">*</span></Label>
                  <Input 
                    className={errors["billing.street"] ? "border-red-500" : ""} 
                    placeholder="123 Main St" 
                    value={billingForm.street} 
                    onChange={(e) => handleBillingStreetChange(e.target.value)} 
                  />
                  {billingSuggestions.length > 0 && (
                    <ul className="absolute left-0 w-full bg-white border-2 border-blue-200 shadow-lg z-50 mt-1 max-h-60 overflow-y-auto rounded-lg">
                      {billingSuggestions.map((suggestion) => (
                        <li
                          key={suggestion.place_id}
                          className="cursor-pointer hover:bg-blue-50 px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                          onClick={() => handleBillingSuggestionClick(suggestion)}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {suggestion.description}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {errors["billing.street"] && <p className="text-xs text-red-500">{errors["billing.street"]}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">City <span className="text-red-500">*</span></Label>
                    <Input className={errors["billing.city"] ? "border-red-500" : ""} placeholder="City" value={billingForm.city} onChange={(e) => setBillingForm({ ...billingForm, city: e.target.value })} />
                    {errors["billing.city"] && <p className="text-xs text-red-500">{errors["billing.city"]}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State <span className="text-red-500">*</span></Label>
                    <Input className={errors["billing.state"] ? "border-red-500" : ""} placeholder="State" value={billingForm.state} onChange={(e) => setBillingForm({ ...billingForm, state: e.target.value })} />
                    {errors["billing.state"] && <p className="text-xs text-red-500">{errors["billing.state"]}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">ZIP Code <span className="text-red-500">*</span></Label>
                    <Input className={errors["billing.zip_code"] ? "border-red-500" : ""} placeholder="12345" value={billingForm.zip_code} onChange={(e) => setBillingForm({ ...billingForm, zip_code: e.target.value })} />
                    {errors["billing.zip_code"] && <p className="text-xs text-red-500">{errors["billing.zip_code"]}</p>}
                  </div>
                </div>
                <Button onClick={handleSaveBilling} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Check className="w-4 h-4 mr-2" /> Save Billing Address
                </Button>
              </div>
            ) : billingForm.street ? (
              <div className="text-sm space-y-1">
                {billingForm.company_name && <p className="font-medium">{billingForm.company_name}</p>}
                {billingForm.attention && <p className="text-gray-600">Attn: {billingForm.attention}</p>}
                <p>{billingForm.street}</p>
                <p>{billingForm.city}, {billingForm.state} {billingForm.zip_code}</p>
              </div>
            ) : (
              <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Please enter billing address</AlertDescription></Alert>
            )}
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card className={`transition-all duration-300 ${isEditingShipping ? "border-blue-500 shadow-lg" : ""}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Shipping Address
              </CardTitle>
              {!isEditingShipping && shippingForm.street && (
                <Button variant="ghost" size="sm" onClick={() => { setSameAsBilling(false); setIsEditingShipping(true); }} className="h-8">
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Saved Locations Dropdown */}
            {(validLocations.length > 0 || hasProfileShipping) && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-xs text-blue-700 font-medium flex items-center gap-1.5 mb-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Select Saved Location
                </Label>
                <Select value={selectedShippingLocation} onValueChange={handleShippingLocationSelect}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choose a saved location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Profile Shipping Address Option */}
                    {hasProfileShipping && (
                      <SelectItem value="profile-shipping">
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-600">📍 Profile Shipping Address</span>
                          <span className="text-xs text-gray-500">
                            {getStreet(profileShippingAddress)}, {profileShippingAddress?.city}, {profileShippingAddress?.state}
                          </span>
                        </div>
                      </SelectItem>
                    )}
                    {validLocations.map((location, index) => (
                      <SelectItem key={location.id || index} value={location.id || location.name || `loc-${index}`}>
                        <div className="flex flex-col">
                          <span className="font-medium">{location.name || `Location ${index + 1}`}</span>
                          <span className="text-xs text-gray-500">
                            {getStreet(location.address)}, {location.address?.city}, {location.address?.state}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-4">
              {/* Same as Billing Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox id="same-billing" checked={sameAsBilling} onCheckedChange={(c) => { setSameAsBilling(c as boolean); setSelectedShippingLocation(""); if (!c) setIsEditingShipping(true); }} disabled={!billingForm.street} />
                <Label htmlFor="same-billing" className="text-sm">Same as billing address</Label>
              </div>

              {isEditingShipping && !sameAsBilling ? (
                <div className="space-y-4">
                  {/* Contact Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Full Name <span className="text-red-500">*</span></Label>
                      <Input className={errors["shipping.fullName"] ? "border-red-500" : ""} placeholder="Full name" value={shippingForm.fullName} onChange={(e) => setShippingForm({ ...shippingForm, fullName: e.target.value })} />
                      {errors["shipping.fullName"] && <p className="text-xs text-red-500">{errors["shipping.fullName"]}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email <span className="text-red-500">*</span></Label>
                      <Input className={errors["shipping.email"] ? "border-red-500" : ""} type="email" placeholder="email@example.com" value={shippingForm.email} onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })} />
                      {errors["shipping.email"] && <p className="text-xs text-red-500">{errors["shipping.email"]}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone <span className="text-red-500">*</span></Label>
                      <Input className={errors["shipping.phone"] ? "border-red-500" : ""} placeholder="(555) 123-4567" value={shippingForm.phone} onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })} />
                      {errors["shipping.phone"] && <p className="text-xs text-red-500">{errors["shipping.phone"]}</p>}
                    </div>
                  </div>
                  {/* Address Fields */}
                  <div className="space-y-1 relative">
                    <Label className="text-xs">Street Address <span className="text-red-500">*</span></Label>
                    <Input 
                      className={errors["shipping.street"] ? "border-red-500" : ""} 
                      placeholder="123 Main St" 
                      value={shippingForm.street} 
                      onChange={(e) => handleShippingStreetChange(e.target.value)} 
                    />
                    {shippingSuggestions.length > 0 && (
                      <ul className="absolute left-0 w-full bg-white border-2 border-green-200 shadow-lg z-50 mt-1 max-h-60 overflow-y-auto rounded-lg">
                        {shippingSuggestions.map((suggestion) => (
                          <li
                            key={suggestion.place_id}
                            className="cursor-pointer hover:bg-green-50 px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                            onClick={() => handleShippingSuggestionClick(suggestion)}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {suggestion.description}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {errors["shipping.street"] && <p className="text-xs text-red-500">{errors["shipping.street"]}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">City <span className="text-red-500">*</span></Label>
                      <Input className={errors["shipping.city"] ? "border-red-500" : ""} placeholder="City" value={shippingForm.city} onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })} />
                      {errors["shipping.city"] && <p className="text-xs text-red-500">{errors["shipping.city"]}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State <span className="text-red-500">*</span></Label>
                      <Input className={errors["shipping.state"] ? "border-red-500" : ""} placeholder="State" value={shippingForm.state} onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })} />
                      {errors["shipping.state"] && <p className="text-xs text-red-500">{errors["shipping.state"]}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">ZIP Code <span className="text-red-500">*</span></Label>
                      <Input className={errors["shipping.zip_code"] ? "border-red-500" : ""} placeholder="12345" value={shippingForm.zip_code} onChange={(e) => setShippingForm({ ...shippingForm, zip_code: e.target.value })} />
                      {errors["shipping.zip_code"] && <p className="text-xs text-red-500">{errors["shipping.zip_code"]}</p>}
                    </div>
                  </div>
                  <Button onClick={handleSaveShipping} className="w-full bg-blue-600 hover:bg-blue-700">
                    <Check className="w-4 h-4 mr-2" /> Save Shipping Address
                  </Button>
                </div>
              ) : shippingForm.street ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{shippingForm.fullName}</p>
                  <p className="text-gray-600">{shippingForm.email}</p>
                  <p className="text-gray-600">{shippingForm.phone}</p>
                  <p>{shippingForm.street}</p>
                  <p>{shippingForm.city}, {shippingForm.state} {shippingForm.zip_code}</p>
                  {sameAsBilling && <p className="text-xs text-blue-600 mt-2">✓ Same as billing address</p>}
                </div>
              ) : (
                <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Please enter shipping address</AlertDescription></Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
