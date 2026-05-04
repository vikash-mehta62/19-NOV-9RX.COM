import { useState } from "react";
import { OrderFormValues } from "../schemas/orderSchema";
import { matchesPoWorkflowFilter } from "../utils/poWorkflow";
import { getCustomerName } from "../utils/customerUtils";

const normalizeSearchText = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const stringifySearchValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(stringifySearchValue).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(stringifySearchValue).join(" ");
  }
  return "";
};

export const useOrderFilters = (orders: OrderFormValues[], po: boolean = true) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [statusFilter2, setStatusFilter2] = useState<string | string[]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const filteredOrders = (orders || [])
    .filter((order) => {
      if (statusFilter === "all") return true;
      const paymentStatus = String(order.payment_status || "").toLowerCase();
      if (statusFilter === "partial") {
        return ["partial_paid", "partial", "partially_paid"].includes(paymentStatus);
      }
      return paymentStatus === statusFilter;
    })
    .filter((order) => {
      const selectedStatuses =
        statusFilter2 === "all"
          ? []
          : Array.isArray(statusFilter2)
            ? statusFilter2
            : [statusFilter2];

      if (selectedStatuses.length === 0) return true;

      if (po) {
        return selectedStatuses.some((status) => matchesPoWorkflowFilter(order, status));
      }

      return selectedStatuses.some((status) => {
        if (status === "voided") {
          return Boolean(order.void);
        }

        if (status === "cancelled") {
          return order.status?.toLowerCase() === "cancelled";
        }

        return !order.void && order.status?.toLowerCase() === status.toLowerCase();
      });
    })
    .filter((order) => {
      if (!searchQuery) return true;
      const query = searchQuery.trim().toLowerCase();
      const normalizedQuery = normalizeSearchText(query);

      const searchableOrder = order as OrderFormValues & {
        created_at?: string;
        estimated_delivery?: string;
        invoice_number?: string;
        notes?: string;
        purchase_number_external?: string;
        receiving_notes?: string;
        shipping_method?: string;
        total_amount?: number | string;
      };

      const {
        customerInfo = {},
        id = "",
        order_number = "",
        specialInstructions = "",
        purchase_number_external = "",
      } = searchableOrder;

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
      const displayName = getCustomerName(order);
      const searchableValues = [
        id,
        order_number,
        purchase_number_external,
        displayName,
        name,
        email,
        phone,
        type,
        street,
        city,
        state,
        zip_code,
        specialInstructions,
        searchableOrder.notes,
        searchableOrder.receiving_notes,
        searchableOrder.shipping_method,
        order.shipping?.method,
        order.status,
        order.payment_status,
        searchableOrder.invoice_number,
        order.date,
        searchableOrder.created_at,
        searchableOrder.estimated_delivery,
        order.total,
        searchableOrder.total_amount,
        stringifySearchValue(order.customerInfo),
        stringifySearchValue(order.shippingAddress),
        stringifySearchValue(order.shipping),
        stringifySearchValue(order.items),
      ];
      const searchableText = searchableValues.map((value) => String(value || "").toLowerCase()).join(" ");
      const normalizedSearchableText = normalizeSearchText(searchableText);

      return (
        searchableText.includes(query) ||
        (normalizedQuery.length > 0 && normalizedSearchableText.includes(normalizedQuery))
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
