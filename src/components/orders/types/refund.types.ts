export interface RefundTransaction {
  id?: string;
  orderId: string;
  amount: number;
  date: string;
  reason: string;
  itemsReturned: string;
  notes?: string;
  status: 'pending' | 'completed' | 'failed';
  type: 'refund';
  refundMethod: 'original_payment' | 'store_credit' | 'bank_transfer';
  processedBy: string;
  accountingReference?: string;
  originalTransactionId: string;
}

export interface RefundHistory {
  transactions: RefundTransaction[];
  totalRefunded: number;
}

export interface RefundItem {
  productId: string;
  quantity: number;
  amount: number;
  reason: string;
}