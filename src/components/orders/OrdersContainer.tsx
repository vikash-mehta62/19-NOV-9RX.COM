import { OrdersList } from "./table/OrdersList";
import { StatusFilter } from "./table/StatusFilter";
import { OrderDetailsSheet } from "./table/OrderDetailsSheet";
import { OrderFilters } from "./table/OrderFilters";
import { useOrderFilters } from "./hooks/useOrderFilters";
import { useOrderManagement } from "./hooks/useOrderManagement";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, Package, PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row flex-wrap justify-between items-center gap-2 p-2 bg-card rounded-lg shadow-sm border">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <OrderFilters
            onSearch={setSearchQuery}
            onDateChange={setDateRange}
            onExport={() =>
              console.log("Export functionality to be implemented")
            }
          />

          {!poIs && (
            <>
              <StatusFilter
                value={statusFilter2}
                onValueChange={setStatusFilter2}
              />
            </>
          )}

          {!poIs && (
            <CSVLink {...exportToCSV(filteredOrders)}>
              <Button variant="outline" className="flex items-center">
                <Download className="mr-2 h-4 w-4" />
                Export Orders
              </Button>
            </CSVLink>
          )}

          {userRole === "admin" && (
            <>
              {!poIs && (
                <Button 
                  className="w-auto min-w-fit px-3 py-2 text-sm"
                  onClick={handleCreateOrderClick}
                >
                  <PlusCircle className="mr-1 h-4 w-4" />
                  Create Order
                </Button>
              )}

              <Button
                variant="secondary"
                className="w-auto min-w-fit px-3 py-2 bg-blue-500 text-white text-sm"
                onClick={() => setIsOpen(true)}
              >
                <Package className="mr-1 h-4 w-4" />
                All Products
              </Button>

              {poIs && <VendorDialogForm mode="add" onSubmit={handleVendorSubmit} />}
            </>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="fixed -inset-4 flex items-center justify-center bg-black bg-opacity-50 h-screen z-[50]">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] md:w-[50%] relative h-[80vh] overflow-y-scroll">
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
        orders={filteredOrders}
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
