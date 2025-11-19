
export interface SizeVariation {
  size_value: string;
  size_unit: string;
  sku?: any;
  price: number;
  pricePerCase: number;
  price_per_case: number;
  stock: number;
  quantityPerCase: number;
}

export const calculateCasePrice = (unitPrice: number, quantityPerCase: number): number => {
  return unitPrice * quantityPerCase;
};

export const validateSizeInput = (size: Partial<SizeVariation>): string | null => {
  if (!size.size_value || !size.size_unit) {
    return "Size value and unit are required";
  }
  if (!size.price || size.price <= 0) {
    return "Price must be greater than 0";
  }
  if (!size.quantityPerCase || size.quantityPerCase <= 0) {
    return "Quantity per case must be greater than 0";
  }
  return null;
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};
