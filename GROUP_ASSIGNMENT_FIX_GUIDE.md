# Group Assignment Fix - Deployment Guide

## समस्या (Problem)
Admin group में pharmacy assign नहीं कर पा रहा था क्योंकि RLS (Row Level Security) policy में issue था।

## समाधान (Solution)
Migration file बनाई गई है जो:
1. RLS policies को fix करती है
2. Admin को pharmacy assign करने की permission देती है
3. Helper functions बनाती है safe assignment के लिए

## Deployment Steps

### Step 1: Migration File Run करें
```bash
# Supabase CLI से
supabase db push

# या Direct SQL से (Supabase Dashboard > SQL Editor में)
# File: supabase/migrations/20260206_fix_pharmacy_group_assignment.sql
```

### Step 2: Verification करें
```sql
-- VERIFY_GROUP_ASSIGNMENT.sql file run करें
-- या ये queries run करें:

-- Check policies
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if group_id column exists
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name = 'group_id';
```

### Step 3: Test Assignment

#### Method 1: Direct Update (Admin के रूप में)
```sql
-- Pharmacy को group assign करें
UPDATE profiles
SET group_id = 'group-uuid-here'
WHERE id = 'pharmacy-uuid-here'
AND type = 'pharmacy';
```

#### Method 2: Helper Function Use करें (Recommended)
```sql
-- Safe assignment with validation
SELECT assign_pharmacy_to_group(
    'pharmacy-uuid-here'::UUID,  -- Pharmacy ID
    'group-uuid-here'::UUID       -- Group ID
);
```

#### Method 3: Frontend से (React/TypeScript)
```typescript
// Admin component में
const assignPharmacyToGroup = async (pharmacyId: string, groupId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ group_id: groupId })
    .eq('id', pharmacyId)
    .eq('type', 'pharmacy');
    
  if (error) {
    console.error('Assignment failed:', error);
    return false;
  }
  
  return true;
};

// या helper function use करें
const assignPharmacyToGroupSafe = async (pharmacyId: string, groupId: string) => {
  const { data, error } = await supabase.rpc('assign_pharmacy_to_group', {
    p_pharmacy_id: pharmacyId,
    p_group_id: groupId
  });
  
  if (error) {
    console.error('Assignment failed:', error);
    return false;
  }
  
  return true;
};
```

## क्या Fix हुआ (What Was Fixed)

### 1. RLS Policy Recursion Issue
**पहले:**
```sql
-- Recursive subquery causing issues
CREATE POLICY "Allow profile update" ON profiles
    FOR UPDATE
    USING (
        auth.uid() = id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
```

**अब:**
```sql
-- Separate policies for better control
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
```

### 2. Helper Functions Added
- `assign_pharmacy_to_group()` - Safe assignment with validation
- `get_group_pharmacies()` - Get all pharmacies in a group

### 3. Indexes Added
- `idx_profiles_group_id_type` - Faster group pharmacy lookups
- `idx_profiles_type_status` - Better analytics performance

## Testing Checklist

- [ ] Migration successfully deployed
- [ ] RLS policies visible in database
- [ ] Admin can update pharmacy's group_id
- [ ] Non-admin users cannot update other profiles
- [ ] Helper function works correctly
- [ ] Frontend assignment working
- [ ] Group analytics showing correct data

## Rollback (अगर कुछ गलत हो जाए)

```sql
-- Restore old policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON profiles;

CREATE POLICY "Allow profile update" ON profiles
    FOR UPDATE
    USING (
        auth.uid() = id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
        auth.uid() = id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
```

## Support Queries

### Get all groups
```sql
SELECT id, display_name, email, commission_rate
FROM profiles
WHERE type = 'group'
ORDER BY display_name;
```

### Get unassigned pharmacies
```sql
SELECT id, display_name, email
FROM profiles
WHERE type = 'pharmacy' AND group_id IS NULL
ORDER BY display_name;
```

### Get group's pharmacies
```sql
SELECT * FROM get_group_pharmacies('group-uuid-here'::UUID);
```

### Remove pharmacy from group
```sql
UPDATE profiles
SET group_id = NULL
WHERE id = 'pharmacy-uuid-here';
```

## Notes
- Migration file timestamp: `20260206_fix_pharmacy_group_assignment.sql`
- Safe to run multiple times (idempotent)
- No data loss - only policy changes
- Backward compatible with existing data

