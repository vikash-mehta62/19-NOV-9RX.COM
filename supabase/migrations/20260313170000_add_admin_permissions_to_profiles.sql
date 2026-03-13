ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS admin_permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.admin_permissions IS
'Explicit admin portal permissions for internal users (type = admin).';

UPDATE public.profiles
SET admin_permissions = '[]'::jsonb
WHERE admin_permissions IS NULL;
