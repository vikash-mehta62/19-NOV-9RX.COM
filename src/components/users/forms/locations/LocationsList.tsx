
import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData, LocationData } from "../../schemas/sharedFormSchema";
import { LocationCard } from "./LocationCard";

interface LocationsListProps {
  locations: LocationData[];
  form: UseFormReturn<BaseUserFormData>;
}

export function LocationsList({ locations, form }: LocationsListProps) {
  const removeLocation = (index: number) => {
    const currentLocations = form.getValues("locations");
    const newLocations = [...currentLocations];
    newLocations.splice(index, 1);
    form.setValue("locations", newLocations);
  };

  return (
    <div className="space-y-4">
      
      {locations.map((location, index) => (
        <LocationCard
          key={index}
          location={location}
          index={index}
          form={form}
          onRemove={() => removeLocation(index)}
        />
      ))}
    </div>
  );
}
