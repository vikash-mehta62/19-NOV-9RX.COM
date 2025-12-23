import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  FileText, DollarSign, Calendar, AlertTriangle, 
  CheckCircle, Clock, Loader2, CreditCard, Receipt
} from "lucide-react";

interface CreditInvoice {
  id: string;
  invoice_number: string;
  original_amount: number;
  penalty_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  invoice_date: string;
  due_date: string;
  paid_date: string | null;
  status: string;
  days_overdue: number;
  penalty_months: number;
}

const CreditInvoicesList = () => {
  const { toast } = useToast();
  const userProfile = useSelector((state: RootState) => state.user.profile);
  
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<CreditInvoice[]>([]);
  const [creditLine, setCreditLine] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<CreditInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  useEffect(() => {
    if (userProfile?.id) {
      fetchData();
    }
  }, [userProfile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch credit line
      const { data: creditLineData } = await supabase
        .from("user_credit_lines")
        .select("*")
        .eq("user_id", userProfile?.id)
        .single();

      setCreditLine(creditLineData);

      // Fetch invoices
      const { data: invoicesData, error } = await supabase
        .from("credit_invoices")
        .select("*")
        .eq("user_id", userProfile?.id)
        .order("due_date", { ascending: true });

      if (error) throw error;
      setInvoices(invoicesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0 || amount > selectedInvoice.balance_due) {
      toast({
        title: "Invalid Amount",
        description: `Please enter an amount between $0.01 and $${selectedInvoice.balance_due.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("process_credit_payment", {
        p_invoice_id: selectedInvoice.id,
        p_amount: amount,
        p_payment_method: "card",
        p_transaction_id: `TXN-${Date.now()}`,
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Payment Successful!",
          description: `$${amount.toFixed(2)} has been applied to invoice ${selectedInvoice.invoice_number}`,
        });
        setShowPaymentDialog(false);
        setSelectedInvoice(null);
        setPaymentAmount("");
        fetchData();
      } else {
        throw new Error(data?.error || "Payment failed");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Unable to process payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string, daysOverdue: number) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />{daysOverdue} Days Overdue</Badge>;
      case "partial":
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const totalDue = invoices.reduce((sum, inv) => sum + inv.balance_due, 0);
  const overdueInvoices = invoices.filter(inv => inv.status === "overdue");
  const totalPenalties = invoices.reduce((sum, inv) => sum + inv.penalty_amount, 0);

  return (
    <div className="space-y-6">
      {/* Credit Summary */}
      {creditLine && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="p-4">
              <p className="text-sm text-emerald-600 mb-1">Credit Limit</p>
              <p className="text-2xl font-bold text-emerald-700">
                ${creditLine.credit_limit?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-600 mb-1">Available</p>
              <p className="text-2xl font-bold text-blue-700">
                ${creditLine.available_credit?.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-4">
              <p className="text-sm text-amber-600 mb-1">Total Due</p>
              <p className="text-2xl font-bold text-amber-700">
                ${totalDue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className={`bg-gradient-to-br ${totalPenalties > 0 ? 'from-red-50 to-pink-50 border-red-200' : 'from-gray-50 to-slate-50 border-gray-200'}`}>
            <CardContent className="p-4">
              <p className={`text-sm ${totalPenalties > 0 ? 'text-red-600' : 'text-gray-600'} mb-1`}>Penalties</p>
              <p className={`text-2xl font-bold ${totalPenalties > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                ${totalPenalties.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overdue Warning */}
      {overdueInvoices.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">
                  {overdueInvoices.length} Overdue Invoice{overdueInvoices.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-600">
                  A 3% monthly penalty is being applied to overdue balances. Pay now to avoid additional charges.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Credit Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No credit invoices yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className={`border rounded-xl p-4 transition-all hover:shadow-md ${
                    invoice.status === "overdue" ? "border-red-200 bg-red-50/50" : 
                    invoice.status === "paid" ? "border-emerald-200 bg-emerald-50/50" : 
                    "border-gray-200"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                        {getStatusBadge(invoice.status, invoice.days_overdue)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Invoice Date</p>
                          <p className="font-medium">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Due Date</p>
                          <p className={`font-medium ${invoice.status === 'overdue' ? 'text-red-600' : ''}`}>
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Original Amount</p>
                          <p className="font-medium">${invoice.original_amount.toFixed(2)}</p>
                        </div>
                        {invoice.penalty_amount > 0 && (
                          <div>
                            <p className="text-red-500">Penalty ({invoice.penalty_months} mo)</p>
                            <p className="font-medium text-red-600">+${invoice.penalty_amount.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Balance Due</p>
                        <p className={`text-2xl font-bold ${invoice.balance_due > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          ${invoice.balance_due.toFixed(2)}
                        </p>
                      </div>
                      {invoice.status !== "paid" && (
                        <Button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setPaymentAmount(invoice.balance_due.toFixed(2));
                            setShowPaymentDialog(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Payment</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Invoice</span>
                  <span className="font-medium">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Original Amount</span>
                  <span>${selectedInvoice.original_amount.toFixed(2)}</span>
                </div>
                {selectedInvoice.penalty_amount > 0 && (
                  <div className="flex justify-between mb-2 text-red-600">
                    <span>Penalty</span>
                    <span>+${selectedInvoice.penalty_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span>Balance Due</span>
                  <span className="text-emerald-600">${selectedInvoice.balance_due.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Payment Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedInvoice.balance_due}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentAmount((selectedInvoice.balance_due / 2).toFixed(2))}
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentAmount(selectedInvoice.balance_due.toFixed(2))}
                  >
                    Full Amount
                  </Button>
                </div>
              </div>

              {selectedInvoice.penalty_amount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Payments are first applied to penalties, then to the principal balance.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing || !paymentAmount}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ${paymentAmount || "0.00"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditInvoicesList;
