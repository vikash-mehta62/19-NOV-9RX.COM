import { OrderFormValues } from "../schemas/orderSchema";

export const validateOrderItems = (items: OrderFormValues['items']) => {
  if (!items || items.length === 0) {
    throw new Error("Please add at least one item to your order");
  }

  if (items.some(item => !item.productId || item.quantity < 1)) {
    throw new Error("Please fill in all product details and ensure quantities are valid");
  }

  return true;
};

export const useOrderValidation = (form: any, onFormChange?: (data: any) => void) => {
  const validateForm = (data: any) => {
    try {
      // console.log("Validating form data:", data);
      if (onFormChange) {
        onFormChange(data);
      }
      return true;
    } catch (error) {
      console.error("Form validation error:", error);
      return false;
    }
  };

  return { validateForm };
};