/**
 * Reusable Payment Status Badge Component
 * Shows payment status with appropriate colors and icons
 */

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { PaymentSummary } from "@/utils/paymentCalculations";

interface PaymentStatusBadgeProps {
  paymentSummary: PaymentSummary;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function PaymentStatusBadge({ 
  paymentSummary, 
  size = "md", 
  showIcon = true,
  className = "" 
}: PaymentStatusBadgeProps) {
  const getStatusConfig = () => {
    if (paymentSummary.isFullyPaid) {
      return {
        label: "Paid",
        icon: CheckCircle2,
        className: "bg-green-100 text-green-800 border-green-300",
      };
    }
    
    if (paymentSummary.isPartiallyPaid) {
      return {
        label: "Partial",
        icon: AlertCircle,
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    }
    
    return {
      label: "Unpaid",
      icon: XCircle,
      className: "bg-red-100 text-red-800 border-red-300",
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <Badge
      className={`
        ${config.className} 
        ${sizeClasses[size]} 
        font-semibold border flex items-center gap-1.5
        ${className}
      `}
    >
      {showIcon && <Icon className="w-3.5 h-3.5" />}
      {config.label}
    </Badge>
  );
}

/**
 * Payment Amount Display Component
 * Shows paid amount and balance due in a compact format
 */
interface PaymentAmountDisplayProps {
  paymentSummary: PaymentSummary;
  totalAmount: number;
  compact?: boolean;
  className?: string;
}

export function PaymentAmountDisplay({ 
  paymentSummary, 
  totalAmount,
  compact = false,
  className = "" 
}: PaymentAmountDisplayProps) {
  if (compact) {
    return (
      <div className={`text-sm space-y-1 ${className}`}>
        <div className="flex justify-between">
          <span className="text-gray-600">Total:</span>
          <span className="font-medium">${totalAmount.toFixed(2)}</span>
        </div>
        {paymentSummary.paidAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-green-600">Paid:</span>
            <span className="font-medium text-green-600">${paymentSummary.paidAmount.toFixed(2)}</span>
          </div>
        )}
        {paymentSummary.balanceDue > 0 && (
          <div className="flex justify-between">
            <span className="text-red-600">Due:</span>
            <span className="font-bold text-red-600">${paymentSummary.balanceDue.toFixed(2)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <span className="text-lg font-bold text-gray-900">Total</span>
        <span className="text-2xl font-bold text-emerald-600">${totalAmount.toFixed(2)}</span>
      </div>
      
      {paymentSummary.paidAmount > 0 && (
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-green-600 font-medium">Paid Amount</span>
          </div>
          <span className="font-bold text-green-600">${paymentSummary.paidAmount.toFixed(2)}</span>
        </div>
      )}

      {paymentSummary.balanceDue > 0 && (
        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-600 font-bold">Balance Due</span>
          </div>
          <span className="text-xl font-bold text-red-600">${paymentSummary.balanceDue.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}