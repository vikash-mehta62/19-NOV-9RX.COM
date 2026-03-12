import { useState } from "react";
import { OrderFormValues } from "../schemas/orderSchema";
import { matchesPoWorkflowFilter } from "../utils/poWorkflow";

export const useOrderFilters = (orders: OrderFormValues[], po: boolean = true) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusFilter2, setStatusFilter2] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const filteredOrders = (orders || [])
    .filter((order) =>
      statusFilter === "all" ? true : order.payment_status === statusFilter
    )
    .filter((order) => {
      if (statusFilter2 === "all") return true;

      if (po) {
        return matchesPoWorkflowFilter(order, statusFilter2);
      }

      return order.status?.toLowerCase() === statusFilter2.toLowerCase();
    })
    .filter((order) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();

      const {
        customerInfo = {},
        id = "",
        order_number = "",
        specialInstructions = "",
        purchase_number_external = "",
      } = order as OrderFormValues & { purchase_number_external?: string };

      const {
        name = "",
        email = "",
        phone = "",
        type = "",
        address = {},
      } = customerInfo;

      const {
        street = "",
        city = "",
        state = "",
        zip_code = "",
      } = address;

      return (
        id.toLowerCase().includes(query) ||
        order_number?.toLowerCase().includes(query) ||
        purchase_number_external?.toLowerCase().includes(query) ||
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        phone.toLowerCase().includes(query) ||
        type.toLowerCase().includes(query) ||
        street.toLowerCase().includes(query) ||
        city.toLowerCase().includes(query) ||
        state.toLowerCase().includes(query) ||
        zip_code.toLowerCase().includes(query) ||
        specialInstructions?.toLowerCase().includes(query)
      );
    })
    .filter((order) => {
      if (!dateRange.from || !dateRange.to) return true;
      const orderDate = new Date(order.date);
      return orderDate >= dateRange.from && orderDate <= dateRange.to;
    })
    .filter((order) => order.poAccept === !po);

  return {
    statusFilter,
    statusFilter2,
    searchQuery,
    dateRange,
    setStatusFilter,
    setStatusFilter2,
    setSearchQuery,
    setDateRange,
    filteredOrders,
  };
};
