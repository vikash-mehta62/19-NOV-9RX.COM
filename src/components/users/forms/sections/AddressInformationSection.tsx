import { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { BaseUserFormData } from "../../schemas/sharedFormSchema";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AddressFields } from "../AddressFields";
import { MapPin, Truck } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

interface AddressInformationSectionProps {
  form: UseFormReturn<BaseUserFormData>;
  self?: boolean;
}

export function AddressInformationSection({
  form,
  self = false,
}: AddressInformationSectionProps) {
  const sameAsShipping = form.watch("sameAsShipping");
  const billingAddress = form.watch("billingAddress");
  const freeShipping = form.watch("freeShipping") || false;

  useEffect(() => {
    if (sameAsShipping) {
      form.setValue("shippingAddress", billingAddress);
    }
  }, [sameAsShipping, billingAddress, form]);

  return (
    <div className="space-y-6">
      {/* Billing Address Section - First */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Billing Address
          </CardTitle>
          <CardDescription>
            Primary address for invoices and billing communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddressFields form={form} type="billing" />
        </CardContent>
      </Card>

      {/* Shipping Address Section - Second */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Address
              </CardTitle>
              <CardDescription>
                Address where orders will be delivered
              </CardDescription>
            </div>
            {/* Same as Billing Toggle */}
            <FormField
              control={form.control}
              name="sameAsShipping"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center rounded-lg border p-3 bg-muted/50">
                  <FormLabel htmlFor="same-as-billing-switch" className="text-sm font-medium cursor-pointer">
                    Same as Billing
                  </FormLabel>
                  <FormControl>
                    <Switch
                      id="same-as-billing-switch"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Use billing address for shipping"
                      className="ml-2"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sameAsShipping ? (
            <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground text-center">
                Shipping address is same as billing address
              </p>
            </div>
          ) : (
            <AddressFields form={form} type="shipping" />
          )}

        </CardContent>
      </Card>

      {/* Shipping Options Section */}
      {!self && (
        <Card>
          <CardHeader>
            <CardTitle>Shipping & Notification Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="freeShipping"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel
                      htmlFor="free-shipping-switch"
                      className="text-base"
                    >
                      Free Shipping
                    </FormLabel>
                    <CardDescription>
                      Waive shipping charges for this customer
                    </CardDescription>
                  </div>
                  <FormControl>
                    <Switch
                      id="free-shipping-switch"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      aria-label="Enable free shipping"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="order_pay"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel htmlFor="order_pay-switch" className="text-base">
                      Order Without Payment
                    </FormLabel>
                    <CardDescription>
                      Allow customer to place orders without immediate payment
                    </CardDescription>
                  </div>
                  <FormControl>
                    <Switch
                      id="order_pay-switch"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      aria-label="Enable order without payment"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email_notifaction"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Email Notifications</FormLabel>
                    <CardDescription>
                      Receive notifications about your account via email
                    </CardDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
