# Migration Plan: JSONB Consolidation for Terms, Privacy & ACH
**Goal:** Single source of truth using JSONB columns in `profiles` table  
**Status:** PLANNING PHASE - NO CODE CHANGES YET  
**Date:** February 27, 2026

---

## 🎯 Target Architecture

### Profiles Table - Final State (3 JSONB Columns)

```sql
-- Column 1: Terms of Service
terms_and_conditions JSONB
{
  "accepted": boolean,
  "acceptedAt": "2026-02-27T10:30:00Z",
  "version": "1.0",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "method": "email_link|web_form|admin_override",
  "signature": "John Doe",
  "signatureMethod": "typed_name|drawn|uploaded"
}

-- Column 2: Privacy Policy
privacy_policy JSONB
{
  "accepted": boolean,
  "acceptedAt": "2026-02-27T10:30:00Z",
  "version": "1.0",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "method": "email_link|web_form|admin_override",
  "signature": "John Doe",
  "signatureMethod": "typed_name|drawn|uploaded"
}

-- Column 3: ACH Authorization
ach_authorization JSONB
{
  "accepted": boolean,
  "acceptedAt": "2026-02-27T10:30:00Z",
  "version": "1.0",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "method": "email_link|web_form|admin_override",
  "signature": "John Doe",
  "signatureMethod": "typed_name|drawn|uploaded",
  "bankVerified": boolean,
  "nachaCompliance": boolean
}
```

---

## 📋 Step-by-Step Migration Plan

### PHASE 1: PREPARATION & ANALYSIS (Week 1)
**Goal:** Understand current data and prepare migration scripts

#### Step 1.1: Data Audit
```sql
-- Count records with each type of acceptance
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN terms_and_conditions IS NOT NULL THEN 1 END) as has_terms_jsonb,
  COUNT(CASE WHEN terms_accepted = true THEN 1 END) as has_terms_bool,
  COUNT(CASE WHEN privacy_policy_accepted = true THEN 1 END) as has_privacy,
  COUNT(CASE WHEN ach_authorization_accepted = true THEN 1 END) as has_ach,
  COUNT(CASE WHEN terms_signature IS NOT NULL THEN 1 END) as has_signature
FROM profiles;
```

#### Step 1.2: Identify Data Conflicts
```sql
-- Find users with conflicting data
SELECT id, email,
  terms_and_conditions,
  terms_accepted,
  terms_accepted_at,
  privacy_policy_accepted,
  ach_authorization_accepted
FROM profiles
WHERE 
  (terms_and_conditions IS NOT NULL AND terms_accepted = false)
  OR (terms_and_conditions IS NULL AND terms_accepted = true);
```


#### Step 1.3: Create Backup
```sql
-- Create backup table
CREATE TABLE profiles_backup_20260227 AS 
SELECT * FROM profiles;

-- Verify backup
SELECT COUNT(*) FROM profiles_backup_20260227;
```

---

### PHASE 2: DATABASE SCHEMA CHANGES (Week 1-2)
**Goal:** Add new JSONB columns and migration functions

#### Step 2.1: Add New JSONB Columns
```sql
-- Add privacy_policy JSONB column (terms_and_conditions already exists)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS privacy_policy JSONB,
ADD COLUMN IF NOT EXISTS ach_authorization JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_policy_accepted 
ON profiles ((privacy_policy->>'accepted'));

CREATE INDEX IF NOT EXISTS idx_profiles_ach_authorization_accepted 
ON profiles ((ach_authorization->>'accepted'));

-- Add comments
COMMENT ON COLUMN profiles.privacy_policy IS 'Privacy Policy acceptance data in JSONB format';
COMMENT ON COLUMN profiles.ach_authorization IS 'ACH Authorization acceptance data in JSONB format';
```

#### Step 2.2: Create Migration Helper Function
```sql
CREATE OR REPLACE FUNCTION migrate_terms_to_jsonb()
RETURNS void AS $$
BEGIN
  -- Migrate Terms of Service (if not already in JSONB)
  UPDATE profiles
  SET terms_and_conditions = jsonb_build_object(
    'accepted', COALESCE(terms_accepted, false),
    'acceptedAt', terms_accepted_at,
    'version', COALESCE(terms_version, '1.0'),
    'signature', terms_signature,
    'signatureMethod', CASE WHEN terms_signature IS NOT NULL THEN 'typed_name' ELSE NULL END,
    'method', 'legacy_migration'
  )
  WHERE terms_and_conditions IS NULL 
    AND (terms_accepted = true OR terms_accepted_at IS NOT NULL);

  -- Migrate Privacy Policy
  UPDATE profiles
  SET privacy_policy = jsonb_build_object(
    'accepted', COALESCE(privacy_policy_accepted, false),
    'acceptedAt', privacy_policy_accepted_at,
    'version', '1.0',
    'signature', privacy_policy_signature,
    'signatureMethod', CASE WHEN privacy_policy_signature IS NOT NULL THEN 'typed_name' ELSE NULL END,
    'method', 'legacy_migration'
  )
  WHERE privacy_policy IS NULL 
    AND (privacy_policy_accepted = true OR privacy_policy_accepted_at IS NOT NULL);

  -- Migrate ACH Authorization
  UPDATE profiles
  SET ach_authorization = jsonb_build_object(
    'accepted', COALESCE(ach_authorization_accepted, false),
    'acceptedAt', ach_authorization_accepted_at,
    'version', COALESCE(ach_authorization_version, '1.0'),
    'ipAddress', ach_authorization_ip_address,
    'signature', ach_authorization_signature,
    'signatureMethod', CASE WHEN ach_authorization_signature IS NOT NULL THEN 'typed_name' ELSE NULL END,
    'method', 'legacy_migration'
  )
  WHERE ach_authorization IS NULL 
    AND (ach_authorization_accepted = true OR ach_authorization_accepted_at IS NOT NULL);
END;
$$ LANGUAGE plpgsql;
```

#### Step 2.3: Create Helper Functions for Code
```sql
-- Function to check if terms accepted
CREATE OR REPLACE FUNCTION has_accepted_terms(profile_row profiles)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((profile_row.terms_and_conditions->>'accepted')::boolean, false);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if privacy accepted
CREATE OR REPLACE FUNCTION has_accepted_privacy(profile_row profiles)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((profile_row.privacy_policy->>'accepted')::boolean, false);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if ACH accepted
CREATE OR REPLACE FUNCTION has_accepted_ach(profile_row profiles)
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE((profile_row.ach_authorization->>'accepted')::boolean, false);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

### PHASE 3: DATA MIGRATION (Week 2)
**Goal:** Migrate existing data to JSONB format

#### Step 3.1: Run Migration (Test Environment First!)
```sql
-- Execute migration
SELECT migrate_terms_to_jsonb();

-- Verify migration
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN terms_and_conditions IS NOT NULL THEN 1 END) as migrated_terms,
  COUNT(CASE WHEN privacy_policy IS NOT NULL THEN 1 END) as migrated_privacy,
  COUNT(CASE WHEN ach_authorization IS NOT NULL THEN 1 END) as migrated_ach
FROM profiles;
```

#### Step 3.2: Validate Data Integrity
```sql
-- Check for data loss
SELECT 
  id, email,
  terms_accepted as old_terms,
  (terms_and_conditions->>'accepted')::boolean as new_terms,
  privacy_policy_accepted as old_privacy,
  (privacy_policy->>'accepted')::boolean as new_privacy,
  ach_authorization_accepted as old_ach,
  (ach_authorization->>'accepted')::boolean as new_ach
FROM profiles
WHERE 
  (terms_accepted != COALESCE((terms_and_conditions->>'accepted')::boolean, false))
  OR (privacy_policy_accepted != COALESCE((privacy_policy->>'accepted')::boolean, false))
  OR (ach_authorization_accepted != COALESCE((ach_authorization->>'accepted')::boolean, false));
```

---

### PHASE 4: CODE UPDATES (Week 3-4)
**Goal:** Update all code to use JSONB columns

#### Step 4.1: Identify All Code Locations
**Files to Update:**

**Backend (Node.js):**
1. `server/routes/termsRoutes.js` - Terms acceptance API
2. `server/routes/launchRoutes.js` - Launch flow
3. `server/routes/termsManagementRoutes.js` - Admin management
4. `server/app.js` - User creation endpoint
5. `server/templates/adminCreateAccount.js` - Email templates

**Frontend (React/TypeScript):**
1. `src/pages/AcceptTerms.tsx` - Terms acceptance page
2. `src/pages/LaunchPasswordReset.tsx` - Launch flow
3. `src/components/users/forms/SteppedUserForm.tsx` - Signup
4. `src/components/admin/TermsManagement.tsx` - Admin view
5. `src/components/users/AddUserModal.tsx` - User creation
6. `src/components/users/hooks/services/userProfileService.ts` - Profile service

#### Step 4.2: Create Utility Functions

**Backend Utility (`server/utils/termsHelper.js`):**
```javascript
// Helper to build terms JSONB object
function buildTermsObject(accepted, signature, ipAddress, userAgent, method = 'web_form') {
  return {
    accepted: accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    ipAddress: ipAddress,
    userAgent: userAgent,
    method: method,
    signature: signature,
    signatureMethod: signature ? 'typed_name' : null
  };
}

// Helper to build privacy JSONB object
function buildPrivacyObject(accepted, signature, ipAddress, userAgent, method = 'web_form') {
  return {
    accepted: accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    ipAddress: ipAddress,
    userAgent: userAgent,
    method: method,
    signature: signature,
    signatureMethod: signature ? 'typed_name' : null
  };
}

// Helper to build ACH JSONB object
function buildAchObject(accepted, signature, ipAddress, userAgent, method = 'web_form') {
  return {
    accepted: accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    ipAddress: ipAddress,
    userAgent: userAgent,
    method: method,
    signature: signature,
    signatureMethod: signature ? 'typed_name' : null,
    bankVerified: false,
    nachaCompliance: accepted
  };
}

module.exports = {
  buildTermsObject,
  buildPrivacyObject,
  buildAchObject
};
```

**Frontend Utility (`src/utils/termsHelper.ts`):**
```typescript
export interface TermsData {
  accepted: boolean;
  acceptedAt: string | null;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  method: string;
  signature: string | null;
  signatureMethod: string | null;
}

export interface AchData extends TermsData {
  bankVerified?: boolean;
  nachaCompliance?: boolean;
}

export function buildTermsObject(
  accepted: boolean,
  signature: string | null,
  method: string = 'web_form'
): TermsData {
  return {
    accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    method,
    signature,
    signatureMethod: signature ? 'typed_name' : null
  };
}

export function buildPrivacyObject(
  accepted: boolean,
  signature: string | null,
  method: string = 'web_form'
): TermsData {
  return {
    accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    method,
    signature,
    signatureMethod: signature ? 'typed_name' : null
  };
}

export function buildAchObject(
  accepted: boolean,
  signature: string | null,
  method: string = 'web_form'
): AchData {
  return {
    accepted,
    acceptedAt: accepted ? new Date().toISOString() : null,
    version: '1.0',
    method,
    signature,
    signatureMethod: signature ? 'typed_name' : null,
    bankVerified: false,
    nachaCompliance: accepted
  };
}
```

#### Step 4.3: Update Pattern for Each File

**BEFORE (Old Pattern):**
```javascript
// Old way - multiple columns
await supabase.from('profiles').update({
  terms_accepted: true,
  terms_accepted_at: new Date().toISOString(),
  terms_signature: signature,
  privacy_policy_accepted: true,
  privacy_policy_accepted_at: new Date().toISOString(),
  privacy_policy_signature: signature,
  ach_authorization_accepted: achAccepted,
  ach_authorization_accepted_at: achAccepted ? new Date().toISOString() : null,
  ach_authorization_signature: achSignature
});
```

**AFTER (New Pattern):**
```javascript
// New way - JSONB columns
const { buildTermsObject, buildPrivacyObject, buildAchObject } = require('./utils/termsHelper');

await supabase.from('profiles').update({
  terms_and_conditions: buildTermsObject(true, signature, ipAddress, userAgent, 'email_link'),
  privacy_policy: buildPrivacyObject(true, signature, ipAddress, userAgent, 'email_link'),
  ach_authorization: achAccepted 
    ? buildAchObject(true, achSignature, ipAddress, userAgent, 'email_link')
    : null
});
```

---

### PHASE 5: DUAL-WRITE PERIOD (Week 4-6)
**Goal:** Write to both old and new columns for safety

#### Step 5.1: Implement Dual-Write
```javascript
// Write to BOTH old and new columns during transition
await supabase.from('profiles').update({
  // NEW JSONB columns (primary)
  terms_and_conditions: buildTermsObject(true, signature, ipAddress, userAgent),
  privacy_policy: buildPrivacyObject(true, signature, ipAddress, userAgent),
  ach_authorization: buildAchObject(achAccepted, achSignature, ipAddress, userAgent),
  
  // OLD columns (for backward compatibility - TEMPORARY)
  terms_accepted: true,
  terms_accepted_at: new Date().toISOString(),
  terms_signature: signature,
  privacy_policy_accepted: true,
  privacy_policy_accepted_at: new Date().toISOString(),
  privacy_policy_signature: signature,
  ach_authorization_accepted: achAccepted,
  ach_authorization_accepted_at: achAccepted ? new Date().toISOString() : null,
  ach_authorization_signature: achSignature
});
```

#### Step 5.2: Update Read Logic
```javascript
// Read from JSONB first, fallback to old columns
function getTermsAccepted(profile) {
  if (profile.terms_and_conditions) {
    return profile.terms_and_conditions.accepted;
  }
  // Fallback to old column
  return profile.terms_accepted || false;
}

function getPrivacyAccepted(profile) {
  if (profile.privacy_policy) {
    return profile.privacy_policy.accepted;
  }
  return profile.privacy_policy_accepted || false;
}

function getAchAccepted(profile) {
  if (profile.ach_authorization) {
    return profile.ach_authorization.accepted;
  }
  return profile.ach_authorization_accepted || false;
}
```

---

### PHASE 6: TESTING & VALIDATION (Week 6-7)
**Goal:** Ensure all flows work correctly

#### Step 6.1: Test All Acceptance Flows
- [ ] Admin-created user flow (email link)
- [ ] Launch password reset flow
- [ ] User signup flow
- [ ] Credit application flow
- [ ] Admin manual updates

#### Step 6.2: Test All Read Operations
- [ ] Admin dashboard displays correctly
- [ ] User profile shows acceptance status
- [ ] PDF generation works
- [ ] API responses correct

#### Step 6.3: Performance Testing
```sql
-- Test query performance with JSONB
EXPLAIN ANALYZE
SELECT * FROM profiles
WHERE (terms_and_conditions->>'accepted')::boolean = true
  AND (privacy_policy->>'accepted')::boolean = true;

-- Compare with old columns
EXPLAIN ANALYZE
SELECT * FROM profiles
WHERE terms_accepted = true
  AND privacy_policy_accepted = true;
```

---

### PHASE 7: DEPRECATION (Week 8-10)
**Goal:** Remove old columns and dual-write logic

#### Step 7.1: Stop Dual-Write
- Remove writes to old boolean columns
- Keep only JSONB writes

#### Step 7.2: Update All Queries
- Replace all references to old columns
- Use JSONB columns exclusively

#### Step 7.3: Mark Columns as Deprecated
```sql
-- Add deprecation comments
COMMENT ON COLUMN profiles.terms_accepted IS 'DEPRECATED: Use terms_and_conditions JSONB column instead';
COMMENT ON COLUMN profiles.privacy_policy_accepted IS 'DEPRECATED: Use privacy_policy JSONB column instead';
COMMENT ON COLUMN profiles.ach_authorization_accepted IS 'DEPRECATED: Use ach_authorization JSONB column instead';
```

---

### PHASE 8: CLEANUP (Week 11-12)
**Goal:** Remove old columns completely

#### Step 8.1: Final Data Verification
```sql
-- Ensure no data loss
SELECT COUNT(*) FROM profiles
WHERE (terms_and_conditions IS NULL AND terms_accepted = true)
   OR (privacy_policy IS NULL AND privacy_policy_accepted = true)
   OR (ach_authorization IS NULL AND ach_authorization_accepted = true);
-- Should return 0
```

#### Step 8.2: Drop Old Columns
```sql
-- Drop deprecated columns
ALTER TABLE profiles
DROP COLUMN IF EXISTS terms_accepted,
DROP COLUMN IF EXISTS terms_accepted_at,
DROP COLUMN IF EXISTS terms_version,
DROP COLUMN IF EXISTS terms_signature,
DROP COLUMN IF EXISTS privacy_policy_accepted,
DROP COLUMN IF EXISTS privacy_policy_accepted_at,
DROP COLUMN IF EXISTS privacy_policy_signature,
DROP COLUMN IF EXISTS ach_authorization_accepted,
DROP COLUMN IF EXISTS ach_authorization_accepted_at,
DROP COLUMN IF EXISTS ach_authorization_version,
DROP COLUMN IF EXISTS ach_authorization_ip_address,
DROP COLUMN IF EXISTS ach_authorization_signature;
```

#### Step 8.3: Archive Launch Table
```sql
-- Archive launch_password_resets table
CREATE TABLE launch_password_resets_archive AS
SELECT * FROM launch_password_resets;

-- Drop original table
DROP TABLE launch_password_resets;
```

---

## 📊 File-by-File Update Checklist

### Backend Files (8 files)
- [ ] `server/routes/termsRoutes.js` - Update accept endpoint
- [ ] `server/routes/launchRoutes.js` - Update mark-completed
- [ ] `server/routes/termsManagementRoutes.js` - Update queries
- [ ] `server/app.js` - Update user creation
- [ ] `server/utils/termsHelper.js` - CREATE NEW utility file
- [ ] `server/templates/adminCreateAccount.js` - No changes needed
- [ ] `server/cron/emailCron.js` - Check for terms queries
- [ ] `server/routes/cartRoutes.js` - Check for terms queries

### Frontend Files (6 files)
- [ ] `src/pages/AcceptTerms.tsx` - Update submission
- [ ] `src/pages/LaunchPasswordReset.tsx` - Update submission
- [ ] `src/components/users/forms/SteppedUserForm.tsx` - Update signup
- [ ] `src/components/admin/TermsManagement.tsx` - Update display
- [ ] `src/components/users/AddUserModal.tsx` - Update creation
- [ ] `src/components/users/hooks/services/userProfileService.ts` - Update service
- [ ] `src/utils/termsHelper.ts` - CREATE NEW utility file

### Database Files (3 files)
- [ ] Create migration SQL file
- [ ] Create helper functions SQL file
- [ ] Create rollback SQL file

---

## 🔄 Rollback Plan

### If Issues Found in Phase 5-6:
```sql
-- Rollback: Copy data from old columns back to JSONB
UPDATE profiles
SET 
  terms_and_conditions = NULL,
  privacy_policy = NULL,
  ach_authorization = NULL
WHERE id IN (SELECT id FROM profiles_backup_20260227);

-- Restore from backup if needed
-- (Keep backup table until Phase 8 complete)
```

### If Issues Found in Phase 7-8:
```sql
-- Restore columns from backup
INSERT INTO profiles (id, terms_accepted, privacy_policy_accepted, ...)
SELECT id, terms_accepted, privacy_policy_accepted, ...
FROM profiles_backup_20260227
ON CONFLICT (id) DO UPDATE SET
  terms_accepted = EXCLUDED.terms_accepted,
  privacy_policy_accepted = EXCLUDED.privacy_policy_accepted;
```

---

## ✅ Success Criteria

### Phase Completion Checklist:
- [ ] All existing data migrated to JSONB
- [ ] No data loss verified
- [ ] All 5 acceptance flows working
- [ ] All read operations working
- [ ] Performance acceptable
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Team trained on new structure

### Final Verification:
```sql
-- All users should have JSONB data
SELECT COUNT(*) FROM profiles
WHERE terms_and_conditions IS NULL
  AND privacy_policy IS NULL
  AND ach_authorization IS NULL;
-- Should return only users who never accepted anything

-- Old columns should be gone
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'terms_accepted', 'privacy_policy_accepted', 
    'ach_authorization_accepted'
  );
-- Should return 0 rows
```

---

## 📝 Timeline Summary

| Phase | Duration | Key Activities |
|-------|----------|----------------|
| 1. Preparation | Week 1 | Audit, backup, analysis |
| 2. Schema Changes | Week 1-2 | Add columns, create functions |
| 3. Data Migration | Week 2 | Migrate existing data |
| 4. Code Updates | Week 3-4 | Update all code files |
| 5. Dual-Write | Week 4-6 | Write to both old & new |
| 6. Testing | Week 6-7 | Comprehensive testing |
| 7. Deprecation | Week 8-10 | Stop dual-write |
| 8. Cleanup | Week 11-12 | Remove old columns |

**Total Duration:** 12 weeks (3 months)

---

## 🎯 Next Steps

1. **Review this plan** with team
2. **Get approval** from stakeholders
3. **Set up test environment** for Phase 1
4. **Create backup** of production database
5. **Begin Phase 1** - Data audit

---

**Status:** ✅ PLAN COMPLETE - READY FOR REVIEW  
**No code changes made yet - awaiting approval to proceed**
