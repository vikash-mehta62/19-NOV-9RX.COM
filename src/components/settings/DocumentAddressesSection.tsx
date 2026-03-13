import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Copy, MapPin, Package, Truck } from "lucide-react";
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
  { title: string; description: string; icon: typeof Building2; copySource?: AddressScope } 
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
    copySource: "invoice",
  },
  warehouse: {
    title: "Warehouse Address",
    description: "Used for purchase orders, packing slips, receiving documents, and warehouse destination info.",
    icon: Package,
    copySource: "shipping",
  },
};

const copyAddressGroup = (
  form: UseFormReturn<SettingsFormValues>,
  source: AddressScope,
  target: AddressScope
) => {
  const sourceValues = {
    name: form.getValues(getNameField(source)) as string,
    email: form.getValues(`${source}_email` as keyof SettingsFormValues) as string,
    phone: form.getValues(`${source}_phone` as keyof SettingsFormValues) as string,
    street: form.getValues(`${source}_street` as keyof SettingsFormValues) as string,
    suite: form.getValues(`${source}_suite` as keyof SettingsFormValues) as string,
    city: form.getValues(`${source}_city` as keyof SettingsFormValues) as string,
    state: form.getValues(`${source}_state` as keyof SettingsFormValues) as string,
    zipCode: form.getValues(`${source}_zip_code` as keyof SettingsFormValues) as string,
    country: form.getValues(`${source}_country` as keyof SettingsFormValues) as string,
  };

  form.setValue(getNameField(target), sourceValues.name as never);
  form.setValue(`${target}_email`, sourceValues.email);
  form.setValue(`${target}_phone`, sourceValues.phone);
  form.setValue(`${target}_street`, sourceValues.street);
  form.setValue(`${target}_suite`, sourceValues.suite);
  form.setValue(`${target}_city`, sourceValues.city);
  form.setValue(`${target}_state`, sourceValues.state);
  form.setValue(`${target}_zip_code`, sourceValues.zipCode);
  form.setValue(`${target}_country`, sourceValues.country);
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
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title}
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </div>
        {config.copySource && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copyAddressGroup(form, config.copySource!, scope)}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy {FIELD_GROUPS[config.copySource].title}
          </Button>
        )}
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
          {scope === "invoice" ? (
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
          ) : (
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
