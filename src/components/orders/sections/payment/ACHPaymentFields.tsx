import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { OrderFormValues } from "../../schemas/orderSchema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

interface ACHPaymentFieldsProps {
  form: UseFormReturn<OrderFormValues>;
}

export function ACHPaymentFields({ form }: ACHPaymentFieldsProps) {
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const sanitizedText = pastedText.replace(/[^0-9]/g, '');
    const input = e.target as HTMLInputElement;
    const maxLength = parseInt(input.getAttribute('maxLength') || '0');
    input.value = sanitizedText.slice(0, maxLength);
  };

  return (
    <div className="space-y-4 border rounded-lg p-4">
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          ACH payments are subject to additional verification and may take 3-5 business days to process.
        </AlertDescription>
      </Alert>

      <FormField
        control={form.control}
        name="payment.achAccountType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="checking">Personal Checking</SelectItem>
                <SelectItem value="savings">Personal Savings</SelectItem>
                <SelectItem value="businessChecking">Business Checking</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="payment.achAccountName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Holder Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Enter account holder name" />
            </FormControl>
            <FormDescription>
              Name exactly as it appears on your bank account
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="payment.achRoutingNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Routing Number</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                placeholder="Enter 9-digit routing number" 
                maxLength={9}
                pattern="\d*"
                inputMode="numeric"
                onPaste={handlePaste}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  field.onChange(value);
                }}
              />
            </FormControl>
            <FormDescription>
              The 9-digit routing number from your check or bank account
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="payment.achAccountNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Number</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                type={showAccountNumber ? "text" : "password"}
                placeholder="Enter account number" 
                maxLength={17}
                pattern="\d*"
                inputMode="numeric"
                onPaste={handlePaste}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  field.onChange(value);
                }}
              />
            </FormControl>
            <button
              type="button"
              onClick={() => setShowAccountNumber(!showAccountNumber)}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {showAccountNumber ? "Hide" : "Show"} account number
            </button>
            <FormDescription>
              Your bank account number (4-17 digits)
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}