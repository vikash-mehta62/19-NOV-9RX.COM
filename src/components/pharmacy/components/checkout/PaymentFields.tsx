import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";

interface PaymentFieldsProps {
  form: UseFormReturn<any>;
}

export function PaymentFields({ form }: PaymentFieldsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Payment Information</h3>
      <FormField
        control={form.control}
        name="payment.method"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment Method</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="card">Credit Card</SelectItem>
                <SelectItem value="ach">Bank Account (ACH)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Card or bank details are collected on the secure iPOSPay checkout page after you continue.
      </div>
    </div>
  );
}
