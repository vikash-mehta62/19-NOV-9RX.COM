
import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../schemas/sharedFormSchema";
import { LocationsInput } from "./LocationsInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface GroupUserFieldsProps {
  form: UseFormReturn<BaseUserFormData>;
}

export function GroupUserFields({ form }: GroupUserFieldsProps) {
  console.log('GroupUserFields rendered with form values:', form.getValues());
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Group Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="groupType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value as string}
                  defaultValue={field.value as string}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select group type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="regional">Regional</SelectItem>
                    <SelectItem value="franchise">Franchise</SelectItem>
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
                <FormLabel>Parent Group (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter parent group name" 
                    {...field}
                    value={field.value as string}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
        </CardHeader>
        <CardContent>
          {form.watch("type") === "group" && (
            <LocationsInput form={form as UseFormReturn<any>} />
          )}
        </CardContent>
      </Card> */}
    </div>
  );
}
