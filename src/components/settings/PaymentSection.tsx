import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";

interface PaymentSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function PaymentSection({ form }: PaymentSectionProps) {
  return (
    <div className="space-y-6 hidden">
      <div>
        <h3 className="text-lg font-medium">Payment Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure your payment processing settings
        </p>
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="authorize_net_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Enable Authorize.Net
                </FormLabel>
              </div>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormItem>
          )}
        />

        {form.watch("authorize_net_enabled") && (
          <>
            <FormField
              control={form.control}
              name="authorize_net_api_login_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Login ID</FormLabel>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="off"
                    placeholder="Enter your API Login ID"
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authorize_net_transaction_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Key</FormLabel>
                  <Input
                    {...field}
                    type="password"
                    autoComplete="off"
                    placeholder="Enter your Transaction Key"
                  />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authorize_net_test_mode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Test Mode</FormLabel>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormItem>
              )}
            />
          </>
        )}
      </div>
    </div>
  );
}
