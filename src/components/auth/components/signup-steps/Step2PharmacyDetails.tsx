import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignupFormData, AddressData } from "../../types/signup.types";
import { MapPin, Building2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface Step2Props {
  formData: SignupFormData;
  onChange: (field: keyof SignupFormData, value: any) => void;
  isLoading: boolean;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export const Step2PharmacyDetails = ({ formData, onChange, isLoading }: Step2Props) => {
  const handleBillingChange = (field: keyof AddressData, value: string) => {
    const newBilling = { ...formData.billingAddress, [field]: value };
    onChange("billingAddress", newBilling);
    
    if (formData.sameAsShipping) {
      onChange("shippingAddress", newBilling);
    }
  };

  const handleShippingChange = (field: keyof AddressData, value: string) => {
    onChange("shippingAddress", { ...formData.shippingAddress, [field]: value });
  };

  const handleSameAsShippingChange = (checked: boolean) => {
    onChange("sameAsShipping", checked);
    if (checked) {
      onChange("shippingAddress", { ...formData.billingAddress });
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Address Information</h3>
          <p className="text-sm text-gray-500">Your billing and shipping addresses</p>
        </div>
      </div>

      {/* Billing Address Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-600" />
          <h4 className="font-medium text-gray-800">Billing Address</h4>
        </div>

        {/* Street Address */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">
            Street Address <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="123 Main Street"
              value={formData.billingAddress.street1}
              onChange={(e) => handleBillingChange("street1", e.target.value)}
              disabled={isLoading}
              className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500"
            />
          </div>
        </div>

        {/* City, State, ZIP */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">City</Label>
            <Input
              placeholder="City"
              value={formData.billingAddress.city}
              onChange={(e) => handleBillingChange("city", e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-lg border-gray-200 focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">State</Label>
            <Select
              value={formData.billingAddress.state}
              onValueChange={(value) => handleBillingChange("state", value)}
              disabled={isLoading}
            >
              <SelectTrigger className="h-12 rounded-lg border-gray-200 focus:border-blue-500">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">ZIP Code</Label>
            <Input
              placeholder="12345"
              value={formData.billingAddress.zip_code}
              onChange={(e) => handleBillingChange("zip_code", e.target.value)}
              disabled={isLoading}
              className="h-12 rounded-lg border-gray-200 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Same as Billing Checkbox */}
      <div className="flex items-center space-x-3 py-3 px-4 bg-gray-50 rounded-lg border border-gray-100">
        <Checkbox
          id="sameAsShipping"
          checked={formData.sameAsShipping}
          onCheckedChange={handleSameAsShippingChange}
          disabled={isLoading}
          className="data-[state=checked]:bg-blue-600"
        />
        <Label
          htmlFor="sameAsShipping"
          className="text-sm font-medium text-gray-700 cursor-pointer"
        >
          Shipping address is same as billing address
        </Label>
      </div>

      {/* Shipping Address Section */}
      {!formData.sameAsShipping && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-600" />
            <h4 className="font-medium text-gray-800">Shipping Address</h4>
          </div>

          {/* Street Address */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Street Address *</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="123 Main Street"
                value={formData.shippingAddress.street1}
                onChange={(e) => handleShippingChange("street1", e.target.value)}
                required
                disabled={isLoading}
                className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500"
              />
            </div>
          </div>

          {/* City, State, ZIP */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">City *</Label>
              <Input
                placeholder="City"
                value={formData.shippingAddress.city}
                onChange={(e) => handleShippingChange("city", e.target.value)}
                required
                disabled={isLoading}
                className="h-12 rounded-lg border-gray-200 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">State *</Label>
              <Select
                value={formData.shippingAddress.state}
                onValueChange={(value) => handleShippingChange("state", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-12 rounded-lg border-gray-200 focus:border-blue-500">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">ZIP Code *</Label>
              <Input
                placeholder="12345"
                value={formData.shippingAddress.zip_code}
                onChange={(e) => handleShippingChange("zip_code", e.target.value)}
                required
                disabled={isLoading}
                className="h-12 rounded-lg border-gray-200 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
