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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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
  packageCount?: number;
  packageLabels?: Array<{
    sequenceNumber?: number;
    trackingNumber?: string;
    labelUrl?: string;
    labelBase64?: string;
    labelStoragePath?: string;
    labelFileName?: string;
    labelFormat?: string;
  }>;
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
  weight?: number;
  weightUnits?: string;
  length?: number;
  width?: number;
  height?: number;
  dimensionUnits?: string;
  trackingRaw?: Record<string, any>;
}

export interface TrackingDialogSubmitPayload {
  recipient: FedExRecipientInput | null;
  packingSlip?: TrackingDialogPackingSlipPayload | null;
}

export interface TrackingDialogPackingSlipPayload {
  shipVia: string;
  trackingNumber: string;
  cartons: number;
  weight: number;
  packedBy: string;
  checkedBy: string;
  notes: string;
  packedAt: string;
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
  showPackingSection?: boolean;
  onDownloadPackingSlip?: (
    packingSlip: TrackingDialogPackingSlipPayload,
    shippingOverride?: Record<string, any>,
  ) => void | Promise<void>;
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
const PACKING_SHIP_VIA_OPTIONS = ["FedEx", "UPS", "USPS", "Other", "Self Ship"] as const;

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

const normalizeBase64Payload = (value: string) => {
  const raw = String(value || "").trim();
  const payload = raw.includes(",") ? raw.split(",").pop() || "" : raw;
  const cleaned = payload.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padLength = cleaned.length % 4;
  if (padLength === 0) return cleaned;
  return `${cleaned}${"=".repeat(4 - padLength)}`;
};

const decodeBase64Label = (value: string) => {
  const binary = window.atob(normalizeBase64Payload(value));
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

const normalizeLabelImageType = (
  value: unknown,
  fallback: "PDF" | "PNG" | "ZPLII" = "ZPLII",
): "PDF" | "PNG" | "ZPLII" => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "PNG") return "PNG";
  if (normalized === "PDF") return "PDF";
  if (normalized === "ZPL" || normalized === "ZPLII" || normalized === "ZPL2") return "ZPLII";
  return fallback;
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

const formatPackSize = (size: Record<string, any>) =>
  [size.size_value, size.size_unit].filter(Boolean).join(" ").trim() ||
  String(size.size_name || size.name || "-");

const buildPackingProductRows = (order?: OrderFormValues) => {
  const rows: Array<{
    key: string;
    sku: string;
    product: string;
    size: string;
    quantity: number;
    quantityPerCase: string;
    notes: string;
  }> = [];

  order?.items?.forEach((item: any, itemIndex: number) => {
    if (Array.isArray(item.sizes) && item.sizes.length > 0) {
      item.sizes.forEach((size: any, sizeIndex: number) => {
        rows.push({
          key: `${item.productId || itemIndex}-${size.id || sizeIndex}`,
          sku: String(size.sku || item.sku || "-"),
          product: String(size.size_name || item.name || "Product"),
          size: formatPackSize(size),
          quantity: Number(size.quantity || 0),
          quantityPerCase: String(size.quantity_per_case || size.qtyPerCase || "-"),
          notes: String(size.notes || item.notes || item.description || ""),
        });
      });
      return;
    }

    rows.push({
      key: `${item.productId || itemIndex}`,
      sku: String(item.sku || "-"),
      product: String(item.name || "Product"),
      size: "-",
      quantity: Number(item.quantity || 0),
      quantityPerCase: String(item.quantity_per_case || item.qtyPerCase || "-"),
      notes: String(item.notes || item.description || ""),
    });
  });

  return rows;
};

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
  showPackingSection = false,
  onDownloadPackingSlip,
}: TrackingDialogProps) => {
  const { toast } = useToast();
  const [weightValue, setWeightValue] = useState("1");
  const [length, setLength] = useState("12");
  const [width, setWidth] = useState("10");
  const [height, setHeight] = useState("8");
  const [packageCount, setPackageCount] = useState("1");
  const [serviceType, setServiceType] = useState("FEDEX_GROUND");
  const [labelImageType, setLabelImageType] = useState<"PDF" | "PNG" | "ZPLII">("ZPLII");
  const [labelStockType, setLabelStockType] = useState("STOCK_4X6");
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
  const [isPrintingLabel, setIsPrintingLabel] = useState(false);
  const [isSavingShipping, setIsSavingShipping] = useState(false);
  const [isSavingPackingSlipDownload, setIsSavingPackingSlipDownload] = useState(false);
  const [packingData, setPackingData] = useState({
    shipVia: "",
    cartons: "1",
    weight: "",
    packedBy: "",
    checkedBy: "",
    notes: "",
  });
  const [packingErrors, setPackingErrors] = useState<string[]>([]);

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
            packageCount: storedShipping.packageCount,
            packageLabels: storedShipping.packageLabels,
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
    const normalizedImageType = normalizeLabelImageType(storedShipping?.labelFormat, "ZPLII");
    const nextStockOptions = getLabelStockOptions(normalizedImageType);
    setLabelImageType(normalizedImageType);
    setLabelStockType(
      nextStockOptions.some((option) => option.value === storedShipping?.labelStockType)
        ? storedShipping.labelStockType
        : nextStockOptions[0].value,
    );
    setWeightValue(
      String(
        storedShipping?.weight ??
          (storedShipping?.packingSlip as Record<string, any> | undefined)?.weight ??
          "1",
      ),
    );
    setPackageCount(String(storedShipping?.packageCount || storedShipping?.packingSlip?.cartons || "1"));
    const savedPackingSlip = (storedShipping?.packingSlip || {}) as Record<string, any>;
    setPackingData({
      shipVia: String(savedPackingSlip.shipVia || storedShipping?.method || "FedEx"),
      cartons: String(savedPackingSlip.cartons || "1"),
      weight: String(
        savedPackingSlip.weight ||
          storedShipping?.weight ||
          fedexData?.weight ||
          weightValue ||
          "",
      ),
      packedBy: String(savedPackingSlip.packedBy || ""),
      checkedBy: String(savedPackingSlip.checkedBy || ""),
      notes: String(savedPackingSlip.notes || ""),
    });
    setPackingErrors([]);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !showPackingSection) return;
    const syncedCartons = String(packageCount || "1").trim();
    setPackingData((prev) =>
      prev.cartons === syncedCartons
        ? prev
        : {
            ...prev,
            cartons: syncedCartons,
          },
    );
  }, [isOpen, showPackingSection, packageCount]);

  useEffect(() => {
    if (!isOpen || !showPackingSection) return;
    const syncedShipVia = shippingMethod === "FedEx" ? "FedEx" : "Self Ship";
    setPackingData((prev) =>
      prev.shipVia === syncedShipVia
        ? prev
        : {
            ...prev,
            shipVia: syncedShipVia,
          },
    );
  }, [isOpen, showPackingSection, shippingMethod]);

  useEffect(() => {
    if (!isOpen || !showPackingSection) return;
    const fallbackWeight = fedexData?.weight != null ? String(fedexData.weight) : "";
    const syncedWeight = String(weightValue || fallbackWeight || "").trim();
    if (!syncedWeight) return;
    setPackingData((prev) =>
      prev.weight === syncedWeight
        ? prev
        : {
            ...prev,
            weight: syncedWeight,
          },
    );
  }, [isOpen, showPackingSection, weightValue, fedexData?.weight]);

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
  const packingProductRows = useMemo(() => buildPackingProductRows(order), [order]);

  const buildPackageInput = (serviceOverride?: string) => ({
    weightValue: Number(weightValue) || 1,
    weightUnits: "LB" as const,
    length: Number(length) || 12,
    width: Number(width) || 10,
    height: Number(height) || 8,
    dimensionUnits: "IN" as const,
    packageCount: Math.max(1, Math.floor(Number(packageCount) || 1)),
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
  const existingShipping = useMemo(
    () => ((((order as any)?.shipping || {}) as Record<string, any>) || {}),
    [order],
  );
  const actionableLabelData = hasShippingLabelDocument(fedexData)
    ? fedexData
    : hasShippingLabelDocument(existingShipping as any)
      ? (existingShipping as any)
      : null;
  const packageLabelActions = useMemo(() => {
    const labels =
      fedexData?.packageLabels?.length
        ? fedexData.packageLabels
        : Array.isArray((existingShipping as any)?.packageLabels)
          ? (existingShipping as any).packageLabels
          : [];
    return labels.filter((label: any) => hasShippingLabelDocument(label));
  }, [fedexData?.packageLabels, existingShipping]);
  const hasActionableLabel = Boolean(actionableLabelData);
  const getPrimaryLabelData = async () => {
    // For multi-carton shipments, label documents often exist per package.
    // Use the first available package label as the primary fallback.
    if (packageLabelActions.length > 0) {
      return packageLabelActions[0];
    }

    if (actionableLabelData) {
      return actionableLabelData;
    }

    return recoverLabelFromStorage();
  };
  const currentLabelMatchesSelection =
    hasGeneratedLabel &&
    (String(fedexData?.labelFormat || "").toUpperCase() === labelImageType) &&
    (String(fedexData?.labelStockType || "") === labelStockType);

  const updateFedExData = (value: FedExDialogState | null) => {
    setFedexData(value);
    onFedExDataChange?.(value);
  };

  const recoverLabelFromStorage = async (): Promise<FedExDialogState | null> => {
    if (!order?.id) return null;

    try {
      const prefix = `shipping-labels/${order.id}`;
      const { data: entries, error } = await supabase.storage
        .from("documents")
        .list(prefix, { limit: 50, sortBy: { column: "created_at", order: "desc" } });

      if (error || !entries || entries.length === 0) {
        return null;
      }

      const firstFile = entries.find((entry) => !!entry.name);
      if (!firstFile?.name) {
        return null;
      }

      const storagePath = `${prefix}/${firstFile.name}`;
      const lowerName = firstFile.name.toLowerCase();
      const recoveredFormat = lowerName.endsWith(".zpl")
        ? "ZPLII"
        : lowerName.endsWith(".png")
          ? "PNG"
          : "PDF";

      const recovered: FedExDialogState = {
        labelStoragePath: storagePath,
        labelFileName: firstFile.name,
        labelFormat: recoveredFormat,
        labelStockType: fedexData?.labelStockType || (existingShipping as any)?.labelStockType,
        serviceType: fedexData?.serviceType || (existingShipping as any)?.serviceType,
        trackingStatus: fedexData?.trackingStatus || (existingShipping as any)?.trackingStatus,
        estimatedDeliveryDate: fedexData?.estimatedDeliveryDate || (existingShipping as any)?.estimatedDelivery,
      };

      console.log("Recovered shipping label from storage:", { orderId: order.id, storagePath });
      updateFedExData({ ...(fedexData || {}), ...recovered });
      return recovered;
    } catch (error) {
      console.error("Failed to recover shipping label from storage:", error);
      return null;
    }
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
      // Persist exactly what user selected in the form.
      labelFormat: labelImageType,
      labelStockType,
      serviceType: shipment.serviceType || selectedServiceType,
      packagingType: shipment.packagingType,
      packageCount: Math.max(1, Math.floor(Number(packageCount) || 1)),
      packageLabels: shipment.packageLabels,
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
    if (!Number.isFinite(Number(packageCount)) || Number(packageCount) < 1) {
      return "Cartons must be at least 1.";
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
      const packageInput = buildPackageInput();
      const quote = await fedexService.rateQuote(order, packageInput, activeRecipient);
      const newFedExData = {
        ...(fedexData || {}),
        labelFormat: labelImageType,
        quotedAmount: quote.totalNetCharge,
        quotedCurrency: quote.currency || "USD",
        labelStockType,
        serviceType,
        estimatedDeliveryDate: quote.deliveryTimestamp || fedexData?.estimatedDeliveryDate,
        weight: packageInput.weightValue,
        weightUnits: packageInput.weightUnits,
        length: packageInput.length,
        width: packageInput.width,
        height: packageInput.height,
        dimensionUnits: packageInput.dimensionUnits,
        packageCount: packageInput.packageCount,
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
        // Keep UI selection as source of truth for persistence/display.
        labelFormat: labelImageType,
        labelStockType,
        serviceType: shipment.serviceType || selectedServiceType,
        packagingType: shipment.packagingType,
        packageCount: packageInput.packageCount,
        packageLabels: shipment.packageLabels,
        estimatedDeliveryDate: shipment.estimatedDeliveryDate,
        quotedAmount,
        quotedCurrency,
        weight: packageInput.weightValue,
        weightUnits: packageInput.weightUnits,
        length: packageInput.length,
        width: packageInput.width,
        height: packageInput.height,
        dimensionUnits: packageInput.dimensionUnits,
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
    const activeLabelData = await getPrimaryLabelData();
    if (!activeLabelData) {
      toast({
        title: "Download failed",
        description: "No saved label is available. Regenerate FedEx label and save shipping.",
        variant: "destructive",
      });
      return;
    }

    console.log("Download label debug:", activeLabelData);
    try {
      const downloaded = await downloadShippingLabelDocument(
        activeLabelData,
        buildShippingLabelFileName(
          order?.order_number || "fedex-label",
          activeLabelData.labelFormat,
          activeLabelData.labelFileName,
        ),
      );
      if (!downloaded) {
        toast({
          title: "Download failed",
          description: "No shipping label content found to download.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unable to download label.",
        variant: "destructive",
      });
    }
  };

  const previewLabel = async () => {
    const activeLabelData = await getPrimaryLabelData();
    if (!activeLabelData) {
      toast({
        title: "Preview failed",
        description: "No saved label is available. Regenerate FedEx label and save shipping.",
        variant: "destructive",
      });
      return;
    }

    console.log("Preview label debug:", activeLabelData);
    try {
      const opened = await openShippingLabelDocument(activeLabelData);
      if (!opened) throw new Error("Saved label could not be opened. Regenerate label and save shipping again.");
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Unable to preview saved label.",
        variant: "destructive",
      });
    }
  };

  const printLabel = async () => {
    setIsPrintingLabel(true);
    const activeLabelData = await getPrimaryLabelData();
    if (!activeLabelData) {
      toast({
        title: "Print failed",
        description: "No saved label is available. Regenerate FedEx label and save shipping.",
        variant: "destructive",
      });
      setIsPrintingLabel(false);
      return;
    }

    console.log("Print label debug:", activeLabelData);
    try {
      const printed = await printShippingLabelDocument(activeLabelData);
      if (!printed) {
        toast({
          title: "Print failed",
          description: "No saved label is available for printing.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Unable to print saved label.",
        variant: "destructive",
      });
    } finally {
      setIsPrintingLabel(false);
    }
  };

  const downloadPackageLabel = async (label: any, index: number) => {
    try {
      const downloaded = await downloadShippingLabelDocument(
        label,
        buildShippingLabelFileName(
          `${order?.order_number || "fedex-label"}-box-${label.sequenceNumber || index + 1}`,
          label.labelFormat || fedexData?.labelFormat,
          label.labelFileName,
        ),
      );
      if (!downloaded) {
        throw new Error("No shipping label content found to download.");
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unable to download label.",
        variant: "destructive",
      });
    }
  };

  const printPackageLabel = async (label: any) => {
    setIsPrintingLabel(true);
    try {
      const printed = await printShippingLabelDocument(label);
      if (!printed) throw new Error("No shipping label content found to print.");
    } catch (error) {
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Unable to print label.",
        variant: "destructive",
      });
    } finally {
      setIsPrintingLabel(false);
    }
  };

  const downloadAllPackageLabels = async () => {
    if (packageLabelActions.length === 0) {
      await downloadLabel();
      return;
    }

    for (const [index, label] of packageLabelActions.entries()) {
      await downloadPackageLabel(label, index);
    }
  };

  const printAllPackageLabels = async () => {
    if (packageLabelActions.length === 0) {
      await printLabel();
      return;
    }

    setIsPrintingLabel(true);
    try {
      for (const label of packageLabelActions) {
        const printed = await printShippingLabelDocument(label);
        if (!printed) throw new Error("No shipping label content found to print.");
      }
    } catch (error) {
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Unable to print all labels.",
        variant: "destructive",
      });
    } finally {
      setIsPrintingLabel(false);
    }
  };

  const updatePackingField = (field: keyof typeof packingData, value: string) => {
    setPackingData((prev) => ({ ...prev, [field]: value }));
    if (field === "cartons") {
      setPackageCount(value);
    }
    if (packingErrors.length > 0) {
      setPackingErrors([]);
    }
  };

  const validatePackingSection = () => {
    if (!showPackingSection) return true;
    const errors: string[] = [];
    if (!packingData.shipVia.trim()) errors.push("Ship Via is required");
    if (!packingData.cartons.trim() || Number(packingData.cartons) <= 0) errors.push("Cartons must be greater than 0");
    if (!packingData.weight.trim() || Number(packingData.weight) <= 0) errors.push("Weight must be greater than 0");
    if (!packingData.packedBy.trim()) errors.push("Packed By is required");
    if (!packingData.checkedBy.trim()) errors.push("Checked By is required");
    if (
      packingData.packedBy.trim() &&
      packingData.checkedBy.trim() &&
      packingData.packedBy.trim().toLowerCase() === packingData.checkedBy.trim().toLowerCase()
    ) {
      errors.push("Packed By and Checked By must be different");
    }
    setPackingErrors(errors);
    return errors.length === 0;
  };

  const buildPackingSlipPayload = (): TrackingDialogPackingSlipPayload => ({
    shipVia: packingData.shipVia.trim(),
    trackingNumber: trackingNumber.trim(),
    cartons: Number(packingData.cartons || 0),
    weight: Number(packingData.weight || 0),
    packedBy: packingData.packedBy.trim(),
    checkedBy: packingData.checkedBy.trim(),
    notes: packingData.notes.trim(),
    packedAt: new Date().toISOString(),
  });

  const handleSaveShipping = async () => {
    if (!validatePackingSection()) return;
    setIsSavingShipping(true);
    try {
      await onSubmit({
        recipient: shippingMethod === "FedEx" ? recipientDraft : null,
        packingSlip: showPackingSection ? buildPackingSlipPayload() : null,
      });
    } finally {
      setIsSavingShipping(false);
    }
  };

  const handleDownloadPackingSlip = async () => {
    if (!showPackingSection) return;
    if (!validatePackingSection()) return;
    if (!onDownloadPackingSlip) return;
    setIsSavingPackingSlipDownload(true);
    try {
      const packingSlip = buildPackingSlipPayload();
      await onDownloadPackingSlip(packingSlip, {
        ...(((order as any)?.shipping || {}) as Record<string, any>),
        method: shippingMethod,
        trackingNumber: trackingNumber.trim(),
        weight: fedexData?.weight || (order as any)?.shipping?.weight,
        weightUnits: fedexData?.weightUnits || (order as any)?.shipping?.weightUnits || "LB",
        labelUrl: fedexData?.labelUrl || (order as any)?.shipping?.labelUrl,
        labelStoragePath: fedexData?.labelStoragePath || (order as any)?.shipping?.labelStoragePath,
        labelFileName: fedexData?.labelFileName || (order as any)?.shipping?.labelFileName,
        labelFormat: fedexData?.labelFormat || (order as any)?.shipping?.labelFormat,
        labelStockType: fedexData?.labelStockType || (order as any)?.shipping?.labelStockType,
        serviceType: fedexData?.serviceType || (order as any)?.shipping?.serviceType,
        packagingType: fedexData?.packagingType || (order as any)?.shipping?.packagingType,
        packageCount: fedexData?.packageCount || (order as any)?.shipping?.packageCount,
        packageLabels: fedexData?.packageLabels || (order as any)?.shipping?.packageLabels,
        packingSlip: {
          ...((((order as any)?.shipping || {}) as Record<string, any>)?.packingSlip || {}),
          ...packingSlip,
          trackingNumber: trackingNumber.trim(),
        },
      });
    } finally {
      setIsSavingPackingSlipDownload(false);
    }
  };

  const rateLoaded = fedexData?.quotedAmount != null;
  const currentRateMatchesSelection =
    rateLoaded &&
    String(fedexData?.serviceType || "") === serviceType &&
    String(fedexData?.labelFormat || "").toUpperCase() === labelImageType &&
    String(fedexData?.labelStockType || "") === labelStockType &&
    Number(fedexData?.packageCount || 0) === Math.max(1, Math.floor(Number(packageCount) || 1)) &&
    Number(fedexData?.weight || 0) === (Number(weightValue) || 1) &&
    Number(fedexData?.length || 0) === (Number(length) || 12) &&
    Number(fedexData?.width || 0) === (Number(width) || 10) &&
    Number(fedexData?.height || 0) === (Number(height) || 8);
  const pickupScheduled = Boolean(fedexData?.pickupConfirmationNumber);
  const canSaveShipping = Boolean(trackingNumber.trim());
  const hasShipmentActions = Boolean(hasGeneratedLabel || trackingNumber.trim());
  const proofOfDeliveryAvailable = Boolean(fedexData?.deliveredAt || fedexData?.signedBy || fedexData?.deliveryLocation);
  const hasSavedLabelDocument = hasShippingLabelDocument(existingShipping as any) || hasShippingLabelDocument(fedexData);
  const shipmentAlreadySaved = Boolean(
    existingShipping?.trackingNumber ||
      existingShipping?.labelStoragePath ||
      existingShipping?.labelUrl ||
      existingShipping?.pickupConfirmationNumber ||
      (order as any)?.tracking_number,
  );
  const recipientFieldsReadOnly = hasSavedLabelDocument;
  const packageFieldsReadOnly = hasSavedLabelDocument;

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
                    {hasSavedLabelDocument
                      ? "Shipping is already saved. Recipient details are locked for review."
                      : shipmentAlreadySaved
                        ? "Shipment is saved but label file is missing. Validate and regenerate the label, then save shipping."
                      : "Confirm the delivery contact and validate the address with FedEx first."}
                  </p>
                  <p className="text-sm text-slate-700">{recipientSummary || "Enter recipient details"}</p>
                </div>
                <Badge variant="outline" className={addressValidated ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}>
                  {hasSavedLabelDocument ? "Saved" : shipmentAlreadySaved ? "Label Missing" : addressValidated ? "Validated" : "Needs Validation"}
                </Badge>
              </div>

              <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${hasSavedLabelDocument ? "opacity-80" : ""}`}>
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

              {!hasSavedLabelDocument && (
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

              <div className={`grid grid-cols-2 gap-3 md:grid-cols-5 ${hasSavedLabelDocument ? "opacity-80" : ""}`}>
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
                      setLabelStockType((current) => {
                        const nextOptions = getLabelStockOptions(value);
                        return nextOptions.some((option) => option.value === current)
                          ? current
                          : nextOptions[0].value;
                      });
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
                  <Label>Cartons</Label>
                  <Input
                    readOnly={packageFieldsReadOnly}
                    value={packageCount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPackageCount(value);
                      updatePackingField("cartons", value);
                    }}
                    type="number"
                    min="1"
                    step="1"
                  />
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

              {Number(packageCount) > 1 ? (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Multiple cartons will use the same weight and dimensions for each carton. Use separate shipments if cartons have different sizes or weights.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {!hasSavedLabelDocument && (
                  <>
                <Button type="button" variant="outline" onClick={handleGetRate} disabled={!canContinueFedExFlow || isGettingRate}>
                  {isGettingRate ? "Loading Rate..." : "Get FedEx Rate"}
                </Button>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          type="button"
                          onClick={handleGenerateLabel}
                          disabled={!canContinueFedExFlow || !currentRateMatchesSelection || isGeneratingLabel}
                          className="pointer-events-auto"
                        >
                          {isGeneratingLabel
                            ? "Generating..."
                            : hasGeneratedLabel
                              ? "Regenerate FedEx Label"
                              : "Generate FedEx Label"}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!currentRateMatchesSelection && (
                      <TooltipContent>
                        <p>First get FedEx rate</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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
                      <p>
                        <span className="font-medium text-gray-700">Cartons:</span>{" "}
                        <span className="text-gray-900">{fedexData?.packageCount || packageCount || "1"}</span>
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
                  
                  {hasActionableLabel && packageLabelActions.length <= 1 && currentLabelMatchesSelection && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-blue-200">
                      <Button type="button" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={previewLabel}>
                        Preview Label
                      </Button>
                      <Button type="button" variant="outline" onClick={printLabel} disabled={isPrintingLabel}>
                        {isPrintingLabel ? "Printing..." : "Print Label"}
                      </Button>
                      <Button type="button" variant="outline" onClick={downloadLabel}>
                        Download Label
                      </Button>
                    </div>
                  )}
                  {hasActionableLabel && packageLabelActions.length <= 1 && !currentLabelMatchesSelection && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-blue-200">
                      <Button type="button" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={previewLabel}>
                        Preview Saved Label
                      </Button>
                      <Button type="button" variant="outline" onClick={printLabel} disabled={isPrintingLabel}>
                        {isPrintingLabel ? "Printing..." : "Print Saved Label"}
                      </Button>
                      <Button type="button" variant="outline" onClick={downloadLabel}>
                        Download Saved Label
                      </Button>
                    </div>
                  )}
                  {packageLabelActions.length > 1 ? (
                    <div className="space-y-2 border-t border-blue-200 pt-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs font-semibold uppercase text-blue-700">Package Labels</p>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={downloadAllPackageLabels}>
                            Download All
                          </Button>
                          <Button type="button" variant="outline" onClick={printAllPackageLabels} disabled={isPrintingLabel}>
                            {isPrintingLabel ? "Printing..." : "Print All"}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {packageLabelActions.map((label: any, index: number) => (
                          <div
                            key={`${label.trackingNumber || label.labelStoragePath || index}`}
                            className="rounded-lg border border-blue-200 bg-white p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">Box {label.sequenceNumber || index + 1}</p>
                                {label.trackingNumber ? (
                                  <p className="text-xs text-slate-500">Tracking {label.trackingNumber}</p>
                                ) : null}
                              </div>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                Label
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => openShippingLabelDocument(label)}>
                                Preview
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => downloadPackageLabel(label, index)}>
                                Download
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => printPackageLabel(label)} disabled={isPrintingLabel}>
                                Print
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tracking">
              {packageLabelActions.length > 1 ? "Master Tracking Number" : "Tracking Number"}
            </Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => onTrackingNumberChange(e.target.value)}
              placeholder={shippingMethod === "FedEx" ? "Generate a label or enter tracking number" : "Enter tracking number"}
            />
            {packageLabelActions.length > 1 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Package Tracking Numbers</p>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {packageLabelActions.map((label: any, index: number) => (
                    <div key={`${label.trackingNumber || index}`} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-500">Box {label.sequenceNumber || index + 1}</p>
                      <p className="font-mono text-sm font-semibold text-slate-900">
                        {label.trackingNumber || "Not returned"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {shippingMethod === "FedEx"
                ? packageLabelActions.length > 1
                  ? "FedEx returns one master tracking number for the order and individual tracking numbers for each box."
                  : "Tracking is usually filled automatically after label generation, but you can edit it before saving."
                : "Enter the carrier tracking number to save the shipment."}
            </p>
          </div>

          {showPackingSection && (
        <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-blue-900">Packing Slip Details</h4>
                <Badge variant="outline" className="border-blue-300 bg-white text-blue-700">
                  One-Step Save
                </Badge>
              </div>

              <div className="rounded-lg border border-blue-200 bg-white">
                <div className="flex items-center justify-between border-b border-blue-100 px-3 py-2">
                  <h5 className="text-sm font-semibold text-slate-900">Products to Pack</h5>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {packingProductRows.length} item{packingProductRows.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                {packingProductRows.length > 0 ? (
                  <div className="max-h-56 overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">SKU</th>
                          <th className="px-3 py-2 font-semibold">Product</th>
                          <th className="px-3 py-2 font-semibold">Size</th>
                          <th className="px-3 py-2 text-right font-semibold">Qty</th>
                          <th className="px-3 py-2 text-right font-semibold">Qty/Case</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {packingProductRows.map((item) => (
                          <tr key={item.key}>
                            <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">{item.sku}</td>
                            <td className="px-3 py-2 text-slate-900">
                              <div className="font-medium">{item.product}</div>
                              {item.notes ? <div className="mt-1 text-xs text-slate-500">{item.notes}</div> : null}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-700">{item.size}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-900">{item.quantity}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-slate-700">{item.quantityPerCase}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-3 py-4 text-sm text-muted-foreground">
                    No product lines are available for this order.
                  </p>
                )}
              </div>

              {packingErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc pl-4">
                      {packingErrors.map((error, idx) => (
                        <li key={`${error}-${idx}`}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ship Via</Label>
                  <Select
                    value={packingData.shipVia || "FedEx"}
                    disabled
                    onValueChange={(value) => updatePackingField("shipVia", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Ship Via" />
                    </SelectTrigger>
                    <SelectContent className="z-[100002]">
                      {PACKING_SHIP_VIA_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cartons</Label>
                  <Input
                    type="number"
                    min="1"
                    value={packingData.cartons}
                    onChange={(event) => updatePackingField("cartons", event.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (lbs)</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={packingData.weight}
                    readOnly
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Packed By</Label>
                  <Input
                    value={packingData.packedBy}
                    onChange={(event) => updatePackingField("packedBy", event.target.value)}
                    placeholder="Packer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Checked By</Label>
                  <Input
                    value={packingData.checkedBy}
                    onChange={(event) => updatePackingField("checkedBy", event.target.value)}
                    placeholder="Checker name"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Special Instructions</Label>
                  <Textarea
                    value={packingData.notes}
                    onChange={(event) => updatePackingField("notes", event.target.value)}
                    placeholder="Optional notes..."
                    rows={3}
                  />
                </div>
              </div>

              {onDownloadPackingSlip && (
                <div className="border-t border-blue-200 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadPackingSlip}
                    disabled={isSavingShipping || isSavingPackingSlipDownload}
                    className="gap-2"
                  >
                    {isSavingPackingSlipDownload && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSavingPackingSlipDownload ? "Generating..." : "Download Packing Slip"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        </div>

        <DialogFooter className="border-t bg-background px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSaveShipping || isSavingShipping} onClick={handleSaveShipping}>
            {isSavingShipping ? "Saving..." : "Save Shipping"}
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
