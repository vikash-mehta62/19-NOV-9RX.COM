import * as z from "zod";

export const addressSchema = z.object({
  attention: z.string().optional(),
  countryRegion: z.string().min(1, "Country is required"),
  street1: z.string().min(1, "Street Address 1 is required"),
  street2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z.string().min(1, "ZIP Code is required"),
  phone: z.string().optional(),
  faxNumber: z.string().optional(),
});

// Location address schema - all fields optional for locations
const locationAddressSchema = z.object({
  attention: z.string().optional(),
  countryRegion: z.string().optional(),
  street1: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  phone: z.string().optional(),
  faxNumber: z.string().optional(),
});

const locationSchema = z.object({
  name: z.string().optional(),
  type: z.enum(["headquarters", "branch", "warehouse", "retail"]).optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
  address: locationAddressSchema.optional(),
  manager: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
});

// Terms and Conditions schema
const termsAndConditionsSchema = z.object({
  accepted: z.boolean(),
  accepted_at: z.string(),
  ip_address: z.string().nullable().optional(),
  version: z.string().optional(),
});

export const baseUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  type: z.enum(["pharmacy", "hospital", "group", "vendor"]),
  status: z.enum(["active", "inactive", "pending"]),
  role: z.enum(["admin", "manager", "staff", "user"]),
  companyName: z.string().min(1, "Company name is required"),
  displayName: z.string().optional(),
  workPhone: z.string().min(10, "Work phone must be at least 10 digits"),
  mobilePhone: z.string().optional(),
  contactPerson: z.string().min(1, "Primary Contact Person is required"),
  pharmacyLicense: z.string().optional(),
  groupStation: z.string().optional(),
  taxId: z.string().optional(),
  documents: z.array(z.string()).optional().default([]),
  billingAddress: addressSchema,
  shippingAddress: addressSchema.partial(), // Make shipping address fields optional
  sameAsShipping: z.boolean().default(false),
  freeShipping: z.boolean().default(false),
  order_pay: z.boolean().default(false),
  taxPreference: z.string().default("Taxable"),
  currency: z.string().default("USD"),
  paymentTerms: z.enum(["prepay", "credit", "net_30", "DueOnReceipt", "Net30", "Net60", "net30", "net60", "net90", "due_on_receipt"]).default("prepay"),
  enablePortal: z.boolean().default(false),
  portalLanguage: z.string().default("English"),
  alternativeEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  faxNumber: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
  preferredContactMethod: z.string().optional(),
  taxPercantage: z.any().optional(),
  languagePreference: z.string().optional(),
  creditLimit: z.coerce.number().optional(),
  paymentMethod: z.string().optional(),
  groupType: z.string().optional(),
  parentGroup: z.string().optional(),
  email_notifaction: z.boolean().optional(),
  locations: z.array(locationSchema).default([]).optional(),
  referralName: z.string().optional(), // Admin-only field
  stateId: z.string().optional(), // State ID field
  terms_and_conditions: termsAndConditionsSchema.optional(), // Terms acceptance with timestamp
});

export type BaseUserFormData = z.infer<typeof baseUserSchema>;
export type LocationData = z.infer<typeof locationSchema>;
export type AddressData = z.infer<typeof addressSchema>;
export type TermsAndConditionsData = z.infer<typeof termsAndConditionsSchema>;
