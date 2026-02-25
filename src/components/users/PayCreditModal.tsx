import { useEffect, useState } from "react";
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

// Simple validation function
const validateRequired = (value: string) => (value.trim() === "" ? "Required" : null);

interface PayCreditModalProps {
  creditUsed: number;
  userId?: string;
  onPaymentSuccess: () => void;
  allowManual?: boolean;
}

export function PayCreditModal({ creditUsed, onPaymentSuccess, userId, allowManual = true }: PayCreditModalProps) {
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState(Number(creditUsed.toFixed(2)));
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "manual">("card");

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");

  // Address fields
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");

  // Manual payment notes
  const [notes, setNotes] = useState("");

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();

  // Update amount when creditUsed prop changes
  useEffect(() => {
    if (paymentType === "full") {
      setAmount(Number(creditUsed.toFixed(2)));
    }
  }, [creditUsed, paymentType]);

  // -------------------------------
  // Fetch user profile and auto-fill
  // -------------------------------
  useEffect(() => {
    const fetchProfile = async () => {
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
    };

    fetchProfile();
  }, [userId]);

  // -------------------------------
  // Handle Cancel - resets fields and closes modal
  // -------------------------------
  const handleCancel = () => {
    setAmount(Number(creditUsed.toFixed(2)));
    setPaymentMethod("card");
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setCardHolderName("");
    setAddress("");
    setCity("");
    setState("");
    setZip("");
    setCountry("");
    setNotes("");
    setFieldErrors({});
  };

  // -------------------------------
  // Handle Card Number input with formatting
  // -------------------------------
  const handleCardNumberChange = (val: string) => {
    const formatted = formatCardNumber(val);
    setCardNumber(formatted);
    if (fieldErrors.cardNumber) {
      setFieldErrors((prev) => ({ ...prev, cardNumber: "" }));
    }
  };

  // -------------------------------
  // Handle Expiry input MM/YY
  // -------------------------------
  const handleExpiryChange = (val: string) => {
    const numericVal = val.replace(/\D/g, "").slice(0, 4); // max 4 digits
    if (numericVal.length > 2) {
      setExpiry(`${numericVal.slice(0, 2)}/${numericVal.slice(2)}`);
    } else {
      setExpiry(numericVal);
    }
    if (fieldErrors.expiry) {
      setFieldErrors((prev) => ({ ...prev, expiry: "" }));
    }
  };

  // -------------------------------
  // Handle CVV input (digits only, 3-4 chars)
  // -------------------------------
  const handleCvvChange = (val: string) => {
    const numericVal = val.replace(/\D/g, "").slice(0, 4);
    setCvv(numericVal);
    if (fieldErrors.cvv) {
      setFieldErrors((prev) => ({ ...prev, cvv: "" }));
    }
  };

 
  const handlePayment = async (e: any) => {
    e.preventDefault();
    setIsPaying(true);

    try {
      const errors: Record<string, string | null> = {};
      let hasErrors = false;

      if (paymentMethod === "card") {
        // Card number: must be present, 13-19 digits, and pass Luhn check
        if (!cardNumber.trim()) {
          errors.cardNumber = "Card number is required";
        } else if (!validateCardNumber(cardNumber)) {
          errors.cardNumber = "Invalid card number";
        }

        // Expiry: must be valid MM/YY format and not expired
        const rawExpiry = expiry.replace(/\//g, "");
        if (!rawExpiry.trim()) {
          errors.expiry = "Expiry date is required";
        } else if (!validateExpiry(rawExpiry)) {
          errors.expiry = "Invalid or expired date (MM/YY)";
        }

        // CVV: 3 or 4 digits
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

      for (const key in errors) if (errors[key]) hasErrors = true;

      if (hasErrors) {
        // Store field-level errors for inline display
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

      // Initialize transactionId (only for card)
      let transactionId: string | null = null;

      // Card payment via Supabase Edge Function (same as Create Order)
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
              amount: Number(amount),
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

        // Store transactionId from response
        transactionId = paymentResponse.transactionId;
      }

      // Get oldest unpaid invoice to apply payment
      const { data: oldestInvoice, error: invoiceError } = await supabase
        .from("credit_invoices")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["pending", "partial", "overdue"])
        .order("invoice_date", { ascending: true })
        .limit(1)
        .single();

      if (invoiceError || !oldestInvoice) {
        throw new Error("No unpaid invoices found. Please contact support.");
      }

      // Process payment through credit invoice system
      const { data: paymentResult, error: paymentError } = await supabase.rpc("process_credit_payment", {
        p_invoice_id: oldestInvoice.id,
        p_amount: Number(amount),
        p_payment_method: paymentMethod === "card" ? "card" : "manual",
        p_transaction_id: transactionId || `MANUAL-${Date.now()}`,
      });

      if (paymentError) throw paymentError;

      if (!paymentResult?.success) {
        throw new Error(paymentResult?.error || "Payment processing failed");
      }

      // Also update old credit_used field for backward compatibility
      const { data: profile } = await supabase
        .from("profiles")
        .select("credit_used, credit_limit")
        .eq("id", userId)
        .single();

      if (profile) {
        const prevUsed = Number(profile.credit_used || 0);
        const newUsed = Math.max(0, prevUsed - Number(amount));
        const newBalance = Number(profile.credit_limit || 0) - newUsed;

        await supabase
          .from("profiles")
          .update({ credit_used: newUsed })
          .eq("id", userId);

        // Insert transaction record for backward compatibility
        await supabase
          .from("account_transactions")
          .insert({
            customer_id: userId,
            transaction_date: new Date().toISOString(),
            transaction_type: "credit",
            reference_type: "payment",
            credit_amount: amount,
            debit_amount: 0,
            description: `Payment (${paymentMethod}) - Invoice: ${oldestInvoice.invoice_number}`,
            balance: newBalance,
            created_by: userId,
            admin_pay_notes: paymentMethod === "manual" ? notes : "",
            transectionId: transactionId,
          });
      }

      toast({
        title: "Payment Successful",
        description: `$${amount} applied to invoice ${oldestInvoice.invoice_number}. New balance: $${paymentResult.new_balance.toFixed(2)}`,
      });

      onPaymentSuccess();
    } catch (err: any) {
      console.error("Payment Error:", err);
      toast({
        title: "Payment Failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };


  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-green-500">Pay Credit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Pay Credit</DialogTitle>
        </DialogHeader>
        <form className="space-y-4 mt-2" onSubmit={handlePayment}>
          <p>Outstanding Credit: ${creditUsed.toFixed(2)}</p>

          {/* Payment Type */}
          <Select value={paymentType} onValueChange={(val) => setPaymentType(val as "full" | "partial")}>
            <SelectTrigger>
              <SelectValue placeholder="Select Payment Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Payment</SelectItem>
              <SelectItem value="partial">Partial Payment</SelectItem>
            </SelectContent>
          </Select>

          {/* Amount */}
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min={1}
            max={creditUsed}
            placeholder="Enter amount to pay"
            disabled={paymentType === "full"}
          />

          {/* Payment Method */}
          <div className="flex gap-4">
            <Button type="button" variant={paymentMethod === "card" ? "default" : "outline"} onClick={() => setPaymentMethod("card")} className="flex-1">
              Card Payment
            </Button>
            <Button type="button" variant={paymentMethod === "manual" ? "default" : "outline"} onClick={() => setPaymentMethod("manual")} className="flex-1">
              Manual Payment
            </Button>
          </div>

          {/* Card Fields */}
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

          {/* Manual Payment Notes */}
          {paymentMethod === "manual" && (
            <div>
              <Textarea placeholder="Enter notes for manual payment" value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldErrors.notes ? "border-red-500" : ""} />
              {fieldErrors.notes && <p className="text-xs text-red-500 mt-1">{fieldErrors.notes}</p>}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPaying} className="bg-green-600 hover:bg-green-700 text-white">
              {isPaying ? "Processing..." : "Pay"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
