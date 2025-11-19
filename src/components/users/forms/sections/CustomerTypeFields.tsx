import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../../schemas/sharedFormSchema";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface CustomerTypeFieldsProps {
  form: UseFormReturn<BaseUserFormData>;
  type: "pharmacy" | "hospital" | "group";
}

export function CustomerTypeFields({ form, type }: CustomerTypeFieldsProps) {
  if (type === "pharmacy") {
    return (
      <FormField
        control={form.control}
        name="pharmacyLicense"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pharmacy License Number</FormLabel>
            <FormControl>
              <Input placeholder="Enter pharmacy license number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (type === "group") {
    return (
      <FormField
        control={form.control}
        name="groupStation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Group Station</FormLabel>
            <FormControl>
              <Input placeholder="Enter group station" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return null;
}