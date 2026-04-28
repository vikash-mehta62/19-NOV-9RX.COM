import { UseFormReturn } from "react-hook-form";
import { useState, useEffect } from "react";
import { AddressInput } from "./address/AddressInput";
import { StateSelect } from "./address/StateSelect";
import { getAddressPredictions, getPlaceDetails } from "@/utils/googleAddressHelper";

declare global {
  interface Window {
    google: any;
  }
}

interface AddressFieldsProps {
  form: UseFormReturn<any>;
  type?: "billing" | "shipping" | "address";
  prefix?: string;
}

export function AddressFields({ form, type, prefix = "" }: AddressFieldsProps) {
  const fieldName = (field: string) => {
    const basePrefix = prefix ? `${prefix}.` : "";
    const addressRoot = type === "billing" || type === "shipping" ? `${type}Address.` : "";
    return `${basePrefix}${addressRoot}${field}`;
  };

  const [street1Suggestions, setStreet1Suggestions] = useState<any[]>([]);

  useEffect(() => {
    // Set default country to USA if not already set
    const currentCountry = form.getValues(fieldName("countryRegion"));
    if (!currentCountry) {
      form.setValue(fieldName("countryRegion"), "USA");
    }
  }, []);
  

  return (
    <div className="space-y-4 relative">
      {/* <AddressInput form={form} fieldName={fieldName("attention")} label="Attention" /> */}

      {/* Street 1 with Autocomplete and Autofill */}
      <div className="relative">
        <AddressInput
          form={form}
          fieldName={fieldName("street1")}
          label="Street Address 1 *"
          inputProps={{
            onChange: (e) => {
              getAddressPredictions(e.target.value, setStreet1Suggestions);
            },
          }}
        />
        {street1Suggestions.length > 0 && (
          <ul className="absolute left-0 w-full bg-white border shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
            {street1Suggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                className="cursor-pointer hover:bg-gray-100 px-4 py-2 text-lg"
                onClick={() => {
                  getPlaceDetails(suggestion.place_id, (address) => {
                    if (!address) return;
                    form.setValue(fieldName("street1"), address.street);
                    if (address.city) form.setValue(fieldName("city"), address.city);
                    if (address.state) form.setValue(fieldName("state"), address.state);
                    if (address.country) form.setValue(fieldName("countryRegion"), address.country);
                    if (address.zip_code) form.setValue(fieldName("zip_code"), address.zip_code);
                  });
                  setStreet1Suggestions([]);
                }}
              >
                {suggestion.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Street 2 - No Country, State, or City */}
      <AddressInput form={form} fieldName={fieldName("street2")} label="Street Address 2" />

      <div className="grid grid-cols-2 gap-4">
        <AddressInput form={form} fieldName={fieldName("city")} label="City *" />
        <StateSelect form={form} fieldName={fieldName("state")} />
      </div>


      <div className="grid grid-cols-2 gap-4">
        <AddressInput form={form} fieldName={fieldName("zip_code")} label="ZIP Code *" />
        <AddressInput form={form} fieldName={fieldName("phone")} label="Phone" type="tel" />
      </div>
      <AddressInput form={form} fieldName={fieldName("countryRegion")} label="Country *" />
    </div>
  );
}
