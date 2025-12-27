/**
 * Custom hook for payment summary calculations
 * Provides real-time payment status and balance calculations
 */

import { useState, useEffect } from 'react';
import { calculatePaymentSummary, PaymentSummary } from '@/utils/paymentCalculations';

interface UsePaymentSummaryProps {
  orderId?: string;
  totalAmount: number;
  paymentStatus: string;
  refreshTrigger?: number; // For manual refresh
}

export function usePaymentSummary({
  orderId,
  totalAmount,
  paymentStatus,
  refreshTrigger = 0
}: UsePaymentSummaryProps) {
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    paidAmount: 0,
    balanceDue: totalAmount,
    isFullyPaid: false,
    isPartiallyPaid: false,
    isPending: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentSummary = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const summary = await calculatePaymentSummary(orderId, totalAmount, paymentStatus);
        setPaymentSummary(summary);
      } catch (err) {
        console.error('Error fetching payment summary:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        // Fallback to payment status
        setPaymentSummary({
          paidAmount: paymentStatus === 'paid' ? totalAmount : 0,
          balanceDue: paymentStatus === 'paid' ? 0 : totalAmount,
          isFullyPaid: paymentStatus === 'paid',
          isPartiallyPaid: false,
          isPending: paymentStatus !== 'paid',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentSummary();
  }, [orderId, totalAmount, paymentStatus, refreshTrigger]);

  return {
    paymentSummary,
    loading,
    error,
    refresh: () => setPaymentSummary(prev => ({ ...prev })), // Trigger re-fetch
  };
}