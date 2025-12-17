import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Edit,
  TrendingUp,
} from "lucide-react";
import { PayCreditModal } from "./PayCreditModal";
import { StatementDateRangeSelector } from "./StatementDateRangeSelector";
import { statementService } from "@/services/statementService";
import { downloadService } from "@/services/downloadService";
import { statementPDFGenerator } from "@/utils/statement-pdf-generator";

interface CreditSettings {
  credit_limit: number;
  available_credit: number;
  credit_used: number;
  payment_terms: string;
  credit_days: number;
  late_payment_fee_percentage: number;
  credit_status: string;
  auto_statement: boolean;
  statement_frequency: string;
  last_statement_date: string | null;
}

interface EnhancedPaymentTabProps {
  userId: string;
}
interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  description: string;
}

export function EnhancedPaymentTab({ userId }: EnhancedPaymentTabProps) {
  const [creditSettings, setCreditSettings] = useState<CreditSettings | null>(
    null
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  const { toast } = useToast();

  // Form state
  const [creditLimit, setCreditLimit] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("net_30");
  const [creditDays, setCreditDays] = useState("30");
  const [lateFeePercentage, setLateFeePercentage] = useState("2");
  const [autoStatement, setAutoStatement] = useState(true);
  const [statementFrequency, setStatementFrequency] = useState("monthly");

  useEffect(() => {
    if (userId) {
      loadCreditSettings();
    }
  }, [userId]);

  const loadCreditSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          credit_limit,
          available_credit,
          credit_used,
          payment_terms,
          credit_days,
          late_payment_fee_percentage,
          credit_status,
          auto_statement,
          statement_frequency,
          last_statement_date
        `
        )
        .eq("id", userId)
        .single();

      if (error) throw error;

      setCreditSettings(data as CreditSettings);

      // Set form values
      if (data) {
        setCreditLimit(data.credit_limit?.toString() || "0");
        setPaymentTerms(data.payment_terms || "net_30");
        setCreditDays(data.credit_days?.toString() || "30");
        setLateFeePercentage(
          data.late_payment_fee_percentage?.toString() || "2"
        );
        setAutoStatement(data.auto_statement ?? true);
        setStatementFrequency(data.statement_frequency || "monthly");
      }
    } catch (error) {
      console.error("Error loading credit settings:", error);
      toast({
        title: "Error",
        description: "Failed to load credit settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCreditSettings = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          credit_limit: parseFloat(creditLimit),
          payment_terms: paymentTerms,
          credit_days: parseInt(creditDays),
          late_payment_fee_percentage: parseFloat(lateFeePercentage),
          auto_statement: autoStatement,
          statement_frequency: statementFrequency,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Settings Updated",
        description: "Credit settings have been saved successfully",
      });

      setIsEditDialogOpen(false);
      loadCreditSettings();
    } catch (error) {
      console.error("Error saving credit settings:", error);
      toast({
        title: "Error",
        description: "Failed to save credit settings",
        variant: "destructive",
      });
    }
  };

  const handleGenerateStatement = async () => {
    try {
      // Call API to generate statement
      toast({
        title: "Generating Statement",
        description: "Account statement is being generated...",
      });

      // Update last statement date
      await supabase
        .from("profiles")
        .update({ last_statement_date: new Date().toISOString() })
        .eq("id", userId);

      loadCreditSettings();
    } catch (error) {
      console.error("Error generating statement:", error);
      toast({
        title: "Error",
        description: "Failed to generate statement",
        variant: "destructive",
      });
    }
  };

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    // This will be called when valid date range is selected
    console.log("Date range changed:", { startDate, endDate });
  };

  const handleStatementDownload = async (startDate: Date, endDate: Date) => {
    setIsGeneratingStatement(true);
    try {
      console.log("Starting statement download for:", { userId, startDate, endDate });
      
      toast({
        title: "Generating Statement",
        description: `Generating statement for ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}...`,
      });

      // Check browser support first
      const capabilities = downloadService.getDownloadCapabilities();
      console.log("Browser download capabilities:", capabilities);
      
      if (!capabilities.supported) {
        throw new Error("Your browser does not support file downloads. Please try a different browser.");
      }

      // First, let's try to generate the statement data and PDF directly
      console.log("Generating statement data...");
      const statementResponse = await statementService.generateStatementData({
        userId,
        startDate,
        endDate,
        includeZeroActivity: true
      });

      if (!statementResponse.success || !statementResponse.data) {
        throw new Error(statementResponse.error || "Failed to generate statement data");
      }

      console.log("Statement data generated:", statementResponse.data);
      
      // Generate filename
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      const filename = `statement_${userId}_${startDateStr}_to_${endDateStr}.pdf`;
      console.log("Suggested filename:", filename);

      // Get user profile for better filename
      let userProfile;
      try {
        userProfile = await statementService.getUserProfile(userId);
        console.log("User profile loaded:", userProfile);
      } catch (error) {
        console.warn("Could not load user profile:", error);
      }

      // Create PDF
      console.log("Creating PDF...");
      const pdfBlob = await statementPDFGenerator.createPDF(statementResponse.data, userProfile);
      console.log("PDF created, size:", pdfBlob.size, "bytes");

      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error("Generated PDF is empty");
      }

      // Try direct download
      console.log("Attempting direct download...");
      const downloadSuccess = await new Promise<boolean>((resolve) => {
        try {
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.style.display = 'none';
          
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            resolve(true);
          }, 1000);
          
        } catch (error) {
          console.error("Direct download failed:", error);
          resolve(false);
        }
      });

      if (!downloadSuccess) {
        throw new Error("Failed to trigger download");
      }

      const result = { success: true, filename };

      console.log("Download result:", result);

      if (result.success) {
        // Update last statement date
        await supabase
          .from("profiles")
          .update({ last_statement_date: new Date().toISOString() })
          .eq("id", userId);

        toast({
          title: "Statement Downloaded",
          description: "Your account statement has been downloaded successfully.",
        });

        loadCreditSettings();
      } else {
        console.error("Download failed:", result.error);
        throw new Error(result.error || "Failed to download statement");
      }

    } catch (error) {
      console.error("Error in handleStatementDownload:", error);
      
      // Provide user-friendly error message
      let errorMessage = "Failed to download statement. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("browser")) {
          errorMessage = "Your browser doesn't support file downloads. Please try a different browser.";
        } else if (error.message.includes("network") || error.message.includes("timeout")) {
          errorMessage = "Network error occurred. Please check your connection and try again.";
        } else if (error.message.includes("validation")) {
          errorMessage = "There are some data inconsistencies, but the download will proceed.";
          
          // Try to download anyway with validation disabled
          try {
            const fallbackResult = await downloadService.downloadStatement({
              userId,
              startDate,
              endDate,
              includeZeroActivity: true
            }, {
              validateData: false,
              maxRetries: 1
            });
            
            if (fallbackResult.success) {
              toast({
                title: "Statement Downloaded",
                description: "Statement downloaded successfully (with validation warnings).",
              });
              return;
            }
          } catch (fallbackError) {
            console.error("Fallback download also failed:", fallbackError);
          }
        }
      }

      toast({
        title: "Download Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingStatement(false);
    }
  };

  const getCreditStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "suspended":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "blocked":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getCreditStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="w-5 h-5" />;
      case "warning":
        return <AlertCircle className="w-5 h-5" />;
      case "suspended":
      case "blocked":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const creditUtilization = creditSettings
    ? (creditSettings.credit_used / creditSettings.credit_limit) * 100
    : 0;

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("account_transactions")
        .select("*")
        .eq("customer_id", userId)
        .order("transaction_date", { ascending: false });

        console.log(data, "fetch Transection")
      if (!error && data) {
        setTransactions(data);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">
          Loading payment information...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Credit Overview */}
      {creditSettings && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Credit Account
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge
                  className={getCreditStatusColor(creditSettings.credit_status)}
                >
                  {getCreditStatusIcon(creditSettings.credit_status)}
                  <span className="ml-1 capitalize">
                    {creditSettings.credit_status}
                  </span>
                </Badge>
                <Dialog
                  open={isEditDialogOpen}
                  onOpenChange={setIsEditDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Edit Credit Settings</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Credit Limit (USD)</Label>
                        <Input
                          type="number"
                          value={creditLimit}
                          onChange={(e) => setCreditLimit(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Payment Terms</Label>
                          <Select
                            value={paymentTerms}
                            onValueChange={setPaymentTerms}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="net_30">Net 30</SelectItem>
                              <SelectItem value="net_60">Net 60</SelectItem>
                              <SelectItem value="DueOnReceipt">
                                Due on Receipt
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Credit Days</Label>
                          <Input
                            type="number"
                            value={creditDays}
                            onChange={(e) => setCreditDays(e.target.value)}
                            placeholder="30"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Late Payment Fee (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={lateFeePercentage}
                          onChange={(e) => setLateFeePercentage(e.target.value)}
                          placeholder="2.0"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Percentage charged on overdue balances
                        </p>
                      </div>
                      <div>
                        <Label>Statement Frequency</Label>
                        <Select
                          value={statementFrequency}
                          onValueChange={setStatementFrequency}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <Label>Auto-Generate Statements</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Automatically send account statements
                          </p>
                        </div>
                        <Switch
                          checked={autoStatement}
                          onCheckedChange={setAutoStatement}
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleSaveCreditSettings}>
                          Save Settings
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Credit Limit
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(creditSettings.credit_limit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Available Credit
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    creditSettings.credit_limit - creditSettings.credit_used
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Credit Used
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(creditSettings.credit_used)}
                </p>
              </div>
            </div>

            {/* Credit Utilization Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  Credit Utilization
                </span>
                <span className="font-medium">
                  {creditUtilization.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    creditUtilization > 90
                      ? "bg-red-500"
                      : creditUtilization > 75
                      ? "bg-orange-500"
                      : creditUtilization > 50
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, creditUtilization)}%` }}
                />
              </div>
            </div>

            {/* Credit Terms */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Payment Terms
                </p>
                <p className="font-semibold">{creditSettings.payment_terms}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Credit Days
                </p>
                <p className="font-semibold">
                  {creditSettings.credit_days} days
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Late Fee</p>
                <p className="font-semibold">
                  {creditSettings.late_payment_fee_percentage}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Currency</p>
                <p className="font-semibold">USD</p>
              </div>
            </div>

            <br />
            <div className="flex items-center justify-end gap-4">
              <div className="text-right flex items-center gap-4">
                <p className="text-sm text-muted-foreground ">Credit Used</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(creditSettings.credit_used)}
                </p>
              </div>

              {/* Pay Button on the right */}
              <div>
                <PayCreditModal
                  creditUsed={creditSettings.credit_used}
                  onPaymentSuccess={loadCreditSettings} 
                  userId={userId}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statement Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Account Statements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Auto-Statement Settings */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Auto-Generate Statements</p>
                <p className="text-sm text-muted-foreground">
                  Frequency: {creditSettings?.statement_frequency || "Monthly"}
                </p>
                {creditSettings?.last_statement_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last generated:{" "}
                    {new Date(
                      creditSettings.last_statement_date
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge
                variant={
                  creditSettings?.auto_statement ? "default" : "secondary"
                }
              >
                {creditSettings?.auto_statement ? "Enabled" : "Disabled"}
              </Badge>
            </div>

            {/* Custom Date Range Statement Generation */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Generate Custom Statement</h4>
              <StatementDateRangeSelector
                onDateRangeChange={handleDateRangeChange}
                onDownload={handleStatementDownload}
                isGenerating={isGeneratingStatement}
                maxDateRange={365}
              />
              
              {/* Debug Test Button - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">Debug Tools (Development Only)</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          console.log("Testing simple text download...");
                          const testContent = "Test download file\nGenerated at: " + new Date().toISOString();
                          const blob = new Blob([testContent], { type: 'text/plain' });
                          const filename = `test-download-${Date.now()}.txt`;
                          
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = filename;
                          link.style.display = 'none';
                          
                          document.body.appendChild(link);
                          link.click();
                          
                          setTimeout(() => {
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }, 1000);
                          
                          toast({
                            title: "Test Download",
                            description: "Test file download triggered",
                          });
                        } catch (error) {
                          console.error("Test download failed:", error);
                          toast({
                            title: "Test Failed",
                            description: "Test download failed",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Test Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const capabilities = downloadService.getDownloadCapabilities();
                        console.log("Download capabilities:", capabilities);
                        toast({
                          title: "Browser Capabilities",
                          description: `Supported: ${capabilities.supported}, Features: ${capabilities.features.length}`,
                        });
                      }}
                    >
                      Check Browser
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Debug Test Button - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">Debug Tools (Development Only)</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Test basic download functionality
                        if ((window as any).downloadTests) {
                          (window as any).downloadTests.testBasicDownload();
                        }
                      }}
                    >
                      Test Basic Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Test PDF generation
                        if ((window as any).debugDownload) {
                          (window as any).debugDownload.testPDFGeneration();
                        }
                      }}
                    >
                      Test PDF Generation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Test full statement download
                        const testStartDate = new Date();
                        testStartDate.setMonth(testStartDate.getMonth() - 1);
                        const testEndDate = new Date();
                        
                        if ((window as any).debugDownload) {
                          (window as any).debugDownload.debugStatementDownload(userId, testStartDate, testEndDate);
                        }
                      }}
                    >
                      Debug Statement Download
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No saved payment methods</p>
            <p className="text-sm mt-1">
              Payment methods can be added during checkout
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Credit History */}
      <Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <TrendingUp className="w-5 h-5" />
      Credit History
    </CardTitle>
  </CardHeader>
  <CardContent>
    {loading ? (
      <div className="text-center py-8 text-muted-foreground">
        <p>Loading credit history...</p>
      </div>
    ) : transactions.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No credit history yet</p>
        <p className="text-sm mt-1">
          View payment history and credit usage over time
        </p>
      </div>
    ) : (
      <div className="space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex justify-between items-center p-2 border rounded-md hover:bg-gray-50"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">{tx.description}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(tx.created_at).toLocaleString()}
              </span>
              {/* Display transactionId or admin notes */}
              {tx.transectionId ? (
                <span className="text-xs text-blue-600">
                  Transaction ID: {tx.transectionId}
                </span>
              ) : tx.admin_pay_notes ? (
                <span className="text-xs text-purple-600">
                  Notes: {tx.admin_pay_notes}
                </span>
              ) : null}
            </div>
            <div className="flex flex-col text-right">
              <span className="text-sm text-red-600">
                {tx.debit_amount > 0 ? `-$${tx.debit_amount}` : ""}
              </span>
              <span className="text-sm text-green-600">
                {tx.credit_amount > 0 ? `+$${tx.credit_amount}` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                Balance: ${tx.balance}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </CardContent>
</Card>

    </div>
  );
}
