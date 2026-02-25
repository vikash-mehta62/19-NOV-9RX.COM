-- =====================================================
-- Sync Account Transactions to Credit Invoices
-- This script applies payments from account_transactions to credit_invoices
-- =====================================================

DO $$
DECLARE
  payment_record RECORD;
  invoice_record RECORD;
  remaining_amount DECIMAL(12,2);
  amount_to_apply DECIMAL(12,2);
  payment_count INTEGER := 0;
BEGIN
  -- Loop through all credit payments from account_transactions that haven't been applied
  FOR payment_record IN 
    SELECT 
      id,
      customer_id,
      credit_amount,
      transaction_date,
      "transectionId",
      description
    FROM account_transactions
    WHERE customer_id = '8f6cea85-f911-4c33-b4c3-6aa398194817'
      AND transaction_type = 'credit'
      AND reference_type = 'payment'
      AND description NOT LIKE '%Invoice:%'  -- Skip already synced payments
    ORDER BY transaction_date ASC
  LOOP
    remaining_amount := payment_record.credit_amount;
    
    -- Apply this payment to unpaid invoices (oldest first)
    FOR invoice_record IN
      SELECT *
      FROM credit_invoices
      WHERE user_id = payment_record.customer_id
        AND status IN ('pending', 'partial', 'overdue')
        AND balance_due > 0
      ORDER BY invoice_date ASC
    LOOP
      -- Calculate how much to apply to this invoice
      amount_to_apply := LEAST(remaining_amount, invoice_record.balance_due);
      
      IF amount_to_apply > 0 THEN
        -- Insert payment record
        INSERT INTO credit_payments (
          credit_invoice_id,
          user_id,
          amount,
          payment_method,
          transaction_id,
          principal_amount,
          penalty_amount,
          status,
          notes,
          created_at
        ) VALUES (
          invoice_record.id,
          payment_record.customer_id,
          amount_to_apply,
          CASE WHEN payment_record."transectionId" IS NOT NULL THEN 'card' ELSE 'manual' END,
          COALESCE(payment_record."transectionId", 'SYNC-' || payment_record.id),
          amount_to_apply,
          0,
          'completed',
          'Synced from account_transactions: ' || payment_record.description,
          payment_record.transaction_date
        );
        
        -- Update invoice
        UPDATE credit_invoices
        SET 
          paid_amount = paid_amount + amount_to_apply,
          balance_due = balance_due - amount_to_apply,
          status = CASE 
            WHEN balance_due - amount_to_apply <= 0 THEN 'paid'
            WHEN paid_amount + amount_to_apply > 0 THEN 'partial'
            ELSE status
          END,
          paid_date = CASE 
            WHEN balance_due - amount_to_apply <= 0 THEN CURRENT_DATE 
            ELSE paid_date 
          END,
          updated_at = NOW()
        WHERE id = invoice_record.id;
        
        -- Update user's credit line
        UPDATE user_credit_lines
        SET 
          available_credit = available_credit + amount_to_apply,
          used_credit = used_credit - amount_to_apply,
          last_payment_date = payment_record.transaction_date,
          on_time_payments = on_time_payments + 1,
          updated_at = NOW()
        WHERE user_id = payment_record.customer_id;
        
        remaining_amount := remaining_amount - amount_to_apply;
        payment_count := payment_count + 1;
        
        RAISE NOTICE 'Applied $% from transaction % to invoice %', 
          amount_to_apply, payment_record.id, invoice_record.invoice_number;
      END IF;
      
      -- If we've applied all the payment, move to next payment
      EXIT WHEN remaining_amount <= 0;
    END LOOP;
    
    -- Update the account_transactions description to mark it as synced
    UPDATE account_transactions
    SET description = description || ' [SYNCED]'
    WHERE id = payment_record.id;
  END LOOP;
  
  RAISE NOTICE 'Sync complete! Applied % payments to credit invoices', payment_count;
END $$;

-- Verify the results
SELECT 
  'Credit Invoices Summary' as report,
  COUNT(*) as total_invoices,
  SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_invoices,
  SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial_invoices,
  SUM(original_amount) as total_original,
  SUM(paid_amount) as total_paid,
  SUM(balance_due) as total_balance_due
FROM credit_invoices
WHERE user_id = '8f6cea85-f911-4c33-b4c3-6aa398194817';

-- Show updated invoices
SELECT 
  invoice_number,
  original_amount,
  paid_amount,
  balance_due,
  status,
  invoice_date,
  due_date
FROM credit_invoices
WHERE user_id = '8f6cea85-f911-4c33-b4c3-6aa398194817'
ORDER BY invoice_date ASC;
