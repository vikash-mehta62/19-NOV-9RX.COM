export interface StoreHours {
  monday: { open: string; close: string; closed: boolean };
  tuesday: { open: string; close: string; closed: boolean };
  wednesday: { open: string; close: string; closed: boolean };
  thursday: { open: string; close: string; closed: boolean };
  friday: { open: string; close: string; closed: boolean };
  saturday: { open: string; close: string; closed: boolean };
  sunday: { open: string; close: string; closed: boolean };
}

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
  logo: string;

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

  // Tax Settings
  tax_enabled: boolean;
  default_tax_rate: number;
  tax_id_display: string;
  tax_label: string;
  tax_included_in_price: boolean;

  // Shipping Settings
  default_shipping_rate: number;
  free_shipping_threshold: number;
  free_shipping_enabled: boolean;
  shipping_calculation_method: string;
  handling_fee: number;

  // Order Settings
  minimum_order_amount: number;
  order_number_prefix: string;
  next_order_number: number;
  allow_guest_checkout: boolean;
  require_phone_number: boolean;
  auto_confirm_orders: boolean;

  // Email/SMTP Settings
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_encryption: string;
  sender_name: string;
  sender_email: string;
  reply_to_email: string;

  // Store Hours
  store_hours: StoreHours;
  timezone: string;

  // Social Media Links
  social_facebook: string;
  social_instagram: string;
  social_twitter: string;
  social_linkedin: string;
  social_youtube: string;
  social_tiktok: string;

  // Currency Settings
  default_currency: string;
  currency_symbol: string;
  currency_position: string;
  decimal_separator: string;
  thousand_separator: string;
  decimal_places: number;
}


export const defaultValues: SettingsFormValues = {
  // Business Profile
  business_name: "",
  description: "",
  address: "",
  suite: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
  email: "",
  logo: "",

  // Security
  current_password: "",
  new_password: "",
  two_factor_enabled: false,

  // Invoice
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

  // Payment
  authorize_net_enabled: false,
  authorize_net_api_login_id: "",
  authorize_net_transaction_key: "",
  authorize_net_test_mode: false,

  // Notifications
  email_notifications: false,
  order_updates: false,

  // Tax Settings
  tax_enabled: true,
  default_tax_rate: 0,
  tax_id_display: "",
  tax_label: "Tax",
  tax_included_in_price: false,

  // Shipping Settings
  default_shipping_rate: 0,
  free_shipping_threshold: 0,
  free_shipping_enabled: false,
  shipping_calculation_method: "flat_rate",
  handling_fee: 0,

  // Order Settings
  minimum_order_amount: 0,
  order_number_prefix: "ORD",
  next_order_number: 1000,
  allow_guest_checkout: false,
  require_phone_number: true,
  auto_confirm_orders: false,

  // Email/SMTP Settings
  smtp_host: "",
  smtp_port: 587,
  smtp_username: "",
  smtp_password: "",
  smtp_encryption: "tls",
  sender_name: "",
  sender_email: "",
  reply_to_email: "",

  // Store Hours
  store_hours: {
    monday: { open: "09:00", close: "17:00", closed: false },
    tuesday: { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday: { open: "09:00", close: "17:00", closed: false },
    friday: { open: "09:00", close: "17:00", closed: false },
    saturday: { open: "10:00", close: "14:00", closed: false },
    sunday: { open: "", close: "", closed: true },
  },
  timezone: "America/New_York",

  // Social Media
  social_facebook: "",
  social_instagram: "",
  social_twitter: "",
  social_linkedin: "",
  social_youtube: "",
  social_tiktok: "",

  // Currency
  default_currency: "USD",
  currency_symbol: "$",
  currency_position: "before",
  decimal_separator: ".",
  thousand_separator: ",",
  decimal_places: 2,
};
