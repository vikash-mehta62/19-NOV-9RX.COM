# Reward Points Troubleshooting Guide

## समस्या: Order करने पर Reward Points नहीं बढ़ रहे

### संभावित कारण और समाधान:

## 1️⃣ Rewards System Disabled है

**Check करें:**
```sql
SELECT program_enabled FROM rewards_config LIMIT 1;
```

**अगर `false` है तो Enable करें:**
```sql
UPDATE rewards_config SET program_enabled = true;
```

---

## 2️⃣ Credit Payment Method से Order किया गया

**समस्या:** Credit payment method से किए गए orders पर points नहीं मिलते।

**Code में देखें:**
```typescript
// src/pages/pharmacy/CreateOrder.tsx (line 512)
if (paymentMethod !== "credit" && insertedOrder.id && finalTotal > 0) {
  // Points awarded only for non-credit orders
}
```

**Solution:** Cash, Card, या अन्य payment method use करें।

---

## 3️⃣ Order Total 0 या Negative है

**Check करें:**
```sql
SELECT order_number, grand_total, payment_method 
FROM orders 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**समस्या:** अगर `grand_total <= 0` है तो points नहीं मिलेंगे।

---

## 4️⃣ Duplicate Points Prevention

**समस्या:** Same order के लिए दोबारा points award नहीं होते (duplicate prevention)।

**Code में:**
```typescript
// src/services/rewardsService.ts (line 103-120)
const { data: existingTransaction } = await supabase
  .from("reward_transactions")
  .select("id")
  .eq("reference_id", orderId)
  .eq("reference_type", "order")
  .eq("transaction_type", "earn")
  .maybeSingle()

if (existingTransaction) {
  console.log(`⚠️ Points already awarded for order ${orderId}, skipping duplicate`)
  return // Skip awarding again
}
```

---

## 5️⃣ Frontend Error - Points Award Function Failed

**Check Browser Console:**
- Order create करते समय browser console में errors देखें
- `❌ Error awarding reward points:` message देखें

**Common Errors:**
- Network error
- Database permission error
- Invalid user ID
- Supabase connection issue

---

## 6️⃣ Database Migration Missing

**Check करें कि ये tables exist करते हैं:**
```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('reward_transactions', 'rewards_config', 'reward_tiers')
AND table_schema = 'public';
```

**अगर tables नहीं हैं तो migration run करें:**
```bash
# Run this migration
supabase/migrations/20241217120000_rewards_system.sql
```

---

## 7️⃣ Profile में reward_points Column Missing

**Check करें:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('reward_points', 'lifetime_reward_points');
```

**अगर columns नहीं हैं:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_points integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lifetime_reward_points integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_tier text DEFAULT 'Bronze';
```

---

## 8️⃣ RLS (Row Level Security) Policy Issue

**Check करें:**
```sql
-- Check if RLS is blocking inserts
SELECT * FROM reward_transactions LIMIT 1;
```

**अगर permission error आए:**
```sql
-- Grant proper permissions
GRANT ALL ON reward_transactions TO authenticated;
GRANT ALL ON reward_transactions TO service_role;
```

---

## 🔍 DIAGNOSTIC STEPS

### Step 1: Run Diagnostic Query
```bash
# Open Supabase SQL Editor and run:
CHECK_REWARD_POINTS_ISSUE.sql
```

### Step 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Create a new order
4. Look for these messages:
   - ✅ `Reward points awarded: X`
   - ❌ `Error awarding reward points:`

### Step 3: Check Database Logs
```sql
-- Check recent reward transactions
SELECT * FROM reward_transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 4: Manual Test
```sql
-- Manually award points to test
INSERT INTO reward_transactions (
    user_id,
    points,
    transaction_type,
    description,
    reference_type
) VALUES (
    'YOUR_USER_ID',
    100,
    'bonus',
    'Test points',
    'manual'
);

-- Update profile
UPDATE profiles 
SET reward_points = reward_points + 100
WHERE id = 'YOUR_USER_ID';
```

---

## 🛠️ QUICK FIX

### अगर पुराने orders के लिए points missing हैं:

1. **Dry Run करें (देखें क्या होगा):**
```bash
# Open Supabase SQL Editor
# Run: FIX_MISSING_REWARD_POINTS.sql (first section only)
```

2. **Actual Fix Run करें:**
```bash
# Uncomment the DO $$ block in FIX_MISSING_REWARD_POINTS.sql
# Then run it
```

---

## 📊 MONITORING

### Real-time Check:
```sql
-- Check if points are being awarded in real-time
SELECT 
    rt.created_at,
    p.email,
    rt.points,
    rt.description,
    o.order_number
FROM reward_transactions rt
LEFT JOIN profiles p ON p.id = rt.user_id
LEFT JOIN orders o ON o.id = rt.reference_id
WHERE rt.created_at > NOW() - INTERVAL '1 hour'
ORDER BY rt.created_at DESC;
```

---

## 🚨 COMMON MISTAKES

1. ❌ Credit payment method use karna
2. ❌ Order cancel karne ke baad points expect karna
3. ❌ Same order ko multiple times submit karna
4. ❌ Rewards system disabled hona
5. ❌ Browser console errors ignore karna

---

## ✅ EXPECTED BEHAVIOR

**Jab order successfully create hota hai:**

1. Order database में save hota hai
2. `awardOrderPoints()` function call hota hai
3. Points calculate होते हैं: `points = floor(orderTotal * points_per_dollar)`
4. Profile में points add होते हैं
5. `reward_transactions` table में entry create hoti hai
6. Console में message आता है: `✅ Reward points awarded: X`
7. User को email notification जाती है (optional)

---

## 📞 SUPPORT

अगर ऊपर के सभी steps try करने के बाद भी issue resolve नहीं हुआ:

1. Browser console का screenshot लें
2. `CHECK_REWARD_POINTS_ISSUE.sql` का output share करें
3. Recent order का order_number और user email share करें
