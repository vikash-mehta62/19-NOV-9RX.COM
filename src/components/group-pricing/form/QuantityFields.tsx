import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../CreateGroupPricingDialog";

interface QuantityFieldsProps {
  form: UseFormReturn<FormValues>;
}

export function QuantityFields({ form }: QuantityFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="minQuantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Minimum Quantity</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Min quantity"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="maxQuantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Maximum Quantity</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Max quantity"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}