-- Hotfix: allow safe transactional self-inserts into email_queue for authenticated users
-- while keeping admin-only management controls.

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_queue_self_transactional_insert ON public.email_queue;
CREATE POLICY email_queue_self_transactional_insert
ON public.email_queue
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_is_admin()
  OR (
    auth.uid() IS NOT NULL
    AND lower(trim(COALESCE(to_email, ''))) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
    AND COALESCE(status, 'pending') = 'pending'
    AND COALESCE(attempts, 0) = 0
    AND sent_at IS NULL
    AND provider_message_id IS NULL
    AND campaign_id IS NULL
    AND automation_id IS NULL
  )
);

DO $$
BEGIN
  RAISE NOTICE 'email_queue self insert hotfix applied';
END $$;
