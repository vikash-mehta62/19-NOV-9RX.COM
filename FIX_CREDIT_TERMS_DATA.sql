-- =====================================================
-- FIX: Insert Default Credit Terms (if missing)
-- =====================================================
-- This fixes the issue where sent_credit_terms references
-- version "1.0" but credit_terms table was empty

-- Insert default credit terms version 1.0 (if not exists)
INSERT INTO credit_terms (version, title, content, effective_date, is_active) 
SELECT '1.0', 'Credit Line Terms and Conditions', 
'## 9RX Credit Line Terms and Conditions

### 1. Credit Line Agreement
By applying for and using a 9RX Credit Line, you agree to these terms and conditions.

### 2. Credit Limit
- Your credit limit is determined based on your business profile and payment history
- Credit limits range from $1,000 to $50,000
- 9RX reserves the right to adjust your credit limit at any time

### 3. Payment Terms
- **Net 30**: Payment due within 30 days of invoice date
- **Net 45**: Payment due within 45 days of invoice date  
- **Net 60**: Payment due within 60 days of invoice date

### 4. Late Payment Penalty
- A **3% monthly penalty** will be applied to any unpaid balance after the due date
- Penalties are calculated on the outstanding balance at the end of each 30-day period
- Example: $1,000 balance overdue = $30 penalty per month

### 5. Payment Allocation
- Payments are first applied to any outstanding penalties
- Remaining payment is applied to the principal balance

### 6. Credit Score Impact
- On-time payments improve your credit score with 9RX
- Late payments will negatively impact your credit score
- Consistent late payments may result in credit line suspension

### 7. Suspension and Termination
- 9RX may suspend your credit line for:
  - Payments more than 60 days overdue
  - Exceeding your credit limit
  - Violation of these terms
- You may close your credit line at any time by paying all outstanding balances

### 8. Dispute Resolution
- Contact our credit department within 30 days to dispute any charges
- Email: info@9rx.com
- Phone: +1 (800) 940-9619

### 9. Changes to Terms
- 9RX may update these terms at any time
- You will be notified of any changes
- Continued use of your credit line constitutes acceptance of updated terms

### 10. Governing Law
- These terms are governed by the laws of the jurisdiction where 9RX operates
- Any disputes will be resolved through binding arbitration

By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by these Credit Line Terms and Conditions.',
CURRENT_DATE,
true
WHERE NOT EXISTS (
  SELECT 1 FROM credit_terms WHERE version = '1.0'
);

-- Verify the fix
SELECT 
  version,
  title,
  is_active,
  effective_date,
  LENGTH(content) as content_length,
  'Terms now available for pharmacy users' as status
FROM credit_terms
WHERE version = '1.0';
