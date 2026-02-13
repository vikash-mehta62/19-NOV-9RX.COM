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

    // Fetch settings from database
    const { data: settings, error } = await supabase
      .from("settings")
      .select("credit_card_processor, ach_processor")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (error || !settings) {
      console.warn("Could not fetch payment settings from database, using environment variables");
      return getEnvPaymentConfig();
    }

    // Check if processors are enabled
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

  const fortisPayEnabled = !!(
    import.meta.env.VITE_FORTIS_USER_ID &&
    import.meta.env.VITE_FORTIS_USER_API_KEY &&
    import.meta.env.VITE_FORTIS_LOCATION_ID &&
    import.meta.env.VITE_FORTIS_PRODUCT_TRANSACTION_ID_ACH
  );

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
