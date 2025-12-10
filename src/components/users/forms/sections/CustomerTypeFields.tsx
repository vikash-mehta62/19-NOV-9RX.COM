import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../../schemas/sharedFormSchema";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Stethoscope, Users } from "lucide-react";

interface CustomerTypeFieldsProps {
  form: UseFormReturn<BaseUserFormData>;
  type: "pharmacy" | "hospital" | "group";
}

export function CustomerTypeFields({ form, type }: CustomerTypeFieldsProps) {
  if (type === "pharmacy") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Pharmacy Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="pharmacyLicense"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="pharmacyLicense">Pharmacy License Number</FormLabel>
                <FormControl>
                  <Input 
                    id="pharmacyLicense"
                    placeholder="Enter pharmacy license number" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    );
  }

  if (type === "hospital") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Hospital Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="pharmacyLicense"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="hospitalLicense">Hospital License Number</FormLabel>
                <FormControl>
                  <Input 
                    id="hospitalLicense"
                    placeholder="Enter hospital license number" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    );
  }

  if (type === "group") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Group Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="groupStation"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="groupStation">Group Station</FormLabel>
                <FormControl>
                  <Input 
                    id="groupStation"
                    placeholder="Enter group station" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    );
  }

  return null;
}