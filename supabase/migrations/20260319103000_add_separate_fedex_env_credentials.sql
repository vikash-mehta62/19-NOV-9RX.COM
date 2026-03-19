ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS fedex_sandbox_api_key text,
ADD COLUMN IF NOT EXISTS fedex_sandbox_secret_key text,
ADD COLUMN IF NOT EXISTS fedex_sandbox_child_key text,
ADD COLUMN IF NOT EXISTS fedex_sandbox_child_secret text,
ADD COLUMN IF NOT EXISTS fedex_sandbox_account_number text,
ADD COLUMN IF NOT EXISTS fedex_sandbox_meter_number text,
ADD COLUMN IF NOT EXISTS fedex_production_api_key text,
ADD COLUMN IF NOT EXISTS fedex_production_secret_key text,
ADD COLUMN IF NOT EXISTS fedex_production_child_key text,
ADD COLUMN IF NOT EXISTS fedex_production_child_secret text,
ADD COLUMN IF NOT EXISTS fedex_production_account_number text,
ADD COLUMN IF NOT EXISTS fedex_production_meter_number text;

UPDATE public.settings
SET
  fedex_sandbox_api_key = COALESCE(NULLIF(fedex_sandbox_api_key, ''), fedex_api_key),
  fedex_sandbox_secret_key = COALESCE(NULLIF(fedex_sandbox_secret_key, ''), fedex_secret_key),
  fedex_sandbox_child_key = COALESCE(NULLIF(fedex_sandbox_child_key, ''), fedex_child_key),
  fedex_sandbox_child_secret = COALESCE(NULLIF(fedex_sandbox_child_secret, ''), fedex_child_secret),
  fedex_sandbox_account_number = COALESCE(NULLIF(fedex_sandbox_account_number, ''), fedex_account_number),
  fedex_sandbox_meter_number = COALESCE(NULLIF(fedex_sandbox_meter_number, ''), fedex_meter_number),
  fedex_production_api_key = COALESCE(NULLIF(fedex_production_api_key, ''), fedex_api_key),
  fedex_production_secret_key = COALESCE(NULLIF(fedex_production_secret_key, ''), fedex_secret_key),
  fedex_production_child_key = COALESCE(NULLIF(fedex_production_child_key, ''), fedex_child_key),
  fedex_production_child_secret = COALESCE(NULLIF(fedex_production_child_secret, ''), fedex_child_secret),
  fedex_production_account_number = COALESCE(NULLIF(fedex_production_account_number, ''), fedex_account_number),
  fedex_production_meter_number = COALESCE(NULLIF(fedex_production_meter_number, ''), fedex_meter_number)
WHERE
  fedex_api_key IS NOT NULL
  OR fedex_secret_key IS NOT NULL
  OR fedex_child_key IS NOT NULL
  OR fedex_child_secret IS NOT NULL
  OR fedex_account_number IS NOT NULL
  OR fedex_meter_number IS NOT NULL;
