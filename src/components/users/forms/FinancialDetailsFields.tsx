import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { UseFormReturn } from "react-hook-form";
import { UserFormData } from "../schemas/userFormSchemas";

interface FinancialDetailsFieldsProps {
  form: UseFormReturn<UserFormData>;
}

export function FinancialDetailsFields({ form }: FinancialDetailsFieldsProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="taxPreference"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tax Preference</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Taxable" id="taxable" />
                  <label htmlFor="taxable">Taxable</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TaxExempt" id="taxExempt" />
                  <label htmlFor="taxExempt">Tax Exempt</label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch("taxPreference") === "Taxable" && (
        <FormField
          control={form.control}
          name="taxRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tax Rate</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tax rate" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="standard">Standard Rate</SelectItem>
                  <SelectItem value="reduced">Reduced Rate</SelectItem>
                  <SelectItem value="zero">Zero Rate</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="currency"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Currency</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="USD">USD - United States Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="openingBalance"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Opening Balance</FormLabel>
            <FormControl>
              <Input {...field} type="number" placeholder="USD" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="paymentTerms"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment Terms</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="DueOnReceipt">Due On Receipt</SelectItem>
                <SelectItem value="Net30">Net 30</SelectItem>
                <SelectItem value="Net60">Net 60</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="enablePortal"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Enable Portal Access</FormLabel>
            </div>
          </FormItem>
        )}
      />

      {form.watch("enablePortal") && (
        <FormField
          control={form.control}
          name="portalLanguage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portal Language</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
