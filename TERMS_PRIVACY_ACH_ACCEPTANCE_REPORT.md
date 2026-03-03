# Terms, Privacy Policy & ACH Authorization Acceptance - Full Report
**Date:** February 27, 2026  
**Project:** 9RX Pharmacy Platform  
**Database:** qiaetxkxweghuoxyhvml (US West)

---

## Executive Summary

The 9RX platform currently manages user acceptance of Terms & Conditions, Privacy Policy, and ACH Authorization through **MULTIPLE TABLES AND METHODS**, creating complexity and potential inconsistencies. This report identifies all acceptance mechanisms and provides recommendations for consolidation.

---

## 🔍 Current Implementation Overview

### **3 Primary Storage Locations:**
1. **`profiles` table** - Main user acceptance tracking (RECOMMENDED)
2. **`launch_password_resets` table** - Temporary tracking for website launch flow
3. **`terms_acceptance_history` table** - Audit trail for all acceptance events

### **5 Different Acceptance Flows:**
1. Admin-created user flow (via email link)
2. Launch password reset flow (website migration)
3. User signup flow
4. Credit application flow
5. Manual admin updates

---

## 📊 Detailed Analysis

### 1. PROFILES TABLE (Primary Storage)

**Location:** `public.profiles`

#### Terms & Conditions Columns:
```sql
-- JSONB unified storage (RECOMMENDED approach)
terms_and_conditions JSONB
  Structure: {
    "accepted": boolean,
    "acceptedAt": timestamp,
    "version": "1.0",
    "ipAddress": string,
    "userAgent": string,
    "method": string
  }

-- Legacy columns (still in use)
terms_accepted BOOLEAN DEFAULT false
terms_accepted_at TIMESTAMPTZ
terms_version TEXT

-- Digital signature
terms_signature TEXT
```

#### Privacy Policy Columns:
```sql
privacy_policy_accepted BOOLEAN DEFAULT false
privacy_policy_accepted_at TIMESTAMPTZ
privacy_policy_signature TEXT
```

#### ACH Authorization Columns:
```sql
ach_authorization_accepted BOOLEAN DEFAULT false
ach_authorization_accepted_at TIMESTAMPTZ
ach_authorization_version TEXT
ach_authorization_ip_address TEXT
ach_authorization_signature TEXT
```

**Migration:** `20260217_add_ach_authorization.sql`, `20260220_pharmacy_terms_management.sql`

---

### 2. LAUNCH_PASSWORD_RESETS TABLE (Temporary Tracking)

**Location:** `public.launch_password_resets`  
**Purpose:** Track password reset + terms acceptance during website launch migration

```sql
CREATE TABLE launch_password_resets (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) UNIQUE,
  email TEXT NOT NULL,
  reset_token TEXT,
  email_sent_at TIMESTAMPTZ DEFAULT now(),
  password_reset_at TIMESTAMPTZ,      -- When password was reset
  terms_accepted_at TIMESTAMPTZ,      -- When T&C accepted
  completed BOOLEAN DEFAULT false,    -- Both actions done
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Usage:**
- Tracks dual-action flow: password reset + terms acceptance
- Used by `/api/launch/*` endpoints
- Data eventually synced to `profiles` table
- Should be considered TEMPORARY for migration period

---

### 3. TERMS_ACCEPTANCE_HISTORY TABLE (Audit Trail)

**Location:** `public.terms_acceptance_history`  
**Purpose:** Complete audit trail of ALL terms acceptance events

```sql
CREATE TABLE terms_acceptance_history (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  terms_type VARCHAR CHECK (terms_type IN (
    'terms_of_service',
    'privacy_policy', 
    'ach_authorization',
    'user_agreement',
    'data_processing',
    'marketing_consent'
  )),
  terms_version VARCHAR NOT NULL,
  accepted_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  acceptance_method VARCHAR DEFAULT 'web_form' CHECK (acceptance_method IN (
    'web_form',
    'email_link',
    'admin_override',
    'api'
  )),
  document_url TEXT,
  document_hash VARCHAR,
  digital_signature TEXT,
  signature_method VARCHAR DEFAULT 'typed_name',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Features:**
- Immutable audit log
- Supports multiple terms types
- Tracks acceptance method and digital signatures
- Legal compliance ready

---

## 🔄 Acceptance Flows

### Flow 1: Admin-Created User (Email Link)

**Endpoint:** `/api/terms/generate-token` → `/api/terms/accept`  
**Page:** `src/pages/AcceptTerms.tsx`

**Process:**
1. Admin creates user account
2. System generates Supabase recovery link → `/accept-terms`
3. User clicks link, gets authenticated session
4. User reviews and accepts:
   - ✅ Terms of Service (REQUIRED + signature)
   - ✅ Privacy Policy (REQUIRED + signature)
   - ⚠️ ACH Authorization (OPTIONAL + signature)
5. Backend updates `profiles` table
6. Backend records in `terms_acceptance_history` via RPC

**Code:**
```typescript
// AcceptTerms.tsx - User must provide digital signatures
const handleSubmit = async () => {
  await axios.post("/api/terms/accept", {
    termsAccepted: true,
    privacyAccepted: true,
    achAccepted: achAccepted,
    termsSignature: termsSignature.trim(),
    privacySignature: privacySignature.trim(),
    achSignature: achAccepted ? achSignature.trim() : null,
  });
};
```

```javascript
// termsRoutes.js - Backend processing
router.post("/accept", async (req, res) => {
  // Update profiles table
  await supabaseAdmin.from("profiles").update({
    terms_and_conditions: termsData,
    terms_signature: termsSignature,
    privacy_policy_accepted: true,
    privacy_policy_accepted_at: acceptanceTimestamp,
    privacy_policy_signature: privacySignature,
    ach_authorization_accepted: achAccepted,
    ach_authorization_accepted_at: achAccepted ? acceptanceTimestamp : null,
    ach_authorization_signature: achSignature,
  });

  // Record in audit trail
  await supabaseAdmin.rpc('record_terms_acceptance', {
    p_profile_id: user.id,
    p_terms_type: 'terms_of_service',
    p_digital_signature: termsSignature,
  });
});
```

---

### Flow 2: Launch Password Reset (Website Migration)

**Endpoint:** `/api/launch/mark-completed`  
**Page:** `src/pages/LaunchPasswordReset.tsx`

**Process:**
1. User receives launch email with recovery link
2. Step 1: Review & accept Terms + ACH (BOTH REQUIRED)
3. Step 2: Reset password
4. Backend updates BOTH tables:
   - `profiles` - permanent storage
   - `launch_password_resets` - tracking table
5. User redirected to login

**Code:**
```typescript
// LaunchPasswordReset.tsx - Two-step process
const onSubmit = async (data) => {
  // Update password
  await supabase.auth.updateUser({ password: data.password });

  // Update profiles with ALL acceptances
  await supabase.from("profiles").update({
    terms_and_conditions: termsData,
    privacy_policy_accepted: true,
    privacy_policy_accepted_at: now,
    ach_authorization_accepted: achAuthorizationAccepted,
    ach_authorization_accepted_at: achAuthorizationAccepted ? now : null,
    requires_password_reset: false,
  });

  // Track in launch table
  await fetch('/api/launch/mark-completed', {
    body: JSON.stringify({ email, action: 'both' })
  });
};
```

**Key Difference:** ACH is REQUIRED in launch flow, OPTIONAL in admin-created flow

---

### Flow 3: User Signup (Standard Registration)

**Location:** `src/components/users/forms/SteppedUserForm.tsx`

**Process:**
1. User fills registration form
2. Terms acceptance auto-set during profile creation
3. Privacy policy auto-accepted
4. ACH optional via checkbox

**Code:**
```typescript
// SteppedUserForm.tsx
const profileData = {
  ...values,
  privacy_policy_accepted: true,
  privacy_policy_accepted_at: new Date().toISOString(),
  ach_authorization_accepted: values.achAuthorizationAccepted || false,
};
```

**Issue:** No digital signatures collected during signup!

---

### Flow 4: Credit Application

**Location:** `public.credit_applications` table

**Columns:**
```sql
terms_accepted BOOLEAN DEFAULT false
terms_accepted_at TIMESTAMPTZ
terms_version VARCHAR DEFAULT '1.0'
ip_address VARCHAR
signature TEXT
signed_name VARCHAR
signed_title VARCHAR
signed_date TIMESTAMPTZ
```

**Separate tracking** for credit-specific terms acceptance

---

### Flow 5: Admin Manual Updates

**Location:** `src/components/admin/TermsManagement.tsx`

**Features:**
- View all users' acceptance status
- Generate PDF reports
- Track signatures
- View acceptance history

---

## ⚠️ Issues & Inconsistencies

### 1. **Duplicate Storage**
- Terms stored in BOTH `terms_and_conditions` (JSONB) AND `terms_accepted` (boolean)
- Privacy stored in multiple boolean columns
- ACH stored in multiple columns

### 2. **Inconsistent Signature Requirements**
- Admin-created flow: Signatures REQUIRED
- Launch flow: No signatures collected
- Signup flow: No signatures collected
- Credit application: Signatures collected

### 3. **Multiple Sources of Truth**
- `profiles` table = permanent
- `launch_password_resets` = temporary
- `terms_acceptance_history` = audit
- `credit_applications` = separate

### 4. **ACH Acceptance Confusion**
- REQUIRED in launch flow
- OPTIONAL in admin-created flow
- Optional in signup
- Separate in credit applications

### 5. **No Unified Audit Trail**
- Some flows record to `terms_acceptance_history`
- Some flows only update `profiles`
- Launch flow updates both `profiles` and `launch_password_resets`

---

## 📋 All Database Columns Summary

### PROFILES Table (Main Storage)
```
✅ terms_and_conditions (JSONB) - RECOMMENDED
✅ terms_accepted (BOOLEAN)
✅ terms_accepted_at (TIMESTAMPTZ)
✅ terms_version (TEXT)
✅ terms_signature (TEXT)

✅ privacy_policy_accepted (BOOLEAN)
✅ privacy_policy_accepted_at (TIMESTAMPTZ)
✅ privacy_policy_signature (TEXT)

✅ ach_authorization_accepted (BOOLEAN)
✅ ach_authorization_accepted_at (TIMESTAMPTZ)
✅ ach_authorization_version (TEXT)
✅ ach_authorization_ip_address (TEXT)
✅ ach_authorization_signature (TEXT)
```

### LAUNCH_PASSWORD_RESETS Table (Temporary)
```
✅ password_reset_at (TIMESTAMPTZ)
✅ terms_accepted_at (TIMESTAMPTZ)
✅ completed (BOOLEAN)
```

### TERMS_ACCEPTANCE_HISTORY Table (Audit)
```
✅ terms_type (VARCHAR) - Enum of all types
✅ terms_version (VARCHAR)
✅ accepted_at (TIMESTAMPTZ)
✅ ip_address (INET)
✅ user_agent (TEXT)
✅ acceptance_method (VARCHAR)
✅ digital_signature (TEXT)
✅ signature_method (VARCHAR)
```

### CREDIT_APPLICATIONS Table (Separate)
```
✅ terms_accepted (BOOLEAN)
✅ terms_accepted_at (TIMESTAMPTZ)
✅ signature (TEXT)
```

### ACH_AUTHORIZATION_DETAILS Table (Detailed ACH)
```
✅ terms_accepted (BOOLEAN)
✅ privacy_policy_accepted (BOOLEAN)
✅ ach_authorization_accepted (BOOLEAN)
✅ electronic_signature_consent (BOOLEAN)
✅ nacha_compliance_acknowledged (BOOLEAN)
✅ bank_account_verified (BOOLEAN)
```

---

## 🎯 Recommendations

### 1. **Consolidate to Single Source of Truth**
**Use `profiles` table as primary storage:**
- Keep `terms_and_conditions` JSONB column (most flexible)
- Keep signature columns
- Deprecate duplicate boolean columns over time

### 2. **Standardize Signature Collection**
**Require digital signatures in ALL flows:**
- Signup flow
- Launch flow
- Admin-created flow
- Credit applications

### 3. **Always Record to Audit Trail**
**Every acceptance should call:**
```javascript
await supabaseAdmin.rpc('record_terms_acceptance', {
  p_profile_id: userId,
  p_terms_type: 'terms_of_service',
  p_digital_signature: signature,
  p_signature_method: 'typed_name'
});
```

### 4. **Clarify ACH Requirements**
**Document business rules:**
- When is ACH REQUIRED vs OPTIONAL?
- Should it be tied to payment method selection?
- Should it be separate from general terms?

### 5. **Retire Launch Table**
**After migration period:**
- Archive `launch_password_resets` data
- Remove table
- Use only `profiles` + `terms_acceptance_history`

### 6. **Create Unified API**
**Single endpoint for all acceptance:**
```javascript
POST /api/terms/accept-all
{
  "termsAccepted": true,
  "privacyAccepted": true,
  "achAccepted": boolean,
  "signatures": {
    "terms": "John Doe",
    "privacy": "John Doe",
    "ach": "John Doe"
  },
  "context": "signup|launch|admin_created|credit_app"
}
```

---

## 📝 Migration Path

### Phase 1: Audit (Current)
- ✅ Document all flows (this report)
- ✅ Identify inconsistencies

### Phase 2: Standardize (Next)
1. Add signature collection to ALL flows
2. Ensure all flows record to audit trail
3. Create unified acceptance API

### Phase 3: Consolidate (Future)
1. Migrate all data to `profiles` JSONB format
2. Deprecate duplicate columns
3. Archive `launch_password_resets` table

### Phase 4: Cleanup (Final)
1. Remove deprecated columns
2. Update all queries to use JSONB
3. Document final architecture

---

## 🔐 Legal & Compliance Notes

### Current Strengths:
✅ Digital signatures collected (some flows)  
✅ IP address tracking  
✅ User agent tracking  
✅ Version tracking  
✅ Timestamp tracking  
✅ Audit trail table exists  

### Gaps:
⚠️ Inconsistent signature collection  
⚠️ Not all flows record to audit trail  
⚠️ Multiple sources of truth  
⚠️ ACH requirements unclear  

### Recommendations:
1. **Always collect digital signatures**
2. **Always record to audit trail**
3. **Store document hash/version**
4. **Implement document versioning system**
5. **Add re-acceptance flow for updated terms**

---

## 📊 Statistics (Current Database)

```sql
-- Check acceptance rates
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN terms_and_conditions->>'accepted' = 'true' THEN 1 END) as terms_accepted,
  COUNT(CASE WHEN privacy_policy_accepted = true THEN 1 END) as privacy_accepted,
  COUNT(CASE WHEN ach_authorization_accepted = true THEN 1 END) as ach_accepted,
  COUNT(CASE WHEN terms_signature IS NOT NULL THEN 1 END) as has_terms_signature,
  COUNT(CASE WHEN privacy_policy_signature IS NOT NULL THEN 1 END) as has_privacy_signature,
  COUNT(CASE WHEN ach_authorization_signature IS NOT NULL THEN 1 END) as has_ach_signature
FROM profiles;
```

---

## 🔗 Related Files

### Frontend:
- `src/pages/AcceptTerms.tsx` - Admin-created user flow
- `src/pages/LaunchPasswordReset.tsx` - Launch migration flow
- `src/components/users/forms/SteppedUserForm.tsx` - Signup flow
- `src/components/admin/TermsManagement.tsx` - Admin management

### Backend:
- `server/routes/termsRoutes.js` - Terms acceptance API
- `server/routes/launchRoutes.js` - Launch tracking API
- `server/routes/termsManagementRoutes.js` - Admin management API

### Database:
- `supabase/migrations/20260217_add_ach_authorization.sql`
- `supabase/migrations/20260220_pharmacy_terms_management.sql`
- `ADD_TERMS_COLUMNS_TO_PROFILES.sql`

---

## ✅ Conclusion

The 9RX platform has **multiple overlapping systems** for managing terms acceptance:

1. **3 tables** storing acceptance data
2. **5 different flows** with inconsistent requirements
3. **Duplicate columns** in profiles table
4. **Inconsistent signature collection**
5. **Partial audit trail implementation**

**Primary Recommendation:** Consolidate to `profiles` table (JSONB format) + `terms_acceptance_history` (audit trail), standardize signature collection across all flows, and retire temporary tracking tables.

---

**Report Generated:** February 27, 2026  
**Database:** qiaetxkxweghuoxyhvml.supabase.co  
**Status:** ✅ Complete - No code changes made
