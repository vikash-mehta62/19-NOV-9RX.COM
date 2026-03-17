const ORDER_STATUS_DISPLAY: Record<
  string,
  { label: string; badgeClass: string }
> = {
  new: {
    label: "New Order",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  pending: {
    label: "Pending",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  confirmed: {
    label: "Confirmed",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-300",
  },
  processing: {
    label: "Processing",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
  },
  shipped: {
    label: "Shipped",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-300",
  },
  delivered: {
    label: "Delivered",
    badgeClass: "bg-green-100 text-green-800 border-green-300",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-red-100 text-red-800 border-red-300",
  },
  refunded: {
    label: "Refunded",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
  },
};

const PAYMENT_STATUS_DISPLAY: Record<
  string,
  { label: string; badgeClass: string }
> = {
  paid: {
    label: "Paid",
    badgeClass: "bg-green-100 text-green-800 border-green-300",
  },
  partial_paid: {
    label: "Partial Paid",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  pending: {
    label: "Pending",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  },
  unpaid: {
    label: "Unpaid",
    badgeClass: "bg-red-100 text-red-800 border-red-300",
  },
};

export const getOrderStatusDisplay = (status?: string) => {
  const normalizedStatus = String(status || "pending").toLowerCase();
  return ORDER_STATUS_DISPLAY[normalizedStatus] || {
    label: normalizedStatus
      ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
      : "Pending",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
  };
};

export const getPaymentStatusDisplay = ({
  paymentStatus,
  paidAmount,
  totalAmount,
}: {
  paymentStatus?: string | null;
  paidAmount: number;
  totalAmount: number;
}) => {
  const normalizedPaymentStatus = String(paymentStatus || "").toLowerCase();
  const safeTotalAmount = Number.isFinite(totalAmount) ? totalAmount : 0;
  const safePaidAmount = Number.isFinite(paidAmount) ? paidAmount : 0;
  const balanceDue = Math.max(0, safeTotalAmount - safePaidAmount);

  const statusKey =
    balanceDue <= 0.01
      ? "paid"
      : normalizedPaymentStatus === "partial_paid" || safePaidAmount > 0.01
        ? "partial_paid"
        : normalizedPaymentStatus === "pending"
          ? "pending"
          : "unpaid";

  return {
    statusKey,
    balanceDue,
    ...PAYMENT_STATUS_DISPLAY[statusKey],
  };
};
