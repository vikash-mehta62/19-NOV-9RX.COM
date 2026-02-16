import { Json } from '@/integrations/supabase/types';
import { z } from "zod";

const addressSchema = z.object({
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip_code: z
    .string()
    .min(5, "Zip code is required")
    .max(10, "Zip code must be at most 10 characters"),
});

const customerInfoSchema = z.object({
cusid :z.string().optional(),
  name: z.string().min(0, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(0, "Phone number must be at least 10 digits"),
  type: z.enum(["Hospital", "Pharmacy", "Clinic"]),
  address: addressSchema,
});

const sizeSchema = z.object({
  id: z.string().min(1, "Size ID is required"),
  price: z.number().min(0, "Price must be a positive number"),
  quantity: z.number().min(0, "Quantity must be at least 0"),
  size_unit: z.string().min(1, "Size unit is required"),
  size_value: z.string().min(1, "Size value is required"),  
  groupIds: z.array(z.string()).optional().default([]), // ✅ here
  disAllogroupIds: z.array(z.string()).optional().default([]), // ✅ here

});

const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().min(1, "Product name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be a positive number"),
  sizes: z.array(sizeSchema).optional(), // Add sizes as an array of size objects
  notes: z.string().optional(),
  customizations: z.record(z.any()).optional(), // ✅ Accepts JSON-like objects

});

const shippingSchema = z.object({
  method: z.enum(["FedEx", "custom"]),
  cost: z.number().min(0, "Shipping cost must be a positive number"),
  trackingNumber: z.string().optional(),
  estimatedDelivery: z.string().optional(),
});

const paymentSchema = z.object({
  method: z.enum(["card", "bank_transfer", "manual", "ach","credit"]),
  notes: z.string().optional(),
  achAccountType: z
    .enum(["checking", "savings", "businessChecking"])
    .optional(),
  achAccountName: z.string().optional(),
  achRoutingNumber: z.string().optional(),
  achAccountNumber: z.string().optional(),
});

// Billing/Shipping address with extended fields
const extendedAddressSchema = z.object({
  street1: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
});

// Add shippingAddress schema - supports both legacy and new format
const shippingAddressSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: addressSchema.optional(),
  // Extended format with billing/shipping objects
  billing: extendedAddressSchema.optional(),
  shipping: extendedAddressSchema.optional(),
});

// Export types for use in components
export type ExtendedAddress = z.infer<typeof extendedAddressSchema>;
export type ShippingAddressData = z.infer<typeof shippingAddressSchema>;

export const orderFormSchema = z.object({
  id: z.string(),
  customer: z.string(),
  tax_amount: z.number().optional(),
  date: z.string(),
  total: z.string(),
  status: z.string(),
  void: z.boolean().optional(),
  voidReason: z.string().optional(),
  cancelReason: z.string().optional(),
  poApproved: z.boolean().optional(),
  poRejected: z.boolean().optional(),
  po_handling_charges: z.number().optional(),
  po_fred_charges: z.number().optional(),
  shipping_cost: z.string().optional(),
  quickBooksID: z.string().optional(),
  payment_status: z.string(),
  payment_transication: z.string().optional(), // Transaction ID from payment processor
  payment_method: z.string().optional(),
  order_number: z.string(), // Sales Order number (SO-XXXXX)
  invoice_number: z.string().optional(), // Invoice number (INV-XXXXX) - generated on confirmation
  customization: z.boolean(),
  poAccept: z.boolean(),
  customerInfo: customerInfoSchema,
  items: z.array(orderItemSchema),
  shipping: shippingSchema,
  payment: paymentSchema,
  specialInstructions: z.string().optional(),
  purchase_number_external: z.string().optional(),
  shippingAddress: shippingAddressSchema.optional(),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
