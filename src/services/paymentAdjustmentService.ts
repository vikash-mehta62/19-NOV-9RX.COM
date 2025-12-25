import { supabase } from "@/integrations/supabase/client";
import { OrderActivityService } from "./orderActivityService";

export interface PaymentAdjustment {
  id?: string;
  adjustmentNumber?: string;
  orderId: string;
  customerId: string;
  adjustmentType: 'additional_payment' | 'partial_refund' | 'full_refund' | 'credit_memo_issued' | 'credit_memo_applied' | 'order_modification';
  originalAmount: number;
  newAmount: number;
  differenceAmount: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentTransactionId?: string;
  creditMemoId?: string;
  refundId?: string;
  reason?: string;
  processedBy?: string;
  orderNumber?: string;
}

export interface CreditMemo {
  id?: string;
  memoNumber?: string;
  orderId?: string;
  refundId?: string;
  customerId: string;
  amount: number;
  reason: string;
  items?: any[];
  status?: string;
  appliedAmount?: number;
  balance?: number;
  issuedBy?: string;
}

export interface Refund {
  id?: string;
  refundNumber?: string;
  orderId: string;
  invoiceId?: string;
  customerId: string;
  originalPaymentId?: string;
  amount: number;
  reason: string;
  itemsReturned?: any[];
  refundMethod: 'original_payment' | 'store_credit' | 'bank_transfer' | 'credit_memo';
  status?: string;
  processedBy?: string;
  notes?: string;
  gatewayRefundId?: string;
}

export const PaymentAdjustmentService = {
  /**
   * Calculate payment difference when order is modified
   */
  calculateAdjustment(originalAmount: number, newAmount: number): {
    differenceAmount: number;
    adjustmentType: 'additional_payment' | 'partial_refund' | 'no_change';
  } {
    const difference = Number((newAmount - originalAmount).toFixed(2));
    
    if (difference > 0) {
      return { differenceAmount: difference, adjustmentType: 'additional_payment' };
    } else if (difference < 0) {
      return { differenceAmount: Math.abs(difference), adjustmentType: 'partial_refund' };
    }
    return { differenceAmount: 0, adjustmentType: 'no_change' };
  },

  /**
   * Process refund via Authorize.net edge function
   */
  async processGatewayRefund(
    transactionId: string,
    amount: number,
    cardLastFour?: string,
    orderId?: string,
    reason?: string
  ): Promise<{ success: boolean; refundTransactionId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('refund-payment', {
        body: {
          transactionId,
          amount,
          cardNumber: cardLastFour, // Last 4 digits for card refunds
          orderId,
          reason,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Refund failed' };
      }

      return { 
        success: true, 
        refundTransactionId: data.refundTransactionId 
      };
    } catch (error: any) {
      console.error('Error processing gateway refund:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Process additional payment via Authorize.net edge function
   */
  async processGatewayPayment(
    amount: number,
    paymentMethod: 'saved_card' | 'new_card',
    paymentDetails: {
      customerProfileId?: string;
      paymentProfileId?: string;
      cardNumber?: string;
      expirationDate?: string;
      cvv?: string;
      cardholderName?: string;
    },
    orderId?: string,
    invoiceNumber?: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      let requestBody: any;

      if (paymentMethod === 'saved_card' && paymentDetails.customerProfileId && paymentDetails.paymentProfileId) {
        // Charge saved card
        requestBody = {
          action: 'chargeSavedCard',
          customerProfileId: paymentDetails.customerProfileId,
          paymentProfileId: paymentDetails.paymentProfileId,
          amount,
          orderId,
          invoiceNumber,
        };
      } else {
        // Direct card payment
        requestBody = {
          payment: {
            type: 'card',
            cardNumber: paymentDetails.cardNumber,
            expirationDate: paymentDetails.expirationDate,
            cvv: paymentDetails.cvv,
            cardholderName: paymentDetails.cardholderName,
          },
          amount,
          orderId,
          invoiceNumber,
        };
      }

      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: requestBody,
      });

      if (error) {
        console.error('Edge function error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Payment failed' };
      }

      return { 
        success: true, 
        transactionId: data.transactionId 
      };
    } catch (error: any) {
      console.error('Error processing gateway payment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get order's original transaction ID for refund
   */
  async getOrderTransactionId(orderId: string): Promise<{ transactionId?: string; cardLastFour?: string }> {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('payment_transication')
        .eq('id', orderId)
        .single();

      if (error || !order) {
        return {};
      }

      // Try to get card last 4 from payment transaction or invoice
      const { data: invoice } = await supabase
        .from('invoices')
        .select('payment_transication')
        .eq('order_id', orderId)
        .maybeSingle();

      return {
        transactionId: order.payment_transication || invoice?.payment_transication,
      };
    } catch (error) {
      console.error('Error getting order transaction ID:', error);
      return {};
    }
  },

  /**
   * Get customer's saved payment methods
   */
  async getCustomerSavedCards(customerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('saved_payment_methods')
        .select('*')
        .eq('profile_id', customerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching saved cards:', error);
      return [];
    }
  },

  /**
   * Create a payment adjustment record and log activity
   */
  async createAdjustment(adjustment: PaymentAdjustment): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Generate adjustment number
      const { data: numberData } = await supabase.rpc('generate_adjustment_number');
      const adjustmentNumber = numberData || `ADJ${Date.now()}`;

      const { data, error } = await supabase
        .from('payment_adjustments')
        .insert({
          adjustment_number: adjustmentNumber,
          order_id: adjustment.orderId,
          customer_id: adjustment.customerId,
          adjustment_type: adjustment.adjustmentType,
          original_amount: adjustment.originalAmount,
          new_amount: adjustment.newAmount,
          difference_amount: adjustment.differenceAmount,
          payment_method: adjustment.paymentMethod,
          payment_status: adjustment.paymentStatus || 'pending',
          payment_transaction_id: adjustment.paymentTransactionId,
          credit_memo_id: adjustment.creditMemoId,
          refund_id: adjustment.refundId,
          reason: adjustment.reason,
          processed_by: adjustment.processedBy,
          processed_at: adjustment.paymentStatus === 'completed' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity based on adjustment type
      const activityDescription = this.getActivityDescription(adjustment, adjustmentNumber);
      await OrderActivityService.logActivity({
        orderId: adjustment.orderId,
        activityType: adjustment.adjustmentType === 'additional_payment' ? 'payment_received' : 'updated',
        description: activityDescription,
        performedBy: adjustment.processedBy,
        metadata: {
          adjustment_number: adjustmentNumber,
          adjustment_type: adjustment.adjustmentType,
          original_amount: adjustment.originalAmount,
          new_amount: adjustment.newAmount,
          difference_amount: adjustment.differenceAmount,
          payment_method: adjustment.paymentMethod,
          payment_status: adjustment.paymentStatus,
          transaction_id: adjustment.paymentTransactionId,
          reason: adjustment.reason,
        },
      });

      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating payment adjustment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get activity description based on adjustment type
   */
  getActivityDescription(adjustment: PaymentAdjustment, adjustmentNumber: string): string {
    const amount = Math.abs(adjustment.differenceAmount).toFixed(2);
    switch (adjustment.adjustmentType) {
      case 'additional_payment':
        if (adjustment.paymentMethod === 'payment_link') {
          return `Payment link sent for additional payment of $${amount} (${adjustmentNumber})`;
        }
        return `Additional payment of $${amount} collected via ${adjustment.paymentMethod} (${adjustmentNumber})`;
      case 'partial_refund':
        return `Partial refund of $${amount} processed (${adjustmentNumber})`;
      case 'full_refund':
        return `Full refund of $${amount} processed (${adjustmentNumber})`;
      case 'credit_memo_issued':
        return `Credit memo of $${amount} issued (${adjustmentNumber})`;
      case 'credit_memo_applied':
        return `Credit memo of $${amount} applied (${adjustmentNumber})`;
      case 'order_modification':
        return `Order modified - amount changed by $${amount} (${adjustmentNumber})`;
      default:
        return `Payment adjustment of $${amount} (${adjustmentNumber})`;
    }
  },

  /**
   * Issue a credit memo to customer
   */
  async issueCreditMemo(memo: CreditMemo): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('issue_credit_memo', {
        p_customer_id: memo.customerId,
        p_amount: memo.amount,
        p_reason: memo.reason,
        p_order_id: memo.orderId || null,
        p_refund_id: memo.refundId || null,
        p_items: memo.items || [],
        p_issued_by: memo.issuedBy || null,
      });

      if (error) throw error;

      // Log activity if order is associated
      if (memo.orderId && data?.success) {
        await OrderActivityService.logActivity({
          orderId: memo.orderId,
          activityType: 'updated',
          description: `Credit memo of $${memo.amount.toFixed(2)} issued - ${memo.reason}`,
          performedBy: memo.issuedBy,
          metadata: {
            credit_memo_id: data.credit_memo_id,
            memo_number: data.memo_number,
            amount: memo.amount,
            reason: memo.reason,
          },
        });
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error issuing credit memo:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Apply credit memo to an order
   */
  async applyCreditMemo(
    creditMemoId: string,
    orderId: string,
    amount: number,
    appliedBy: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('apply_credit_memo', {
        p_credit_memo_id: creditMemoId,
        p_order_id: orderId,
        p_amount: amount,
        p_applied_by: appliedBy,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error applying credit memo:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get customer's available credit memos
   */
  async getCustomerCreditMemos(customerId: string): Promise<{ success: boolean; data?: CreditMemo[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('credit_memos')
        .select('*')
        .eq('customer_id', customerId)
        .in('status', ['issued', 'partially_applied'])
        .gt('balance', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching credit memos:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get customer's total credit memo balance
   */
  async getCustomerCreditBalance(customerId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credit_memo_balance')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return data?.credit_memo_balance || 0;
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      return 0;
    }
  },

  /**
   * Create a refund record and process via gateway if needed
   */
  async createRefund(refund: Refund): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Generate refund number
      const { data: numberData } = await supabase.rpc('generate_refund_number');
      const refundNumber = numberData || `REF${Date.now()}`;

      let gatewayRefundId: string | undefined;
      let refundStatus = refund.status || 'pending';

      // If refund method is original_payment, process via Authorize.net
      if (refund.refundMethod === 'original_payment' && refund.originalPaymentId) {
        const gatewayResult = await this.processGatewayRefund(
          refund.originalPaymentId,
          refund.amount,
          undefined, // cardLastFour - optional
          refund.orderId,
          refund.reason
        );

        if (!gatewayResult.success) {
          // Gateway refund failed - still create record but mark as failed
          refundStatus = 'failed';
          console.error('Gateway refund failed:', gatewayResult.error);
        } else {
          gatewayRefundId = gatewayResult.refundTransactionId;
          refundStatus = 'completed';
        }
      }

      const { data, error } = await supabase
        .from('refunds')
        .insert({
          refund_number: refundNumber,
          order_id: refund.orderId,
          invoice_id: refund.invoiceId,
          customer_id: refund.customerId,
          original_payment_id: refund.originalPaymentId,
          amount: refund.amount,
          reason: refund.reason,
          items_returned: refund.itemsReturned || [],
          refund_method: refund.refundMethod,
          status: refundStatus,
          processed_by: refund.processedBy,
          notes: refund.notes,
          gateway_refund_id: gatewayRefundId,
          processed_at: refundStatus === 'completed' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity for the refund
      if (refund.orderId) {
        await OrderActivityService.logActivity({
          orderId: refund.orderId,
          activityType: refundStatus === 'completed' ? 'payment_received' : 'updated',
          description: refundStatus === 'completed' 
            ? `Refund of $${refund.amount.toFixed(2)} processed (${refundNumber})` 
            : `Refund of $${refund.amount.toFixed(2)} ${refundStatus} (${refundNumber})`,
          performedBy: refund.processedBy,
          metadata: {
            refund_number: refundNumber,
            refund_id: data?.id,
            amount: refund.amount,
            refund_method: refund.refundMethod,
            status: refundStatus,
            gateway_refund_id: gatewayRefundId,
            reason: refund.reason,
          },
        });
      }

      // If refund method is credit_memo, automatically issue one
      if (refund.refundMethod === 'credit_memo' && data) {
        await this.issueCreditMemo({
          customerId: refund.customerId,
          amount: refund.amount,
          reason: `Refund for order - ${refund.reason}`,
          orderId: refund.orderId,
          refundId: data.id,
          items: refund.itemsReturned,
          issuedBy: refund.processedBy,
        });
        
        // Update refund status to completed
        await supabase
          .from('refunds')
          .update({ status: 'completed', processed_at: new Date().toISOString() })
          .eq('id', data.id);
      }

      return { 
        success: refundStatus !== 'failed', 
        data: { ...data, gateway_refund_id: gatewayRefundId },
        error: refundStatus === 'failed' ? 'Gateway refund failed' : undefined
      };
    } catch (error: any) {
      console.error('Error creating refund:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Record account transaction for payment adjustment
   */
  async recordAccountTransaction(params: {
    customerId: string;
    orderId: string;
    transactionType: 'debit' | 'credit';
    referenceType: string;
    description: string;
    amount: number;
    processedBy?: string;
    transactionId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current balance
      const { data: lastTransaction } = await supabase
        .from('account_transactions')
        .select('balance')
        .eq('customer_id', params.customerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const currentBalance = lastTransaction?.balance || 0;
      const newBalance = params.transactionType === 'debit' 
        ? currentBalance + params.amount 
        : currentBalance - params.amount;

      const { error } = await supabase
        .from('account_transactions')
        .insert({
          customer_id: params.customerId,
          transaction_date: new Date().toISOString().split('T')[0],
          transaction_type: params.transactionType,
          reference_type: params.referenceType,
          reference_id: params.orderId,
          description: params.description,
          debit_amount: params.transactionType === 'debit' ? params.amount : 0,
          credit_amount: params.transactionType === 'credit' ? params.amount : 0,
          balance: newBalance,
          created_by: params.processedBy,
          transectionId: params.transactionId,
        });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error recording account transaction:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Record payment transaction in payment_transactions table
   */
  async recordPaymentTransaction(params: {
    profileId: string;
    orderId: string;
    transactionId?: string;
    transactionType: string;
    amount: number;
    paymentMethodType: string;
    status: string;
    cardLastFour?: string;
    cardType?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get invoice ID if exists
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', params.orderId)
        .maybeSingle();

      const { data, error } = await supabase
        .from('payment_transactions')
        .insert({
          profile_id: params.profileId,
          order_id: params.orderId,
          invoice_id: invoiceData?.id,
          transaction_id: params.transactionId,
          transaction_type: params.transactionType,
          amount: params.amount,
          payment_method_type: params.paymentMethodType,
          status: params.status,
          card_last_four: params.cardLastFour,
          card_type: params.cardType,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error recording payment transaction:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update order total amount after adjustment
   */
  async updateOrderTotal(orderId: string, newTotal: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      // Also update invoice if exists
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (invoiceData) {
        await supabase
          .from('invoices')
          .update({ total_amount: newTotal, updated_at: new Date().toISOString() })
          .eq('id', invoiceData.id);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error updating order total:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get order's payment adjustments history
   */
  async getOrderAdjustments(orderId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('payment_adjustments')
        .select(`
          *,
          credit_memos(*),
          refunds(*)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching order adjustments:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Process additional payment for order modification
   */
  async processAdditionalPayment(
    orderId: string,
    customerId: string,
    originalAmount: number,
    newAmount: number,
    paymentMethod: string,
    transactionId: string,
    processedBy: string,
    reason?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const differenceAmount = Number((newAmount - originalAmount).toFixed(2));

    return this.createAdjustment({
      orderId,
      customerId,
      adjustmentType: 'additional_payment',
      originalAmount,
      newAmount,
      differenceAmount,
      paymentMethod,
      paymentStatus: 'completed',
      paymentTransactionId: transactionId,
      processedBy,
      reason: reason || 'Order modification - additional payment collected',
    });
  },

  /**
   * Check if customer has credit option
   */
  async customerHasCreditOption(customerId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credit_limit, credit_used')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      return (data?.credit_limit || 0) > 0;
    } catch (error) {
      console.error('Error checking credit option:', error);
      return false;
    }
  },

  /**
   * Get customer's available credit
   */
  async getAvailableCredit(customerId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credit_limit, credit_used')
        .eq('id', customerId)
        .single();

      if (error) throw error;
      const creditLimit = data?.credit_limit || 0;
      const creditUsed = data?.credit_used || 0;
      return Math.max(0, creditLimit - creditUsed);
    } catch (error) {
      console.error('Error fetching available credit:', error);
      return 0;
    }
  },
};

export default PaymentAdjustmentService;
