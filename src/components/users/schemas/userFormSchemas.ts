import * as z from "zod";

const addressSchema = z.object({
  attention: z.string().optional(),
  countryRegion: z.string().optional(),
  street1: z.string().min(2, "Street address is required"),
  street2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip_code: z.string().min(5, "ZIP code is required"),
  phone: z.string().optional(),
  faxNumber: z.string().optional(),
});

const locationSchema = z.object({
  name: z.string().min(2, "Location name must have at least 2 characters"),
  type: z.enum(["headquarters", "branch", "warehouse", "retail"]).optional(),
  status: z.enum(["active", "inactive", "pending"]).default("active"),
  address: addressSchema.optional(),
  manager: z.string().optional(),
  contactEmail: z.string().email("Invalid email format").optional(),
  contactPhone: z.string().regex(/^\+?[0-9\s\-()]+$/, "Invalid phone number").optional(),
});

const rolePermissions = {
  admin: [
    "manage_users",
    "manage_roles",
    "view_reports",
    "manage_settings",
    "manage_billing",
  ],
  manager: ["view_users", "edit_users", "view_reports", "manage_billing"],
  staff: ["view_users", "view_reports"],
  user: ["view_reports"],
} as const;

export type UserRole = keyof typeof rolePermissions;
export type Permission = (typeof rolePermissions)[UserRole][number];

const baseSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  companyName: z.string().min(2, "Company name is required"),
  displayName: z.string().min(2, "Display name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  workPhone: z.string().min(10, "Work phone must be at least 10 digits"),
  mobilePhone: z.string().optional(),
  role: z.enum(["admin", "manager", "staff", "user"] as const),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  sameAsShipping: z.boolean().default(false),
  taxPreference: z.enum(["Taxable", "TaxExempt"]),
  taxRate: z.enum(["standard", "reduced", "zero"]).optional(),
  currency: z.enum(["USD", "EUR", "GBP"]),
  openingBalance: z.string().optional(),
  paymentTerms: z.enum(["DueOnReceipt", "Net30", "Net60"]),
  enablePortal: z.boolean().default(false),
  portalLanguage: z.enum(["English", "Spanish", "French"]).default("English"),
});

export const pharmacySchema = baseSchema.extend({
  type: z.literal("pharmacy"),
  license: z.string().min(5, "License number is required"),
});

export const hospitalSchema = baseSchema.extend({
  type: z.literal("hospital"),
  license: z.string().min(5, "License number is required"),
});

export const groupSchema = baseSchema.extend({
  type: z.literal("group"),
  parentGroup: z.string().optional(),
  groupType: z
    .enum(["corporate", "regional", "franchise"])
    .default("corporate"),
  locations: z
    .array(locationSchema)
    .min(1, "At least one location is required"),
  license: z.string().min(5, "License number is required"),
});

export type UserFormData =
  | z.infer<typeof pharmacySchema>
  | z.infer<typeof hospitalSchema>
  | z.infer<typeof groupSchema>;

export type AddressData = z.infer<typeof addressSchema>;
export type LocationData = z.infer<typeof locationSchema>;

export type AddressFieldPath = keyof AddressData;
export type UserFormPath =
  | keyof UserFormData
  | `billingAddress.${AddressFieldPath}`
  | `shippingAddress.${AddressFieldPath}`;

export { rolePermissions };
