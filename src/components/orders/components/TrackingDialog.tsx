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

export interface FedExDialogState {
  labelUrl?: string;
  labelBase64?: string;
  labelFormat?: string;
  labelStockType?: string;
  serviceType?: string;
  packagingType?: string;
  estimatedDeliveryDate?: string;
  pickupConfirmationNumber?: string;
  pickupScheduledDate?: string;
  trackingStatus?: string;
  quotedAmount?: number;
  quotedCurrency?: string;
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

const buildLabelFileName = (order?: OrderFormValues, format?: string) => {
  const { extension } = resolveLabelDocumentInfo(format);
  const orderNumber = (order?.order_number || "fedex-label").replace(/[^a-zA-Z0-9-_]/g, "_");
  return `${orderNumber}-fedex-label.${extension}`;
};

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

  return {
    name: order?.shippingAddress?.fullName || order?.customerInfo?.name || "",
    email: order?.shippingAddress?.email || order?.customerInfo?.email || "",
    phone: order?.shippingAddress?.phone || order?.customerInfo?.phone || "",
    street: address?.street || "",
    city: address?.city || "",
    state: normalizeUsStateCode(address?.state),
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
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isGettingRate, setIsGettingRate] = useState(false);
  const [isCheckingTracking, setIsCheckingTracking] = useState(false);
  const [isCheckingPickup, setIsCheckingPickup] = useState(false);
  const [isCreatingPickup, setIsCreatingPickup] = useState(false);
  const [isCancellingPickup, setIsCancellingPickup] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setRecipientDraft(buildRecipientDraft(order));
    setSuggestedRecipientDraft(null);
    setAddressValidated(false);
    setAddressValidationMessage("");
    const storedShipping = ((order as any)?.shipping as Record<string, any> | null) || null;
    setFedexData(
      storedShipping
        ? {
            labelUrl: storedShipping.labelUrl,
            labelBase64: storedShipping.labelBase64,
            labelFormat: storedShipping.labelFormat,
            labelStockType: storedShipping.labelStockType,
            serviceType: storedShipping.serviceType,
            packagingType: storedShipping.packagingType,
            estimatedDeliveryDate: storedShipping.estimatedDelivery,
            pickupConfirmationNumber: storedShipping.pickupConfirmationNumber,
            trackingStatus: storedShipping.trackingStatus,
            quotedAmount:
              typeof storedShipping.quotedAmount === "number"
                ? storedShipping.quotedAmount
                : typeof storedShipping.cost === "number"
                  ? storedShipping.cost
                  : undefined,
            quotedCurrency: storedShipping.quotedCurrency,
          }
        : null,
    );
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
  }, [isOpen, order]);

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
  const hasGeneratedLabel = Boolean(fedexData?.labelBase64 || fedexData?.labelUrl);
  const currentLabelMatchesSelection =
    hasGeneratedLabel &&
    (String(fedexData?.labelFormat || "").toUpperCase() === labelImageType) &&
    (String(fedexData?.labelStockType || "") === labelStockType);

  const updateFedExData = (value: FedExDialogState | null) => {
    setFedexData(value);
    onFedExDataChange?.(value);
  };

  const invalidateGeneratedLabel = (reason?: string) => {
    if ((!fedexData?.labelBase64 && !fedexData?.labelUrl) || !reason) return;

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
      labelBase64: shipment.labelBase64,
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

    const orderUpdates = {
      shipping: savedShipping,
      shippingAddress: savedShippingAddress,
      tracking_number: shipment.trackingNumber,
      shipping_method: "FedEx",
      shipping_cost: shippingCost,
      estimated_delivery: shipment.estimatedDeliveryDate || null,
    };

    const { error } = await supabase
      .from("orders")
      .update(orderUpdates)
      .eq("id", order.id);

    if (error) {
      throw error;
    }

    onOrderUpdate?.(orderUpdates);
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

  const handleUseSuggestedAddress = () => {
    if (!suggestedRecipientDraft) return;

    setRecipientDraft(suggestedRecipientDraft);
    setSuggestedRecipientDraft(null);
    setAddressValidated(false);
    setAddressValidationMessage("Applied FedEx suggested address. Validate again to confirm it before rating or generating the label.");
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
      updateFedExData({
        ...(fedexData || {}),
        quotedAmount: quote.totalNetCharge,
        quotedCurrency: quote.currency || "USD",
        labelStockType,
        serviceType: quote.serviceType || serviceType,
        estimatedDeliveryDate: quote.deliveryTimestamp || fedexData?.estimatedDeliveryDate,
      });
      toast({
        title: "FedEx rate loaded",
        description:
          quote.totalNetCharge != null
            ? `Quoted ${quote.currency || "USD"} ${quote.totalNetCharge.toFixed(2)}`
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
      const shippingCost = Number(
        quotedAmount ?? (order as any)?.shipping_cost ?? (order as any)?.shipping?.cost ?? 0,
      );
      updateFedExData({
        labelUrl: shipment.labelUrl,
        labelBase64: shipment.labelBase64,
        labelFormat: shipment.labelFormat,
        labelStockType,
        serviceType: shipment.serviceType || selectedServiceType,
        packagingType: shipment.packagingType,
        estimatedDeliveryDate: shipment.estimatedDeliveryDate,
        quotedAmount,
        quotedCurrency,
      });

      try {
        await persistGeneratedLabel(
          shipment,
          activeRecipient,
          shippingCost,
          selectedServiceType,
          quotedCurrency,
          quotedAmount,
        );
      } catch (persistError) {
        toast({
          title: "Label created but not saved",
          description:
            persistError instanceof Error
              ? persistError.message
              : "The FedEx label was created, but it could not be auto-saved to this order.",
          variant: "destructive",
        });
      }

      toast({
        title: "FedEx label created",
        description: `Tracking number ${shipment.trackingNumber} is ready and saved to this order.`,
      });
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
      updateFedExData({
        ...(fedexData || {}),
        trackingStatus: result.statusDescription || result.status,
        estimatedDeliveryDate: result.estimatedDeliveryDate || fedexData?.estimatedDeliveryDate,
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
    if (!trackingNumber.trim()) return;
    setIsCheckingPickup(true);
    try {
      await fedexService.getPickupAvailability(trackingNumber);
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

  const downloadLabel = () => {
    if (fedexData?.labelUrl) {
      window.open(fedexData.labelUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (fedexData?.labelBase64) {
      const { mimeType, extension } = detectLabelDocumentInfo(
        fedexData.labelFormat,
        fedexData.labelBase64,
      );
      const { bytes } = decodeBase64Label(fedexData.labelBase64);
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildLabelFileName(order, extension);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  };

  const previewLabel = () => {
    if (fedexData?.labelUrl) {
      window.open(fedexData.labelUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (fedexData?.labelBase64) {
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

  const printLabel = () => {
    if (fedexData?.labelBase64) {
      const { mimeType } = detectLabelDocumentInfo(
        fedexData.labelFormat,
        fedexData.labelBase64,
      );
      const { bytes } = decodeBase64Label(fedexData.labelBase64);
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            URL.revokeObjectURL(url);
          }, 1000);
        }
      };
      return;
    }

    if (fedexData?.labelUrl) {
      const printWindow = window.open(fedexData.labelUrl, "_blank", "noopener,noreferrer");
      if (!printWindow) return;

      try {
        printWindow.onload = () => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {
            // Leave the document open as a manual print fallback.
          }
        };
      } catch {
        // Cross-origin previews may block scripted printing.
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <div className="flex max-h-[90vh] flex-col">
        <DialogHeader>
          <div className="px-6 pt-6">
            <DialogTitle>Shipping & Tracking</DialogTitle>
            <DialogDescription>
            Edit the recipient, validate it with FedEx, then rate and create the shipment label in the same flow.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Shipping Method</Label>
            <RadioGroup value={shippingMethod} onValueChange={onShippingMethodChange}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FedEx" id="fedex" />
                <Label htmlFor="fedex">FedEx</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom">Self Ship</Label>
              </div>
            </RadioGroup>
          </div>

          {shippingMethod === "FedEx" && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label>Recipient</Label>
                <p className="text-sm text-muted-foreground">{recipientSummary || "Enter recipient details"}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Recipient Name</Label>
                  <Input value={recipientDraft.name} onChange={(e) => updateRecipientField("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Recipient Phone</Label>
                  <Input value={recipientDraft.phone} onChange={(e) => updateRecipientField("phone", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Recipient Email</Label>
                  <Input value={recipientDraft.email || ""} onChange={(e) => updateRecipientField("email", e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Street Address</Label>
                  <Input value={recipientDraft.street} onChange={(e) => updateRecipientField("street", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={recipientDraft.city} onChange={(e) => updateRecipientField("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Select value={recipientDraft.state} onValueChange={(value) => updateRecipientField("state", value)}>
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
                  <Input value={recipientDraft.zip_code} maxLength={10} onChange={(e) => updateRecipientField("zip_code", e.target.value)} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={handleValidateAddress} disabled={isValidatingAddress}>
                  {isValidatingAddress ? "Validating..." : "Validate with FedEx"}
                </Button>
                <Button type="button" variant="outline" onClick={handleGetRate} disabled={!canContinueFedExFlow || isGettingRate}>
                  {isGettingRate ? "Loading Rate..." : "Get FedEx Rate"}
                </Button>
              </div>

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

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="space-y-2 md:col-span-2">
                  <Label>Service Type</Label>
                  <Select value={serviceType} onValueChange={setServiceType}>
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
                  <Input value={length} onChange={(e) => setLength(e.target.value)} type="number" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Width (in)</Label>
                  <Input value={width} onChange={(e) => setWidth(e.target.value)} type="number" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Height (in)</Label>
                  <Input value={height} onChange={(e) => setHeight(e.target.value)} type="number" min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Weight (lb)</Label>
                  <Input value={weightValue} onChange={(e) => setWeightValue(e.target.value)} type="number" min="0.1" step="0.1" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleGenerateLabel}
                  disabled={!canContinueFedExFlow || isGeneratingLabel || hasGeneratedLabel}
                >
                  {hasGeneratedLabel
                    ? "FedEx Label Saved"
                    : isGeneratingLabel
                      ? "Generating..."
                      : "Generate FedEx Label"}
                </Button>
                <Button type="button" variant="outline" onClick={handleTrack} disabled={!trackingNumber || isCheckingTracking}>
                  {isCheckingTracking ? "Refreshing..." : "Refresh Tracking"}
                </Button>
                <Button type="button" variant="outline" onClick={handlePickupAvailability} disabled={!trackingNumber || isCheckingPickup}>
                  {isCheckingPickup ? "Checking..." : "Check Pickup"}
                </Button>
              </div>

              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_auto]">
                <div className="space-y-2">
                  <Label>Pickup Date</Label>
                  <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                </div>
                <Button type="button" variant="outline" onClick={handleCreatePickup} disabled={!trackingNumber || isCreatingPickup}>
                  {isCreatingPickup ? "Scheduling..." : "Schedule Pickup"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelPickup} disabled={!fedexData?.pickupConfirmationNumber || isCancellingPickup}>
                  {isCancellingPickup ? "Cancelling..." : "Cancel Pickup"}
                </Button>
              </div>

              {(fedexData?.labelUrl || fedexData?.labelBase64 || fedexData?.trackingStatus || fedexData?.pickupConfirmationNumber || fedexData?.quotedAmount != null) && (
                <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
                  {fedexData?.quotedAmount != null && (
                    <p><span className="font-medium">Quoted Shipping:</span> {fedexData.quotedCurrency || "USD"} {fedexData.quotedAmount.toFixed(2)}</p>
                  )}
                  <p>
                    <span className="font-medium">Label Output:</span> {labelImageType} /{" "}
                    {getLabelStockOptions(labelImageType).find((option) => option.value === labelStockType)?.label || labelStockType}
                  </p>
                  {fedexData?.trackingStatus && <p><span className="font-medium">Tracking Status:</span> {fedexData.trackingStatus}</p>}
                  {fedexData?.estimatedDeliveryDate && <p><span className="font-medium">Estimated Delivery:</span> {fedexData.estimatedDeliveryDate}</p>}
                  {fedexData?.pickupConfirmationNumber && <p><span className="font-medium">Pickup Confirmation:</span> {fedexData.pickupConfirmationNumber}</p>}
                  {(fedexData?.labelUrl || fedexData?.labelBase64) && currentLabelMatchesSelection && (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={previewLabel}>
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
                  {(fedexData?.labelUrl || fedexData?.labelBase64) && !currentLabelMatchesSelection && (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={previewLabel}>
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
          </div>
        </div>
        </div>

        <DialogFooter className="border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit({ recipient: shippingMethod === "FedEx" ? recipientDraft : null })}>
            Save Shipping
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
