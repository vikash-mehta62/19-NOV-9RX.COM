import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../schemas/sharedFormSchema";
import { LocationsList } from "./locations/LocationsList";
import { LocationAnalytics } from "../analytics/LocationAnalytics";
import { LocationDataManager } from "../locations/LocationDataManager";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { LocationData } from "../schemas/sharedFormSchema";

interface LocationsInputProps {
  form: UseFormReturn<BaseUserFormData>;
}

export function LocationsInput({ form }: LocationsInputProps) {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const locations = form.watch("locations") || [];

  const addLocation = () => {
    const newLocation: LocationData = {
      name: `Location ${locations.length + 1}`,
      type: "branch",
      status: "pending",
      address: {
        attention: "",
        countryRegion: "",
        street1: "",
        street2: "",
        city: "",
        state: "",
        zip_code: "",
        phone: "",
        faxNumber: "",
      },
    };

    form.setValue("locations", [...locations, newLocation], {
      shouldDirty: true,
      shouldValidate: true,
    });
    
  };

  const handleImportLocations = (importedLocations: LocationData[]) => {
    form.setValue("locations", [...locations, ...importedLocations]);
  };

  return (
    <div className="space-y-6 ">
      <div className="flex justify-between items-center">
        <Button onClick={addLocation} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowAnalytics(!showAnalytics)}
        >
          {showAnalytics ? "Hide Analytics" : "Show Analytics"}
        </Button>
      </div>

      {showAnalytics && locations.length > 0 && (
        <LocationAnalytics locations={locations} />
      )}

      {/* <LocationDataManager
        locations={locations}
        onImport={handleImportLocations}
      /> */}

      <LocationsList locations={locations} form={form} />
    </div>
  );
}
