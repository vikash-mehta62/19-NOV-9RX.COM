import { OrdersList } from "./table/OrdersList";
import { StatusFilter } from "./table/StatusFilter";
import { OrderDetailsSheet } from "./table/OrderDetailsSheet";
import { OrderFilters } from "./table/OrderFilters";
import { useOrderFilters } from "./hooks/useOrderFilters";
import { useOrderManagement } from "./hooks/useOrderManagement";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, Package, PlusCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/supabaseClient";
import { OrderSummaryCards } from "./OrderSummaryCards";

type SortField = "customer" | "date" | "total" | "status" | "payment_status";
type SortDirection = "asc" | "desc";

// Status order for sorting
const paymentStatusOrder: Record<string, number> = {
  paid: 1,
  pending: 2,
  unpaid: 3,
};

const orderStatusOrder: Record<string, number> = {
  new: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  completed: 5,
  cancelled: 6,
  credit_approval_processing: 7,
};
import ProductShowcase from "../pharmacy/ProductShowcase";
import { useLocation, useNavigate } from "react-router-dom";
import { OrderFormValues } from "./schemas/orderSchema";
import { CSVLink } from "react-csv";
import VendorDialogForm from "./vendor-dialof-form";
import { Pagination } from "../common/Pagination";

const exportToCSV = (orders: OrderFormValues[]) => {
  if (!orders || orders.length === 0) {
    return { data: [], headers: [], filename: "orders.csv" };
  }
  const filteredOrders = orders.filter((order) => order.void === false);

  const headers = [
    { label: "Order Number", key: "order_number" },
    { label: "Customer Name", key: "customerInfo.name" },
    { label: "Email", key: "customerInfo.email" },
    { label: "Phone", key: "customerInfo.phone" },
    { label: "Total Amount", key: "total" },
    { label: "Status", key: "status" },
    { label: "Payment Status", key: "payment_status" },
    { label: "Customization", key: "customization" },
    { label: "Order Date", key: "date" },
    { label: "Shipping Method", key: "shipping.method" },
    { label: "Shipping Cost", key: "shipping.cost" },
    { label: "Tracking Number", key: "shipping.trackingNumber" },
    { label: "Estimated Delivery", key: "shipping.estimatedDelivery" },
    { label: "Special Instructions", key: "specialInstructions" },
    { label: "Shipping Address", key: "shippingAddress.address.street" },
    { label: "City", key: "shippingAddress.address.city" },
    { label: "State", key: "shippingAddress.address.state" },
    { label: "Zip Code", key: "shippingAddress.address.zip_code" },
  ];

  return { data: filteredOrders, headers, filename: "orders.csv" };
};

interface OrdersContainerProps {
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
  onProcessOrder?: (orderId: string) => void;
  onShipOrder?: (orderId: string) => void;
  onConfirmOrder?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string, reason?: string) => Promise<void>;
  handleCancelOrder?: (orderId: string, reason?: string) => Promise<void>;
  poIs?: boolean;
}

export const OrdersContainer = ({
  userRole = "pharmacy",
  onProcessOrder,
  onShipOrder,
  onConfirmOrder,
  onDeleteOrder,
  handleCancelOrder,
  poIs = false,
}: OrdersContainerProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [orderStatus, setOrderStatus] = useState<string>("");
  
  // Stats from database (not paginated)
  const [dbStats, setDbStats] = useState({
    total: 0,
    newOrders: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
    pendingPayment: 0,
  });
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const {
    orders,
    selectedOrder,
    selectedOrders,
    isEditing,
    isSheetOpen,
    setSelectedOrders,
    setIsEditing,
    setIsSheetOpen,
    handleOrderClick,
    handleProcessOrder: processOrder,
    handleShipOrder: shipOrder,
    handleConfirmOrder: confirmOrder,
    loadOrders,
    loading,
    totalOrders,
    page,
    setPage,
    limit,
    setLimit,
  } = useOrderManagement();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          toast({
            title: "Error",
            description: "Please log in to view orders",
            variant: "destructive",
          });
          return;
        }

        const { data: orders, error } = await supabase
          .from("orders")
          .select("*")
          .eq("profile_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        console.log("First few orders:", orders?.slice(0, 3));
      } catch (error) {
        console.error("Error fetching orders:", error);
        toast({
          title: "Error",
          description: "Failed to fetch orders",
          variant: "destructive",
        });
      }
    };

    fetchOrders();
  }, [orderStatus, poIs, toast]);

  // Fetch stats from database (not paginated)
  useEffect(() => {
    const fetchStats = async () => {
      if (poIs) return; // Don't fetch stats for PO page
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const role = sessionStorage.getItem('userType');
        
        let query = supabase
          .from("orders")
          .select("status, payment_status, total_amount, void")
          .is("deleted_at", null);

        // Apply role-based filters
        if (role === "pharmacy") {
          query = query.eq("profile_id", session.user.id);
        } else if (role === "group") {
          const { data: groupProfiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("group_id", session.user.id);
          
          if (groupProfiles && groupProfiles.length > 0) {
            const userIds = groupProfiles.map(user => user.id);
            query = query.in("profile_id", userIds);
          }
        }

        const { data: allOrders, error } = await query;
        
        if (error) throw error;

        // Calculate stats from all orders
        const stats = {
          total: 0,
          newOrders: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
          totalRevenue: 0,
          pendingPayment: 0,
        };

        allOrders?.forEach((order: any) => {
          if (order.void) return; // Skip voided orders
          
          const status = order.status?.toLowerCase();
          const total = parseFloat(order.total_amount || "0");
          
          stats.total++;
          
          switch (status) {
            case "new":
            case "pending":
              stats.newOrders++;
              break;
            case "processing":
              stats.processing++;
              break;
            case "shipped":
              stats.shipped++;
              break;
            case "delivered":
            case "completed":
              stats.delivered++;
              break;
            case "cancelled":
              stats.cancelled++;
              break;
          }

          stats.totalRevenue += total;
          if (order.payment_status?.toLowerCase() !== "paid") {
            stats.pendingPayment += total;
          }
        });

        setDbStats(stats);
      } catch (error) {
        console.error("Error fetching order stats:", error);
      }
    };

    fetchStats();
  }, [orderStatus, poIs, orders]);

  console.log(orders);

  const {
    statusFilter,
    statusFilter2,
    searchQuery,
    dateRange,
    setStatusFilter,
    setSearchQuery,
    setStatusFilter2,
    setDateRange,
    filteredOrders,
  } = useOrderFilters(orders, poIs);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      if (field === "date") {
        setSortDirection("desc");
      } else if (field === "payment_status") {
        setSortDirection("asc");
      } else {
        setSortDirection("asc");
      }
    }
  };

  // Sort filtered orders
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a: any, b: any) => {
      let comparison = 0;

      switch (sortField) {
        case "customer":
          const nameA = (a.customerInfo?.name || "").toLowerCase();
          const nameB = (b.customerInfo?.name || "").toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        case "date":
          comparison = new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime();
          break;
        case "total":
          comparison = parseFloat(a.total || a.total_amount || "0") - parseFloat(b.total || b.total_amount || "0");
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
  }, [filteredOrders, sortField, sortDirection]);

  useEffect(() => {
    loadOrders({ statusFilter, statusFilter2, searchQuery, dateRange, poIs });
  }, [statusFilter, statusFilter2, searchQuery, dateRange, page, poIs, limit, location.pathname]);

  useEffect(() => {
    if (poIs) {
      loadOrders({ statusFilter, statusFilter2, searchQuery, dateRange, poIs });
    }
  }, [poIs]);

  const handleVendorSubmit = (data: any) => {
    console.log("Vendor data submitted:", data);
  };

  const handleCreateOrderClick = () => {
    navigate("/admin/orders/create");
  };

  const handleCardClick = (filter: string) => {
    if (filter === "all") {
      setStatusFilter2("all");
    } else {
      setStatusFilter2(filter);
    }
  };

  return (
    <div className="space-y-4">
      {/* Order Summary Cards */}
      {!poIs && userRole === "admin" && (
        <OrderSummaryCards 
          stats={dbStats} 
          isLoading={loading}
          onCardClick={handleCardClick}
          activeFilter={statusFilter2}
        />
      )}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Left side - Search and Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 w-full xl:w-auto">
          <OrderFilters
            onSearch={setSearchQuery}
            onDateChange={setDateRange}
            onExport={() =>
              console.log("Export functionality to be implemented")
            }
          />

          {!poIs && (
            <StatusFilter
              value={statusFilter2}
              onValueChange={setStatusFilter2}
            />
          )}
        </div>

        {/* Right side - Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {!poIs && (
            <CSVLink {...exportToCSV(filteredOrders)}>
              <Button variant="outline" size="sm" className="gap-2 text-gray-600 hover:text-gray-900">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </CSVLink>
          )}

          {userRole === "admin" && (
            <>
              {!poIs && (
                <Button 
                  size="sm"
                  className="gap-2 bg-blue-600 hover:from-blue-700 hover:to-purple-700 shadow-md"
                  onClick={handleCreateOrderClick}
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Order
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={() => setIsOpen(true)}
              >
                <Package className="h-4 w-4" />
                Products
              </Button>

              {poIs && <VendorDialogForm mode="add" onSubmit={handleVendorSubmit} />}
            </>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="fixed -inset-4 flex items-center justify-center bg-black bg-opacity-50 h-screen z-[50]">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] md:w-[50%] lg:w-[80%] xl:w-[60%] relative h-[80vh] overflow-y-scroll">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 text-gray-600 hover:text-black text-lg"
            >
              ✖
            </button>
            <ProductShowcase groupShow={true} />
          </div>
        </div>
      )}

      <OrdersList
        orders={sortedOrders}
        onOrderClick={handleOrderClick}
        selectedOrder={selectedOrder}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        userRole={userRole}
        selectedOrders={selectedOrders}
        onOrderSelect={(orderId) => {
          setSelectedOrders((prev) =>
            prev.includes(orderId)
              ? prev.filter((id) => id !== orderId)
              : [...prev, orderId]
          );
        }}
        onProcessOrder={processOrder}
        onShipOrder={shipOrder}
        onConfirmOrder={confirmOrder}
        onDeleteOrder={onDeleteOrder}
        setOrderStatus={setOrderStatus}
        poIs={poIs}
        onCancelOrder={handleCancelOrder}
        isLoading={loading}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
      />

      <Pagination
        totalOrders={totalOrders}
        page={page}
        setPage={setPage}
        limit={limit}
        setLimit={setLimit}
      />

      {selectedOrder && (
        <OrderDetailsSheet
          order={selectedOrder}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onProcessOrder={processOrder}
          onShipOrder={shipOrder}
          onConfirmOrder={confirmOrder}
          onDeleteOrder={onDeleteOrder}
          userRole={userRole}
          poIs={poIs}
          loadOrders={loadOrders}
        />
      )}
    </div>
  );
};
