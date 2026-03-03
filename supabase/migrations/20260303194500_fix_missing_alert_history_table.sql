-- Hotfix: restore missing public.alert_history table used by automationService.resolveAlert

CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON public.alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_performed_at ON public.alert_history(performed_at DESC);

ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alert_history_admin_select ON public.alert_history;
CREATE POLICY alert_history_admin_select
ON public.alert_history
FOR SELECT
TO authenticated
USING (public.current_user_is_admin());

DROP POLICY IF EXISTS alert_history_admin_insert ON public.alert_history;
CREATE POLICY alert_history_admin_insert
ON public.alert_history
FOR INSERT
TO authenticated
WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS alert_history_admin_update ON public.alert_history;
CREATE POLICY alert_history_admin_update
ON public.alert_history
FOR UPDATE
TO authenticated
USING (public.current_user_is_admin())
WITH CHECK (public.current_user_is_admin());

GRANT SELECT, INSERT, UPDATE ON TABLE public.alert_history TO authenticated;

-- Force PostgREST to refresh schema cache immediately.
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'alert_history hotfix applied';
END $$;
