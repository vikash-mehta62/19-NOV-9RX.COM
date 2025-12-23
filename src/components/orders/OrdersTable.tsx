import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/supabaseClient";
import { OrdersList } from "./table/OrdersList";
import { StatusFilter } from "./table/StatusFilter";
import { OrderDetailsSheet } from "./table/OrderDetailsSheet";
import { OrderFilters } from "./table/OrderFilters";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  customer: string;
  date: string;
  total: string;
  status: string;
  payment_status: string;
  customerInfo?: {
    name?: string;
  };
  shipping?: {
    method: "custom" | "FedEx";
    trackingNumber?: string;
  };
}

type SortField = "customer" | "date" | "total" | "status" | "payment_status";
type SortDirection = "asc" | "desc";

// Status order for sorting (paid first, then pending, then unpaid)
const paymentStatusOrder: Record<string, number> = {
  paid: 1,
  pending: 2,
  unpaid: 3,
};

// Order status priority
const orderStatusOrder: Record<string, number> = {
  new: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  completed: 5,
  cancelled: 6,
  credit_approval_processing: 7,
};

export const OrdersTable = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Fetch orders from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase.from("orders").select("*");

        if (error) throw error;

        setOrders(data || []);
      } catch (error: any) {
        console.error("Error fetching orders:", error.message);
        toast({
          title: "Error",
          description: "Failed to fetch orders. Please try again later.",
        });
      }
    };

    fetchOrders();
  }, [toast]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      // Default directions based on field
      if (field === "date") {
        setSortDirection("desc"); // Newest first
      } else if (field === "payment_status") {
        setSortDirection("asc"); // Paid first
      } else {
        setSortDirection("asc");
      }
    }
  };

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders
      .filter((order) => (statusFilter === "all" ? true : order.status === statusFilter))
      .filter((order) =>
        searchQuery
          ? (order.customerInfo?.name || order.customer || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order as any).order_number?.includes(searchQuery.toLowerCase()) ||
            (order as any).notes?.includes(searchQuery.toLowerCase())
          : true
      );

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "customer":
          const nameA = (a.customerInfo?.name || a.customer || "").toLowerCase();
          const nameB = (b.customerInfo?.name || b.customer || "").toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "total":
          comparison = parseFloat(a.total || "0") - parseFloat(b.total || "0");
          break;
        case "status":
          const statusA = orderStatusOrder[a.status] || 99;
          const statusB = orderStatusOrder[b.status] || 99;
          comparison = statusA - statusB;
          break;
        case "payment_status":
          const payA = paymentStatusOrder[a.payment_status?.toLowerCase()] || 99;
          const payB = paymentStatusOrder[b.payment_status?.toLowerCase()] || 99;
          comparison = payA - payB;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [orders, statusFilter, searchQuery, sortField, sortDirection]);

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <OrderFilters 
          onSearch={setSearchQuery} 
          onDateChange={() => {}} 
          onExport={() => {console.log("object")}} 
        />
        <StatusFilter value={statusFilter} onValueChange={setStatusFilter} />
      </div>
      <OrdersList
        orders={filteredAndSortedOrders}
        onOrderClick={handleOrderClick}
        selectedOrder={selectedOrder}
        isEditing={false}
        setIsEditing={() => {}}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  );
};
