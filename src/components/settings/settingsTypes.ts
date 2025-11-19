export interface SettingsFormValues {
  // Business Profile
  business_name: string;
  description: string;
  address: string;
  suite: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  logo: string; // Added this field

  // Security Settings
  current_password: string;
  new_password: string;
  two_factor_enabled: boolean;

  // Invoice Settings
  invoice_header_text: string;
  invoice_footer_text: string;
  show_business_address: boolean;
  show_payment_instructions: boolean;
  custom_payment_instructions: string;
  invoice_terms_and_conditions: string;
  show_invoice_due_date: boolean;
  invoice_logo: string;
  show_logo: boolean;
  invoice_accent_color: string;
  invoice_prefix: string;
  next_invoice_number: number;
  invoice_due_days: number;
  invoice_notes: string;

  // Payment Settings
  authorize_net_enabled: boolean;
  authorize_net_api_login_id: string;
  authorize_net_transaction_key: string;
  authorize_net_test_mode: boolean;

  // Notification Settings
  email_notifications: boolean;
  order_updates: boolean;
}

export const defaultValues: SettingsFormValues = {
  business_name: "",
  description: "",
  address: "",
  suite: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
  email: "",
  logo: "", // Added this field
  current_password: "",
  new_password: "",
  two_factor_enabled: false,
  invoice_header_text: "",
  invoice_footer_text: "",
  show_business_address: true,
  show_payment_instructions: true,
  custom_payment_instructions: "",
  invoice_terms_and_conditions: "",
  show_invoice_due_date: true,
  invoice_logo: "",
  show_logo: true,
  invoice_accent_color: "#000000",
  invoice_prefix: "INV",
  next_invoice_number: 1000,
  invoice_due_days: 30,
  invoice_notes: "",
  authorize_net_enabled: false,
  authorize_net_api_login_id: "",
  authorize_net_transaction_key: "",
  authorize_net_test_mode: false,
  email_notifications: false,
  order_updates: false,
};
