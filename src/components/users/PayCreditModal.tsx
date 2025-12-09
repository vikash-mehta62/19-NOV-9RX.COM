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
import axios from "../../../axiosconfig";

// Simple validation function
const validateRequired = (value: string) => (value.trim() === "" ? "Required" : null);

interface PayCreditModalProps {
  creditUsed: number;
  userId?: string;
  onPaymentSuccess: () => void;
}

export function PayCreditModal({ creditUsed, onPaymentSuccess, userId }: PayCreditModalProps) {
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState(creditUsed);
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

  const { toast } = useToast();

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
      console.log("User Profile:", profile);

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
    setAmount(creditUsed);
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
  };

 
  const handlePayment = async (e: any) => {
  e.preventDefault();
  setIsPaying(true);

  try {
    const errors: Record<string, string | null> = {};
    let hasErrors = false;

    if (paymentMethod === "card") {
      errors.cardNumber = validateRequired(cardNumber);
      errors.cvv = validateRequired(cvv);
      errors.expiry = validateRequired(expiry);
      errors.cardHolderName = validateRequired(cardHolderName);
      errors.address = validateRequired(address);
      errors.city = validateRequired(city);
      errors.state = validateRequired(state);
      errors.zip = validateRequired(zip);
      errors.country = validateRequired(country);
    } else if (paymentMethod === "manual") {
      errors.notes = validateRequired(notes);
    }

    for (const key in errors) if (errors[key]) hasErrors = true;

    if (hasErrors) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields correctly.",
        variant: "destructive",
      });
      setIsPaying(false);
      return;
    }

    // Fetch user profile
    const { data: profile, error: userErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (userErr || !profile) throw new Error("Failed to load user profile");

    const prevUsed = Number(profile.credit_used || 0);
    const newUsed = prevUsed - Number(amount);
    if (newUsed < 0) throw new Error("Amount exceeds customer's credit due");
    const newBalance = Number(profile.credit_limit || 0) - newUsed;

    // Update profile
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ credit_used: newUsed })
      .eq("id", userId);
    if (updateErr) throw new Error("Failed to update credit");

    // Initialize transactionId (only for card)
    let transactionId: string | null = null;

    // Card payment
    if (paymentMethod === "card") {
      const response = await axios.post("/pay", {
        paymentType: "credit_card",
        amount,
        cardNumber,
        expirationDate: expiry,
        cvv,
        cardholderName: cardHolderName,
        address,
        city,
        state,
        zip,
        country,
      });
      console.log(response, "payment response")

      if (response.status !== 200 || !response.data.success)
        throw new Error(response.data?.message || "Card payment failed");

      // Store transactionId from response
      transactionId = response.data.transactionId;
      console.log("Transaction ID:", transactionId);
    }

    // Insert transaction record
    const { error: transErr } = await supabase
      .from("account_transactions")
      .insert({
        customer_id: userId,
        transaction_type: "credit",
        reference_type: "payment",
        credit_amount: amount,
        debit_amount: 0,
        description: `Payment (${paymentMethod})`,
        balance: newBalance,
        created_by: userId,
        admin_pay_notes: paymentMethod === "manual" ? notes : "",
        transectionId: transactionId, // will be null for manual payments
      });

    if (transErr) throw new Error("Failed to record transaction");

    toast({
      title: "Payment Successful",
      description: `$${amount} payment recorded successfully.`,
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
          <p>Outstanding Credit: ${creditUsed}</p>

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
            <Button variant={paymentMethod === "card" ? "default" : "outline"} onClick={() => setPaymentMethod("card")} className="flex-1">
              Card Payment
            </Button>
            <Button variant={paymentMethod === "manual" ? "default" : "outline"} onClick={() => setPaymentMethod("manual")} className="flex-1">
              Manual Payment
            </Button>
          </div>

          {/* Card Fields */}
          {paymentMethod === "card" && (
            <div className="space-y-2">
              <Input placeholder="Cardholder Name" value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} />
              <Input placeholder="Card Number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
              <div className="flex gap-2">
                <Input
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  maxLength={5}
                />
                <Input placeholder="CVV" value={cvv} onChange={(e) => setCvv(e.target.value)} />
              </div>
              <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
              <div className="flex gap-2">
                <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                <Input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Input placeholder="Zip" value={zip} onChange={(e) => setZip(e.target.value)} />
                <Input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
          )}

          {/* Manual Payment Notes */}
          {paymentMethod === "manual" && (
            <Textarea placeholder="Enter notes for manual payment" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
