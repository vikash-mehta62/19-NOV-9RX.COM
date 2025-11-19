
import { Invoice } from "../types/invoice.types";

export const mockInvoices: Invoice[] = [
  {
    id: "INV-001",
    invoice_number: "INV-2024-001",
    amount: 243.80,
    status: "paid",
    due_date: "2024-02-20",
    payment_status:"paid",
    order_id: "ORD-2024-001",
    items: [
      {
        id: "1",
        description: "Supplement RLF",
        quantity: 2,
        rate: 110.00,
        amount: 220.00,
      },
      {
        id: "2",
        description: "Shipping",
        quantity: 1,
        rate: 10.00,
        amount: 10.00,
      }
    ],
    customer_info: {
      name: "Jesse",
      phone: "PHONE:",
      email: "sampletext@aol.com"
    },
    shipping_info: {
      name: "Jesse",
      phone: "PHONE:",
      email: "sampletext@aol.com"
    },
    subtotal: 230.00,
    tax_amount: 13.80,
    total_amount: 243.80,
    payment_method: null,
    payment_notes: null,
    profile_id: null,
    orders: {
      order_number: "ORD-2024-001"
    },
    profiles: {
      first_name: "Jesse",
      last_name: "Smith",
      email: "sampletext@aol.com"
    }
  },
  {
    id: "INV-002",
    invoice_number: "INV-2024-002",
    amount: 149.99,
    status: "pending",
    payment_status:"paid",

    due_date: "2024-02-21",
    order_id: "ORD-2024-002",
    items: [
      {
        id: "1",
        description: "Product A",
        quantity: 1,
        rate: 141.50,
        amount: 141.50,
      }
    ],
    customer_info: {
      name: "Jane Smith",
      phone: "555-0123",
      email: "jane@example.com"
    },
    shipping_info: {
      name: "Jane Smith",
      phone: "555-0123",
      email: "jane@example.com"
    },
    subtotal: 141.50,
    tax_amount: 8.49,
    total_amount: 149.99,
    payment_method: null,
    payment_notes: null,
    profile_id: null,
    orders: {
      order_number: "ORD-2024-002"
    },
    profiles: {
      first_name: "Jane",
      last_name: "Smith",
      email: "jane@example.com"
    }
  }
];
