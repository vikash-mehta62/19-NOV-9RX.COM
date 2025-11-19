import { useEffect, useState } from "react";
import { supabase } from "@/supabaseClient"; // Path to your Supabase client
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
  shipping?: {
    method: "custom" | "FedEx";
    trackingNumber?: string;
  };
}

export const OrdersTable = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Fetch orders from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase.from("orders").select("*");
        // console.log("Data",data);

        if (error) throw error;

        setOrders(data || []);
      } catch (error) {
        console.error("Error fetching orders:", error.message);
        toast({
          title: "Error",
          description: "Failed to fetch orders. Please try again later.",
        });
      }
    };

    fetchOrders();
  }, [toast]);

  console.log("orders",orders )
  const filteredOrders = orders
    .filter((order) => (statusFilter === "all" ? true : order.status === statusFilter))
    .filter((order) =>
      searchQuery
        ? order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.order_number.includes(searchQuery.toLowerCase())  ||
          order.notes.includes(searchQuery.toLowerCase())  
        : true
    );

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
        orders={filteredOrders}
        onOrderClick={handleOrderClick}
        selectedOrder={selectedOrder}
        isEditing={false} // or appropriate state
        setIsEditing={() => {}} // or appropriate state setter
      />
      {/* {selectedOrder && (
        <OrderDetailsSheet
          order={selectedOrder}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          isEditing={false} // or appropriate state
          setIsEditing={() => {}} // or appropriate state setter
        />
      )} */}
    </div>
  );
};
