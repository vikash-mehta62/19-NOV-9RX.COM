# Launch Password Reset Link - Debug Guide
**Date:** February 27, 2026  
**Issue:** "Get Started Now" button link not opening  
**Status:** 🔍 DEBUGGING

---

## 🔍 How to Debug the Issue

### Step 1: Check Server Logs

When you send the launch email, look for these logs:

```
✅ Generated recovery link for user@example.com
   Redirect URL: https://9rx.com/launch-password-reset?launch=true
   Reset Link: https://[project].supabase.co/auth/v1/verify?token=...
```

**What to check:**
- Is the Reset Link present?
- Does it start with `https://`?
- Does it contain `token=` parameter?
- Does it contain `type=recovery` parameter?
- Does it contain `redirect_to=` parameter?

### Step 2: Check the Email HTML

1. Open the email in your inbox
2. Right-click on "Get Started Now" button
3. Select "Copy link address" or "Inspect element"
4. Paste the link in a text editor

**The link should look like:**
```
https://qiaetxkxweghuoxyhvml.supabase.co/auth/v1/verify?token=pkce_abc123...&type=recovery&redirect_to=https://9rx.com/launch-password-reset?launch=true
```

**If the link looks like:**
- `undefined` → Link extraction failed
- Empty → Link is missing
- `javascript:void(0)` → Template issue
- Truncated → HTML encoding issue

### Step 3: Test the Link Manually

1. Copy the full link from the email
2. Paste it in a new browser tab
3. Press Enter

**Expected behavior:**
1. Supabase verifies the token
2. Creates a session
3. Redirects to: `https://9rx.com/launch-password-reset?launch=true`
4. Page loads with terms acceptance form

**If it doesn't work:**
- Check browser console for errors
- Check network tab for failed requests
- Check if you're redirected to an error page

---

## 🐛 Common Issues and Fixes

### Issue 1: Link is `undefined` in Email

**Symptoms:**
- Button shows but doesn't work
- Clicking does nothing
- Link is literally "undefined"

**Cause:**
- `resetData.properties.action_link` doesn't exist
- API response structure changed

**Fix:**
```javascript
// Check what's actually in resetData
console.log('Reset Data:', JSON.stringify(resetData, null, 2));

// Try different paths
const resetLink = 
  resetData.properties?.action_link ||  // Try this first
  resetData.action_link ||               // Then this
  resetData.properties?.hashed_token;    // Last resort
```

### Issue 2: Link is Encoded

**Symptoms:**
- Link shows as `https%3A%2F%2F...`
- Clicking opens encoded URL

**Cause:**
- HTML template is double-encoding the URL

**Fix:**
Make sure the template uses the link directly:
```html
<a href="${resetLink}" class="button">
```

NOT:
```html
<a href="${encodeURIComponent(resetLink)}" class="button">
```

### Issue 3: Link Expires

**Symptoms:**
- Link works initially
- Stops working after some time
- Shows "Invalid or expired token"

**Cause:**
- Supabase tokens expire after 1 hour by default

**Fix:**
- Users must click link within 1 hour
- Or regenerate a new link

### Issue 4: Redirect URL Not Whitelisted

**Symptoms:**
- Link redirects to Supabase error page
- Shows "Redirect URL not allowed"

**Cause:**
- Your domain is not in Supabase's allowed redirect URLs

**Fix:**
1. Go to Supabase Dashboard
2. Authentication → URL Configuration
3. Add to "Redirect URLs":
   - `https://9rx.com/*`
   - `https://9rx.vercel.app/*`
   - `http://localhost:3000/*` (for testing)

---

## 🧪 Testing Checklist

### Before Sending Email:
- [ ] Check `FRONTEND_URL` environment variable
- [ ] Verify Supabase project is active
- [ ] Check redirect URLs are whitelisted

### After Sending Email:
- [ ] Check server logs for reset link
- [ ] Open email and inspect button link
- [ ] Copy link and test in browser
- [ ] Verify redirect works correctly

### If Link Doesn't Work:
- [ ] Check browser console for errors
- [ ] Check network tab for failed requests
- [ ] Try in incognito/private mode
- [ ] Try different browser
- [ ] Check Supabase dashboard for errors

---

## 📝 Manual Test Script

Run this to test the link generation:

```javascript
// In server console or route handler
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testLinkGeneration() {
  const redirectUrl = 'https://9rx.com/launch-password-reset?launch=true';
  
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: 'test@example.com',
    options: {
      redirectTo: redirectUrl,
    }
  });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Success!');
  console.log('Action Link:', data.properties.action_link);
  console.log('Redirect To:', data.properties.redirect_to);
  
  // Test the link
  console.log('\nTest this link in your browser:');
  console.log(data.properties.action_link);
}

testLinkGeneration();
```

---

## 🔧 Alternative Approach

If Supabase links continue to fail, use a custom token approach:

### 1. Generate Custom Token:
```javascript
const crypto = require('crypto');
const token = crypto.randomBytes(32).toString('hex');

// Store in database
await supabaseAdmin.from('launch_password_resets').insert({
  profile_id: user.id,
  email: user.email,
  reset_token: token,
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
});
```

### 2. Create Simple Link:
```javascript
const resetLink = `${process.env.FRONTEND_URL}/launch-password-reset?token=${token}&email=${encodeURIComponent(user.email)}`;
```

### 3. Verify Token on Frontend:
```javascript
// In LaunchPasswordReset.tsx
const token = searchParams.get('token');
const email = searchParams.get('email');

// Verify with backend
const response = await axios.post('/api/launch/verify-token', {
  token,
  email
});

if (response.data.valid) {
  // Show terms and password reset form
}
```

This approach:
- ✅ Simpler links
- ✅ More control over expiry
- ✅ Easier to debug
- ✅ No Supabase redirect URL issues

---

## 📞 Support

If issue persists after trying all above:

1. **Check Logs:**
   - Server logs for link generation
   - Browser console for errors
   - Network tab for failed requests

2. **Provide Information:**
   - Full reset link from email
   - Server logs
   - Browser console errors
   - Supabase project ID

3. **Contact:**
   - Email: support@9rx.com
   - Include all above information

---

**Debug Status:** 🔍 IN PROGRESS  
**Last Updated:** February 27, 2026  
**Next Step:** Check server logs when sending email

