import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { OrderFormValues } from "../schemas/orderSchema";
import { calculateShippingCost, ShippingCarrier } from "../utils/shippingUtils";
import { useEffect, useState } from "react";
import { useCart } from "@/hooks/use-cart";

interface ShippingSectionProps {
  form: UseFormReturn<OrderFormValues>;
}

export function ShippingSection({ form }: ShippingSectionProps) {
  const [isCustomCost, setIsCustomCost] = useState(false);
  const { cartItems, clearCart } = useCart();

  const totalShippingCost = cartItems.reduce(
    (total, item) => total + (item.shipping_cost || 0),
    0
  );
  useEffect(() => {
    const method = form.watch("shipping.method");
    if (method && !isCustomCost) {
      const cost = totalShippingCost;
      form.setValue("shipping.cost", cost);
    }
  }, [form.watch("shipping.method"), isCustomCost, form]);

  return (
    <div>
      {/* <div className="space-y-4">
      <h2 className="text-xl font-semibold">Shipping Information</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="shipping.method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shipping Method</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  setIsCustomCost(value === "custom");
                }} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shipping method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="FedEx">FedEx ($12.00)</SelectItem>
                  <SelectItem value="custom">Custom Shipping Cost</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="shipping.cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shipping Cost ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter shipping cost"
                  disabled={!isCustomCost}
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div> */}
    </div>
  );
}
