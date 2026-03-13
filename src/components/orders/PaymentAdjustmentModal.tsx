import { useState, useEffect } from "react";
import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Building2,
  Receipt,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Wallet,
  Loader2,
  CheckCircle,
  Mail,
  Link as LinkIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PaymentAdjustmentService from "@/services/paymentAdjustmentService";
import axios from "../../../axiosconfig";
import { supabase } from "@/integrations/supabase/client";
import { calculatePaymentStatusAfterAdjustment } from "@/utils/paymentStatusCalculator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as AlertDialogFooterActions,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getPaymentExperienceSettings, type PaymentExperienceSettings } from "@/config/paymentConfig";

interface PaymentAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  originalAmount: number;
  newAmount: number;
  paidAmount: number; // ACTUAL paid amount from order
  hasCredit: boolean;
  availableCredit: number;
  creditMemoBalance: number;
  orderData?: any; // Full order data for payment link
  onPaymentComplete: (result: {
    success: boolean;
    adjustmentType: string;
    transactionId?: string;
    adjustmentKey?: string;
  }) => void;
}

type AdjustmentAction = 'none' | 'collect_payment' | 'send_payment_link' | 'use_credit' | 'issue_credit_memo' | 'process_refund';

export function PaymentAdjustmentModal({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  customerId,
  customerName,
  customerEmail,
  originalAmount,
  newAmount,
  paidAmount,
  hasCredit,
  availableCredit,
  creditMemoBalance,
  orderData,
  onPaymentComplete,
}: PaymentAdjustmentModalProps) {
  const { toast } = useToast();
  
  // Ensure orderNumber is never undefined
  const safeOrderNumber = orderNumber || orderId || 'ORDER';
  
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AdjustmentAction | null>(null);
  const [reason, setReason] = useState("");
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [originalTransactionId, setOriginalTransactionId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentPaidAmount, setCurrentPaidAmount] = useState<number>(0);
  const [showCardFeeConfirm, setShowCardFeeConfirm] = useState(false);
  const [feeSettings, setFeeSettings] = useState<PaymentExperienceSettings>({
    cardProcessingFeeEnabled: false,
    cardProcessingFeePercentage: 0,
    cardProcessingFeePassToCustomer: false,
    invoiceDefaultNotes: "",
  });
  const feeConfirmBypassRef = useRef(false);

  const differenceAmount = Number((newAmount - originalAmount).toFixed(2));
  const isIncrease = differenceAmount > 0;
  const balanceDueAmount = Math.max(0, Number((newAmount - currentPaidAmount).toFixed(2)));
  const cardFeeApplies =
    selectedAction === "collect_payment" &&
    feeSettings.cardProcessingFeeEnabled &&
    feeSettings.cardProcessingFeePassToCustomer &&
    feeSettings.cardProcessingFeePercentage > 0;
  const cardProcessingFeeAmount = cardFeeApplies
    ? Number(((balanceDueAmount * feeSettings.cardProcessingFeePercentage) / 100).toFixed(2))
    : 0;
  const processorChargeAmount = Number((balanceDueAmount + cardProcessingFeeAmount).toFixed(2));
  const refundCreditAmount = Math.max(0, Number((currentPaidAmount - newAmount).toFixed(2)));
  const actionAmount = isIncrease ? balanceDueAmount : refundCreditAmount;
  const isZeroAdjustment = actionAmount <= 0;

  useEffect(() => {
    if (open) {
      loadOrderData();
      if (isIncrease) {
        loadSavedCards();
      } else {
        loadOriginalTransaction();
      }
    }
  }, [open, isIncrease, customerId]);

  useEffect(() => {
    const loadFeeSettings = async () => {
      const settings = await getPaymentExperienceSettings();
      setFeeSettings(settings);
    };

    void loadFeeSettings();
  }, []);

  const loadOrderData = async () => {
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('paid_amount')
        .eq('id', orderId)
        .single();
      
      const paidFromDb = Number(order?.paid_amount || 0);
      setCurrentPaidAmount(paidFromDb > 0 ? paidFromDb : Number(paidAmount || 0));
    } catch (error) {
      console.error('Error loading order data:', error);
      setCurrentPaidAmount(Number(paidAmount || 0));
    }
  };

  const loadSavedCards = async () => {
    const cards = await PaymentAdjustmentService.getCustomerSavedCards(customerId);
    setSavedCards(cards);
    if (cards.length > 0) {
      const defaultCard = cards.find((c: any) => c.is_default) || cards[0];
      setSelectedCard(defaultCard.id);
    }
  };

  const loadOriginalTransaction = async () => {
    const { transactionId } = await PaymentAdjustmentService.getOrderTransactionId(orderId);
    setOriginalTransactionId(transactionId || null);
  };

  const saveOrderOnly = async () => {
    const newPaymentStatus = calculatePaymentStatusAfterAdjustment(
      newAmount,
      currentPaidAmount
    );

    try {
      await supabase
        .from('orders')
        .update({ payment_status: newPaymentStatus })
        .eq('id', orderId);
    } catch (error) {
      console.error('Error updating payment status:', error);
    }

    toast({
      title: "Order Saved",
      description: "Order items updated. Payment adjustment pending.",
    });

    onPaymentComplete({
      success: true,
      adjustmentType: 'none',
    });

    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (selectedAction === 'collect_payment' && cardProcessingFeeAmount > 0 && !feeConfirmBypassRef.current) {
      setShowCardFeeConfirm(true);
      return;
    }

    feeConfirmBypassRef.current = false;

    if (isZeroAdjustment || selectedAction === 'none') {
      await saveOrderOnly();
      return;
    }

    if (!selectedAction) {
      toast({
        title: "Select an action",
        description: "Please select how you want to handle this payment adjustment",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let result: { success: boolean; data?: any; error?: string };
      let transactionId: string | undefined;
      let newPaymentStatus: string;

      // Guard against accidental double-processing of the exact same adjustment.
      if (selectedAction === "issue_credit_memo" || selectedAction === "process_refund") {
        const adjustmentType = selectedAction === "issue_credit_memo" ? "credit_memo_issued" : "partial_refund";
        const signedDifference = -refundCreditAmount;

        const alreadyProcessed = await PaymentAdjustmentService.hasEquivalentCompletedAdjustment({
          orderId,
          adjustmentType,
          originalAmount,
          newAmount,
          differenceAmount: signedDifference,
        });

        if (alreadyProcessed) {
          toast({
            title: "Adjustment already processed",
            description: "This same adjustment was already completed and will not be applied again.",
          });

          onPaymentComplete({
            success: true,
            adjustmentType: "none",
          });

          onOpenChange(false);
          return;
        }
      }

      if (isIncrease) {
        if (selectedAction === 'collect_payment') {
          const card = savedCards.find((c: any) => c.id === selectedCard);
          
          if (!card) {
            throw new Error('Please select a payment method');
          }

          console.log('Processing payment with card:', card);
          console.log('Order details:', { orderId, orderNumber, customerId, balanceDueAmount });

          // Check if this is a local test card
          const isLocalCard = !card.customer_profile_id || card.payment_profile_id?.startsWith('local_');
          
          let paymentResult: { success: boolean; transactionId?: string; error?: string };

          if (isLocalCard) {
            // Mock payment for local test cards
            console.log('🧪 Using local test card - simulating payment');
            paymentResult = {
              success: true,
              transactionId: `TEST_${Date.now()}`
            };
            transactionId = paymentResult.transactionId;
          } else {
            // Real Authorize.net payment
            console.log('💳 Using real Authorize.net card');
            paymentResult = await PaymentAdjustmentService.processGatewayPayment(
              processorChargeAmount,
              'saved_card',
              {
                customerProfileId: card.customer_profile_id,
                paymentProfileId: card.payment_profile_id,
              },
              orderId,
              orderNumber || orderId
            );

            if (!paymentResult.success) {
              throw new Error(paymentResult.error || 'Payment failed');
            }

            transactionId = paymentResult.transactionId;
          }

          console.log('Payment result:', paymentResult);

          // Record payment transaction
          await PaymentAdjustmentService.recordPaymentTransaction({
            profileId: customerId,
            orderId,
            transactionId,
            transactionType: 'additional_payment',
            amount: processorChargeAmount,
            paymentMethodType: 'saved_card',
            status: 'completed',
            cardLastFour: card.card_last_four,
            cardType: card.card_type,
          });

          // Record account transaction
          await PaymentAdjustmentService.recordAccountTransaction({
            customerId,
            orderId,
            transactionType: 'credit',
            referenceType: 'payment',
            description: `Additional payment for order ${orderNumber || orderId}`,
            amount: balanceDueAmount,
            processedBy: customerId,
            transactionId,
          });

          result = await PaymentAdjustmentService.processAdditionalPayment(
            orderId,
            customerId,
            originalAmount,
            newAmount,
            'saved_card',
            transactionId || `TXN_${Date.now()}`,
            customerId,
            reason || `Order ${orderNumber || orderId} modified - additional payment`
          );

          // Calculate new payment status - payment collected, should be paid
          newPaymentStatus = calculatePaymentStatusAfterAdjustment(
            newAmount,
            currentPaidAmount + balanceDueAmount // new paid amount after charging card
          );

          // Update order payment status
          await supabase
            .from('orders')
            .update({ 
              payment_status: newPaymentStatus,
              paid_amount: currentPaidAmount + balanceDueAmount 
            })
            .eq('id', orderId);
        } else if (selectedAction === 'send_payment_link') {
          // Send payment link via email
          setSendingEmail(true);
          
          // Prepare order data for payment link email
          const paymentLinkData = {
            id: orderId,
            order_number: orderNumber,
            customerInfo: {
              name: customerName,
              email: customerEmail || orderData?.customerInfo?.email,
              phone: orderData?.customerInfo?.phone || '',
            },
            items: orderData?.items || [],
            total: newAmount,
            total_amount: newAmount,
            tax_amount: orderData?.tax_amount || 0,
            shipping_cost: orderData?.shipping_cost || 0,
            date: new Date().toISOString(),
            status: 'pending_additional_payment',
            adjustment_amount: balanceDueAmount,
            original_amount: originalAmount,
            paid_amount: paidAmount, // Amount already paid
            adjustment_reason: reason || `Order ${orderNumber || orderId} modified - additional payment required`,
          };

          try {
            await axios.post("/paynow-user", paymentLinkData);
            
            // Create adjustment record with pending status
            result = await PaymentAdjustmentService.createAdjustment({
              orderId,
              customerId,
              adjustmentType: 'additional_payment',
              originalAmount,
              newAmount,
              differenceAmount: balanceDueAmount,
              paymentMethod: 'payment_link',
              paymentStatus: 'pending',
              reason: reason || `Order ${orderNumber || orderId} modified - payment link sent`,
            });

            toast({
              title: "Payment Link Sent",
              description: `Payment link for $${balanceDueAmount.toFixed(2)} sent to ${customerEmail || orderData?.customerInfo?.email}`,
            });
          } catch (emailError: any) {
            throw new Error(emailError.message || 'Failed to send payment link');
          } finally {
            setSendingEmail(false);
          }
        } else if (selectedAction === 'use_credit' && hasCredit) {
          // Check if sufficient credit is available
          if (availableCredit < balanceDueAmount) {
            throw new Error(`Insufficient credit. Available: $${availableCredit.toFixed(2)}, Required: $${balanceDueAmount.toFixed(2)}`);
          }

          const { data: rpcResult, error: rpcError } = await supabase.rpc(
            "apply_credit_line_order_adjustment",
            {
              p_order_id: orderId,
              p_customer_id: customerId,
              p_adjustment_amount: balanceDueAmount,
              p_original_amount: originalAmount,
              p_new_amount: newAmount,
              p_reason: reason || `Order ${orderNumber || orderId} modified - charged to credit line`,
            }
          );

          if (rpcError) {
            throw rpcError;
          }

          if (!rpcResult?.success) {
            throw new Error(rpcResult?.message || 'Failed to apply credit line adjustment');
          }

          result = { success: true, data: rpcResult };

          toast({
            title: "Credit Applied",
            description: `$${balanceDueAmount.toFixed(2)} charged to credit line. Credit Invoice: ${rpcResult.credit_invoice_number || 'Created'}`,
          });
        } else {
          throw new Error('Invalid action selected');
        }
      } else {
        if (selectedAction === 'issue_credit_memo') {
          result = await PaymentAdjustmentService.issueCreditMemo({
            customerId,
            amount: refundCreditAmount,
            reason: reason || `Order ${orderNumber || orderId} modified - credit memo issued`,
            orderId,
          });

          if (result.success) {
            await PaymentAdjustmentService.createAdjustment({
              orderId,
              customerId,
              adjustmentType: 'credit_memo_issued',
              originalAmount,
              newAmount,
              differenceAmount: -refundCreditAmount,
              paymentStatus: 'completed',
              creditMemoId: result.data?.credit_memo_id,
              reason: reason || `Order ${orderNumber || orderId} modified - credit memo issued`,
            });
          }
        } else if (selectedAction === 'process_refund') {
          result = await PaymentAdjustmentService.createRefund({
            orderId,
            customerId,
            amount: refundCreditAmount,
            reason: reason || `Order ${orderNumber || orderId} modified - refund processed`,
            refundMethod: 'original_payment',
            originalPaymentId: originalTransactionId || undefined,
          });

          if (result.success) {
            transactionId = result.data?.gateway_refund_id;
            
            // Record refund transaction
            await PaymentAdjustmentService.recordPaymentTransaction({
              profileId: customerId,
              orderId,
              transactionId,
              transactionType: 'refund',
              amount: refundCreditAmount,
              paymentMethodType: 'card_refund',
              status: result.data?.status === 'completed' ? 'completed' : 'pending',
            });

            // Record account transaction for refund
            await PaymentAdjustmentService.recordAccountTransaction({
              customerId,
              orderId,
              transactionType: 'debit',
              referenceType: 'refund',
              description: `Refund for order ${orderNumber || orderId}`,
              amount: refundCreditAmount,
              processedBy: customerId,
              transactionId,
            });
            
            await PaymentAdjustmentService.createAdjustment({
              orderId,
              customerId,
              adjustmentType: 'partial_refund',
              originalAmount,
              newAmount,
              differenceAmount: -refundCreditAmount,
              paymentStatus: 'completed',
              refundId: result.data?.id,
              paymentTransactionId: transactionId,
              reason: reason || `Order ${orderNumber || orderId} modified - refund processed`,
            });
          }
        } else {
          throw new Error('Invalid action selected');
        }

        // Normalize paid amount after decrease adjustment so the same
        // refund/credit is not prompted again on subsequent saves.
        if (result.success) {
          const adjustedPaidAmount = Math.max(0, Number((currentPaidAmount - refundCreditAmount).toFixed(2)));
          const updatedPaymentStatus = calculatePaymentStatusAfterAdjustment(
            newAmount,
            adjustedPaidAmount
          );

          await supabase
            .from('orders')
            .update({
              paid_amount: adjustedPaidAmount,
              payment_status: updatedPaymentStatus,
            })
            .eq('id', orderId);

          await supabase
            .from('invoices')
            .update({
              paid_amount: adjustedPaidAmount,
              payment_status: updatedPaymentStatus,
            })
            .eq('order_id', orderId);
        }
      }

      if (result.success) {
        const adjustmentKey = [
          orderId,
          selectedAction,
          originalAmount.toFixed(2),
          newAmount.toFixed(2),
          actionAmount.toFixed(2),
          transactionId || result.data?.id || 'no_txn',
        ].join(':');

        toast({
          title: "Payment adjustment completed",
          description: isIncrease 
            ? `Additional payment of $${balanceDueAmount.toFixed(2)} processed`
            : `Credit/refund of $${refundCreditAmount.toFixed(2)} processed`,
        });

        onPaymentComplete({
          success: true,
          adjustmentType: selectedAction,
          transactionId: transactionId || result.data?.id,
          adjustmentKey,
        });

        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to process adjustment');
      }
    } catch (error: any) {
      console.error('Payment adjustment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process payment adjustment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIncrease ? (
              <ArrowUp className="h-5 w-5 text-red-500" />
            ) : (
              <ArrowDown className="h-5 w-5 text-green-500" />
            )}
            Payment Adjustment Required
          </DialogTitle>
          <DialogDescription>
            Order {orderNumber} total has changed. Please select how to handle the payment difference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Original Amount:</span>
              <span className="font-medium">${originalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid Amount:</span>
              <span className="font-medium text-green-600">${(currentPaidAmount || paidAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">New Amount:</span>
              <span className="font-medium">${newAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>{isIncrease ? 'Balance Due:' : 'Refund/Credit:'}</span>
              <span className={isIncrease ? 'text-red-600' : 'text-green-600'}>
                {isIncrease ? '+' : '-'}${actionAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span>Customer:</span>
            <Badge variant="outline">{customerName}</Badge>
            {hasCredit && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Credit: ${availableCredit.toFixed(2)}
              </Badge>
            )}
            {creditMemoBalance > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                Store Credit: ${creditMemoBalance.toFixed(2)}
              </Badge>
            )}
          </div>

          {/* Refund Warning - No Transaction ID */}
          {!isZeroAdjustment && !isIncrease && !originalTransactionId && selectedAction === 'process_refund' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No original transaction found. Gateway refund may fail. Consider issuing a credit memo instead.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Selection */}
          {!isZeroAdjustment && (
            <div className="space-y-3">
              <Label>Select Action:</Label>
              
              {isIncrease ? (
              <RadioGroup
                value={selectedAction || ''}
                onValueChange={(value) => setSelectedAction(value as AdjustmentAction)}
                className="space-y-2"
              >
                {/* None - Save Only Option */}
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer border-gray-300">
                  <RadioGroupItem value="none" id="none_increase" />
                  <Label htmlFor="none_increase" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CheckCircle className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">None - Save Order Only</p>
                      <p className="text-xs text-gray-500">Save order items without processing payment now</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="collect_payment" id="collect_payment" />
                  <Label htmlFor="collect_payment" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">Charge Saved Card</p>
                      <p className="text-xs text-gray-500">
                        Charge customer's saved card for ${balanceDueAmount.toFixed(2)}
                        {cardProcessingFeeAmount > 0 ? ` + $${cardProcessingFeeAmount.toFixed(2)} card fee` : ''}
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="send_payment_link" id="send_payment_link" />
                  <Label htmlFor="send_payment_link" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Mail className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="font-medium">Send Payment Link</p>
                      <p className="text-xs text-gray-500">
                        Email payment link to {customerEmail || 'customer'} for ${balanceDueAmount.toFixed(2)}
                      </p>
                    </div>
                  </Label>
                </div>

                {hasCredit && availableCredit >= balanceDueAmount && (
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="use_credit" id="use_credit" />
                    <Label htmlFor="use_credit" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Building2 className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="font-medium">Use Credit Line</p>
                        <p className="text-xs text-gray-500">
                          Available: ${availableCredit.toFixed(2)} - Will use ${balanceDueAmount.toFixed(2)}
                        </p>
                      </div>
                    </Label>
                  </div>
                )}

                {hasCredit && availableCredit < balanceDueAmount && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Insufficient credit. Available: ${availableCredit.toFixed(2)}, Required: ${balanceDueAmount.toFixed(2)}
                    </AlertDescription>
                  </Alert>
                )}
              </RadioGroup>
            ) : (
              <RadioGroup
                value={selectedAction || ''}
                onValueChange={(value) => setSelectedAction(value as AdjustmentAction)}
                className="space-y-2"
              >
                {/* None - Save Only Option */}
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer border-gray-300">
                  <RadioGroupItem value="none" id="none_decrease" />
                  <Label htmlFor="none_decrease" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CheckCircle className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="font-medium">None - Save Order Only</p>
                      <p className="text-xs text-gray-500">Save order items without processing refund/credit now</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="issue_credit_memo" id="issue_credit_memo" />
                  <Label htmlFor="issue_credit_memo" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Receipt className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">Issue Credit Memo</p>
                      <p className="text-xs text-gray-500">
                        Customer can use ${refundCreditAmount.toFixed(2)} on future orders
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="process_refund" id="process_refund" />
                  <Label htmlFor="process_refund" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">Process Refund to Card</p>
                      <p className="text-xs text-gray-500">
                        Refund ${refundCreditAmount.toFixed(2)} via Authorize.net
                        {originalTransactionId && <span className="text-green-600"> ✓ Transaction found</span>}
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            )}
            </div>
          )}

          {/* Saved Card Selection (for collect_payment) */}
          {!isZeroAdjustment && selectedAction === 'collect_payment' && savedCards.length > 0 && (
            <div className="space-y-2">
              <Label>Select Payment Card:</Label>
              <Select value={selectedCard || ''} onValueChange={setSelectedCard}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a saved card" />
                </SelectTrigger>
                <SelectContent>
                  {savedCards.map((card: any) => (
                    <SelectItem key={card.id} value={card.id}>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>{card.card_type?.toUpperCase()} •••• {card.card_last_four}</span>
                        {card.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-amber-100 p-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-900">
                      Card charge includes an extra processing fee
                    </p>
                    <p className="text-amber-800">
                      This saved-card charge adds the configured {feeSettings.cardProcessingFeePercentage}% fee. Only the additional amount due is applied to the order balance.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Applied to order</span>
                    <span className="font-semibold text-slate-900">${balanceDueAmount.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-slate-600">Card processing fee</span>
                    <span className="font-semibold text-amber-700">${cardProcessingFeeAmount.toFixed(2)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-amber-100 pt-3 font-semibold">
                    <span className="text-slate-900">Total charged today</span>
                    <span className="text-lg text-amber-700">${processorChargeAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isZeroAdjustment && selectedAction === 'collect_payment' && savedCards.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No saved cards found for this customer. Please use credit line or contact customer for payment.
              </AlertDescription>
            </Alert>
          )}

          {/* Reason/Notes */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason/Notes (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for this adjustment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || sendingEmail}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              loading || 
              sendingEmail || 
              (!isZeroAdjustment && !selectedAction) || 
              (selectedAction === 'collect_payment' && savedCards.length === 0) ||
              (selectedAction === 'send_payment_link' && !customerEmail && !orderData?.customerInfo?.email)
            }
          >
            {loading || sendingEmail ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {sendingEmail ? 'Sending Email...' : 'Processing...'}
              </>
            ) : (
              <>
                {isZeroAdjustment || selectedAction === 'none' ? (
                  <CheckCircle className="mr-2 h-4 w-4" />
                ) : selectedAction === 'send_payment_link' ? (
                  <Mail className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {isZeroAdjustment
                  ? 'Save Order'
                  : selectedAction === 'none'
                  ? 'Save Order'
                  : selectedAction === 'send_payment_link' 
                    ? 'Send Payment Link' 
                    : isIncrease 
                      ? 'Process Payment' 
                      : 'Process Adjustment'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={showCardFeeConfirm} onOpenChange={setShowCardFeeConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm saved-card charge</AlertDialogTitle>
          <AlertDialogDescription>
            This additional payment includes the configured credit-card processing fee.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="rounded-xl border bg-slate-50 p-4 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span>Additional amount applied</span>
            <span className="font-medium">${balanceDueAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Card fee ({feeSettings.cardProcessingFeePercentage}%)</span>
            <span className="font-medium">${cardProcessingFeeAmount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2 font-semibold">
            <span>Total charged</span>
            <span>${processorChargeAmount.toFixed(2)}</span>
          </div>
        </div>
        <AlertDialogFooterActions>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={async () => {
              feeConfirmBypassRef.current = true;
              setShowCardFeeConfirm(false);
              await handleSubmit();
            }}
          >
            Continue and charge ${processorChargeAmount.toFixed(2)}
          </AlertDialogAction>
        </AlertDialogFooterActions>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

export default PaymentAdjustmentModal;
