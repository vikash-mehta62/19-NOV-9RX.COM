import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";
import { ImageUploadField } from "../products/form-fields/ImageUploadField";

interface InvoiceCustomizationSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function InvoiceCustomizationSection({
  form,
}: InvoiceCustomizationSectionProps) {
  const validateImage = (file: File) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return "Image must be less than 5MB";
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Customization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="invoice_logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Invoice Logo</FormLabel>
                <FormControl>
                  <ImageUploadField form={form} validateImage={validateImage} />
                </FormControl>
                <FormDescription>
                  Upload your company logo (max 5MB)
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="invoice_accent_color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accent Color</FormLabel>
                <FormControl>
                  <Input type="color" {...field} />
                </FormControl>
                <FormDescription>
                  Choose a color for invoice accents
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="invoice_header_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Header Text</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter custom header text..."
                  className="h-20"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="invoice_footer_text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Footer Text</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter custom footer text..."
                  className="h-20"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="invoice_terms_and_conditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Terms and Conditions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter terms and conditions..."
                  className="h-32"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="show_business_address"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Show Business Address
                  </FormLabel>
                  <FormDescription>
                    Display your business address on invoices
                  </FormDescription>
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

          <FormField
            control={form.control}
            name="show_payment_instructions"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Show Payment Instructions
                  </FormLabel>
                  <FormDescription>
                    Display payment instructions on invoices
                  </FormDescription>
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
        </div>

        <FormField
          control={form.control}
          name="custom_payment_instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Payment Instructions</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter custom payment instructions..."
                  className="h-20"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
