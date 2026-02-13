"use client";

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
import { processACHPayment } from "@/services/paymentService";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentSettings {
  enabled: boolean;
  apiLoginId: string;
  transactionKey: string;
  testMode: boolean;
  poIs?: boolean;
}

export function PaymentSection({
  form,
  isEditing,
  poIs,
}: {
  form: any;
  isEditing: boolean;
  poIs: boolean;
}) {
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
      // Check which processor to use
      const processor = import.meta.env.VITE_ACH_PAYMENT_PROCESSOR || "authorize_net";
      
      let response;
      
      if (processor === "fortispay") {
        // Use FortisPay for ACH payment
        const { processACHPaymentFortisPay } = await import("@/services/paymentService");
        
        response = await processACHPaymentFortisPay(
          {
            accountType: data.payment.achAccountType as "checking" | "savings" | "businessChecking",
            routingNumber: data.payment.achRoutingNumber,
            accountNumber: data.payment.achAccountNumber,
            nameOnAccount: data.payment.achAccountName,
          },
          {
            firstName: data.customerInfo.firstName || "",
            lastName: data.customerInfo.lastName || "",
            address: data.customerInfo.address || "",
            city: data.customerInfo.city || "",
            state: data.customerInfo.state || "",
            zip: data.customerInfo.zip || "",
            country: "US",
          },
          Number.parseFloat(data.total),
          data.orderId,
          `Order Payment - ${data.customerInfo.email}`
        );
      } else {
        // Use Authorize.Net (default)
        response = await processACHPayment({
          accountType: data.payment.achAccountType as "checking" | "savings" | "businessChecking",
          routingNumber: data.payment.achRoutingNumber,
          accountNumber: data.payment.achAccountNumber,
          nameOnAccount: data.payment.achAccountName,
          amount: Number.parseFloat(data.total),
          customerEmail: data.customerInfo.email,
          testMode: apiCredentials.testMode,
        });
      }

      if (response.success) {
        toast({
          title: "Payment Processed",
          description: `ACH payment processed successfully. Transaction ID: ${response.transactionId}`,
        });
      } else {
        throw new Error(response.errorMessage || response.message || "Failed to process ACH payment");
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
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h10m4 0a1 1 0 11-2 0m2 0a1 1 0 10-2 0m0 0H7a2 2 0 110-4h10a2 2 0 110 4z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Payment Method</h3>
              <p className="text-sm text-slate-600">
                Select how you'd like to pay
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {!poIs && (
            <FormField
              control={form.control}
              name="payment.method"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <SelectTrigger className="border-slate-300 hover:border-slate-400 transition-colors">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a1 1 0 11-2 0 1 1 0 012 0z" />
                            </svg>
                            Credit Card
                          </div>
                        </SelectItem>
                        <SelectItem value="credit">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a1 1 0 11-2 0 1 1 0 012 0z" />
                            </svg>
                            Credit Limit
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </div>

      {paymentMethod === "ach" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AuthorizeNetCredentials
              apiCredentials={apiCredentials}
              onCredentialsChange={handleCredentialsChange}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <ACHPaymentFields form={form} />
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg py-4">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-blue-700 font-medium">
                Processing payment...
              </span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-500 text-white">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {poIs ? "Notes" : "Special Instructions"}
                </h3>
                <p className="text-sm text-slate-600">
                  Add any special requests or notes
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter any special instructions or notes here..."
                      className="border-slate-300 hover:border-slate-400 transition-colors min-h-24"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {!poIs && (
          <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-500 text-white">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 20h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v13a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">PO Number</h3>
                  <p className="text-sm text-slate-600">
                    Enter your purchase order number
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4">
              <FormField
                control={form.control}
                name="purchase_number_external"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700">
                      PO Number (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Enter your PO number here..."
                        className="border-slate-300 hover:border-slate-400 transition-colors min-h-20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
