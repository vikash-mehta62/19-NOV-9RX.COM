/**
 * Payment Configuration
 * Centralized configuration for payment processors
 * Reads from database settings (admin configured) with environment variable fallback
 */

import { supabase } from "@/integrations/supabase/client";

export type PaymentProcessor = "authorize_net" | "fortispay";

export interface PaymentConfig {
  achProcessor: PaymentProcessor;
  creditCardProcessor: PaymentProcessor;
  fortisPayEnabled: boolean;
  authorizeNetEnabled: boolean;
}

export interface PaymentExperienceSettings {
  cardProcessingFeeEnabled: boolean;
  cardProcessingFeePercentage: number;
  cardProcessingFeePassToCustomer: boolean;
  invoiceDefaultNotes: string;
}

interface PaymentExperienceSettingsRow {
  card_processing_fee_enabled?: boolean | null;
  card_processing_fee_percentage?: number | null;
  card_processing_fee_pass_to_customer?: boolean | null;
  invoice_notes?: string | null;
}

// Default to environment variables
let cachedConfig: PaymentConfig | null = null;

/**
 * Get payment configuration from database settings
 */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Fallback to environment variables if not logged in
      return getEnvPaymentConfig();
    }

    // Fetch global settings (organization-wide payment processor configuration)
    const { data: settings, error } = await supabase
      .from("settings")
      .select("credit_card_processor, ach_processor")
      .eq("is_global", true)
      .maybeSingle();

    if (error || !settings) {
      console.warn("Could not fetch payment settings from database, using environment variables");
      return getEnvPaymentConfig();
    }

    // Check if processors are enabled (payment_settings remains per-profile for credentials)
    const { data: authorizeNetData } = await supabase
      .from("payment_settings")
      .select("settings")
      .eq("profile_id", user.id)
      .eq("provider", "authorize_net")
      .maybeSingle();

    const { data: fortisPayData } = await supabase
      .from("payment_settings")
      .select("settings")
      .eq("profile_id", user.id)
      .eq("provider", "fortispay")
      .maybeSingle();

    const authorizeNetEnabled = authorizeNetData?.settings?.enabled || false;
    const fortisPayEnabled = fortisPayData?.settings?.enabled || false;

    const config: PaymentConfig = {
      achProcessor: (settings.ach_processor as PaymentProcessor) || "authorize_net",
      creditCardProcessor: (settings.credit_card_processor as PaymentProcessor) || "authorize_net",
      fortisPayEnabled,
      authorizeNetEnabled,
    };

    cachedConfig = config;
    return config;
  } catch (error) {
    console.error("Error fetching payment config:", error);
    return getEnvPaymentConfig();
  }
}

/**
 * Get payment configuration from environment variables (fallback)
 */
function getEnvPaymentConfig(): PaymentConfig {
  const achProcessor = (import.meta.env.VITE_ACH_PAYMENT_PROCESSOR || "authorize_net") as PaymentProcessor;

  // Frontend must not depend on payment provider secrets.
  // Use an explicit non-secret feature flag for Fortis availability.
  const fortisPayEnabled = import.meta.env.VITE_FORTISPAY_ENABLED === "true";

  const authorizeNetEnabled = true; // Assuming it's configured via Supabase

  return {
    achProcessor,
    creditCardProcessor: "authorize_net",
    fortisPayEnabled,
    authorizeNetEnabled,
  };
}

/**
 * Get the current ACH payment processor
 */
export async function getACHProcessor(): Promise<PaymentProcessor> {
  const config = await getPaymentConfig();
  return config.achProcessor;
}

/**
 * Check if FortisPay is available and configured
 */
export async function isFortisPayAvailable(): Promise<boolean> {
  const config = await getPaymentConfig();
  return config.fortisPayEnabled;
}

/**
 * Check if Authorize.Net is available
 */
export async function isAuthorizeNetAvailable(): Promise<boolean> {
  const config = await getPaymentConfig();
  return config.authorizeNetEnabled;
}

/**
 * Clear cached configuration (call after settings update)
 */
export function clearPaymentConfigCache() {
  cachedConfig = null;
}

async function fetchPaymentExperienceRow(): Promise<PaymentExperienceSettingsRow | null> {
  // Fetch global settings (organization-wide card processing fee configuration)
  const { data, error } = await supabase
    .from("settings")
    .select(
      "card_processing_fee_enabled, card_processing_fee_percentage, card_processing_fee_pass_to_customer, invoice_notes"
    )
    .eq("is_global", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PaymentExperienceSettingsRow;
}

function normalizePaymentExperienceRow(row: PaymentExperienceSettingsRow | null): PaymentExperienceSettings {
  return {
    cardProcessingFeeEnabled: Boolean(row?.card_processing_fee_enabled),
    cardProcessingFeePercentage: Number(row?.card_processing_fee_percentage || 0),
    cardProcessingFeePassToCustomer: Boolean(row?.card_processing_fee_pass_to_customer),
    invoiceDefaultNotes: row?.invoice_notes || "",
  };
}

function hasConfiguredCardFee(settings: PaymentExperienceSettings): boolean {
  return (
    settings.cardProcessingFeeEnabled ||
    settings.cardProcessingFeePassToCustomer ||
    settings.cardProcessingFeePercentage > 0
  );
}

async function getAdminSettingsProfileId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "superadmin"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return data.id as string;
}

export async function getPaymentExperienceSettings(profileId?: string): Promise<PaymentExperienceSettings> {
  const defaults: PaymentExperienceSettings = {
    cardProcessingFeeEnabled: false,
    cardProcessingFeePercentage: 0,
    cardProcessingFeePassToCustomer: false,
    invoiceDefaultNotes: "",
  };

  try {
    // Fetch global payment experience settings (organization-wide)
    const globalRow = await fetchPaymentExperienceRow();
    
    if (globalRow) {
      return normalizePaymentExperienceRow(globalRow);
    }

    // Fallback: Try RPC function if direct query fails
    const { data: rpcResult } = await supabase.rpc("get_card_processing_fee_settings");
    if (rpcResult) {
      const parsed = typeof rpcResult === "string" ? JSON.parse(rpcResult) : rpcResult;
      return {
        cardProcessingFeeEnabled: Boolean(parsed.cardProcessingFeeEnabled),
        cardProcessingFeePercentage: Number(parsed.cardProcessingFeePercentage || 0),
        cardProcessingFeePassToCustomer: Boolean(parsed.cardProcessingFeePassToCustomer),
        invoiceDefaultNotes: parsed.invoiceDefaultNotes || "",
      };
    }

    return defaults;
  } catch (error) {
    console.error("Error fetching payment experience settings:", error);
    return defaults;
  }
}
