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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Receipt,
  Loader2,
  CheckCircle,
  Plus,
  History,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PaymentAdjustmentService from "@/services/paymentAdjustmentService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreditMemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  orderId?: string;
  orderNumber?: string;
  orderTotal?: number;
  mode: 'issue' | 'apply' | 'view';
  onComplete?: (result: { success: boolean; memoId?: string; appliedAmount?: number }) => void;
}

export function CreditMemoDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  orderId,
  orderNumber,
  orderTotal,
  mode,
  onComplete,
}: CreditMemoDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [creditMemos, setCreditMemos] = useState<any[]>([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [activeTab, setActiveTab] = useState(mode === 'view' ? 'history' : mode);

  // Issue form state
  const [issueAmount, setIssueAmount] = useState("");
  const [issueReason, setIssueReason] = useState("");

  // Apply form state
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [applyAmount, setApplyAmount] = useState("");

  useEffect(() => {
    if (open) {
      loadCreditMemos();
      loadCreditBalance();
    }
  }, [open, customerId]);

  const loadCreditMemos = async () => {
    const result = await PaymentAdjustmentService.getCustomerCreditMemos(customerId);
    if (result.success && result.data) {
      setCreditMemos(result.data);
    }
  };

  const loadCreditBalance = async () => {
    const balance = await PaymentAdjustmentService.getCustomerCreditBalance(customerId);
    setCreditBalance(balance);
  };

  const handleIssueCreditMemo = async () => {
    const amount = parseFloat(issueAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (!issueReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please enter a reason for issuing this credit memo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await PaymentAdjustmentService.issueCreditMemo({
        customerId,
        amount,
        reason: issueReason,
        orderId,
      });

      if (result.success) {
        toast({
          title: "Credit memo issued",
          description: `Credit memo for $${amount.toFixed(2)} has been issued to ${customerName}`,
        });

        setIssueAmount("");
        setIssueReason("");
        loadCreditMemos();
        loadCreditBalance();

        onComplete?.({ success: true, memoId: result.data?.credit_memo_id });
      } else {
        throw new Error(result.error || 'Failed to issue credit memo');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to issue credit memo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCreditMemo = async () => {
    if (!selectedMemoId) {
      toast({
        title: "Select a credit memo",
        description: "Please select a credit memo to apply",
        variant: "destructive",
      });
      return;
    }

    if (!orderId) {
      toast({
        title: "No order selected",
        description: "Please select an order to apply the credit memo to",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(applyAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to apply",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await PaymentAdjustmentService.applyCreditMemo(
        selectedMemoId,
        orderId,
        amount,
        customerId // appliedBy - should be admin ID
      );

      if (result.success) {
        toast({
          title: "Credit memo applied",
          description: `$${amount.toFixed(2)} has been applied to order ${orderNumber}`,
        });

        setSelectedMemoId(null);
        setApplyAmount("");
        loadCreditMemos();
        loadCreditBalance();

        onComplete?.({ success: true, appliedAmount: amount });
        onOpenChange(false);
      } else {
        throw new Error(result.data?.error || 'Failed to apply credit memo');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply credit memo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      issued: { variant: "default", className: "bg-green-100 text-green-700" },
      partially_applied: { variant: "secondary", className: "bg-yellow-100 text-yellow-700" },
      fully_applied: { variant: "outline", className: "bg-gray-100 text-gray-700" },
      expired: { variant: "destructive", className: "bg-red-100 text-red-700" },
      cancelled: { variant: "destructive", className: "bg-red-100 text-red-700" },
    };

    const config = statusConfig[status] || statusConfig.issued;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-green-500" />
            Credit Memo Management
          </DialogTitle>
          <DialogDescription>
            Customer: {customerName} | Available Credit: ${creditBalance.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="issue" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Issue
            </TabsTrigger>
            <TabsTrigger value="apply" className="flex items-center gap-1" disabled={!orderId}>
              <DollarSign className="h-4 w-4" /> Apply
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-4 w-4" /> History
            </TabsTrigger>
          </TabsList>

          {/* Issue Credit Memo Tab */}
          <TabsContent value="issue" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="issueAmount">Amount ($)</Label>
                <Input
                  id="issueAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Enter amount"
                  value={issueAmount}
                  onChange={(e) => setIssueAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issueReason">Reason</Label>
                <Textarea
                  id="issueReason"
                  placeholder="Enter reason for issuing credit memo..."
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  rows={3}
                />
              </div>

              {orderId && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <p className="text-blue-700">
                    This credit memo will be linked to Order #{orderNumber}
                  </p>
                </div>
              )}

              <Button
                onClick={handleIssueCreditMemo}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Issuing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Issue Credit Memo
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Apply Credit Memo Tab */}
          <TabsContent value="apply" className="space-y-4 mt-4">
            {creditMemos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No available credit memos</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Applying to: <strong>Order #{orderNumber}</strong>
                    {orderTotal && <span> (Total: ${orderTotal.toFixed(2)})</span>}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Select Credit Memo:</Label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {creditMemos.map((memo) => (
                      <div
                        key={memo.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedMemoId === memo.id
                            ? 'border-green-500 bg-green-50'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          setSelectedMemoId(memo.id);
                          setApplyAmount(Math.min(memo.balance, orderTotal || memo.balance).toString());
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{memo.memo_number}</p>
                            <p className="text-xs text-gray-500">{memo.reason}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              ${memo.balance.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">available</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedMemoId && (
                  <div className="space-y-2">
                    <Label htmlFor="applyAmount">Amount to Apply ($)</Label>
                    <Input
                      id="applyAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Enter amount"
                      value={applyAmount}
                      onChange={(e) => setApplyAmount(e.target.value)}
                    />
                  </div>
                )}

                <Button
                  onClick={handleApplyCreditMemo}
                  disabled={loading || !selectedMemoId}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Apply Credit Memo
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            {creditMemos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No credit memo history</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Memo #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditMemos.map((memo) => (
                      <TableRow key={memo.id}>
                        <TableCell className="font-medium">{memo.memo_number}</TableCell>
                        <TableCell>${memo.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-green-600">${memo.balance.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(memo.status)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(memo.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreditMemoDialog;
