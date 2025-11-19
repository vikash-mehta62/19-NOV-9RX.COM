
import { useState, useEffect } from "react";
import { Invoice, InvoiceStatus, isInvoice, InvoiceRealtimePayload } from "../types/invoice.types";
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


interface DataTableProps {
  filterStatus?: InvoiceStatus;
}

export function InvoiceTableContainer({ filterStatus }: DataTableProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filters, setFilters] = useState<FilterValues>({
    status: filterStatus || null,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [page, setPage] = useState(1); // current page
  const [limit, setLimit] = useState(20); // rows per page
  const [totalInvoices, setTotalInvoices] = useState(0); // for showing total count



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
      `, { count: 'exact' }) // ✅ get count for pagination
        .order("created_at", { ascending: false })
        .range(from, to); // ✅ only fetch selected page

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

      // ✅ Apply filters directly in Supabase query
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

      // ✅ Server-side search
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

      // Update pagination info
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
  }, [filters, refreshTrigger,limit,page]);

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
    if (true) {
      setFilters(newFilters);
    } else {
      console.error("Invalid filter values:", newFilters);
      toast({
        title: "Error",
        description: "Invalid filter values provided.",
        variant: "destructive",
      });
    }
  };

  const sortedInvoices = sortInvoices(invoices, sortConfig);

  const transformInvoiceForPreview = (invoice: Invoice) => {
    console.log(invoice)
    try {
      const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
      const customerInfo = typeof invoice.customer_info === 'string'
        ? JSON.parse(invoice.customer_info)
        : invoice.customer_info;
      const shippingInfo = typeof invoice.shipping_info === 'string'
        ? JSON.parse(invoice.shipping_info)
        : invoice.shipping_info;
      console.log(invoice)
      return {
        invoice_number: invoice.invoice_number,
        order_number: invoice.orders.order_number,
        id: invoice.id,
        customerInfo,
        shippingInfo,
        profile_id: invoice.profile_id,
        payment_status: invoice.payment_status, // ✅ Extracted correctly
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
    // ✅ Filter out invoices with voided orders
    const filteredInvoices = invoices?.filter(
      (invoice) => invoice.void === false
    );

    const csvData = filteredInvoices?.map((invoice) => ({
      "Invoice Number": invoice.invoice_number,
      "Order Number": invoice.orders?.order_number || "",
      "Customer Name": `${invoice.profiles?.first_name || ""} ${invoice.profiles?.last_name || ""}`,
      "Email": invoice.profiles?.email || "",
      "Company Name": (invoice.profiles as any)?.company_name || "",

      "Tax": invoice.tax_amount,
      "Subtotal": invoice.subtotal,
      "Payment Status": invoice.payment_status,
      "Created At": invoice.created_at,
      "Shipping Address": invoice.shipping_info
        ? `${invoice.shipping_info.street}, ${invoice.shipping_info.city}, ${invoice.shipping_info.state}, ${invoice.shipping_info.zip_code}`
        : "",
    }));

    return csvData;
  };



  return (
    <>
      <div className="flex flex-col p-4 sm:flex-row justify-between items-center bg-white  border border-gray-200 rounded-lg ">
        <div className="w-full sm:w-auto  sm:mb-0">
          <InvoiceFilters onFilterChange={handleFilterChange} exportInvoicesToCSV={exportInvoicesToCSV} />
        </div>

        <div className="flex gap-3">
          <ExportOptions invoices={invoices} />

          {/* {invoices.length > 0 && (
      <CSVLink
        data={exportInvoicesToCSV()}
        filename={`invoices_${new Date().toISOString()}.csv`}
        className="px- py-2 w-full bg-blue-600 text-white rounded-lg shadow-md transition-all hover:bg-blue-700 hover:scale-105"
      >
        Export CSV
      </CSVLink>
    )} */}
        </div>
      </div>


      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <Skeleton key={index} className="w-full h-16" />
          ))}
        </div>
      ) : (
        <InvoiceTableContent
          invoices={sortedInvoices}
          onSort={handleSort}
          sortConfig={sortConfig}
          onActionComplete={handleActionComplete}
          onPreview={setSelectedInvoice}
        />
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
    </>
  );
}
