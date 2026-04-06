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
import { SendCreditTermsSection } from "./SendCreditTermsSection";
import { statementService } from "@/services/statementService";
import { downloadService } from "@/services/downloadService";
import { statementPDFGenerator } from "@/utils/statement-pdf-generator";
import { cn } from "@/lib/utils";
import { useScreenSize } from "@/hooks/use-mobile";

interface CreditSettings {
  credit_limit: number;
  available_credit: number;
  credit_used: number;
  credit_penalty: number;
  payment_terms: string;
  credit_days: number;
  late_payment_fee_percentage: number;
  credit_status: string;
  auto_statement: boolean;
  statement_frequency: string;
  last_statement_date: string | null;
  credit_usage_month: number | null;
  last_penalty_month: number | null;
}

interface EnhancedPaymentTabProps {
  userId: string;
  readOnly?: boolean;
}

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  description: string;
  transectionId?: string;
  admin_pay_notes?: string;
  created_at?: string;
}

export function EnhancedPaymentTab({ userId, readOnly = false }: EnhancedPaymentTabProps) {
  const [creditSettings, setCreditSettings] = useState<CreditSettings | null>(
    null
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);
  const [hasPendingTerms, setHasPendingTerms] = useState(false);
  const { toast } = useToast();
  
  // Screen size detection for responsive design
  const screenSize = useScreenSize();
  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const isCompact = isMobile || isTablet;

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
      // Fetch profile settings
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          credit_limit,
          available_credit,
          credit_used,
          credit_penalty,
          payment_terms,
          credit_days,
          late_payment_fee_percentage,
          credit_status,
          auto_statement,
          statement_frequency,
          last_statement_date,
          credit_usage_month,
          last_penalty_month
        `
        )
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      // Fetch active credit line (overrides profile data if exists)
      const { data: creditLineData } = await supabase
        .from("user_credit_lines")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Check for pending terms (new offers)
      const { data: pendingTerms } = await supabase
        .from("sent_credit_terms")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .limit(1);

      if (pendingTerms && pendingTerms.length > 0) {
        setHasPendingTerms(true);
      } else {
        setHasPendingTerms(false);
      }

      let settings = profileData as CreditSettings;

      if (creditLineData) {
        // Use profile's credit_used as the source of truth (live data)
        // Recalculate available credit based on new limit and existing usage
        const currentUsed = settings.credit_used || 0;
        
        settings = {
          ...settings,
          credit_limit: creditLineData.credit_limit,
          available_credit: creditLineData.credit_limit - currentUsed,
          // Do NOT overwrite credit_used from creditLineData as it might be outdated
          // credit_used: settings.credit_used, 
          
          // user_credit_lines stores net_terms as number, profiles as string usually
          payment_terms: `net_${creditLineData.net_terms}`, 
          credit_days: creditLineData.net_terms,
          late_payment_fee_percentage: creditLineData.interest_rate,
          credit_status: creditLineData.status
        };
      }

      setCreditSettings(settings);

      // Set form values
      if (settings) {
        setCreditLimit(settings.credit_limit?.toString() || "0");
        setPaymentTerms(settings.payment_terms || "net_30");
        setCreditDays(settings.credit_days?.toString() || "30");
        setLateFeePercentage(
          settings.late_payment_fee_percentage?.toString() || "2"
        );
        setAutoStatement(settings.auto_statement ?? true);
        setStatementFrequency(settings.statement_frequency || "monthly");
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
      // 1. Update Profile
      const { error: profileError } = await supabase
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

      if (profileError) throw profileError;

      // 2. Update Active Credit Line (if exists) - Sync with Profile
      const { error: lineError } = await supabase
        .from("user_credit_lines")
        .update({
          credit_limit: parseFloat(creditLimit),
          net_terms: parseInt(creditDays),
          interest_rate: parseFloat(lateFeePercentage),
        })
        .eq("user_id", userId)
        .eq("status", "active");

      if (lineError) throw lineError;

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
  };

  const handleStatementDownload = async (startDate: Date, endDate: Date) => {
    setIsGeneratingStatement(true);
    try {
      toast({
        title: "Generating Statement",
        description: `Generating statement for ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}...`,
      });

      // Check browser support first
      const capabilities = downloadService.getDownloadCapabilities();
      
      if (!capabilities.supported) {
        throw new Error("Your browser does not support file downloads. Please try a different browser.");
      }

      // Generate the statement data and PDF
      const statementResponse = await statementService.generateStatementData({
        userId,
        startDate,
        endDate,
        includeZeroActivity: true
      });

      if (!statementResponse.success || !statementResponse.data) {
        throw new Error(statementResponse.error || "Failed to generate statement data");
      }

      // Generate filename
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      const filename = `statement_${userId}_${startDateStr}_to_${endDateStr}.pdf`;

      // Get user profile for better filename
      let userProfile;
      try {
        userProfile = await statementService.getUserProfile(userId);
      } catch (error) {
        // Continue without user profile
      }

      // Create PDF
      const pdfBlob = await statementPDFGenerator.createPDF(statementResponse.data, userProfile);

      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error("Generated PDF is empty");
      }

      // Try direct download
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
      case "active":
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
      case "active":
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
    type FallbackInvoice = {
      id: string;
      invoice_number: string;
      invoice_date: string | null;
      original_amount: number | null;
      total_amount: number | null;
      status: string;
      created_at: string;
    };

    type FallbackPayment = {
      id: string;
      amount: number | null;
      payment_method: string | null;
      transaction_id: string | null;
      created_at: string;
    };

    const buildFallbackHistory = async (): Promise<Transaction[]> => {
      const [invoiceRes, paymentRes, penaltyRes] = await Promise.all([
        supabase
          .from("credit_invoices")
          .select("id, invoice_number, invoice_date, original_amount, total_amount, status, created_at")
          .eq("user_id", userId),
        supabase
          .from("credit_payments")
          .select("id, amount, payment_method, transaction_id, created_at")
          .eq("user_id", userId),
        supabase
          .from("simple_penalty_logs")
          .select("id, run_date, run_month, details, created_at")
          .order("run_date", { ascending: false }),
      ]);

      if (invoiceRes.error) {
        console.error("Credit history fallback invoice error:", invoiceRes.error);
      }
      if (paymentRes.error) {
        console.error("Credit history fallback payment error:", paymentRes.error);
      }
      if (penaltyRes.error) {
        console.error("Credit history penalty error:", penaltyRes.error);
      }

      const invoices = (invoiceRes.data || []) as FallbackInvoice[];
      const payments = (paymentRes.data || []) as FallbackPayment[];
      const penaltyLogs = penaltyRes.data || [];

      const invoiceTransactions: Transaction[] = invoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        transaction_date: invoice.invoice_date || invoice.created_at,
        created_at: invoice.created_at,
        transaction_type: "debit",
        debit_amount: Number(invoice.original_amount ?? invoice.total_amount ?? 0),
        credit_amount: 0,
        balance: 0,
        description: `Credit invoice ${invoice.invoice_number} (${invoice.status})`,
      }));

      const paymentTransactions: Transaction[] = payments.map((payment) => ({
        id: `payment-${payment.id}`,
        transaction_date: payment.created_at,
        created_at: payment.created_at,
        transaction_type: "credit",
        debit_amount: 0,
        credit_amount: Number(payment.amount || 0),
        balance: 0,
        description: `Credit payment (${payment.payment_method || "payment"})`,
        transectionId: payment.transaction_id || undefined,
      }));

      // Extract penalty entries for this specific user from penalty logs
      const penaltyTransactions: Transaction[] = [];
      for (const log of penaltyLogs) {
        if (log.details && Array.isArray(log.details)) {
          const userPenalty = log.details.find((detail: any) => detail.user_id === userId);
          if (userPenalty && userPenalty.new_penalty > 0) {
            const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
            const monthName = monthNames[log.run_month] || log.run_month;
            
            penaltyTransactions.push({
              id: `penalty-${log.id}-${userId}`,
              transaction_date: log.run_date,
              created_at: log.created_at,
              transaction_type: "debit",
              debit_amount: Number(userPenalty.new_penalty),
              credit_amount: 0,
              balance: 0,
              description: `Late payment penalty - ${monthName} (${userPenalty.penalty_rate || 3}% fee)`,
              admin_pay_notes: `Applied on outstanding balance of $${Number(userPenalty.credit_used || 0).toFixed(2)}`,
            });
          }
        }
      }

      const combined = [...invoiceTransactions, ...paymentTransactions, ...penaltyTransactions];
      if (combined.length === 0) return [];

      // Compute a best-effort running balance so history remains readable even if
      // account_transactions rows are missing for older credit flows.
      const asc = [...combined].sort((a, b) => {
        const dA = new Date(a.transaction_date || a.created_at || 0).getTime();
        const dB = new Date(b.transaction_date || b.created_at || 0).getTime();
        return dA - dB;
      });

      const creditLimit = Number(creditSettings?.credit_limit || 0);
      let runningUsed = 0;
      for (const tx of asc) {
        runningUsed += Number(tx.debit_amount || 0) - Number(tx.credit_amount || 0);
        tx.balance = Math.max(0, creditLimit - runningUsed);
      }

      return asc.sort((a, b) => {
        const dA = new Date(a.transaction_date || a.created_at || 0).getTime();
        const dB = new Date(b.transaction_date || b.created_at || 0).getTime();
        return dB - dA;
      });
    };

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("account_transactions")
          .select("*")
          .eq("customer_id", userId)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Credit history account_transactions error:", error);
          const fallback = await buildFallbackHistory();
          setTransactions(fallback);
          return;
        }

        // Always fetch penalty logs to include in history
        const { data: penaltyData } = await supabase
          .from("simple_penalty_logs")
          .select("id, run_date, run_month, details, created_at")
          .order("run_date", { ascending: false });

        const penaltyTransactions: Transaction[] = [];
        if (penaltyData) {
          for (const log of penaltyData) {
            if (log.details && Array.isArray(log.details)) {
              const userPenalty = log.details.find((detail: any) => detail.user_id === userId);
              if (userPenalty && userPenalty.new_penalty > 0) {
                const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                                   'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = monthNames[log.run_month] || log.run_month;
                
                penaltyTransactions.push({
                  id: `penalty-${log.id}-${userId}`,
                  transaction_date: log.run_date,
                  created_at: log.created_at,
                  transaction_type: "debit",
                  debit_amount: Number(userPenalty.new_penalty),
                  credit_amount: 0,
                  balance: 0,
                  description: `Late payment penalty - ${monthName} (${userPenalty.penalty_rate || 3}% fee)`,
                  admin_pay_notes: `Applied on outstanding balance of $${Number(userPenalty.credit_used || 0).toFixed(2)}`,
                });
              }
            }
          }
        }

        if (data && data.length > 0) {
          // Combine account transactions with penalty transactions
          const allTransactions = [...data, ...penaltyTransactions];
          
          // Ensure descending order (newest first)
          const sortedData = allTransactions.sort((a, b) => {
            const dateA = new Date(a.transaction_date).getTime();
            const dateB = new Date(b.transaction_date).getTime();
            return dateB - dateA;
          });
          setTransactions(sortedData as Transaction[]);
          return;
        }

        // If transactional ledger rows are empty, still show invoice/payment history with penalties
        const fallback = await buildFallbackHistory();
        setTransactions(fallback);
      } catch (err) {
        console.error("Credit history fetch failed:", err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [userId, creditSettings?.credit_limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", isCompact && "space-y-3")}>
      {/* Pending Offer Alert */}
      {readOnly && hasPendingTerms && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm animate-pulse">
          <CardContent className={cn("flex items-center gap-3", isCompact ? "p-3" : "p-4")}>
            <div className={cn("bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0", isCompact ? "w-8 h-8" : "w-10 h-10")}>
              <CheckCircle className={cn("text-blue-600", isCompact ? "w-4 h-4" : "w-6 h-6")} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={cn("text-blue-900 font-semibold", isCompact ? "text-sm" : "text-base")}>New Credit Offer Approved!</h3>
              <p className={cn("text-blue-700", isCompact ? "text-xs" : "text-sm")}>
                Congratulations! Your credit increase request has been approved. 
                Please check the "Pending Credit Terms" banner at the top of the page to review and sign your new agreement.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Overview */}
      {creditSettings && (
        <Card>
          <CardHeader className={cn(isCompact && "pb-3")}>
            <div className={cn("flex items-center justify-between", isCompact && "flex-col gap-3 items-start")}>
              <CardTitle className={cn("flex items-center gap-2", isCompact ? "text-base" : "text-lg")}>
                <DollarSign className={cn(isCompact ? "w-4 h-4" : "w-5 h-5")} />
                Credit Account
              </CardTitle>
              <div className={cn("flex items-center gap-2", isCompact && "w-full justify-between")}>
                <Badge
                  className={cn(getCreditStatusColor(creditSettings.credit_status), isCompact ? "text-xs px-2 py-1" : "")}
                >
                  {getCreditStatusIcon(creditSettings.credit_status)}
                  <span className="ml-1 capitalize">
                    {creditSettings.credit_status}
                  </span>
                </Badge>
                {!readOnly && (
                  <Dialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size={isCompact ? "sm" : "default"} className={cn(isCompact && "text-xs h-8")}>
                        <Edit className={cn("mr-1", isCompact ? "w-3 h-3" : "w-4 h-4")} />
                        {isCompact ? "Edit" : "Edit Settings"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={cn(isCompact ? "w-[95vw] max-w-sm rounded-lg" : "sm:max-w-[600px]")}>
                      <DialogHeader>
                        <DialogTitle className={cn(isCompact ? "text-base" : "text-lg")}>Edit Credit Settings</DialogTitle>
                      </DialogHeader>
                      <div className={cn("space-y-3 mt-3", !isCompact && "space-y-4 mt-4")}>
                        <div>
                          <Label className={cn(isCompact && "text-sm")}>Credit Limit (USD)</Label>
                          <Input
                            type="number"
                            value={creditLimit}
                            onChange={(e) => setCreditLimit(e.target.value)}
                            placeholder="0.00"
                            className={cn(isCompact && "h-9 text-sm")}
                          />
                        </div>
                        <div className={cn("grid gap-3", isCompact ? "grid-cols-1" : "grid-cols-2 gap-4")}>
                          <div>
                            <Label className={cn(isCompact && "text-sm")}>Payment Terms</Label>
                            <Select
                              value={paymentTerms}
                              onValueChange={setPaymentTerms}
                            >
                              <SelectTrigger className={cn(isCompact && "h-9 text-sm")}>
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
                            <Label className={cn(isCompact && "text-sm")}>Credit Days</Label>
                            <Input
                              type="number"
                              value={creditDays}
                              onChange={(e) => setCreditDays(e.target.value)}
                              placeholder="30"
                              className={cn(isCompact && "h-9 text-sm")}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className={cn(isCompact && "text-sm")}>Late Payment Fee (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={lateFeePercentage}
                            onChange={(e) => setLateFeePercentage(e.target.value)}
                            placeholder="2.0"
                            className={cn(isCompact && "h-9 text-sm")}
                          />
                          <p className={cn("text-muted-foreground mt-1", isCompact ? "text-xs" : "text-xs")}>
                            Percentage charged on overdue balances
                          </p>
                        </div>
                        <div>
                          <Label className={cn(isCompact && "text-sm")}>Statement Frequency</Label>
                          <Select
                            value={statementFrequency}
                            onValueChange={setStatementFrequency}
                          >
                            <SelectTrigger className={cn(isCompact && "h-9 text-sm")}>
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

                        <div className={cn("flex gap-2 pt-3", isCompact ? "justify-end" : "justify-end pt-4")}>
                          <Button
                            variant="outline"
                            size={isCompact ? "sm" : "default"}
                            onClick={() => setIsEditDialogOpen(false)}
                            className={cn(isCompact && "text-xs h-8")}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleSaveCreditSettings}
                            size={isCompact ? "sm" : "default"}
                            className={cn(isCompact && "text-xs h-8")}
                          >
                            Save Settings
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className={cn(isCompact && "pt-0")}>
            {/* Credit amounts - Stack on mobile, grid on tablet+ */}
            <div className={cn("gap-4 mb-4", 
              isMobile ? "space-y-4" : 
              isTablet ? "grid grid-cols-2 gap-3" : 
              "grid grid-cols-4 gap-6 mb-6"
            )}>
              <div className={cn(isCompact && "text-center p-3 bg-gray-50 rounded-lg")}>
                <p className={cn("text-muted-foreground mb-1", isCompact ? "text-xs" : "text-sm")}>
                  Credit Limit
                </p>
                <p className={cn("font-bold", isCompact ? "text-lg" : "text-2xl")}>
                  {formatCurrency(creditSettings.credit_limit)}
                </p>
              </div>
              <div className={cn(isCompact && "text-center p-3 bg-green-50 rounded-lg")}>
                <p className={cn("text-muted-foreground mb-1", isCompact ? "text-xs" : "text-sm")}>
                  Available Credit
                </p>
                <p className={cn("font-bold text-green-600", isCompact ? "text-lg" : "text-2xl")}>
                  {formatCurrency(
                    creditSettings.credit_limit - creditSettings.credit_used
                  )}
                </p>
              </div>
              <div className={cn(isCompact && "text-center p-3 bg-orange-50 rounded-lg")}>
                <p className={cn("text-muted-foreground mb-1", isCompact ? "text-xs" : "text-sm")}>
                  Credit Used
                </p>
                <p className={cn("font-bold text-orange-600", isCompact ? "text-lg" : "text-2xl")}>
                  {formatCurrency(creditSettings.credit_used)}
                </p>
              </div>
              <div className={cn(isCompact && "text-center p-3 bg-red-50 rounded-lg")}>
                <p className={cn("text-muted-foreground mb-1", isCompact ? "text-xs" : "text-sm")}>
                  Late Penalties
                </p>
                <p className={cn("font-bold text-red-600", isCompact ? "text-lg" : "text-2xl")}>
                  {formatCurrency(creditSettings.credit_penalty || 0)}
                </p>
                {creditSettings.credit_penalty > 0 && (
                  <p className={cn("text-red-500 mt-1", isCompact ? "text-xs" : "text-xs")}>
                    ⚠️ Overdue
                  </p>
                )}
              </div>
            </div>

            {/* Total Outstanding (if penalties exist) */}
            {creditSettings.credit_penalty > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-red-700 font-semibold">Total Outstanding</p>
                    <p className="text-xs text-red-600">Credit Used + Penalties</p>
                  </div>
                  <p className="text-2xl font-bold text-red-700">
                    {formatCurrency(creditSettings.credit_used + (creditSettings.credit_penalty || 0))}
                  </p>
                </div>
                {/* Pay Button for total outstanding */}
                <div className="mt-3">
                  <PayCreditModal
                    creditUsed={creditSettings.credit_used + (creditSettings.credit_penalty || 0)}
                    onPaymentSuccess={loadCreditSettings} 
                    userId={userId}
                  />
                </div>
              </div>
            )}

            {/* Pay Button - Only show if no penalties (otherwise shown above) */}
            {(!creditSettings.credit_penalty || creditSettings.credit_penalty === 0) && creditSettings.credit_used > 0 && (
              <div className={cn("mb-4", isCompact && "w-full")}>
                <PayCreditModal
                  creditUsed={creditSettings.credit_used}
                  onPaymentSuccess={loadCreditSettings} 
                  userId={userId}
                />
              </div>
            )}

            {/* Credit Utilization Bar */}
            <div className={cn("mb-4", !isCompact && "mb-6")}>
              <div className={cn("flex justify-between mb-2", isCompact ? "text-xs" : "text-sm")}>
                <span className="text-muted-foreground">
                  Credit Utilization
                </span>
                <span className="font-medium">
                  {creditUtilization.toFixed(1)}%
                </span>
              </div>
              <div className={cn("bg-gray-200 rounded-full overflow-hidden", isCompact ? "h-2" : "h-3")}>
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

            {/* Credit Terms - Stack on mobile, grid on tablet+ */}
            <div className={cn("p-3 bg-gray-50 rounded-lg", 
              isMobile ? "space-y-3" : 
              isTablet ? "grid grid-cols-2 gap-3 p-4" : 
              "grid grid-cols-4 gap-4 p-4"
            )}>
              <div>
                <p className={cn("text-muted-foreground mb-1", isCompact ? "text-xs" : "text-xs")}>
                  Payment Terms
                </p>
                <p className={cn("font-semibold", isCompact ? "text-sm" : "text-base")}>{creditSettings.payment_terms}</p>
              </div>
              <div>
                <p className={cn("text-muted-foreground mb-1", isCompact ? "text-xs" : "text-xs")}>
                  Credit Days
                </p>
                <p className={cn("font-semibold", isCompact ? "text-sm" : "text-base")}>
                  {creditSettings.credit_days} days
                </p>
              </div>
              <div>
                <p className={cn("text-muted-foreground mb-1", isCompact ? "text-xs" : "text-xs")}>Late Fee</p>
                <p className={cn("font-semibold", isCompact ? "text-sm" : "text-base")}>
                  {creditSettings.late_payment_fee_percentage}%
                </p>
              </div>
              <div>
                <p className={cn("text-muted-foreground mb-1", isCompact ? "text-xs" : "text-xs")}>Currency</p>
                <p className={cn("font-semibold", isCompact ? "text-sm" : "text-base")}>USD</p>
              </div>
            </div>

            {/* Payment Warning - Simple Month-Based */}
            {creditSettings.credit_usage_month && creditSettings.credit_used > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-yellow-900 mb-1">Payment Notice</p>
                    <p className="text-sm text-yellow-800">
                      You have an outstanding balance of <span className="font-bold">${creditSettings.credit_used.toFixed(2)}</span>
                      {creditSettings.credit_penalty > 0 && (
                        <span> plus <span className="font-bold text-red-600">${creditSettings.credit_penalty.toFixed(2)}</span> in late fees</span>
                      )}
                    </p>
                    {creditSettings.credit_penalty > 0 && (
                      <p className="text-sm text-red-600 mt-2 font-semibold">
                        ⚠️ Late payment fees are applied monthly. Pay now to avoid additional charges on the 1st of next month.
                      </p>
                    )}
                    {creditSettings.last_penalty_month && (
                      <p className="text-xs text-gray-600 mt-2">
                        Last penalty applied: {new Date(2026, creditSettings.last_penalty_month - 1).toLocaleString('default', { month: 'long' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statement Management - Only for Admin, not for Pharmacy */}
      {!readOnly && (
        <Card>
          <CardHeader className={cn(isCompact && "pb-3")}>
            <CardTitle className={cn("flex items-center gap-2", isCompact ? "text-base" : "text-lg")}>
              <FileText className={cn(isCompact ? "w-4 h-4" : "w-5 h-5")} />
              Account Statements
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(isCompact && "pt-0")}>
            <div className={cn("space-y-4", isCompact && "space-y-3")}>
              {/* Custom Date Range Statement Generation */}
              <div className={cn("border-t pt-3", !isCompact && "pt-4")}>
                <h4 className={cn("font-medium mb-3", isCompact ? "text-sm mb-2" : "mb-4")}>Generate Custom Statement</h4>
                <StatementDateRangeSelector
                  onDateRangeChange={handleDateRangeChange}
                  onDownload={handleStatementDownload}
                  isGenerating={isGeneratingStatement}
                  maxDateRange={365}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Credit Terms Section - Only for Admin, not for Pharmacy */}
      {!readOnly && <SendCreditTermsSection userId={userId} />}

      {/* Payment Methods - Only for Admin, not for Pharmacy */}
      {!readOnly && (
        <Card>
          <CardHeader className={cn(isCompact && "pb-3")}>
            <CardTitle className={cn("flex items-center gap-2", isCompact ? "text-base" : "text-lg")}>
              <CreditCard className={cn(isCompact ? "w-4 h-4" : "w-5 h-5")} />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(isCompact && "pt-0")}>
            <div className={cn("text-center py-6 text-muted-foreground", isCompact && "py-4")}>
              <CreditCard className={cn("mx-auto mb-2 opacity-50", isCompact ? "w-8 h-8 mb-1" : "w-12 h-12 mb-3")} />
              <p className={cn(isCompact ? "text-sm" : "text-base")}>No saved payment methods</p>
              <p className={cn("mt-1", isCompact ? "text-xs" : "text-sm")}>
                Payment methods can be added during checkout
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit History */}
      <Card>
        <CardHeader className={cn(isCompact && "pb-3")}>
          <CardTitle className={cn("flex items-center gap-2", isCompact ? "text-base" : "text-lg")}>
            <TrendingUp className={cn(isCompact ? "w-4 h-4" : "w-5 h-5")} />
            Credit History
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(isCompact && "pt-0")}>
          {loading ? (
            <div className={cn("text-center py-6 text-muted-foreground", isCompact && "py-4")}>
              <p className={cn(isCompact ? "text-sm" : "text-base")}>Loading credit history...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className={cn("text-center py-6 text-muted-foreground", isCompact && "py-4")}>
              <TrendingUp className={cn("mx-auto mb-2 opacity-50", isCompact ? "w-8 h-8 mb-1" : "w-12 h-12 mb-3")} />
              <p className={cn(isCompact ? "text-sm" : "text-base")}>No credit history yet</p>
              <p className={cn("mt-1", isCompact ? "text-xs" : "text-sm")}>
                View payment history and credit usage over time
              </p>
            </div>
          ) : (
            <div className={cn("space-y-2", isCompact && "space-y-1")}>
              {transactions.map((tx) => {
                const isPenalty = tx.description.includes('Late payment penalty');
                return (
                  <div
                    key={tx.id}
                    className={cn(
                      "flex justify-between items-center border rounded-md hover:bg-gray-50",
                      isCompact ? "p-2 flex-col items-start gap-2" : "p-2",
                      isPenalty && "bg-red-50 border-red-200"
                    )}
                  >
                    <div className={cn("flex flex-col", isCompact && "w-full")}>
                      <div className="flex items-center gap-2">
                        {isPenalty && (
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className={cn("font-medium", isCompact ? "text-sm" : "text-sm", isPenalty && "text-red-900")}>
                          {tx.description}
                        </span>
                      </div>
                      <span className={cn("text-muted-foreground", isCompact ? "text-xs" : "text-xs")}>
                        {new Date(tx.transaction_date).toLocaleString()}
                      </span>
                      {/* Display transactionId or admin notes */}
                      {tx.transectionId ? (
                        <span className={cn("text-blue-600", isCompact ? "text-xs" : "text-xs")}>
                          Transaction ID: {tx.transectionId}
                        </span>
                      ) : tx.admin_pay_notes ? (
                        <span className={cn(isPenalty ? "text-red-600" : "text-purple-600", isCompact ? "text-xs" : "text-xs")}>
                          {isPenalty ? '⚠️ ' : ''}
                          {tx.admin_pay_notes}
                        </span>
                      ) : null}
                    </div>
                    <div className={cn("flex flex-col text-right", isCompact && "w-full flex-row justify-between items-center")}>
                      <div className={cn(isCompact && "flex flex-col")}>
                        {tx.debit_amount > 0 && (
                          <span className={cn(isPenalty ? "text-red-700 font-bold" : "text-red-600", isCompact ? "text-sm" : "text-sm")}>
                            -{isPenalty && '⚠️ '}${tx.debit_amount.toFixed(2)}
                          </span>
                        )}
                        {tx.credit_amount > 0 && (
                          <span className={cn("text-green-600", isCompact ? "text-sm" : "text-sm")}>
                            +${tx.credit_amount.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <span className={cn("text-muted-foreground", isCompact ? "text-xs" : "text-xs")}>
                        Balance: ${tx.balance?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
