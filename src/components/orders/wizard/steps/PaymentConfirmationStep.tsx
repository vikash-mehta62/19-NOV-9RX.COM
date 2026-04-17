import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Lock,
  Receipt,
} from "lucide-react";
import type { CartItem } from "@/store/types/cartTypes";
import { getPaymentExperienceSettings, type PaymentExperienceSettings } from "@/config/paymentConfig";

export type PaymentMethod = "card" | "ach" | "credit" | "manual";

export interface PaymentConfirmationStepProps {
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  totalDiscount?: number;
  appliedDiscounts?: Array<{
    type: string;
    name: string;
    amount: number;
  }>;
  onPaymentMethodChange?: (method: PaymentMethod) => void;
  onSpecialInstructionsChange?: (instructions: string) => void;
  onPONumberChange?: (poNumber: string) => void;
  onTermsAcceptedChange?: (accepted: boolean) => void;
  onAccuracyConfirmedChange?: (confirmed: boolean) => void;
  initialPaymentMethod?: PaymentMethod;
  initialSpecialInstructions?: string;
  initialPONumber?: string;
  initialTermsAccepted?: boolean;
  initialAccuracyConfirmed?: boolean;
  isEditMode?: boolean;
  isAdmin?: boolean;
  compact?: boolean;
  showCreditAccount?: boolean;
}

interface PaymentMethodCard {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  visible?: boolean;
}

export const PaymentConfirmationStep = ({
  cartItems,
  subtotal,
  tax,
  shipping,
  total,
  totalDiscount = 0,
  appliedDiscounts = [],
  onPaymentMethodChange,
  onSpecialInstructionsChange,
  onPONumberChange,
  onTermsAcceptedChange,
  onAccuracyConfirmedChange,
  initialPaymentMethod = "card",
  initialSpecialInstructions = "",
  initialPONumber = "",
  initialTermsAccepted = false,
  initialAccuracyConfirmed = false,
  isEditMode = false,
  isAdmin = false,
  compact = false,
  showCreditAccount = true,
}: PaymentConfirmationStepProps) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod);
  const [specialInstructions, setSpecialInstructions] = useState(initialSpecialInstructions);
  const [poNumber, setPONumber] = useState(initialPONumber);
  const [confirmations, setConfirmations] = useState({
    termsAccepted: initialTermsAccepted,
    accuracyConfirmed: initialAccuracyConfirmed,
  });
  const [feeSettings, setFeeSettings] = useState<PaymentExperienceSettings>({
    cardProcessingFeeEnabled: false,
    cardProcessingFeePercentage: 0,
    cardProcessingFeePassToCustomer: false,
    invoiceDefaultNotes: "",
  });

  useEffect(() => {
    const loadFeeSettings = async () => {
      const settings = await getPaymentExperienceSettings();
      setFeeSettings(settings);
    };

    void loadFeeSettings();
  }, []);

  useEffect(() => {
    if (!showCreditAccount && selectedPaymentMethod === "credit") {
      setSelectedPaymentMethod("card");
      onPaymentMethodChange?.("card");
    }
  }, [showCreditAccount, selectedPaymentMethod, onPaymentMethodChange]);

  const cardFeeNoteEnabled =
    feeSettings.cardProcessingFeeEnabled &&
    feeSettings.cardProcessingFeePassToCustomer &&
    feeSettings.cardProcessingFeePercentage > 0;
  const displayCardFeePercentage = Math.round(feeSettings.cardProcessingFeePercentage);
  const orderTotal = Math.max(0, total - totalDiscount);

  const allPaymentMethods: PaymentMethodCard[] = [
    {
      id: "card",
      label: "Pay with iPOSPay",
      description: cardFeeNoteEnabled
        ? `Use secure iPOSPay for card or ACH. Card payments may add ${displayCardFeePercentage}% processing fee; ACH is free.`
        : "Use secure iPOSPay for card or ACH checkout.",
      icon: CreditCard,
    },
    {
      id: "ach",
      label: "ACH via iPOSPay",
      description: "Secure bank transfer checkout with no extra processing fee.",
      icon: Building2,
      visible: false,
    },
    {
      id: "credit",
      label: "Credit Account",
      description: "Use account credit",
      icon: FileText,
    },
    {
      id: "manual",
      label: "Manual Payment",
      description: "Pay manually or invoice",
      icon: Receipt,
    },
  ];

  const paymentMethods = allPaymentMethods.filter((method) => {
    if (method.id === "manual" && !isAdmin) return false;
    if (method.id === "credit" && !showCreditAccount) return false;
    if (method.visible === false) return false;
    return true;
  });
  const hidePaymentMethodChooser =
    !isAdmin &&
    !showCreditAccount &&
    paymentMethods.length === 1 &&
    paymentMethods[0]?.id === "card";

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    onPaymentMethodChange?.(method);
  };

  const handleSpecialInstructionsChange = (value: string) => {
    setSpecialInstructions(value);
    onSpecialInstructionsChange?.(value);
  };

  const handlePONumberChange = (value: string) => {
    setPONumber(value);
    onPONumberChange?.(value);
  };

  const handleConfirmationChange = (field: keyof typeof confirmations, checked: boolean) => {
    setConfirmations((prev) => ({
      ...prev,
      [field]: checked,
    }));

    if (field === "termsAccepted") {
      onTermsAcceptedChange?.(checked);
    } else if (field === "accuracyConfirmed") {
      onAccuracyConfirmedChange?.(checked);
    }
  };

  const selectedMethodLabel =
    selectedPaymentMethod === "card"
      ? "Pay with iPOSPay"
      : selectedPaymentMethod === "ach"
        ? "Pay with iPOSPay"
        : selectedPaymentMethod === "credit"
          ? "Credit Account"
          : "Manual Payment";

  return (
    <div className={compact ? "space-y-4" : "space-y-4 sm:space-y-6"}>
      {!compact && (
        <>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Payment & Confirmation</h2>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Choose how you want to pay and confirm your order details.
            </p>
          </div>
          <Separator />
        </>
      )}

      <Card className={compact ? "border-slate-200 bg-slate-50 shadow-sm" : "border-slate-200 bg-slate-50"}>
        <CardContent className={compact ? "space-y-3 p-4" : "space-y-3 p-4 sm:p-5"}>
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 p-2 text-blue-700">
              <Lock className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Secure iPOSPay checkout</p>
              <p className="text-sm text-slate-600">
                Pay with iPOSPay using card or ACH. The final payment is completed on the hosted secure payment page.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Card payments</p>
              <p className="text-xs text-amber-800">
                {cardFeeNoteEnabled
                  ? `A ${displayCardFeePercentage}% processing fee may be added at secure checkout.`
                  : "Any applicable fee is shown on the secure checkout page before the customer confirms payment."}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-900">ACH payments</p>
              <p className="text-xs text-emerald-800">
                ACH is free for the customer and uses the same secure hosted flow.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hidePaymentMethodChooser && (
        <div>
          <h3 className="mb-3 text-base font-semibold text-gray-900 sm:mb-4 sm:text-lg">
            {isEditMode ? "Payment Method (Locked)" : "Select Payment Method"}
          </h3>
          {isEditMode && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-700">Payment method cannot be changed in edit mode.</p>
            </div>
          )}
          <div className={compact ? "grid grid-cols-1 gap-3 lg:grid-cols-2" : "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"}>
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedPaymentMethod === method.id;
              const isIposPayOption = method.id === "card";

              return (
                <Card
                  key={method.id}
                  className={`transition-all duration-200 ${
                    isEditMode ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-slate-300 hover:shadow-md"
                  } ${
                    isSelected
                      ? isIposPayOption
                        ? "border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm"
                        : "border-2 border-slate-900 bg-slate-50 shadow-sm"
                      : "border border-gray-200 bg-white"
                  }`}
                  onClick={() => !isEditMode && handlePaymentMethodSelect(method.id)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${
                          isSelected
                            ? isIposPayOption
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-200"
                              : "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="text-base font-semibold tracking-tight text-slate-900">{method.label}</h4>
                            <p className="text-sm leading-6 text-slate-600">{method.description}</p>
                          </div>
                          {isSelected ? (
                            <div
                              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                                isIposPayOption ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-800"
                              }`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          ) : null}
                        </div>
                        {isIposPayOption ? (
                          <div className="flex flex-wrap gap-2">
                            <Badge className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100">
                              Card / ACH
                            </Badge>
                            <Badge className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100">
                              ACH free
                            </Badge>
                            {cardFeeNoteEnabled && (
                              <Badge className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100">
                                Card fee may apply
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Badge className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100">
                              Net terms
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!hidePaymentMethodChooser && (selectedPaymentMethod === "card" || selectedPaymentMethod === "ach") && (
        <Card className={compact ? "shadow-sm" : ""}>
          <CardHeader>
            <CardTitle>Pay with iPOSPay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Complete payment on secure iPOSPay using either card or ACH. ACH is fee-free; card fees, if applicable, are shown before final confirmation.
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPaymentMethod === "credit" && (
        <Card className={compact ? "shadow-sm" : ""}>
          <CardHeader>
            <CardTitle>Credit Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Your order will be charged to your credit account. Available credit will be checked before order placement.
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPaymentMethod === "manual" && (
        <Card className={compact ? "shadow-sm" : ""}>
          <CardHeader>
            <CardTitle>Manual Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              Order will be created and payment can be handled manually outside secure checkout.
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={compact ? "shadow-sm" : ""}>
        <CardHeader>
          <CardTitle>Order Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="specialInstructions" className="text-sm text-gray-700">
              Special instructions
            </Label>
            <Textarea
              id="specialInstructions"
              placeholder="Add delivery notes or special requests..."
              className="mt-2 min-h-24"
              value={specialInstructions}
              onChange={(e) => handleSpecialInstructionsChange(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="poNumber" className="text-sm text-gray-700">
              Purchase order number
            </Label>
            <Input
              id="poNumber"
              placeholder="PO-2024-001"
              className="mt-2"
              value={poNumber}
              onChange={(e) => handlePONumberChange(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={compact ? "border border-amber-200 bg-amber-50 shadow-sm" : "border-2 border-amber-200 bg-amber-50"}>
        <CardHeader>
          <CardTitle>Order Confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="termsAccepted"
              checked={confirmations.termsAccepted}
              onCheckedChange={(checked) => handleConfirmationChange("termsAccepted", checked as boolean)}
            />
            <div className="flex-1">
              <label htmlFor="termsAccepted" className="cursor-pointer text-sm font-medium text-gray-900">
                I accept the terms and conditions
              </label>
              <p className="mt-1 text-xs text-gray-600">
                By checking this box, you agree to our{" "}
                <a href="/terms-of-service" target="_blank" className="text-blue-600 hover:underline" rel="noreferrer">
                  terms of service
                </a>{" "}
                and{" "}
                <a href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline" rel="noreferrer">
                  privacy policy
                </a>
                .
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="accuracyConfirmed"
              checked={confirmations.accuracyConfirmed}
              onCheckedChange={(checked) => handleConfirmationChange("accuracyConfirmed", checked as boolean)}
            />
            <div className="flex-1">
              <label htmlFor="accuracyConfirmed" className="cursor-pointer text-sm font-medium text-gray-900">
                I confirm that all order details are accurate
              </label>
              <p className="mt-1 text-xs text-gray-600">Please review all information before placing your order.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Final Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Items ({cartItems.length}):</span>
                <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Shipping:</span>
                <span className="font-medium text-gray-900">${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Tax:</span>
                <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
              </div>
              {appliedDiscounts.length > 0 && (
                <>
                  <Separator className="bg-blue-300" />
                  {appliedDiscounts.map((discount, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="flex items-center gap-1 text-blue-700">
                        <Badge variant="outline" className="border-blue-300 bg-blue-100 text-xs text-blue-700">
                          {discount.type === "redeemed_reward"
                            ? "Reward"
                            : discount.type === "promo"
                              ? "Promo"
                              : discount.type === "offer"
                                ? "Offer"
                                : "Points"}
                        </Badge>
                        {discount.name}
                      </span>
                      <span className="font-medium text-blue-600">
                        {discount.amount > 0 ? `-$${discount.amount.toFixed(2)}` : "Free Shipping"}
                      </span>
                    </div>
                  ))}
                </>
              )}
              <Separator className="bg-blue-300" />
              <div className="flex justify-between text-base font-semibold">
                <span className="text-gray-900">Order Total:</span>
                <span className="text-gray-900">${orderTotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="text-right text-sm text-blue-600">You save: ${totalDiscount.toFixed(2)}</div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <ArrowRight className="h-5 w-5" />
              Next Step
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-900">
            <p>1. Your selected payment route is saved with the order.</p>
            <p>2. After clicking the checkout button, you review payer details one time.</p>
            <p>3. Then you finish payment on secure iPOSPay and return automatically.</p>
            <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-blue-700" />
              <span>Selected method: {selectedMethodLabel}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
