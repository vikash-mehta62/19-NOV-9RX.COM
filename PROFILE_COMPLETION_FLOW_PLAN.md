# Profile Completion Flow Implementation Plan

## Overview
This document outlines the implementation plan for sending profile completion links to users when:
1. Admin creates a customer account
2. User self-registers through the signup page

Both scenarios will send an email with a secure link (using Supabase session token) to complete the remaining profile information.

---

## Current System Analysis

### Existing Flows

#### 1. Admin Creates Customer
- **Location**: `src/pages/admin/Users.tsx` → `UsersContainer.tsx`
- **Backend**: `server/routes/userRoutes.js` → `/create-user` endpoint
- **Email Template**: `server/templates/adminAccountActiveTemplate.js`
- **Current Behavior**: 
  - Admin creates user with basic info (email, name, password)
  - Email sent with password and terms acceptance link
  - User must accept terms before accessing account

#### 2. User Self-Signup
- **Location**: `src/components/auth/SignupForm.tsx`
- **Backend**: `server/app.js` → `/create-signup-profile` endpoint
- **Email Template**: `server/templates/signupSuccessTemplate.js`
- **Current Behavior**:
  - User fills basic signup form (email, password, name, phone)
  - Email sent with "Complete Your Profile" link
  - Link goes to `/update-profile?email={email}` (NOT secure - no session token)

### ✅ EXISTING PROFILE UPDATE COMPONENTS (REUSABLE!)

#### Main Component
- **File**: `src/components/UserSelfDetails.tsx`
- **Route**: `/update-profile`
- **Current Flow**:
  1. Gets email from URL query parameter
  2. Fetches user profile from database
  3. Opens `EditUserModal` with user data
  4. Uses `SteppedUserForm` for profile completion

#### Form Components (Already Built!)
- **EditUserModal**: `src/components/users/EditUserModal.tsx`
  - Modal wrapper for profile editing
  - Handles form state and submission
  - Has `self` prop for self-service mode
  
- **SteppedUserForm**: `src/components/users/forms/SteppedUserForm.tsx`
  - 4-step wizard form (Business → Address → Documents → Review)
  - Includes all fields from screenshot:
    - Step 1: First Name, Last Name, Email, Company, Work Phone, Mobile, Contact Person, Fax, Department
    - Step 2: Billing Address, Shipping Address
    - Step 3: Tax ID, State ID, Documents
    - Step 4: Review & Terms Acceptance
  - Built-in validation
  - Terms & Conditions checkbox
  - ACH Authorization (optional)

#### Form Sections (Reusable!)
- `BasicInformationSection`: Name, email, company
- `ContactInformationSection`: Phones, contact person, fax
- `AddressInformationSection`: Billing & shipping addresses
- `TaxAndDocumentsSection`: Tax info, documents upload

### Existing Terms Acceptance Flow (Reference)
- **Route**: `/accept-terms`
- **Component**: `src/pages/AcceptTerms.tsx`
- **Backend**: `server/routes/launchRoutes.js`
- **Key Features**:
  - Uses Supabase recovery link with session token
  - Verifies session on backend before allowing access
  - Secure, authenticated flow
  - **This is the model we should follow**

### 🎯 KEY INSIGHT: We DON'T need to build new forms!
We just need to:
1. Make `UserSelfDetails.tsx` work with session tokens (instead of email param)
2. Update email templates to send secure links
3. Add backend routes for token generation and verification

---

## Requirements

### Functional Requirements
1. When admin creates a customer:
   - Send email with TWO links:
     - Terms acceptance link (existing)
     - Profile completion link (NEW - with session token)
   
2. When user self-registers:
   - Send email with ONE link:
     - Profile completion link (NEW - with session token)
   - Terms already accepted during signup

3. Profile completion link must:
   - Use Supabase session token for authentication
   - Be secure and time-limited
   - Allow user to complete profile fields shown in the screenshot
   - Work without requiring login

### Profile Fields to Complete
Based on the screenshot provided, the profile completion form should include:

**Business Information Section:**
- First Name (already collected)
- Last Name (already collected)
- Email (already collected)
- Company Name (already collected during signup)
- Work Phone
- Mobile Phone
- Alternative Email
- Fax Number
- Contact Person

**Additional Sections (from multi-step form):**
- Pharmacy Details (DEA, License, NPI, etc.)
- Addresses (Billing, Shipping)
- Payment Information

---

## Implementation Plan (Using Existing Components!)

### Phase 1: Backend Infrastructure

#### 1.1 Create Profile Completion Token Generation
**File**: `server/routes/profileRoutes.js` (NEW)

```javascript
// Generate secure profile completion link using Supabase magic link
POST /api/profile/generate-completion-link
- Input: { userId, email }
- Generate Supabase magic link (type: 'magiclink')
- Redirect to: /complete-profile
- Store token in database for tracking
- Return: { completionLink }
```

#### 1.2 Create Profile Completion Verification Endpoint
**File**: `server/routes/profileRoutes.js`

```javascript
// Verify session and get user info
GET /api/profile/verify-completion-session
- Verify Supabase session token from Authorization header
- Return user profile data
- Similar to /api/terms/verify-session in launchRoutes.js
```

#### 1.3 Update Existing Profile Update Endpoint
**File**: `server/routes/userRoutes.js` or create new `profileRoutes.js`

```javascript
// Update existing /update-user-profile endpoint to:
POST /api/profile/update-user-profile
- Verify Supabase session token (NEW - add authentication)
- Update profile with all fields (EXISTING)
- Mark profile as "completed" (NEW)
- Send confirmation email (EXISTING)
- Return success response
```

#### 1.4 Update Email Templates

**File**: `server/templates/adminAccountActiveTemplate.js`
- Add profile completion link alongside terms link
- Use secure magic link instead of email parameter
- Update email copy to mention both steps

**File**: `server/templates/signupSuccessTemplate.js`
- Replace insecure `?email=` link with secure magic link
- Update button to use new secure link
- Keep existing design

### Phase 2: Frontend Updates (Minimal Changes!)

#### 2.1 Update Existing UserSelfDetails Component
**File**: `src/components/UserSelfDetails.tsx` (MODIFY EXISTING)

Changes needed:
1. **Add session verification** (similar to AcceptTerms.tsx):
   ```typescript
   // Check for session token in URL hash
   const hashParams = new URLSearchParams(window.location.hash.substring(1));
   const accessToken = hashParams.get('access_token');
   
   // Verify session with Supabase
   const { data: { session } } = await supabase.auth.getSession();
   
   // Verify with backend
   const response = await axios.get("/api/profile/verify-completion-session", {
     headers: { Authorization: `Bearer ${session.access_token}` }
   });
   ```

2. **Keep existing modal flow**:
   - Still use `EditUserModal`
   - Still use `SteppedUserForm`
   - Just add session verification before showing modal

3. **Update form submission**:
   - Pass session token to backend
   - Handle completion tracking

#### 2.2 NO NEW COMPONENTS NEEDED!
We reuse:
- ✅ `EditUserModal` (already exists)
- ✅ `SteppedUserForm` (already exists with all 4 steps)
- ✅ `BasicInformationSection` (already exists)
- ✅ `ContactInformationSection` (already exists)
- ✅ `AddressInformationSection` (already exists)
- ✅ `TaxAndDocumentsSection` (already exists)

#### 2.3 Update Route (Already Exists!)
**File**: `src/App.tsx`

Route already exists:
```typescript
<Route path="/update-profile" element={<UserSelfDetails />} />
```

Just need to ensure it works with session tokens!

### Phase 3: Integration Points

#### 3.1 Admin User Creation Flow
**File**: `server/routes/userRoutes.js` → `/create-user`

After creating user:
1. Generate terms acceptance link (existing)
2. Generate profile completion link (NEW)
3. Send email with both links
4. Track both actions in database

#### 3.2 User Self-Signup Flow
**File**: `src/components/auth/SignupForm.tsx` & `server/app.js`

After signup:
1. Generate profile completion link
2. Send email with secure link
3. Track in database

#### 3.3 Database Tracking
**Table**: `profile_completion_tracking` (NEW)

```sql
CREATE TABLE profile_completion_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  completion_token TEXT,
  email_sent_at TIMESTAMPTZ,
  profile_completed_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 4: Security & Validation

#### 4.1 Session Token Security
- Use Supabase magic link generation (same as password reset)
- Token expires after 24 hours
- One-time use token
- Verify token on every API call

#### 4.2 Data Validation
- Validate all profile fields on backend
- Sanitize inputs
- Check for required fields
- Validate email format, phone numbers, etc.

#### 4.3 Error Handling
- Handle expired tokens gracefully
- Show clear error messages
- Provide support contact info
- Allow users to request new link

---

## Implementation Steps (Detailed)

### Step 1: Database Setup
1. Create `profile_completion_tracking` table
2. Add migration script
3. Test table creation

### Step 2: Backend Routes
1. Create `server/routes/profileRoutes.js`
2. Implement token generation endpoint
3. Implement session verification endpoint
4. Implement profile update endpoint
5. Add routes to `server/app.js`
6. Test all endpoints with Postman

### Step 3: Email Templates
1. Update `adminAccountActiveTemplate.js`
2. Update `signupSuccessTemplate.js`
3. Create `profileCompletionTemplate.js`
4. Test email rendering

### Step 4: Frontend Components
1. Create `CompleteProfile.tsx` page
2. Create form components
3. Implement session verification
4. Implement form submission
5. Add loading and error states
6. Test user flow

### Step 5: Integration
1. Update admin user creation flow
2. Update self-signup flow
3. Test end-to-end flows
4. Fix any issues

### Step 6: Testing
1. Test admin creates customer → email → complete profile
2. Test user self-signup → email → complete profile
3. Test expired token handling
4. Test invalid token handling
5. Test form validation
6. Test successful completion

### Step 7: Documentation
1. Update API documentation
2. Create user guide
3. Create admin guide
4. Document troubleshooting steps

---

## Technical Considerations

### 1. Session Token Generation
Use Supabase's built-in magic link generation:
```javascript
const { data, error } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: user.email,
  options: {
    redirectTo: `${frontendUrl}/complete-profile`,
  }
});
```

### 2. Session Verification
Similar to `AcceptTerms.tsx`:
```typescript
const { data: { session }, error } = await supabase.auth.getSession();
if (session?.user) {
  // Verify with backend
  const response = await axios.get("/api/profile/verify-completion-session", {
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
}
```

### 3. Form State Management
Use React Hook Form for complex multi-step form:
```typescript
const form = useForm<ProfileCompletionData>({
  defaultValues: { /* ... */ }
});
```

### 4. Progress Tracking
Store completion status in database:
- `profile_completed_at`: timestamp when completed
- `completed`: boolean flag
- Update `profiles` table with completion status

---

## Email Flow Diagrams

### Admin Creates Customer
```
Admin creates customer
    ↓
Backend creates auth user + profile
    ↓
Generate TWO links:
  1. Terms acceptance link (existing)
  2. Profile completion link (NEW)
    ↓
Send email with both links
    ↓
User clicks terms link → accepts terms
    ↓
User clicks profile link → completes profile
    ↓
Account fully set up
```

### User Self-Signup
```
User fills signup form
    ↓
Backend creates auth user + profile
    ↓
Terms accepted during signup
    ↓
Generate profile completion link
    ↓
Send email with link
    ↓
User clicks link → completes profile
    ↓
Account fully set up
```

---

## Success Criteria

1. ✅ Admin can create customer and email is sent with profile completion link
2. ✅ User can self-register and email is sent with profile completion link
3. ✅ Profile completion link uses secure session token
4. ✅ User can complete profile without logging in
5. ✅ All profile fields from screenshot are captured
6. ✅ Form validates all inputs
7. ✅ Expired tokens are handled gracefully
8. ✅ Completion status is tracked in database
9. ✅ Email templates are professional and clear
10. ✅ End-to-end flow works smoothly

---

## Timeline Estimate

- **Phase 1 (Backend)**: 2-3 days
- **Phase 2 (Frontend)**: 3-4 days
- **Phase 3 (Integration)**: 1-2 days
- **Phase 4 (Security & Testing)**: 2-3 days
- **Total**: 8-12 days

---

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Create feature branch
4. Start with Phase 1 (Backend Infrastructure)
5. Implement incrementally with testing at each phase
6. Deploy to staging for QA
7. Deploy to production

---

## Notes

- This plan follows the existing patterns in the codebase (especially `AcceptTerms.tsx` and `launchRoutes.js`)
- Uses Supabase's built-in authentication mechanisms for security
- Maintains consistency with existing email templates and UI/UX
- Provides clear separation between terms acceptance and profile completion
- Allows for future enhancements (e.g., partial saves, reminders)

---

## Questions to Resolve

1. Should profile completion be mandatory or optional?
2. What happens if user doesn't complete profile within X days?
3. Should we send reminder emails?
4. Should admin be notified when profile is completed?
5. Can user edit profile later after completion?
6. Should we validate DEA/License numbers against external APIs?

---

**Document Version**: 1.0  
**Created**: Based on current codebase analysis  
**Last Updated**: [Current Date]
