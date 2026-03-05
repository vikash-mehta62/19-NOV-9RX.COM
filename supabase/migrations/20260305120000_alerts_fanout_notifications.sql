-- Fan out each newly created alert to admin notifications
-- so important automation matches appear in both:
-- 1) Alerts view (from alerts table)
-- 2) Notifications view (from notifications table)

CREATE OR REPLACE FUNCTION public.fanout_alert_to_admin_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_notification_type TEXT := 'info';
BEGIN
  IF NEW.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map alert severity/category to existing notification types used in UI.
  v_notification_type := CASE
    WHEN NEW.severity = 'critical' THEN 'error'
    WHEN NEW.severity = 'warning' THEN 'warning'
    WHEN NEW.category = 'orders' THEN 'order'
    WHEN NEW.category = 'inventory' THEN 'warning'
    WHEN NEW.category = 'system' THEN 'automation'
    ELSE 'info'
  END;

  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    read,
    link,
    metadata,
    created_at,
    updated_at
  )
  SELECT
    p.id,
    COALESCE(NEW.title, 'System Alert'),
    COALESCE(NEW.message, 'A new alert has been generated.'),
    v_notification_type,
    false,
    '/admin/alerts',
    jsonb_build_object(
      'source', 'alert',
      'alert_id', NEW.id,
      'alert_category', NEW.category,
      'alert_severity', NEW.severity,
      'entity_type', NEW.entity_type,
      'entity_id', NEW.entity_id
    ),
    COALESCE(NEW.created_at, NOW()),
    NOW()
  FROM public.profiles p
  WHERE p.role IN ('admin', 'superadmin')
    AND COALESCE(p.status, 'active') = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = p.id
        AND n.metadata ->> 'source' = 'alert'
        AND n.metadata ->> 'alert_id' = NEW.id::TEXT
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fanout_alert_to_admin_notifications ON public.alerts;

CREATE TRIGGER trg_fanout_alert_to_admin_notifications
AFTER INSERT ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.fanout_alert_to_admin_notifications();

COMMENT ON FUNCTION public.fanout_alert_to_admin_notifications() IS
  'Copies each new alert to admin notifications so alerts and notifications views stay in sync.';
