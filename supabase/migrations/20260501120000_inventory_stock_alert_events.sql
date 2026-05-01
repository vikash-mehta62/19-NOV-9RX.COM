-- Inventory stock alert events
-- Stock mutations write lightweight events; the backend cron turns pending events
-- into email_queue rows so inventory writes are not blocked by SMTP delivery.

ALTER TABLE public.email_queue
ADD COLUMN IF NOT EXISTS to_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS to_name VARCHAR(255);

ALTER TABLE public.email_queue
DROP CONSTRAINT IF EXISTS email_queue_email_type_check;

ALTER TABLE public.email_queue
ADD CONSTRAINT email_queue_email_type_check
CHECK (
  email_type::text = ANY (
    ARRAY[
      'welcome',
      'abandoned_cart',
      'order_confirmation',
      'order_shipped',
      'order_delivered',
      'promotional',
      'newsletter',
      'restock_reminder',
      'inactive_user',
      'product_spotlight',
      'feedback',
      'password_reset',
      'terms_acceptance',
      'automation',
      'custom',
      'reward_notification',
      'inventory_alert'
    ]::text[]
  )
);

CREATE TABLE IF NOT EXISTS public.inventory_alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  product_size_id UUID REFERENCES public.product_sizes(id) ON DELETE CASCADE,
  product_name TEXT,
  size_label TEXT,
  sku TEXT,
  previous_stock NUMERIC(12,2),
  current_stock NUMERIC(12,2) NOT NULL,
  threshold NUMERIC(12,2),
  status TEXT NOT NULL CHECK (status IN ('very_low', 'critical', 'out_of_stock')),
  source TEXT NOT NULL DEFAULT 'stock_change',
  fingerprint TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status_state TEXT NOT NULL DEFAULT 'pending' CHECK (status_state IN ('pending', 'processing', 'queued', 'sent', 'failed', 'cancelled')),
  email_queue_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_alert_events_pending
ON public.inventory_alert_events(status_state, next_retry_at, created_at)
WHERE status_state IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_inventory_alert_events_product
ON public.inventory_alert_events(product_id, product_size_id, created_at DESC);

DROP INDEX IF EXISTS public.idx_inventory_alert_events_active_fingerprint;

CREATE UNIQUE INDEX idx_inventory_alert_events_active_fingerprint
ON public.inventory_alert_events(fingerprint)
WHERE status_state IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS public.inventory_alert_state (
  product_size_id UUID PRIMARY KEY REFERENCES public.product_sizes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  last_status TEXT CHECK (last_status IN ('very_low', 'critical', 'out_of_stock')),
  last_stock NUMERIC(12,2),
  last_email_queue_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL,
  last_event_id UUID REFERENCES public.inventory_alert_events(id) ON DELETE SET NULL,
  last_notified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_alert_state_status
ON public.inventory_alert_state(last_status, last_notified_at DESC);

ALTER TABLE public.inventory_alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alert_state ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inventory_alert_events'
      AND policyname = 'inventory_alert_events_admin_only'
  ) THEN
    CREATE POLICY "inventory_alert_events_admin_only"
    ON public.inventory_alert_events
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inventory_alert_state'
      AND policyname = 'inventory_alert_state_admin_only'
  ) THEN
    CREATE POLICY "inventory_alert_state_admin_only"
    ON public.inventory_alert_state
    FOR ALL
    TO authenticated
    USING (public.current_user_is_admin())
    WITH CHECK (public.current_user_is_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.inventory_alert_status(
  p_current_stock NUMERIC,
  p_reorder_point NUMERIC DEFAULT NULL,
  p_min_stock NUMERIC DEFAULT NULL
)
RETURNS TABLE(status TEXT, threshold NUMERIC)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_stock NUMERIC := COALESCE(p_current_stock, 0);
BEGIN
  IF v_stock <= 0 THEN
    status := 'out_of_stock';
    threshold := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_stock < 20 THEN
    status := 'very_low';
    threshold := 20;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_stock <= 50 THEN
    status := 'critical';
    threshold := 50;
    RETURN NEXT;
    RETURN;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_inventory_alert_event(
  p_product_id UUID,
  p_product_size_id UUID,
  p_product_name TEXT,
  p_size_label TEXT,
  p_sku TEXT,
  p_previous_stock NUMERIC,
  p_current_stock NUMERIC,
  p_reorder_point NUMERIC DEFAULT NULL,
  p_min_stock NUMERIC DEFAULT NULL,
  p_source TEXT DEFAULT 'stock_change',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status TEXT;
  v_threshold NUMERIC;
  v_scope TEXT;
  v_fingerprint TEXT;
BEGIN
  SELECT status, threshold
  INTO v_status, v_threshold
  FROM public.inventory_alert_status(p_current_stock, p_reorder_point, p_min_stock)
  LIMIT 1;

  IF v_status IS NULL THEN
    IF p_product_size_id IS NOT NULL THEN
      UPDATE public.inventory_alert_state
      SET
        last_stock = COALESCE(p_current_stock, 0),
        resolved_at = NOW(),
        updated_at = NOW()
      WHERE product_size_id = p_product_size_id;
    END IF;

    RETURN;
  END IF;

  v_scope := COALESCE(p_product_size_id::TEXT, p_product_id::TEXT);
  v_fingerprint := v_scope;

  INSERT INTO public.inventory_alert_events (
    product_id,
    product_size_id,
    product_name,
    size_label,
    sku,
    previous_stock,
    current_stock,
    threshold,
    status,
    source,
    fingerprint,
    metadata
  )
  VALUES (
    p_product_id,
    p_product_size_id,
    p_product_name,
    p_size_label,
    p_sku,
    p_previous_stock,
    p_current_stock,
    v_threshold,
    v_status,
    COALESCE(p_source, 'stock_change'),
    v_fingerprint,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (fingerprint) WHERE status_state IN ('pending', 'processing')
  DO UPDATE SET
    previous_stock = EXCLUDED.previous_stock,
    current_stock = EXCLUDED.current_stock,
    threshold = EXCLUDED.threshold,
    status = EXCLUDED.status,
    product_name = EXCLUDED.product_name,
    size_label = EXCLUDED.size_label,
    sku = EXCLUDED.sku,
    metadata = inventory_alert_events.metadata || EXCLUDED.metadata,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_product_size_stock_alert_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product RECORD;
  v_size_label TEXT;
BEGIN
  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.stock, 0) IS NOT DISTINCT FROM COALESCE(NEW.stock, 0) THEN
    RETURN NEW;
  END IF;

  SELECT p.id, p.name, p.reorder_point, p.min_stock, p."unitToggle"
  INTO v_product
  FROM public.products p
  WHERE p.id = NEW.product_id;

  v_size_label := NULLIF(
    trim(concat_ws(' ', NEW.size_name, NEW.size_value::TEXT, CASE WHEN COALESCE(v_product."unitToggle", false) THEN NEW.size_unit ELSE NULL END)),
    ''
  );

  PERFORM public.enqueue_inventory_alert_event(
    NEW.product_id,
    NEW.id,
    COALESCE(v_product.name, 'Unknown product'),
    COALESCE(v_size_label, 'Default'),
    NEW.sku,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.stock ELSE NULL END,
    COALESCE(NEW.stock, 0),
    v_product.reorder_point,
    v_product.min_stock,
    'product_size_stock_change',
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'size_name', NEW.size_name,
      'size_value', NEW.size_value,
      'size_unit', NEW.size_unit,
      'unitToggle', COALESCE(v_product."unitToggle", false)
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_size_stock_alert_event ON public.product_sizes;
CREATE TRIGGER product_size_stock_alert_event
AFTER INSERT OR UPDATE OF stock ON public.product_sizes
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_product_size_stock_alert_event();

DROP TRIGGER IF EXISTS product_stock_alert_event ON public.products;
DROP FUNCTION IF EXISTS public.enqueue_product_stock_alert_event();

GRANT EXECUTE ON FUNCTION public.enqueue_inventory_alert_event(UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, JSONB) TO authenticated;
