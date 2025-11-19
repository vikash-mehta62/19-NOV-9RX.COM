CREATE OR REPLACE FUNCTION get_low_stock_products()
RETURNS TABLE (
  id uuid,
  name text,
  current_stock numeric,
  min_stock integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.current_stock, p.min_stock
  FROM products p
  WHERE p.current_stock < p.min_stock::numeric;
END;
$$;