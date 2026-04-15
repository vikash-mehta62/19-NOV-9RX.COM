ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS ipospay_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ipospay_test_mode boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS ipospay_sandbox_tpn text,
  ADD COLUMN IF NOT EXISTS ipospay_sandbox_auth_token text,
  ADD COLUMN IF NOT EXISTS ipospay_production_tpn text,
  ADD COLUMN IF NOT EXISTS ipospay_production_auth_token text;

COMMENT ON COLUMN public.settings.ipospay_enabled IS 'Equivalent to IPOSPAY_ENABLED. Enables iPOSPay hosted payment processing.';
COMMENT ON COLUMN public.settings.ipospay_test_mode IS 'Equivalent to IPOSPAY_TEST_MODE. Uses sandbox credentials when true.';
COMMENT ON COLUMN public.settings.ipospay_sandbox_tpn IS 'Equivalent to IPOSPAY_SANDBOX_TPN.';
COMMENT ON COLUMN public.settings.ipospay_sandbox_auth_token IS 'Equivalent to IPOSPAY_SANDBOX_AUTH_TOKEN.';
COMMENT ON COLUMN public.settings.ipospay_production_tpn IS 'Equivalent to IPOSPAY_PRODUCTION_TPN.';
COMMENT ON COLUMN public.settings.ipospay_production_auth_token IS 'Equivalent to IPOSPAY_PRODUCTION_AUTH_TOKEN.';
