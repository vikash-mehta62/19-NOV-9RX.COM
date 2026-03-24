export const CUSTOMER_DOCUMENT_CATEGORIES = [
  { value: "business_license", label: "Business License" },
  { value: "tax_certificate", label: "Tax Certificate" },
  { value: "resale_permit", label: "Resale Permit" },
  { value: "w9", label: "W-9" },
  { value: "dea", label: "DEA License" },
  { value: "state_license", label: "State License" },
  { value: "insurance", label: "Insurance" },
  { value: "contract", label: "Contract" },
  { value: "other", label: "Other" },
] as const;

export type CustomerDocumentCategory =
  (typeof CUSTOMER_DOCUMENT_CATEGORIES)[number]["value"];

export interface CustomerDocumentStatus {
  label: string;
  className: string;
}

export const getDocumentCategoryLabel = (category?: string | null) => {
  if (!category) return "Other";

  return (
    CUSTOMER_DOCUMENT_CATEGORIES.find((item) => item.value === category)?.label ||
    category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

export const getCustomerDocumentStatus = (
  expiresAt?: string | null
): CustomerDocumentStatus => {
  if (!expiresAt) {
    return {
      label: "No expiry",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiresAt);
  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      label: "Expired",
      className: "bg-red-100 text-red-700 border-red-200",
    };
  }

  if (diffDays <= 30) {
    return {
      label: `Expiring in ${diffDays}d`,
      className: "bg-amber-100 text-amber-800 border-amber-200",
    };
  }

  return {
    label: "Valid",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
};
