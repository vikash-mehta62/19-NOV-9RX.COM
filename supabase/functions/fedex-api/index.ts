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

const getAuthToken = async (settings: JsonRecord) => {
  const apiKey = String(settings.fedex_api_key || "").trim();
  const secretKey = String(settings.fedex_secret_key || "").trim();
  const childKey = String(settings.fedex_child_key || "").trim();
  const childSecret = String(settings.fedex_child_secret || "").trim();

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
    const message =
      result?.errors?.[0]?.message ||
      result?.transactionShipments?.[0]?.alerts?.[0]?.message ||
      "FedEx request failed";
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

const validateShipperSettings = (settings: JsonRecord) => {
  const shipper = buildShipper(settings);
  const missingFields: string[] = [];

  if (!shipper.contact.companyName) missingFields.push("shipping company name");
  if (!shipper.address.streetLines?.length) missingFields.push("shipping street");
  if (!shipper.address.city) missingFields.push("shipping city");
  if (!shipper.address.stateOrProvinceCode) missingFields.push("shipping state");
  if (!shipper.address.postalCode) missingFields.push("shipping ZIP code");

  if (missingFields.length > 0) {
    throw new Error(`FedEx shipper address is incomplete: ${missingFields.join(", ")}`);
  }
};

const validateRecipient = (shipment: JsonRecord) => {
  const recipient = shipment.recipient || {};
  const missingFields: string[] = [];
  const state = String(recipient.stateOrProvinceCode || "").trim().toUpperCase();
  const postalCode = String(recipient.postalCode || "").trim();
  const city = String(recipient.city || "").trim();

  if (!Array.isArray(recipient.streetLines) || recipient.streetLines.filter(Boolean).length === 0) {
    missingFields.push("recipient street");
  }
  if (!city) missingFields.push("recipient city");
  if (!state) missingFields.push("recipient state");
  if (!postalCode) missingFields.push("recipient ZIP code");

  if (missingFields.length > 0) {
    throw new Error(`FedEx recipient address is incomplete: ${missingFields.join(", ")}`);
  }

  if (!/^[A-Z]{2}$/.test(state)) {
    throw new Error("FedEx recipient state must be a 2-letter US state code");
  }

  if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
    throw new Error("FedEx recipient ZIP code must be a valid US ZIP code");
  }
};

const buildRequestedShipment = (settings: JsonRecord, shipment: JsonRecord) => {
  const pkg = shipment.package || {};
  const weightUnits = pkg.weightUnits || settings.fedex_default_weight_units || "LB";
  const weightValue = Number(pkg.weightValue || settings.fedex_default_weight_value || 1);
  const dimensionUnits = pkg.dimensionUnits || settings.fedex_default_dimension_units || "IN";
  const length = Number(pkg.length || settings.fedex_default_length || 12);
  const width = Number(pkg.width || settings.fedex_default_width || 10);
  const height = Number(pkg.height || settings.fedex_default_height || 8);

  return {
    shipDatestamp: new Date().toISOString().slice(0, 10),
    pickupType: pkg.pickupType || settings.fedex_default_pickup_type || "USE_SCHEDULED_PICKUP",
    serviceType: pkg.serviceType || settings.fedex_default_service_type || "FEDEX_GROUND",
    packagingType: pkg.packagingType || settings.fedex_default_packaging_type || "YOUR_PACKAGING",
    totalPackageCount: 1,
    totalWeight: {
      units: weightUnits,
      value: weightValue,
    },
    shipper: buildShipper(settings),
    recipients: [
      {
        contact: {
          personName: shipment.recipient?.name || "Customer",
          phoneNumber: shipment.recipient?.phone || "",
          companyName: shipment.recipient?.name || "Customer",
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
    },
    labelSpecification: {
      imageType: settings.fedex_label_image_type || "PDF",
      labelStockType: settings.fedex_label_stock_type || "PAPER_85X11_TOP_HALF_LABEL",
    },
    requestedPackageLineItems: [
      {
        sequenceNumber: 1,
        groupPackageCount: 1,
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
        customerReferences: shipment.customerReference
          ? [{ customerReferenceType: "CUSTOMER_REFERENCE", value: shipment.customerReference }]
          : undefined,
      },
    ],
  };
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
    const token = await getAuthToken(settings);
    const accountNumber = String(settings.fedex_account_number || "").trim();

    const requireAccountNumber = () => {
      if (!accountNumber) {
        throw new Error("FedEx account number is missing in admin shipping settings");
      }
    };

    switch (action) {
      case "test_auth": {
        return jsonResponse({
          success: true,
          data: {
            connected: true,
            mode: settings.fedex_use_sandbox === false ? "production" : "sandbox",
            accountNumber,
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
        const data = await fedexRequest(settings, token, "/rate/v1/rates/quotes", {
          accountNumber: { value: accountNumber },
          requestedShipment: buildRequestedShipment(settings, body.shipment || {}),
        });
        return jsonResponse({ success: true, data });
      }

      case "create_shipment": {
        requireAccountNumber();
        validateShipperSettings(settings);
        validateRecipient(body.shipment || {});
        const data = await fedexRequest(settings, token, "/ship/v1/shipments", {
          labelResponseOptions: "LABEL",
          accountNumber: { value: accountNumber },
          requestedShipment: buildRequestedShipment(settings, body.shipment || {}),
        });
        return jsonResponse({ success: true, data: extractShipmentResult(data) });
      }

      case "track": {
        const data = await fedexRequest(settings, token, "/track/v1/trackingnumbers", {
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
        validateShipperSettings(settings);
        const shipper = buildShipper(settings);
        const data = await fedexRequest(settings, token, "/pickup/v1/pickups/availabilities", {
          associatedAccountNumber: { value: accountNumber },
          originDetail: {
            pickupLocation: shipper.contact.companyName,
            companyCloseTime: "18:00:00",
            packageLocation: "FRONT",
            buildingPartCode: "BUILDING",
            readyDateTimestamp: new Date().toISOString(),
            customerLocation: "FRONT",
            address: shipper.address,
          },
          carriers: ["FEDEX_EXPRESS", "FEDEX_GROUND"],
        });
        return jsonResponse({ success: true, data });
      }

      case "create_pickup": {
        requireAccountNumber();
        validateShipperSettings(settings);
        const shipper = buildShipper(settings);
        const pickupDate = body.pickupDate || new Date().toISOString().slice(0, 10);
        const data = await fedexRequest(settings, token, "/pickup/v1/pickups", {
          associatedAccountNumber: { value: accountNumber },
          originDetail: {
            pickupLocation: shipper.contact.companyName,
            packageLocation: "FRONT",
            buildingPartCode: "BUILDING",
            readyPickupDateTime: `${pickupDate}T13:00:00`,
            latestPickupDateTime: `${pickupDate}T17:00:00`,
            address: shipper.address,
          },
          carrierCode: "FDXG",
          totalPackageCount: 1,
          totalWeight: {
            units: settings.fedex_default_weight_units || "LB",
            value: Number(settings.fedex_default_weight_value || 1),
          },
          trackingNumber: String(body.trackingNumber || "").trim(),
        });

        return jsonResponse({
          success: true,
          data: {
            confirmationNumber:
              data?.output?.pickupConfirmationCode ||
              data?.pickupConfirmationCode,
            location:
              data?.output?.location ||
              shipper.contact.companyName,
            readyDate: pickupDate,
            raw: data,
          },
        });
      }

      case "cancel_pickup": {
        requireAccountNumber();
        const data = await fedexRequest(settings, token, "/pickup/v1/pickups/cancel", {
          associatedAccountNumber: { value: accountNumber },
          pickupConfirmationCode: String(body.confirmationNumber || "").trim(),
          scheduledDate: body.scheduledDate,
          carrierCode: "FDXG",
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
