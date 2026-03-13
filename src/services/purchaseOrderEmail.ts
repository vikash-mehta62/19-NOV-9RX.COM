import axios from "../../axiosconfig";

type PurchaseOrderEmailEvent = "created" | "updated";

export async function sendPurchaseOrderEmail(
  orderId: string,
  eventType: PurchaseOrderEmailEvent,
  includePricingInPdf?: boolean,
) {
  if (!orderId) {
    throw new Error("Purchase order ID is required to send vendor email.");
  }

  const response = await axios.post("/po-email", {
    id: orderId,
    eventType,
    includePricingInPdf,
  });

  return response.data;
}
