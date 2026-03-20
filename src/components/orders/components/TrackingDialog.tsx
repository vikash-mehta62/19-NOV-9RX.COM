"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { OrderFormValues } from "../schemas/orderSchema";
import {
  FedExRecipientInput,
  fedexService,
  getResolvedRecipientDraft,
  normalizeUsStateCode,
} from "@/services/fedexService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  buildShippingLabelFileName,
  downloadShippingLabelDocument,
  hasShippingLabelDocument,
  openShippingLabelDocument,
  printShippingLabelDocument,
} from "../utils/shippingLabelDocuments";

export interface FedExDialogState {
  labelUrl?: string;
  labelBase64?: string;
  labelStoragePath?: string;
  labelFileName?: string;
  labelFormat?: string;
  labelStockType?: string;
  serviceType?: string;
  packagingType?: string;
  estimatedDeliveryDate?: string;
  pickupConfirmationNumber?: string;
  pickupScheduledDate?: string;
  trackingStatus?: string;
  latestScan?: string;
  deliveredAt?: string;
  signedBy?: string;
  deliveryLocation?: string;
  quotedAmount?: number;
  quotedCurrency?: string;
  trackingRaw?: Record<string, any>;
}

export interface TrackingDialogSubmitPayload {
  recipient: FedExRecipientInput | null;
}

interface TrackingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trackingNumber: string;
  onTrackingNumberChange: (value: string) => void;
  shippingMethod: "FedEx" | "custom";
  onShippingMethodChange: (value: "FedEx" | "custom") => void;
  onSubmit: (payload: TrackingDialogSubmitPayload) => void | Promise<void>;
  order?: OrderFormValues;
  onFedExDataChange?: (value: FedExDialogState | null) => void;
  onOrderUpdate?: (updates: Record<string, any>) => void;
}

const FEDEX_SERVICE_OPTIONS = [
  { value: "FEDEX_GROUND", label: "FedEx Ground" },
  { value: "GROUND_HOME_DELIVERY", label: "Ground Home Delivery" },
  { value: "FEDEX_2_DAY", label: "FedEx 2Day" },
  { value: "STANDARD_OVERNIGHT", label: "Standard Overnight" },
  { value: "PRIORITY_OVERNIGHT", label: "Priority Overnight" },
] as const;

const FEDEX_LABEL_FORMAT_OPTIONS = [
  { value: "PDF", label: "PDF", hint: "Best for office printers and browser preview" },
  { value: "PNG", label: "PNG", hint: "Raster image label for flexible preview/download" },
  { value: "ZPLII", label: "ZPL", hint: "Best for Zebra and thermal label printers" },
] as const;

const FEDEX_PAPER_STOCK_OPTIONS = [
  { value: "PAPER_85X11_TOP_HALF_LABEL", label: "8.5 x 11 Top Half" },
  { value: "PAPER_85X11_BOTTOM_HALF_LABEL", label: "8.5 x 11 Bottom Half" },
  { value: "PAPER_4X6", label: "4 x 6 Paper" },
  { value: "PAPER_LETTER", label: "Letter Paper" },
] as const;

const FEDEX_THERMAL_STOCK_OPTIONS = [
  { value: "STOCK_4X6", label: "4 x 6 Thermal" },
] as const;

const US_STATE_OPTIONS = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
] as const;

const STREET_HAS_ALPHA_PATTERN = /[A-Za-z]/;
const FEDEX_QUOTE_TRANSIENT_ERROR_PATTERN =
  /SYSTEM\.UNAVAILABLE\.EXCEPTION|unable to process this request\. please try again later/i;

const cleanAddressText = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/[,\s]+$/g, "")
    .trim();

const resolveLabelDocumentInfo = (format?: string) => {
  const normalized = String(format || "PDF").trim().toLowerCase();

  if (normalized.includes("pdf")) {
    return { extension: "pdf", mimeType: "application/pdf" };
  }

  if (normalized.includes("png")) {
    return { extension: "png", mimeType: "image/png" };
  }

  if (normalized.includes("zpl")) {
    return { extension: "zpl", mimeType: "text/plain" };
  }

  return { extension: "pdf", mimeType: "application/pdf" };
};

const decodeBase64Label = (value: string) => {
  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { binary, bytes };
};

const detectLabelDocumentInfo = (format?: string, labelBase64?: string) => {
  if (!labelBase64) {
    return resolveLabelDocumentInfo(format);
  }

  try {
    const { bytes } = decodeBase64Label(labelBase64);

    if (
      bytes.length >= 4 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    ) {
      return { extension: "pdf", mimeType: "application/pdf" };
    }

    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      return { extension: "png", mimeType: "image/png" };
    }

    const asciiSample = String.fromCharCode(...bytes.slice(0, 32));
    if (/^\^XA|^\s*<\?xml|^\s*N/i.test(asciiSample)) {
      return { extension: "zpl", mimeType: "text/plain" };
    }
  } catch {
    return resolveLabelDocumentInfo(format);
  }

  return resolveLabelDocumentInfo(format);
};

const getLabelStockOptions = (format: string) =>
  format === "ZPLII" ? FEDEX_THERMAL_STOCK_OPTIONS : FEDEX_PAPER_STOCK_OPTIONS;

const normalizeRecipientDraft = (draft: FedExRecipientInput): FedExRecipientInput => ({
  name: draft.name.trim(),
  email: (draft.email || "").trim(),
  phone: draft.phone.replace(/[^\d()+\-\s]/g, "").trim(),
  street: cleanAddressText(draft.street),
  city: cleanAddressText(draft.city),
  state: normalizeUsStateCode(draft.state),
  zip_code: draft.zip_code.trim(),
});

const buildRecipientDraft = (order?: OrderFormValues): FedExRecipientInput => {
  const shippingAddress = order?.shippingAddress?.address;
  const customerAddress = order?.customerInfo?.address;
  const address = shippingAddress || customerAddress;

  const rawState = address?.state || "";
  const normalizedState = normalizeUsStateCode(rawState);

  return {
    name: order?.shippingAddress?.fullName || order?.customerInfo?.name || "",
    email: order?.shippingAddress?.email || order?.customerInfo?.email || "",
    phone: order?.shippingAddress?.phone || order?.customerInfo?.phone || "",
    street: address?.street || "",
    city: address?.city || "",
    state: normalizedState || rawState, // Fallback to original if normalization fails
    zip_code: address?.zip_code || "",
  };
};

const compactObject = <T extends Record<string, any>>(value: T): T =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;

export const TrackingDialog = ({
  isOpen,
  onOpenChange,
  trackingNumber,
  onTrackingNumberChange,
  shippingMethod,
  onShippingMethodChange,
  onSubmit,
  order,
  onFedExDataChange,
  onOrderUpdate,
}: TrackingDialogProps) => {
  const { toast } = useToast();
  const [weightValue, setWeightValue] = useState("1");
  const [length, setLength] = useState("12");
  const [width, setWidth] = useState("10");
  const [height, setHeight] = useState("8");
  const [serviceType, setServiceType] = useState("FEDEX_GROUND");
  const [labelImageType, setLabelImageType] = useState<"PDF" | "PNG" | "ZPLII">("PDF");
  const [labelStockType, setLabelStockType] = useState("PAPER_85X11_TOP_HALF_LABEL");
  const [pickupDate, setPickupDate] = useState("");
  const [recipientDraft, setRecipientDraft] = useState<FedExRecipientInput>(buildRecipientDraft(order));
  const [suggestedRecipientDraft, setSuggestedRecipientDraft] = useState<FedExRecipientInput | null>(null);
  const [addressValidated, setAddressValidated] = useState(false);
  const [addressValidationMessage, setAddressValidationMessage] = useState("");
  const [fedexData, setFedexData] = useState<FedExDialogState | null>(null);
  const [pendingShipmentData, setPendingShipmentData] = useState<{
    shipment: Awaited<ReturnType<typeof fedexService.createShipment>>;
    recipient: FedExRecipientInput;
    shippingCost: number;
    serviceType: string;
    quotedCurrency: string;
    quotedAmount?: number;
  } | null>(null);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isGettingRate, setIsGettingRate] = useState(false);
  const [isCheckingTracking, setIsCheckingTracking] = useState(false);
  const [isCheckingPickup, setIsCheckingPickup] = useState(false);
  const [isCreatingPickup, setIsCreatingPickup] = useState(false);
  const [isCancellingPickup, setIsCancellingPickup] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    // Only reset if we're opening fresh (not already validated)
    if (addressValidated && recipientDraft.name) {
      // Dialog is already in use, don't reset
      return;
    }
    
    setRecipientDraft(buildRecipientDraft(order));
    setSuggestedRecipientDraft(null);
    setAddressValidated(false);
    setAddressValidationMessage("");
    const storedShipping = ((order as any)?.shipping as Record<string, any> | null) || null;
    const storedTrackingNumber = String(
      storedShipping?.trackingNumber ||
        (order as any)?.tracking_number ||
        trackingNumber ||
        "",
    ).trim();
    setFedexData(
      storedShipping
        ? {
            labelUrl: storedShipping.labelUrl,
            labelBase64: storedShipping.labelBase64,
            labelStoragePath: storedShipping.labelStoragePath,
            labelFileName: storedShipping.labelFileName,
            labelFormat: storedShipping.labelFormat,
            labelStockType: storedShipping.labelStockType,
            serviceType: storedShipping.serviceType,
            packagingType: storedShipping.packagingType,
            estimatedDeliveryDate: storedShipping.estimatedDelivery,
            pickupConfirmationNumber: storedShipping.pickupConfirmationNumber,
            trackingStatus: storedShipping.trackingStatus,
            latestScan: storedShipping.latestScan,
            deliveredAt: storedShipping.deliveredAt,
            signedBy: storedShipping.signedBy,
            deliveryLocation: storedShipping.deliveryLocation,
            quotedAmount:
              typeof storedShipping.quotedAmount === "number"
                ? storedShipping.quotedAmount
                : typeof storedShipping.cost === "number"
                  ? storedShipping.cost
                  : undefined,
            quotedCurrency: storedShipping.quotedCurrency,
            trackingRaw: storedShipping.trackingRaw,
          }
        : null,
    );
    if (storedTrackingNumber && storedTrackingNumber !== trackingNumber) {
      onTrackingNumberChange(storedTrackingNumber);
    }
    setPickupDate(String(storedShipping?.pickupScheduledDate || ""));
    setServiceType(String(storedShipping?.serviceType || "FEDEX_GROUND"));
    const nextImageType = String(storedShipping?.labelFormat || "PDF").toUpperCase();
    const normalizedImageType =
      nextImageType === "PNG" || nextImageType === "ZPLII" || nextImageType === "PDF"
        ? (nextImageType as "PDF" | "PNG" | "ZPLII")
        : "PDF";
    const nextStockOptions = getLabelStockOptions(normalizedImageType);
    setLabelImageType(normalizedImageType);
    setLabelStockType(
      nextStockOptions.some((option) => option.value === storedShipping?.labelStockType)
        ? storedShipping.labelStockType
        : nextStockOptions[0].value,
    );
  }, [isOpen]);

  const recipientSummary = useMemo(
    () =>
      [
        recipientDraft.name,
        recipientDraft.street,
        [recipientDraft.city, recipientDraft.state, recipientDraft.zip_code]
          .filter(Boolean)
          .join(", "),
      ]
        .filter(Boolean)
        .join(" • "),
    [recipientDraft],
  );

  const buildPackageInput = (serviceOverride?: string) => ({
    weightValue: Number(weightValue) || 1,
    weightUnits: "LB" as const,
    length: Number(length) || 12,
    width: Number(width) || 10,
    height: Number(height) || 8,
    dimensionUnits: "IN" as const,
    serviceType: serviceOverride || serviceType,
    labelImageType,
    labelStockType,
  });

  const hasSuggestedAddress = useMemo(() => {
    if (!suggestedRecipientDraft) return false;
    return (
      suggestedRecipientDraft.street !== recipientDraft.street ||
      suggestedRecipientDraft.city !== recipientDraft.city ||
      suggestedRecipientDraft.state !== recipientDraft.state ||
      suggestedRecipientDraft.zip_code !== recipientDraft.zip_code
    );
  }, [recipientDraft, suggestedRecipientDraft]);

  const canContinueFedExFlow = addressValidated && !hasSuggestedAddress;
  const hasGeneratedLabel = hasShippingLabelDocument(fedexData);
  const currentLabelMatchesSelection =
    hasGeneratedLabel &&
    (String(fedexData?.labelFormat || "").toUpperCase() === labelImageType) &&
    (String(fedexData?.labelStockType || "") === labelStockType);

  const updateFedExData = (value: FedExDialogState | null) => {
    setFedexData(value);
    onFedExDataChange?.(value);
  };

  const invalidateGeneratedLabel = (reason?: string) => {
    if (!hasShippingLabelDocument(fedexData) || !reason) return;

    toast({
      title: "Generate a new label for these settings",
      description: reason,
    });
  };

  const persistGeneratedLabel = async (
    shipment: Awaited<ReturnType<typeof fedexService.createShipment>>,
    activeRecipient: FedExRecipientInput,
    shippingCost: number,
    selectedServiceType: string,
    selectedQuotedCurrency: string,
    selectedQuotedAmount?: number,
  ) => {
    if (!order?.id) return;

    const existingShipping = (((order as any)?.shipping || {}) as Record<string, any>) || {};
    const existingShippingAddress =
      (((order as any)?.shippingAddress || {}) as Record<string, any>) || {};
    const existingShippingFields =
      ((existingShippingAddress.shipping || {}) as Record<string, any>) || {};

    const savedShipping = compactObject({
      ...existingShipping,
      method: "FedEx",
      cost: shippingCost,
      trackingNumber: shipment.trackingNumber,
      labelUrl: shipment.labelUrl,
      // labelBase64: shipment.labelBase64,  // Don't save base64 - too large for database
      labelFormat: shipment.labelFormat || labelImageType,
      labelStockType,
      serviceType: shipment.serviceType || selectedServiceType,
      packagingType: shipment.packagingType,
      estimatedDelivery: shipment.estimatedDeliveryDate || existingShipping.estimatedDelivery || "",
      quotedAmount: selectedQuotedAmount,
      quotedCurrency: selectedQuotedCurrency,
      pickupConfirmationNumber: existingShipping.pickupConfirmationNumber,
      pickupScheduledDate: existingShipping.pickupScheduledDate,
      trackingStatus: existingShipping.trackingStatus,
    });

    const savedShippingAddress = compactObject({
      ...existingShippingAddress,
      fullName: activeRecipient.name,
      email: activeRecipient.email || "",
      phone: activeRecipient.phone,
      address: {
        street: activeRecipient.street,
        city: activeRecipient.city,
        state: activeRecipient.state,
        zip_code: activeRecipient.zip_code,
      },
      shipping: compactObject({
        ...existingShippingFields,
        street1: activeRecipient.street,
        city: activeRecipient.city,
        state: activeRecipient.state,
        zipCode: activeRecipient.zip_code,
        phone: activeRecipient.phone,
      }),
    });

    // Don't modify order total or shipping_cost field - FedEx charge only in shipping JSON
    const { error } = await (supabase
      .from("orders")
      .update({
        shipping: savedShipping,
        shippingAddress: savedShippingAddress,
        tracking_number: shipment.trackingNumber,
        shipping_method: "FedEx",
        estimated_delivery: shipment.estimatedDeliveryDate || null,
      }) as any)
      .eq("id", order.id);

    if (error) {
      throw error;
    }

    onOrderUpdate?.({
      shipping: savedShipping,
      shippingAddress: savedShippingAddress,
      tracking_number: shipment.trackingNumber,
      shipping_method: "FedEx",
      estimated_delivery: shipment.estimatedDeliveryDate || null,
    });
  };

  const updateRecipientField = (field: keyof FedExRecipientInput, value: string) => {
    let nextValue = value;
    if (field === "state") {
      const normalizedCode = normalizeUsStateCode(value);
      nextValue = normalizedCode || value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
    }
    if (field === "zip_code") {
      const digits = value.replace(/\D/g, "").slice(0, 9);
      nextValue = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    }
    if (field === "phone") nextValue = value.replace(/[^\d()+\-\s]/g, "");

    setRecipientDraft((current) => ({ ...current, [field]: nextValue }));
    setSuggestedRecipientDraft(null);
    setAddressValidated(false);
    setAddressValidationMessage("");
  };

  const validateFedExForm = (draft: FedExRecipientInput = recipientDraft) => {
    if (!order) return "Order details are required before creating a FedEx shipment.";
    if (!draft.name.trim()) return "Recipient name is required.";
    if (!draft.street.trim()) return "Recipient street is required.";
    if (draft.street.trim().length < 5 || !STREET_HAS_ALPHA_PATTERN.test(draft.street)) {
      return "Recipient street must include the full street address, not only a house number.";
    }
    if (!draft.city.trim()) return "Recipient city is required.";
    if (!/^[A-Z]{2}$/.test(draft.state.trim().toUpperCase())) {
      return "Recipient state must be a 2-letter code.";
    }
    if (!/^\d{5}(-\d{4})?$/.test(draft.zip_code.trim())) {
      return "Recipient ZIP code must be a valid US ZIP code.";
    }
    if (draft.phone.replace(/\D/g, "").length < 10) {
      return "Recipient phone must contain at least 10 digits.";
    }
    if (
      draft.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())
    ) {
      return "Recipient email address is invalid.";
    }
    if (!FEDEX_SERVICE_OPTIONS.some((option) => option.value === serviceType)) {
      return "Choose a valid FedEx service type.";
    }

    const numericFields = [
      { label: "Weight", value: Number(weightValue), min: 0.1 },
      { label: "Length", value: Number(length), min: 1 },
      { label: "Width", value: Number(width), min: 1 },
      { label: "Height", value: Number(height), min: 1 },
    ];

    for (const field of numericFields) {
      if (!Number.isFinite(field.value) || field.value < field.min) {
        return `${field.label} must be at least ${field.min}.`;
      }
    }

    return null;
  };

  const formatFedExError = (error: unknown) => {
    const message = error instanceof Error ? error.message : "Unable to complete FedEx request";
    if (/RECIPIENTS\.ADDRESSSTATEORPROVINCECODE\.MISMATCH/i.test(message)) {
      return "Recipient state and ZIP code do not match. Update the recipient address before requesting a FedEx rate or label.";
    }
    if (/SHIPPER\.POSTALSTATE\.MISMATCH/i.test(message)) {
      return "Your admin Shipping Settings have a ship-from state and ZIP mismatch. Fix the Shipping Address in Settings before creating a FedEx label.";
    }
    if (/CRSVZIP\.CODE\.INVALID/i.test(message)) {
      return "FedEx does not service this ZIP/state combination. Verify the recipient ZIP code and state, then try again.";
    }
    if (/rate request type is required/i.test(message) || /RATEREQUESTTYPE\.REQUIRED/i.test(message)) {
      return "FedEx label pricing payload was incomplete. The shipment request has been updated. Refresh and try again.";
    }
    if (/invalid field value in the input/i.test(message)) {
      return "FedEx rejected one or more shipment fields. Check the recipient address, ZIP/state combination, service type, and package details before trying again.";
    }
    return message;
  };

  const ensureAddressValidated = async () => {
    const normalizedDraft = normalizeRecipientDraft(recipientDraft);
    const validationError = validateFedExForm(normalizedDraft);
    if (validationError) {
      throw new Error(validationError);
    }

    setRecipientDraft(normalizedDraft);

    if (addressValidated) return;

    const result = await fedexService.validateAddress(order!, normalizedDraft);
    const resolvedDraft = normalizeRecipientDraft(
      getResolvedRecipientDraft(order!, result, normalizedDraft),
    );
    const resolved = result?.output?.resolvedAddresses?.[0];
    const alertMessage =
      resolved?.customerMessage?.join(" ") ||
      result?.output?.alerts?.[0]?.message ||
      result?.alerts?.[0]?.message ||
      result?.errors?.[0]?.message ||
      "FedEx validated the address.";

    if (!resolved) {
      throw new Error(alertMessage || "FedEx could not validate this address.");
    }

    const nextDraft = {
      ...normalizedDraft,
      name: resolvedDraft.name || normalizedDraft.name,
      email: resolvedDraft.email || normalizedDraft.email || "",
      phone: resolvedDraft.phone || normalizedDraft.phone,
      street: resolvedDraft.street || normalizedDraft.street,
      city: resolvedDraft.city || normalizedDraft.city,
      state: resolvedDraft.state || normalizedDraft.state,
      zip_code: resolvedDraft.zip_code || normalizedDraft.zip_code,
    };

    setSuggestedRecipientDraft(
      nextDraft.street !== normalizedDraft.street ||
        nextDraft.city !== normalizedDraft.city ||
        nextDraft.state !== normalizedDraft.state ||
        nextDraft.zip_code !== normalizedDraft.zip_code
        ? nextDraft
        : null,
    );

    if (/virtual response/i.test(alertMessage || "")) {
      const nextStreet = nextDraft.street.trim();
      const nextState = nextDraft.state.trim().toUpperCase();
      const nextZip = nextDraft.zip_code.trim();
      if (
        nextStreet.length < 5 ||
        !STREET_HAS_ALPHA_PATTERN.test(nextStreet) ||
        !/^[A-Z]{2}$/.test(nextState) ||
        !/^\d{5}(-\d{4})?$/.test(nextZip)
      ) {
        throw new Error(
          "FedEx returned only a virtual address match. Enter the full street name, a valid 2-letter state code, and ZIP code before generating a label."
        );
      }
    }

    setRecipientDraft(nextDraft);
    setAddressValidated(true);
    setAddressValidationMessage(
      /virtual response/i.test(alertMessage || "")
        ? "FedEx sandbox returned a virtual validation response. You can continue testing with this address."
        : alertMessage
    );
  };

  const handleUseSuggestedAddress = async () => {
    if (!suggestedRecipientDraft) return;

    setRecipientDraft(suggestedRecipientDraft);
    setSuggestedRecipientDraft(null);
    setAddressValidated(false);
    setAddressValidationMessage("Applied FedEx suggested address. Validate again to confirm it before rating or generating the label.");
    
    // Save suggested address to order's shipping address
    if (order?.id && onOrderUpdate) {
      const existingShippingAddress = (((order as any)?.shippingAddress || {}) as Record<string, any>) || {};
      const existingShippingFields = ((existingShippingAddress.shipping || {}) as Record<string, any>) || {};
      
      const updatedShippingAddress = compactObject({
        ...existingShippingAddress,
        fullName: suggestedRecipientDraft.name,
        email: suggestedRecipientDraft.email || "",
        phone: suggestedRecipientDraft.phone,
        address: {
          street: suggestedRecipientDraft.street,
          city: suggestedRecipientDraft.city,
          state: suggestedRecipientDraft.state,
          zip_code: suggestedRecipientDraft.zip_code,
        },
        shipping: compactObject({
          ...existingShippingFields,
          street1: suggestedRecipientDraft.street,
          city: suggestedRecipientDraft.city,
          state: suggestedRecipientDraft.state,
          zipCode: suggestedRecipientDraft.zip_code,
          phone: suggestedRecipientDraft.phone,
        }),
      });

      const { error } = await (supabase
        .from("orders")
        .update({
          shippingAddress: updatedShippingAddress,
        }) as any)
        .eq("id", order.id);

      if (error) {
        console.error("Failed to save suggested address:", error);
      } else {
        onOrderUpdate({
          shippingAddress: updatedShippingAddress,
        });
      }
    }
    
    toast({
      title: "FedEx suggestion applied",
      description: "The recipient address was updated with FedEx's suggested values.",
    });
  };

  const handleValidateAddress = async () => {
    if (!order) return;
    setIsValidatingAddress(true);
    try {
      await ensureAddressValidated();
      
      // Save validated address to order's shipping address
      if (order.id && onOrderUpdate) {
        const existingShippingAddress = (((order as any)?.shippingAddress || {}) as Record<string, any>) || {};
        const existingShippingFields = ((existingShippingAddress.shipping || {}) as Record<string, any>) || {};
        
        const updatedShippingAddress = compactObject({
          ...existingShippingAddress,
          fullName: recipientDraft.name,
          email: recipientDraft.email || "",
          phone: recipientDraft.phone,
          address: {
            street: recipientDraft.street,
            city: recipientDraft.city,
            state: recipientDraft.state,
            zip_code: recipientDraft.zip_code,
          },
          shipping: compactObject({
            ...existingShippingFields,
            street1: recipientDraft.street,
            city: recipientDraft.city,
            state: recipientDraft.state,
            zipCode: recipientDraft.zip_code,
            phone: recipientDraft.phone,
          }),
        });

        const { error } = await (supabase
          .from("orders")
          .update({
            shippingAddress: updatedShippingAddress,
          }) as any)
          .eq("id", order.id);

        if (error) {
          console.error("Failed to save validated address:", error);
        } else {
          onOrderUpdate({
            shippingAddress: updatedShippingAddress,
          });
        }
      }
      
      toast({
        title: "Address validated",
        description: "FedEx confirmed the recipient address for shipment.",
      });
    } catch (error) {
      const message = formatFedExError(error);
      setAddressValidated(false);
      setAddressValidationMessage(message);
      toast({
        title: "Address validation failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsValidatingAddress(false);
    }
  };

  const handleGetRate = async () => {
    if (!order) return;
    setIsGettingRate(true);
    try {
      await ensureAddressValidated();
      const activeRecipient = normalizeRecipientDraft(recipientDraft);
      const quote = await fedexService.rateQuote(order, buildPackageInput(), activeRecipient);
      if (quote.serviceType) setServiceType(quote.serviceType);
      
      const newFedExData = {
        ...(fedexData || {}),
        quotedAmount: quote.totalNetCharge,
        quotedCurrency: quote.currency || "USD",
        labelStockType,
        serviceType: quote.serviceType || serviceType,
        estimatedDeliveryDate: quote.deliveryTimestamp || fedexData?.estimatedDeliveryDate,
      };
      
      updateFedExData(newFedExData);
      
      toast({
        title: "FedEx rate loaded",
        description:
          quote.totalNetCharge != null
            ? `Shipping Cost: ${quote.currency || "USD"} $${quote.totalNetCharge.toFixed(2)}`
            : "FedEx returned a shipment quote.",
      });
    } catch (error) {
      toast({
        title: "FedEx quote failed",
        description: formatFedExError(error),
        variant: "destructive",
      });
    } finally {
      setIsGettingRate(false);
    }
  };

  const handleGenerateLabel = async () => {
    if (!order) return;
    setIsGeneratingLabel(true);
    try {
      await ensureAddressValidated();
      let selectedServiceType = serviceType;
      let packageInput = buildPackageInput(selectedServiceType);
      let quotedAmount = fedexData?.quotedAmount;
      let quotedCurrency = fedexData?.quotedCurrency || "USD";

      if (quotedAmount == null) {
        const activeRecipient = normalizeRecipientDraft(recipientDraft);
        try {
          const quote = await fedexService.rateQuote(order, packageInput, activeRecipient);
          quotedAmount = quote.totalNetCharge;
          quotedCurrency = quote.currency || "USD";
          if (quote.serviceType) {
            selectedServiceType = quote.serviceType;
            setServiceType(quote.serviceType);
            packageInput = buildPackageInput(quote.serviceType);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!FEDEX_QUOTE_TRANSIENT_ERROR_PATTERN.test(message)) {
            throw error;
          }
          toast({
            title: "FedEx rate unavailable",
            description:
              "FedEx sandbox pricing is temporarily unavailable. Continuing with label creation.",
          });
        }
      }

      const activeRecipient = normalizeRecipientDraft(recipientDraft);
      const shipment = await fedexService.createShipment(order, packageInput, activeRecipient);
      if (!shipment.trackingNumber) throw new Error("FedEx did not return a tracking number");

      onTrackingNumberChange(shipment.trackingNumber);
      // Use the quoted amount as shipping cost, fallback to 0 if not available
      const shippingCost = Number(quotedAmount ?? 0);
      const newFedExData = {
        labelUrl: shipment.labelUrl,
        labelBase64: shipment.labelBase64,
        labelStoragePath: fedexData?.labelStoragePath,
        labelFileName: fedexData?.labelFileName,
        labelFormat: shipment.labelFormat,
        labelStockType,
        serviceType: shipment.serviceType || selectedServiceType,
        packagingType: shipment.packagingType,
        estimatedDeliveryDate: shipment.estimatedDeliveryDate,
        quotedAmount,
        quotedCurrency,
      };
      
      updateFedExData(newFedExData);

      // Automatically open PDF preview after label generation
      toast({
        title: "FedEx label created",
        description: `Tracking: ${shipment.trackingNumber}. Preview the label, then click "Save Shipping".`,
      });

      // Auto-open preview after a short delay to ensure state is updated
      setTimeout(() => {
        previewLabel();
      }, 500);
    } catch (error) {
      toast({
        title: "FedEx label failed",
        description: formatFedExError(error),
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const handleTrack = async () => {
    if (!trackingNumber.trim()) return;
    setIsCheckingTracking(true);
    try {
      const result = await fedexService.track(trackingNumber);
      const proof = extractProofOfDelivery(result.raw);
      updateFedExData({
        ...(fedexData || {}),
        trackingStatus: result.statusDescription || result.status,
        estimatedDeliveryDate: result.estimatedDeliveryDate || fedexData?.estimatedDeliveryDate,
        latestScan: result.latestScan,
        deliveredAt: proof.deliveredAt,
        signedBy: proof.signedBy,
        deliveryLocation: proof.deliveryLocation,
        trackingRaw: result.raw,
      });
      toast({
        title: "Tracking refreshed",
        description: result.statusDescription || result.status || "Latest FedEx tracking loaded.",
      });
    } catch (error) {
      toast({
        title: "Tracking failed",
        description: error instanceof Error ? error.message : "Unable to refresh tracking",
        variant: "destructive",
      });
    } finally {
      setIsCheckingTracking(false);
    }
  };

  const handlePickupAvailability = async () => {
    setIsCheckingPickup(true);
    try {
      await fedexService.getPickupAvailability(pickupDate || undefined);
      toast({
        title: "Pickup availability loaded",
        description: "FedEx pickup options are available for this shipment.",
      });
    } catch (error) {
      toast({
        title: "Pickup availability failed",
        description: error instanceof Error ? error.message : "Unable to check pickup availability",
        variant: "destructive",
      });
    } finally {
      setIsCheckingPickup(false);
    }
  };

  const handleCreatePickup = async () => {
    if (!trackingNumber.trim()) return;
    setIsCreatingPickup(true);
    try {
      const result = await fedexService.createPickup(trackingNumber, pickupDate || undefined);
      updateFedExData({
        ...(fedexData || {}),
        pickupConfirmationNumber: result.confirmationNumber,
        pickupScheduledDate: result.readyDate || pickupDate || "",
      });
      toast({
        title: "Pickup scheduled",
        description: result.confirmationNumber
          ? `FedEx pickup confirmation: ${result.confirmationNumber}`
          : "FedEx pickup request created.",
      });
    } catch (error) {
      toast({
        title: "Pickup failed",
        description: error instanceof Error ? error.message : "Unable to create pickup request",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPickup(false);
    }
  };

  const handleCancelPickup = async () => {
    if (!fedexData?.pickupConfirmationNumber || !fedexData?.pickupScheduledDate) return;
    setIsCancellingPickup(true);
    try {
      await fedexService.cancelPickup(
        fedexData.pickupConfirmationNumber,
        fedexData.pickupScheduledDate,
      );
      updateFedExData({
        ...(fedexData || {}),
        pickupConfirmationNumber: undefined,
      });
      toast({
        title: "Pickup cancelled",
        description: "FedEx pickup request has been cancelled.",
      });
    } catch (error) {
      toast({
        title: "Cancel pickup failed",
        description: error instanceof Error ? error.message : "Unable to cancel pickup",
        variant: "destructive",
      });
    } finally {
      setIsCancellingPickup(false);
    }
  };

  const downloadLabel = async () => {
    if (!fedexData) return;

    await downloadShippingLabelDocument(
      fedexData,
      buildShippingLabelFileName(order?.order_number || "fedex-label", fedexData.labelFormat, fedexData.labelFileName),
    );
  };

  const previewLabel = async () => {
    if (!fedexData) return;

    if (fedexData.labelStoragePath) {
      await openShippingLabelDocument(fedexData);
      return;
    }

    if (fedexData.labelUrl) {
      window.open(fedexData.labelUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (fedexData.labelBase64) {
      const { mimeType } = detectLabelDocumentInfo(
        fedexData.labelFormat,
        fedexData.labelBase64,
      );
      const { binary, bytes } = decodeBase64Label(fedexData.labelBase64);
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      if (mimeType === "text/plain") {
        const previewWindow = window.open("", "_blank", "noopener,noreferrer");
        if (previewWindow) {
          previewWindow.document.write(
            `<pre style="white-space: pre-wrap; font-family: monospace; padding: 16px;">${binary
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")}</pre>`,
          );
          previewWindow.document.close();
        }
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  };

  const printLabel = async () => {
    if (!fedexData) return;
    await printShippingLabelDocument(fedexData);
  };

  const rateLoaded = fedexData?.quotedAmount != null;
  const pickupScheduled = Boolean(fedexData?.pickupConfirmationNumber);
  const canSaveShipping = Boolean(trackingNumber.trim());
  const hasShipmentActions = Boolean(hasGeneratedLabel || trackingNumber.trim());
  const proofOfDeliveryAvailable = Boolean(fedexData?.deliveredAt || fedexData?.signedBy || fedexData?.deliveryLocation);
  const existingShipping = (((order as any)?.shipping || {}) as Record<string, any>) || {};
  const shipmentAlreadySaved = Boolean(
    existingShipping?.trackingNumber ||
      existingShipping?.labelStoragePath ||
      existingShipping?.labelUrl ||
      existingShipping?.pickupConfirmationNumber ||
      (order as any)?.tracking_number,
  );
  const recipientFieldsReadOnly = shipmentAlreadySaved;
  const packageFieldsReadOnly = shipmentAlreadySaved;

  const extractProofOfDelivery = (raw?: Record<string, any>) => {
    const track = raw?.output?.completeTrackResults?.[0]?.trackResults?.[0] || raw?.completeTrackResults?.[0]?.trackResults?.[0] || {};
    const latestEvent = track?.scanEvents?.[0] || {};
    const deliveryDetails = track?.deliveryDetails || {};
    const latestStatus = track?.latestStatusDetail || {};

    return {
      deliveredAt:
        latestEvent?.date ||
        deliveryDetails?.actualDeliveryTimestamp ||
        track?.actualDeliveryTimestamp ||
        track?.dateAndTimes?.find?.((entry: any) => /DEL/i.test(String(entry?.type || "")))?.dateTime,
      signedBy:
        deliveryDetails?.receivedByName ||
        latestStatus?.ancillaryDetails?.[0]?.value ||
        track?.packageDetails?.proofOfDelivery?.receivedByName,
      deliveryLocation:
        deliveryDetails?.deliveryLocationDescription ||
        latestEvent?.eventDescription ||
        latestStatus?.description,
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <div className="flex max-h-[90vh] flex-col">
        <DialogHeader>
          <div className="px-6 pt-6">
            <DialogTitle>Create Shipment</DialogTitle>
            <DialogDescription>
            Validate the recipient, quote the shipment, generate the label, and save shipping in one guided flow.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4">
          <div className="rounded-2xl border bg-slate-50 p-4 space-y-4">
            <div className="space-y-2">
              <Label>Shipping Method</Label>
              <RadioGroup value={shippingMethod} onValueChange={onShippingMethodChange} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className={`flex cursor-pointer items-start space-x-3 rounded-xl border p-3 ${shippingMethod === "FedEx" ? "border-blue-500 bg-white shadow-sm" : "border-slate-200 bg-white/70"}`}>
                  <RadioGroupItem value="FedEx" id="fedex" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="fedex" className="cursor-pointer">FedEx</Label>
                    <p className="text-xs text-muted-foreground">Validate address, get rate, generate label, then save shipping.</p>
                  </div>
                </label>
                <label className={`flex cursor-pointer items-start space-x-3 rounded-xl border p-3 ${shippingMethod === "custom" ? "border-blue-500 bg-white shadow-sm" : "border-slate-200 bg-white/70"}`}>
                  <RadioGroupItem value="custom" id="custom" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="custom" className="cursor-pointer">Self Ship</Label>
                    <p className="text-xs text-muted-foreground">Use your own carrier and save only the tracking details.</p>
                  </div>
                </label>
              </RadioGroup>
            </div>

          </div>

          {shippingMethod === "FedEx" && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">Step 1: Recipient</div>
                  <p className="text-sm text-muted-foreground">
                    {shipmentAlreadySaved
                      ? "Shipping is already saved. Recipient details are locked for review."
                      : "Confirm the delivery contact and validate the address with FedEx first."}
                  </p>
                  <p className="text-sm text-slate-700">{recipientSummary || "Enter recipient details"}</p>
                </div>
                <Badge variant="outline" className={addressValidated ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}>
                  {shipmentAlreadySaved ? "Saved" : addressValidated ? "Validated" : "Needs Validation"}
                </Badge>
              </div>

              <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${shipmentAlreadySaved ? "opacity-80" : ""}`}>
                <div className="space-y-2">
                  <Label>Recipient Name</Label>
                  <Input readOnly={recipientFieldsReadOnly} value={recipientDraft.name} onChange={(e) => updateRecipientField("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Recipient Phone</Label>
                  <Input readOnly={recipientFieldsReadOnly} value={recipientDraft.phone} onChange={(e) => updateRecipientField("phone", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Recipient Email</Label>
                  <Input readOnly={recipientFieldsReadOnly} value={recipientDraft.email || ""} onChange={(e) => updateRecipientField("email", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Street Address</Label>
                  <Input readOnly={recipientFieldsReadOnly} value={recipientDraft.street} onChange={(e) => updateRecipientField("street", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input readOnly={recipientFieldsReadOnly} value={recipientDraft.city} onChange={(e) => updateRecipientField("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select value={recipientDraft.state} onValueChange={(value) => updateRecipientField("state", value)} disabled={recipientFieldsReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="z-[100002]">
                      {US_STATE_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label} ({value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input readOnly={recipientFieldsReadOnly} value={recipientDraft.zip_code} maxLength={10} onChange={(e) => updateRecipientField("zip_code", e.target.value)} />
                </div>
              </div>

              {!shipmentAlreadySaved && (
                <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleValidateAddress} disabled={isValidatingAddress}>
                  {isValidatingAddress ? "Validating..." : "Validate Address"}
                </Button>
                </div>
              )}

              {addressValidationMessage ? (
                <Alert className={addressValidated ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
                  {addressValidated ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={addressValidated ? "text-emerald-800" : "text-red-700"}>
                    {addressValidationMessage}
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">Step 2: Package & Rate</div>
                  <p className="text-sm text-muted-foreground">Choose service and label settings, then request the FedEx rate.</p>
                </div>
                <Badge variant="outline" className={rateLoaded ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}>
                  {rateLoaded ? "Rate Loaded" : "Awaiting Quote"}
                </Badge>
              </div>

              {/* {fedexData?.quotedAmount != null && (
                <div className="rounded-lg border-2 border-green-300 bg-gradient-to-r from-green-50 to-blue-50 p-4 shadow-md">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-600">FedEx Label Charge:</span>
                        <span className="text-2xl font-bold text-green-700">
                          {fedexData.quotedCurrency || "USD"} ${fedexData.quotedAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-gray-700">
                        <p>
                          <span className="font-medium">Service:</span>{" "}
                          {FEDEX_SERVICE_OPTIONS.find(opt => opt.value === serviceType)?.label || serviceType}
                        </p>
                        {fedexData.estimatedDeliveryDate && (
                          <p>
                            <span className="font-medium">Estimated Delivery:</span>{" "}
                            {new Date(fedexData.estimatedDeliveryDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 italic">
                        This is the FedEx label charge (admin shipping cost). Customer shipping is separate.
                      </p>
                    </div>
                  </div>
                </div>
              )} */}

              {hasSuggestedAddress ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3">
                  <p className="text-sm text-blue-800">
                    FedEx suggested: {suggestedRecipientDraft?.street}, {suggestedRecipientDraft?.city}, {suggestedRecipientDraft?.state} {suggestedRecipientDraft?.zip_code}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-blue-300 bg-white text-blue-700 hover:bg-blue-100"
                    onClick={handleUseSuggestedAddress}
                  >
                    Use FedEx Suggested Address
                  </Button>
                </div>
              ) : null}

              {!canContinueFedExFlow ? (
                <p className="text-sm text-muted-foreground">
                  Validate the recipient address successfully before getting a FedEx rate or generating a label.
                </p>
              ) : null}

              {hasGeneratedLabel ? (
                <Alert className="border-blue-200 bg-blue-50">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    A shipping label already exists for this order. Reuse, preview, or print the saved label below.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className={`grid grid-cols-2 gap-3 md:grid-cols-5 ${shipmentAlreadySaved ? "opacity-80" : ""}`}>
                <div className="space-y-2 md:col-span-2">
                  <Label>Service Type</Label>
                  <Select value={serviceType} onValueChange={setServiceType} disabled={packageFieldsReadOnly}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select FedEx service" />
                    </SelectTrigger>
                    <SelectContent className="z-[100002]">
                      {FEDEX_SERVICE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Label Format</Label>
                  <Select
                    value={labelImageType}
                    disabled={packageFieldsReadOnly}
                    onValueChange={(value: "PDF" | "PNG" | "ZPLII") => {
                      if (value === labelImageType) return;
                      invalidateGeneratedLabel("Label format changed. Generate a new FedEx label to apply this output type.");
                      setLabelImageType(value);
                      setLabelStockType(getLabelStockOptions(value)[0].value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select label format" />
                    </SelectTrigger>
                    <SelectContent className="z-[100002]">
                      {FEDEX_LABEL_FORMAT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} - {option.hint}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Label Size</Label>
                  <Select
                    value={labelStockType}
                    disabled={packageFieldsReadOnly}
                    onValueChange={(value) => {
                      if (value === labelStockType) return;
                      invalidateGeneratedLabel("Label size changed. Generate a new FedEx label to apply this stock size.");
                      setLabelStockType(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select label size" />
                    </SelectTrigger>
                    <SelectContent className="z-[100002]">
                      {getLabelStockOptions(labelImageType).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Length (in)</Label>
                  <Input readOnly={packageFieldsReadOnly} value={length} onChange={(e) => setLength(e.target.value)} type="number" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Width (in)</Label>
                  <Input readOnly={packageFieldsReadOnly} value={width} onChange={(e) => setWidth(e.target.value)} type="number" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Height (in)</Label>
                  <Input readOnly={packageFieldsReadOnly} value={height} onChange={(e) => setHeight(e.target.value)} type="number" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Weight (lb)</Label>
                  <Input readOnly={packageFieldsReadOnly} value={weightValue} onChange={(e) => setWeightValue(e.target.value)} type="number" min="0.1" step="0.1" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!shipmentAlreadySaved && (
                  <>
                <Button type="button" variant="outline" onClick={handleGetRate} disabled={!canContinueFedExFlow || isGettingRate}>
                  {isGettingRate ? "Loading Rate..." : "Get FedEx Rate"}
                </Button>
                <Button
                  type="button"
                  onClick={handleGenerateLabel}
                  disabled={!canContinueFedExFlow || isGeneratingLabel}
                >
                  {isGeneratingLabel
                    ? "Generating..."
                    : hasGeneratedLabel
                      ? "Regenerate FedEx Label"
                      : "Generate FedEx Label"}
                </Button>
                  </>
                )}
                {/* <Button type="button" variant="outline" onClick={handleTrack} disabled={!trackingNumber || isCheckingTracking}>
                  {isCheckingTracking ? "Refreshing..." : "Refresh Tracking"}
                </Button> */}
              </div>

              {/* <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">Step 3: Pickup & Save</div>
                  <p className="text-sm text-muted-foreground">After the label is ready, review tracking, optionally schedule pickup, then save shipping.</p>
                </div>
                <Badge variant="outline" className={pickupScheduled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}>
                  {pickupScheduled ? "Pickup Scheduled" : "Pickup Optional"}
                </Badge>
              </div> */}

              {/* <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_auto]">
                <div className="space-y-2">
                  <Label>Pickup dDate</Label>
                  <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                </div>
                <Button type="button" variant="outline" onClick={handlePickupAvailability} disabled={isCheckingPickup}>
                  {isCheckingPickup ? "Checking..." : "Check Pickup"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCreatePickup} disabled={!trackingNumber || isCreatingPickup}>
                  {isCreatingPickup ? "Scheduling..." : "Schedule Pickup"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelPickup} disabled={!fedexData?.pickupConfirmationNumber || isCancellingPickup}>
                  {isCancellingPickup ? "Cancelling..." : "Cancel Pickup"}
                </Button>
              </div> */}

              {(hasShippingLabelDocument(fedexData) || fedexData?.trackingStatus || fedexData?.pickupConfirmationNumber || fedexData?.quotedAmount != null) && (
                <div className="space-y-3 rounded-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-sky-50 p-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-blue-200 pb-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Shipping Summary</h4>
                  </div>
                  
                  {fedexData?.quotedAmount != null && (
                    <div className="rounded-lg bg-white p-3 border-2 border-blue-300 shadow-sm">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-gray-600">FedEx Label Charge:</span>
                          <span className="text-xl font-bold text-blue-700">
                            {fedexData.quotedCurrency || "USD"} ${fedexData.quotedAmount.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 italic">Admin shipping cost (not added to order total)</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium text-gray-700">Service Type:</span>{" "}
                        <span className="text-gray-900">{FEDEX_SERVICE_OPTIONS.find(opt => opt.value === serviceType)?.label || serviceType}</span>
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Label Format:</span>{" "}
                        <span className="text-gray-900">{labelImageType} / {getLabelStockOptions(labelImageType).find((option) => option.value === labelStockType)?.label || labelStockType}</span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      {fedexData?.estimatedDeliveryDate && (
                        <p>
                          <span className="font-medium text-gray-700">Estimated Delivery:</span>{" "}
                          <span className="text-gray-900">{new Date(fedexData.estimatedDeliveryDate).toLocaleDateString()}</span>
                        </p>
                      )}
                      {fedexData?.trackingStatus && (
                        <p>
                          <span className="font-medium text-gray-700">Tracking Status:</span>{" "}
                          <span className="text-gray-900">{fedexData.trackingStatus}</span>
                        </p>
                      )}
                      {fedexData?.pickupConfirmationNumber && (
                        <p>
                          <span className="font-medium text-gray-700">Pickup Confirmation:</span>{" "}
                          <span className="text-gray-900">{fedexData.pickupConfirmationNumber}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {hasShippingLabelDocument(fedexData) && currentLabelMatchesSelection && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-blue-200">
                      <Button type="button" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={previewLabel}>
                        Preview Label
                      </Button>
                      <Button type="button" variant="outline" onClick={printLabel}>
                        Print Label
                      </Button>
                      <Button type="button" variant="outline" onClick={downloadLabel}>
                        Download Label
                      </Button>
                    </div>
                  )}
                  {hasShippingLabelDocument(fedexData) && !currentLabelMatchesSelection && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-blue-200">
                      <Button type="button" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={previewLabel}>
                        Preview Saved Label
                      </Button>
                      <Button type="button" variant="outline" onClick={printLabel}>
                        Print Saved Label
                      </Button>
                      <Button type="button" variant="outline" onClick={downloadLabel}>
                        Download Saved Label
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Number</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => onTrackingNumberChange(e.target.value)}
              placeholder={shippingMethod === "FedEx" ? "Generate a label or enter tracking number" : "Enter tracking number"}
            />
            <p className="text-xs text-muted-foreground">
              {shippingMethod === "FedEx"
                ? "Tracking is usually filled automatically after label generation, but you can edit it before saving."
                : "Enter the carrier tracking number to save the shipment."}
            </p>
          </div>
        </div>
        </div>

        <DialogFooter className="border-t bg-background px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSaveShipping} onClick={() => onSubmit({ recipient: shippingMethod === "FedEx" ? recipientDraft : null })}>
            Save Shipping
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
