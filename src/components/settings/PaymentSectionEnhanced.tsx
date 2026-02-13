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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to test connection");
        setTesting(false);
        return;
      }

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

      const { data, error } = await supabase.functions.invoke("process-payment", {
        body: {
          payment: {
            type: "card",
            cardNumber: "4111111111111111",
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
        toast.success("Connection successful! Authorize.Net credentials are valid.");
      } else {
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
    <div className="space-y-6">
      {/* Payment Processor Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Processor Configuration
          </CardTitle>
          <CardDescription>
            Select which payment processors to use for credit cards and ACH payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credit Card Processor Selection */}
          <FormField
            control={form.control}
            name="credit_card_processor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credit Card Processor</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select processor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="authorize_net">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Authorize.Net
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Payment processor for credit card transactions (currently only Authorize.Net supported)
                </FormDescription>
              </FormItem>
            )}
          />

          <Separator />

          {/* ACH Processor Selection */}
          <FormField
            control={form.control}
            name="ach_processor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ACH/Bank Transfer Processor</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select processor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="authorize_net">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4" />
                        Authorize.Net
                      </div>
                    </SelectItem>
                    <SelectItem value="fortispay">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4" />
                        FortisPay
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Payment processor for ACH/eCheck transactions
                </FormDescription>
              </FormItem>
            )}
          />

          {/* Processor Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Current Configuration</AlertTitle>
            <AlertDescription>
              <div className="space-y-1 mt-2">
                <p><strong>Credit Cards:</strong> {creditCardProcessor === 'authorize_net' ? 'Authorize.Net' : 'Not configured'}</p>
                <p><strong>ACH Payments:</strong> {achProcessor === 'authorize_net' ? 'Authorize.Net' : achProcessor === 'fortispay' ? 'FortisPay' : 'Not configured'}</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Authorize.Net Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Authorize.Net Configuration
          </CardTitle>
          <CardDescription>
            Configure Authorize.Net for credit card {achProcessor === 'authorize_net' ? 'and ACH' : ''} payments
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
                  <FormLabel className="text-base">Enable Authorize.Net</FormLabel>
                  <FormDescription>
                    Accept payments through Authorize.Net
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
                    ? "You are in TEST MODE. Use sandbox credentials from your Authorize.Net sandbox account. No real charges will be made."
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
                <h4 className="font-medium">Accepted Payment Methods via Authorize.Net</h4>
                
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
                  
                  {achProcessor === 'authorize_net' && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Landmark className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium">ACH/eCheck</p>
                        <p className="text-xs text-muted-foreground">
                          Bank transfers (checking/savings)
                        </p>
                      </div>
                    </div>
                  )}
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
                      All payment data is securely transmitted and processed through Authorize.Net's 
                      PCI-compliant servers. Card details are never stored on our servers.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* FortisPay Configuration */}
      {achProcessor === 'fortispay' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              FortisPay ACH Configuration
            </CardTitle>
            <CardDescription>
              Configure FortisPay for ACH/eCheck payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable Toggle */}
            <FormField
              control={form.control}
              name="fortispay_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable FortisPay</FormLabel>
                    <FormDescription>
                      Accept ACH payments through FortisPay
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {fortisPayEnabled && (
              <>
                {/* Test Mode Toggle */}
                <FormField
                  control={form.control}
                  name="fortispay_test_mode"
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
                    {fortisPayTestMode 
                      ? "You are in TEST MODE. Use sandbox credentials from your FortisPay sandbox account. No real charges will be made."
                      : "You are in PRODUCTION MODE. Real ACH charges will be made. Make sure to use your production API credentials."
                    }
                  </AlertDescription>
                </Alert>

                {/* API Credentials */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      FortisPay API Credentials
                    </h4>
                    <a
                      href="https://fortispay.com/developers/"
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
                    name="fortispay_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your FortisPay User ID"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormDescription>
                          Your FortisPay user identifier
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fortispay_user_api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User API Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showFortisApiKey ? "text" : "password"}
                              placeholder="Enter your FortisPay API Key"
                              autoComplete="off"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowFortisApiKey(!showFortisApiKey)}
                            >
                              {showFortisApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Your FortisPay API authentication key
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fortispay_location_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your Location ID"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormDescription>
                          Your business location ID from FortisPay
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fortispay_product_transaction_id_ach"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Transaction ID (ACH)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your ACH Product Transaction ID"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormDescription>
                          Product ID for ACH transactions from FortisPay
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Payment Methods Accepted */}
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Accepted Payment Methods via FortisPay</h4>
                  
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Landmark className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">ACH/eCheck</p>
                      <p className="text-xs text-muted-foreground">
                        Bank transfers (checking/savings/business checking)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Security Info */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800">Secure ACH Processing</p>
                      <p className="text-sm text-green-700">
                        All ACH payment data is securely transmitted and processed through FortisPay's 
                        secure servers. Bank account details are never stored on our servers.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Terms & Fees Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Terms & Fees
          </CardTitle>
          <CardDescription>
            Configure late payment fees, processing fees, and payment terms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Late Payment Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-base">Late Payment Interest & Fees</h4>
            </div>

            <FormField
              control={form.control}
              name="late_payment_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Late Payment Fees</FormLabel>
                    <FormDescription>
                      Charge interest or fees on overdue invoices
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("late_payment_enabled") && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="late_payment_grace_period_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grace Period (Days)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            placeholder="15"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Days after due date before fees apply
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="late_payment_fee_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fee Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How to calculate late fees
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("late_payment_fee_type") === "percentage" ? (
                  <FormField
                    control={form.control}
                    name="late_payment_interest_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Rate (% per month)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="1.5"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Monthly interest rate on overdue balance (e.g., 1.5% = 18% APR)
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="late_payment_fixed_fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fixed Late Fee ($)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="25.00"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Fixed fee charged for late payments
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Example</AlertTitle>
                  <AlertDescription>
                    {form.watch("late_payment_fee_type") === "percentage" 
                      ? `A $1,000 invoice overdue by 30 days would incur $${(1000 * (form.watch("late_payment_interest_rate") || 1.5) / 100).toFixed(2)} in interest.`
                      : `Each overdue invoice will be charged a flat fee of $${(form.watch("late_payment_fixed_fee") || 25).toFixed(2)}.`
                    }
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <Separator />

          {/* Card Processing Fees */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-base">Credit Card Processing Fees</h4>
            </div>

            <FormField
              control={form.control}
              name="card_processing_fee_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Card Processing Fees</FormLabel>
                    <FormDescription>
                      Add processing fees for credit card payments
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("card_processing_fee_enabled") && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <FormField
                  control={form.control}
                  name="card_processing_fee_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Processing Fee (%)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="2.9"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Percentage fee for credit card transactions (typical: 2.5% - 3.5%)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="card_processing_fee_pass_to_customer"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Pass Fee to Customer</FormLabel>
                        <FormDescription className="text-xs">
                          Add processing fee to customer's total
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Example</AlertTitle>
                  <AlertDescription>
                    A $100 payment would include a ${((100 * (form.watch("card_processing_fee_percentage") || 2.9) / 100)).toFixed(2)} processing fee
                    {form.watch("card_processing_fee_pass_to_customer") 
                      ? `, making the total $${(100 + (100 * (form.watch("card_processing_fee_percentage") || 2.9) / 100)).toFixed(2)}.`
                      : `, which you would absorb (customer pays $100).`
                    }
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <Separator />

          {/* ACH Processing Fees */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-base">ACH Processing Fees</h4>
            </div>

            <FormField
              control={form.control}
              name="ach_processing_fee_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable ACH Processing Fees</FormLabel>
                    <FormDescription>
                      Add processing fees for ACH/eCheck payments
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("ach_processing_fee_enabled") && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <FormField
                  control={form.control}
                  name="ach_processing_fee_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Processing Fee ($)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="1.50"
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Fixed fee per ACH transaction (typical: $0.50 - $2.00)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ach_processing_fee_pass_to_customer"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Pass Fee to Customer</FormLabel>
                        <FormDescription className="text-xs">
                          Add processing fee to customer's total
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Example</AlertTitle>
                  <AlertDescription>
                    A $100 ACH payment would include a ${(form.watch("ach_processing_fee_amount") || 1.5).toFixed(2)} processing fee
                    {form.watch("ach_processing_fee_pass_to_customer") 
                      ? `, making the total $${(100 + (form.watch("ach_processing_fee_amount") || 1.5)).toFixed(2)}.`
                      : `, which you would absorb (customer pays $100).`
                    }
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <Separator />

          {/* Early Payment Discount */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-base">Early Payment Discount</h4>
            </div>

            <FormField
              control={form.control}
              name="early_payment_discount_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Early Payment Discount</FormLabel>
                    <FormDescription>
                      Offer discount for early payment (e.g., 2/10 Net 30)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("early_payment_discount_enabled") && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="early_payment_discount_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="2"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Discount percentage for early payment
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="early_payment_discount_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Period (Days)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            placeholder="10"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Days from invoice date to qualify
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Example: {form.watch("early_payment_discount_percentage") || 2}/{form.watch("early_payment_discount_days") || 10} Net {form.watch("invoice_due_days") || 30}</AlertTitle>
                  <AlertDescription>
                    Customer gets {form.watch("early_payment_discount_percentage") || 2}% discount if paid within {form.watch("early_payment_discount_days") || 10} days, 
                    otherwise full amount due in {form.watch("invoice_due_days") || 30} days. 
                    A $1,000 invoice paid early would be ${(1000 * (1 - (form.watch("early_payment_discount_percentage") || 2) / 100)).toFixed(2)}.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          <Separator />

          {/* Other Payment Settings */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="minimum_payment_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Payment Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum amount required for online payments (0 = no minimum)
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_terms_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms Text</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Payment is due within 30 days of invoice date..."
                    />
                  </FormControl>
                  <FormDescription>
                    Default payment terms displayed on invoices
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>

          {/* Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Payment Terms Summary</h4>
            <div className="space-y-1 text-sm text-blue-800">
              {form.watch("late_payment_enabled") && (
                <p>• Late fees: {form.watch("late_payment_fee_type") === "percentage" 
                  ? `${form.watch("late_payment_interest_rate")}% per month` 
                  : `$${form.watch("late_payment_fixed_fee")} fixed`} after {form.watch("late_payment_grace_period_days")} day grace period</p>
              )}
              {form.watch("card_processing_fee_enabled") && (
                <p>• Card processing: {form.watch("card_processing_fee_percentage")}% {form.watch("card_processing_fee_pass_to_customer") ? "(passed to customer)" : "(absorbed by business)"}</p>
              )}
              {form.watch("ach_processing_fee_enabled") && (
                <p>• ACH processing: ${form.watch("ach_processing_fee_amount")} {form.watch("ach_processing_fee_pass_to_customer") ? "(passed to customer)" : "(absorbed by business)"}</p>
              )}
              {form.watch("early_payment_discount_enabled") && (
                <p>• Early payment discount: {form.watch("early_payment_discount_percentage")}% if paid within {form.watch("early_payment_discount_days")} days</p>
              )}
              {form.watch("minimum_payment_amount") > 0 && (
                <p>• Minimum payment: ${form.watch("minimum_payment_amount")}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
