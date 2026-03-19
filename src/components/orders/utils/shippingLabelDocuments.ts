import { supabase } from "@/integrations/supabase/client";

const SHIPPING_LABEL_BUCKET = "documents";

export interface ShippingLabelData {
  labelUrl?: string;
  labelBase64?: string;
  labelStoragePath?: string;
  labelFileName?: string;
  labelFormat?: string;
}

export const resolveLabelDocumentInfo = (format?: string, labelBase64?: string) => {
  if (labelBase64) {
    try {
      const binary = window.atob(labelBase64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

      if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
        return { extension: "pdf", mimeType: "application/pdf" };
      }

      if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
        return { extension: "png", mimeType: "image/png" };
      }
    } catch {
      // Fall back to the reported format below.
    }
  }

  const normalized = String(format || "PDF").trim().toLowerCase();

  if (normalized.includes("png")) {
    return { extension: "png", mimeType: "image/png" };
  }

  if (normalized.includes("zpl")) {
    return { extension: "zpl", mimeType: "text/plain" };
  }

  return { extension: "pdf", mimeType: "application/pdf" };
};

export const decodeLabel = (labelBase64: string) => {
  const binary = window.atob(labelBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { binary, bytes };
};

const createLabelBlobUrl = (shipping: ShippingLabelData) => {
  if (!shipping.labelBase64) return null;

  const { mimeType } = resolveLabelDocumentInfo(shipping.labelFormat, shipping.labelBase64);
  const { bytes } = decodeLabel(shipping.labelBase64);
  const blob = new Blob([bytes], { type: mimeType });

  return {
    url: URL.createObjectURL(blob),
    mimeType,
  };
};

const getSignedShippingLabelUrl = async (storagePath: string) => {
  const { data, error } = await supabase.storage
    .from(SHIPPING_LABEL_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Unable to load shipping label");
  }

  return data.signedUrl;
};

const resolveRemoteShippingLabelUrl = async (shipping: ShippingLabelData) => {
  if (shipping.labelStoragePath) {
    return getSignedShippingLabelUrl(shipping.labelStoragePath);
  }

  if (shipping.labelUrl) {
    return shipping.labelUrl;
  }

  return null;
};

export const buildShippingLabelFileName = (
  orderIdOrNumber: string,
  format?: string,
  explicitFileName?: string,
) => {
  if (explicitFileName) return explicitFileName;

  const normalizedFormat = String(format || "").trim().toLowerCase();
  const extension =
    normalizedFormat === "pdf" || normalizedFormat === "png" || normalizedFormat === "zpl"
      ? normalizedFormat
      : resolveLabelDocumentInfo(format).extension;
  const safeOrderId = orderIdOrNumber.replace(/[^a-zA-Z0-9-_]/g, "_") || "fedex-label";
  return `${safeOrderId}-fedex-label.${extension}`;
};

export const hasShippingLabelDocument = (shipping?: ShippingLabelData | null) =>
  Boolean(shipping?.labelStoragePath || shipping?.labelUrl || shipping?.labelBase64);

export const openShippingLabelDocument = async (shipping?: ShippingLabelData | null) => {
  if (!shipping) return false;

  const remoteUrl = await resolveRemoteShippingLabelUrl(shipping);
  if (remoteUrl) {
    window.open(remoteUrl, "_blank", "noopener,noreferrer");
    return true;
  }

  const blobInfo = createLabelBlobUrl(shipping);
  if (!blobInfo) return false;

  window.open(blobInfo.url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(blobInfo.url), 30000);
  return true;
};

export const downloadShippingLabelDocument = async (
  shipping?: ShippingLabelData | null,
  fileName?: string,
) => {
  if (!shipping) return false;

  const remoteUrl = await resolveRemoteShippingLabelUrl(shipping);
  if (remoteUrl) {
    const anchor = document.createElement("a");
    anchor.href = remoteUrl;
    anchor.download = fileName || shipping.labelFileName || "fedex-label";
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  }

  if (shipping.labelBase64) {
    const { mimeType, extension } = resolveLabelDocumentInfo(shipping.labelFormat, shipping.labelBase64);
    const { bytes } = decodeLabel(shipping.labelBase64);
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName || shipping.labelFileName || `fedex-label.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return true;
  }

  return false;
};

export const printShippingLabelDocument = async (shipping?: ShippingLabelData | null) => {
  if (!shipping) return false;

  if (shipping.labelBase64) {
    const blobInfo = createLabelBlobUrl(shipping);
    if (!blobInfo) return false;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.src = blobInfo.url;
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
          URL.revokeObjectURL(blobInfo.url);
        }, 1000);
      }
    };

    return true;
  }

  const remoteUrl = await resolveRemoteShippingLabelUrl(shipping);
  if (!remoteUrl) return false;

  const printWindow = window.open(remoteUrl, "_blank", "noopener,noreferrer");
  if (!printWindow) return false;

  try {
    printWindow.onload = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch {
        // Leave the document open as a fallback when auto-print is blocked.
      }
    };
  } catch {
    // Cross-origin previews may block onload/print access.
  }

  return true;
};

export const uploadShippingLabelToStorage = async ({
  orderId,
  orderNumber,
  labelBase64,
  labelFormat,
  previousStoragePath,
}: {
  orderId: string;
  orderNumber?: string;
  labelBase64: string;
  labelFormat?: string;
  previousStoragePath?: string;
}) => {
  const { bytes } = decodeLabel(labelBase64);
  const { extension, mimeType } = resolveLabelDocumentInfo(labelFormat, labelBase64);
  const fileName = buildShippingLabelFileName(orderNumber || orderId, extension);
  const storagePath = `shipping-labels/${orderId}/${crypto.randomUUID()}.${extension}`;
  const file = new File([bytes], fileName, { type: mimeType });

  const { error: uploadError } = await supabase.storage
    .from(SHIPPING_LABEL_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: mimeType,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Unable to upload shipping label");
  }

  if (previousStoragePath && previousStoragePath !== storagePath) {
    await supabase.storage.from(SHIPPING_LABEL_BUCKET).remove([previousStoragePath]);
  }

  return {
    storagePath,
    fileName,
    mimeType,
  };
};
