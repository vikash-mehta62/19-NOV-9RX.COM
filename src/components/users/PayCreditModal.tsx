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
import { formatCardNumber, validateCardNumber, validateExpiry } from "@/services/paymentService";

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
  const [paymentMethod, setPaymentMethod] = useState<"card" | "manual">("card");

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

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
      setPaymentMethod("card");
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

    const addr = profile.billing_address || profile.shipping_address || {};
    setAddress(addr.street1 || "");
    setCity(addr.city || "");
    setState(addr.state || "");
    setZip(addr.zip_code || "");
    setCountry(addr.countryRegion || "");
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
    setPaymentMethod("card");
    setSelectedInvoiceId("");
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setNotes("");
    setFieldErrors({});
  };

  const handleCardNumberChange = (val: string) => {
    const formatted = formatCardNumber(val);
    setCardNumber(formatted);
    if (fieldErrors.cardNumber) {
      setFieldErrors((prev) => ({ ...prev, cardNumber: "" }));
    }
  };

  const handleExpiryChange = (val: string) => {
    const numericVal = val.replace(/\D/g, "").slice(0, 4);
    if (numericVal.length > 2) {
      setExpiry(`${numericVal.slice(0, 2)}/${numericVal.slice(2)}`);
    } else {
      setExpiry(numericVal);
    }
    if (fieldErrors.expiry) {
      setFieldErrors((prev) => ({ ...prev, expiry: "" }));
    }
  };

  const handleCvvChange = (val: string) => {
    const numericVal = val.replace(/\D/g, "").slice(0, 4);
    setCvv(numericVal);
    if (fieldErrors.cvv) {
      setFieldErrors((prev) => ({ ...prev, cvv: "" }));
    }
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

        if (paymentMethod === "card") {
          if (!cardNumber.trim()) {
            errors.cardNumber = "Card number is required";
          } else if (!validateCardNumber(cardNumber)) {
            errors.cardNumber = "Invalid card number";
          }

          const rawExpiry = expiry.replace(/\//g, "");
          if (!rawExpiry.trim()) {
            errors.expiry = "Expiry date is required";
          } else if (!validateExpiry(rawExpiry)) {
            errors.expiry = "Invalid or expired date (MM/YY)";
          }

          if (!cvv.trim()) {
            errors.cvv = "CVV is required";
          } else if (!/^\d{3,4}$/.test(cvv)) {
            errors.cvv = "CVV must be 3 or 4 digits";
          }

          errors.cardHolderName = validateRequired(cardHolderName) ? "Cardholder name is required" : null;
          errors.address = validateRequired(address) ? "Address is required" : null;
          errors.city = validateRequired(city) ? "City is required" : null;
          errors.state = validateRequired(state) ? "State is required" : null;
          errors.zip = validateRequired(zip) ? "ZIP code is required" : null;
          errors.country = validateRequired(country) ? "Country is required" : null;
        } else if (paymentMethod === "manual") {
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

        let transactionId: string | null = null;

        if (paymentMethod === "card") {
          const rawExpiry = expiry.replace(/\//g, "");
          const nameParts = (cardHolderName || "Customer").split(" ");
          const firstName = nameParts[0] || "Customer";
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Customer";

          const { data: paymentResponse, error: paymentError } = await supabase.functions.invoke(
            "process-payment",
            {
              body: {
                payment: {
                  type: "card",
                  cardNumber: cardNumber.replace(/\s/g, ""),
                  expirationDate: rawExpiry,
                  cvv,
                  cardholderName: cardHolderName,
                },
                amount: amountToPay,
                invoiceNumber: `CREDIT-${Date.now()}`,
                billing: {
                  firstName,
                  lastName,
                  address,
                  city,
                  state,
                  zip,
                  country,
                },
              },
            }
          );

          if (paymentError) throw new Error(paymentError.message || "Payment processing failed");
          if (!paymentResponse?.success) throw new Error(paymentResponse?.error || "Card payment failed");

          transactionId = paymentResponse.transactionId;
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
          p_payment_method: paymentMethod === "card" ? "card" : "manual",
          p_transaction_id: transactionId || `MANUAL-${Date.now()}`,
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
    >View all your past orders and track deliveries
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
            <Button type="button" variant={paymentMethod === "card" ? "default" : "outline"} onClick={() => setPaymentMethod("card")} className="flex-1">
              Card Payment
            </Button>
            {allowManual && (
              <Button type="button" variant={paymentMethod === "manual" ? "default" : "outline"} onClick={() => setPaymentMethod("manual")} className="flex-1">
                Manual Payment
              </Button>
            )}
          </div>

          {paymentMethod === "card" && (
            <div className="space-y-2">
              <div>
                <Input placeholder="Cardholder Name" value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} className={fieldErrors.cardHolderName ? "border-red-500" : ""} />
                {fieldErrors.cardHolderName && <p className="text-xs text-red-500 mt-1">{fieldErrors.cardHolderName}</p>}
              </div>
              <div>
                <Input placeholder="Card Number" value={cardNumber} onChange={(e) => handleCardNumberChange(e.target.value)} maxLength={19} className={fieldErrors.cardNumber ? "border-red-500" : ""} />
                {fieldErrors.cardNumber && <p className="text-xs text-red-500 mt-1">{fieldErrors.cardNumber}</p>}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    maxLength={5}
                    className={fieldErrors.expiry ? "border-red-500" : ""}
                  />
                  {fieldErrors.expiry && <p className="text-xs text-red-500 mt-1">{fieldErrors.expiry}</p>}
                </div>
                <div className="flex-1">
                  <Input placeholder="CVV" value={cvv} onChange={(e) => handleCvvChange(e.target.value)} maxLength={4} className={fieldErrors.cvv ? "border-red-500" : ""} />
                  {fieldErrors.cvv && <p className="text-xs text-red-500 mt-1">{fieldErrors.cvv}</p>}
                </div>
              </div>
              <div>
                <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className={fieldErrors.address ? "border-red-500" : ""} />
                {fieldErrors.address && <p className="text-xs text-red-500 mt-1">{fieldErrors.address}</p>}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className={fieldErrors.city ? "border-red-500" : ""} />
                  {fieldErrors.city && <p className="text-xs text-red-500 mt-1">{fieldErrors.city}</p>}
                </div>
                <div className="flex-1">
                  <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} className={fieldErrors.state ? "border-red-500" : ""} />
                  {fieldErrors.state && <p className="text-xs text-red-500 mt-1">{fieldErrors.state}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input placeholder="Zip" value={zip} onChange={(e) => setZip(e.target.value)} className={fieldErrors.zip ? "border-red-500" : ""} />
                  {fieldErrors.zip && <p className="text-xs text-red-500 mt-1">{fieldErrors.zip}</p>}
                </div>
                <div className="flex-1">
                  <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} className={fieldErrors.country ? "border-red-500" : ""} />
                  {fieldErrors.country && <p className="text-xs text-red-500 mt-1">{fieldErrors.country}</p>}
                </div>
              </div>
            </div>
          )}

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
              {isPaying ? "Processing..." : "Pay"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
