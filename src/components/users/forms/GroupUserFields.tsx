import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../schemas/sharedFormSchema";
import { LocationsInput } from "./LocationsInput";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Building, MapPin, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GroupUserFieldsProps {
  form: UseFormReturn<BaseUserFormData>;
}

export function GroupUserFields({ form }: GroupUserFieldsProps) {
  const locations = form.watch("locations") || [];
  const activeLocations = locations.filter(loc => loc.status === "active").length;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Group Settings
          </CardTitle>
          <CardDescription>
            Configure the group type and hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="groupType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="groupType">Group Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value as string}
                    defaultValue={field.value as string}
                  >
                    <FormControl>
                      <SelectTrigger id="groupType">
                        <SelectValue placeholder="Select group type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="corporate">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Corporate
                        </div>
                      </SelectItem>
                      <SelectItem value="regional">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Regional
                        </div>
                      </SelectItem>
                      <SelectItem value="franchise">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4" />
                          Franchise
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="parentGroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="parentGroup">Parent Group (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      id="parentGroup"
                      placeholder="Enter parent group name" 
                      {...field}
                      value={field.value as string || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locations
              </CardTitle>
              <CardDescription>
                Manage all locations under this group
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {locations.length} Total
              </Badge>
              {activeLocations > 0 && (
                <Badge variant="default" className="bg-green-500">
                  {activeLocations} Active
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LocationsInput form={form} />
        </CardContent>
      </Card>
    </div>
  );
}
