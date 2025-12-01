import { useState, useEffect } from "react";
import { MapPin, Edit2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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

export interface AddressInformationStepProps {
  billingAddress?: BillingAddress;
  shippingAddress?: ShippingAddress;
  onBillingAddressChange: (address: BillingAddress) => void;
  onShippingAddressChange: (address: ShippingAddress) => void;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export const AddressInformationStep = ({
  billingAddress,
  shippingAddress,
  onBillingAddressChange,
  onShippingAddressChange,
  customerName = "",
  customerEmail = "",
  customerPhone = "",
}: AddressInformationStepProps) => {
  const [isEditingBilling, setIsEditingBilling] = useState(!billingAddress?.street);
  const [isEditingShipping, setIsEditingShipping] = useState(!shippingAddress?.street);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        {isEditingBilling ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing-company">Company Name</Label>
                <Input
                  id="billing-company"
                  placeholder="Company name"
                  value={billingForm.company_name}
                  onChange={(e) =>
                    setBillingForm({ ...billingForm, company_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-attention">Attention</Label>
                <Input
                  id="billing-attention"
                  placeholder="Attention to"
                  value={billingForm.attention}
                  onChange={(e) =>
                    setBillingForm({ ...billingForm, attention: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-street">
                Street Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="billing-street"
                placeholder="123 Main St"
                value={billingForm.street}
                onChange={(e) => setBillingForm({ ...billingForm, street: e.target.value })}
                className={errors["billing.street"] ? "border-red-500" : ""}
              />
              {errors["billing.street"] && (
                <p className="text-sm text-red-500">{errors["billing.street"]}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing-city">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billing-city"
                  placeholder="City"
                  value={billingForm.city}
                  onChange={(e) => setBillingForm({ ...billingForm, city: e.target.value })}
                  className={errors["billing.city"] ? "border-red-500" : ""}
                />
                {errors["billing.city"] && (
                  <p className="text-sm text-red-500">{errors["billing.city"]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-state">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billing-state"
                  placeholder="State"
                  value={billingForm.state}
                  onChange={(e) => setBillingForm({ ...billingForm, state: e.target.value })}
                  className={errors["billing.state"] ? "border-red-500" : ""}
                />
                {errors["billing.state"] && (
                  <p className="text-sm text-red-500">{errors["billing.state"]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-zip">
                  ZIP Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="billing-zip"
                  placeholder="12345"
                  value={billingForm.zip_code}
                  onChange={(e) =>
                    setBillingForm({ ...billingForm, zip_code: e.target.value })
                  }
                  className={errors["billing.zip_code"] ? "border-red-500" : ""}
                />
                {errors["billing.zip_code"] && (
                  <p className="text-sm text-red-500">{errors["billing.zip_code"]}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveBilling} className="min-h-[44px]" aria-label="Save billing address">
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
        <div className="space-y-4">
          {/* Same as Billing Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="same-as-billing"
              checked={sameAsBilling}
              onCheckedChange={(checked) => {
                setSameAsBilling(checked as boolean);
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
          </div>

          {isEditingShipping && !sameAsBilling ? (
            <div className="space-y-4">
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping-name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-name"
                    placeholder="Full name"
                    value={shippingForm.fullName}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, fullName: e.target.value })
                    }
                    className={errors["shipping.fullName"] ? "border-red-500" : ""}
                  />
                  {errors["shipping.fullName"] && (
                    <p className="text-sm text-red-500">{errors["shipping.fullName"]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-email">
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
                    className={errors["shipping.email"] ? "border-red-500" : ""}
                  />
                  {errors["shipping.email"] && (
                    <p className="text-sm text-red-500">{errors["shipping.email"]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-phone">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-phone"
                    placeholder="(555) 123-4567"
                    value={shippingForm.phone}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, phone: e.target.value })
                    }
                    className={errors["shipping.phone"] ? "border-red-500" : ""}
                  />
                  {errors["shipping.phone"] && (
                    <p className="text-sm text-red-500">{errors["shipping.phone"]}</p>
                  )}
                </div>
              </div>

              {/* Address Fields */}
              <div className="space-y-2">
                <Label htmlFor="shipping-street">
                  Street Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="shipping-street"
                  placeholder="123 Main St"
                  value={shippingForm.street}
                  onChange={(e) =>
                    setShippingForm({ ...shippingForm, street: e.target.value })
                  }
                  className={errors["shipping.street"] ? "border-red-500" : ""}
                />
                {errors["shipping.street"] && (
                  <p className="text-sm text-red-500">{errors["shipping.street"]}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipping-city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-city"
                    placeholder="City"
                    value={shippingForm.city}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, city: e.target.value })
                    }
                    className={errors["shipping.city"] ? "border-red-500" : ""}
                  />
                  {errors["shipping.city"] && (
                    <p className="text-sm text-red-500">{errors["shipping.city"]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-state">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-state"
                    placeholder="State"
                    value={shippingForm.state}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, state: e.target.value })
                    }
                    className={errors["shipping.state"] ? "border-red-500" : ""}
                  />
                  {errors["shipping.state"] && (
                    <p className="text-sm text-red-500">{errors["shipping.state"]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipping-zip">
                    ZIP Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="shipping-zip"
                    placeholder="12345"
                    value={shippingForm.zip_code}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, zip_code: e.target.value })
                    }
                    className={errors["shipping.zip_code"] ? "border-red-500" : ""}
                  />
                  {errors["shipping.zip_code"] && (
                    <p className="text-sm text-red-500">{errors["shipping.zip_code"]}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveShipping} className="min-h-[44px]" aria-label="Save shipping address">
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Address Information</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Enter billing and shipping addresses for this order
        </p>
      </div>

      {/* Address Cards - Side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6" role="group" aria-label="Address information">
        {renderBillingCard()}
        {renderShippingCard()}
      </div>
    </div>
  );
};
