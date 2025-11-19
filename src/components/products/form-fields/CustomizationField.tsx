import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../schemas/productSchema";

interface CustomizationFieldProps {
  form: UseFormReturn<ProductFormValues>;
}

export const CustomizationField = ({ form }: CustomizationFieldProps) => {
  const isCustomizationAllowed = form.watch("customization.allowed");

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="customization.allowed"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                  }}
                />
              </FormControl>
              <FormLabel className="font-normal">
                Allow customers to customize this product (e.g., add logos, text)
              </FormLabel>
            </div>
          </FormItem>
        )}
      />

      {isCustomizationAllowed && (
        <FormField
          control={form.control}
          name="customization.price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customization Price</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    className="pl-7"
                    value={field.value || ''}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Additional cost for customization (per unit)
              </FormDescription>
            </FormItem>
          )}
        />
      )}
    </div>
  );
};