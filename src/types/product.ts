export interface ProductSize {
  id: string;
  product_id: string;
  size_value: string;
  size_unit: string;
  sku?: any;
  price: number;
  price_per_case: number;
  stock: number;
  quantity_per_case: number; // ✅ Added this field
  image?: any;
  created_at: string;
  updated_at: string;
  ndcCode?: string;
  unitToggle?: boolean;
  upcCode?: string;
  lotNumber?: string;
  exipry?: string;
}

export interface Product {
  id: string;
  sku: string;
  key_features: string;
  squanence?: string;
  ndcCode?: string;
  upcCode?: string;
  lotNumber?: string;
  exipry?: string;
  name: string;
  description: string;
  unitToggle?: boolean;
  category: string;
  current_stock: number;
  min_stock: number;
  reorder_point: number;
  created_at: string;
  updated_at: string;
  quantity_per_case?: number;
  shipping_cost?: number;
  size_unit?: string;

  size_value?: number;
  base_price: number;
  image_url?: string;
  images?: string[];
  sizes?: ProductSize[];
  customization?: {
    allowed: boolean;
    options?: string[];
    price?: number;
  };
}

export const PRODUCT_CATEGORIES = [
  "RX VIALS",
  "RX LABELS",
  "LIQUID OVALS",
  "OINTMENT JARS",
  "RX PAPER BAGS",
  "RX PAPER BAGS FLAT/GUSSETED",
  "ORAL SYRINGES",
  "LIQUID OVAL ADAPTERS",
  "INSULATED SHIPPING KIT",
  "OTHER",
] as const;
