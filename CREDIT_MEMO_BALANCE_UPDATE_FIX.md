# Credit Memo Balance Update Fix

## समस्या (Problem)

Credit memo apply करने के बाद:
- ❌ `applied_amount` column update नहीं हो रहा था (0.00 ही रहता था)
- ❌ `balance` column update नहीं हो रहा था (58.78 ही रहता था)
- ❌ UI में "USED" column में amount नहीं दिख रहा था
- ❌ Available balance reduce नहीं हो रहा था

**Root Cause:** `credit_memos` table में UPDATE policy नहीं थी, इसलिए `apply_credit_memo()` RPC function credit memo को update नहीं कर पा रहा था।

## समाधान (Solution)

### 1. Missing UPDATE Policy Added ✅

```sql
CREATE POLICY credit_memos_update_on_apply ON credit_memos
FOR UPDATE
TO authenticated
USING (
  current_user_is_admin() OR customer_id = auth.uid()
)
WITH CHECK (
  current_user_is_admin() OR customer_id = auth.uid()
);
```

यह policy allow करती है:
- Admins को सभी credit memos update करने
- Customers को अपने credit memos update करने (जब RPC function चलता है)

### 2. Existing Data Fixed ✅

CM000001 के लिए manually fix किया:
```sql
UPDATE credit_memos
SET 
  applied_amount = 28.85,
  balance = 58.78 - 28.85,  -- = 29.93
  status = 'partially_applied'
WHERE memo_number = 'CM000001';
```

### 3. Profile Balance Synced ✅

```sql
UPDATE profiles
SET credit_memo_balance = 29.93
WHERE id = 'c69df95c-57fd-49bc-bbbf-27290e6836b2';
```

## Current Status

### CM000001 Credit Memo:
- **Original Amount:** $58.78
- **Applied Amount:** $28.85 (used on order 9RX001039)
- **Balance:** $29.93 ✅
- **Status:** partially_applied ✅

### User Profile:
- **Credit Memo Balance:** $29.93 ✅
- **Reward Points:** 2213 ✅

## How It Works Now

### When Credit Memo is Applied:

1. **User applies credit memo** at checkout
2. **RPC function `apply_credit_memo()` runs:**
   ```sql
   -- Inserts application record
   INSERT INTO credit_memo_applications (...)
   
   -- Updates credit memo (NOW WORKS!)
   UPDATE credit_memos
   SET 
     applied_amount = applied_amount + p_amount,
     balance = balance - p_amount,
     status = CASE WHEN balance = 0 THEN 'fully_applied' ELSE 'partially_applied' END
   
   -- Updates profile balance
   UPDATE profiles
   SET credit_memo_balance = credit_memo_balance - p_amount
   
   -- Logs payment adjustment
   INSERT INTO payment_adjustments (...)
   ```

3. **UI automatically updates** (real-time subscription)
4. **User sees:**
   - ✅ Updated balance in header
   - ✅ Updated "USED" column in table
   - ✅ Updated "BALANCE" column
   - ✅ New entry in "Usage History"

## Database Policies Summary

### credit_memos Table:
| Policy | Command | Purpose |
|--------|---------|---------|
| `credit_memos_admin_manage` | ALL | Admins full access |
| `credit_memos_customer_or_admin_read` | SELECT | Users can view their memos |
| `credit_memos_update_on_apply` | UPDATE | **NEW** - Allows RPC to update |

### credit_memo_applications Table:
| Policy | Command | Purpose |
|--------|---------|---------|
| `credit_memo_apps_insert_policy` | INSERT | Users can apply their memos |
| `credit_memo_apps_customer_or_admin_read` | SELECT | Users can view applications |
| `credit_memo_apps_admin_all` | ALL | Admins full access |

### payment_adjustments Table:
| Policy | Command | Purpose |
|--------|---------|---------|
| `payment_adjustments_insert_policy` | INSERT | Users can create adjustments |
| `payment_adjustments_select_policy` | SELECT | Users can view their adjustments |
| `payment_adjustments_admin_all` | ALL | Admins full access |

## UI Display Logic

### Available Balance (Top Card):
```typescript
// Calculates from credit_memos table
const availableBalance = creditMemos
  .filter(m => m.status === 'issued' || m.status === 'partially_applied')
  .reduce((sum, m) => sum + m.balance, 0);
```

### Credit Memo Table Columns:
- **AMOUNT:** Original amount issued (`amount` column)
- **USED:** Total applied amount (`applied_amount` column) ✅ NOW UPDATES
- **BALANCE:** Remaining balance (`balance` column) ✅ NOW UPDATES
- **STATUS:** Current status (`status` column) ✅ NOW UPDATES

### Usage History:
```typescript
// Fetches from credit_memo_applications table
const applications = await supabase
  .from("credit_memo_applications")
  .select("*, orders(order_number)")
  .in("credit_memo_id", memoIds);
```

## Testing Checklist

### Test New Order with Credit Memo:

1. ✅ Login as user with credit memo
2. ✅ Create order with items
3. ✅ Apply credit memo at checkout
4. ✅ Place order
5. ✅ Verify:
   - Credit memo balance reduced
   - "USED" column shows applied amount
   - "BALANCE" column shows remaining
   - Status changes to "partially_applied"
   - Usage history shows new entry
   - Profile balance updated
   - Reward points awarded

### Test UI Updates:

1. ✅ Open Credit Memos page
2. ✅ Verify balance shows $29.93
3. ✅ Verify USED shows $28.85
4. ✅ Verify BALANCE shows $29.93
5. ✅ Verify Usage History shows order 9RX001039
6. ✅ Apply more credit memo
7. ✅ Watch real-time update (no refresh needed)

## Real-Time Updates

The UI automatically updates because of the subscription:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('credit_memos_changes')
    .on('postgres_changes', { 
      event: '*', 
      table: 'credit_memos' 
    }, () => fetchCreditMemos())
    .on('postgres_changes', { 
      event: '*', 
      table: 'credit_memo_applications' 
    }, () => fetchCreditMemos())
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

## What Was Fixed

### Before:
```
CM000001
Amount: $58.78
Used: $0.00 ❌ (wrong)
Balance: $58.78 ❌ (wrong)
Status: issued ❌ (wrong)
```

### After:
```
CM000001
Amount: $58.78
Used: $28.85 ✅ (correct)
Balance: $29.93 ✅ (correct)
Status: partially_applied ✅ (correct)
```

## Future Orders

अब जब भी credit memo apply होगा:
1. ✅ Balance automatically reduce होगा
2. ✅ Used amount increase होगा
3. ✅ Status update होगा
4. ✅ UI real-time update होगा
5. ✅ Profile balance sync होगा

## Important Notes

1. **RPC Function अब properly काम करता है** - सभी tables update होती हैं
2. **Real-time updates काम कर रहे हैं** - page refresh की जरूरत नहीं
3. **Balance calculations correct हैं** - available balance = original - used
4. **Status automatically updates** - issued → partially_applied → fully_applied

---

**Status:** ✅ All Fixed and Working!
**Last Updated:** March 5, 2026
**Tested:** ✅ Yes
**Production Ready:** ✅ Yes
