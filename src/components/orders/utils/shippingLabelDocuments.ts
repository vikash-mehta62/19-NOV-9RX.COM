import { supabase } from "@/integrations/supabase/client";
import { PDFDocument, degrees } from "pdf-lib";

const SHIPPING_LABEL_BUCKET = "documents";

export interface ShippingLabelData {
  labelUrl?: string;
  labelBase64?: string;
  labelStoragePath?: string;
  labelFileName?: string;
  labelFormat?: string;
  packageLabels?: ShippingLabelData[];
}
interface PrintableLabelDocument {
  bytes: Uint8Array;
  mimeType: string;
  stockType?: string;
}

const isZplFormat = (format?: string) => String(format || "").toLowerCase().includes("zpl");
const isPlainTextLabelFormat = (format?: string) => {
  const normalized = String(format || "").toLowerCase();
  return normalized.includes("zpl") || normalized.includes("text/plain") || normalized.includes("plain");
};
const hasUsableValue = (value: unknown) => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lowered = trimmed.toLowerCase();
  return lowered !== "null" && lowered !== "undefined";
};

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

const normalizeBase64Payload = (value: string) => {
  const raw = String(value || "").trim();
  const payload = raw.includes(",") ? raw.split(",").pop() || "" : raw;
  const cleaned = payload.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padLength = cleaned.length % 4;
  if (padLength === 0) return cleaned;
  return `${cleaned}${"=".repeat(4 - padLength)}`;
};

export const decodeLabel = (labelBase64: string) => {
  const binary = window.atob(normalizeBase64Payload(labelBase64));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { binary, bytes };
};

const detectDocumentInfoFromBytes = (bytes: Uint8Array, formatHint?: string) => {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
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

  if (bytes.length > 0) {
    const sampleSize = Math.min(bytes.length, 512);
    let printable = 0;
    for (let index = 0; index < sampleSize; index += 1) {
      const code = bytes[index];
      const isWhitespace = code === 9 || code === 10 || code === 13;
      const isPrintableAscii = code >= 32 && code <= 126;
      if (isWhitespace || isPrintableAscii) {
        printable += 1;
      }
    }

    const printableRatio = printable / sampleSize;
    if (printableRatio > 0.9) {
      const sampleText = decodeBytesToLatin1(bytes.slice(0, sampleSize)).trim().toLowerCase();
      if (
        sampleText.startsWith("^xa") ||
        sampleText.startsWith("n") ||
        sampleText.startsWith("<?xml") ||
        sampleText.startsWith("<svg") ||
        sampleText.startsWith("{") ||
        sampleText.startsWith("<!doctype html") ||
        sampleText.startsWith("<html")
      ) {
        return { extension: "zpl", mimeType: "text/plain" };
      }
    }
  }

  return resolveLabelDocumentInfo(formatHint);
};

const decodeBytesToText = (bytes: Uint8Array) => {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  const candidate =
    replacementCount > Math.max(8, Math.floor(utf8.length * 0.1))
      ? String.fromCharCode(...bytes)
      : utf8;

  if (candidate.trim().length === 0 && bytes.length > 0) {
    return `[Label content is not plain text. Size: ${bytes.length} bytes]`;
  }

  return candidate;
};

const decodeBytesToLatin1 = (bytes: Uint8Array) => String.fromCharCode(...bytes);
const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.slice(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const isFourBySixStock = (stockType?: string) => {
  const normalized = String(stockType || "").toUpperCase();
  return normalized === "STOCK_4X6" || normalized === "PAPER_4X6";
};

const normalizeThermalPdfToFourBySix = async (bytes: Uint8Array) => {
  const srcDoc = await PDFDocument.load(bytes);
  const outDoc = await PDFDocument.create();
  const targetWidth = 72 * 4; // 4in
  const targetHeight = 72 * 6; // 6in

  const srcPages = srcDoc.getPages();
  for (let index = 0; index < srcPages.length; index += 1) {
    const srcPage = srcPages[index];
    const embedded = await outDoc.embedPage(srcPage);
    const page = outDoc.addPage([targetWidth, targetHeight]);
    const rotation = srcPage.getRotation().angle || 0;
    const normalizedRotation = ((rotation % 360) + 360) % 360;

    const sourceWidth = embedded.width;
    const sourceHeight = embedded.height;
    const effectiveWidth =
      normalizedRotation === 90 || normalizedRotation === 270 ? sourceHeight : sourceWidth;
    const effectiveHeight =
      normalizedRotation === 90 || normalizedRotation === 270 ? sourceWidth : sourceHeight;
    const scale = Math.min(targetWidth / effectiveWidth, targetHeight / effectiveHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;

    if (normalizedRotation === 180) {
      const x = (targetWidth + drawWidth) / 2;
      const y = (targetHeight + drawHeight) / 2;
      page.drawPage(embedded, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
        rotate: degrees(180),
      });
      continue;
    }

    if (normalizedRotation === 90) {
      const effectiveDrawWidth = drawHeight;
      const effectiveDrawHeight = drawWidth;
      const x = (targetWidth + effectiveDrawWidth) / 2;
      const y = (targetHeight - effectiveDrawHeight) / 2;
      page.drawPage(embedded, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
        rotate: degrees(90),
      });
      continue;
    }

    if (normalizedRotation === 270) {
      const effectiveDrawWidth = drawHeight;
      const effectiveDrawHeight = drawWidth;
      const x = (targetWidth - effectiveDrawWidth) / 2;
      const y = (targetHeight + effectiveDrawHeight) / 2;
      page.drawPage(embedded, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
        rotate: degrees(270),
      });
      continue;
    }

    const x = (targetWidth - drawWidth) / 2;
    const y = (targetHeight - drawHeight) / 2;
    page.drawPage(embedded, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return new Uint8Array(await outDoc.save());
};

const openZplPreviewWindow = (zplText: string, autoPrint = false, targetWindow?: Window | null) => {
  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>ZPL Preview</title>
        <style>
          body { font-family: monospace; margin: 0; padding: 16px; background: #f8fafc; color: #0f172a; }
          pre { white-space: pre-wrap; word-break: break-word; margin: 0; line-height: 1.35; }
          .meta { font-size: 12px; color: #475569; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <div class="meta">ZPL label preview</div>
        <pre>${escapeHtml(zplText)}</pre>
        ${
          autoPrint
            ? `<script>window.addEventListener('load', function(){ setTimeout(function(){ window.focus(); window.print(); }, 120); });<\/script>`
            : ""
        }
      </body>
    </html>`;

  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const previewWindow =
    targetWindow && !targetWindow.closed
      ? (targetWindow.location.href = blobUrl, targetWindow)
      : window.open(blobUrl, "_blank");
  if (!previewWindow) {
    URL.revokeObjectURL(blobUrl);
    return false;
  }

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  return true;
};

const renderZplWithLabelary = async (zplText: string, stockType?: string) => {
  // Labelary defaults to inches and density. Keep 4x6 as baseline for thermal labels.
  const sizePath = stockType === "STOCK_4X6" ? "4x6" : "8.5x11";
  const density = stockType === "STOCK_4X6" ? "8dpmm" : "8dpmm";
  const endpoint = `https://api.labelary.com/v1/printers/${density}/labels/${sizePath}/0/`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "image/png",
    },
    body: zplText,
  });

  if (!response.ok) {
    throw new Error(`Labelary render failed (${response.status})`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";
  const detected = detectDocumentInfoFromBytes(bytes, contentType);
  return { bytes, detected };
};

const openRenderedPreviewWindow = (
  bytes: Uint8Array,
  mimeType: string,
  title: string,
  autoPrint = false,
  targetWindow?: Window | null,
  stockType?: string,
) => {
  if (mimeType === "text/plain") {
    return openZplPreviewWindow(decodeBytesToText(bytes), autoPrint, targetWindow);
  }

  const renderDataUrl = `data:${mimeType};base64,${bytesToBase64(bytes)}`;
  const fourBySix = isFourBySixStock(stockType);
  const bodyMarkup =
    mimeType === "application/pdf"
      ? fourBySix
        ? `<div class="thermal-wrap"><iframe id="label-frame" src="${renderDataUrl}" style="width:4in;height:6in;border:1px solid #cbd5e1;background:white;"></iframe></div>`
        : `<iframe id="label-frame" src="${renderDataUrl}" style="width:100%;height:92vh;border:1px solid #cbd5e1;background:white;"></iframe>`
      : `<div class="wrap"><img id="label-image" src="${renderDataUrl}" alt="Label Preview" /></div>`;

  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { margin: 0; padding: ${fourBySix ? "8px" : "12px"}; background: #f8fafc; font-family: sans-serif; }
          .wrap { display: flex; justify-content: center; }
          .thermal-wrap { display: flex; justify-content: center; align-items: flex-start; }
          img { max-width: 100%; height: auto; border: 1px solid #cbd5e1; background: white; }
          ${
            fourBySix
              ? `@page { size: 4in 6in; margin: 0; }
                 @media print {
                   html, body { width: 4in; height: 6in; margin: 0; padding: 0; background: #fff; overflow: hidden; }
                   .thermal-wrap { width: 4in; height: 6in; margin: 0; padding: 0; }
                   #label-frame { width: 4in !important; height: 6in !important; border: 0 !important; }
                 }`
              : ""
          }
        </style>
      </head>
      <body>
        ${bodyMarkup}
        ${
          autoPrint
            ? `<script>
                window.addEventListener('load', function() {
                  var img = document.getElementById('label-image');
                  var frame = document.getElementById('label-frame');
                  if (img) {
                    img.addEventListener('load', function () {
                      setTimeout(function(){ window.focus(); window.print(); }, 180);
                    }, { once: true });
                    return;
                  }
                  if (frame) {
                    frame.addEventListener('load', function () {
                      setTimeout(function(){ window.focus(); window.print(); }, 220);
                    }, { once: true });
                    return;
                  }
                  setTimeout(function(){ window.focus(); window.print(); }, 250);
                });
              <\/script>`
            : ""
        }
      </body>
    </html>`;

  const htmlBlob = new Blob([html], { type: "text/html" });
  const htmlUrl = URL.createObjectURL(htmlBlob);
  const win =
    targetWindow && !targetWindow.closed
      ? (targetWindow.location.href = htmlUrl, targetWindow)
      : window.open(htmlUrl, "_blank");
  if (!win) {
    URL.revokeObjectURL(htmlUrl);
    return false;
  }

  setTimeout(() => {
    URL.revokeObjectURL(htmlUrl);
  }, 60000);
  return true;
};

const printInHiddenFrame = (html: string) =>
  new Promise<boolean>((resolve) => {
    const htmlBlob = new Blob([html], { type: "text/html" });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";

    const cleanup = () => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      URL.revokeObjectURL(htmlUrl);
    };
    let didTriggerPrint = false;

    iframe.onload = () => {
      if (didTriggerPrint) return;
      didTriggerPrint = true;
      try {
        setTimeout(() => {
          try {
            const frameWindow = iframe.contentWindow;
            if (!frameWindow) {
              cleanup();
              resolve(false);
              return;
            }
            frameWindow.focus();
            frameWindow.print();
            setTimeout(() => {
              cleanup();
              resolve(true);
            }, 1200);
          } catch (error) {
            console.error("Hidden frame print failed:", error);
            cleanup();
            resolve(false);
          }
        }, 180);
      } catch {
        cleanup();
        resolve(false);
      }
    };

    iframe.onerror = () => {
      cleanup();
      resolve(false);
    };

    document.body.appendChild(iframe);
    iframe.src = htmlUrl;
  });

const openPdfPrintWindow = (bytes: Uint8Array, stockType?: string) =>
  new Promise<boolean>((resolve) => {
    if (isFourBySixStock(stockType)) {
      const renderDataUrl = `data:application/pdf;base64,${bytesToBase64(bytes)}`;
      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Label Print</title>
            <style>
              @page { size: 4in 6in; margin: 0; }
              html, body { margin: 0; padding: 0; width: 4in; height: 6in; background: #fff; overflow: hidden; }
              iframe { width: 4in; height: 6in; border: 0; display: block; }
            </style>
          </head>
          <body>
            <iframe src="${renderDataUrl}" title="Shipping Label"></iframe>
          </body>
        </html>`;
      printInHiddenFrame(html).then(resolve);
      return;
    }

    const pdfBlob = new Blob([bytes], { type: "application/pdf" });
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";

    const cleanup = () => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      URL.revokeObjectURL(pdfUrl);
    };
    let didTriggerPrint = false;

    iframe.onload = () => {
      if (didTriggerPrint) return;
      didTriggerPrint = true;
      try {
        setTimeout(() => {
          try {
            const frameWindow = iframe.contentWindow;
            if (!frameWindow) {
              cleanup();
              resolve(false);
              return;
            }
            frameWindow.focus();
            frameWindow.print();
            setTimeout(() => {
              cleanup();
              resolve(true);
            }, 1200);
          } catch (error) {
            console.error("PDF print failed:", error);
            cleanup();
            resolve(false);
          }
        }, 220);
      } catch {
        cleanup();
        resolve(false);
      }
    };

    iframe.onerror = () => {
      cleanup();
      resolve(false);
    };

    document.body.appendChild(iframe);
    iframe.src = pdfUrl;
  });

const printTextLabel = (text: string) => {
  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Label Print</title>
        <style>
          @page { margin: 0.25in; }
          body { margin: 0; padding: 0.25in; font-family: monospace; white-space: pre-wrap; word-break: break-word; }
        </style>
      </head>
      <body>${escapeHtml(text)}</body>
    </html>`;
  return printInHiddenFrame(html);
};

const openImagePrintWindow = (
  bytes: Uint8Array,
  mimeType: string,
  stockType?: string,
) => {
  const renderDataUrl = `data:${mimeType};base64,${bytesToBase64(bytes)}`;
  const thermalCss =
    stockType === "STOCK_4X6"
      ? `@page { size: 4in 6in; margin: 0; }
         @media print {
           html, body { width: 4in; height: 6in; margin: 0; padding: 0; overflow: hidden; }
           img { width: 4in; height: 6in; object-fit: contain; border: 0; display: block; }
         }`
      : `@page { margin: 0.25in; }
         @media print {
           html, body { margin: 0; padding: 0; }
           img { max-width: 100%; max-height: 100%; border: 0; display: block; margin: 0 auto; }
         }`;

  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Label Print</title>
        <style>
          html, body { margin: 0; padding: 0; background: #fff; }
          .page { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          img { max-width: 100%; height: auto; display: block; }
          ${thermalCss}
        </style>
      </head>
      <body>
        <div class="page"><img src="${renderDataUrl}" alt="Label Print" /></div>
      </body>
    </html>`;

  return printInHiddenFrame(html);
};

const resolvePrintableLabelDocument = async (
  shipping?: ShippingLabelData | null,
): Promise<PrintableLabelDocument | null> => {
  if (!shipping) return null;

  let bytes: Uint8Array | null = null;
  if (shipping.labelBase64) {
    bytes = decodeLabel(shipping.labelBase64).bytes;
  } else {
    bytes = await fetchRemoteLabelBytes(shipping);
  }
  if (!bytes) return null;

  const detected = detectDocumentInfoFromBytes(bytes, shipping.labelFormat);
  if (detected.mimeType === "text/plain") {
    const zplText = decodeBytesToLatin1(bytes);
    try {
      const rendered = await renderZplWithLabelary(zplText, (shipping as any)?.labelStockType);
      if (rendered.detected.mimeType === "text/plain") {
        const plainTextBytes = new TextEncoder().encode(decodeBytesToText(rendered.bytes));
        return { bytes: plainTextBytes, mimeType: "text/plain", stockType: (shipping as any)?.labelStockType };
      }
      return {
        bytes: rendered.bytes,
        mimeType: rendered.detected.mimeType,
        stockType: (shipping as any)?.labelStockType,
      };
    } catch {
      const plainTextBytes = new TextEncoder().encode(decodeBytesToText(bytes));
      return { bytes: plainTextBytes, mimeType: "text/plain", stockType: (shipping as any)?.labelStockType };
    }
  }

  if (detected.mimeType === "application/pdf" && isFourBySixStock((shipping as any)?.labelStockType)) {
    try {
      const normalizedBytes = await normalizeThermalPdfToFourBySix(bytes);
      return { bytes: normalizedBytes, mimeType: "application/pdf", stockType: (shipping as any)?.labelStockType };
    } catch {
      return { bytes, mimeType: detected.mimeType, stockType: (shipping as any)?.labelStockType };
    }
  }

  return { bytes, mimeType: detected.mimeType, stockType: (shipping as any)?.labelStockType };
};

const createLabelBlobUrl = (shipping: ShippingLabelData) => {
  if (!shipping.labelBase64) return null;

  const { bytes } = decodeLabel(shipping.labelBase64);
  const { mimeType } = detectDocumentInfoFromBytes(bytes, shipping.labelFormat);
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
  if (hasUsableValue(shipping.labelStoragePath)) {
    return getSignedShippingLabelUrl(shipping.labelStoragePath);
  }

  if (hasUsableValue(shipping.labelUrl)) {
    return shipping.labelUrl;
  }

  return null;
};

const fetchRemoteLabelBytes = async (shipping: ShippingLabelData) => {
  const remoteUrl = await resolveRemoteShippingLabelUrl(shipping);
  if (!remoteUrl) return null;
  const response = await fetch(remoteUrl);
  if (!response.ok) {
    throw new Error("Unable to fetch shipping label");
  }
  return new Uint8Array(await response.arrayBuffer());
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
  Boolean(
    hasUsableValue(shipping?.labelStoragePath) ||
    hasUsableValue(shipping?.labelUrl) ||
    (hasUsableValue(shipping?.labelBase64) && String(shipping?.labelBase64 || "").trim().length > 20) ||
    shipping?.packageLabels?.some((label) => hasShippingLabelDocument(label))
  );

export const openShippingLabelDocument = async (shipping?: ShippingLabelData | null) => {
  if (!shipping) return false;
  const hostWindow = window.open("", "_blank");

  const remoteBytes = await fetchRemoteLabelBytes(shipping);
  if (remoteBytes) {
    const detected = detectDocumentInfoFromBytes(remoteBytes, shipping.labelFormat);
    console.info("[Label Preview] remote", {
      requestedFormat: shipping.labelFormat,
      stockType: (shipping as any)?.labelStockType,
      detectedMimeType: detected.mimeType,
      detectedExtension: detected.extension,
      bytes: remoteBytes.length,
    });
    if (detected.mimeType === "text/plain") {
      const zplText = decodeBytesToLatin1(remoteBytes);
      try {
        const rendered = await renderZplWithLabelary(zplText, (shipping as any)?.labelStockType);
        if (rendered.detected.mimeType === "text/plain") {
          return openZplPreviewWindow(decodeBytesToText(rendered.bytes), false, hostWindow);
        }
        return openRenderedPreviewWindow(
          rendered.bytes,
          rendered.detected.mimeType,
          "ZPL Label Preview",
          false,
          hostWindow,
        );
      } catch {
        return openZplPreviewWindow(decodeBytesToText(remoteBytes), false, hostWindow);
      }
    }

    if (detected.mimeType === "application/pdf" && isFourBySixStock((shipping as any)?.labelStockType)) {
      let normalizedBytes = remoteBytes;
      try {
        normalizedBytes = await normalizeThermalPdfToFourBySix(remoteBytes);
      } catch (error) {
        console.warn("Thermal PDF normalization failed in preview, using original bytes:", error);
      }
      return openRenderedPreviewWindow(
        normalizedBytes,
        detected.mimeType,
        "Shipping Label Preview",
        false,
        hostWindow,
        (shipping as any)?.labelStockType,
      );
    }

    const blob = new Blob([remoteBytes], { type: detected.mimeType });
    const blobUrl = URL.createObjectURL(blob);
    if (hostWindow && !hostWindow.closed) {
      hostWindow.location.href = blobUrl;
    } else {
      const fallbackWindow = window.open(blobUrl, "_blank");
      if (!fallbackWindow) {
        URL.revokeObjectURL(blobUrl);
        return false;
      }
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    return true;
  }

  const blobInfo = createLabelBlobUrl(shipping);
  if (!blobInfo) return false;
  console.info("[Label Preview] local", {
    requestedFormat: shipping.labelFormat,
    stockType: (shipping as any)?.labelStockType,
    detectedMimeType: blobInfo.mimeType,
  });

  if (blobInfo.mimeType === "text/plain" && shipping.labelBase64) {
    const { bytes } = decodeLabel(shipping.labelBase64);
    const zplText = decodeBytesToLatin1(bytes);
    try {
      const rendered = await renderZplWithLabelary(zplText, (shipping as any)?.labelStockType);
      if (rendered.detected.mimeType === "text/plain") {
        return openZplPreviewWindow(decodeBytesToText(rendered.bytes), false, hostWindow);
      }
      return openRenderedPreviewWindow(
        rendered.bytes,
        rendered.detected.mimeType,
        "ZPL Label Preview",
        false,
        hostWindow,
        (shipping as any)?.labelStockType,
      );
    } catch {
      return openZplPreviewWindow(decodeBytesToText(bytes), false, hostWindow);
    }
  }

  if (hostWindow && !hostWindow.closed) {
    hostWindow.location.href = blobInfo.url;
  } else {
    const fallbackWindow = window.open(blobInfo.url, "_blank");
    if (!fallbackWindow) {
      URL.revokeObjectURL(blobInfo.url);
      return false;
    }
  }
  setTimeout(() => URL.revokeObjectURL(blobInfo.url), 30000);
  return true;
};

export const downloadShippingLabelDocument = async (
  shipping?: ShippingLabelData | null,
  fileName?: string,
) => {
  if (!shipping) return false;

  const remoteBytes = await fetchRemoteLabelBytes(shipping);
  if (remoteBytes) {
    const detected = detectDocumentInfoFromBytes(remoteBytes, shipping.labelFormat);
    
    // Log format mismatch for debugging
    const requestedFormat = String(shipping.labelFormat || "").toUpperCase();
    const actualFormat = detected.extension.toUpperCase();
    if (requestedFormat.includes("ZPL") && actualFormat === "PDF") {
      console.warn(`Label format mismatch: Requested ${requestedFormat} but received ${actualFormat}. This is a known FedEx API limitation in sandbox mode.`);
    }
    
    const blob = new Blob([remoteBytes], { type: detected.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    // Use detected extension for download filename to match actual content
    const downloadFileName = fileName 
      ? fileName.replace(/\.(pdf|png|zpl)$/i, `.${detected.extension}`)
      : (shipping.labelFileName?.replace(/\.(pdf|png|zpl)$/i, `.${detected.extension}`) || `fedex-label.${detected.extension}`);
    anchor.download = downloadFileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return true;
  }

  if (shipping.labelBase64) {
    const { bytes } = decodeLabel(shipping.labelBase64);
    const { mimeType, extension } = detectDocumentInfoFromBytes(bytes, shipping.labelFormat);
    
    // Log format mismatch for debugging
    const requestedFormat = String(shipping.labelFormat || "").toUpperCase();
    const actualFormat = extension.toUpperCase();
    if (requestedFormat.includes("ZPL") && actualFormat === "PDF") {
      console.warn(`Label format mismatch: Requested ${requestedFormat} but received ${actualFormat}. This is a known FedEx API limitation in sandbox mode.`);
    }
    
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    // Use detected extension for download filename to match actual content
    const downloadFileName = fileName 
      ? fileName.replace(/\.(pdf|png|zpl)$/i, `.${extension}`)
      : (shipping.labelFileName?.replace(/\.(pdf|png|zpl)$/i, `.${extension}`) || `fedex-label.${extension}`);
    anchor.download = downloadFileName;
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

  const printable = await resolvePrintableLabelDocument(shipping);
  if (!printable) return false;
  const { bytes, mimeType } = printable;
  const detected = { mimeType, extension: mimeType === "application/pdf" ? "pdf" : mimeType === "image/png" ? "png" : "txt" };
  console.info("[Label Print]", {
    requestedFormat: shipping.labelFormat,
    stockType: (shipping as any)?.labelStockType,
    detectedMimeType: mimeType,
    detectedExtension: detected.extension,
    bytes: bytes.length,
  });
  if (mimeType === "text/plain") {
    return printTextLabel(decodeBytesToText(bytes));
  }
  if (mimeType === "application/pdf") {
    return await openPdfPrintWindow(bytes, (shipping as any)?.labelStockType);
  }

  return await openImagePrintWindow(
    bytes,
    mimeType,
    (shipping as any)?.labelStockType,
  );
};

export const printAllShippingLabelDocuments = async (labels: Array<ShippingLabelData | null | undefined>) => {
  const validLabels = labels.filter(Boolean) as ShippingLabelData[];
  if (validLabels.length === 0) return false;

  const printableDocs: PrintableLabelDocument[] = [];
  for (const label of validLabels) {
    const printable = await resolvePrintableLabelDocument(label);
    if (printable) printableDocs.push(printable);
  }
  if (printableDocs.length === 0) return false;

  const useFourBySix = printableDocs.every((item) => isFourBySixStock(item.stockType));
  const sheetsHtml = printableDocs
    .map((item, index) => {
      const counter = `<div class="counter">${index + 1} of ${printableDocs.length}</div>`;
      if (item.mimeType === "application/pdf") {
        const dataUrl = `data:application/pdf;base64,${bytesToBase64(item.bytes)}`;
        return `<section class="sheet">${counter}<iframe src="${dataUrl}" title="Label ${index + 1}"></iframe></section>`;
      }
      if (item.mimeType === "image/png") {
        const dataUrl = `data:image/png;base64,${bytesToBase64(item.bytes)}`;
        return `<section class="sheet">${counter}<img src="${dataUrl}" alt="Label ${index + 1}" /></section>`;
      }
      return `<section class="sheet">${counter}<pre>${escapeHtml(decodeBytesToText(item.bytes))}</pre></section>`;
    })
    .join("");

  const html = `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Print All Labels</title>
        <style>
          ${useFourBySix ? "@page { size: 4in 6in; margin: 0; }" : "@page { margin: 0.25in; }"}
          html, body { margin: 0; padding: 0; background: #fff; }
          .sheet {
            position: relative;
            ${useFourBySix ? "width: 4in; height: 6in;" : "width: 100%; min-height: 10in;"}
            page-break-after: always;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .sheet:last-child { page-break-after: auto; }
          .sheet iframe, .sheet img {
            ${useFourBySix ? "width: 4in; height: 6in;" : "width: 100%; height: auto;"}
            border: 0;
            display: block;
          }
          .sheet pre {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 12px;
            font-family: monospace;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .counter {
            position: absolute;
            right: 6px;
            bottom: 4px;
            font-size: 10px;
            color: #334155;
            background: rgba(255,255,255,0.85);
            padding: 1px 4px;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>${sheetsHtml}</body>
    </html>`;

  return printInHiddenFrame(html);
};

export const uploadShippingLabelToStorage = async ({
  orderId,
  orderNumber,
  labelBase64,
  labelFormat,
  previousStoragePath,
  fileNameSuffix,
}: {
  orderId: string;
  orderNumber?: string;
  labelBase64: string;
  labelFormat?: string;
  previousStoragePath?: string;
  fileNameSuffix?: string;
}) => {
  const { bytes } = decodeLabel(labelBase64);
  const { extension, mimeType } = detectDocumentInfoFromBytes(bytes, labelFormat);
  const fileName = buildShippingLabelFileName(
    fileNameSuffix ? `${orderNumber || orderId}-${fileNameSuffix}` : orderNumber || orderId,
    extension,
  );
  const storagePath = `shipping-labels/${orderId}/${crypto.randomUUID()}.${extension}`;
  const mimeCandidates = isPlainTextLabelFormat(labelFormat) || mimeType === "text/plain"
    ? ["text/plain", "application/pdf", "image/png", "application/octet-stream"]
    : [mimeType];
  let uploadedMimeType = mimeCandidates[0];
  let uploadErrorMessage = "";

  for (const candidateMimeType of mimeCandidates) {
    const file = new File([bytes], fileName, { type: candidateMimeType });
    const { error: uploadError } = await supabase.storage
      .from(SHIPPING_LABEL_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: candidateMimeType,
      });

    if (!uploadError) {
      uploadedMimeType = candidateMimeType;
      uploadErrorMessage = "";
      break;
    }

    uploadErrorMessage = uploadError.message || "Unable to upload shipping label";
    const isMimeTypeBlock =
      /invalid_mime_type/i.test(uploadErrorMessage) ||
      /mime type .* is not supported/i.test(uploadErrorMessage) ||
      /statuscode\"?\s*:\s*\"?415/i.test(uploadErrorMessage);
    if (!isMimeTypeBlock) {
      throw new Error(uploadErrorMessage);
    }
  }

  if (uploadErrorMessage) {
    throw new Error(uploadErrorMessage);
  }

  if (previousStoragePath && previousStoragePath !== storagePath) {
    await supabase.storage.from(SHIPPING_LABEL_BUCKET).remove([previousStoragePath]);
  }

  return {
    storagePath,
    fileName,
    mimeType: uploadedMimeType,
  };
};
