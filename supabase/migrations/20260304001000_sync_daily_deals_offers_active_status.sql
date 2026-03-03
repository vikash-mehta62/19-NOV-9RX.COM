-- Sync is_active between linked daily_deals and offers.
-- If either side changes status, the linked record mirrors it.

CREATE OR REPLACE FUNCTION public.sync_daily_deals_offers_is_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'daily_deals' THEN
    IF NEW.offer_id IS NOT NULL THEN
      IF TG_OP = 'INSERT' THEN
        UPDATE public.offers o
        SET is_active = NEW.is_active
        WHERE o.id = NEW.offer_id
          AND o.is_active IS DISTINCT FROM NEW.is_active;
      ELSIF NEW.offer_id IS DISTINCT FROM OLD.offer_id
            OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        UPDATE public.offers o
        SET is_active = NEW.is_active
        WHERE o.id = NEW.offer_id
          AND o.is_active IS DISTINCT FROM NEW.is_active;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'offers' THEN
    IF TG_OP = 'UPDATE'
       AND NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      UPDATE public.daily_deals d
      SET is_active = NEW.is_active
      WHERE d.offer_id = NEW.id
        AND d.is_active IS DISTINCT FROM NEW.is_active;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.daily_deals') IS NOT NULL
     AND to_regclass('public.offers') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_daily_deals_offers_is_active_from_deals
      ON public.daily_deals;
    CREATE TRIGGER trg_sync_daily_deals_offers_is_active_from_deals
    AFTER INSERT OR UPDATE OF offer_id, is_active
    ON public.daily_deals
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_daily_deals_offers_is_active();

    DROP TRIGGER IF EXISTS trg_sync_daily_deals_offers_is_active_from_offers
      ON public.offers;
    CREATE TRIGGER trg_sync_daily_deals_offers_is_active_from_offers
    AFTER UPDATE OF is_active
    ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_daily_deals_offers_is_active();

    -- One-time reconciliation for existing linked rows.
    UPDATE public.offers o
    SET is_active = d.is_active
    FROM public.daily_deals d
    WHERE d.offer_id = o.id
      AND o.is_active IS DISTINCT FROM d.is_active;
  ELSE
    RAISE NOTICE 'daily_deals/offers table missing, skipping active-status sync triggers.';
  END IF;
END $$;
