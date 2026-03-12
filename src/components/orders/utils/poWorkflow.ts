import { OrderFormValues } from "../schemas/orderSchema";

export type PoWorkflowState =
  | "pending"
  | "approved"
  | "partially_received"
  | "received"
  | "closed"
  | "rejected";

const normalize = (value?: string | null) => String(value || "").toLowerCase();

export const getPoWorkflowState = (order?: Partial<OrderFormValues> | null): PoWorkflowState => {
  const status = normalize(order?.status);

  if ((order as any)?.poRejected || status === "rejected" || status === "cancelled") {
    return "rejected";
  }

  if (status === "closed") {
    return "closed";
  }

  if (status === "received") {
    return normalize(order?.payment_status) === "paid" ? "closed" : "received";
  }

  if (status === "partially_received") {
    return "partially_received";
  }

  if ((order as any)?.poApproved || status === "approved") {
    return "approved";
  }

  return "pending";
};

export const matchesPoWorkflowFilter = (order: Partial<OrderFormValues>, filter: string) => {
  if (!filter || filter === "all") return true;
  return getPoWorkflowState(order) === filter;
};

export const getPoWorkflowLabel = (state: PoWorkflowState) => {
  switch (state) {
    case "pending":
      return "Pending Approval";
    case "approved":
      return "Approved";
    case "partially_received":
      return "Partially Received";
    case "received":
      return "Received";
    case "closed":
      return "Closed";
    case "rejected":
      return "Rejected";
    default:
      return "Pending Approval";
  }
};

export const getPoWorkflowBadgeClass = (state: PoWorkflowState) => {
  switch (state) {
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "partially_received":
      return "bg-amber-100 text-amber-800";
    case "received":
      return "bg-violet-100 text-violet-800";
    case "closed":
      return "bg-emerald-100 text-emerald-800";
    case "rejected":
      return "bg-rose-100 text-rose-800";
    case "pending":
    default:
      return "bg-slate-100 text-slate-800";
  }
};
