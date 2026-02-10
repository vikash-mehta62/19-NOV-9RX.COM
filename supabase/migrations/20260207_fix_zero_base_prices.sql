-- Fix products with base_price = 0 by setting base_price to the minimum
-- price from their product_sizes. This ensures products display correct
-- prices across the application.

-- Step 1: Update base_price from the lowest product_sizes price
UPDATE products
SET base_price = sub.min_price
FROM (
  SELECT product_id, MIN(price) AS min_price
  FROM product_sizes
  WHERE price > 0
  GROUP BY product_id
) AS sub
WHERE products.id = sub.product_id
  AND products.id IN (
    '07d7cda8-5cfc-4680-9417-f9360464c6c0',
    '2c93d8c5-6310-4e2b-8954-444780a97daa',
    '33c8685a-83b6-4e16-878d-bdf474f19c70',
    '3486fc59-f91a-44d7-b614-6d4ed86ab81b',
    '6344bbff-07b3-403b-bbf8-02e484727726',
    '6b75312f-b954-4934-bc47-689b0471c31e',
    '80a3d4dc-8e88-4ca0-aec1-2b3bcc62a4eb',
    '8ac5db59-e1dc-4a9c-84a6-f051516f5ce9',
    'b88431c1-5e19-4154-bb75-2b8e935e6244',
    '11f3ec36-e716-40aa-b73d-89e1de708bcf',
    '32b0ad8a-efef-42e2-96a8-f44db3e51f59',
    '3c7e021b-e84c-4bee-956a-67308a8ada1f',
    '4fdeb6c1-225c-4963-82f2-dad1300b8152',
    '7f9d8b0d-01cb-4672-9f47-59eeb45d8014',
    '74da5e98-840e-48c3-867f-00d8d7866053',
    'a72871bb-01ae-41d3-b04c-6c99babaac4d',
    '9d7c8079-ddc9-4014-8454-a9310040e042',
    'a074a164-845f-493b-8ef2-578f5a348698',
    'a37935f7-4902-4632-8617-e237801cb135',
    'f63e5f5e-6c85-4c5e-8e85-dfb1ea5ea451',
    'f777b271-adfc-4af8-a387-260065061136'
  );
