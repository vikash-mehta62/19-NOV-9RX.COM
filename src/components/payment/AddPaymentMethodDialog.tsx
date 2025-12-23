import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CreditCard,
  Landmark,
  User,
  MapPin,
  Building,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import {
  savePaymentMethod,
  formatCardNumber,
  validateCardNumber,
  validateExpiry,
  validateRoutingNumber,
  detectCardType,
  CardPaymentData,
  ACHPaymentData,
  BillingAddress,
} from "@/services/paymentService";

interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function AddPaymentMethodDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddPaymentMethodDialogProps) {
  const userProfile = useSelector(selectUserProfile);
  const [paymentType, setPaymentType] = useState<"card" | "ach">("card");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");

  // ACH fields
  const [accountType, setAccountType] = useState<"checking" | "savings" | "businessChecking">("checking");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [nameOnAccount, setNameOnAccount] = useState("");
  const [bankName, setBankName] = useState("");

  // Billing address
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  // Options
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [nickname, setNickname] = useState("");

  const resetForm = () => {
    setCardNumber("");
    setExpiryDate("");
    setCvv("");
    setCardholderName("");
    setAccountType("checking");
    setRoutingNumber("");
    setAccountNumber("");
    setConfirmAccountNumber("");
    setNameOnAccount("");
    setBankName("");
    setFirstName("");
    setLastName("");
    setAddress("");
    setCity("");
    setState("");
    setZip("");
    setSetAsDefault(false);
    setNickname("");
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (paymentType === "card") {
      if (!validateCardNumber(cardNumber)) {
        newErrors.cardNumber = "Invalid card number";
      }
      if (!validateExpiry(expiryDate)) {
        newErrors.expiryDate = "Invalid expiry date (MMYY)";
      }
      if (!cvv || cvv.length < 3) {
        newErrors.cvv = "Invalid CVV";
      }
      if (!cardholderName.trim()) {
        newErrors.cardholderName = "Cardholder name required";
      }
    } else {
      if (!validateRoutingNumber(routingNumber)) {
        newErrors.routingNumber = "Invalid routing number";
      }
      if (!accountNumber || accountNumber.length < 4) {
        newErrors.accountNumber = "Invalid account number";
      }
      if (accountNumber !== confirmAccountNumber) {
        newErrors.confirmAccountNumber = "Account numbers don't match";
      }
      if (!nameOnAccount.trim()) {
        newErrors.nameOnAccount = "Name on account required";
      }
    }

    // Billing address validation
    if (!firstName.trim()) newErrors.firstName = "First name required";
    if (!lastName.trim()) newErrors.lastName = "Last name required";
    if (!address.trim()) newErrors.address = "Address required";
    if (!city.trim()) newErrors.city = "City required";
    if (!state) newErrors.state = "State required";
    if (!zip || !/^\d{5}(-\d{4})?$/.test(zip)) newErrors.zip = "Invalid ZIP code";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!userProfile?.id) {
      toast.error("Please log in to save payment methods");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the errors before saving");
      return;
    }

    setSaving(true);

    const billingAddress: BillingAddress = {
      firstName,
      lastName,
      address,
      city,
      state,
      zip,
      country: "USA",
    };

    let paymentData: CardPaymentData | ACHPaymentData;

    if (paymentType === "card") {
      paymentData = {
        cardNumber: cardNumber.replace(/\s/g, ""),
        expirationDate: expiryDate,
        cvv,
        cardholderName,
      };
    } else {
      paymentData = {
        accountType,
        routingNumber,
        accountNumber,
        nameOnAccount,
        bankName,
      };
    }

    const result = await savePaymentMethod(
      userProfile.id,
      paymentType,
      paymentData,
      billingAddress,
      nickname || undefined,
      setAsDefault
    );

    setSaving(false);

    if (result.success) {
      toast.success("Payment method saved successfully");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } else {
      toast.error(result.error || "Failed to save payment method");
    }
  };

  const cardType = detectCardType(cardNumber);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Payment Method</DialogTitle>
          <DialogDescription>
            Add a new card or bank account for faster checkout
          </DialogDescription>
        </DialogHeader>

        <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as "card" | "ach")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="card" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Credit/Debit Card
            </TabsTrigger>
            <TabsTrigger value="ach" className="gap-2">
              <Landmark className="h-4 w-4" />
              Bank Account (ACH)
            </TabsTrigger>
          </TabsList>

          {/* Card Form */}
          <TabsContent value="card" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className={`pl-10 ${errors.cardNumber ? "border-red-500" : ""}`}
                />
                {cardType !== "unknown" && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium uppercase text-muted-foreground">
                    {cardType}
                  </span>
                )}
              </div>
              {errors.cardNumber && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.cardNumber}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  placeholder="MMYY"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  className={errors.expiryDate ? "border-red-500" : ""}
                />
                {errors.expiryDate && (
                  <p className="text-sm text-red-500">{errors.expiryDate}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  maxLength={4}
                  className={errors.cvv ? "border-red-500" : ""}
                />
                {errors.cvv && (
                  <p className="text-sm text-red-500">{errors.cvv}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardholderName">Cardholder Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cardholderName"
                  placeholder="John Doe"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className={`pl-10 ${errors.cardholderName ? "border-red-500" : ""}`}
                />
              </div>
              {errors.cardholderName && (
                <p className="text-sm text-red-500">{errors.cardholderName}</p>
              )}
            </div>
          </TabsContent>

          {/* ACH Form */}
          <TabsContent value="ach" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking Account</SelectItem>
                  <SelectItem value="savings">Savings Account</SelectItem>
                  <SelectItem value="businessChecking">Business Checking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name (Optional)</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="bankName"
                  placeholder="Bank of America"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="routingNumber">Routing Number</Label>
              <Input
                id="routingNumber"
                placeholder="123456789"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
                maxLength={9}
                className={errors.routingNumber ? "border-red-500" : ""}
              />
              {errors.routingNumber && (
                <p className="text-sm text-red-500">{errors.routingNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="Enter account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                className={errors.accountNumber ? "border-red-500" : ""}
              />
              {errors.accountNumber && (
                <p className="text-sm text-red-500">{errors.accountNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmAccountNumber">Confirm Account Number</Label>
              <Input
                id="confirmAccountNumber"
                placeholder="Re-enter account number"
                value={confirmAccountNumber}
                onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                className={errors.confirmAccountNumber ? "border-red-500" : ""}
              />
              {errors.confirmAccountNumber && (
                <p className="text-sm text-red-500">{errors.confirmAccountNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameOnAccount">Name on Account</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nameOnAccount"
                  placeholder="John Doe"
                  value={nameOnAccount}
                  onChange={(e) => setNameOnAccount(e.target.value)}
                  className={`pl-10 ${errors.nameOnAccount ? "border-red-500" : ""}`}
                />
              </div>
              {errors.nameOnAccount && (
                <p className="text-sm text-red-500">{errors.nameOnAccount}</p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Billing Address */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Billing Address
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={errors.address ? "border-red-500" : ""}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={errors.city ? "border-red-500" : ""}
              />
              {errors.city && (
                <p className="text-sm text-red-500">{errors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-sm text-red-500">{errors.state}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                maxLength={10}
                className={errors.zip ? "border-red-500" : ""}
              />
              {errors.zip && (
                <p className="text-sm text-red-500">{errors.zip}</p>
              )}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="border-t pt-4 mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname (Optional)</Label>
            <Input
              id="nickname"
              placeholder="e.g., My Business Card"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="setAsDefault"
              checked={setAsDefault}
              onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
            />
            <Label htmlFor="setAsDefault" className="text-sm font-normal cursor-pointer">
              Set as default payment method
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Payment Method
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
