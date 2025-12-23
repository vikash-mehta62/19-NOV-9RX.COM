import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";
import { ShoppingCart } from "lucide-react";

interface OrderSettingsSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function OrderSettingsSection({ form }: OrderSettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Order Settings
        </CardTitle>
        <CardDescription>
          Configure order processing and numbering options.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="order_number_prefix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order Number Prefix</FormLabel>
                <FormControl>
                  <Input placeholder="ORD" {...field} />
                </FormControl>
                <FormDescription>
                  Prefix for order numbers (e.g., ORD-1001)
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="next_order_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Order Number</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1000"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1000)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="minimum_order_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Order Amount ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                Minimum order value required to checkout (0 = no minimum)
              </FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="require_phone_number"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Require Phone Number</FormLabel>
                <FormDescription>
                  Customers must provide phone number at checkout
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="auto_confirm_orders"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Auto-Confirm Orders</FormLabel>
                <FormDescription>
                  Automatically confirm orders after payment
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allow_guest_checkout"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Allow Guest Checkout</FormLabel>
                <FormDescription>
                  Allow customers to checkout without creating an account
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
