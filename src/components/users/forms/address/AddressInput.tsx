import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { UserFormData } from "../../schemas/userFormSchemas";

interface AddressInputProps {
  form: UseFormReturn<UserFormData>;
  fieldName: string;
  label: string;
  type?: string;
}

export function AddressInput({
  form,
  fieldName,
  label,
  type = "text",
}: AddressInputProps) {
  // Create a valid HTML id from the fieldName by replacing dots with dashes
  const inputId = fieldName.replace(/\./g, "-");

  // Determine appropriate autocomplete value based on field name
  const getAutocomplete = () => {
    if (fieldName.includes("street")) return "street-address";
    if (fieldName.includes("city")) return "address-level2";
    if (fieldName.includes("state")) return "address-level1";
    if (fieldName.includes("zip_code")) return "postal-code";
    if (fieldName.includes("phone")) return "tel";
    return "off";
  };

  return (
    <FormField
      control={form.control}
      name={fieldName as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel htmlFor={inputId}>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              id={inputId}
              name={inputId}
              type={type}
              autoComplete={getAutocomplete()}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
