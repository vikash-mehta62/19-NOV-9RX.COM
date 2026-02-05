-- Find recent invoices to identify the correct one
-- This will show the last 10 invoices

SELECT 
  i.invoice_number,
  i.order_id,
  o.order_number,
  i.amount as subtotal,
  i.tax_amount,
  CAST(COALESCE(i.shippin_cost, '0') AS NUMERIC) as shipping,
  i.total_amount,
  i.paid_amount,
  (i.total_amount - COALESCE(i.paid_amount, 0)) as balance_due,
  i.payment_status,
  i.created_at
FROM invoices i
LEFT JOIN orders o ON i.order_id = o.id
ORDER BY i.created_at DESC
LIMIT 10;

-- Find invoices with balance due
SELECT 
  i.invoice_number,
  o.order_number,
  i.total_amount,
  i.paid_amount,
  (i.total_amount - COALESCE(i.paid_amount, 0)) as balance_due,
  i.payment_status
FROM invoices i
LEFT JOIN orders o ON i.order_id = o.id
WHERE (i.total_amount - COALESCE(i.paid_amount, 0)) > 0
ORDER BY i.created_at DESC
LIMIT 10;

-- Search for invoices with paid amount around $70.88
SELECT 
  i.invoice_number,
  o.order_number,
  i.total_amount,
  i.paid_amount,
  (i.total_amount - COALESCE(i.paid_amount, 0)) as balance_due,
  i.payment_status,
  i.created_at
FROM invoices i
LEFT JOIN orders o ON i.order_id = o.id
WHERE i.paid_amount BETWEEN 70 AND 71
ORDER BY i.created_at DESC;
