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
  labelImageType?: "PDF" | "PNG" | "ZPLII";
  labelStockType?: string;
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

export interface FedExRateQuoteResult {
  totalNetCharge?: number;
  totalBaseCharge?: number;
  totalSurcharges?: number;
  currency?: string;
  serviceType?: string;
  deliveryTimestamp?: string;
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

export interface FedExRecipientInput {
  name: string;
  email?: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
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

export interface FedExResolvedRecipientResult {
  recipient: {
    name: string;
    companyName?: string;
    email: string;
    phone: string;
    streetLines: string[];
    city: string;
    stateOrProvinceCode: string;
    postalCode: string;
    countryCode: string;
    residential: boolean;
  };
  message?: string;
}

interface FedExInvokeResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const US_STATE_CODE_MAP: Record<string, string> = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC",
};

const normalizeStateLookupKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

export const normalizeUsStateCode = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const alphaOnly = raw.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (alphaOnly.length === 2 && Object.values(US_STATE_CODE_MAP).includes(alphaOnly)) {
    return alphaOnly;
  }

  const lookupKey = normalizeStateLookupKey(raw);
  return US_STATE_CODE_MAP[lookupKey] || "";
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const invokeFedEx = async <T>(action: string, payload: Record<string, any>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("fedex-api", {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
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

const resolveRecipient = (order: OrderFormValues, override?: Partial<FedExRecipientInput>) => {
  const shippingAddressAny = order.shippingAddress as any;
  const shippingAddress = order.shippingAddress?.address;
  const customerAddress = order.customerInfo?.address;
  const companyName = String(
    shippingAddressAny?.shipping?.companyName ||
      shippingAddressAny?.billing?.companyName ||
      shippingAddressAny?.address?.companyName ||
      ""
  ).trim();
  const address = {
    street: override?.street ?? shippingAddress?.street ?? customerAddress?.street,
    city: override?.city ?? shippingAddress?.city ?? customerAddress?.city,
    state: override?.state ?? shippingAddress?.state ?? customerAddress?.state,
    zip_code: override?.zip_code ?? shippingAddress?.zip_code ?? customerAddress?.zip_code,
  };
  const normalizedState = normalizeUsStateCode(address?.state);
  const normalizedZip = String(address?.zip_code || "").trim();
  const normalizedPhone = String(
    override?.phone || order.shippingAddress?.phone || order.customerInfo?.phone || ""
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
    name: override?.name || order.shippingAddress?.fullName || order.customerInfo?.name || "Customer",
    companyName,
    email: override?.email || order.shippingAddress?.email || order.customerInfo?.email || "",
    phone: normalizedPhone,
    streetLines: [address.street].filter(Boolean),
    city: address.city,
    stateOrProvinceCode: normalizedState,
    postalCode: normalizedZip,
    countryCode: "US",
    residential: !companyName,
  };
};

const resolveValidatedRecipient = (
  order: OrderFormValues,
  validationResult: FedExAddressValidationResult | undefined,
  override?: Partial<FedExRecipientInput>,
): FedExResolvedRecipientResult => {
  const requestedRecipient = resolveRecipient(order, override);
  const resolvedAddress =
    validationResult?.output?.resolvedAddresses?.[0] ||
    validationResult?.raw?.output?.resolvedAddresses?.[0];

  const resolvedCountryCode = String(
    resolvedAddress?.countryCode ||
      resolvedAddress?.address?.countryCode ||
      "",
  )
    .trim()
    .toUpperCase();

  const streetLines =
    resolvedAddress?.streetLinesToken ||
    resolvedAddress?.streetLines ||
    resolvedAddress?.address?.streetLines ||
    requestedRecipient.streetLines;

  const normalizedResolvedState = normalizeUsStateCode(
    resolvedAddress?.stateOrProvinceCode ||
      resolvedAddress?.address?.stateOrProvinceCode ||
      requestedRecipient.stateOrProvinceCode,
  );

  const normalizedResolvedZip = String(
    resolvedAddress?.postalCode ||
      resolvedAddress?.address?.postalCode ||
      requestedRecipient.postalCode,
  ).trim();

  const canTrustResolvedAddress =
    resolvedCountryCode === "US" &&
    Boolean(normalizedResolvedState) &&
    /^\d{5}(-\d{4})?$/.test(normalizedResolvedZip);

  const recipient = {
    ...requestedRecipient,
    streetLines:
      canTrustResolvedAddress && Array.isArray(streetLines)
        ? streetLines.filter((line: unknown) => typeof line === "string" && line.trim().length > 0)
        : requestedRecipient.streetLines,
    city:
      canTrustResolvedAddress
        ? String(
            resolvedAddress?.city ||
              resolvedAddress?.address?.city ||
              requestedRecipient.city,
          ).trim() || requestedRecipient.city
        : requestedRecipient.city,
    stateOrProvinceCode:
      canTrustResolvedAddress && normalizedResolvedState
        ? normalizedResolvedState
        : requestedRecipient.stateOrProvinceCode,
    postalCode:
      canTrustResolvedAddress && normalizedResolvedZip
        ? normalizedResolvedZip
        : requestedRecipient.postalCode,
    countryCode:
      canTrustResolvedAddress && resolvedCountryCode
        ? resolvedCountryCode
        : requestedRecipient.countryCode,
  };

  return {
    recipient,
    message:
      resolvedAddress?.customerMessage?.join(" ") ||
      validationResult?.output?.alerts?.[0]?.message ||
      validationResult?.alerts?.[0]?.message ||
      validationResult?.errors?.[0]?.message,
  };
};

export const getResolvedRecipientDraft = (
  order: OrderFormValues,
  validationResult: FedExAddressValidationResult | undefined,
  override?: Partial<FedExRecipientInput>,
): FedExRecipientInput => {
  const { recipient } = resolveValidatedRecipient(order, validationResult, override);
  return {
    name: recipient.name,
    email: recipient.email || "",
    phone: recipient.phone,
    street: recipient.streetLines?.[0] || "",
    city: recipient.city,
    state: normalizeUsStateCode(recipient.stateOrProvinceCode),
    zip_code: recipient.postalCode,
  };
};

const extractRateQuote = (result: Record<string, any>): FedExRateQuoteResult => {
  const ratedShipment =
    result?.output?.rateReplyDetails?.[0]?.ratedShipmentDetails?.[0]?.totalNetCharge
      ? result.output.rateReplyDetails[0].ratedShipmentDetails[0]
      : result?.output?.rateReplyDetails?.[0]?.ratedShipmentDetails?.find(
          (detail: Record<string, any>) => detail?.totalNetCharge
        ) || result?.output?.rateReplyDetails?.[0]?.ratedShipmentDetails?.[0] || {};

  const rateReply = result?.output?.rateReplyDetails?.[0] || {};
  const totalNetCharge = ratedShipment?.totalNetCharge || {};
  const totalBaseCharge = ratedShipment?.totalBaseCharge || {};
  const totalSurcharges = ratedShipment?.totalSurcharges || {};

  // Handle both formats: direct number or object with amount property
  const extractAmount = (value: any): number | undefined => {
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && value !== null && 'amount' in value) {
      return toFiniteNumber(value.amount);
    }
    return toFiniteNumber(value);
  };

  return {
    totalNetCharge: extractAmount(totalNetCharge),
    totalBaseCharge: extractAmount(totalBaseCharge),
    totalSurcharges: extractAmount(totalSurcharges),
    currency: totalNetCharge?.currency || totalBaseCharge?.currency || ratedShipment?.currency || "USD",
    serviceType: rateReply?.serviceType,
    deliveryTimestamp:
      rateReply?.commit?.dateDetail ||
      rateReply?.operationalDetail?.deliveryDate ||
      rateReply?.deliveryTimestamp,
    raw: result,
  };
};

export const fedexService = {
  async createShipment(
    order: OrderFormValues,
    pkg: FedExPackageInput,
    recipientOverride?: Partial<FedExRecipientInput>,
  ): Promise<FedExShipmentResult> {
    const addressValidation = await this.validateAddress(order, recipientOverride);
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
    const { recipient: requestedRecipient } = resolveValidatedRecipient(
      order,
      addressValidation,
      recipientOverride,
    );

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

  async rateQuote(
    order: OrderFormValues,
    pkg: FedExPackageInput,
    recipientOverride?: Partial<FedExRecipientInput>,
  ): Promise<FedExRateQuoteResult> {
    const addressValidation = await this.validateAddress(order, recipientOverride);
    const { recipient } = resolveValidatedRecipient(order, addressValidation, recipientOverride);
    const result = await invokeFedEx<Record<string, any>>("rate_quote", {
      shipment: {
        orderNumber: order.order_number,
        recipient,
        package: pkg,
      },
    });
    return extractRateQuote(result);
  },

  async validateAddress(order: OrderFormValues, recipientOverride?: Partial<FedExRecipientInput>) {
    return invokeFedEx<FedExAddressValidationResult>("validate_address", {
      address: resolveRecipient(order, recipientOverride),
    });
  },

  async getPickupAvailability(pickupDate?: string, serviceType?: string) {
    return invokeFedEx<Record<string, any>>("pickup_availability", { pickupDate, serviceType });
  },

  async createPickup(trackingNumber: string, pickupDate?: string, serviceType?: string): Promise<FedExPickupResult> {
    return invokeFedEx<FedExPickupResult>("create_pickup", {
      trackingNumber,
      pickupDate,
      serviceType,
    });
  },

  async cancelPickup(confirmationNumber: string, scheduledDate: string, serviceType?: string): Promise<FedExPickupResult> {
    return invokeFedEx<FedExPickupResult>("cancel_pickup", {
      confirmationNumber,
      scheduledDate,
      serviceType,
    });
  },
};
