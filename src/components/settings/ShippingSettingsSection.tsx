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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";
import { Truck } from "lucide-react";

interface ShippingSettingsSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function ShippingSettingsSection({ form }: ShippingSettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Shipping Settings
        </CardTitle>
        <CardDescription>
          Configure shipping rates and free shipping thresholds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="shipping_calculation_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shipping Calculation Method</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "flat_rate"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="flat_rate">Flat Rate</SelectItem>
                  <SelectItem value="weight_based">Weight Based</SelectItem>
                  <SelectItem value="price_based">Price Based</SelectItem>
                  <SelectItem value="free">Always Free</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="default_shipping_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Shipping Rate ($)</FormLabel>
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
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="handling_fee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Handling Fee ($)</FormLabel>
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
                  Additional fee added to each order
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="free_shipping_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Free Shipping</FormLabel>
                <FormDescription>
                  Offer free shipping above a certain order amount
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {form.watch("free_shipping_enabled") && (
          <FormField
            control={form.control}
            name="free_shipping_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Free Shipping Threshold ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="100.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Orders above this amount qualify for free shipping
                </FormDescription>
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
