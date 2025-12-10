# Group Management - Database Migration Guide (Hindi)

## Migration File Location
`supabase/migrations/20241210_group_management_phase1.sql`

---

## Kya Changes Hain?

### 1. Profiles Table Mein Naye Columns

| Column | Type | Description (Hindi) |
|--------|------|---------------------|
| `commission_rate` | DECIMAL(5,2) | Group ka commission percentage (0-100%) |
| `total_commission` | DECIMAL(12,2) | Total commission earned by group |
| `bypass_min_price` | BOOLEAN | Agar true, group minimum price se neeche bhi price set kar sakta hai |
| `can_manage_pricing` | BOOLEAN | Agar true, group apni pricing khud manage kar sakta hai |
| `auto_commission` | BOOLEAN | Agar true, commission automatically calculate hoga |

### 2. Naya Table: `pharmacy_invitations`

Group pharmacy ko invite kar sakta hai:
- `email` - Pharmacy ka email
- `pharmacy_name` - Pharmacy ka naam
- `token` - Unique invitation link
- `status` - pending/accepted/expired/cancelled
- `expires_at` - Invitation expire date

### 3. Naya Table: `group_commission_history`

Har order pe commission track karta hai:
- `group_id` - Kis group ka commission
- `pharmacy_id` - Kis pharmacy ka order
- `order_id` - Order reference
- `commission_amount` - Kitna commission mila
- `status` - pending/paid/cancelled

### 4. Orders Table Mein Naye Columns

| Column | Description |
|--------|-------------|
| `group_id` | Order kis group ka hai (fast query ke liye) |
| `commission_amount` | Is order pe kitna commission |

### 5. View: `group_analytics`

Ek view jo group ka summary dikhata hai:
- Total pharmacies
- Active pharmacies
- Total orders
- Total revenue
- Total commission
- This month orders/revenue

### 6. Auto Commission Trigger

Jab bhi naya order aata hai:
1. Check karta hai pharmacy kis group mein hai
2. Agar `auto_commission = true` hai, commission calculate karta hai
3. `group_commission_history` mein record add karta hai
4. Group ka `total_commission` update karta hai

---

## Supabase Dashboard Mein Kaise Run Karein?

### Step 1: SQL Editor Open Karein
1. Supabase Dashboard pe jaayein
2. Left sidebar mein "SQL Editor" click karein

### Step 2: Migration Copy Karein
1. File `supabase/migrations/20241210_group_management_phase1.sql` open karein
2. Poora content copy karein

### Step 3: Run Karein
1. SQL Editor mein paste karein
2. "Run" button click karein
3. Success message aana chahiye

---

## Important Notes

⚠️ **Backup Pehle Lein!**
Migration run karne se pehle database backup lein.

⚠️ **One Time Only**
Ye migration sirf ek baar run karni hai. `IF NOT EXISTS` use kiya hai toh dobara run karne pe error nahi aayega.

⚠️ **RLS Policies**
Row Level Security policies add ki hain - groups sirf apna data dekh sakte hain.

---

## Testing Ke Liye Queries

```sql
-- Check new columns in profiles
SELECT id, display_name, type, commission_rate, bypass_min_price, can_manage_pricing 
FROM profiles WHERE type = 'group' LIMIT 5;

-- Check group analytics view
SELECT * FROM group_analytics;

-- Check if pharmacy_invitations table exists
SELECT * FROM pharmacy_invitations LIMIT 1;

-- Check if group_commission_history table exists
SELECT * FROM group_commission_history LIMIT 1;
```

---

## Next Steps (Phase 2)

Migration run karne ke baad:
1. GroupStats.tsx update karenge - real data show karega
2. Group Dashboard redesign karenge
3. Admin panel mein commission settings add karenge
