import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, any>;

const FEDEX_BASE_URL = {
  sandbox: "https://apis-sandbox.fedex.com",
  production: "https://apis.fedex.com",
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const flattenFedExMessages = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap(flattenFedExMessages);
  }
  if (typeof value === "string") {
    const message = value.trim();
    return message ? [message] : [];
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = [record.message, record.code, record.description]
      .flatMap(flattenFedExMessages);
    const nested = Object.values(record)
      .filter((entry) => entry !== record.message && entry !== record.code && entry !== record.description)
      .flatMap(flattenFedExMessages);
    return [...direct, ...nested];
  }
  return [];
};

const buildFedExErrorMessage = (result: JsonRecord) => {
  const primaryMessage =
    result?.errors?.[0]?.message ||
    result?.transactionShipments?.[0]?.alerts?.[0]?.message ||
    result?.output?.alerts?.[0]?.message ||
    result?.output?.notifications?.[0]?.message ||
    result?.customerMessages?.[0]?.message ||
    "FedEx request failed";

  const detailMessages = [
    ...flattenFedExMessages(result?.errors),
    ...flattenFedExMessages(result?.transactionShipments?.[0]?.alerts),
    ...flattenFedExMessages(result?.output?.alerts),
    ...flattenFedExMessages(result?.output?.notifications),
    ...flattenFedExMessages(result?.customerMessages),
  ].filter((message) => message && message !== primaryMessage);

  return detailMessages.length > 0
    ? `${primaryMessage} | ${Array.from(new Set(detailMessages)).join(" | ")}`
    : primaryMessage;
};

const getFedExSettings = async (supabase: ReturnType<typeof createClient>) => {
  const { data, error } = await supabase
    .from("settings")
    .select("*, profiles!inner(id, type, role)")
    .eq("profiles.type", "admin")
    .eq("fedex_enabled", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error("FedEx settings not configured");
  }

  return data as JsonRecord;
};

const getBaseUrl = (settings: JsonRecord) =>
  settings.fedex_use_sandbox === false ? FEDEX_BASE_URL.production : FEDEX_BASE_URL.sandbox;

const getFedExMode = (settings: JsonRecord) =>
  settings.fedex_use_sandbox === false ? "production" : "sandbox";

const resolvePickupCarrierCode = (serviceType?: string) => {
  const normalized = String(serviceType || "").trim().toUpperCase();

  if (normalized.includes("GROUND") || normalized.includes("HOME_DELIVERY")) {
    return "FDXG";
  }

  return "FDXE";
};

const resolvePickupAccountType = (carrierCode: string) =>
  carrierCode === "FDXG" ? "FEDEX_GROUND" : "FEDEX_EXPRESS";

const getFedExCredentials = (settings: JsonRecord) => {
  const mode = getFedExMode(settings);
  const apiKey = String(
    settings[`fedex_${mode}_api_key`] || "",
  ).trim();
  const secretKey = String(
    settings[`fedex_${mode}_secret_key`] || "",
  ).trim();
  const childKey = String(
    settings[`fedex_${mode}_child_key`] || "",
  ).trim();
  const childSecret = String(
    settings[`fedex_${mode}_child_secret`] || "",
  ).trim();
  const accountNumber = String(
    settings[`fedex_${mode}_account_number`] || "",
  ).trim();
  const meterNumber = String(
    settings[`fedex_${mode}_meter_number`] || "",
  ).trim();

  return {
    mode,
    apiKey,
    secretKey,
    childKey,
    childSecret,
    accountNumber,
    meterNumber,
  };
};

const getAuthToken = async (settings: JsonRecord) => {
  const { apiKey, secretKey, childKey, childSecret } = getFedExCredentials(settings);

  if (!apiKey || !secretKey) {
    throw new Error("FedEx API credentials are missing");
  }

  const usesChildCredentials = Boolean(childKey && childSecret);
  const form = new URLSearchParams({
    grant_type: usesChildCredentials ? "csp_credentials" : "client_credentials",
    client_id: apiKey,
    client_secret: secretKey,
  });

  if (childKey && childSecret) {
    form.set("child_key", childKey);
    form.set("child_secret", childSecret);
  }

  const response = await fetch(`${getBaseUrl(settings)}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  const result = await response.json();
  if (!response.ok || !result?.access_token) {
    throw new Error(result?.errors?.[0]?.message || "FedEx authentication failed");
  }

  return result.access_token as string;
};

const fedexRequest = async (
  settings: JsonRecord,
  token: string,
  path: string,
  payload: JsonRecord
) => {
  const response = await fetch(`${getBaseUrl(settings)}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-locale": "en_US",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok) {
    const message = buildFedExErrorMessage(result);
    throw new Error(message);
  }

  return result;
};

const buildShipper = (settings: JsonRecord) => ({
  contact: {
    personName: settings.shipping_company_name || settings.business_name || "Shipper",
    phoneNumber: settings.shipping_phone || settings.phone || "",
    companyName: settings.shipping_company_name || settings.business_name || "Shipper",
  },
  address: {
    streetLines: [
      settings.shipping_street || settings.address || "",
      settings.shipping_suite || settings.suite || "",
    ].filter(Boolean),
    city: settings.shipping_city || settings.city || "",
    stateOrProvinceCode: settings.shipping_state || settings.state || "",
    postalCode: settings.shipping_zip_code || settings.zip_code || "",
    countryCode: String(settings.shipping_country || "USA").toUpperCase() === "USA" ? "US" : String(settings.shipping_country || "US"),
  },
});

const buildPickupOrigin = (settings: JsonRecord) => ({
  contact: {
    personName:
      settings.warehouse_name ||
      settings.shipping_company_name ||
      settings.business_name ||
      "Warehouse",
    phoneNumber:
      settings.warehouse_phone ||
      settings.shipping_phone ||
      settings.phone ||
      "",
    companyName:
      settings.warehouse_name ||
      settings.shipping_company_name ||
      settings.business_name ||
      "Warehouse",
  },
  address: {
    streetLines: [
      settings.warehouse_street || settings.shipping_street || settings.address || "",
      settings.warehouse_suite || settings.shipping_suite || settings.suite || "",
    ].filter(Boolean),
    city: settings.warehouse_city || settings.shipping_city || settings.city || "",
    stateOrProvinceCode:
      settings.warehouse_state || settings.shipping_state || settings.state || "",
    postalCode:
      settings.warehouse_zip_code || settings.shipping_zip_code || settings.zip_code || "",
    countryCode:
      String(
        settings.warehouse_country ||
          settings.shipping_country ||
          "USA",
      ).toUpperCase() === "USA"
        ? "US"
        : String(
            settings.warehouse_country ||
              settings.shipping_country ||
              "US",
          ),
  },
});

const buildPickupLocation = (settings: JsonRecord, accountNumber: string) => {
  const origin = buildPickupOrigin(settings);
  return {
    contact: origin.contact,
    address: origin.address,
    accountNumber: { value: accountNumber },
  };
};

const validateShipperSettings = (settings: JsonRecord) => {
  const shipper = buildShipper(settings);
  const missingFields: string[] = [];
  const state = String(shipper.address.stateOrProvinceCode || "").trim().toUpperCase();
  const postalCode = String(shipper.address.postalCode || "").trim();
  const city = String(shipper.address.city || "").trim();
  const countryCode = String(shipper.address.countryCode || "").trim().toUpperCase();
  const phone = String(shipper.contact.phoneNumber || "").replace(/\D/g, "");

  if (!shipper.contact.companyName) missingFields.push("shipping company name");
  if (!shipper.address.streetLines?.length) missingFields.push("shipping street");
  if (!shipper.address.city) missingFields.push("shipping city");
  if (!shipper.address.stateOrProvinceCode) missingFields.push("shipping state");
  if (!shipper.address.postalCode) missingFields.push("shipping ZIP code");

  if (missingFields.length > 0) {
    throw new Error(`FedEx shipper address is incomplete: ${missingFields.join(", ")}`);
  }

  if (city.length < 3) {
    throw new Error("FedEx shipper city in Shipping Settings must contain at least 3 characters");
  }

  if (countryCode === "US") {
    if (!/^[A-Z]{2}$/.test(state)) {
      throw new Error("FedEx shipper state must be a valid 2-letter US state code in Shipping Settings");
    }

    if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
      throw new Error("FedEx shipper ZIP code must be a valid US ZIP code in Shipping Settings");
    }
  }

  if (phone.length < 10) {
    throw new Error("FedEx shipper phone number is required in Shipping Settings");
  }
};

const validatePickupOriginSettings = (settings: JsonRecord) => {
  const origin = buildPickupOrigin(settings);
  const missingFields: string[] = [];
  const state = String(origin.address.stateOrProvinceCode || "").trim().toUpperCase();
  const postalCode = String(origin.address.postalCode || "").trim();
  const city = String(origin.address.city || "").trim();
  const countryCode = String(origin.address.countryCode || "").trim().toUpperCase();
  const phone = String(origin.contact.phoneNumber || "").replace(/\D/g, "");

  if (!origin.contact.companyName) missingFields.push("warehouse name");
  if (!origin.address.streetLines?.length) missingFields.push("warehouse street");
  if (!origin.address.city) missingFields.push("warehouse city");
  if (!origin.address.stateOrProvinceCode) missingFields.push("warehouse state");
  if (!origin.address.postalCode) missingFields.push("warehouse ZIP code");

  if (missingFields.length > 0) {
    throw new Error(`FedEx pickup origin is incomplete: ${missingFields.join(", ")}`);
  }

  if (city.length < 3) {
    throw new Error("FedEx warehouse city must contain at least 3 characters");
  }

  if (countryCode === "US") {
    if (!/^[A-Z]{2}$/.test(state)) {
      throw new Error("FedEx warehouse state must be a valid 2-letter US state code");
    }

    if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
      throw new Error("FedEx warehouse ZIP code must be a valid US ZIP code");
    }
  }

  if (phone.length < 10) {
    throw new Error("FedEx warehouse phone number is required for pickup");
  }
};

const validateRecipient = (shipment: JsonRecord) => {
  const recipient = shipment.recipient || {};
  const missingFields: string[] = [];
  const state = String(recipient.stateOrProvinceCode || "").trim().toUpperCase();
  const postalCode = String(recipient.postalCode || "").trim();
  const city = String(recipient.city || "").trim();
  const phone = String(recipient.phone || "").replace(/\D/g, "");

  if (!Array.isArray(recipient.streetLines) || recipient.streetLines.filter(Boolean).length === 0) {
    missingFields.push("recipient street");
  }
  if (!city) missingFields.push("recipient city");
  if (!state) missingFields.push("recipient state");
  if (!postalCode) missingFields.push("recipient ZIP code");
  if (!phone) missingFields.push("recipient phone");

  if (missingFields.length > 0) {
    throw new Error(`FedEx recipient address is incomplete: ${missingFields.join(", ")}`);
  }

  if (!/^[A-Z]{2}$/.test(state)) {
    throw new Error("FedEx recipient state must be a 2-letter US state code");
  }

  if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
    throw new Error("FedEx recipient ZIP code must be a valid US ZIP code");
  }

  if (city.length < 3) {
    throw new Error("FedEx recipient city must contain at least 3 characters");
  }

  if (phone.length < 10) {
    throw new Error("FedEx recipient phone number is required");
  }
};

const ALLOWED_SERVICE_TYPES = new Set([
  "FEDEX_GROUND",
  "GROUND_HOME_DELIVERY",
  "FEDEX_2_DAY",
  "STANDARD_OVERNIGHT",
  "PRIORITY_OVERNIGHT",
]);

const ALLOWED_PACKAGING_TYPES = new Set([
  "YOUR_PACKAGING",
  "FEDEX_BOX",
  "FEDEX_PAK",
  "FEDEX_ENVELOPE",
  "FEDEX_TUBE",
]);

const ALLOWED_PICKUP_TYPES = new Set([
  "USE_SCHEDULED_PICKUP",
  "CONTACT_FEDEX_TO_SCHEDULE",
  "DROPOFF_AT_FEDEX_LOCATION",
]);

const ALLOWED_LABEL_IMAGE_TYPES = new Set(["PDF", "PNG", "ZPLII"]);
const THERMAL_LABEL_IMAGE_TYPES = new Set(["ZPLII"]);
const ALLOWED_PLAIN_PAPER_STOCK_TYPES = new Set([
  "PAPER_85X11_TOP_HALF_LABEL",
  "PAPER_85X11_BOTTOM_HALF_LABEL",
  "PAPER_4X6",
  "PAPER_LETTER",
]);
const ALLOWED_THERMAL_STOCK_TYPES = new Set(["STOCK_4X6"]);

const normalizeEnum = (value: unknown, allowed: Set<string>, fallback: string) => {
  const normalized = String(value || "").trim().toUpperCase();
  return allowed.has(normalized) ? normalized : fallback;
};

const normalizeLabelOptions = (settings: JsonRecord, pkg: JsonRecord = {}) => {
  const imageType = normalizeEnum(
    pkg.labelImageType || settings.fedex_label_image_type,
    ALLOWED_LABEL_IMAGE_TYPES,
    "PDF",
  );
  const labelStockType = THERMAL_LABEL_IMAGE_TYPES.has(imageType)
    ? normalizeEnum(pkg.labelStockType || settings.fedex_label_stock_type, ALLOWED_THERMAL_STOCK_TYPES, "STOCK_4X6")
    : normalizeEnum(
        pkg.labelStockType || settings.fedex_label_stock_type,
        ALLOWED_PLAIN_PAPER_STOCK_TYPES,
        "PAPER_85X11_TOP_HALF_LABEL",
      );

  return { imageType, labelStockType };
};

const cleanObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map(cleanObject)
      .filter((item) => item !== undefined && item !== null && item !== "");
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => [key, cleanObject(entryValue)] as const)
      .filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== "");

    return Object.fromEntries(entries);
  }

  return value;
};

const buildRequestedShipment = (settings: JsonRecord, shipment: JsonRecord, options?: { minimal?: boolean }) => {
  const { accountNumber } = getFedExCredentials(settings);
  const pkg = shipment.package || {};
  const weightUnits = pkg.weightUnits || settings.fedex_default_weight_units || "LB";
  const weightValue = Number(pkg.weightValue || settings.fedex_default_weight_value || 1);
  const dimensionUnits = pkg.dimensionUnits || settings.fedex_default_dimension_units || "IN";
  const length = Number(pkg.length || settings.fedex_default_length || 12);
  const width = Number(pkg.width || settings.fedex_default_width || 10);
  const height = Number(pkg.height || settings.fedex_default_height || 8);
  const normalizedRequestedServiceType = normalizeEnum(
    pkg.serviceType || settings.fedex_default_service_type,
    ALLOWED_SERVICE_TYPES,
    "FEDEX_GROUND",
  );
  const isResidentialRecipient = shipment.recipient?.residential === true;
  const serviceType =
    isResidentialRecipient && normalizedRequestedServiceType === "FEDEX_GROUND"
      ? "GROUND_HOME_DELIVERY"
      : normalizedRequestedServiceType;
  const packagingType = normalizeEnum(
    pkg.packagingType || settings.fedex_default_packaging_type,
    ALLOWED_PACKAGING_TYPES,
    "YOUR_PACKAGING",
  );
  const pickupType = normalizeEnum(
    pkg.pickupType,
    ALLOWED_PICKUP_TYPES,
    "DROPOFF_AT_FEDEX_LOCATION",
  );
  const { imageType, labelStockType } = normalizeLabelOptions(settings, pkg);
  const shipper = buildShipper(settings);
  const selectedPickupType = options?.minimal ? "DROPOFF_AT_FEDEX_LOCATION" : pickupType;
  // Keep the user's requested label output on retry; only strip optional shipment
  // fields that commonly fail in sandbox/fallback paths.
  const selectedImageType = imageType;
  const selectedLabelStockType = labelStockType;
  const requestedShipment = {
    shipDatestamp: new Date().toISOString().slice(0, 10),
    pickupType: selectedPickupType,
    serviceType,
    packagingType,
    rateRequestType: ["ACCOUNT"],
    totalPackageCount: 1,
    ...(options?.minimal
      ? {}
      : {
          totalWeight: {
            units: weightUnits,
            value: weightValue,
          },
        }),
    shipper,
    recipients: [
      {
        contact: {
          personName: shipment.recipient?.name || "Customer",
          phoneNumber: shipment.recipient?.phone || "",
          ...(options?.minimal || !shipment.recipient?.companyName
            ? {}
            : {
                companyName: shipment.recipient.companyName,
              }),
          ...(shipment.recipient?.email ? { emailAddress: shipment.recipient.email } : {}),
        },
        address: {
          streetLines: shipment.recipient?.streetLines || [],
          city: shipment.recipient?.city || "",
          stateOrProvinceCode: shipment.recipient?.stateOrProvinceCode || "",
          postalCode: shipment.recipient?.postalCode || "",
          countryCode: shipment.recipient?.countryCode || "US",
          residential: shipment.recipient?.residential === true,
        },
      },
    ],
    shippingChargesPayment: {
      paymentType: "SENDER",
      payor: {
        responsibleParty: {
          accountNumber: {
            value: accountNumber,
          },
          address: {
            countryCode: shipper.address.countryCode || "US",
          },
        },
      },
    },
    labelSpecification: {
      labelFormatType: "COMMON2D",
      imageType: selectedImageType,
      labelStockType: selectedLabelStockType,
    },
    requestedPackageLineItems: [
      {
        sequenceNumber: 1,
        ...(options?.minimal ? {} : { groupPackageCount: 1 }),
        weight: {
          units: weightUnits,
          value: weightValue,
        },
        dimensions: {
          length,
          width,
          height,
          units: dimensionUnits,
        },
        ...(options?.minimal || !shipment.customerReference
          ? {}
          : {
              customerReferences: [
                {
                  customerReferenceType: "CUSTOMER_REFERENCE",
                  value: shipment.customerReference,
                },
              ],
            }),
      },
    ],
  };

  return cleanObject(requestedShipment);
};

const buildRequestedRateQuoteShipment = (
  settings: JsonRecord,
  shipment: JsonRecord,
  options?: { minimal?: boolean },
) => {
  const requestedShipment = buildRequestedShipment(settings, shipment, options) as JsonRecord;
  const recipient = Array.isArray(requestedShipment.recipients)
    ? requestedShipment.recipients[0]
    : undefined;

  if (recipient) {
    requestedShipment.recipient = recipient;
    delete requestedShipment.recipients;
  }

  return requestedShipment;
};

const extractShipmentResult = (result: JsonRecord) => {
  const completed = result?.output?.transactionShipments?.[0] || result?.transactionShipments?.[0] || {};
  const packageResult = completed?.pieceResponses?.[0]?.packageDocuments?.[0] || completed?.packageDocuments?.[0] || {};
  return {
    trackingNumber:
      completed?.masterTrackingNumber ||
      completed?.pieceResponses?.[0]?.trackingNumber ||
      "",
    labelUrl: packageResult?.url,
    labelBase64: packageResult?.encodedLabel,
    labelFormat: packageResult?.contentType,
    serviceType: completed?.serviceType,
    packagingType: completed?.packagingDescription,
    estimatedDeliveryDate: completed?.serviceCommitMessage?.dateDetail?.dayFormat,
    shipmentId: completed?.shipmentDocuments?.[0]?.trackingNumber,
    raw: result,
  };
};

const extractTrackingResult = (result: JsonRecord) => {
  const track = result?.output?.completeTrackResults?.[0]?.trackResults?.[0] || {};
  const latestScan = track?.scanEvents?.[0];
  return {
    trackingNumber: track?.trackingNumberInfo?.trackingNumber || "",
    status: track?.latestStatusDetail?.code,
    statusDescription: track?.latestStatusDetail?.description,
    estimatedDeliveryDate: track?.estimatedDeliveryTimeWindow?.window?.endsAt || track?.estimatedDeliveryDate,
    latestScan: latestScan?.date,
    raw: result,
  };
};

const extractPickupConfirmation = (result: JsonRecord) =>
  result?.output?.pickupConfirmationCode ||
  result?.output?.pickupConfirmationNumber ||
  result?.output?.pickupNotifications?.[0]?.pickupConfirmationCode ||
  result?.output?.pickupNotifications?.[0]?.pickupConfirmationNumber ||
  result?.pickupConfirmationCode ||
  result?.pickupConfirmationNumber ||
  "";

const extractPickupReadyDate = (result: JsonRecord, fallbackDate: string) =>
  result?.output?.readyDate ||
  result?.output?.readyPickupDate ||
  result?.output?.pickupDate ||
  result?.readyDate ||
  result?.pickupDate ||
  fallbackDate;

const findFirstValueByKeys = (value: unknown, keys: string[]): unknown => {
  if (!value || typeof value !== "object") return undefined;

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findFirstValueByKeys(entry, keys);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const [key, entry] of Object.entries(record)) {
    if (keys.includes(key)) {
      return entry;
    }
  }

  for (const entry of Object.values(record)) {
    const found = findFirstValueByKeys(entry, keys);
    if (found !== undefined) return found;
  }

  return undefined;
};

const normalizeTimeString = (value: unknown, fallback: string) => {
  const raw = String(value || "").trim();
  const match = raw.match(/(\d{2}:\d{2})(?::\d{2})?/);
  if (!match) return fallback;
  return `${match[1]}:00`;
};

const parseDurationMinutes = (value: unknown, fallback: number) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!match) return fallback;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  return hours * 60 + minutes;
};

const timeStringToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map((entry) => Number(entry || 0));
  return (hours * 60) + minutes;
};

const minutesToTimeString = (minutes: number) => {
  const clamped = Math.max(0, Math.min(minutes, (23 * 60) + 59));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
};

const buildPickupAvailabilityPayload = (
  settings: JsonRecord,
  accountNumber: string,
  pickupDate: string,
  carrierCode: string,
) => {
  const pickupLocation = buildPickupLocation(settings, accountNumber);
  const pickupRequestType = pickupDate > new Date().toISOString().slice(0, 10) ? "FUTURE_DAY" : "SAME_DAY";

  return {
    associatedAccountNumber: { value: accountNumber },
    associatedAccountNumberType: resolvePickupAccountType(carrierCode),
    originDetail: {
      pickupAddressType: "ACCOUNT",
      pickupLocation,
      readyDateTimestamp: `${pickupDate}T13:00:00`,
      customerCloseTime: "18:00:00",
      pickupDateType: pickupRequestType,
      packageLocation: "FRONT",
      buildingPart: "BUILDING",
    },
    totalWeight: {
      units: settings.fedex_default_weight_units || "LB",
      value: Number(settings.fedex_default_weight_value || 1),
    },
    packageCount: 1,
    carrierCode,
    accountAddressOfRecord: pickupLocation.address,
    countryRelationships: "DOMESTIC",
  };
};

const derivePickupWindow = (availabilityResult: JsonRecord, pickupDate: string) => {
  const readyTimeValue = findFirstValueByKeys(availabilityResult, [
    "defaultReadyTime",
    "readyTime",
    "defaultReadyPickupTime",
  ]);
  const cutoffTimeValue = findFirstValueByKeys(availabilityResult, [
    "cutoffTime",
    "cutOffTime",
    "customerCloseTime",
    "closeTime",
  ]);
  const accessTimeValue = findFirstValueByKeys(availabilityResult, [
    "accessTime",
    "accessDuration",
  ]);

  const customerCloseTime = normalizeTimeString(cutoffTimeValue, "18:00:00");
  const defaultReadyTime = normalizeTimeString(readyTimeValue, "13:00:00");
  const accessMinutes = parseDurationMinutes(accessTimeValue, 240);
  const latestPickupMinutes = timeStringToMinutes(customerCloseTime);
  const latestReadyMinutes = Math.max(0, latestPickupMinutes - accessMinutes);
  const readyPickupTime = minutesToTimeString(
    Math.min(timeStringToMinutes(defaultReadyTime), latestReadyMinutes),
  );

  return {
    pickupDate,
    customerCloseTime,
    readyPickupDateTime: `${pickupDate}T${readyPickupTime}`,
    latestPickupDateTime: `${pickupDate}T${customerCloseTime}`,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const settings = await getFedExSettings(supabase);
    const activeSettings =
      action === "test_auth" && body.settingsOverride && typeof body.settingsOverride === "object"
        ? { ...settings, ...(body.settingsOverride as JsonRecord) }
        : settings;
    const token = await getAuthToken(activeSettings);
    const activeCredentials = getFedExCredentials(activeSettings);
    const accountNumber = activeCredentials.accountNumber;

    const requireAccountNumber = () => {
      if (!accountNumber) {
        throw new Error(`FedEx ${activeCredentials.mode} account number is missing in admin shipping settings`);
      }
    };

    switch (action) {
      case "test_auth": {
        requireAccountNumber();
        validateShipperSettings(activeSettings);
        const shipper = buildShipper(activeSettings);
        return jsonResponse({
          success: true,
          data: {
            connected: true,
            mode: activeCredentials.mode,
            credentialSet: `${activeCredentials.mode} credentials`,
            accountNumber,
            shipper: {
              companyName: shipper.contact.companyName,
              city: shipper.address.city,
              state: shipper.address.stateOrProvinceCode,
              postalCode: shipper.address.postalCode,
              countryCode: shipper.address.countryCode,
            },
          },
        });
      }

      case "validate_address": {
        const data = await fedexRequest(settings, token, "/address/v1/addresses/resolve", {
          addressesToValidate: [
            {
              address: {
                streetLines: body.address?.streetLines || [],
                city: body.address?.city,
                stateOrProvinceCode: body.address?.stateOrProvinceCode,
                postalCode: body.address?.postalCode,
                countryCode: body.address?.countryCode || "US",
              },
            },
          ],
        });
        return jsonResponse({ success: true, data });
      }

      case "rate_quote": {
        requireAccountNumber();
        validateShipperSettings(settings);
        validateRecipient(body.shipment || {});
        let data: JsonRecord;
        try {
          data = await fedexRequest(activeSettings, token, "/rate/v1/rates/quotes", {
            accountNumber: { value: accountNumber },
            requestedShipment: buildRequestedRateQuoteShipment(activeSettings, body.shipment || {}),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!/invalid field value|unable to process this request/i.test(message)) {
            throw error;
          }

          data = await fedexRequest(activeSettings, token, "/rate/v1/rates/quotes", {
            accountNumber: { value: accountNumber },
            requestedShipment: buildRequestedRateQuoteShipment(activeSettings, body.shipment || {}, { minimal: true }),
          });
        }
        return jsonResponse({ success: true, data });
      }

      case "create_shipment": {
        requireAccountNumber();
        validateShipperSettings(settings);
        validateRecipient(body.shipment || {});
        const createPayload = {
          labelResponseOptions: "LABEL",
          accountNumber: { value: accountNumber },
          requestedShipment: buildRequestedShipment(activeSettings, body.shipment || {}),
        };

        let data: JsonRecord;
        try {
          data = await fedexRequest(activeSettings, token, "/ship/v1/shipments", createPayload);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!/invalid field value|unable to process this request/i.test(message)) {
            throw error;
          }

          data = await fedexRequest(activeSettings, token, "/ship/v1/shipments", {
            labelResponseOptions: "LABEL",
            accountNumber: { value: accountNumber },
            requestedShipment: buildRequestedShipment(activeSettings, body.shipment || {}, { minimal: true }),
          });
        }

        return jsonResponse({ success: true, data: extractShipmentResult(data) });
      }

      case "track": {
        const data = await fedexRequest(activeSettings, token, "/track/v1/trackingnumbers", {
          includeDetailedScans: true,
          trackingInfo: [
            {
              trackingNumberInfo: {
                trackingNumber: String(body.trackingNumber || "").trim(),
              },
            },
          ],
        });
        return jsonResponse({ success: true, data: extractTrackingResult(data) });
      }

      case "pickup_availability": {
        requireAccountNumber();
        validatePickupOriginSettings(activeSettings);
        const carrierCode = resolvePickupCarrierCode(body.serviceType);
        const requestedPickupDate = String(body.pickupDate || "").trim() || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const data = await fedexRequest(
          activeSettings,
          token,
          "/pickup/v1/pickups/availabilities",
          buildPickupAvailabilityPayload(activeSettings, accountNumber, requestedPickupDate, carrierCode),
        );
        return jsonResponse({ success: true, data });
      }

      case "create_pickup": {
        requireAccountNumber();
        validatePickupOriginSettings(activeSettings);
        const carrierCode = resolvePickupCarrierCode(body.serviceType);
        const pickupDate = String(body.pickupDate || "").trim() || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const pickupLocation = buildPickupLocation(activeSettings, accountNumber);
        const availability = await fedexRequest(
          activeSettings,
          token,
          "/pickup/v1/pickups/availabilities",
          buildPickupAvailabilityPayload(activeSettings, accountNumber, pickupDate, carrierCode),
        );
        const pickupWindow = derivePickupWindow(availability, pickupDate);
        const data = await fedexRequest(activeSettings, token, "/pickup/v1/pickups", {
          associatedAccountNumber: { value: accountNumber },
          originDetail: {
            pickupAddressType: "ACCOUNT",
            pickupLocation,
            packageLocation: "FRONT",
            buildingPart: "BUILDING",
            readyPickupDateTime: pickupWindow.readyPickupDateTime,
            latestPickupDateTime: pickupWindow.latestPickupDateTime,
          },
          associatedAccountNumberType: resolvePickupAccountType(carrierCode),
          carrierCode,
          packageCount: 1,
          totalWeight: {
            units: activeSettings.fedex_default_weight_units || "LB",
            value: Number(activeSettings.fedex_default_weight_value || 1),
          },
          accountAddressOfRecord: pickupLocation.address,
          countryRelationships: "DOMESTIC",
          trackingNumber: String(body.trackingNumber || "").trim(),
        });

        return jsonResponse({
          success: true,
          data: {
            confirmationNumber: extractPickupConfirmation(data),
            location:
              data?.output?.location ||
              pickupLocation.contact.companyName,
            readyDate: extractPickupReadyDate(data, pickupDate),
            raw: data,
          },
        });
      }

      case "cancel_pickup": {
        requireAccountNumber();
        const carrierCode = resolvePickupCarrierCode(body.serviceType);
        const data = await fedexRequest(activeSettings, token, "/pickup/v1/pickups/cancel", {
          associatedAccountNumber: { value: accountNumber },
          pickupConfirmationCode: String(body.confirmationNumber || "").trim(),
          scheduledDate: body.scheduledDate,
          carrierCode,
        });
        return jsonResponse({ success: true, data: { confirmationNumber: body.confirmationNumber, raw: data } });
      }

      default:
        return jsonResponse({ success: false, error: "Unsupported FedEx action" }, 400);
    }
  } catch (error) {
    console.error("FedEx API error:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown FedEx error",
      },
    );
  }
});
