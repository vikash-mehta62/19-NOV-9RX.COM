import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Building2, MapPin, Package, Truck } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";

interface DocumentAddressesSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

type AddressScope = "invoice" | "shipping" | "warehouse";

const getNameField = (scope: AddressScope): keyof SettingsFormValues =>
  scope === "warehouse" ? "warehouse_name" : (`${scope}_company_name` as keyof SettingsFormValues);

const FIELD_GROUPS: Record<
  AddressScope,
  { title: string; description: string; icon: typeof Building2 } 
> = {
  invoice: {
    title: "Invoice Address",
    description: "Shown in invoice headers, invoice PDFs, and customer-facing billing documents.",
    icon: Building2,
  },
  shipping: {
    title: "Shipping Address",
    description: "Used as the general ship-from / shipping contact for admin documents.",
    icon: Truck,
  },
  warehouse: {
    title: "Warehouse Address",
    description: "Used for purchase orders, packing slips, receiving documents, and warehouse destination info.",
    icon: Package,
  },
};

const AddressCard = ({
  form,
  scope,
}: {
  form: UseFormReturn<SettingsFormValues>;
  scope: AddressScope;
}) => {
  const config = FIELD_GROUPS[scope];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title}
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name={getNameField(scope)}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name / Company</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${scope}_phone`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${scope}_email`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          {scope === "invoice" && (
            <FormField
              control={form.control}
              name="invoice_tax_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
          {scope === "invoice" && (
            <FormField
              control={form.control}
              name="invoice_website"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name={`${scope}_street`}
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Street Address
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${scope}_suite`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Suite / Unit</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${scope}_country`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${scope}_city`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${scope}_state`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${scope}_zip_code`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP Code</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export function DocumentAddressesSection({ form }: DocumentAddressesSectionProps) {
  return (
    <div className="space-y-6">
      <AddressCard form={form} scope="invoice" />
      <AddressCard form={form} scope="shipping" />
      <AddressCard form={form} scope="warehouse" />
    </div>
  );
}
