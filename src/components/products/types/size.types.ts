
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../schemas/productSchema";

export interface SizeOptionsFieldProps {
  form: UseFormReturn<ProductFormValues>;
  isEditing?:boolean
}

export interface NewSizeState {
  size_value: string;
  size_unit: string;
  price: string;
  pricePerCase: string;
  sku?: any;
  groupIds?: string[]; // Add this line
  disAllogroupIds?: string[]; // Add this line
  sizeSquanence?: any;
  unit?: boolean;
  case?: boolean;
  unitToggle?: boolean;
  price_per_case: string;
  stock: string;
  quantity_per_case: string;
  image: string;
  rolls_per_case: string;
  shipping_cost: string;

    ndcCode?: string;
  upcCode?: string;
  lotNumber?: string;
  exipry?: string;
}
