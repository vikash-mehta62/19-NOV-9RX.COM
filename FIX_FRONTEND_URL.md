# Fix Frontend URL for Launch Password Reset
**Date:** February 27, 2026  
**Issue:** Link redirects to localhost instead of production URL  
**Status:** ✅ SOLUTION FOUND

---

## 🐛 Problem

The launch password reset link is redirecting to:
```
redirect_to=https://9rx.vercel.app
```

Instead of:
```
redirect_to=https://9rx.vercel.app
```

This causes the link to fail because users don't have access to your localhost.

---

## 🔧 Solution

### Option 1: Set Environment Variable (RECOMMENDED)

Add this to your server's `.env` file:

```bash
FRONTEND_URL=https://9rx.vercel.app
```

Or if you have a custom domain:
```bash
FRONTEND_URL=https://9rx.com
```

### Option 2: Set on Vercel/Hosting Platform

If you're using Vercel:

1. Go to your project dashboard
2. Settings → Environment Variables
3. Add new variable:
   - **Name:** `FRONTEND_URL`
   - **Value:** `https://9rx.vercel.app` (or your custom domain)
   - **Environment:** Production, Preview, Development

4. Redeploy your application

### Option 3: Use VITE_APP_BASE_URL

If you already have `VITE_APP_BASE_URL` set, the code will now use it as a fallback:

```bash
VITE_APP_BASE_URL=https://9rx.vercel.app
```

---

## 🧪 Testing

After setting the environment variable:

1. **Restart your server**
2. **Send a new test email**
3. **Check the logs** - should show:
   ```
   🌐 Using Frontend URL: https://9rx.vercel.app
   Redirect URL: https://9rx.vercel.app/launch-password-reset?launch=true
   Full Reset Link: https://...&redirect_to=https://9rx.vercel.app/launch-password-reset?launch=true
   ```

4. **Click the button in the email** - should now work!

---

## 📝 Environment Variables Checklist

Make sure these are set on your server:

```bash
# Frontend URL (REQUIRED for launch emails)
FRONTEND_URL=https://9rx.vercel.app

# Or use this if you have it
VITE_APP_BASE_URL=https://9rx.vercel.app

# Supabase (should already be set)
SUPABASE_URL=https://qiaetxkxweghuoxyhvml.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (should already be set)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

## 🔍 How to Check Current Environment Variables

### On your server:
```bash
echo $FRONTEND_URL
echo $VITE_APP_BASE_URL
```

### In Node.js:
```javascript
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('VITE_APP_BASE_URL:', process.env.VITE_APP_BASE_URL);
```

---

## ⚠️ Important Notes

### For Production:
- Use `https://9rx.vercel.app` or your custom domain
- Never use `localhost` in production

### For Development:
- Use `https://9rx.vercel.app` for local testing
- Set different values for different environments

### For Vercel:
- Set environment variables in Vercel dashboard
- Redeploy after changing variables
- Variables are applied on next deployment

---

## 🎯 Expected Result

### Before Fix:
```
Full Reset Link: ...&redirect_to=https://9rx.vercel.app
❌ Link doesn't work for users
```

### After Fix:
```
Full Reset Link: ...&redirect_to=https://9rx.vercel.app/launch-password-reset?launch=true
✅ Link works correctly
```

---

## 🔄 Quick Fix Steps

1. **Add to `.env` file:**
   ```bash
   FRONTEND_URL=https://9rx.vercel.app
   ```

2. **Restart server:**
   ```bash
   npm run dev  # or your start command
   ```

3. **Test:**
   - Send new email
   - Check logs for correct URL
   - Click button in email
   - Should redirect to production site

---

**Fix Status:** ✅ SOLUTION PROVIDED  
**Fix Date:** February 27, 2026  
**Action Required:** Set FRONTEND_URL environment variable and restart server

