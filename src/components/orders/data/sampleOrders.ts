export const sampleGroups = [
  {
    id: "GRP-001",
    name: "Healthcare Group A",
    pharmacies: [
      {
        id: "PHARM-001",
        name: "Pharmacy One",
        email: "contact@pharmacyone.com",
        phone: "123-456-7890",
        type: "Pharmacy",
        address: {
          street: "123 Main St",
          city: "Los Angeles",
          state: "CA",
          zip_code: "90001",
        },
      },
      {
        id: "PHARM-002",
        name: "Pharmacy Two",
        email: "contact@pharmacytwo.com",
        phone: "123-456-7891",
        type: "Pharmacy",
        address: {
          street: "456 Oak St",
          city: "Los Angeles",
          state: "CA",
          zip_code: "90002",
        },
      },
    ],
  },
  {
    id: "GRP-002",
    name: "Medical Group B",
    pharmacies: [
      {
        id: "PHARM-003",
        name: "Pharmacy Three",
        email: "contact@pharmacythree.com",
        phone: "123-456-7892",
        type: "Pharmacy",
        address: {
          street: "789 Pine St",
          city: "San Francisco",
          state: "CA",
          zip_code: "94105",
        },
      },
    ],
  },
];

export const sampleOrders = [
  {
    id: "ORD-001",
    customer: "Pharmacy One",
    date: "2024-01-05",
    total: "$1,234.56",
    status: "paid",
    customerInfo: {
      name: "Pharmacy One",
      email: "contact@pharmacyone.com",
      phone: "123-456-7890",
      type: "Pharmacy" as const,
      address: {
        street: "123 Main St",
        city: "Los Angeles",
        state: "CA",
        zip_code: "90001",
      },
    },
    items: [
      {
        productId: "PROD-001",
        quantity: 5,
        price: 100,
        notes: "Urgent delivery",
      },
    ],
    payment: {
      method: "card" as const,
      notes: "Processed via Stripe",
    },
    shipping: {
      method: "FedEx" as const,
      cost: 15.99,
      trackingNumber: "FDX123456789",
      estimatedDelivery: "2024-01-07",
    },
    specialInstructions: "Please deliver during business hours",
  },
  {
    id: "ORD-002",
    customer: "Pharmacy One",
    date: "2024-01-10",
    total: "$2,567.89",
    status: "shipped",
    customerInfo: {
      name: "Pharmacy One",
      email: "contact@pharmacyone.com",
      phone: "123-456-7890",
      type: "Pharmacy" as const,
      address: {
        street: "123 Main St",
        city: "Los Angeles",
        state: "CA",
        zip_code: "90001",
      },
    },
    items: [
      {
        productId: "PROD-002",
        quantity: 8,
        price: 150,
        notes: "",
      },
      {
        productId: "PROD-003",
        quantity: 3,
        price: 289,
        notes: "Handle with care",
      },
    ],
    payment: {
      method: "bank_transfer" as const,
      notes: "Payment completed",
    },
    shipping: {
      method: "FedEx" as const,
      cost: 25.99,
      trackingNumber: "FDX987654321",
      estimatedDelivery: "2024-01-12",
    },
    specialInstructions: "Call before delivery",
  },
  {
    id: "ORD-003",
    customer: "Pharmacy One",
    date: "2024-01-15",
    total: "$987.65",
    status: "pending",
    customerInfo: {
      name: "Pharmacy One",
      email: "contact@pharmacyone.com",
      phone: "123-456-7890",
      type: "Pharmacy" as const,
      address: {
        street: "123 Main St",
        city: "Los Angeles",
        state: "CA",
        zip_code: "90001",
      },
    },
    items: [
      {
        productId: "PROD-004",
        quantity: 2,
        price: 493.82,
        notes: "Temperature sensitive",
      },
    ],
    payment: {
      method: "card" as const,
      notes: "Awaiting authorization",
    },
    shipping: {
      method: "FedEx" as const,
      cost: 19.99,
      trackingNumber: "FDX456789123",
      estimatedDelivery: "2024-01-17",
    },
    specialInstructions: "Maintain cold chain during delivery",
  },
];
