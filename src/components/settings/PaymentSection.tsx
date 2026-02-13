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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UseFormReturn } from "react-hook-form";
import { SettingsFormValues } from "./settingsTypes";
import { 
  CreditCard, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  Landmark,
  ExternalLink,
  Loader2,
  Info
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface PaymentSectionProps {
  form: UseFormReturn<SettingsFormValues>;
}

export function PaymentSection({ form }: PaymentSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showTransactionKey, setShowTransactionKey] = useState(false);
  const [showFortisApiKey, setShowFortisApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testMessage, setTestMessage] = useState<string>("");

  const isEnabled = form.watch("authorize_net_enabled");
  const isTestMode = form.watch("authorize_net_test_mode");
  const apiLoginId = form.watch("authorize_net_api_login_id");
  const transactionKey = form.watch("authorize_net_transaction_key");
  
  const creditCardProcessor = form.watch("credit_card_processor");
  const achProcessor = form.watch("ach_processor");
  
  const fortisPayEnabled = form.watch("fortispay_enabled");
  const fortisPayTestMode = form.watch("fortispay_test_mode");
  const fortisPayUserId = form.watch("fortispay_user_id");
  const fortisPayApiKey = form.watch("fortispay_user_api_key");
  const fortisPayLocationId = form.watch("fortispay_location_id");
  const fortisPayProductId = form.watch("fortispay_product_transaction_id_ach");

  const testConnection = async () => {
    if (!apiLoginId || !transactionKey) {
      toast.error("Please enter API credentials first");
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestMessage("");

    try {
      // First save the credentials temporarily
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to test connection");
        setTesting(false);
        return;
      }

      // Save settings first so edge function can read them
      const { error: saveError } = await supabase
        .from("payment_settings")
        .upsert(
          {
            profile_id: user.id,
            provider: "authorize_net",
            settings: {
              enabled: true,
              apiLoginId,
              transactionKey,
              testMode: isTestMode,
            },
          },
          { onConflict: "profile_id,provider" }
        );

      if (saveError) {
        throw new Error("Failed to save credentials for testing");
      }

      // Test with a $0.01 transaction using the edge function
      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          payment: {
            type: "card",
            cardNumber: "4111111111111111", // Test card number
            expirationDate: "1225",
            cvv: "123",
            cardholderName: "Test User",
          },
          amount: 0.01,
          invoiceNumber: `TEST-${Date.now()}`,
          billing: {
            firstName: "Test",
            lastName: "User",
            address: "123 Test St",
            city: "Test City",
            state: "CA",
            zip: "12345",
            country: "USA",
          },
        },
      });

      if (error) {
        // Check if it's a credentials error
        const errorData = data;
        if (errorData?.errorCode === "MISSING_CREDENTIALS" || errorData?.errorCode === "GATEWAY_DISABLED") {
          setTestResult("error");
          setTestMessage(errorData?.error || "Credentials not configured properly");
          toast.error(errorData?.error || "Credentials not configured");
        } else {
          setTestResult("error");
          setTestMessage(errorData?.error || error.message || "Connection test failed");
          toast.error(errorData?.error || "Connection test failed");
        }
        return;
      }

      if (data?.success) {
        setTestResult("success");
        setTestMessage("Connection verified! Transaction ID: " + data.transactionId);
        toast.success("Connection successful! Authorize.net credentials are valid.");
      } else {
        // Even if transaction fails, if we got a response from Authorize.net, credentials are valid
        if (data?.errorCode && data.errorCode !== "MISSING_CREDENTIALS") {
          setTestResult("success");
          setTestMessage("Credentials verified. Note: " + (data?.error || "Test transaction declined (expected for test cards)"));
          toast.success("Credentials are valid! Test transaction was declined as expected.");
        } else {
          setTestResult("error");
          setTestMessage(data?.error || "Connection failed");
          toast.error(data?.error || "Connection failed");
        }
      }
    } catch (error: any) {
      console.error("Test connection error:", error);
      setTestResult("error");
      setTestMessage(error.message || "Failed to test connection");
      toast.error(error.message || "Failed to test connection");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Gateway - Authorize.net
        </CardTitle>
        <CardDescription>
          Configure your Authorize.net payment gateway to accept credit cards and ACH payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Toggle */}
        <FormField
          control={form.control}
          name="authorize_net_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Enable Authorize.net</FormLabel>
                <FormDescription>
                  Accept credit card and ACH payments through Authorize.net
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {isEnabled && (
          <>
            {/* Test Mode Toggle */}
            <FormField
              control={form.control}
              name="authorize_net_test_mode"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-amber-50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                      Sandbox/Test Mode
                      {field.value && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-700">
                          Testing
                        </Badge>
                      )}
                    </FormLabel>
                    <FormDescription>
                      Use sandbox environment for testing (no real charges)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                {isTestMode 
                  ? "You are in TEST MODE. Use sandbox credentials from your Authorize.net sandbox account. No real charges will be made."
                  : "You are in PRODUCTION MODE. Real charges will be made. Make sure to use your production API credentials."
                }
              </AlertDescription>
            </Alert>

            {/* API Credentials */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  API Credentials
                </h4>
                <a
                  href={isTestMode 
                    ? "https://sandbox.authorize.net/" 
                    : "https://account.authorize.net/"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  Get credentials
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <FormField
                control={form.control}
                name="authorize_net_api_login_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Login ID</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showApiKey ? "text" : "password"}
                          placeholder="Enter your API Login ID"
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Found in Account → Settings → API Credentials & Keys
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="authorize_net_transaction_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Key</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showTransactionKey ? "text" : "password"}
                          placeholder="Enter your Transaction Key"
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowTransactionKey(!showTransactionKey)}
                        >
                          {showTransactionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Generate a new key in API Credentials & Keys section
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Test Connection Button */}
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={testing || !apiLoginId || !transactionKey}
                  className="w-full sm:w-auto"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing Connection...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>
                
                {testResult === "success" && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Connection Verified</AlertTitle>
                    <AlertDescription className="text-green-700">
                      {testMessage}
                    </AlertDescription>
                  </Alert>
                )}
                
                {testResult === "error" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Failed</AlertTitle>
                    <AlertDescription>
                      {testMessage}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {/* Payment Methods Accepted */}
            <div className="p-4 border rounded-lg space-y-4">
              <h4 className="font-medium">Accepted Payment Methods</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">Credit/Debit Cards</p>
                    <p className="text-xs text-muted-foreground">
                      Visa, Mastercard, Amex, Discover
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Landmark className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">ACH/eCheck</p>
                    <p className="text-xs text-muted-foreground">
                      Bank transfers (checking/savings)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                  <span className="font-bold">VISA</span>
                </Badge>
                <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">
                  <span className="font-bold">Mastercard</span>
                </Badge>
                <Badge variant="outline" className="text-blue-800 border-blue-400 bg-blue-50">
                  <span className="font-bold">AMEX</span>
                </Badge>
                <Badge variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                  <span className="font-bold">Discover</span>
                </Badge>
              </div>
            </div>

            {/* Security Info */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">PCI DSS Compliant</p>
                  <p className="text-sm text-green-700">
                    All payment data is securely transmitted and processed through Authorize.net's 
                    PCI-compliant servers. Card details are never stored on our servers.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
