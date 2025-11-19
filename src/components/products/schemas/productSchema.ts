import { image } from "html2canvas/dist/types/css/types/image";
import * as z from "zod";

// Define category-specific configurations
export const CATEGORY_CONFIGS = {
  "RX VIALS": {
    sizeUnits: ["mL", "dram", "oz"],
    defaultUnit: "mL",
    hasRolls: false,
    requiresCase: true,
  },
  "RX LABELS": {
    sizeUnits: ["ROLL"],
    defaultUnit: "ROLL",
    hasRolls: true,
    requiresCase: true,
  },
  "LIQUID OVALS": {
    sizeUnits: ["mL", "OZ"],
    defaultUnit: "mL",
    hasRolls: false,
    requiresCase: true,
  },
  "OINTMENT JARS": {
    sizeUnits: ["OZ", "gram"],
    defaultUnit: "OZ",
    hasRolls: false,
    requiresCase: true,
  },
  "RX PAPER BAGS": {
    sizeUnits: ["inch"],
    defaultUnit: "inch",
    hasRolls: false,
    requiresCase: true,
  },
  "RX PAPER BAGS FLAT/GUSSETED": {
    sizeUnits: ["inch"],
    defaultUnit: "inch",
    hasRolls: false,
    requiresCase: true,
  },
  "ORAL SYRINGES": {
    sizeUnits: ["mL", "cc"],
    defaultUnit: "mL",
    hasRolls: false,
    requiresCase: true,
  },
  "LIQUID OVAL ADAPTERS": {
    sizeUnits: ["mm"],
    defaultUnit: "mm",
    hasRolls: false,
    requiresCase: true,
  },
  "INSULATED SHIPPING KIT": {
    sizeUnits: ["unit", "OZ", "mm", "mL", "cc", "inch", "gram"],
    defaultUnit: "unit",
    hasRolls: false,
    requiresCase: false,
  },
  OTHER: {
    sizeUnits: ["unit", "OZ", "mm", "mL", "cc", "inch", "gram"],
    defaultUnit: "unit",
    hasRolls: false,
    requiresCase: false,
  },
} as const;

export const customizationOptionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  type: z.enum(["text", "color", "dropdown"]),
  required: z.boolean().default(false),
  price: z
    .number()
    .min(0, "Price must be greater than or equal to 0")
    .default(0),
  options: z.array(z.string()).optional(),
  maxLength: z.number().optional(),
});

export const customizationSchema = z.object({
  allowed: z.boolean().default(false),
  price: z
    .number()
    .min(0, "Price must be greater than or equal to 0")
    .default(0),
  options: z.array(customizationOptionSchema).default([]),
});

export const productFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  sku: z.string().min(2, "Product code must be at least 2 characters"),
  key_features: z.string().min(2, "key features must be at least 2 characters"),
  squanence: z.any().optional(),

  ndcCode: z.any().optional(),
  upcCode: z.any().optional(),
  lotNumber: z.any().optional(),
  exipry: z.any().optional(),
  unitToggle: z.boolean().optional(),

  category: z.string(),
  images: z.array(z.string()).default([]),
  sizes: z
    .array(
      z.object({
        id: z.string().optional(),
        size_value: z.string().min(1, "Size value is required"),
        size_unit: z.string(),
        sku: z.string(),
        image: z.string().optional(),
        price: z.coerce.number().min(0, "Price must be positive"),
        groupIds: z.array(z.string().uuid()).optional().default([]),
        disAllogroupIds: z.array(z.string().uuid()).optional().default([]),

        ndcCode: z.any().optional(),
        upcCode: z.any().optional(),
        lotNumber: z.any().optional(),
        exipry: z.any().optional(),
  unitToggle: z.boolean().optional(),

        price_per_case: z.coerce
          .number()
          .min(0, "Price per case must be positive"),
        stock: z.coerce.number().min(0, "Stock must be positive"),
        unit: z.coerce.boolean().optional(),
        case: z.coerce.boolean().optional(),
        rolls_per_case: z.coerce
          .number()
          .min(0, "Rolls per case must be positive"),
        sizeSquanence: z.coerce
          .number()
          .min(0, "sizeSquanence must be positive"),
        shipping_cost: z.coerce
          .number()
          .min(0, "Shipping cost must be positive"),
        quantity_per_case: z.coerce
          .number()
          .min(0, "Quantity per case must be positive"), // ✅ Added this field
      })
    )
    .default([]),

  base_price: z.coerce
    .number()
    .min(0, "Base price must be positive")
    .default(0),
  current_stock: z.coerce
    .number()
    .min(0, "Stock cannot be negative")
    .default(0),
  min_stock: z.coerce
    .number()
    .min(0, "Minimum stock cannot be negative")
    .default(0),
  reorder_point: z.coerce
    .number()
    .min(0, "Reorder point must be positive")
    .refine(
      (val) => val >= 0,
      "Reorder point must be greater than or equal to minimum stock"
    )
    .default(0),
  quantityPerCase: z.coerce
    .number()
    .min(1, "Quantity per case must be at least 1"),
  customization: z
    .object({
      allowed: z.boolean().default(false),
      options: z.array(z.string()).default([]),
      price: z.coerce
        .number()
        .min(0, "Customization price must be positive")
        .optional(),
    })
    .default({ allowed: false, options: [], price: 0 }),
  trackInventory: z.boolean().default(false),
  image_url: z.string().optional(),
  item_number: z.string().optional(),
  shipping_cost: z.coerce
    .number()
    .min(0, "Shipping cost must be positive")
    .default(15),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
export type Customization = z.infer<typeof customizationSchema>;
export type CustomizationOption = z.infer<typeof customizationOptionSchema>;
