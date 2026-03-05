-- Log every automation cron cycle into public.automation_logs
-- so the Execution Logs tab can show cron run history even when
-- no business events are matched.

CREATE OR REPLACE FUNCTION public.execute_automation_checks(p_source TEXT DEFAULT 'cron')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_started_at TIMESTAMPTZ := NOW();
  v_low_stock_ok BOOLEAN := true;
  v_high_value_ok BOOLEAN := true;
  v_auto_reorder_ok BOOLEAN := true;
  v_error_messages TEXT[] := ARRAY[]::TEXT[];
  v_active_rule_names TEXT[];
  v_active_rule_count INTEGER := 0;
BEGIN
  SELECT ARRAY_AGG(name ORDER BY priority DESC), COUNT(*)
  INTO v_active_rule_names, v_active_rule_count
  FROM public.automation_rules
  WHERE is_active = true;

  BEGIN
    PERFORM public.check_low_stock_alerts();
  EXCEPTION WHEN OTHERS THEN
    v_low_stock_ok := false;
    v_error_messages := array_append(v_error_messages, 'check_low_stock_alerts: ' || SQLERRM);
  END;

  BEGIN
    PERFORM public.check_high_value_orders();
  EXCEPTION WHEN OTHERS THEN
    v_high_value_ok := false;
    v_error_messages := array_append(v_error_messages, 'check_high_value_orders: ' || SQLERRM);
  END;

  BEGIN
    PERFORM public.trigger_auto_reorder();
  EXCEPTION WHEN OTHERS THEN
    v_auto_reorder_ok := false;
    v_error_messages := array_append(v_error_messages, 'trigger_auto_reorder: ' || SQLERRM);
  END;

  INSERT INTO public.automation_logs (
    rule_id,
    trigger_type,
    trigger_data,
    action_taken,
    status,
    error_message,
    executed_at
  )
  VALUES (
    NULL,
    'cron_cycle',
    jsonb_build_object(
      'source', COALESCE(NULLIF(p_source, ''), 'cron'),
      'started_at', v_started_at,
      'finished_at', NOW(),
      'active_rule_count', v_active_rule_count,
      'active_rule_names', COALESCE(v_active_rule_names, ARRAY[]::TEXT[]),
      'low_stock_ok', v_low_stock_ok,
      'high_value_ok', v_high_value_ok,
      'auto_reorder_ok', v_auto_reorder_ok
    ),
    CASE
      WHEN COALESCE(NULLIF(p_source, ''), 'cron') = 'manual'
        THEN 'Automation manual run executed'
      ELSE 'Automation scheduled cron run executed'
    END,
    CASE
      WHEN array_length(v_error_messages, 1) IS NULL THEN 'success'
      ELSE 'failed'
    END,
    CASE
      WHEN array_length(v_error_messages, 1) IS NULL THEN NULL
      ELSE array_to_string(v_error_messages, ' | ')
    END,
    NOW()
  );
END;
$$;

COMMENT ON FUNCTION public.execute_automation_checks() IS
  'Runs automation checks and logs one cron_cycle heartbeat row per execution in public.automation_logs; p_source can be cron/manual';
