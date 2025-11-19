export interface VialProduct {
  id: string;
  size: string;
  quantity: number;
  price1: number;
  pricePerUnit1: number;
  price2: number;
  pricePerUnit2: number;
  stock: number;
  description?: string;
}

export interface ProductFilters {
  search: string;
  category: string;
  inStock?: boolean;
}