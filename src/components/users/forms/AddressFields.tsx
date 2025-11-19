import { UseFormReturn } from "react-hook-form";
import { useState, useEffect } from "react";
import { AddressInput } from "./address/AddressInput";
import { StateSelect } from "./address/StateSelect";

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
  const fieldName = (field: string) =>
    `${prefix ? `${prefix}.` : ""}${type}Address.${field}`;

  const [street1Suggestions, setStreet1Suggestions] = useState<any[]>([]);

  useEffect(() => {
    if (!window.google) {
      console.error("Google Maps API not loaded");
    }
  }, []);

  // Google Places API se Address details extract karna
  const onPlaceSelected = (place: any) => {
    if (!place || !place.address_components) return;
  
    let city = "";
    let state = "";
    let country = "";
    let zipCode = "";
  
    place.address_components.forEach((component: any) => {
      if (component.types.includes("locality")) {
        city = component.short_name;
      } else if (component.types.includes("administrative_area_level_1")) {
        state = component.short_name;
      } else if (component.types.includes("country")) {
        country = component.short_name; // Changed to short_name
      } else if (component.types.includes("postal_code")) {
        zipCode = component.short_name; // Changed to short_name
      }
    });
  
    // Extract only the first part of street1 (before the first comma)
    const street1 = place.formatted_address.split(",")[0];
  
    form.setValue(fieldName("street1"), street1);
    if (city) form.setValue(fieldName("city"), city);
    if (state) form.setValue(fieldName("state"), state);
    if (country) form.setValue(fieldName("country"), country);
    if (zipCode) form.setValue(fieldName("zip_code"), zipCode);
  };
  

  return (
    <div className="space-y-4 relative">
      {/* <AddressInput form={form} fieldName={fieldName("attention")} label="Attention" /> */}

      {/* Street 1 with Autocomplete and Autofill */}
      <div className="relative">
        <AddressInput
          form={form}
          fieldName={fieldName("street1")}
          label="Street Address 1 *"
          {...form.register(fieldName("street1"), {
            onChange: (e) => {
              const service = new window.google.maps.places.AutocompleteService();
              service.getPlacePredictions({ input: e.target.value }, (predictions: any) => {
                setStreet1Suggestions(predictions || []);
              });
            },
          })}
        />
        {street1Suggestions.length > 0 && (
          <ul className="absolute left-0 w-full bg-white border shadow-lg z-50 mt-1 max-h-60 overflow-y-auto">
            {street1Suggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                className="cursor-pointer hover:bg-gray-100 px-4 py-2 text-lg"
                onClick={() => {
                  const placesService = new window.google.maps.places.PlacesService(document.createElement("div"));
                  placesService.getDetails({ placeId: suggestion.place_id }, (place: any) => {
                    if (place) {
                      onPlaceSelected(place);
                    }
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

      <AddressInput form={form} fieldName={fieldName("faxNumber")} label="Fax Number" type="tel" />
    </div>
  );
}
