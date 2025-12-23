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
import { Receipt } from "lucide-react";

interface TaxSettingsSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function TaxSettingsSection({ form }: TaxSettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Tax Settings
        </CardTitle>
        <CardDescription>
          Configure tax rates and display options for your orders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="tax_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Tax</FormLabel>
                <FormDescription>
                  Apply tax to orders automatically
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="default_tax_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Tax Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
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
            name="tax_label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Label</FormLabel>
                <FormControl>
                  <Input placeholder="Tax" {...field} />
                </FormControl>
                <FormDescription>
                  Label shown on invoices (e.g., "Tax", "Sales Tax", "VAT")
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tax_id_display"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax ID / EIN</FormLabel>
              <FormControl>
                <Input placeholder="XX-XXXXXXX" {...field} />
              </FormControl>
              <FormDescription>
                Your business tax identification number (shown on invoices)
              </FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tax_included_in_price"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Tax Included in Price</FormLabel>
                <FormDescription>
                  Product prices already include tax
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
