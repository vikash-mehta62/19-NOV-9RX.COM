import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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



interface PayCreditModalProps {
  creditUsed: number;
  userId?: String;
  onPaymentSuccess: () => void;
}

export function PayCreditModal({
  creditUsed,
  onPaymentSuccess,
  userId
}: PayCreditModalProps) {
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState(creditUsed);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "manual">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

const handlePayment = async () => {
  setIsPaying(true);
  try {
    // 1️⃣ Fetch credit_limit + credit_used
    const { data: profile, error: userErr } = await supabase
      .from("profiles")
      .select("credit_used, credit_limit")
      .eq("id", userId)
      .single();

    if (userErr || !profile) throw new Error("Failed to load credit info");

    const prevUsed = Number(profile.credit_used);
    const newUsed = prevUsed - Number(amount);

    if (newUsed < 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount exceeds customer's credit due.",
        variant: "destructive",
      });
      setIsPaying(false);
      return;
    }

    const newBalance = Number(profile.credit_limit) - newUsed;

    // 2️⃣ Update credit_used only
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ credit_used: newUsed })
      .eq("id", userId);

    if (updateErr) throw new Error("Failed to update credit");

    // 3️⃣ Insert into account_transactions
    const { error: transErr } = await supabase
      .from("account_transactions")
      .insert({
        customer_id: userId,
        transaction_type: "credit",
        reference_type: "payment",
        credit_amount: amount,
        debit_amount: 0,
        description: `Customer Payment (${paymentMethod})`,
        balance: newBalance, // ✅ FIXED
        created_by: userId,
        admin_pay_notes: paymentMethod === "manual" ? notes : "",
      });

    if (transErr) throw new Error("Failed to record transaction");

    toast({
      title: "Payment Successful",
      description: `$${amount} payment recorded successfully.`,
    });

    onPaymentSuccess();
  } catch (err: any) {
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
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Pay Credit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p>Outstanding Credit: ${creditUsed}</p>

          {/* Payment Type Dropdown */}
          <div>
            <Select
              value={paymentType}
              onValueChange={(val) => setPaymentType(val as "full" | "partial")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Payment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Payment</SelectItem>
                <SelectItem value="partial">Partial Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input - only editable if Partial Payment */}
          <div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1}
              max={creditUsed}
              placeholder="Enter amount to pay"
              disabled={paymentType === "full"}
            />
          </div>

          {/* Payment Method */}
          <div className="flex gap-4">
            <Button
              variant={paymentMethod === "card" ? "default" : "outline"}
              onClick={() => setPaymentMethod("card")}
              className="flex-1"
            >
              Card Payment
            </Button>
            <Button
              variant={paymentMethod === "manual" ? "default" : "outline"}
              onClick={() => setPaymentMethod("manual")}
              className="flex-1"
            >
              Manual Payment
            </Button>
          </div>

          {/* Card Fields */}
          {paymentMethod === "card" && (
            <div className="space-y-2">
              <Input
                placeholder="Card Number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
                <Input
                  placeholder="CVV"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Manual Payment Notes */}
          {paymentMethod === "manual" && (
            <Textarea
              placeholder="Enter notes for manual payment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAmount(creditUsed)}>
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isPaying}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isPaying ? "Processing..." : "Pay"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
