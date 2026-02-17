import { useState, useEffect } from "react";
import { MapPin, Edit2, Check, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

declare global {
  interface Window {
    google: any;
  }
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface BillingAddress extends Address {
  company_name?: string;
  attention?: string;
}

export interface ShippingAddress extends Address {
  fullName: string;
  email: string;
  phone: string;
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
    city?: string;
    state?: string;
    zip_code?: string;
    countryRegion?: string;
    phone?: string;
    attention?: string;
  };
}

export interface AddressInformationStepProps {
  billingAddress?: BillingAddress;
  shippingAddress?: ShippingAddress;
  onBillingAddressChange: (address: BillingAddress) => void;
  onShippingAddressChange: (address: ShippingAddress) => void;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
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
  companyName?: string;
}

export const AddressInformationStep = ({
  billingAddress,
  shippingAddress,
  onBillingAddressChange,
  onShippingAddressChange,
  customerName = "",
  customerEmail = "",
  customerPhone = "",
  savedLocations = [],
  profileBillingAddress,
  profileShippingAddress,
  companyName = "",
}: AddressInformationStepProps) => {
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
  // Note: status can be "active" or "inactive" - we only exclude inactive
  const validLocations = savedLocations.filter((loc) => {
    // Must have an address object with some data
    if (!loc.address || typeof loc.address !== 'object') return false;
    // Check for address fields - support both street1 and street formats
    const addr = loc.address as any;
    const hasAddress = addr.street1 || addr.street || addr.city;
    // Must not be inactive (allow active, undefined, null)
    const isActive = loc.status !== "inactive";
    return hasAddress && isActive;
  });

  console.log("Saved locations received:", savedLocations);
  console.log("Valid locations after filter:", validLocations);
  console.log("Locations count:", savedLocations.length, "-> Valid:", validLocations.length);

  // Helper to get street from location address (supports both street1 and street)
  const getStreet = (addr: any) => addr?.street1 || addr?.street || "";

  // Check if profile has billing address
  const hasProfileBilling = profileBillingAddress && (profileBillingAddress.street1 || profileBillingAddress.street || profileBillingAddress.city);
  
  // Check if profile has shipping address
  const hasProfileShipping = profileShippingAddress && (profileShippingAddress.street1 || profileShippingAddress.street || profileShippingAddress.city);

  // Local state for form fields
  const [billingForm, setBillingForm] = useState<BillingAddress>({
    company_name: billingAddress?.company_name || "",
    attention: billingAddress?.attention || "",
    street: billingAddress?.street || "",
    city: billingAddress?.city || "",
    state: billingAddress?.state || "",
    zip_code: billingAddress?.zip_code || "",
  });

  const [shippingForm, setShippingForm] = useState<ShippingAddress>({
    fullName: shippingAddress?.fullName || customerName,
    email: shippingAddress?.email || customerEmail,
    phone: shippingAddress?.phone || customerPhone,
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
        company_name: companyName || billingForm.company_name || "",
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
        company_name: companyName || billingForm.company_name || "",
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
        fullName: shippingForm.fullName || customerName,
        email: shippingForm.email || customerEmail,
        phone: profileShippingAddress.phone || shippingForm.phone || customerPhone,
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
        fullName: shippingForm.fullName || customerName,
        email: shippingForm.email || customerEmail,
        phone: addr.phone || shippingForm.phone || customerPhone,
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
    if (!shippingAddress?.fullName && customerName) {
      setShippingForm((prev) => ({ ...prev, fullName: customerName }));
    }
    if (!shippingAddress?.email && customerEmail) {
      setShippingForm((prev) => ({ ...prev, email: customerEmail }));
    }
    if (!shippingAddress?.phone && customerPhone) {
      setShippingForm((prev) => ({ ...prev, phone: customerPhone }));
    }
  }, [customerName, customerEmail, customerPhone, shippingAddress]);

  // Handle "Same as billing" checkbox
  useEffect(() => {
    if (sameAsBilling && billingForm.street) {
      const updatedShipping: ShippingAddress = {
        fullName: shippingForm.fullName || customerName,
        email: shippingForm.email || customerEmail,
        phone: shippingForm.phone || customerPhone,
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
    
    if (value.length > 2 && window.google) {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        { input: value, types: ["geocode", "establishment"] },
        (predictions: any[]) => {
          setBillingSuggestions(predictions || []);
        }
      );
    } else {
      setBillingSuggestions([]);
    }
  };

  // Google Address API - Handle shipping address change
  const handleShippingStreetChange = (value: string) => {
    setShippingForm({ ...shippingForm, street: value });
    
    if (value.length > 2 && window.google) {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        { input: value, types: ["geocode", "establishment"] },
        (predictions: any[]) => {
          setShippingSuggestions(predictions || []);
        }
      );
    } else {
      setShippingSuggestions([]);
    }
  };

  // Google Address API - Handle billing suggestion click
  const handleBillingSuggestionClick = (suggestion: any) => {
    const placesService = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );
    placesService.getDetails({ placeId: suggestion.place_id }, (place: any) => {
      if (place && place.address_components) {
        let city = "", state = "", zipCode = "";
        const street = place.formatted_address?.split(",")[0] || "";
        
        place.address_components.forEach((component: any) => {
          if (component.types.includes("locality")) 
            city = component.long_name;
          if (component.types.includes("administrative_area_level_1")) 
            state = component.short_name;
          if (component.types.includes("postal_code")) 
            zipCode = component.long_name;
        });
        
        setBillingForm({
          ...billingForm,
          street,
          city,
          state,
          zip_code: zipCode,
        });
      }
    });
    setBillingSuggestions([]);
  };

  // Google Address API - Handle shipping suggestion click
  const handleShippingSuggestionClick = (suggestion: any) => {
    const placesService = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );
    placesService.getDetails({ placeId: suggestion.place_id }, (place: any) => {
      if (place && place.address_components) {
        let city = "", state = "", zipCode = "";
        const street = place.formatted_address?.split(",")[0] || "";
        
        place.address_components.forEach((component: any) => {
          if (component.types.includes("locality")) 
            city = component.long_name;
          if (component.types.includes("administrative_area_level_1")) 
            state = component.short_name;
          if (component.types.includes("postal_code")) 
            zipCode = component.long_name;
        });
        
        setShippingForm({
          ...shippingForm,
          street,
          city,
          state,
          zip_code: zipCode,
        });
      }
    });
    setShippingSuggestions([]);
  };

  // Validation function
  const validateAddress = (address: Partial<Address>, prefix: string): boolean => {
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
      newErrors[`${prefix}.zip_code`] = "Invalid ZIP code format";
      isValid = false;
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return isValid;
  };

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
    // Clear previous errors for billing
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith("billing.")) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });

    if (validateAddress(billingForm, "billing")) {
      onBillingAddressChange(billingForm);
      setIsEditingBilling(false);
    }
  };

  const handleSaveShipping = () => {
    // Clear previous errors for shipping
    setErrors((prev) => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach((key) => {
        if (key.startsWith("shipping.")) {
          delete newErrors[key];
        }
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

  const handleEditBilling = () => {
    setIsEditingBilling(true);
  };

  const handleEditShipping = () => {
    setSameAsBilling(false);
    setIsEditingShipping(true);
  };

  const renderBillingCard = () => (
    <Card className={`transition-all duration-300 ${isEditingBilling ? "border-blue-500 shadow-lg" : ""}`} role="region" aria-label="Billing address">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Billing Address</CardTitle>
          </div>
          {!isEditingBilling && billingForm.street && (
            <Button variant="ghost" size="sm" onClick={handleEditBilling} className="min-h-[44px]" aria-label="Edit billing address">
              <Edit2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Edit
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
                {/* Saved Locations */}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="billing-company">Company Name</Label>
                <Input
                  id="billing-company"
                  placeholder="Company name"
                  value={billingForm.company_name}
                  onChange={(e) =>
                    setBillingForm({ ...billingForm, company_name: e.target.value })
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="billing-attention">Attention</Label>
                <Input
                  id="billing-attention"
                  placeholder="Attention to"
                  value={billingForm.attention}
                  onChange={(e) =>
                    setBillingForm({ ...billingForm, attention: e.target.value })
                  }
                  className="w-full"
                />
              </div>
            </div>
            <div className="space-y-2 relative">
              <Label htmlFor="billing-street">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="billing-street"
                placeholder="123 Main St"
                value={billingForm.street}
                onChange={(e) => handleBillingStreetChange(e.target.value)}
                className={cn("w-full", errors["billing.street"] ? "border-red-500" : "")}
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
              {errors["billing.street"] && (
                <p className="text-sm text-red-500">{errors["billing.street"]}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="space-y-2 min-w-0">
                <Label htmlFor="billing-city" className="text-xs sm:text-sm">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billing-city"
                  placeholder="City"
                  value={billingForm.city}
                  onChange={(e) => setBillingForm({ ...billingForm, city: e.target.value })}
                  className={cn("w-full", errors["billing.city"] ? "border-red-500" : "")}
                />
                {errors["billing.city"] && (
                  <p className="text-xs text-red-500">{errors["billing.city"]}</p>
                )}
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="billing-state" className="text-xs sm:text-sm">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billing-state"
                  placeholder="State"
                  value={billingForm.state}
                  onChange={(e) => setBillingForm({ ...billingForm, state: e.target.value })}
                  className={cn("w-full", errors["billing.state"] ? "border-red-500" : "")}
                />
                {errors["billing.state"] && (
                  <p className="text-xs text-red-500">{errors["billing.state"]}</p>
                )}
              </div>
              <div className="space-y-2 min-w-0">
                <Label htmlFor="billing-zip" className="text-xs sm:text-sm">
                  ZIP <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billing-zip"
                  placeholder="12345"
                  value={billingForm.zip_code}
                  onChange={(e) =>
                    setBillingForm({ ...billingForm, zip_code: e.target.value })
                  }
                  className={cn("w-full", errors["billing.zip_code"] ? "border-red-500" : "")}
                />
                {errors["billing.zip_code"] && (
                  <p className="text-xs text-red-500">{errors["billing.zip_code"]}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={handleSaveBilling} className="min-h-[44px] w-full sm:w-auto" aria-label="Save billing address">
                <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                Save Billing Address
              </Button>
            </div>
          </div>
        ) : billingForm.street ? (
          <div className="space-y-2 text-sm">
            {billingForm.company_name && (
              <p className="font-medium">{billingForm.company_name}</p>
            )}
            {billingForm.attention && <p className="text-gray-600">Attn: {billingForm.attention}</p>}
            <p>{billingForm.street}</p>
            <p>
              {billingForm.city}, {billingForm.state} {billingForm.zip_code}
            </p>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Please enter billing address information</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderShippingCard = () => (
    <Card className={`transition-all duration-300 ${isEditingShipping ? "border-blue-500 shadow-lg" : ""}`} role="region" aria-label="Shipping address">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" aria-hidden="true" />
            <CardTitle>Shipping Address</CardTitle>
          </div>
          {!isEditingShipping && shippingForm.street && (
            <Button variant="ghost" size="sm" onClick={handleEditShipping} className="min-h-[44px]" aria-label="Edit shipping address">
              <Edit2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Saved Locations Dropdown */}
        {(validLocations.length > 0 || hasProfileShipping) && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Label className="text-xs text-green-700 font-medium flex items-center gap-1.5 mb-2">
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
                      <span className="font-medium text-green-600">📍 Profile Shipping Address</span>
                      <span className="text-xs text-gray-500">
                        {getStreet(profileShippingAddress)}, {profileShippingAddress?.city}, {profileShippingAddress?.state}
                      </span>
                    </div>
                  </SelectItem>
                )}
                {/* Saved Locations */}
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
            <Checkbox
              id="same-as-billing"
              checked={sameAsBilling}
              onCheckedChange={(checked) => {
                setSameAsBilling(checked as boolean);
                setSelectedShippingLocation("");
                if (!checked) {
                  setIsEditingShipping(true);
                }
              }}
              disabled={!billingForm.street}
            />
            <Label
              htmlFor="same-as-billing"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Same as billing address
            </Label>
          </div>          {isEditingShipping && !sameAsBilling ? (
            <div className="space-y-4">
              {/* Contact Information */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="shipping-name" className="text-xs sm:text-sm">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-name"
                    placeholder="Full name"
                    value={shippingForm.fullName}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, fullName: e.target.value })
                    }
                    className={cn("w-full", errors["shipping.fullName"] ? "border-red-500" : "")}
                  />
                  {errors["shipping.fullName"] && (
                    <p className="text-xs text-red-500">{errors["shipping.fullName"]}</p>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="shipping-email" className="text-xs sm:text-sm">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-email"
                    type="email"
                    placeholder="email@example.com"
                    value={shippingForm.email}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, email: e.target.value })
                    }
                    className={cn("w-full", errors["shipping.email"] ? "border-red-500" : "")}
                  />
                  {errors["shipping.email"] && (
                    <p className="text-xs text-red-500">{errors["shipping.email"]}</p>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="shipping-phone" className="text-xs sm:text-sm">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-phone"
                    placeholder="(555) 123-4567"
                    value={shippingForm.phone}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, phone: e.target.value })
                    }
                    className={cn("w-full", errors["shipping.phone"] ? "border-red-500" : "")}
                  />
                  {errors["shipping.phone"] && (
                    <p className="text-xs text-red-500">{errors["shipping.phone"]}</p>
                  )}
                </div>
              </div>

              {/* Address Fields */}
              <div className="space-y-2 relative">
                <Label htmlFor="shipping-street">
                  Street Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="shipping-street"
                  placeholder="123 Main St"
                  value={shippingForm.street}
                  onChange={(e) => handleShippingStreetChange(e.target.value)}
                  className={cn("w-full", errors["shipping.street"] ? "border-red-500" : "")}
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
                {errors["shipping.street"] && (
                  <p className="text-sm text-red-500">{errors["shipping.street"]}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="shipping-city" className="text-xs sm:text-sm">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-city"
                    placeholder="City"
                    value={shippingForm.city}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, city: e.target.value })
                    }
                    className={cn("w-full", errors["shipping.city"] ? "border-red-500" : "")}
                  />
                  {errors["shipping.city"] && (
                    <p className="text-xs text-red-500">{errors["shipping.city"]}</p>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="shipping-state" className="text-xs sm:text-sm">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-state"
                    placeholder="State"
                    value={shippingForm.state}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, state: e.target.value })
                    }
                    className={cn("w-full", errors["shipping.state"] ? "border-red-500" : "")}
                  />
                  {errors["shipping.state"] && (
                    <p className="text-xs text-red-500">{errors["shipping.state"]}</p>
                  )}
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="shipping-zip" className="text-xs sm:text-sm">
                    ZIP <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-zip"
                    placeholder="12345"
                    value={shippingForm.zip_code}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, zip_code: e.target.value })
                    }
                    className={cn("w-full", errors["shipping.zip_code"] ? "border-red-500" : "")}
                  />
                  {errors["shipping.zip_code"] && (
                    <p className="text-xs text-red-500">{errors["shipping.zip_code"]}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={handleSaveShipping} className="min-h-[44px] w-full sm:w-auto" aria-label="Save shipping address">
                  <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                  Save Shipping Address
                </Button>
              </div>
            </div>
          ) : shippingForm.street ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{shippingForm.fullName}</p>
              <p className="text-gray-600">{shippingForm.email}</p>
              <p className="text-gray-600">{shippingForm.phone}</p>
              <p>{shippingForm.street}</p>
              <p>
                {shippingForm.city}, {shippingForm.state} {shippingForm.zip_code}
              </p>
              {sameAsBilling && (
                <p className="text-xs text-green-600 mt-2">✓ Same as billing address</p>
              )}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Please enter shipping address information</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          Address Information
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Enter billing and shipping addresses for this order
        </p>
      </div>

      {/* Address Cards - Side by side on 1536px+ screens only, stacked below */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-6" role="group" aria-label="Address information">
        <div className="min-w-0">{renderBillingCard()}</div>
        <div className="min-w-0">{renderShippingCard()}</div>
      </div>
    </div>
  );
};
