/**
 * Google Address API Helper Functions
 * Reusable utilities for address autocomplete across the application
 */

declare global {
  interface Window {
    google: any;
  }
}

export interface AddressComponents {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
}

/**
 * Get address predictions from Google Places API
 */
export const getAddressPredictions = (
  input: string,
  callback: (predictions: any[]) => void
) => {
  if (input.length < 3 || !window.google) {
    callback([]);
    return;
  }

  const service = new window.google.maps.places.AutocompleteService();
  service.getPlacePredictions(
    {
      input,
      types: ["geocode", "establishment"],
      componentRestrictions: { country: "us" }, // Restrict to USA
    },
    (predictions: any[]) => {
      callback(predictions || []);
    }
  );
};

/**
 * Get place details and extract address components
 */
export const getPlaceDetails = (
  placeId: string,
  callback: (address: AddressComponents | null) => void
) => {
  if (!window.google) {
    callback(null);
    return;
  }

  const placesService = new window.google.maps.places.PlacesService(
    document.createElement("div")
  );

  placesService.getDetails({ placeId }, (place: any) => {
    if (!place || !place.address_components) {
      callback(null);
      return;
    }

    let city = "";
    let state = "";
    let zipCode = "";
    let country = "";
    const street = place.formatted_address?.split(",")[0] || "";

    place.address_components.forEach((component: any) => {
      const types = component.types;
      if (types.includes("locality")) {
        city = component.long_name;
      } else if (types.includes("administrative_area_level_1")) {
        state = component.short_name;
      } else if (types.includes("postal_code")) {
        zipCode = component.long_name;
      } else if (types.includes("country")) {
        country = component.short_name;
      }
    });

    callback({
      street,
      city,
      state,
      zip_code: zipCode,
      country: country || "USA",
    });
  });
};

/**
 * Check if Google Maps API is loaded
 */
export const isGoogleMapsLoaded = (): boolean => {
  return typeof window !== "undefined" && !!window.google;
};
