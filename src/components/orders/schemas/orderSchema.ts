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
  method: z.enum(["card", "bank_transfer", "manual", "ach"]),
  notes: z.string().optional(),
  achAccountType: z
    .enum(["checking", "savings", "businessChecking"])
    .optional(),
  achAccountName: z.string().optional(),
  achRoutingNumber: z.string().optional(),
  achAccountNumber: z.string().optional(),
});

// Add shippingAddress schema
const shippingAddressSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(0, "Phone number must be at least 10 digits"),
  address: addressSchema,
 
});

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
  poApproved: z.string().optional(),
  shipping_cost: z.string().optional(),
  quickBooksID: z.string().optional(),
  payment_status: z.string(), // ✅ Add this line
  order_number : z.string(), 
  customization : z.boolean(),
  poAccept : z.boolean(),
  customerInfo: customerInfoSchema,
  items: z.array(orderItemSchema),
  shipping: shippingSchema,
  payment: paymentSchema,
  specialInstructions: z.string().optional(),
  purchase_number_external: z.string().optional(),
  shippingAddress: shippingAddressSchema.optional(), // Add shipping address to main schema
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;
