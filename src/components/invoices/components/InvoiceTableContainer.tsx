import { useState, useEffect } from "react";
import { Invoice, InvoiceStatus, isInvoice, InvoiceRealtimePayload, CustomerInfo } from "../types/invoice.types";
import { InvoicePreview } from "../InvoicePreview";
import { Sheet } from "@/components/ui/sheet";
import { InvoiceTableContent } from "./InvoiceTableContent";
import { InvoiceFilters } from "./InvoiceFilters";
import { ExportOptions } from "./ExportOptions";
import { useToast } from "@/hooks/use-toast";
import { SortConfig } from "../types/table.types";
import { FilterValues, isValidFilterValues } from "../types/filter.types";
import { sortInvoices } from "../utils/sortUtils";
import { supabase } from "@/integrations/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton";
import { CSVLink } from "react-csv";
import { Pagination } from "@/components/common/Pagination";
import { Card, CardContent } from "@/components/ui/card";
import { 
  FileText, DollarSign, CheckCircle, XCircle, 
  Clock, AlertTriangle, TrendingUp
} from "lucide-react";

interface DataTableProps {
  filterStatus?: InvoiceStatus;
}

// Summary Stats Card Component
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  gradient,
  iconColor 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string;
  gradient: string;
  iconColor: string;
}) => (
  <Card className={`overflow-hidden border-0 shadow-sm ${gradient}`}>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-white/80 rounded-xl shadow-sm">
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export function InvoiceTableContainer({ filterStatus }: DataTableProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filters, setFilters] = useState<FilterValues>({
    status: filterStatus || null,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [allInvoicesForStats, setAllInvoicesForStats] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalInvoices, setTotalInvoices] = useState(0);

  // Calculate stats from all invoices
  const stats = {
    total: allInvoicesForStats.length,
    totalAmount: allInvoicesForStats.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    paid: allInvoicesForStats.filter(inv => inv.orders?.payment_status === "paid").length,
    paidAmount: allInvoicesForStats
      .filter(inv => inv.orders?.payment_status === "paid")
      .reduce((sum, inv) => sum + (inv.amount || 0), 0),
    unpaid: allInvoicesForStats.filter(inv => inv.orders?.payment_status === "unpaid" && !inv.void).length,
    unpaidAmount: allInvoicesForStats
      .filter(inv => inv.orders?.payment_status === "unpaid" && !inv.void)
      .reduce((sum, inv) => sum + (inv.amount || 0), 0),
    overdue: allInvoicesForStats.filter(inv => {
      if (inv.orders?.payment_status === "paid" || inv.void) return false;
      const dueDate = new Date(inv.due_date);
      return dueDate < new Date();
    }).length,
  };

  const fetchAllInvoicesForStats = async () => {
    const role = sessionStorage.getItem('userType');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      let query = supabase
        .from("invoices")
        .select(`*, orders (id, payment_status, void)`)
        .eq("void", false);

      if (role === "pharmacy") {
        query = query.eq('profile_id', session.user.id);
      }

      if (role === "group") {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("group_id", session.user.id);

        const userIds = profileData?.map(user => user.id) || [];
        if (userIds.length > 0) {
          query = query.in("profile_id", userIds);
        }
      }

      const { data } = await query;
      setAllInvoicesForStats((data || []).filter(isInvoice));
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    const role = sessionStorage.getItem('userType');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      toast({
        title: "Error",
        description: "Please log in to view orders",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("invoices")
        .select(`
        *,
        orders (id, order_number, payment_status, void, customerInfo, total_amount),
        profiles (first_name, last_name, email, company_name)
      `, { count: 'exact' })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (role === "pharmacy") {
        query = query.eq('profile_id', session.user.id);
      }

      if (role === "group") {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("group_id", session.user.id);

        if (profileError) throw new Error(profileError.message);
        const userIds = profileData.map(user => user.id);
        if (userIds.length > 0) {
          query = query.in("profile_id", userIds);
        } else {
          setInvoices([]);
          setTotalInvoices(0);
          setLoading(false);
          return;
        }
      }

      if (filters.status && filters.status !== "all") {
        let payStatus = filters.status === "pending" ? "unpaid" : filters.status;
        query = query.eq("payment_status", payStatus);
      }

      if (filters.dateFrom) {
        query = query.gte("due_date", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("due_date", filters.dateTo);
      }

      if (filters.amountMin) {
        query = query.gte("amount", filters.amountMin);
      }

      if (filters.amountMax) {
        query = query.lte("amount", filters.amountMax);
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(
          `invoice_number.ilike.${searchTerm},customer_info->>name.ilike.${searchTerm},customer_info->>email.ilike.${searchTerm},customer_info->>phone.ilike.${searchTerm},purchase_number_external.ilike.${searchTerm}`
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching invoices:", error);
        toast({
          title: "Error",
          description: "Failed to fetch invoices.",
          variant: "destructive",
        });
        return;
      }

      const validInvoices = (data || []).filter(isInvoice);
      setInvoices(validInvoices);
      setTotalInvoices(count || 0);

    } catch (error) {
      console.error("Error in fetchInvoices:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching invoices.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllInvoicesForStats();
  }, [refreshTrigger]);

  useEffect(() => {
    const channel = supabase
      .channel('invoice-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices'
        },
        (payload: RealtimePostgresChangesPayload<Invoice>) => {
          console.log('Received real-time update:', payload);
          setRefreshTrigger(prev => prev + 1);

          const eventMessages = {
            INSERT: 'New invoice created',
            UPDATE: 'Invoice updated',
            DELETE: 'Invoice deleted'
          };

          const invoiceNumber =
            (payload.new as Invoice | undefined)?.invoice_number ||
            (payload.old as Invoice | undefined)?.invoice_number ||
            'Unknown';

          toast({
            title: eventMessages[payload.eventType as keyof typeof eventMessages] || 'Invoice Changed',
            description: `Invoice ${invoiceNumber} has been modified.`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [filters, refreshTrigger, limit, page]);

  const handleSort = (key: string) => {
    setSortConfig((currentSort) => {
      if (!currentSort || currentSort.key !== key) {
        return { key, direction: "asc" };
      }
      if (currentSort.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  };

  const handleActionComplete = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  };

  const sortedInvoices = sortInvoices(invoices, sortConfig);

  const transformInvoiceForPreview = (invoice: Invoice) => {
    try {
      const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
      const customerInfo = typeof invoice.customer_info === 'string'
        ? JSON.parse(invoice.customer_info)
        : invoice.customer_info;
      const shippingInfo = typeof invoice.shipping_info === 'string'
        ? JSON.parse(invoice.shipping_info)
        : invoice.shipping_info;
      
      return {
        invoice_number: invoice.invoice_number,
        order_number: invoice.orders.order_number,
        id: invoice.id,
        customerInfo,
        shippingInfo,
        profile_id: invoice.profile_id,
        payment_status: invoice.payment_status,
        created_at: invoice.created_at,
        payment_transication: invoice.payment_transication,
        payment_notes: invoice.payment_notes,
        payment_method: invoice.payment_method,
        shippin_cost: invoice.shippin_cost,
        items,
        subtotal: invoice.subtotal,
        tax: invoice.tax_amount,
        total: invoice.total_amount
      };
    } catch (error) {
      console.error("Error transforming invoice for preview:", error);
      toast({
        title: "Error",
        description: "Failed to process invoice data for preview.",
        variant: "destructive",
      });
      return null;
    }
  };

  const exportInvoicesToCSV = () => {
    const filteredInvoices = invoices?.filter(
      (invoice) => invoice.void === false
    );

    const csvData = filteredInvoices?.map((invoice) => {
      const shippingInfo =
        typeof invoice.shipping_info === "string"
          ? (JSON.parse(invoice.shipping_info) as CustomerInfo)
          : (invoice.shipping_info as CustomerInfo);

      return {
        "Invoice Number": invoice.invoice_number,
        "Order Number": invoice.orders?.order_number || "",
        "Customer Name": `${invoice.profiles?.first_name || ""} ${invoice.profiles?.last_name || ""}`.trim(),
        Email: invoice.profiles?.email || "",
        "Company Name": (invoice.profiles as any)?.company_name || "",
        Tax: invoice.tax_amount,
        Subtotal: invoice.subtotal,
        "Payment Status": invoice.payment_status,
        "Created At": invoice.created_at,
        "Shipping Address": shippingInfo?.address
          ? `${shippingInfo.address.street ?? ""}, ${shippingInfo.address.city ?? ""}, ${shippingInfo.address.state ?? ""}, ${shippingInfo.address.zip_code ?? ""}`
          : "",
      };
    });

    return csvData;
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total Invoices"
          value={stats.total}
          subValue={`$${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          gradient="bg-gradient-to-br from-blue-50 to-indigo-50"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Paid"
          value={stats.paid}
          subValue={`$${stats.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          gradient="bg-gradient-to-br from-emerald-50 to-teal-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={Clock}
          label="Unpaid"
          value={stats.unpaid}
          subValue={`$${stats.unpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          gradient="bg-gradient-to-br from-amber-50 to-orange-50"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={stats.overdue}
          subValue="Past due date"
          gradient="bg-gradient-to-br from-red-50 to-rose-50"
          iconColor="text-red-600"
        />
      </div>

      {/* Filters and Export */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <InvoiceFilters onFilterChange={handleFilterChange} exportInvoicesToCSV={exportInvoicesToCSV} />
            </div>
            <div className="flex gap-3">
              <ExportOptions invoices={invoices} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="w-full h-16" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <InvoiceTableContent
            invoices={sortedInvoices}
            onSort={handleSort}
            sortConfig={sortConfig}
            onActionComplete={handleActionComplete}
            onPreview={setSelectedInvoice}
          />
        </Card>
      )}

      <Sheet open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        {selectedInvoice && (
          <InvoicePreview
            invoice={transformInvoiceForPreview(selectedInvoice) || undefined}
          />
        )}
      </Sheet>

      <Pagination
        totalOrders={totalInvoices}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
      />
    </div>
  );
}
