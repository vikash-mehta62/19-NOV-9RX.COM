import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { AuthorizeNetCredentials } from "./payment/AuthorizeNetCredentials";
import { ACHPaymentFields } from "./payment/ACHPaymentFields";
import { processACHPayment } from "../utils/authorizeNetUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

interface PaymentSettings {
  enabled: boolean;
  apiLoginId: string;
  transactionKey: string;
  testMode: boolean;
  poIs?: boolean;
}

export function PaymentSection({ form ,isEditing,poIs}: { form: any,isEditing:boolean,poIs:boolean }) {
  const { toast } = useToast();
  const paymentMethod = form.watch("payment.method");
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiCredentials, setApiCredentials] = useState<PaymentSettings>({
    apiLoginId: "",
    transactionKey: "",
    testMode: false,
    enabled: false,
  });

  useEffect(() => {
    const fetchCredentials = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: paymentData, error } = await supabase
        .from("payment_settings")
        .select("settings")
        .eq("provider", "authorize_net")
        .eq("profile_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching credentials:", error);
        return;
      }

      if (paymentData?.settings) {
        const settings = paymentData.settings as unknown as PaymentSettings;
        setApiCredentials(settings);
      }
    };

    fetchCredentials();
  }, []);

  const handleCredentialsChange = async (
    field: "apiLoginId" | "transactionKey" | "testMode",
    value: string | boolean
  ) => {
    const newCredentials = { ...apiCredentials, [field]: value };
    setApiCredentials(newCredentials);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save payment settings",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("payment_settings").upsert(
        {
          profile_id: session.user.id,
          provider: "authorize_net",
          settings: newCredentials,
        },
        {
          onConflict: "profile_id,provider",
        }
      );

      if (error) {
        console.error("Error saving credentials:", error);
        toast({
          title: "Error",
          description: "Failed to save payment settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving credentials:", error);
      toast({
        title: "Error",
        description: "Failed to save payment settings",
        variant: "destructive",
      });
    }
  };

  const handleACHSubmit = async (data: any) => {
    if (!apiCredentials.apiLoginId || !apiCredentials.transactionKey) {
      toast({
        title: "Missing API Credentials",
        description: "Please enter your Authorize.Net API credentials",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    console.log("Processing ACH payment with data:", {
      ...data,
      apiCredentials: {
        ...apiCredentials,
        transactionKey: "[REDACTED]",
      },
    });

    try {
      const response = await processACHPayment({
        accountType: data.payment.achAccountType,
        accountName: data.payment.achAccountName,
        routingNumber: data.payment.achRoutingNumber,
        accountNumber: data.payment.achAccountNumber,
        amount: parseFloat(data.total),
        customerEmail: data.customerInfo.email,
        customerName: data.customerInfo.name,
        apiLoginId: apiCredentials.apiLoginId,
        transactionKey: apiCredentials.transactionKey,
        testMode: apiCredentials.testMode,
      });

      if (response.success) {
        toast({
          title: "Payment Processed",
          description: `ACH payment processed successfully. Transaction ID: ${response.transactionId}`,
        });
      } else {
        throw new Error(
          response.error?.text || "Failed to process ACH payment"
        );
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      toast({
        title: "Payment Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to process ACH payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
     {!poIs &&  <FormField
        control={form.control}
        name="payment.method"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Payment Method</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="card">Credit Card </SelectItem>
                {/* <SelectItem value="ach">ACH/eCheck </SelectItem> */}
                {/* <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="manual">Manual Payment</SelectItem> */}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
}
      {paymentMethod === "ach" && (
        <>
          <AuthorizeNetCredentials
            apiCredentials={apiCredentials}
            onCredentialsChange={handleCredentialsChange}
          />
          <ACHPaymentFields form={form} />
          {isProcessing && (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing payment...</span>
            </div>
          )}
        </>
      )}

      <FormField
        control={form.control}
        name="specialInstructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {
                poIs ? "Notes" :  "Special Instructions"
              }
              </FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    { !poIs &&  <FormField
        control={form.control}
        name="purchase_number_external"
        render={({ field }) => (
          <FormItem>
            <FormLabel>PO Number (Optional)</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />}
    </div>
  );
}
