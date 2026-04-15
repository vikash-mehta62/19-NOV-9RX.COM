-- Fix credit memo application failures caused by timestamp-sized adjustment numbers.
-- Existing rows may have adjustment_number values like ADJ17761790112, which exceed INT.
CREATE OR REPLACE FUNCTION generate_adjustment_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter BIGINT;
BEGIN
  SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(adjustment_number, '\D', '', 'g'), '')::BIGINT), 0) + 1
  INTO counter
  FROM payment_adjustments
  WHERE adjustment_number LIKE 'ADJ%';

  new_number := 'ADJ' || LPAD(counter::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;
