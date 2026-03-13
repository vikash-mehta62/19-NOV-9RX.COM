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

  // Document addresses
  invoice_company_name: string;
  invoice_email: string;
  invoice_phone: string;
  invoice_tax_id: string;
  invoice_website: string;
  invoice_street: string;
  invoice_suite: string;
  invoice_city: string;
  invoice_state: string;
  invoice_zip_code: string;
  invoice_country: string;
  shipping_company_name: string;
  shipping_email: string;
  shipping_phone: string;
  shipping_street: string;
  shipping_suite: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip_code: string;
  shipping_country: string;
  warehouse_name: string;
  warehouse_email: string;
  warehouse_phone: string;
  warehouse_street: string;
  warehouse_suite: string;
  warehouse_city: string;
  warehouse_state: string;
  warehouse_zip_code: string;
  warehouse_country: string;

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
  credit_card_processor: string;
  ach_processor: string;
  
  // FortisPay Settings
  fortispay_enabled: boolean;
  fortispay_user_id: string;
  fortispay_user_api_key: string;
  fortispay_location_id: string;
  fortispay_product_transaction_id_ach: string;
  fortispay_test_mode: boolean;

  // Payment Terms & Fees
  late_payment_enabled: boolean;
  late_payment_interest_rate: number;
  late_payment_grace_period_days: number;
  late_payment_fee_type: string; // 'percentage' or 'fixed'
  late_payment_fixed_fee: number;
  card_processing_fee_enabled: boolean;
  card_processing_fee_percentage: number;
  card_processing_fee_pass_to_customer: boolean;
  ach_processing_fee_enabled: boolean;
  ach_processing_fee_amount: number;
  ach_processing_fee_pass_to_customer: boolean;
  minimum_payment_amount: number;
  payment_terms_text: string;
  early_payment_discount_enabled: boolean;
  early_payment_discount_percentage: number;
  early_payment_discount_days: number;

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
  fedex_enabled: boolean;
  fedex_use_sandbox: boolean;
  fedex_api_key: string;
  fedex_secret_key: string;
  fedex_child_key: string;
  fedex_child_secret: string;
  fedex_account_number: string;
  fedex_meter_number: string;
  fedex_default_service_type: string;
  fedex_default_packaging_type: string;
  fedex_default_pickup_type: string;
  fedex_label_stock_type: string;
  fedex_label_image_type: string;
  fedex_default_weight_value: number;
  fedex_default_weight_units: string;
  fedex_default_length: number;
  fedex_default_width: number;
  fedex_default_height: number;
  fedex_default_dimension_units: string;

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

  // Document addresses
  invoice_company_name: "",
  invoice_email: "",
  invoice_phone: "",
  invoice_tax_id: "",
  invoice_website: "",
  invoice_street: "",
  invoice_suite: "",
  invoice_city: "",
  invoice_state: "",
  invoice_zip_code: "",
  invoice_country: "USA",
  shipping_company_name: "",
  shipping_email: "",
  shipping_phone: "",
  shipping_street: "",
  shipping_suite: "",
  shipping_city: "",
  shipping_state: "",
  shipping_zip_code: "",
  shipping_country: "USA",
  warehouse_name: "",
  warehouse_email: "",
  warehouse_phone: "",
  warehouse_street: "",
  warehouse_suite: "",
  warehouse_city: "",
  warehouse_state: "",
  warehouse_zip_code: "",
  warehouse_country: "USA",

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
  credit_card_processor: "authorize_net",
  ach_processor: "authorize_net",
  
  // FortisPay
  fortispay_enabled: false,
  fortispay_user_id: "",
  fortispay_user_api_key: "",
  fortispay_location_id: "",
  fortispay_product_transaction_id_ach: "",
  fortispay_test_mode: false,

  // Payment Terms & Fees
  late_payment_enabled: false,
  late_payment_interest_rate: 1.5,
  late_payment_grace_period_days: 15,
  late_payment_fee_type: "percentage",
  late_payment_fixed_fee: 25,
  card_processing_fee_enabled: false,
  card_processing_fee_percentage: 2.9,
  card_processing_fee_pass_to_customer: false,
  ach_processing_fee_enabled: false,
  ach_processing_fee_amount: 1.5,
  ach_processing_fee_pass_to_customer: false,
  minimum_payment_amount: 0,
  payment_terms_text: "Payment is due within 30 days of invoice date. Late payments may incur additional fees.",
  early_payment_discount_enabled: false,
  early_payment_discount_percentage: 2,
  early_payment_discount_days: 10,

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
  fedex_enabled: false,
  fedex_use_sandbox: true,
  fedex_api_key: "",
  fedex_secret_key: "",
  fedex_child_key: "",
  fedex_child_secret: "",
  fedex_account_number: "",
  fedex_meter_number: "",
  fedex_default_service_type: "FEDEX_GROUND",
  fedex_default_packaging_type: "YOUR_PACKAGING",
  fedex_default_pickup_type: "USE_SCHEDULED_PICKUP",
  fedex_label_stock_type: "PAPER_85X11_TOP_HALF_LABEL",
  fedex_label_image_type: "PDF",
  fedex_default_weight_value: 1,
  fedex_default_weight_units: "LB",
  fedex_default_length: 12,
  fedex_default_width: 10,
  fedex_default_height: 8,
  fedex_default_dimension_units: "IN",

  // Order Settings
  minimum_order_amount: 0,
  order_number_prefix: "9RX",
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
