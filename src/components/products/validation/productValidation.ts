import { ProductFormValues } from "../schemas/productSchema";

export const validateProductForm = (values: ProductFormValues) => {
  const errors: Partial<Record<keyof ProductFormValues, string>> = {};

  // Basic Info Validation
  if (!values.name) {
    errors.name = "Product name is required";
  } else if (values.name.length < 2) {
    errors.name = "Product name must be at least 2 characters";
  }

  if (!values.sku) {
    errors.sku = "SKU is required";
  }
  if (!values.key_features) {
    errors.key_features = "key_features is required";
  }

  if (!values.category) {
    errors.category = "Category is required";
  }

  // Price Validation
  if (typeof values.base_price !== "number" || values.base_price < 0) {
    errors.base_price = "Base price must be a positive number";
  }

  // Stock Validation
  if (values.current_stock < 0) {
    errors.current_stock = "Stock cannot be negative";
  }

  // Quantity Per Case Validation
  if (values.quantityPerCase < 1) {
    errors.quantityPerCase = "Quantity per case must be at least 1";
  }

  // Size Options Validation
  if (values.sizes) {
    values.sizes.forEach((size, index) => {
      if (size.price < 0) {
        errors[`sizes.${index}.price` as keyof ProductFormValues] =
          "Price must be positive";
      }
      if (!size.size_unit) {
        errors[`sizes.${index}.size_unit` as keyof ProductFormValues] =
          "Size unit is required";
      }
      if (!size.size_value) {
        errors[`sizes.${index}.size_value` as keyof ProductFormValues] =
          "Size value is required";
      }
      if (size.stock < 0) {
        errors[`sizes.${index}.stock` as keyof ProductFormValues] =
          "Stock cannot be negative";
      }
    });
  }

  return errors;
};

export const validateImageUpload = (file: File) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];

  if (!allowedTypes.includes(file.type)) {
    return "File type not supported. Please upload a JPG, PNG, or GIF file.";
  }

  if (file.size > maxSize) {
    return "File size exceeds 5MB limit.";
  }

  return null;
};

export const validateSizeOption = (size: string) => {
  if (!size.trim()) {
    return "Size cannot be empty";
  }

  // Updated pattern to include case and box along with other units
  const sizePattern = /^\d+(\.\d+)?\s*(oz|ml|g|kg|lb|DR|cm|mm|inch|case|box)$/i;
  if (!sizePattern.test(size)) {
    return "Invalid size format. Examples: '2 oz', '500 ml', '10 DR', '5 cm', '20 mm', '2 inch', '1 case', '1 box'";
  }

  return null;
};
