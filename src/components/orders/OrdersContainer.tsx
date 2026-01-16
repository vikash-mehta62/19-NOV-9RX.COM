import { OrdersList } from "./table/OrdersList";
import { StatusFilter } from "./table/StatusFilter";
import { OrderDetailsSheet } from "./table/OrderDetailsSheet";
import { OrderFilters } from "./table/OrderFilters";
import { useOrderFilters } from "./hooks/useOrderFilters";
import { useOrderManagement } from "./hooks/useOrderManagement";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, Package, PlusCircle, Zap } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/supabaseClient";
import { OrderSummaryCards } from "./OrderSummaryCards";
import { isAfter, subDays, subYears, isWithinInterval } from "date-fns";

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

interface OrderHistoryItem {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount: number;
  payment_status?: string;
  items: any[];
}

import ProductShowcase from "../pharmacy/ProductShowcase";
import { useLocation, useNavigate } from "react-router-dom";
import { OrderFormValues } from "./schemas/orderSchema";
import { CSVLink } from "react-csv";
import VendorDialogForm from "./vendor-dialof-form";
import { Pagination } from "../common/Pagination";
import { Card, CardContent } from "../ui/card";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

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

  //For the order history status cards
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const [historyorders, setHistoryOrders] = useState<OrderHistoryItem[]>([]);

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
    setLoading,
    totalOrders,
    page,
    setPage,
    limit,
    setLimit,
  } = useOrderManagement();
  console.log("OrderDetails Container Rendered", orders);

  useEffect(() => {
    const fetchOrderHistory = async () => {
      if (!userProfile?.id) return;

      try {
        // Use profile_id instead of user_id
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("profile_id", userProfile.id)
          .order("created_at", { ascending: false });
        console.log("Order History data", data)
        if (error) throw error;
        setHistoryOrders(data || []);
      } catch (error) {
        console.error("Error fetching order history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderHistory();
  }, [userProfile]);

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

  // Filter orders for history cards
  const filteredHistoryOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = order.order_number?.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesDate = true;
      if (dateRange && dateRange.from && order.date) {
        const orderDate = new Date(order.date);

        if (dateRange.to) {
          // If there's a date range, check if order is within it
          matchesDate = isWithinInterval(orderDate, {
            start: dateRange.from,
            end: dateRange.to
          });
        } else {
          // If only 'from' date is set, check if order is after it
          matchesDate = isAfter(orderDate, dateRange.from);
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [orders, searchQuery, dateRange]);

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

  const handleQuickOrderClick = () => {
    navigate("/admin/orders/quick");
  };

  const handleCardClick = (filter: string) => {
    if (filter === "all") {
      setStatusFilter2("all");
    } else {
      setStatusFilter2(filter);
    }
  };

  return (
    <div className="space-y-3">
      {/* Order Summary Cards */}
      {!poIs && userRole === "admin" && (
        <OrderSummaryCards
          stats={dbStats}
          isLoading={loading}
          onCardClick={handleCardClick}
          activeFilter={statusFilter2}
        />
      )}

      {/* Stats Cards */}
      {userRole !== "admin" && (<div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:-mt-8 md:-mt-8 lg:-mt-8 xl:-mt-8 2xl:-mt-8  ">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-700">{filteredHistoryOrders.length}</div>
            <div className="text-sm text-blue-600">Total Orders</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-700">
              {filteredHistoryOrders.filter(o => o.status === "completed" || o.status === "delivered").length}
            </div>
            <div className="text-sm text-blue-600">Completed</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-700">
              {filteredHistoryOrders.filter(o => ["processing", "pending", "new"].includes(o.status?.toLowerCase())).length}
            </div>
            <div className="text-sm text-yellow-600">In Progress</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-700">
              ${filteredHistoryOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0).toFixed(2)}
            </div>
            <div className="text-sm text-purple-600">Total Order Value</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-700">
              ${filteredHistoryOrders.reduce((sum, o) => sum + (o.payment_status?.toLowerCase() === 'paid' ? parseFloat(o.total || '0') : 0), 0).toFixed(2)}
            </div>
            <div className="text-sm text-green-600">Total Paid</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-700">
              ${filteredHistoryOrders.reduce((sum, o) => sum + (o.payment_status?.toLowerCase() !== 'paid' && o.status?.toLowerCase() !== 'cancelled' && o.status?.toLowerCase() !== 'void' ? parseFloat(o.total || '0') : 0), 0).toFixed(2)}
            </div>
            <div className="text-sm text-red-600">Total Due</div>
          </CardContent>
        </Card>
      </div>
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
                <>
                  <Button
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700 shadow-md"
                    onClick={handleQuickOrderClick}
                  >
                    <Zap className="h-4 w-4" />
                    Quick Order
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2 bg-blue-600 hover:from-blue-700 hover:to-purple-700 shadow-md"
                    onClick={handleCreateOrderClick}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create Order
                  </Button>
                </>
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
