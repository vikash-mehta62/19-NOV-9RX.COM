/**
 * Google Address API Helper Functions
 * Reusable utilities for address autocomplete across the application
 */

declare global {
  interface Window {
    google: any;
    __onGoogleMapsLoaded?: () => void;
  }
}

export interface AddressComponents {
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country?: string;
}

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-places-sdk";
let mapsLoaderPromise: Promise<boolean> | null = null;

const getGoogleMapsApiKey = (): string =>
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

export const ensureGoogleMapsLoaded = async (): Promise<boolean> => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  if (window.google?.maps?.places) {
    return true;
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return false;
  }

  if (!mapsLoaderPromise) {
    mapsLoaderPromise = new Promise<boolean>((resolve) => {
      const existingScript = document.getElementById(
        GOOGLE_MAPS_SCRIPT_ID
      ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(!!window.google?.maps?.places),
          { once: true }
        );
        existingScript.addEventListener("error", () => resolve(false), {
          once: true,
        });
        setTimeout(() => resolve(!!window.google?.maps?.places), 1500);
        return;
      }

      window.__onGoogleMapsLoaded = () => resolve(true);

      const script = document.createElement("script");
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&libraries=places&region=US&language=en&loading=async&callback=__onGoogleMapsLoaded`;
      script.onerror = () => resolve(false);

      document.head.appendChild(script);
    }).finally(() => {
      if (window.__onGoogleMapsLoaded) {
        delete window.__onGoogleMapsLoaded;
      }
    });
  }

  return mapsLoaderPromise;
};

/**
 * Get address predictions from Google Places API
 */
export const getAddressPredictions = (
  input: string,
  callback: (predictions: any[]) => void
) => {
  if (input.length < 3) {
    callback([]);
    return;
  }

  void (async () => {
    const loaded = await ensureGoogleMapsLoaded();
    if (!loaded || !window.google?.maps?.places) {
      callback([]);
      return;
    }

    const placesApi = window.google.maps.places;

    // Preferred API for new projects.
    if (placesApi.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
      try {
        const response = await placesApi.AutocompleteSuggestion.fetchAutocompleteSuggestions(
          {
            input,
            includedRegionCodes: ["us"],
          }
        );

        const predictions = (response?.suggestions || [])
          .map((entry: any) => entry?.placePrediction)
          .filter(Boolean)
          .map((prediction: any) => ({
            place_id: prediction?.placeId || "",
            description:
              prediction?.text?.toString?.() || prediction?.text?.text || "",
          }))
          .filter(
            (prediction: any) => prediction.place_id && prediction.description
          );

        callback(predictions);
        return;
      } catch (error) {
        console.error("AutocompleteSuggestion failed, falling back:", error);
      }
    }

    // Backward-compatible fallback for older projects.
    if (placesApi.AutocompleteService) {
      const service = new placesApi.AutocompleteService();
      service.getPlacePredictions(
        {
          input,
          types: ["geocode", "establishment"],
          componentRestrictions: { country: "us" },
        },
        (predictions: any[]) => {
          callback(predictions || []);
        }
      );
      return;
    }

    callback([]);
  })();
};

/**
 * Get place details and extract address components
 */
export const getPlaceDetails = (
  placeId: string,
  callback: (address: AddressComponents | null) => void
) => {
  if (!placeId) {
    callback(null);
    return;
  }

  void (async () => {
    const loaded = await ensureGoogleMapsLoaded();
    if (!loaded || !window.google?.maps?.places?.PlacesService) {
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
  })();
};

/**
 * Check if Google Maps API is loaded
 */
export const isGoogleMapsLoaded = (): boolean => {
  return typeof window !== "undefined" && !!window.google?.maps?.places;
};
