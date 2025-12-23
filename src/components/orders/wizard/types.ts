import { ReactNode } from "react";

export interface WizardStep {
  number: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  hidden?: boolean; // For pharmacy mode, step 3 is hidden
}

export interface WizardState {
  currentStep: number;
  completedSteps: number[];
  canNavigateToStep: (step: number) => boolean;
  markStepComplete: (step: number) => void;
  goToStep: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
}

export interface StepValidation {
  step: number;
  isValid: boolean;
  errors: string[];
  validate: () => Promise<boolean>;
}

export interface WizardProgressIndicatorProps {
  currentStep: number;
  completedSteps: number[];
  steps: WizardStep[];
  onStepClick?: (stepNumber: number) => void;
}

export interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onContinue: () => void;
  onCancel: () => void;
  onPlaceOrderWithoutPayment?: () => void;
  isSubmitting?: boolean;
  canContinue?: boolean;
  paymentMethod?: PaymentMethod;
}

export interface OrderCreationWizardProps {
  initialData?: any;
  isEditMode?: boolean;
  isPharmacyMode?: boolean;
  onComplete?: (data: any) => void;
  onCancel?: () => void;
}

export interface OrderSummaryCardProps {
  items: any[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  onEditItems?: () => void;
  className?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: "Pharmacy" | "Hospital" | "Group";
  company_name?: string;
  billing_address?: {
    street?: string;
    street1?: string;
    city: string;
    state: string;
    zip_code: string;
  };
  shipping_address?: {
    street?: string;
    street1?: string;
    city: string;
    state: string;
    zip_code: string;
  };
  freeShipping?: boolean;
  tax_percentage?: number;
}

export interface CustomerSelectionStepProps {
  selectedCustomerId?: string;
  onCustomerSelect: (customer: Customer) => void;
  onAddNewCustomer?: () => void;
  isEditMode?: boolean;
  lockedCustomer?: Customer;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface BillingAddress extends Address {
  company_name?: string;
  attention?: string;
}

export interface ShippingAddress extends Address {
  fullName: string;
  email: string;
  phone: string;
}

export interface AddressInformationStepProps {
  billingAddress?: BillingAddress;
  shippingAddress?: ShippingAddress;
  onBillingAddressChange: (address: BillingAddress) => void;
  onShippingAddressChange: (address: ShippingAddress) => void;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export type PaymentMethod = "card" | "ach" | "credit" | "manual";

export interface PaymentConfirmationStepProps {
  cartItems: any[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  onPaymentMethodChange?: (method: PaymentMethod) => void;
  onSpecialInstructionsChange?: (instructions: string) => void;
  onPONumberChange?: (poNumber: string) => void;
  onTermsAcceptedChange?: (accepted: boolean) => void;
  onAccuracyConfirmedChange?: (confirmed: boolean) => void;
  initialPaymentMethod?: PaymentMethod;
  initialSpecialInstructions?: string;
  initialPONumber?: string;
  initialTermsAccepted?: boolean;
  initialAccuracyConfirmed?: boolean;
  isEditMode?: boolean;
}
