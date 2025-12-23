import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Landmark,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PaymentTransaction {
  id: string;
  profile_id: string;
  order_id: string | null;
  invoice_id: string | null;
  transaction_id: string | null;
  auth_code: string | null;
  transaction_type: string;
  amount: number;
  currency: string;
  payment_method_type: string | null;
  card_last_four: string | null;
  card_type: string | null;
  status: string;
  response_message: string | null;
  error_message: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    company_name: string | null;
  };
}

type SortField = "created_at" | "customer" | "amount" | "status" | "payment_method";
type SortDirection = "asc" | "desc";

const statusConfig: Record<string, { icon: any; color: string; bg: string; order: number }> = {
  approved: { icon: CheckCircle2, color: "text-green-700", bg: "bg-green-100", order: 1 },
  pending: { icon: Clock, color: "text-yellow-700", bg: "bg-yellow-100", order: 2 },
  declined: { icon: XCircle, color: "text-red-700", bg: "bg-red-100", order: 3 },
  error: { icon: AlertCircle, color: "text-red-700", bg: "bg-red-100", order: 4 },
  refunded: { icon: RefreshCw, color: "text-blue-700", bg: "bg-blue-100", order: 5 },
  voided: { icon: XCircle, color: "text-gray-700", bg: "bg-gray-100", order: 6 },
};

export default function PaymentTransactions() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchTransactions = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("payment_transactions")
      .select(`
        *,
        profiles:profile_id (
          first_name,
          last_name,
          email,
          company_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setTransactions(data as PaymentTransaction[]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sort icon for column header
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Filter and sort transactions
  const sortedTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.transaction_id?.toLowerCase().includes(search) ||
        t.profiles?.email?.toLowerCase().includes(search) ||
        t.profiles?.company_name?.toLowerCase().includes(search) ||
        t.profiles?.first_name?.toLowerCase().includes(search) ||
        t.profiles?.last_name?.toLowerCase().includes(search) ||
        t.card_last_four?.includes(search)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "customer":
          const nameA = `${a.profiles?.first_name || ""} ${a.profiles?.last_name || ""}`.toLowerCase();
          const nameB = `${b.profiles?.first_name || ""} ${b.profiles?.last_name || ""}`.toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "status":
          const orderA = statusConfig[a.status]?.order || 99;
          const orderB = statusConfig[b.status]?.order || 99;
          comparison = orderA - orderB;
          break;
        case "payment_method":
          const methodA = a.payment_method_type || "";
          const methodB = b.payment_method_type || "";
          comparison = methodA.localeCompare(methodB);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [transactions, statusFilter, searchTerm, sortField, sortDirection]);

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.bg} ${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentIcon = (type: string | null) => {
    if (type === "ach") {
      return <Landmark className="h-4 w-4 text-green-600" />;
    }
    return <CreditCard className="h-4 w-4 text-blue-600" />;
  };

  // Calculate stats
  const stats = {
    total: transactions.length,
    approved: transactions.filter(t => t.status === "approved").length,
    declined: transactions.filter(t => t.status === "declined").length,
    totalAmount: transactions
      .filter(t => t.status === "approved")
      .reduce((sum, t) => sum + t.amount, 0),
  };

  // Sortable header component
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center hover:text-foreground transition-colors font-medium"
      >
        {children}
        {getSortIcon(field)}
      </button>
    </TableHead>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Transactions</h1>
            <p className="text-muted-foreground">
              View and manage all payment transactions
            </p>
          </div>
          <Button variant="outline" onClick={fetchTransactions} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
              <p className="text-sm text-muted-foreground">Declined</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">${stats.totalAmount.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Total Processed</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by transaction ID, email, name, or card..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader field="created_at">Date</SortableHeader>
                  <TableHead>Transaction ID</TableHead>
                  <SortableHeader field="customer">Customer</SortableHeader>
                  <SortableHeader field="payment_method">Payment</SortableHeader>
                  <SortableHeader field="amount">Amount</SortableHeader>
                  <SortableHeader field="status">Status</SortableHeader>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : sortedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(transaction.created_at), "MMM d, yyyy")}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(transaction.created_at), "h:mm a")}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.transaction_id || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {transaction.profiles?.first_name} {transaction.profiles?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.profiles?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(transaction.payment_method_type)}
                          <span>
                            {transaction.card_type?.toUpperCase() || "ACH"} ••••{" "}
                            {transaction.card_last_four || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedTransaction(transaction)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Transaction Details Dialog */}
        <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-mono">{selectedTransaction.transaction_id || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Auth Code</p>
                    <p className="font-mono">{selectedTransaction.auth_code || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-bold text-lg">${selectedTransaction.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedTransaction.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p>{selectedTransaction.transaction_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p>{format(new Date(selectedTransaction.created_at), "PPpp")}</p>
                  </div>
                </div>

                {selectedTransaction.response_message && (
                  <div>
                    <p className="text-sm text-muted-foreground">Response</p>
                    <p>{selectedTransaction.response_message}</p>
                  </div>
                )}

                {selectedTransaction.error_message && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Error</p>
                    <p className="text-red-700">{selectedTransaction.error_message}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Customer</p>
                  <p className="font-medium">
                    {selectedTransaction.profiles?.first_name} {selectedTransaction.profiles?.last_name}
                  </p>
                  <p className="text-sm">{selectedTransaction.profiles?.email}</p>
                  {selectedTransaction.profiles?.company_name && (
                    <p className="text-sm text-muted-foreground">
                      {selectedTransaction.profiles.company_name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
