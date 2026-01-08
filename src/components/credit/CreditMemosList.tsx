import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Receipt, Calendar, ArrowRight, Info } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreditMemo {
  id: string;
  memo_number: string;
  amount: number;
  balance: number;
  applied_amount: number;
  reason: string;
  status: string;
  created_at: string;
  expires_at: string;
  order_id?: string;
  orders?: { order_number: string } | null;
}

interface CreditMemoApplication {
  id: string;
  applied_amount: number;
  created_at: string;
  order_id: string;
  orders?: { order_number: string } | null;
}

const CreditMemosList = () => {
  const [creditMemos, setCreditMemos] = useState<CreditMemo[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Record<string, CreditMemoApplication[]>>({});

  useEffect(() => {
    fetchCreditMemos();
  }, []);

  const fetchCreditMemos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch credit memos
      const { data: memos, error } = await supabase
        .from("credit_memos")
        .select(`
          *,
          orders:order_id(order_number)
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCreditMemos(memos || []);

      // Calculate total available balance
      const availableBalance = (memos || [])
        .filter(m => m.status === 'issued' || m.status === 'partially_applied')
        .reduce((sum, m) => sum + (m.balance || 0), 0);
      setTotalBalance(availableBalance);

      // Fetch applications for each memo
      const memoIds = (memos || []).map(m => m.id);
      if (memoIds.length > 0) {
        const { data: apps } = await supabase
          .from("credit_memo_applications")
          .select(`
            *,
            orders:order_id(order_number)
          `)
          .in("credit_memo_id", memoIds)
          .order("created_at", { ascending: false });

        // Group applications by memo ID
        const groupedApps: Record<string, CreditMemoApplication[]> = {};
        (apps || []).forEach(app => {
          if (!groupedApps[app.credit_memo_id]) {
            groupedApps[app.credit_memo_id] = [];
          }
          groupedApps[app.credit_memo_id].push(app);
        });
        setApplications(groupedApps);
      }
    } catch (error) {
      console.error("Error fetching credit memos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "issued":
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case "partially_applied":
        return <Badge className="bg-blue-100 text-blue-800">Partially Used</Badge>;
      case "fully_applied":
        return <Badge className="bg-gray-100 text-gray-800">Fully Used</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Expired</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Available Credit Memo Balance</p>
              <p className="text-3xl font-bold mt-1">${totalBalance.toFixed(2)}</p>
              <p className="text-emerald-100 text-xs mt-2">
                Use this balance during checkout to reduce your order total
              </p>
            </div>
            <div className="bg-white/20 p-4 rounded-full">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
  <p className="text-sm font-medium text-blue-900">What is a Credit Memo?</p>
  <p className="text-sm text-blue-700 mt-1">
    When the admin reduces the price of your order or issues a refund, you receive a credit memo.
    This balance can be used during checkout on your next order.
  </p>
</div>

          </div>
        </CardContent>
      </Card>

      {/* Credit Memos List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Credit Memo History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creditMemos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>You don't have any credit memos yet</p>
              <p className="text-sm mt-1">When admin issues a credit memo, it will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Memo #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditMemos.map((memo) => (
                  <TableRow key={memo.id}>
                    <TableCell className="font-medium">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-blue-600">{memo.memo_number}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {memo.orders?.order_number ? (
                              <p>From Order: {memo.orders.order_number}</p>
                            ) : (
                              <p>Manual Credit Memo</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(memo.created_at), "dd MMM yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      ${memo.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-orange-600">
                      ${(memo.applied_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600">
                      ${(memo.balance || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-sm text-gray-600">{memo.reason}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{memo.reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>{getStatusBadge(memo.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {memo.expires_at ? format(new Date(memo.expires_at), "dd MMM yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Usage History */}
      {Object.keys(applications).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Credit Memo Usage History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Memo #</TableHead>
                  <TableHead>Applied To Order</TableHead>
                  <TableHead>Amount Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditMemos.flatMap(memo => 
                  (applications[memo.id] || []).map(app => (
                    <TableRow key={app.id}>
                      <TableCell>
                        {format(new Date(app.created_at), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-blue-600">{memo.memo_number}</TableCell>
                      <TableCell className="font-medium">
                        {app.orders?.order_number || "-"}
                      </TableCell>
                      <TableCell className="text-orange-600 font-medium">
                        -${app.applied_amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreditMemosList;
