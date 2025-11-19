import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData, LocationData } from "../../schemas/sharedFormSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddressFields } from "../AddressFields";
import { Minus, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface LocationCardProps {
  location: LocationData;
  index: number;
  form: UseFormReturn<BaseUserFormData>;
  onRemove: () => void;
}

export function LocationCard({
  location,
  index,
  form,
  onRemove,
}: LocationCardProps) {
  const { toast } = useToast();
  const [showDetails, setShowDetails] = useState(false);

  const handleSave = () => {
    const currentLocation = form.getValues(`locations.${index}`);
  console.log(currentLocation)
    // ✅ Check if `shippingAddress` exists before using it
    if (currentLocation?.address && (currentLocation.address as any).shippingAddress) {
      const { shippingAddress } = currentLocation.address as any;
  
      currentLocation.address = {
        ...currentLocation.address,
        ...shippingAddress, // ✅ Moves fields to `address`
      };
  
      delete (currentLocation.address as any).shippingAddress; // ❌ Remove `shippingAddress`
    }
  
    console.log("Updated Location Data:", currentLocation);
  
    // 🛑 Validate required fields
    if (
      !currentLocation?.name || 
      !currentLocation?.address?.street1 || 
      !currentLocation?.address?.city || 
      !currentLocation?.address?.state || 
      !currentLocation?.address?.zip_code || 
      !currentLocation?.address?.faxNumber // ✅ Now correctly stored in `address`
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields for this location.",
        variant: "destructive",
      });
      return;
    }
  
    // ✅ Ensure form updates its values
    form.setValue(`locations.${index}`, currentLocation, {
      shouldDirty: true,
      shouldValidate: true,
    });
  
    toast({
      title: "Location Saved",
      description: `${currentLocation.name} has been saved successfully.`,
    });
  };
  
  useEffect(() => {
    const currentLocation = form.getValues(`locations.${index}`);
  
    if (currentLocation?.address) {
      (currentLocation.address as any).shippingAddress = {
        street1: currentLocation.address.street1 || "",
        street2: currentLocation.address.street2 || "",
        city: currentLocation.address.city || "",
        state: currentLocation.address.state || "",
        zip_code: currentLocation.address.zip_code || "",
        faxNumber: currentLocation.address.faxNumber || "",
      };
  
      form.setValue(`locations.${index}`, currentLocation, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
  }, [form, index]);
  

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          <FormField
            control={form.control}
            name={`locations.${index}.name`}
            render={({ field }) => (
              <FormItem className="flex-1 mr-4">
                <FormControl>
                  <Input {...field} placeholder="Location Name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? "Hide Details" : "Show Details"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onRemove}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {showDetails && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name={`locations.${index}.type`}
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="headquarters">Headquarters</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`locations.${index}.status`}
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <AddressFields
            form={form}
            type="shipping"
            prefix={`locations.${index}.address`}
          />

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleSave}
            >
              <Save className="h-4 w-4" />
              Save Location
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
