import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard,
  Building2,
  FileText,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import type { CartItem } from "@/store/types/cartTypes";

export type PaymentMethod = "card" | "ach" | "credit" | "manual";

export interface PaymentConfirmationStepProps {
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
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
}

interface PaymentMethodCard {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PaymentConfirmationStep = ({
  cartItems,
  subtotal,
  tax,
  shipping,
  total,
  onPaymentMethodChange,
  onSpecialInstructionsChange,
  onPONumberChange,
  onTermsAcceptedChange,
  onAccuracyConfirmedChange,
  initialPaymentMethod = "credit_card",
  initialSpecialInstructions = "",
  initialPONumber = "",
  initialTermsAccepted = false,
  initialAccuracyConfirmed = false,
  isEditMode = false,
}: PaymentConfirmationStepProps) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(
    initialPaymentMethod
  );
  const [specialInstructions, setSpecialInstructions] = useState(
    initialSpecialInstructions
  );
  const [poNumber, setPONumber] = useState(initialPONumber);
  const [confirmations, setConfirmations] = useState({
    termsAccepted: initialTermsAccepted,
    accuracyConfirmed: initialAccuracyConfirmed,
  });

  // Payment method options
  const paymentMethods: PaymentMethodCard[] = [
    {
      id: "card",
      label: "Credit Card",
      description: "Pay with credit or debit card",
      icon: CreditCard,
    },
    // {
    //   id: "ach",
    //   label: "ACH Transfer",
    //   description: "Direct bank transfer",
    //   icon: Building2,
    // },
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

    // Notify parent component of changes
    if (field === "termsAccepted") {
      onTermsAcceptedChange?.(checked);
    } else if (field === "accuracyConfirmed") {
      onAccuracyConfirmedChange?.(checked);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Payment & Confirmation</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Select your payment method and confirm your order
        </p>
      </div>

      <Separator />

      {/* Payment Method Selection */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          {isEditMode ? "Payment Method (Locked)" : "Select Payment Method"}
        </h3>
        {isEditMode && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Payment method cannot be changed in edit mode
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedPaymentMethod === method.id;

            return (
              <Card
                key={method.id}
                className={`${isEditMode ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md hover:scale-105 active:scale-95'} transition-all duration-200 ${
                  isSelected
                    ? "border-2 border-blue-500 bg-blue-50"
                    : "border border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => !isEditMode && handlePaymentMethodSelect(method.id)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base">
                          {method.label}
                        </h4>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {method.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payment Method Specific Fields */}
      {selectedPaymentMethod === "card" && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Credit Card Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    placeholder="MM/YY"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    type="password"
                    maxLength={4}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPaymentMethod === "ach" && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>ACH Transfer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="Business Account"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="accountType">Account Type</Label>
                <select
                  id="accountType"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <div>
                <Label htmlFor="routingNumber">Routing Number</Label>
                <Input
                  id="routingNumber"
                  placeholder="123456789"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="1234567890"
                  type="password"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPaymentMethod === "credit" && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle>Credit Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Your order will be charged to your credit account. Available credit will be checked before order placement.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPaymentMethod === "manual" && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                Order will be created and you can process payment manually. An invoice will be generated for your records.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Special Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Special Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="specialInstructions" className="text-sm text-gray-700">
            Add any special requests or notes for this order (optional)
          </Label>
          <Textarea
            id="specialInstructions"
            placeholder="Enter any special instructions or notes here..."
            className="mt-2 min-h-24"
            value={specialInstructions}
            onChange={(e) => handleSpecialInstructionsChange(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* PO Number */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Number</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="poNumber" className="text-sm text-gray-700">
            Enter your PO number (optional)
          </Label>
          <Input
            id="poNumber"
            placeholder="PO-2024-001"
            className="mt-2"
            value={poNumber}
            onChange={(e) => handlePONumberChange(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Order Confirmation Checkboxes */}
      <Card className="border-2 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle>Order Confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="termsAccepted"
              checked={confirmations.termsAccepted}
              onCheckedChange={(checked) =>
                handleConfirmationChange("termsAccepted", checked as boolean)
              }
            />
            <div className="flex-1">
              <label
                htmlFor="termsAccepted"
                className="text-sm font-medium text-gray-900 cursor-pointer"
              >
                I accept the terms and conditions
              </label>
              <p className="text-xs text-gray-600 mt-1">
                By checking this box, you agree to our terms of service and privacy
                policy
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="accuracyConfirmed"
              checked={confirmations.accuracyConfirmed}
              onCheckedChange={(checked) =>
                handleConfirmationChange("accuracyConfirmed", checked as boolean)
              }
            />
            <div className="flex-1">
              <label
                htmlFor="accuracyConfirmed"
                className="text-sm font-medium text-gray-900 cursor-pointer"
              >
                I confirm that all order details are accurate
              </label>
              <p className="text-xs text-gray-600 mt-1">
                Please review all information before placing your order
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Order Summary */}
      <Card className="border-2 border-green-500 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-900">Final Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Items ({cartItems.length}):</span>
              <span className="font-medium text-gray-900">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Tax:</span>
              <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Shipping:</span>
              <span className="font-medium text-gray-900">
                ${shipping.toFixed(2)}
              </span>
            </div>
            <Separator className="bg-green-300" />
            <div className="flex justify-between text-xl font-bold">
              <span className="text-gray-900">Total:</span>
              <span className="text-green-700">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-green-300">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                {selectedPaymentMethod === "card" && "Credit Card"}
                {selectedPaymentMethod === "ach" && "ACH Transfer"}
                {selectedPaymentMethod === "credit" && "Credit Account"}
                {selectedPaymentMethod === "manual" && "Manual Payment"}
              </Badge>
              <span>•</span>
              <span>Payment method selected</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
