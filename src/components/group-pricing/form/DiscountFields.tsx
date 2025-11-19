import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { FormValues } from "../CreateGroupPricingDialog";

interface DiscountFieldsProps {
  form: UseFormReturn<FormValues>;
}

export function DiscountFields({ form }: DiscountFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="discountType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Discount Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select discount type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="discountValue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Discount Value ({form.watch("discountType") === "percentage" ? "%" : "$"})
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder={`Enter discount ${
                  form.watch("discountType") === "percentage" ? "percentage" : "amount"
                }`}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}