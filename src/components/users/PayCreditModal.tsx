import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { processPaymentIPOSPay } from "@/services/paymentService";

const validateRequired = (value: string) => (value.trim() === "" ? "Required" : null);
const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Something went wrong";
};

interface CreditInvoiceOption {
  id: string;
  invoice_number: string;
  balance_due: number;
  original_amount?: number;
  penalty_amount?: number;
  days_overdue?: number;
  due_date: string | null;
  invoice_date: string | null;
  status?: string;
}

interface CreditInvoiceRow {
  id: string;
  invoice_number: string;
  balance_due: number | string | null;
  original_amount?: number | string | null;
  penalty_amount?: number | string | null;
  days_overdue?: number | null;
  due_date: string | null;
  invoice_date: string | null;
  status?: string;
}

interface AllocationRpcResult {
  success?: boolean;
  status?: string;
  message?: string;
  error?: string;
  applied_amount?: number;
  allocation_count?: number;
  remaining_outstanding?: number;
}

interface PayCreditModalProps {
  creditUsed: number;
  userId?: string;
  onPaymentSuccess: () => void;
  allowManual?: boolean;
}

export function PayCreditModal({ creditUsed, onPaymentSuccess, userId, allowManual = true }: PayCreditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState(Number(creditUsed.toFixed(2)));
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"ipospay" | "manual">("ipospay");

  const [cardHolderName, setCardHolderName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [openInvoices, setOpenInvoices] = useState<CreditInvoiceOption[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [outstandingCredit, setOutstandingCredit] = useState(Number(creditUsed.toFixed(2)));

  const { toast } = useToast();

  const selectedInvoice = useMemo(
    () => openInvoices.find((invoice) => invoice.id === selectedInvoiceId) || null,
    [openInvoices, selectedInvoiceId]
  );

  useEffect(() => {
    if (paymentMethod === "manual" && !allowManual) {
      setPaymentMethod("ipospay");
    }
  }, [allowManual, paymentMethod]);

  useEffect(() => {
    if (paymentType === "full") {
      setAmount(Number(outstandingCredit.toFixed(2)));
    } else if (paymentType === "partial") {
      // Reset to 0 for partial payment - user will enter amount
      setAmount(0);
    }
  }, [outstandingCredit, paymentType]);

  useEffect(() => {
    if (paymentType !== "partial") {
      return;
    }

    // No auto-selection needed - user will just enter amount
  }, [paymentType]);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !profile) return;

    setCardHolderName(profile.display_name || "");
    setCustomerEmail(profile.email || "");
    setCustomerPhone(profile.phone || "");
  }, [userId]);

  const fetchOutstandingInvoices = useCallback(async () => {
    if (!userId) {
      console.log("No userId provided");
      return;
    }

    try {
      console.log("=== Fetching Outstanding Invoices ===");
      console.log("User ID:", userId);
      console.log("Credit Used (prop):", creditUsed);

      // Fetch profile to get credit_penalty
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("credit_penalty, credit_used, email")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("❌ Error fetching profile penalty:", profileError);
      }

      const profilePenalty = Number(profileData?.credit_penalty || 0);
      console.log("✅ Profile data:", {
        email: profileData?.email,
        credit_used: profileData?.credit_used,
        credit_penalty: profileData?.credit_penalty,
        profilePenalty: profilePenalty
      });

      const { data, error } = await supabase
        .from("credit_invoices")
        .select("id, invoice_number, balance_due, original_amount, penalty_amount, due_date, invoice_date, status, days_overdue")
        .eq("user_id", userId)
        .in("status", ["pending", "partial", "overdue"])
        .gt("balance_due", 0)
        .order("due_date", { ascending: true })
        .order("invoice_date", { ascending: true });

      if (error) {
        console.error("❌ Error fetching invoices:", error);
        throw error;
      }

      const invoices: CreditInvoiceOption[] = ((data || []) as CreditInvoiceRow[]).map((invoice) => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        balance_due: Number(invoice.balance_due || 0),
        original_amount: Number(invoice.original_amount || 0),
        penalty_amount: Number(invoice.penalty_amount || 0),
        days_overdue: invoice.days_overdue || 0,
        due_date: invoice.due_date,
        invoice_date: invoice.invoice_date,
        status: invoice.status,
      }));

      console.log("✅ Invoices fetched:", invoices.length);

      // Add profile penalty as a separate "invoice" entry if it exists
      // Add it at the BEGINNING so it's visible first
      if (profilePenalty > 0) {
        const penaltyEntry = {
          id: 'profile-penalty',
          invoice_number: 'Late Payment Penalties',
          balance_due: profilePenalty,
          original_amount: 0,
          penalty_amount: profilePenalty,
          days_overdue: 0,
          due_date: null,
          invoice_date: null,
          status: 'overdue' as const,
        };
        invoices.unshift(penaltyEntry);  // Add at beginning
        console.log("✅ Added penalty entry to invoices (at beginning):", penaltyEntry);
      } else {
        console.log("⚠️ No penalty to add (profilePenalty = 0)");
      }

      console.log("✅ Total invoices (including penalty):", invoices.length);
      console.log("📋 Invoice list:", invoices.map(inv => `${inv.invoice_number}: $${inv.balance_due.toFixed(2)}`).join(", "));

      // Use creditUsed prop which includes profile penalty, not just invoice totals
      // This ensures the modal shows the correct total including penalties from profiles table
      const totalOutstanding = Number(creditUsed.toFixed(2));

      setOpenInvoices(invoices);
      setOutstandingCredit(totalOutstanding);

      // No auto-selection needed - user will enter amount directly
    } catch (error) {
      console.error("❌ Error in fetchOutstandingInvoices:", error);
    }
  }, [userId, creditUsed]);

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
  }, [fetchProfile, userId]);

  const handleCancel = () => {
    setPaymentType("full");
    setAmount(Number(outstandingCredit.toFixed(2)));
    setPaymentMethod("ipospay");
    setSelectedInvoiceId("");
    setNotes("");
    setFieldErrors({});
  };

  const handlePayment = async (e: FormEvent) => {
      e.preventDefault();
      if (!userId) {
        toast({
          title: "Payment Failed",
          description: "User is required to process credit payment.",
          variant: "destructive",
        });
        return;
      }

      setIsPaying(true);

      try {
        const errors: Record<string, string | null> = {};
        let hasErrors = false;

        const amountToPay = Number((paymentType === "full" ? outstandingCredit : amount).toFixed(2));

        if (paymentType === "partial") {
          if (amountToPay <= 0 || amountToPay > outstandingCredit) {
            errors.amount = `Amount must be between $0.01 and $${outstandingCredit.toFixed(2)}`;
          }
        } else if (amountToPay <= 0) {
          errors.amount = "No outstanding credit to pay.";
        }

        if (paymentMethod === "manual") {
          errors.notes = validateRequired(notes) ? "Notes are required" : null;
        }

        for (const key in errors) {
          if (errors[key]) hasErrors = true;
        }

        if (hasErrors) {
          const cleanErrors: Record<string, string> = {};
          for (const key in errors) {
            if (errors[key]) cleanErrors[key] = errors[key]!;
          }
          setFieldErrors(cleanErrors);

          toast({
            title: "Validation Error",
            description: Object.values(cleanErrors)[0] || "Please fill all required fields correctly.",
            variant: "destructive",
          });
          setIsPaying(false);
          return;
        }

        if (paymentMethod === "ipospay") {
          const response = await processPaymentIPOSPay({
            amount: amountToPay,
            orderId: `credit-line-${userId}`,
            paymentMethod: "card",
            customerName: cardHolderName || "Customer",
            customerEmail,
            customerMobile: customerPhone,
            description: "Credit line payment",
            merchantName: "RX Pharmacy",
            returnUrl: `${window.location.origin}/payment/callback`,
            failureUrl: `${window.location.origin}/payment/callback`,
            cancelUrl: `${window.location.origin}/payment/cancel`,
            calculateFee: false,
            calculateTax: false,
            tipsInputPrompt: false,
            themeColor: "#2563EB",
          });

          if (!response.success || !response.paymentUrl || !response.transactionReferenceId) {
            throw new Error(response.error || "Failed to start secure payment");
          }

          localStorage.setItem("pending_payment", JSON.stringify({
            flowType: "credit_line_payment",
            transactionReferenceId: response.transactionReferenceId,
            userId,
            amount: amountToPay,
            baseAmount: amountToPay,
            paymentMode: paymentType,
            customerName: cardHolderName || "Customer",
            customerEmail,
            notes: null,
            calculateFee: false,
          }));

          window.location.href = response.paymentUrl;
          return;
        }

        const rpcClient = supabase as unknown as {
          rpc: (
            fn: string,
            params: Record<string, unknown>
          ) => Promise<{ data: AllocationRpcResult | null; error: { message?: string } | null }>;
        };

        // For partial payment, pass null to allow automatic allocation (penalty first, then invoices)
        const { data: paymentResult, error: paymentError } = await rpcClient.rpc("process_credit_payment_allocated", {
          p_user_id: userId,
          p_amount: amountToPay,
          p_payment_method: "manual",
          p_transaction_id: `MANUAL-${Date.now()}`,
          p_payment_mode: paymentType,
          p_target_invoice_id: null, // NULL = automatic allocation (penalty first)
          p_notes: paymentMethod === "manual" ? notes : null,
        });

        if (paymentError) throw paymentError;
        if (!paymentResult?.success) {
          throw new Error(paymentResult?.message || paymentResult?.error || "Payment processing failed");
        }

        const appliedAmount = Number(paymentResult.applied_amount || amountToPay);
        const allocationCount = Number(paymentResult.allocation_count || 0);
        const remainingOutstanding = Number(paymentResult.remaining_outstanding || 0);

        toast({
          title: "Payment Successful",
          description:
            allocationCount > 1
              ? `$${appliedAmount.toFixed(2)} allocated to ${allocationCount} invoices. Remaining outstanding: $${remainingOutstanding.toFixed(2)}`
              : `$${appliedAmount.toFixed(2)} payment applied successfully. Remaining outstanding: $${remainingOutstanding.toFixed(2)}`,
        });

        await fetchOutstandingInvoices();
        onPaymentSuccess();
        setIsOpen(false);
        handleCancel();
      } catch (err: unknown) {
        console.error("Payment Error:", err);
        toast({
          title: "Payment Failed",
          description: getErrorMessage(err),
          variant: "destructive",
        });
      } finally {
        setIsPaying(false);
      }
    };

  const amountMax = outstandingCredit;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={async (open) => {
        setIsOpen(open);
        if (open) {
          try {
            await fetchOutstandingInvoices();
          } catch (err) {
            console.error("Failed to fetch open credit invoices:", err);
          }
        } else {
          handleCancel();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-green-500">Pay Credit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay Credit</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 mt-2" onSubmit={handlePayment}>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 mb-2">Outstanding Credit: <span className="font-bold text-lg">${outstandingCredit.toFixed(2)}</span></p>
            {openInvoices.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-blue-700 font-semibold">Open Invoices:</p>
                {openInvoices.map((invoice) => {
                  const isPenaltyEntry = invoice.id === 'profile-penalty';
                  return (
                    <div key={invoice.id} className={`text-xs p-2 rounded border ${isPenaltyEntry ? 'bg-red-50 border-red-200' : 'bg-white border-blue-200'}`}>
                      <div className="flex justify-between">
                        <span className={`font-medium ${isPenaltyEntry ? 'text-red-900' : ''}`}>{invoice.invoice_number}</span>
                        <span className={`font-bold ${isPenaltyEntry ? 'text-red-700' : ''}`}>${invoice.balance_due.toFixed(2)}</span>
                      </div>
                      {!isPenaltyEntry && invoice.penalty_amount && invoice.penalty_amount > 0 && (
                        <div className="flex justify-between text-red-600 mt-1">
                          <span>Penalty:</span>
                          <span>+${invoice.penalty_amount.toFixed(2)}</span>
                        </div>
                      )}
                      {isPenaltyEntry && (
                        <div className="text-red-600 mt-1 text-xs">
                          <span>⚠️ Accumulated late payment fees</span>
                        </div>
                      )}
                      {!isPenaltyEntry && invoice.days_overdue && invoice.days_overdue > 0 && (
                        <span className="text-red-600">({invoice.days_overdue} days overdue)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Select value={paymentType} onValueChange={(val) => setPaymentType(val as "full" | "partial")}> 
            <SelectTrigger>
              <SelectValue placeholder="Select Payment Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Payment</SelectItem>
              <SelectItem value="partial">Partial Payment</SelectItem>
            </SelectContent>
          </Select>

          <div>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => {
                const inputValue = Number(e.target.value);
                // Prevent entering amount greater than outstanding credit
                if (inputValue <= outstandingCredit) {
                  setAmount(inputValue);
                } else {
                  setAmount(outstandingCredit);
                }
              }}
              min={0.01}
              max={amountMax}
              placeholder={paymentType === "full" ? "Auto-calculated" : "Enter amount to pay"}
              disabled={paymentType === "full"}
              className={fieldErrors.amount ? "border-red-500" : ""}
            />
            {fieldErrors.amount && <p className="text-xs text-red-500 mt-1">{fieldErrors.amount}</p>}
            {paymentType === "partial" && (
              <p className="text-xs text-gray-500 mt-1">Maximum: ${outstandingCredit.toFixed(2)}</p>
            )}
          </div>

          <div className="flex gap-4">
            <Button type="button" variant={paymentMethod === "ipospay" ? "default" : "outline"} onClick={() => setPaymentMethod("ipospay")} className="flex-1">
              Pay with Secure Payment
            </Button>
            {allowManual && (
              <Button type="button" variant={paymentMethod === "manual" ? "default" : "outline"} onClick={() => setPaymentMethod("manual")} className="flex-1">
                Manual Payment
              </Button>
            )}
          </div>

          {paymentMethod === "manual" && (
            <div>
              <Textarea placeholder="Enter notes for manual payment" value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldErrors.notes ? "border-red-500" : ""} />
              {fieldErrors.notes && <p className="text-xs text-red-500 mt-1">{fieldErrors.notes}</p>}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPaying || outstandingCredit <= 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPaying ? "Processing..." : paymentMethod === "ipospay" ? "Pay with Secure Payment" : "Record Manual Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
