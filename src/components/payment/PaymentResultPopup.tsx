"use client"

import { createPortal } from "react-dom"
import {
  CheckCircle2,
  XCircle,
  X,
  CreditCard,
  Landmark,
  FileText,
  Receipt,
  Hash,
  DollarSign,
  ShieldCheck,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Types for payment result data
export interface PaymentResultData {
  success: boolean
  transactionId?: string
  authCode?: string
  amount: number
  orderNumber?: string
  errorMessage?: string
  errorCode?: string
  paymentMethod: "card" | "ach" | "manual"
  cardType?: string
  cardLastFour?: string
  accountType?: string
  accountLastFour?: string
}

export interface PaymentResultPopupProps {
  isOpen: boolean
  onClose: () => void
  onTryAgain?: () => void
  result: PaymentResultData
}

// Helper to format currency
function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

// Helper to get card type display name
function getCardTypeDisplay(cardType?: string): string {
  if (!cardType) return "Card"
  const types: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
  }
  return types[cardType.toLowerCase()] || cardType
}

// Helper to get account type display name
function getAccountTypeDisplay(accountType?: string): string {
  if (!accountType) return "Account"
  const types: Record<string, string> = {
    checking: "Checking",
    savings: "Savings",
    businessChecking: "Business Checking",
  }
  return types[accountType] || accountType
}

export function PaymentResultPopup({
  isOpen,
  onClose,
  onTryAgain,
  result,
}: PaymentResultPopupProps) {
  if (!isOpen) return null

  const handleClose = () => {
    onClose()
  }

  const handleTryAgain = () => {
    if (onTryAgain) {
      onTryAgain()
    } else {
      onClose()
    }
  }

  const popupContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Popup Card */}
      <Card className="relative z-10 w-full max-w-md mx-4 shadow-2xl border-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <CardHeader
          className={cn(
            "text-white text-center py-8",
            result.success
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
              : "bg-gradient-to-r from-red-500 to-red-600"
          )}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            {result.success ? (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-white" />
              </div>
            )}
          </div>

          {/* Title */}
          <CardTitle className="text-2xl font-bold">
            {result.success ? "Payment Successful" : "Payment Failed"}
          </CardTitle>

          {/* Amount */}
          <div className="mt-2 text-3xl font-bold">
            {formatCurrency(result.amount)}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="p-6 space-y-4">
          {/* Success Details */}
          {result.success && (
            <div className="space-y-3">
              {/* Transaction ID */}
              {result.transactionId && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Transaction ID
                  </span>
                  <span className="font-mono font-medium text-gray-900">
                    {result.transactionId}
                  </span>
                </div>
              )}

              {/* Authorization Code */}
              {result.authCode && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Auth Code
                  </span>
                  <span className="font-mono font-medium text-gray-900">
                    {result.authCode}
                  </span>
                </div>
              )}

              {/* Order Number */}
              {result.orderNumber && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Order Number
                  </span>
                  <Badge variant="secondary" className="font-mono">
                    {result.orderNumber}
                  </Badge>
                </div>
              )}

              {/* Payment Method */}
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 flex items-center gap-2">
                  {result.paymentMethod === "card" && <CreditCard className="w-4 h-4" />}
                  {result.paymentMethod === "ach" && <Landmark className="w-4 h-4" />}
                  {result.paymentMethod === "manual" && <FileText className="w-4 h-4" />}
                  Payment Method
                </span>
                <span className="font-medium text-gray-900">
                  {result.paymentMethod === "card" && result.cardType && result.cardLastFour && (
                    <span className="flex items-center gap-2">
                      {getCardTypeDisplay(result.cardType)}
                      <span className="font-mono text-gray-500">
                        •••• {result.cardLastFour}
                      </span>
                    </span>
                  )}
                  {result.paymentMethod === "ach" && result.accountLastFour && (
                    <span className="flex items-center gap-2">
                      {getAccountTypeDisplay(result.accountType)}
                      <span className="font-mono text-gray-500">
                        •••• {result.accountLastFour}
                      </span>
                    </span>
                  )}
                  {result.paymentMethod === "manual" && "Manual Payment"}
                </span>
              </div>
            </div>
          )}

          {/* Failure Details */}
          {!result.success && (
            <div className="space-y-4">
              {/* Error Message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 font-medium">
                  {result.errorMessage || "An error occurred while processing your payment."}
                </p>
                {result.errorCode && (
                  <p className="text-red-500 text-sm mt-1">
                    Error Code: {result.errorCode}
                  </p>
                )}
              </div>

              {/* Payment Method Attempted */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600 flex items-center gap-2">
                  {result.paymentMethod === "card" && <CreditCard className="w-4 h-4" />}
                  {result.paymentMethod === "ach" && <Landmark className="w-4 h-4" />}
                  {result.paymentMethod === "manual" && <FileText className="w-4 h-4" />}
                  Payment Method
                </span>
                <span className="font-medium text-gray-900">
                  {result.paymentMethod === "card" && result.cardType && result.cardLastFour && (
                    <span className="flex items-center gap-2">
                      {getCardTypeDisplay(result.cardType)}
                      <span className="font-mono text-gray-500">
                        •••• {result.cardLastFour}
                      </span>
                    </span>
                  )}
                  {result.paymentMethod === "ach" && result.accountLastFour && (
                    <span className="flex items-center gap-2">
                      {getAccountTypeDisplay(result.accountType)}
                      <span className="font-mono text-gray-500">
                        •••• {result.accountLastFour}
                      </span>
                    </span>
                  )}
                  {result.paymentMethod === "manual" && "Manual Payment"}
                  {result.paymentMethod === "card" && !result.cardLastFour && "Credit Card"}
                  {result.paymentMethod === "ach" && !result.accountLastFour && "Bank Account"}
                </span>
              </div>

              {/* Amount Attempted */}
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Amount Attempted
                </span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(result.amount)}
                </span>
              </div>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            {result.success ? (
              <Button
                onClick={handleClose}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-12"
                >
                  Close
                </Button>
                <Button
                  onClick={handleTryAgain}
                  className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return createPortal(popupContent, document.body)
}

export default PaymentResultPopup
