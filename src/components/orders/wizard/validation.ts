import type {
  Customer,
  BillingAddress,
  ShippingAddress,
  PaymentMethod,
  StepValidation,
} from "./types";
import type { CartItem } from "@/store/types/cartTypes";

/**
 * Validation error type
 */
export interface ValidationError {
  field: string;
  message: string;
  step?: number; // Optional: which step this error belongs to
}

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Step 1: Customer Selection Validation
 * Validates that a customer has been selected
 */
export const validateCustomerSelection = (
  customer: Customer | null | undefined
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!customer) {
    errors.push({
      field: "customer",
      message: "Please select a customer to continue",
      step: 1,
    });
  }

  if (customer && !customer.id) {
    errors.push({
      field: "customer.id",
      message: "Selected customer is missing required ID",
      step: 1,
    });
  }

  if (customer && !customer.email) {
    errors.push({
      field: "customer.email",
      message: "Selected customer is missing email address",
      step: 1,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Step 2: Address Information Validation
 * Validates billing and shipping addresses
 */
export const validateAddressInformation = (
  billingAddress: BillingAddress | undefined,
  shippingAddress: ShippingAddress | undefined
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate billing address
  if (!billingAddress) {
    errors.push({
      field: "billingAddress",
      message: "Billing address is required",
      step: 2,
    });
  } else {
    if (!billingAddress.street || billingAddress.street.trim() === "") {
      errors.push({
        field: "billingAddress.street",
        message: "Billing street address is required",
        step: 2,
      });
    }

    if (!billingAddress.city || billingAddress.city.trim() === "") {
      errors.push({
        field: "billingAddress.city",
        message: "Billing city is required",
        step: 2,
      });
    }

    if (!billingAddress.state || billingAddress.state.trim() === "") {
      errors.push({
        field: "billingAddress.state",
        message: "Billing state is required",
        step: 2,
      });
    }

    if (!billingAddress.zip_code || billingAddress.zip_code.trim() === "") {
      errors.push({
        field: "billingAddress.zip_code",
        message: "Billing ZIP code is required",
        step: 2,
      });
    } else if (!/^\d{5}(-\d{4})?$/.test(billingAddress.zip_code)) {
      errors.push({
        field: "billingAddress.zip_code",
        message: "Billing ZIP code must be in format 12345 or 12345-6789",
        step: 2,
      });
    }
  }

  // Validate shipping address
  if (!shippingAddress) {
    errors.push({
      field: "shippingAddress",
      message: "Shipping address is required",
      step: 2,
    });
  } else {
    if (!shippingAddress.fullName || shippingAddress.fullName.trim() === "") {
      errors.push({
        field: "shippingAddress.fullName",
        message: "Shipping recipient name is required",
        step: 2,
      });
    }

    if (!shippingAddress.email || shippingAddress.email.trim() === "") {
      errors.push({
        field: "shippingAddress.email",
        message: "Shipping email is required",
        step: 2,
      });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingAddress.email)) {
      errors.push({
        field: "shippingAddress.email",
        message: "Shipping email must be a valid email address",
        step: 2,
      });
    }

    if (!shippingAddress.phone || shippingAddress.phone.trim() === "") {
      errors.push({
        field: "shippingAddress.phone",
        message: "Shipping phone number is required",
        step: 2,
      });
    }

    if (!shippingAddress.street || shippingAddress.street.trim() === "") {
      errors.push({
        field: "shippingAddress.street",
        message: "Shipping street address is required",
        step: 2,
      });
    }

    if (!shippingAddress.city || shippingAddress.city.trim() === "") {
      errors.push({
        field: "shippingAddress.city",
        message: "Shipping city is required",
        step: 2,
      });
    }

    if (!shippingAddress.state || shippingAddress.state.trim() === "") {
      errors.push({
        field: "shippingAddress.state",
        message: "Shipping state is required",
        step: 2,
      });
    }

    if (!shippingAddress.zip_code || shippingAddress.zip_code.trim() === "") {
      errors.push({
        field: "shippingAddress.zip_code",
        message: "Shipping ZIP code is required",
        step: 2,
      });
    } else if (!/^\d{5}(-\d{4})?$/.test(shippingAddress.zip_code)) {
      errors.push({
        field: "shippingAddress.zip_code",
        message: "Shipping ZIP code must be in format 12345 or 12345-6789",
        step: 2,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Step 3: Product Selection Validation
 * Validates that at least one product has been added to the cart
 */
export const validateProductSelection = (
  cartItems: CartItem[]
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!cartItems || cartItems.length === 0) {
    errors.push({
      field: "cartItems",
      message: "Please add at least one product to your order",
      step: 3,
    });
  }

  // Validate each cart item has required fields
  cartItems.forEach((item, index) => {
    if (!item.productId) {
      errors.push({
        field: `cartItems[${index}].productId`,
        message: `Item ${index + 1} is missing product ID`,
        step: 3,
      });
    }

    if (!item.quantity || item.quantity <= 0) {
      errors.push({
        field: `cartItems[${index}].quantity`,
        message: `Item ${index + 1} must have a quantity greater than 0`,
        step: 3,
      });
    }

    if (item.price === undefined || item.price < 0) {
      errors.push({
        field: `cartItems[${index}].price`,
        message: `Item ${index + 1} has an invalid price`,
        step: 3,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Step 4: Review Order Validation
 * Validates that all previous steps are complete and data is consistent
 */
export const validateReviewOrder = (
  customer: Customer | null | undefined,
  billingAddress: BillingAddress | undefined,
  shippingAddress: ShippingAddress | undefined,
  cartItems: CartItem[]
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Re-validate all previous steps
  const customerValidation = validateCustomerSelection(customer);
  const addressValidation = validateAddressInformation(
    billingAddress,
    shippingAddress
  );
  const productValidation = validateProductSelection(cartItems);

  errors.push(...customerValidation.errors);
  errors.push(...addressValidation.errors);
  errors.push(...productValidation.errors);

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Step 5: Payment Confirmation Validation
 * Validates payment method selection and required confirmations
 */
export const validatePaymentConfirmation = (
  paymentMethod: PaymentMethod | undefined,
  termsAccepted: boolean,
  accuracyConfirmed: boolean
): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!paymentMethod) {
    errors.push({
      field: "paymentMethod",
      message: "Please select a payment method",
      step: 5,
    });
  }

  if (!termsAccepted) {
    errors.push({
      field: "termsAccepted",
      message: "You must accept the terms and conditions to continue",
      step: 5,
    });
  }

  if (!accuracyConfirmed) {
    errors.push({
      field: "accuracyConfirmed",
      message: "Please confirm that all order details are accurate",
      step: 5,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Master validation function that validates a specific step
 */
export const validateStep = async (
  step: number,
  data: {
    customer?: Customer | null;
    billingAddress?: BillingAddress;
    shippingAddress?: ShippingAddress;
    cartItems?: CartItem[];
    paymentMethod?: PaymentMethod;
    termsAccepted?: boolean;
    accuracyConfirmed?: boolean;
  }
): Promise<ValidationResult> => {
  switch (step) {
    case 1:
      return validateCustomerSelection(data.customer);
    case 2:
      return validateAddressInformation(
        data.billingAddress,
        data.shippingAddress
      );
    case 3:
      return validateProductSelection(data.cartItems || []);
    case 4:
      return validateReviewOrder(
        data.customer,
        data.billingAddress,
        data.shippingAddress,
        data.cartItems || []
      );
    case 5:
      return validatePaymentConfirmation(
        data.paymentMethod,
        data.termsAccepted || false,
        data.accuracyConfirmed || false
      );
    default:
      return {
        isValid: true,
        errors: [],
      };
  }
};

/**
 * Create a StepValidation object for a specific step
 */
export const createStepValidation = (
  step: number,
  data: {
    customer?: Customer | null;
    billingAddress?: BillingAddress;
    shippingAddress?: ShippingAddress;
    cartItems?: CartItem[];
    paymentMethod?: PaymentMethod;
    termsAccepted?: boolean;
    accuracyConfirmed?: boolean;
  }
): StepValidation => {
  return {
    step,
    isValid: false,
    errors: [],
    validate: async () => {
      const result = await validateStep(step, data);
      return result.isValid;
    },
  };
};
