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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";
import { DollarSign } from "lucide-react";

interface CurrencySettingsSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

const CURRENCIES = [
  { value: "USD", label: "US Dollar (USD)", symbol: "$" },
  { value: "EUR", label: "Euro (EUR)", symbol: "€" },
  { value: "GBP", label: "British Pound (GBP)", symbol: "£" },
  { value: "CAD", label: "Canadian Dollar (CAD)", symbol: "CA$" },
  { value: "AUD", label: "Australian Dollar (AUD)", symbol: "A$" },
];

export function CurrencySettingsSection({ form }: CurrencySettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Currency Settings
        </CardTitle>
        <CardDescription>
          Configure how prices are displayed in your store.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="default_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "USD"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency_symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency Symbol</FormLabel>
                <FormControl>
                  <Input placeholder="$" {...field} maxLength={5} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="currency_position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Symbol Position</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "before"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="before">Before amount ($100)</SelectItem>
                  <SelectItem value="after">After amount (100$)</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="decimal_separator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Decimal Separator</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "."}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select separator" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value=".">Period (.)</SelectItem>
                    <SelectItem value=",">Comma (,)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="thousand_separator"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Thousand Separator</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ","}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select separator" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value=",">Comma (,)</SelectItem>
                    <SelectItem value=".">Period (.)</SelectItem>
                    <SelectItem value=" ">Space ( )</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="decimal_places"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Decimal Places</FormLabel>
                <Select 
                  onValueChange={(val) => field.onChange(parseInt(val))} 
                  value={String(field.value ?? 2)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select places" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">0 ($100)</SelectItem>
                    <SelectItem value="2">2 ($100.00)</SelectItem>
                    <SelectItem value="3">3 ($100.000)</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Preview: {form.watch("currency_position") === "before" ? form.watch("currency_symbol") : ""}
            1{form.watch("thousand_separator") === "none" ? "" : form.watch("thousand_separator")}234
            {form.watch("decimal_separator")}
            {"0".repeat(form.watch("decimal_places") || 2)}
            {form.watch("currency_position") === "after" ? form.watch("currency_symbol") : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
