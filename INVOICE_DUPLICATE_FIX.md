# Invoice Number Duplicate Fix

## Problem (समस्या)

Invoice creation में duplicate key error आ रहा था:
```
duplicate key value violates unique constraint "invoices_invoice_number_key"
```

## Root Cause (मूल कारण)

Multiple files में invoice number generation के लिए **race condition** था:

1. Code पहले `centerize_data` table से current `invoice_no` read करता था
2. फिर locally increment करता था (+1)
3. फिर database में update करता था
4. फिर invoice create करता था

**समस्या:** जब 2 orders simultaneously create होते थे:
- Request 1: Reads `invoice_no = 100`
- Request 2: Reads `invoice_no = 100` (Request 1 के update से पहले)
- Request 1: Updates to 101, creates `INV-2026000101`
- Request 2: Updates to 101, creates `INV-2026000101` ❌ **DUPLICATE!**

## Solution (समाधान)

Database में पहले से `generate_invoice_number()` RPC function था जो **atomic operation** use करता है:
- `FOR UPDATE` lock लगाता है
- Race condition prevent करता है
- Guaranteed unique invoice numbers देता है

### Fixed Files:

1. ✅ `src/pages/pharmacy/CreateOrder.tsx` - Manual logic को RPC call से replace किया
2. ✅ `src/pages/admin/CreateOrder.tsx` - Manual logic को RPC call से replace किया
3. ✅ `src/pages/group/Order.tsx` - Manual logic को RPC call से replace किया
4. ✅ `src/components/orders/table/OrdersList.tsx` - Manual logic को RPC call से replace किया
5. ✅ `src/pages/pharmacy/Order.tsx` - Already using RPC (no change needed)
6. ✅ `src/components/PaymentModal.tsx` - Already using RPC (no change needed)

## Changes Made

### Before (पहले):
```typescript
// ❌ Race condition - NOT thread-safe
const { data: inData } = await supabase
  .from("centerize_data")
  .select("id, invoice_no, invoice_start")
  .limit(1);

const newInvNo = (inData?.[0]?.invoice_no || 0) + 1;

await supabase
  .from("centerize_data")
  .update({ invoice_no: newInvNo })
  .eq("id", inData[0].id);

const invoiceNumber = `${invoiceStart}-${year}${newInvNo.toString().padStart(6, "0")}`;
```

### After (अब):
```typescript
// ✅ Atomic operation - Thread-safe
const { data: invoiceNumber, error: invoiceGenError } = await supabase.rpc('generate_invoice_number');

if (invoiceGenError || !invoiceNumber) {
  throw new Error(invoiceGenError?.message || 'Failed to generate invoice number');
}
```

## Testing (टेस्टिंग)

अब आप multiple orders simultaneously create कर सकते हैं बिना duplicate invoice number error के।

### Test करने के लिए:
1. Multiple browser tabs में order create करें
2. या rapid succession में orders place करें
3. Verify करें कि सभी invoices unique numbers के साथ create हो रहे हैं

## Technical Details

The `generate_invoice_number()` function uses PostgreSQL's `FOR UPDATE` lock:
```sql
SELECT * FROM centerize_data
ORDER BY id DESC
LIMIT 1
FOR UPDATE;  -- This locks the row until transaction completes
```

यह guarantee करता है कि एक time पर सिर्फ एक transaction invoice number generate कर सकता है।
