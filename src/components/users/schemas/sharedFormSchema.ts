import * as z from "zod";

export const addressSchema = z.object({
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
  address: addressSchema.optional(),
  manager: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
});

export const baseUserSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  type: z.enum(["pharmacy", "hospital", "group"]),
  status: z.enum(["active", "inactive", "pending"]),
  role: z.enum(["admin", "manager", "staff", "user"]),
  companyName: z.string().min(2, "Company name is required"),
  displayName: z.string().optional(),
  workPhone: z.string().min(10, "Work phone must be at least 10 digits"),
  mobilePhone: z.string().optional(),
  contactPerson: z.string().min(2, "Primary Contact Person must be 2 latter"),
  pharmacyLicense: z.string().optional(),
  groupStation: z.string().optional(),
  taxId: z.string().optional(),
  documents: z.array(z.string()).optional().default([]),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  sameAsShipping: z.boolean().default(false),
  freeShipping: z.boolean().default(false),
  order_pay: z.boolean().default(false),
  taxPreference: z.string().default("Taxable"),
  currency: z.string().default("USD"),
  paymentTerms: z.string().default("DueOnReceipt"),
  enablePortal: z.boolean().default(false),
  portalLanguage: z.string().default("English"),
  alternativeEmail: z.string().email("Invalid email").optional(),
  website: z.string().url("Invalid URL").optional(),
  faxNumber: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().optional(),
  preferredContactMethod: z.string().optional(),
  taxPercantage: z.any().optional(),
  languagePreference: z.string().optional(),
  creditLimit: z.string().optional(),
  paymentMethod: z.string().optional(),
  groupType: z.string().optional(),
  parentGroup: z.string().optional(),
  email_notifaction: z.boolean().optional(),
  locations: z.array(locationSchema).default([]).optional(),
});

export type BaseUserFormData = z.infer<typeof baseUserSchema>;
export type LocationData = z.infer<typeof locationSchema>;
export type AddressData = z.infer<typeof addressSchema>;
