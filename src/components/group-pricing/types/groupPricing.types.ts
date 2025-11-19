export interface GroupPricing {
  id: string;
  name: string;
  discount: number;
  discount_type: "percentage" | "fixed";
  min_quantity: number;
  max_quantity: number;
  product_id: string[];
  group_ids: string[];
  status: string;

  created_at: string;
  updated_at: string;
  products?: {
    name: string;
  };
}

export interface GroupPricingTableProps {}