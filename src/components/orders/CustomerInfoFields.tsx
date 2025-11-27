"use client";

import type React from "react";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { UseFormReturn } from "react-hook-form";
import { User, Mail, Phone, MapPin, Building2, Package } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

interface CustomerInfoFieldsProps {
  form: UseFormReturn<any>;
  readOnly?: boolean;
  poIs?: boolean;
}

export function CustomerInfoFields({
  form,
  readOnly = false,
  poIs = false,
}: CustomerInfoFieldsProps) {
  const [sameAsCustomer, setSameAsCustomer] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [shippingSuggestions, setShippingSuggestions] = useState<any[]>([]);
  const customerAddressInputRef = useRef<HTMLInputElement | null>(null);
  const shippingAddressInputRef = useRef<HTMLInputElement | null>(null);

  const handlePlaceSelected = (place: any, addressType: string) => {
    if (!place || !place.address_components) return;

    let city = "";
    let state = "";
    let zipCode = "";
    const street = place.formatted_address?.split(",")[0] || "";
    const companyName = place.name || "";

    place.address_components.forEach((component: any) => {
      const types = component.types;
      if (types.includes("locality")) city = component.long_name;
      if (types.includes("administrative_area_level_1"))
        state = component.short_name;
      if (types.includes("postal_code")) zipCode = component.long_name;
    });

    const addressField =
      addressType === "customer" ? "customerInfo" : "shippingAddress";
    form.setValue(`${addressField}.address.street`, street, {
      shouldValidate: true,
    });
    form.setValue(`${addressField}.address.city`, city, {
      shouldValidate: true,
    });
    form.setValue(`${addressField}.address.state`, state, {
      shouldValidate: true,
    });
    form.setValue(`${addressField}.address.zip_code`, zipCode, {
      shouldValidate: true,
    });
    form.setValue(`${addressField}.address.companyName`, companyName, {
      shouldValidate: true,
    });
  };

  const syncShippingWithCustomer = useCallback(() => {
    const info = form.getValues("customerInfo");
    form.setValue("shippingAddress.fullName", info.name || "", {
      shouldValidate: true,
    });
    form.setValue("shippingAddress.email", info.email || "", {
      shouldValidate: true,
    });
    form.setValue("shippingAddress.phone", info.phone || "", {
      shouldValidate: true,
    });
    form.setValue(
      "shippingAddress.address.street",
      info.address?.street || "",
      { shouldValidate: true }
    );
    form.setValue("shippingAddress.address.city", info.address?.city || "", {
      shouldValidate: true,
    });
    form.setValue("shippingAddress.address.state", info.address?.state || "", {
      shouldValidate: true,
    });
    form.setValue(
      "shippingAddress.address.zip_code",
      info.address?.zip_code || "",
      { shouldValidate: true }
    );
    form.setValue(
      "shippingAddress.address.companyName",
      info.address?.companyName || "",
      { shouldValidate: true }
    );
  }, [form]);

  const handleToggle = (checked: boolean) => {
    setSameAsCustomer(checked);
    if (checked) syncShippingWithCustomer();
  };

  useEffect(() => {
    if (sameAsCustomer) {
      const subscription = form.watch((_, { name }) => {
        if (name?.startsWith("customerInfo.")) {
          syncShippingWithCustomer();
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [sameAsCustomer, syncShippingWithCustomer, form]);

  const handleAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    addressType: "customer" | "shipping"
  ) => {
    const value = e.target.value;
    const field =
      addressType === "customer" ? "customerInfo" : "shippingAddress";
    form.setValue(`${field}.address.street`, value, { shouldValidate: true });

    if (value.length > 2 && window.google) {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: value,
          types: ["geocode", "establishment"],
        },
        (predictions: any[]) => {
          if (addressType === "customer") {
            setCustomerSuggestions(predictions || []);
          } else {
            setShippingSuggestions(predictions || []);
          }
        }
      );
    } else {
      addressType === "customer"
        ? setCustomerSuggestions([])
        : setShippingSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: any, addressType: string) => {
    const placesService = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );
    placesService.getDetails({ placeId: suggestion.place_id }, (place: any) => {
      if (place) handlePlaceSelected(place, addressType);
    });

    if (addressType === "customer") {
      setCustomerSuggestions([]);
    } else {
      setShippingSuggestions([]);
    }
  };

  const renderField = (
    name: string,
    label: string,
    icon: React.ReactNode,
    type = "text",
    readOnlyField = false
  ) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
            {icon}
            {label}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                {...field}
                type={type}
                readOnly={readOnlyField}
                className={`
                  border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm transition-all
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100
                  ${
                    readOnlyField
                      ? "bg-gray-50 text-gray-600 cursor-not-allowed"
                      : "bg-white hover:border-gray-300"
                  }
                `}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="space-y-8 w-full mx-auto ">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {poIs ? "Vendor" : "Customer"} Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {renderField(
            "customerInfo.name",
            "Full Name",
            <User className="w-4 h-4 text-blue-500" />
          )}
          {renderField(
            "customerInfo.email",
            "Email Address",
            <Mail className="w-4 h-4 text-blue-500" />,
            "email"
          )}
          {renderField(
            "customerInfo.phone",
            "Phone Number",
            <Phone className="w-4 h-4 text-blue-500" />,
            "tel"
          )}

          <div className="relative col-span-1 md:col-span-2">
            <FormField
              control={form.control}
              name="customerInfo.address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    Street Address
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        onChange={(e) => handleAddressChange(e, "customer")}
                        ref={customerAddressInputRef}
                        className="border-2 border-gray-200 rounded-lg px-4 py-2.5 text-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {customerSuggestions.length > 0 && (
              <ul className="absolute left-0 w-full bg-white border-2 border-blue-200 shadow-lg z-50 mt-1 max-h-60 overflow-y-auto rounded-lg">
                {customerSuggestions.map((suggestion) => (
                  <li
                    key={suggestion.place_id}
                    className="cursor-pointer hover:bg-blue-50 px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                    onClick={() =>
                      handleSuggestionClick(suggestion, "customer")
                    }
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {suggestion.description}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {renderField(
            "customerInfo.address.city",
            "City",
            <Building2 className="w-4 h-4 text-blue-500" />
          )}
          {renderField(
            "customerInfo.address.state",
            "State",
            <Building2 className="w-4 h-4 text-blue-500" />
          )}
          {renderField(
            "customerInfo.address.zip_code",
            "Zip Code",
            <MapPin className="w-4 h-4 text-blue-500" />
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Shipping Address
            </h2>
          </div>
          {!poIs && (
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border-2 border-amber-200">
              <Switch
                id="same-as-customer"
                checked={sameAsCustomer}
                onCheckedChange={handleToggle}
              />
              <Label
                htmlFor="same-as-customer"
                className="cursor-pointer text-sm font-medium text-gray-700"
              >
                Same as Billing
              </Label>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {renderField(
            "shippingAddress.fullName",
            "Full Name",
            <User className="w-4 h-4 text-amber-500" />,
            "text",
            readOnly || sameAsCustomer
          )}
          {renderField(
            "shippingAddress.email",
            "Email Address",
            <Mail className="w-4 h-4 text-amber-500" />,
            "email",
            readOnly || sameAsCustomer
          )}
          {renderField(
            "shippingAddress.phone",
            "Phone Number",
            <Phone className="w-4 h-4 text-amber-500" />,
            "tel",
            readOnly || sameAsCustomer
          )}

          <div className="relative col-span-1 md:col-span-2">
            <FormField
              control={form.control}
              name="shippingAddress.address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    Street Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => handleAddressChange(e, "shipping")}
                      readOnly={readOnly || sameAsCustomer}
                      className={`
                        border-2 rounded-lg px-4 py-2.5 text-sm transition-all
                        ${
                          readOnly || sameAsCustomer
                            ? "border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
                            : "border-gray-200 bg-white hover:border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                        }
                      `}
                      ref={shippingAddressInputRef}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {shippingSuggestions.length > 0 && (
              <ul className="absolute left-0 w-full bg-white border-2 border-amber-200 shadow-lg z-50 mt-1 max-h-60 overflow-y-auto rounded-lg">
                {shippingSuggestions.map((suggestion) => (
                  <li
                    key={suggestion.place_id}
                    className="cursor-pointer hover:bg-amber-50 px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                    onClick={() =>
                      handleSuggestionClick(suggestion, "shipping")
                    }
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {suggestion.description}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {renderField(
            "shippingAddress.address.city",
            "City",
            <Building2 className="w-4 h-4 text-amber-500" />,
            "text",
            readOnly || sameAsCustomer
          )}
          {renderField(
            "shippingAddress.address.state",
            "State",
            <Building2 className="w-4 h-4 text-amber-500" />,
            "text",
            readOnly || sameAsCustomer
          )}
          {renderField(
            "shippingAddress.address.zip_code",
            "Zip Code",
            <MapPin className="w-4 h-4 text-amber-500" />,
            "text",
            readOnly || sameAsCustomer
          )}
        </div>
      </div>
    </div>
  );
}
