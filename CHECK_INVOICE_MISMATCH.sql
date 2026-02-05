-- Check invoice payment mismatch for INV-2025001245
-- This will show the order, invoice, and payment details

-- Check the invoice details
SELECT 
  i.invoice_number,
  i.amount as invoice_subtotal,
  i.tax_amount,
  i.shippin_cost as shipping_cost,
  i.discount_amount,
  i.total_amount as invoice_total,
  i.paid_amount as invoice_paid,
  (i.total_amount - COALESCE(i.paid_amount, 0)) as balance_due,
  i.payment_status,
  i.created_at
FROM invoices i
WHERE i.invoice_number = 'INV-2025001245';

-- Check the related order
SELECT 
  o.order_number,
  o.total_amount as order_total,
  o.tax_amount,
  o.shipping_cost,
  o.discount_amount,
  o.paid_amount as order_paid,
  o.payment_status,
  o.payment_method,
  o.created_at
FROM orders o
WHERE o.order_number = '9R0807357';

-- Check payment transactions for this order/invoice
SELECT 
  pt.id,
  pt.transaction_type,
  pt.amount,
  pt.status,
  pt.payment_method_type,
  pt.response_message,
  pt.created_at
FROM payment_transactions pt
JOIN orders o ON pt.order_id = o.id
WHERE o.order_number = '9R0807357'
ORDER BY pt.created_at DESC;

-- Calculate what the total SHOULD be
SELECT 
  i.invoice_number,
  i.amount as subtotal,
  i.tax_amount as tax,
  CAST(COALESCE(i.shippin_cost, '0') AS NUMERIC) as shipping,
  CAST(COALESCE(i.discount_amount, '0') AS NUMERIC) as discount,
  (i.amount + i.tax_amount + CAST(COALESCE(i.shippin_cost, '0') AS NUMERIC) - CAST(COALESCE(i.discount_amount, '0') AS NUMERIC)) as calculated_total,
  i.total_amount as stored_total,
  (i.amount + i.tax_amount + CAST(COALESCE(i.shippin_cost, '0') AS NUMERIC) - CAST(COALESCE(i.discount_amount, '0') AS NUMERIC)) - i.total_amount as difference
FROM invoices i
WHERE i.invoice_number = 'INV-2025001245';

-- Check if there's a rounding issue
SELECT 
  'Subtotal' as item,
  i.amount as value,
  ROUND(i.amount::numeric, 2) as rounded
FROM invoices i
WHERE i.invoice_number = 'INV-2025001245'
UNION ALL
SELECT 
  'Tax' as item,
  i.tax_amount as value,
  ROUND(i.tax_amount::numeric, 2) as rounded
FROM invoices i
WHERE i.invoice_number = 'INV-2025001245'
UNION ALL
SELECT 
  'Shipping' as item,
  CAST(COALESCE(i.shippin_cost, '0') AS NUMERIC) as value,
  ROUND(CAST(COALESCE(i.shippin_cost, '0') AS NUMERIC), 2) as rounded
FROM invoices i
WHERE i.invoice_number = 'INV-2025001245'
UNION ALL
SELECT 
  'Total' as item,
  i.total_amount as value,
  ROUND(i.total_amount::numeric, 2) as rounded
FROM invoices i
WHERE i.invoice_number = 'INV-2025001245';
