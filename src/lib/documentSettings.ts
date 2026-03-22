import { supabase } from "@/integrations/supabase/client";

type RawSettings = Record<string, any> | null | undefined;

export interface DocumentAddressSettings {
  name: string;
  email: string;
  phone: string;
  taxId?: string;
  website?: string;
  street: string;
  suite: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface AdminDocumentSettings {
  invoice: DocumentAddressSettings;
  shipping: DocumentAddressSettings;
  warehouse: DocumentAddressSettings;
}

export const DEFAULT_ADMIN_DOCUMENT_SETTINGS: AdminDocumentSettings = {
  invoice: {
    name: "9RX LLC",
    email: "info@9rx.com",
    phone: "+1 (800) 940-9619",
    taxId: "99-0540972",
    website: "www.9rx.com",
    street: "936 Broad River Ln",
    suite: "",
    city: "Charlotte",
    state: "NC",
    zipCode: "28211",
    country: "USA",
  },
  shipping: {
    name: "9RX Shipping",
    email: "info@9rx.com",
    phone: "+1 (800) 940-9619",
    street: "936 Broad River Ln",
    suite: "",
    city: "Charlotte",
    state: "NC",
    zipCode: "28211",
    country: "USA",
  },
  warehouse: {
    name: "9RX Warehouse",
    email: "info@9rx.com",
    phone: "+1 (800) 940-9619",
    street: "936 Broad River Ln",
    suite: "",
    city: "Charlotte",
    state: "NC",
    zipCode: "28211",
    country: "USA",
  },
};

const buildBusinessFallback = (settings: RawSettings): DocumentAddressSettings => ({
  name: String(settings?.business_name || DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.name),
  email: String(settings?.email || DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.email),
  phone: String(settings?.phone || DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.phone),
  taxId: String(settings?.tax_id_display || DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.taxId || ""),
  website: DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.website,
  street: String(settings?.address || DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.street),
  suite: String(settings?.suite || ""),
  city: String(settings?.city || DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.city),
  state: String(settings?.state || DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.state),
  zipCode: String(settings?.zip_code || DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.zipCode),
  country: "USA",
});

const buildScopedAddress = (
  settings: RawSettings,
  prefix: "invoice" | "shipping" | "warehouse",
  fallback: DocumentAddressSettings
): DocumentAddressSettings => ({
  name: String(
    prefix === "warehouse"
      ? settings?.warehouse_name || fallback.name
      : settings?.[`${prefix}_company_name`] || fallback.name
  ),
  email: String(settings?.[`${prefix}_email`] || fallback.email),
  phone: String(settings?.[`${prefix}_phone`] || fallback.phone),
  taxId:
    prefix === "invoice"
      ? String(settings?.invoice_tax_id || fallback.taxId || "")
      : fallback.taxId,
  website:
    prefix === "invoice"
      ? String(settings?.invoice_website || fallback.website || "")
      : fallback.website,
  street: String(settings?.[`${prefix}_street`] || fallback.street),
  suite: String(settings?.[`${prefix}_suite`] || fallback.suite),
  city: String(settings?.[`${prefix}_city`] || fallback.city),
  state: String(settings?.[`${prefix}_state`] || fallback.state),
  zipCode: String(settings?.[`${prefix}_zip_code`] || fallback.zipCode),
  country: String(settings?.[`${prefix}_country`] || fallback.country || "USA"),
});

export const formatDocumentAddressLine = (address: DocumentAddressSettings) =>
  [address.street, address.suite, [address.city, address.state, address.zipCode].filter(Boolean).join(", "), address.country]
    .filter(Boolean)
    .join(", ");

export const formatDocumentContactLine = (address: DocumentAddressSettings) =>
  [
    address.phone ? `Phone: ${address.phone}` : "",
    address.email ? `Email: ${address.email}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");

export const formatDocumentMetaLine = (address: DocumentAddressSettings) =>
  [
    address.taxId ? `Tax ID: ${address.taxId}` : "",
    address.website || "",
  ]
    .filter(Boolean)
    .join("  |  ");

export const getAdminDocumentSettingsFromRecord = (settings: RawSettings): AdminDocumentSettings => {
  const businessFallback = buildBusinessFallback(settings);
  const invoice = buildScopedAddress(settings, "invoice", {
    ...DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice,
    ...businessFallback,
  });
  const shipping = buildScopedAddress(settings, "shipping", {
    ...businessFallback,
    ...DEFAULT_ADMIN_DOCUMENT_SETTINGS.shipping,
  });
  const warehouse = buildScopedAddress(settings, "warehouse", {
    ...shipping,
    ...DEFAULT_ADMIN_DOCUMENT_SETTINGS.warehouse,
  });

  return { invoice, shipping, warehouse };
};

export const fetchAdminDocumentSettings = async (): Promise<AdminDocumentSettings> => {
  try {
    // Fetch global document settings (organization-wide configuration)
    // All admins/pharmacies use the same business information for documents
    const { data: settingsRow, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .eq("is_global", true)
      .maybeSingle();

    if (settingsError) throw settingsError;

    return getAdminDocumentSettingsFromRecord(settingsRow);
  } catch (error) {
    console.error("Failed to fetch admin document settings:", error);
    return DEFAULT_ADMIN_DOCUMENT_SETTINGS;
  }
};
