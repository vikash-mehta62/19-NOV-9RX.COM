interface ShippingLabelData {
  labelUrl?: string;
  labelBase64?: string;
  labelFormat?: string;
}

const resolveLabelDocumentInfo = (format?: string, labelBase64?: string) => {
  if (labelBase64) {
    try {
      const binary = window.atob(labelBase64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

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

const decodeLabel = (labelBase64: string) => {
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

export const hasShippingLabelDocument = (shipping?: ShippingLabelData | null) =>
  Boolean(shipping?.labelUrl || shipping?.labelBase64);

export const openShippingLabelDocument = (shipping?: ShippingLabelData | null) => {
  if (!shipping) return false;

  if (shipping.labelUrl) {
    window.open(shipping.labelUrl, "_blank", "noopener,noreferrer");
    return true;
  }

  const blobInfo = createLabelBlobUrl(shipping);
  if (!blobInfo) return false;

  window.open(blobInfo.url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(blobInfo.url), 30000);
  return true;
};

export const printShippingLabelDocument = (shipping?: ShippingLabelData | null) => {
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

  if (shipping.labelUrl) {
    const printWindow = window.open(shipping.labelUrl, "_blank", "noopener,noreferrer");
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
  }

  return false;
};
