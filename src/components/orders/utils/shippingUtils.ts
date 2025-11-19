import { toast } from "@/hooks/use-toast";

export type ShippingCarrier = "FedEx" | "custom";

export interface TrackingInfo {
  carrier: ShippingCarrier;
  trackingNumber: string;
  status: string;
  estimatedDelivery?: string;
}

export const validateFedExTracking = (trackingNumber: string): boolean => {
  // Basic FedEx tracking number validation
  // FedEx tracking numbers are typically 12 or 14 digits
  const fedExPattern = /^(\d{12}|\d{14}|FDX\d{12})$/;
  return fedExPattern.test(trackingNumber);
};

export const getTrackingUrl = (carrier: ShippingCarrier, trackingNumber: string): string => {
  if (carrier === "FedEx") {
    return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
  }
  return '#';
};

export const calculateShippingCost = (method: ShippingCarrier): number => {
  switch (method) {
    case "FedEx":
      return 12.00;
    case "custom":
      return 0.00;
    default:
      return 0.00;
  }
};

export const generateTrackingNumber = (carrier: ShippingCarrier): string => {
  const prefix = carrier === "FedEx" ? "FDX" : "CST";
  const random = Math.random().toString(36).substring(2, 15).toUpperCase();
  return `${prefix}${random}`;
};

export const createShipment = async (order: any, trackingNumber: string): Promise<TrackingInfo> => {
  // Validate tracking number
  if (!validateFedExTracking(trackingNumber)) {
    throw new Error("Invalid FedEx tracking number");
  }

  // Simulate API call to shipping carrier
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);
  
  // Notify about successful shipment creation
  toast({
    title: "Shipment Created",
    description: `Tracking number: ${trackingNumber}`,
  });

  return {
    trackingNumber,
    estimatedDelivery: estimatedDelivery.toISOString(),
    carrier: "FedEx",
    status: "Label Created"
  };
};