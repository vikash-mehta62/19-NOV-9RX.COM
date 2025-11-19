export interface ProductSpecifications {
  dimensions?: string;
  material?: string;
  compatibility?: string[];
  safetyInfo?: string;
  usageGuidelines?: string;
}

export interface CustomizationOption {
  type: "text" | "logo";
  label: string;
  description?: string;
  price?: number;
  maxLength?: number;
}

export interface ProductSize {
  id: string;
  size_value: string;
  sku?: any;
  originalPrice?: any;
  rolls_per_case?: any;
  sizeSquanence?: any;
  shipping_cost?: Number;
  size_unit: string;
  price: number;
  quantity_per_case: number;
  unit?: boolean;
  groupIds?: string[];
  disAllogroupIds?: string[];
  case?: boolean;
  price_per_case: number;
  pricePerCase: any;
  stock: number;

   ndcCode?: string;
  upcCode?: string;
  lotNumber?: string;
  exipry?: string;
  unitToggle?: boolean;
}

export interface ProductDetails {
  id: string | number;
  name: string;
  description: string;
  price: number;
  base_price: number;
  offer: string;
  image: string;
  shipping_cost: number;
  sku: string;
  key_features: string;
  squanence?:string;

  ndcCode?: string;
  upcCode?: string;
  lotNumber?: string;
  exipry?: string;
  unitToggle?: boolean;

  images: string[];
  image_url: string;
  endsIn: string;
  productId: string;
  customizations: Record<string, any> | null; // ✅ Fixed JSON issue

  category: string;
  stock?: number;
  minOrder?: number;
  specifications?: ProductSpecifications;
  customization?: {
    allowed: boolean;
    options?: CustomizationOption[];
    basePrice?: number;
  };
  sizes?: ProductSize[];
  poAccept?: boolean;
  quantityPerCase?: number;
  tierPricing?: {
    tier1: { quantity: string; price: number };
    tier2: { quantity: string; price: number };
    tier3: { quantity: string; price: number };
  };
}
