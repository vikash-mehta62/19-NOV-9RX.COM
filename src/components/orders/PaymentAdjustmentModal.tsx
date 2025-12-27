import { useState, useEffect } from "react";
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
  hasCredit: boolean;
  availableCredit: number;
  creditMemoBalance: number;
  orderData?: any; // Full order data for payment link
  onPaymentComplete: (result: {
    success: boolean;
    adjustmentType: string;
    transactionId?: string;
  }) => void;
}

type AdjustmentAction = 'collect_payment' | 'send_payment_link' | 'use_credit' | 'issue_credit_memo' | 'process_refund';

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
  hasCredit,
  availableCredit,
  creditMemoBalance,
  orderData,
  onPaymentComplete,
}: PaymentAdjustmentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AdjustmentAction | null>(null);
  const [reason, setReason] = useState("");
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [originalTransactionId, setOriginalTransactionId] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const differenceAmount = Number((newAmount - originalAmount).toFixed(2));
  const isIncrease = differenceAmount > 0;
  const absoluteDifference = Math.abs(differenceAmount);

  useEffect(() => {
    if (open) {
      if (isIncrease) {
        loadSavedCards();
      } else {
        loadOriginalTransaction();
      }
    }
  }, [open, isIncrease, customerId]);

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

  const handleSubmit = async () => {
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

      if (isIncrease) {
        if (selectedAction === 'collect_payment') {
          const card = savedCards.find((c: any) => c.id === selectedCard);
          
          if (!card) {
            throw new Error('Please select a payment method');
          }

          const paymentResult = await PaymentAdjustmentService.processGatewayPayment(
            absoluteDifference,
            'saved_card',
            {
              customerProfileId: card.customer_profile_id,
              paymentProfileId: card.payment_profile_id,
            },
            orderId,
            orderNumber
          );

          if (!paymentResult.success) {
            throw new Error(paymentResult.error || 'Payment failed');
          }

          transactionId = paymentResult.transactionId;

          // Record payment transaction
          await PaymentAdjustmentService.recordPaymentTransaction({
            profileId: customerId,
            orderId,
            transactionId,
            transactionType: 'additional_payment',
            amount: absoluteDifference,
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
            description: `Additional payment for order ${orderNumber}`,
            amount: absoluteDifference,
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
            reason || `Order ${orderNumber} modified - additional payment`
          );
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
            adjustment_amount: absoluteDifference,
            original_amount: originalAmount,
            paid_amount: originalAmount, // Amount already paid
            adjustment_reason: reason || `Order ${orderNumber} modified - additional payment required`,
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
              differenceAmount: absoluteDifference,
              paymentMethod: 'payment_link',
              paymentStatus: 'pending',
              reason: reason || `Order ${orderNumber} modified - payment link sent`,
            });

            toast({
              title: "Payment Link Sent",
              description: `Payment link for $${absoluteDifference.toFixed(2)} sent to ${customerEmail || orderData?.customerInfo?.email}`,
            });
          } catch (emailError: any) {
            throw new Error(emailError.message || 'Failed to send payment link');
          } finally {
            setSendingEmail(false);
          }
        } else if (selectedAction === 'use_credit' && hasCredit) {
          result = await PaymentAdjustmentService.createAdjustment({
            orderId,
            customerId,
            adjustmentType: 'additional_payment',
            originalAmount,
            newAmount,
            differenceAmount: absoluteDifference,
            paymentMethod: 'credit',
            paymentStatus: 'completed',
            reason: reason || `Order ${orderNumber} modified - charged to credit`,
          });
        } else {
          throw new Error('Invalid action selected');
        }
      } else {
        if (selectedAction === 'issue_credit_memo') {
          result = await PaymentAdjustmentService.issueCreditMemo({
            customerId,
            amount: absoluteDifference,
            reason: reason || `Order ${orderNumber} modified - credit memo issued`,
            orderId,
          });

          if (result.success) {
            await PaymentAdjustmentService.createAdjustment({
              orderId,
              customerId,
              adjustmentType: 'credit_memo_issued',
              originalAmount,
              newAmount,
              differenceAmount: -absoluteDifference,
              paymentStatus: 'completed',
              creditMemoId: result.data?.credit_memo_id,
              reason: reason || `Order ${orderNumber} modified - credit memo issued`,
            });
          }
        } else if (selectedAction === 'process_refund') {
          result = await PaymentAdjustmentService.createRefund({
            orderId,
            customerId,
            amount: absoluteDifference,
            reason: reason || `Order ${orderNumber} modified - refund processed`,
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
              amount: absoluteDifference,
              paymentMethodType: 'card_refund',
              status: result.data?.status === 'completed' ? 'completed' : 'pending',
            });

            // Record account transaction for refund
            await PaymentAdjustmentService.recordAccountTransaction({
              customerId,
              orderId,
              transactionType: 'debit',
              referenceType: 'refund',
              description: `Refund for order ${orderNumber}`,
              amount: absoluteDifference,
              processedBy: customerId,
              transactionId,
            });
            
            await PaymentAdjustmentService.createAdjustment({
              orderId,
              customerId,
              adjustmentType: 'partial_refund',
              originalAmount,
              newAmount,
              differenceAmount: -absoluteDifference,
              paymentStatus: 'completed',
              refundId: result.data?.id,
              paymentTransactionId: transactionId,
              reason: reason || `Order ${orderNumber} modified - refund processed`,
            });
          }
        } else {
          throw new Error('Invalid action selected');
        }
      }

      if (result.success) {
        toast({
          title: "Payment adjustment completed",
          description: isIncrease 
            ? `Additional payment of $${absoluteDifference.toFixed(2)} processed`
            : `Credit/refund of $${absoluteDifference.toFixed(2)} processed`,
        });

        onPaymentComplete({
          success: true,
          adjustmentType: selectedAction,
          transactionId: transactionId || result.data?.id,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
              <span className="font-medium text-green-600">${originalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">New Amount:</span>
              <span className="font-medium">${newAmount.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>{isIncrease ? 'Balance Due:' : 'Refund/Credit:'}</span>
              <span className={isIncrease ? 'text-red-600' : 'text-green-600'}>
                {isIncrease ? '+' : '-'}${absoluteDifference.toFixed(2)}
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
          {!isIncrease && !originalTransactionId && selectedAction === 'process_refund' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No original transaction found. Gateway refund may fail. Consider issuing a credit memo instead.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Selection */}
          <div className="space-y-3">
            <Label>Select Action:</Label>
            
            {isIncrease ? (
              <RadioGroup
                value={selectedAction || ''}
                onValueChange={(value) => setSelectedAction(value as AdjustmentAction)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="collect_payment" id="collect_payment" />
                  <Label htmlFor="collect_payment" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="font-medium">Charge Saved Card</p>
                      <p className="text-xs text-gray-500">Charge customer's saved card for ${absoluteDifference.toFixed(2)}</p>
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
                        Email payment link to {customerEmail || 'customer'} for ${absoluteDifference.toFixed(2)}
                      </p>
                    </div>
                  </Label>
                </div>

                {hasCredit && availableCredit >= absoluteDifference && (
                  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="use_credit" id="use_credit" />
                    <Label htmlFor="use_credit" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Building2 className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="font-medium">Use Credit Line</p>
                        <p className="text-xs text-gray-500">
                          Available: ${availableCredit.toFixed(2)} - Will use ${absoluteDifference.toFixed(2)}
                        </p>
                      </div>
                    </Label>
                  </div>
                )}

                {hasCredit && availableCredit < absoluteDifference && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Insufficient credit. Available: ${availableCredit.toFixed(2)}, Required: ${absoluteDifference.toFixed(2)}
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
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="issue_credit_memo" id="issue_credit_memo" />
                  <Label htmlFor="issue_credit_memo" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Receipt className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">Issue Credit Memo</p>
                      <p className="text-xs text-gray-500">
                        Customer can use ${absoluteDifference.toFixed(2)} on future orders
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
                        Refund ${absoluteDifference.toFixed(2)} via Authorize.net
                        {originalTransactionId && <span className="text-green-600"> ✓ Transaction found</span>}
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            )}
          </div>

          {/* Saved Card Selection (for collect_payment) */}
          {selectedAction === 'collect_payment' && savedCards.length > 0 && (
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
            </div>
          )}

          {selectedAction === 'collect_payment' && savedCards.length === 0 && (
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
              !selectedAction || 
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
                {selectedAction === 'send_payment_link' ? (
                  <Mail className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {selectedAction === 'send_payment_link' 
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
  );
}

export default PaymentAdjustmentModal;
