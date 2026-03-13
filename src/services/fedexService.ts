import { SUPABASE_PUBLISHABLE_KEY, supabase } from "@/integrations/supabase/client";
import { OrderFormValues } from "@/components/orders/schemas/orderSchema";

export interface FedExPackageInput {
  weightValue: number;
  weightUnits: "LB" | "KG";
  length: number;
  width: number;
  height: number;
  dimensionUnits: "IN" | "CM";
  serviceType?: string;
  packagingType?: string;
  pickupType?: string;
}

export interface FedExShipmentResult {
  trackingNumber: string;
  labelUrl?: string;
  labelBase64?: string;
  labelFormat?: string;
  serviceType?: string;
  packagingType?: string;
  estimatedDeliveryDate?: string;
  shipmentId?: string;
  raw?: Record<string, any>;
}

export interface FedExTrackingResult {
  trackingNumber: string;
  status?: string;
  statusDescription?: string;
  estimatedDeliveryDate?: string;
  latestScan?: string;
  raw?: Record<string, any>;
}

export interface FedExPickupResult {
  confirmationNumber?: string;
  location?: string;
  readyDate?: string;
  raw?: Record<string, any>;
}

interface FedExAddressValidationResult {
  output?: {
    resolvedAddresses?: Array<{
      classification?: string;
      customerMessage?: string[];
      streetLinesToken?: string[];
      city?: string;
      stateOrProvinceCode?: string;
      postalCode?: string;
      countryCode?: string;
    }>;
    alerts?: Array<{
      code?: string;
      message?: string;
    }>;
  };
  alerts?: Array<{
    code?: string;
    message?: string;
  }>;
  errors?: Array<{
    code?: string;
    message?: string;
  }>;
  raw?: Record<string, any>;
}

interface FedExInvokeResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const invokeFedEx = async <T>(action: string, payload: Record<string, any>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("fedex-api", {
    headers: {
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: {
      action,
      ...payload,
    },
  });

  if (error) {
    throw new Error(error.message || "FedEx request failed");
  }

  const result = data as FedExInvokeResponse<T>;
  if (!result?.success || !result.data) {
    throw new Error(result?.error || "FedEx request failed");
  }

  return result.data;
};

const resolveRecipientFromOrder = (order: OrderFormValues) => {
  const shippingAddress = order.shippingAddress?.address;
  const customerAddress = order.customerInfo?.address;
  const address = shippingAddress || customerAddress;
  const normalizedState = String(address?.state || "").trim().toUpperCase();
  const normalizedZip = String(address?.zip_code || "").trim();
  const normalizedPhone = String(
    order.shippingAddress?.phone || order.customerInfo?.phone || ""
  ).replace(/\D/g, "");

  if (!address?.street || !address?.city || !address?.state || !address?.zip_code) {
    throw new Error("Order is missing a complete shipping address");
  }

  if (!/^[A-Z]{2}$/.test(normalizedState)) {
    throw new Error("Recipient state must be a 2-letter US state code for FedEx labels");
  }

  if (!/^\d{5}(-\d{4})?$/.test(normalizedZip)) {
    throw new Error("Recipient ZIP code must be a valid US ZIP code for FedEx labels");
  }

  if (normalizedPhone.length < 10) {
    throw new Error("Recipient phone number is required for FedEx label creation");
  }

  return {
    name: order.shippingAddress?.fullName || order.customerInfo?.name || "Customer",
    email: order.shippingAddress?.email || order.customerInfo?.email || "",
    phone: normalizedPhone,
    streetLines: [address.street].filter(Boolean),
    city: address.city,
    stateOrProvinceCode: normalizedState,
    postalCode: normalizedZip,
    countryCode: "US",
    residential: false,
  };
};

export const fedexService = {
  async createShipment(order: OrderFormValues, pkg: FedExPackageInput): Promise<FedExShipmentResult> {
    const addressValidation = await this.validateAddress(order);
    const resolvedAddresses = addressValidation?.output?.resolvedAddresses || [];
    const addressAlert =
      addressValidation?.output?.alerts?.[0]?.message ||
      addressValidation?.alerts?.[0]?.message ||
      addressValidation?.errors?.[0]?.message;

    if (resolvedAddresses.length === 0) {
      throw new Error(
        addressAlert || "FedEx could not validate the recipient shipping address for this order"
      );
    }
    const requestedRecipient = resolveRecipientFromOrder(order);

    return invokeFedEx<FedExShipmentResult>("create_shipment", {
      shipment: {
        orderNumber: order.order_number,
        recipient: requestedRecipient,
        package: pkg,
        customerReference: order.customer || order.order_number,
      },
    });
  },

  async track(trackingNumber: string): Promise<FedExTrackingResult> {
    return invokeFedEx<FedExTrackingResult>("track", { trackingNumber });
  },

  async rateQuote(order: OrderFormValues, pkg: FedExPackageInput) {
    return invokeFedEx<Record<string, any>>("rate_quote", {
      shipment: {
        orderNumber: order.order_number,
        recipient: resolveRecipientFromOrder(order),
        package: pkg,
      },
    });
  },

  async validateAddress(order: OrderFormValues) {
    return invokeFedEx<FedExAddressValidationResult>("validate_address", {
      address: resolveRecipientFromOrder(order),
    });
  },

  async getPickupAvailability(trackingNumber: string) {
    return invokeFedEx<Record<string, any>>("pickup_availability", { trackingNumber });
  },

  async createPickup(trackingNumber: string, pickupDate?: string): Promise<FedExPickupResult> {
    return invokeFedEx<FedExPickupResult>("create_pickup", {
      trackingNumber,
      pickupDate,
    });
  },

  async cancelPickup(confirmationNumber: string, scheduledDate: string): Promise<FedExPickupResult> {
    return invokeFedEx<FedExPickupResult>("cancel_pickup", {
      confirmationNumber,
      scheduledDate,
    });
  },
};
