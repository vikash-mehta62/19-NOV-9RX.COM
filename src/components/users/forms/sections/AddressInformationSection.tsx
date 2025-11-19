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
  const freeShipping = form.watch("freeShipping") || false; // Ensure boolean value



 


  useEffect(() => {
    if (sameAsShipping) {
      form.setValue("shippingAddress", billingAddress);
      console.log(form.getValues());
    }
    console.log(form.getValues("email_notifaction"))
  }, [sameAsShipping, billingAddress, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Address</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddressFields form={form} type="billing" />




        <div className="flex items-center justify-between gap-4 ">
          {/* Billing Address Title */}
          <CardTitle>Billing Address</CardTitle>

          {/* Same as Shipping Toggle */}
          <FormField
            control={form.control}
            name="sameAsShipping"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center rounded-lg border p-4">
                <FormLabel htmlFor="same-as-shipping-switch" className="text-base">
                  Same as Shipping
                </FormLabel>
                <FormControl>
                  <Switch
                    id="same-as-shipping-switch"
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



        <AddressFields form={form} type="shipping" />

        {!self && (
          <>
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
                  </div>
                  <FormControl>
                    <Switch
                      id="free-shipping-switch"
                      checked={field.value ?? false} // Ensure it's always a boolean
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
                      Order Without Payment{" "}
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      id="order_pay-switch"
                      checked={field.value ?? false} // Ensure it's always a boolean
                      onCheckedChange={field.onChange}
                      aria-label="Enable free shipping"
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
