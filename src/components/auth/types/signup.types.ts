// Address structure for billing and shipping
export interface AddressData {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone?: string;
  fax?: string;
}

export interface SignupFormData {
  // Step 1: Basic Info
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  referralCode?: string;
  
  // Step 2: Pharmacy Details
  pharmacyLicense: string;
  
  // Step 3: Contact Information
  workPhone: string;
  mobilePhone: string;
  alternativeEmail?: string;
  fax?: string;
  contactPerson: string;
  department?: string;
  
  // Step 4: Addresses
  billingAddress: AddressData;
  shippingAddress: AddressData;
  sameAsShipping: boolean;
  
  // Step 5: Tax & Documents
  stateId?: string;
  taxPreference: 'taxable' | 'tax_exempt';
  taxPercentage?: number;
  taxId?: string;
  documents?: File[];
}

export interface FormFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

// Step validation status
export interface StepValidation {
  isValid: boolean;
  errors: string[];
}

// Wizard step definition
export interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: string;
}
