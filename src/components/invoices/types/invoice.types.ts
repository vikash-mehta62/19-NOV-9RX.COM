import { Json } from "@/integrations/supabase/types";
import { z } from "zod";

export interface InvoiceItem {
  name: string;
  description: string;
  quantity: number;
  rate: number;
  sizes: any[];
}

export interface CustomerInfo {
  name: any;
  phone: string;
  email: string;
  street?: string;
  city?: string;
}

export const InvoiceStatusEnum = {
  DRAFT: "draft",
  UNPAID: "unpaid",
  ALL: "all",
  PENDING: "pending",
  NEEDS_PAYMENT_LINK: "needs_payment_link",
  PAYMENT_LINK_SENT: "payment_link_sent",
  PAID: "paid",
  OVERDUE: "overdue",
  CANCELLED: "cancelled",
} as const;

export type InvoiceStatus =
  (typeof InvoiceStatusEnum)[keyof typeof InvoiceStatusEnum];

export const PaymentMethodEnum = {
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  ACH: "ach",
  MANUAL: "manual",
} as const;

export type PaymentMethod =
  | (typeof PaymentMethodEnum)[keyof typeof PaymentMethodEnum]
  | null;

// Zod schema for runtime validation
export const invoiceItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
  amount: z.number().nonnegative(),
});

export const customerInfoSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().email(),
});

export const invoiceSchema = z.object({
  id: z.string().uuid(),
  invoice_number: z.string(),
  order_id: z.string().uuid().nullable().optional(),
  profile_id: z.string().uuid().nullable().optional(),
  status: z.enum([
    "draft",
    "pending",
    "needs_payment_link",
    "payment_link_sent",
    "paid",
    "overdue",
    "cancelled",
  ]),
  amount: z.number().nonnegative(),
  tax_amount: z.number().nullable(),
  total_amount: z.number().nonnegative(),
  payment_method: z.enum(["card", "bank_transfer", "ach", "manual"]).nullable(),
  payment_notes: z.string().nullable(),
  due_date: z.string(),
  created_at: z.string().optional(),
  payment_status: z.string(),
  updated_at: z.string().optional(),
  paid_at: z.string().nullable().optional(),
  items: z.union([z.array(invoiceItemSchema), z.any()]), // Handle Json type
  customer_info: z.union([customerInfoSchema, z.any()]), // Handle Json type
  shipping_info: z.union([customerInfoSchema, z.any()]), // Handle Json type
  subtotal: z.number().nonnegative(),
  orders: z
    .object({
      order_number: z.string(),
    })
    .optional(),
  profiles: z
    .object({
      first_name: z.string(),
      last_name: z.string(),
      email: z.string().email(),
    })
    .optional(),
});

// Type guards
export const isInvoiceItem = (item: unknown): item is InvoiceItem => {
  try {
    invoiceItemSchema.parse(item);
    return true;
  } catch {
    return false;
  }
};

export const isCustomerInfo = (info: unknown): info is CustomerInfo => {
  try {
    customerInfoSchema.parse(info);
    return true;
  } catch {
    return false;
  }
};

export const isInvoice = (invoice: unknown): invoice is Invoice => {
  try {
    invoiceSchema.parse(invoice);
    return true;
  } catch {
    return false;
  }
};

// Extended to include related data
interface RelatedOrder {
  order_number: string;
  payment_status?: string;
  void?: string;
}

interface RelatedProfile {
  first_name: string;
  last_name: string;
  email: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  order_number?: string;
  purchase_number_external?: string;
  void?: boolean;
  order_id?: string | null;
  profile_id?: string | null;
  payment_transication?: string | null;
  status: InvoiceStatus;
  amount: number;
  tax_amount: number | null;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_notes: string | null;
  due_date: string;
  payment_status: string | null;
  created_at?: string;
  updated_at?: string;
  shippin_cost?: string;
  paid_at?: string | null;
  items: InvoiceItem[] | Json;
  customer_info: CustomerInfo | Json;
  shipping_info: CustomerInfo | Json;
  subtotal: number;
  orders?: RelatedOrder;
  profiles?: RelatedProfile;
  freeShipping?: boolean;
  order_pay?: boolean;
}

// Type for Supabase real-time payload
export type InvoiceRealtimePayload = {
  new: Invoice | null;
  old: Invoice | null;
  eventType: "INSERT" | "UPDATE" | "DELETE";
};
