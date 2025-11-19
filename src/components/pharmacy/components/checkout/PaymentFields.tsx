import {
  FormField,
  FormItem,
  FormLabel,
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
import { UseFormReturn } from "react-hook-form";
import { ACHPaymentFields } from "@/components/orders/sections/payment/ACHPaymentFields";

interface PaymentFieldsProps {
  form: UseFormReturn<any>;
}

export function PaymentFields({ form }: PaymentFieldsProps) {
  const paymentMethod = form.watch("payment.method");

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
                {/* <SelectItem value="ach">ACH/eCheck </SelectItem> */}
                {/* <SelectItem value="bank_transfer">Bank Transfer</SelectItem> */}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {paymentMethod === "card" && (
        <>
          <FormField
            control={form.control}
            name="payment.cardNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Card Number</FormLabel>
                <FormControl>
                  <Input placeholder="**** **** **** ****" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="payment.expiryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl>
                    <Input placeholder="MM/YY" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment.cvv"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CVV</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="***" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}

      {paymentMethod === "ach" && <ACHPaymentFields form={form} />}
    </div>
  );
}
