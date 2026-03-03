# Workflow Impact Analysis: JSONB Migration
**Visual Guide to Code Changes Across All Files**  
**Date:** February 27, 2026  
**Status:** PLANNING - NO CHANGES MADE YET

---

## 🎯 Overview

This document shows exactly how the JSONB migration will affect each file and workflow in the system.

**Change Summary:**
- **14 Files** will be modified
- **5 Workflows** will be updated
- **3 New Utility Files** will be created
- **1 Database Migration** will be executed

---

## 📊 Visual Workflow Diagrams

### WORKFLOW 1: Admin Creates User → User Accepts Terms

```
┌─────────────────────────────────────────────────────────────────┐
│ BEFORE MIGRATION (Current State)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Admin Dashboard                                                │
│  └─> AddUserModal.tsx                                          │
│       └─> POST /api/users/create                               │
│            └─> app.js (line 1264)                              │
│                 └─> INSERT profiles                            │
│                      ├─> terms_accepted: false                 │
│                      ├─> privacy_policy_accepted: false        │
│                      └─> ach_authorization_accepted: false     │
│                                                                 │
│  Email Sent with Link                                          │
│  └─> User clicks link                                          │
│       └─> AcceptTerms.tsx                                      │
│            └─> POST /api/terms/accept                          │
│                 └─> termsRoutes.js (line 138)                  │
│                      └─> UPDATE profiles                       │
│                           ├─> terms_and_conditions: JSONB ✓    │
│                           ├─> terms_signature: "John Doe"      │
│                           ├─> privacy_policy_accepted: true    │
│                           ├─> privacy_policy_signature: "..."  │
│                           ├─> ach_authorization_accepted: bool │
│                           └─> ach_authorization_signature: "..." │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AFTER MIGRATION (Target State)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Admin Dashboard                                                │
│  └─> AddUserModal.tsx ⚡ CHANGED                               │
│       └─> POST /api/users/create                               │
│            └─> app.js (line 1264) ⚡ CHANGED                   │
│                 └─> INSERT profiles                            │
│                      ├─> terms_and_conditions: JSONB ✓         │
│                      ├─> privacy_policy: JSONB ✓               │
│                      └─> ach_authorization: JSONB ✓            │
│                                                                 │
│  Email Sent with Link                                          │
│  └─> User clicks link                                          │
│       └─> AcceptTerms.tsx ⚡ CHANGED                           │
│            └─> POST /api/terms/accept                          │
│                 └─> termsRoutes.js ⚡ CHANGED                  │
│                      └─> UPDATE profiles                       │
│                           ├─> terms_and_conditions: JSONB ✓    │
│                           ├─> privacy_policy: JSONB ✓          │
│                           └─> ach_authorization: JSONB ✓       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### WORKFLOW 2: Launch Password Reset Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ BEFORE MIGRATION                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Launch Email Sent                                              │
│  └─> User clicks link                                          │
│       └─> LaunchPasswordReset.tsx                              │
│            ├─> Step 1: Accept Terms + ACH                      │
│            │    └─> State: termsAccepted, achAccepted          │
│            │                                                    │
│            └─> Step 2: Reset Password                          │
│                 └─> supabase.auth.updateUser()                 │
│                 └─> supabase.from('profiles').update()         │
│                      ├─> terms_and_conditions: JSONB ✓         │
│                      ├─> privacy_policy_accepted: true         │
│                      ├─> privacy_policy_accepted_at: now       │
│                      ├─> ach_authorization_accepted: bool      │
│                      └─> ach_authorization_accepted_at: now    │
│                                                                 │
│                 └─> POST /api/launch/mark-completed            │
│                      └─> launchRoutes.js (line 250)            │
│                           └─> UPDATE launch_password_resets    │
│                                ├─> password_reset_at: now      │
│                                ├─> terms_accepted_at: now      │
│                                └─> completed: true             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AFTER MIGRATION                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Launch Email Sent                                              │
│  └─> User clicks link                                          │
│       └─> LaunchPasswordReset.tsx ⚡ CHANGED                   │
│            ├─> Step 1: Accept Terms + ACH                      │
│            │    └─> State: termsAccepted, achAccepted          │
│            │                                                    │
│            └─> Step 2: Reset Password                          │
│                 └─> supabase.auth.updateUser()                 │
│                 └─> supabase.from('profiles').update()         │
│                      ├─> terms_and_conditions: JSONB ✓         │
│                      ├─> privacy_policy: JSONB ✓               │
│                      └─> ach_authorization: JSONB ✓            │
│                                                                 │
│                 └─> POST /api/launch/mark-completed            │
│                      └─> launchRoutes.js ⚡ CHANGED            │
│                           └─> UPDATE launch_password_resets    │
│                                (No changes - still tracks)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---


### WORKFLOW 3: User Signup Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ BEFORE MIGRATION                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Registration Page                                         │
│  └─> SteppedUserForm.tsx                                       │
│       └─> userProfileService.ts                                │
│            └─> createUserProfile()                             │
│                 └─> supabase.from('profiles').insert()         │
│                      ├─> privacy_policy_accepted: true         │
│                      ├─> privacy_policy_accepted_at: now       │
│                      └─> ach_authorization_accepted: bool      │
│                                                                 │
│  ℹ️ NOTE: No signatures during signup (by design)              │
│  ℹ️ NOTE: Auto-accept terms during registration                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AFTER MIGRATION                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Registration Page                                         │
│  └─> SteppedUserForm.tsx ⚡ CHANGED                            │
│       └─> userProfileService.ts ⚡ CHANGED                     │
│            └─> createUserProfile()                             │
│                 └─> supabase.from('profiles').insert()         │
│                      ├─> terms_and_conditions: JSONB ✓         │
│                      │    (auto-accepted, no signature)        │
│                      └─> privacy_policy: JSONB ✓               │
│                           (auto-accepted, no signature)        │
│                                                                 │
│  ℹ️ NOTE: No signature fields added (kept simple)              │
│  ℹ️ NOTE: No ACH during signup (not needed)                    │
│  ✅ CHANGE: Only convert to JSONB format                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### WORKFLOW 4: Admin Views Terms Status

```
┌─────────────────────────────────────────────────────────────────┐
│ BEFORE MIGRATION                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Admin Dashboard                                                │
│  └─> TermsManagement.tsx                                       │
│       └─> GET /api/terms-management/users-terms-status         │
│            └─> termsManagementRoutes.js (line 93)              │
│                 └─> SELECT from profiles                       │
│                      ├─> terms_and_conditions (JSONB)          │
│                      ├─> terms_signature                       │
│                      ├─> privacy_policy_accepted (boolean)     │
│                      ├─> privacy_policy_signature              │
│                      ├─> ach_authorization_accepted (boolean)  │
│                      └─> ach_authorization_signature           │
│                                                                 │
│  Display Logic:                                                 │
│  ├─> Check terms_and_conditions?.accepted                      │
│  ├─> Check privacy_policy_accepted                             │
│  └─> Check ach_authorization_accepted                          │
│                                                                 │
│  ⚠️ ISSUE: Mixed data sources (JSONB + boolean)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AFTER MIGRATION                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Admin Dashboard                                                │
│  └─> TermsManagement.tsx ⚡ CHANGED                            │
│       └─> GET /api/terms-management/users-terms-status         │
│            └─> termsManagementRoutes.js ⚡ CHANGED             │
│                 └─> SELECT from profiles                       │
│                      ├─> terms_and_conditions (JSONB) ✓        │
│                      ├─> privacy_policy (JSONB) ✓              │
│                      └─> ach_authorization (JSONB) ✓           │
│                                                                 │
│  Display Logic:                                                 │
│  ├─> Check terms_and_conditions?.accepted                      │
│  ├─> Check privacy_policy?.accepted                            │
│  └─> Check ach_authorization?.accepted                         │
│                                                                 │
│  ✅ FIXED: Consistent JSONB data source                        │
│  ✅ BONUS: Access to full metadata (IP, timestamp, etc.)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### WORKFLOW 5: PDF Generation

```
┌─────────────────────────────────────────────────────────────────┐
│ BEFORE MIGRATION                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Admin Requests PDF                                             │
│  └─> TermsManagement.tsx                                       │
│       └─> GET /api/terms-management/generate-pdf/:id           │
│            └─> termsManagementRoutes.js (line 336)             │
│                 └─> Read profile data                          │
│                      ├─> termsAccepted = terms_and_conditions?.accepted │
│                      ├─> privacyAccepted = privacy_policy_accepted │
│                      └─> achAccepted = ach_authorization_accepted │
│                                                                 │
│                 └─> Generate PDF with PDFKit                   │
│                      ├─> Show "ACCEPTED" or "NOT ACCEPTED"     │
│                      ├─> Show acceptance date                  │
│                      └─> Show signature if available           │
│                                                                 │
│  ⚠️ ISSUE: Inconsistent data access                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AFTER MIGRATION                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Admin Requests PDF                                             │
│  └─> TermsManagement.tsx                                       │
│       └─> GET /api/terms-management/generate-pdf/:id           │
│            └─> termsManagementRoutes.js ⚡ CHANGED             │
│                 └─> Read profile data                          │
│                      ├─> termsAccepted = terms_and_conditions?.accepted │
│                      ├─> privacyAccepted = privacy_policy?.accepted │
│                      └─> achAccepted = ach_authorization?.accepted │
│                                                                 │
│                 └─> Generate PDF with PDFKit                   │
│                      ├─> Show "ACCEPTED" or "NOT ACCEPTED"     │
│                      ├─> Show acceptance date from JSONB       │
│                      ├─> Show signature from JSONB             │
│                      ├─> Show IP address (NEW!)                │
│                      ├─> Show acceptance method (NEW!)         │
│                      └─> Show version (NEW!)                   │
│                                                                 │
│  ✅ FIXED: Consistent JSONB access                             │
│  ✅ BONUS: More metadata in PDF                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 File-by-File Impact Analysis

### 🔴 HIGH IMPACT FILES (Major Changes Required)

#### 1. `server/routes/termsRoutes.js`
**Lines Affected:** 138-230  
**Current Code:**
```javascript
// Line 138-230: POST /api/terms/accept
const updateData = {
  terms_and_conditions: termsData,
  terms_signature: termsSignature,
  privacy_policy_accepted: true,
  privacy_policy_accepted_at: acceptanceTimestamp,
  privacy_policy_signature: privacySignature,
  ach_authorization_accepted: achAccepted,
  ach_authorization_accepted_at: achAccepted ? acceptanceTimestamp : null,
  ach_authorization_signature: achSignature,
};
```

**New Code:**
```javascript
// Import helper
const { buildTermsObject, buildPrivacyObject, buildAchObject } = require('../utils/termsHelper');

// Line 138-230: POST /api/terms/accept
const updateData = {
  terms_and_conditions: buildTermsObject(
    true, termsSignature, userIP, userAgent, 'email_link'
  ),
  privacy_policy: buildPrivacyObject(
    true, privacySignature, userIP, userAgent, 'email_link'
  ),
  ach_authorization: achAccepted 
    ? buildAchObject(true, achSignature, userIP, userAgent, 'email_link')
    : null
};
```

**Impact:** 🔴 HIGH - Core acceptance logic  
**Testing Required:** ✅ All acceptance flows  
**Rollback Risk:** Medium (dual-write protects)

---

#### 2. `src/pages/AcceptTerms.tsx`
**Lines Affected:** 140-160  
**Current Code:**
```typescript
// Line 140-160: handleSubmit
const response = await axios.post("/api/terms/accept", {
  termsAccepted: true,
  privacyAccepted: true,
  achAccepted: achAccepted,
  termsSignature: termsSignature.trim(),
  privacySignature: privacySignature.trim(),
  achSignature: achAccepted ? achSignature.trim() : null,
  acceptedAt: new Date().toISOString(),
});
```

**New Code:**
```typescript
// Import helper
import { buildTermsObject, buildPrivacyObject, buildAchObject } from '@/utils/termsHelper';

// Line 140-160: handleSubmit
const response = await axios.post("/api/terms/accept", {
  terms: buildTermsObject(true, termsSignature.trim(), 'email_link'),
  privacy: buildPrivacyObject(true, privacySignature.trim(), 'email_link'),
  ach: achAccepted 
    ? buildAchObject(true, achSignature.trim(), 'email_link')
    : null
});
```

**Impact:** 🔴 HIGH - User-facing acceptance  
**Testing Required:** ✅ Manual testing with real users  
**Rollback Risk:** Low (backend handles both formats during dual-write)

---

#### 3. `src/pages/LaunchPasswordReset.tsx`
**Lines Affected:** 200-220  
**Current Code:**
```typescript
// Line 200-220: onSubmit
await supabase.from("profiles").update({
  terms_and_conditions: termsData,
  privacy_policy_accepted: true,
  privacy_policy_accepted_at: now,
  ach_authorization_accepted: achAuthorizationAccepted,
  ach_authorization_accepted_at: achAuthorizationAccepted ? now : null,
  requires_password_reset: false,
});
```

**New Code:**
```typescript
// Import helper
import { buildTermsObject, buildPrivacyObject, buildAchObject } from '@/utils/termsHelper';

// Line 200-220: onSubmit
await supabase.from("profiles").update({
  terms_and_conditions: buildTermsObject(
    true, null, userIP, userAgent, 'launch_password_reset'
  ),
  privacy_policy: buildPrivacyObject(
    true, null, userIP, userAgent, 'launch_password_reset'
  ),
  ach_authorization: achAuthorizationAccepted
    ? buildAchObject(true, null, userIP, userAgent, 'launch_password_reset')
    : null,
  requires_password_reset: false,
});
```

**Impact:** 🔴 HIGH - Critical launch flow  
**Testing Required:** ✅ Full launch flow testing  
**Rollback Risk:** Medium (affects all launch users)

---

### 🟡 MEDIUM IMPACT FILES (Moderate Changes)

#### 4. `server/app.js`
**Lines Affected:** 1264-1290  
**Current Code:**
```javascript
// Line 1264: POST /api/users/create
const termsData = termsAccepted ? {
  accepted: true,
  acceptedAt: termsAcceptedAt || new Date().toISOString(),
  version: termsVersion || "1.0",
  ipAddress: req.ip || req.connection.remoteAddress,
} : null;
```

**New Code:**
```javascript
// Import helper
const { buildTermsObject, buildPrivacyObject } = require('./utils/termsHelper');

// Line 1264: POST /api/users/create
const profileData = {
  ...userData,
  terms_and_conditions: termsAccepted 
    ? buildTermsObject(true, null, req.ip, req.get('User-Agent'), 'admin_created')
    : null,
  privacy_policy: buildPrivacyObject(true, null, req.ip, req.get('User-Agent'), 'admin_created'),
};
```

**Impact:** 🟡 MEDIUM - Admin user creation  
**Testing Required:** ✅ Admin dashboard testing  
**Rollback Risk:** Low (admin-only feature)

---

#### 5. `src/components/admin/TermsManagement.tsx`
**Lines Affected:** 150-280  
**Current Code:**
```typescript
// Line 154-157: Calculate acceptance count
const acceptedCount = [
  user.terms_and_conditions?.accepted,
  user.privacy_policy_accepted,
  user.ach_authorization_accepted
].filter(Boolean).length;

// Line 263-265: Display privacy status
{user.privacy_policy_accepted ? (
  <CheckCircle2 className="h-4 w-4 text-green-600" />
) : (
  <XCircle className="h-4 w-4 text-red-600" />
)}
```

**New Code:**
```typescript
// Line 154-157: Calculate acceptance count
const acceptedCount = [
  user.terms_and_conditions?.accepted,
  user.privacy_policy?.accepted,
  user.ach_authorization?.accepted
].filter(Boolean).length;

// Line 263-265: Display privacy status
{user.privacy_policy?.accepted ? (
  <CheckCircle2 className="h-4 w-4 text-green-600" />
) : (
  <XCircle className="h-4 w-4 text-red-600" />
)}
```

**Impact:** 🟡 MEDIUM - Admin view only  
**Testing Required:** ✅ Visual verification  
**Rollback Risk:** Low (read-only display)

---

#### 6. `server/routes/termsManagementRoutes.js`
**Lines Affected:** 55-400  
**Current Code:**
```javascript
// Line 55-60: Query profiles
const { data: profiles } = await supabaseAdmin
  .from("profiles")
  .select(`
    id, first_name, last_name, email, company_name,
    terms_and_conditions, terms_signature,
    privacy_policy_accepted, privacy_policy_accepted_at, privacy_policy_signature,
    ach_authorization_accepted, ach_authorization_accepted_at, ach_authorization_signature
  `);

// Line 337-341: PDF generation
const termsAccepted = userData.terms_and_conditions?.accepted || false;
const privacyAccepted = userData.privacy_policy_accepted || false;
const achAccepted = userData.ach_authorization_accepted || false;
```

**New Code:**
```javascript
// Line 55-60: Query profiles
const { data: profiles } = await supabaseAdmin
  .from("profiles")
  .select(`
    id, first_name, last_name, email, company_name,
    terms_and_conditions,
    privacy_policy,
    ach_authorization
  `);

// Line 337-341: PDF generation
const termsAccepted = userData.terms_and_conditions?.accepted || false;
const privacyAccepted = userData.privacy_policy?.accepted || false;
const achAccepted = userData.ach_authorization?.accepted || false;
```

**Impact:** 🟡 MEDIUM - Admin API + PDF  
**Testing Required:** ✅ PDF generation testing  
**Rollback Risk:** Low (admin feature)

---

### 🟢 LOW IMPACT FILES (Minor Changes)

#### 7. `src/components/users/forms/SteppedUserForm.tsx`
**Lines Affected:** 181-187  
**Current Code:**
```typescript
// Line 181-187: Profile creation
const profileData = {
  ...values,
  privacy_policy_accepted: true,
  privacy_policy_accepted_at: new Date().toISOString(),
  ach_authorization_accepted: values.achAuthorizationAccepted || false,
};
```

**New Code:**
```typescript
// Import helper
import { buildTermsObject, buildPrivacyObject } from '@/utils/termsHelper';

// Line 181-187: Profile creation
const profileData = {
  ...values,
  terms_and_conditions: buildTermsObject(true, null, 'web_form'),
  privacy_policy: buildPrivacyObject(true, null, 'web_form'),
  // Note: No ACH during signup - keep existing behavior
};
```

**Impact:** 🟢 LOW - Signup flow  
**Testing Required:** ✅ New user registration  
**Rollback Risk:** Low (new users only)  
**Note:** No signature collection or ACH during signup (by design)

---

#### 8. `src/components/users/AddUserModal.tsx`
**Lines Affected:** 200-225  
**Current Code:**
```typescript
// Line 200-225: Generate terms link
const tokenResponse = await axios.post("/api/terms/generate-token", {
  userId: newUser.id,
  email: values.email,
});
```

**New Code:**
```typescript
// No changes needed - token generation unchanged
// Backend will handle JSONB format when user accepts
```

**Impact:** 🟢 LOW - No changes needed  
**Testing Required:** ✅ Verify email link works  
**Rollback Risk:** None

---

#### 9. `src/components/users/hooks/services/userProfileService.ts`
**Lines Affected:** 103-108, 196-201  
**Current Code:**
```typescript
// Line 103-108: createUserProfile
privacy_policy_accepted: (values as any).privacy_policy_accepted || false,
privacy_policy_accepted_at: (values as any).privacy_policy_accepted_at || null,
ach_authorization_accepted: (values as any).ach_authorization_accepted || false,
ach_authorization_accepted_at: (values as any).ach_authorization_accepted_at || null,
```

**New Code:**
```typescript
// Import helper
import { buildTermsObject, buildPrivacyObject } from '@/utils/termsHelper';

// Line 103-108: createUserProfile
terms_and_conditions: buildTermsObject(
  true,
  null,
  'web_form'
),
privacy_policy: buildPrivacyObject(
  (values as any).privacy_policy_accepted || false,
  null,
  'web_form'
),
// Note: No ACH during signup - removed from this flow
```

**Impact:** 🟢 LOW - Service layer  
**Testing Required:** ✅ Profile CRUD operations  
**Rollback Risk:** Low  
**Note:** No signature or ACH fields during signup

---

#### 10. `server/routes/launchRoutes.js`
**Lines Affected:** 392-430  
**Current Code:**
```javascript
// Line 392-430: Update profile after launch completion
if (reset.terms_accepted_at) {
  profileUpdateData.terms_and_conditions = {
    accepted: true,
    acceptedAt: reset.terms_accepted_at,
    version: "1.0",
    method: "launch_password_reset"
  };
}
```

**New Code:**
```javascript
// Import helper
const { buildTermsObject, buildPrivacyObject } = require('../utils/termsHelper');

// Line 392-430: Update profile after launch completion
if (reset.terms_accepted_at) {
  profileUpdateData.terms_and_conditions = buildTermsObject(
    true, null, null, null, 'launch_password_reset'
  );
  profileUpdateData.privacy_policy = buildPrivacyObject(
    true, null, null, null, 'launch_password_reset'
  );
}
```

**Impact:** 🟢 LOW - Background sync  
**Testing Required:** ✅ Launch completion tracking  
**Rollback Risk:** Low (tracking only)

---

## 🆕 NEW FILES TO CREATE

### 1. `server/utils/termsHelper.js` (NEW)
**Purpose:** Backend utility functions for JSONB creation  
**Lines:** ~80 lines  
**Dependencies:** None  
**Impact:** 🟢 LOW - Utility only  

**Functions:**
- `buildTermsObject(accepted, signature, ipAddress, userAgent, method)`
- `buildPrivacyObject(accepted, signature, ipAddress, userAgent, method)`
- `buildAchObject(accepted, signature, ipAddress, userAgent, method)`

---

### 2. `src/utils/termsHelper.ts` (NEW)
**Purpose:** Frontend utility functions for JSONB creation  
**Lines:** ~100 lines  
**Dependencies:** None  
**Impact:** 🟢 LOW - Utility only  

**Functions:**
- `buildTermsObject(accepted, signature, method)`
- `buildPrivacyObject(accepted, signature, method)`
- `buildAchObject(accepted, signature, method)`
- TypeScript interfaces for type safety

---

### 3. `supabase/migrations/YYYYMMDD_jsonb_consolidation.sql` (NEW)
**Purpose:** Database migration script  
**Lines:** ~150 lines  
**Dependencies:** Existing profiles table  
**Impact:** 🔴 HIGH - Database schema  

**Operations:**
- Add `privacy_policy` JSONB column
- Add `ach_authorization` JSONB column
- Create migration function
- Create helper functions
- Create indexes

---

## 📊 Change Statistics

### By Impact Level:
- 🔴 **HIGH IMPACT:** 3 files (termsRoutes.js, AcceptTerms.tsx, LaunchPasswordReset.tsx)
- 🟡 **MEDIUM IMPACT:** 3 files (app.js, TermsManagement.tsx, termsManagementRoutes.js)
- 🟢 **LOW IMPACT:** 4 files (SteppedUserForm.tsx, AddUserModal.tsx, userProfileService.ts, launchRoutes.js)
- 🆕 **NEW FILES:** 3 files (2 utilities + 1 migration)

### By File Type:
- **Backend (Node.js):** 5 files + 1 utility
- **Frontend (React/TS):** 6 files + 1 utility
- **Database (SQL):** 1 migration

### Lines of Code Changed:
- **Backend:** ~200 lines modified
- **Frontend:** ~150 lines modified
- **Database:** ~150 lines new
- **Total:** ~500 lines affected

---

## 🧪 Testing Matrix

### Test Coverage Required:

| Workflow | Files Affected | Test Type | Priority |
|----------|---------------|-----------|----------|
| Admin creates user | 3 files | Integration | 🔴 HIGH |
| User accepts terms | 2 files | E2E | 🔴 HIGH |
| Launch password reset | 2 files | E2E | 🔴 HIGH |
| User signup | 2 files | Integration | 🟡 MEDIUM |
| Admin views status | 2 files | UI | 🟡 MEDIUM |
| PDF generation | 1 file | Unit | 🟢 LOW |

### Test Scenarios:

#### Scenario 1: New User Accepts Terms
```
1. Admin creates user
2. User receives email
3. User clicks link
4. User accepts all terms with signatures
5. Verify JSONB data in database
6. Verify audit trail created
```

#### Scenario 2: Launch Flow
```
1. User receives launch email
2. User clicks link
3. User accepts terms (step 1)
4. User resets password (step 2)
5. Verify JSONB data in database
6. Verify launch_password_resets updated
```

#### Scenario 3: Signup Flow
```
1. New user registers
2. Terms auto-accepted (no signature required)
3. Privacy auto-accepted (no signature required)
4. No ACH during signup
5. Verify JSONB data in database (signature: null)
6. Verify user can login
```

#### Scenario 4: Admin Dashboard
```
1. Admin opens Terms Management
2. Verify all users display correctly
3. Generate PDF for user
4. Verify PDF contains all data
5. Verify metadata visible
```

---

## 🔄 Data Flow Comparison

### BEFORE: Data Scattered Across Multiple Columns
```
profiles table:
├─ terms_and_conditions (JSONB) ← Sometimes used
├─ terms_accepted (boolean) ← Sometimes used
├─ terms_accepted_at (timestamp) ← Sometimes used
├─ terms_signature (text) ← Sometimes used
├─ privacy_policy_accepted (boolean) ← Always used
├─ privacy_policy_accepted_at (timestamp) ← Always used
├─ privacy_policy_signature (text) ← Sometimes used
├─ ach_authorization_accepted (boolean) ← Always used
├─ ach_authorization_accepted_at (timestamp) ← Always used
└─ ach_authorization_signature (text) ← Sometimes used

⚠️ Problem: Inconsistent data access patterns
⚠️ Problem: Some flows use JSONB, others use booleans
⚠️ Problem: Difficult to maintain
```

### AFTER: Single Source of Truth
```
profiles table:
├─ terms_and_conditions (JSONB) ← ALWAYS used
│   └─ { accepted, acceptedAt, version, signature, ... }
├─ privacy_policy (JSONB) ← ALWAYS used
│   └─ { accepted, acceptedAt, version, signature, ... }
└─ ach_authorization (JSONB) ← ALWAYS used
    └─ { accepted, acceptedAt, version, signature, ... }

✅ Solution: Consistent JSONB access everywhere
✅ Solution: All metadata in one place
✅ Solution: Easy to extend with new fields
```

---

## 🎯 Success Metrics

### Before Migration:
- ❌ 3 different data formats
- ❌ 10+ columns for terms data
- ❌ Inconsistent signature collection
- ❌ Mixed JSONB + boolean queries
- ❌ Difficult to add new metadata

### After Migration:
- ✅ 1 consistent data format (JSONB)
- ✅ 3 columns for all terms data
- ✅ Consistent signature collection
- ✅ All JSONB queries
- ✅ Easy to extend (just add to JSONB)

---

## 📝 Developer Checklist

### For Each File Update:
- [ ] Read current implementation
- [ ] Identify all terms/privacy/ACH references
- [ ] Replace with JSONB access pattern
- [ ] Add utility function imports
- [ ] Update TypeScript types if needed
- [ ] Test locally
- [ ] Update tests
- [ ] Code review
- [ ] Deploy to staging
- [ ] Verify in staging
- [ ] Deploy to production

### For Database Migration:
- [ ] Backup production database
- [ ] Test migration on copy
- [ ] Verify data integrity
- [ ] Run migration on production
- [ ] Verify all data migrated
- [ ] Monitor for errors
- [ ] Keep backup for 30 days

---

## 🚨 Risk Assessment

### High Risk Areas:
1. **termsRoutes.js** - Core acceptance logic
   - Mitigation: Dual-write period, extensive testing
2. **LaunchPasswordReset.tsx** - Critical launch flow
   - Mitigation: Staged rollout, monitoring
3. **Database Migration** - Schema changes
   - Mitigation: Backup, test environment first

### Medium Risk Areas:
1. **Admin Dashboard** - Display logic
   - Mitigation: Visual testing, admin preview
2. **PDF Generation** - Report accuracy
   - Mitigation: Sample PDF comparison

### Low Risk Areas:
1. **Utility Functions** - New code
   - Mitigation: Unit tests
2. **Signup Flow** - New users only
   - Mitigation: Gradual rollout

---

## ✅ Final Checklist

### Pre-Migration:
- [ ] All stakeholders informed
- [ ] Test environment ready
- [ ] Backup created
- [ ] Rollback plan documented
- [ ] Team trained on new structure

### During Migration:
- [ ] Database migration successful
- [ ] All files updated
- [ ] Tests passing
- [ ] Staging verified
- [ ] Production deployed

### Post-Migration:
- [ ] All workflows tested
- [ ] No data loss confirmed
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Old columns deprecated

---

**Status:** ✅ ANALYSIS COMPLETE  
**Total Files Affected:** 14 files  
**Estimated Effort:** 12 weeks  
**Risk Level:** Medium (with mitigation)  
**Recommendation:** Proceed with phased approach

---

*This document provides a complete visual guide to all code changes required for the JSONB migration. Use it as a reference during implementation.*
