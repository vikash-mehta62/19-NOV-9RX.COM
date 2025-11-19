import { BaseUserFormData } from "../../schemas/sharedFormSchema";

export const mapProfileDataToFormState = (
  data: any
): Partial<BaseUserFormData> => {
  if (!data) {
    console.warn("No data provided to mapProfileDataToFormState");
    return {};
  }

  console.log("Mapping profile data to form state:", data);

  const formState: Partial<BaseUserFormData> = {
    firstName: data.first_name || "",
    lastName: data.last_name || "",
    email: data.email || "",
    type: data.type || "pharmacy",
    status: data.status || "pending",
    role: data.role || "user",
    companyName: data.company_name || "",
    displayName: data.display_name || "",
    workPhone: data.work_phone || "",
    mobilePhone: data.mobile_phone || "",
    billingAddress: data.billing_address || {
      street1: "",
      city: "",
      state: "",
      zip_code: "",
    },
    shippingAddress: data.shipping_address || {
      street1: "",
      city: "",
      state: "",
      zip_code: "",
    },
    sameAsShipping: Boolean(data.same_as_shipping),
    freeShipping: Boolean(data.freeShipping),
    order_pay: Boolean(data.order_pay),
    taxPreference: data.tax_preference || "Taxable",
    currency: data.currency || "USD",
    paymentTerms: data.payment_terms || "DueOnReceipt",
    enablePortal: Boolean(data.enable_portal),
    portalLanguage: data.portal_language || "English",
    pharmacyLicense: data.pharmacy_license || "",
    groupStation: data.group_station || "",
    taxId: data.tax_id || "",
    documents: Array.isArray(data.documents) ? data.documents : [],
    alternativeEmail: data.alternative_email || "",
    website: data.website || "",
    faxNumber: data.fax_number || "",
    contactPerson: data.contact_person || "",
    department: data.department || "",
    notes: data.notes || "",
    taxPercantage: data.taxPercantage || 0,
    preferredContactMethod: data.preferred_contact_method || "",
    languagePreference: data.language_preference || "",
    creditLimit: data.credit_limit || "",
    paymentMethod: data.payment_method || "",
  };

  console.log("Mapped form state:", formState);
  return formState;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
};

export const validateRequiredFields = (
  values: Partial<BaseUserFormData>,
  type: "pharmacy" | "hospital" | "group"
): string[] => {
  const errors: string[] = [];

  // Basic validations
  if (!values.firstName?.trim()) errors.push("First name is required");
  if (!values.lastName?.trim()) errors.push("Last name is required");
  if (!values.email?.trim()) errors.push("Email is required");
  if (values.email && !isValidEmail(values.email))
    errors.push("Invalid email format");

  if (values.workPhone && !isValidPhone(values.workPhone)) {
    errors.push("Invalid work phone format");
  }

  if (values.mobilePhone && !isValidPhone(values.mobilePhone)) {
    errors.push("Invalid mobile phone format");
  }

  // Type-specific validations
  if (type === "pharmacy" && !values.pharmacyLicense?.trim()) {
    errors.push("Pharmacy license is required for pharmacy type");
  }

  if (type === "group" && !values.companyName?.trim()) {
    errors.push("Company name is required for group type");
  }

  return errors;
};
