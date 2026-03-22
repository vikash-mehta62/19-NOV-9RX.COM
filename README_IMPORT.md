# User Import Documentation - Complete Package

Ye folder me saare files hai jo aapko dusre database se users import karne ke liye chahiye.

## 📁 Files Overview

### 1. **IMPORT_USERS_COMPLETE_GUIDE.md** ⭐ START HERE
Complete step-by-step guide Hindi/English me. Sabse pehle ye file padho!

**Contains:**
- Pre-import checklist
- Step-by-step process (8 steps)
- Export queries
- Import queries
- Verification queries
- Common issues & solutions
- Alternative methods

**Use When:** Pehli baar import kar rahe ho

---

### 2. **QUICK_IMPORT_TEMPLATE.sql** ⚡ READY TO RUN
Direct copy-paste ready SQL queries. Sabse fast method!

**Contains:**
- Section A: Export queries (source DB)
- Section B: Reset queries (target DB)
- Section C: Import queries (target DB)
- Section D: Verification queries
- Section E: Admin setup
- Section F: Troubleshooting

**Use When:** Jaldi me ho aur process samajh gaya ho

---

### 3. **IMPORT_FLOWCHART.md** 📊 VISUAL GUIDE
Visual flowchart with boxes and arrows. Process ko visually samajhne ke liye.

**Contains:**
- Step-by-step flowchart
- Table relationships
- Common errors with solutions
- Time estimates
- Checklist

**Use When:** Visual learner ho ya process overview chahiye

---

### 4. **TROUBLESHOOTING_IMPORT.sql** 🔧 DEBUG HELPER
20+ troubleshooting queries. Jab koi problem aaye.

**Contains:**
- Find missing tables
- Count references
- Find duplicates
- Check orphaned records
- Schema comparison
- Integrity checks
- Emergency delete queries

**Use When:** Import me error aa raha ho

---

### 5. **COMPLETE_RESET_ALL_TABLES.sql** 🗑️ RESET SCRIPT
Complete database reset. Saare users aur related data delete karne ke liye.

**Contains:**
- 89+ tables delete queries
- FK constraint handling
- Settings preservation
- Verification queries
- Alternative methods

**Use When:** Import se pehle database clean karna ho

---

## 🚀 Quick Start (3 Steps)

### Step 1: Read the Guide
```bash
Open: IMPORT_USERS_COMPLETE_GUIDE.md
Read: Sections 1-3 (Preparation & Export)
```

### Step 2: Run the Template
```bash
Open: QUICK_IMPORT_TEMPLATE.sql
Run: Section A on SOURCE database
Run: Section B on TARGET database
Run: Section C on TARGET database
```

### Step 3: Verify & Test
```bash
Run: Section D (Verification)
Run: Section E (Admin Setup)
Test: Login with admin credentials
```

---

## 📋 Process Summary

```
1. BACKUP current database ✓
2. EXPORT from source database ✓
3. RESET target database ✓
4. IMPORT to target database ✓
5. VERIFY import success ✓
6. LINK admin to settings ✓
7. TEST login ✓
```

---

## ⚠️ Important Notes

### Before Starting:
- [ ] Take FULL backup of current database
- [ ] Verify source database access
- [ ] Have admin credentials ready
- [ ] Allocate 30-60 minutes

### During Process:
- [ ] Run queries in correct order
- [ ] Check for errors after each step
- [ ] Verify counts match
- [ ] Don't skip verification steps

### After Completion:
- [ ] Test admin login
- [ ] Check sample users
- [ ] Verify settings linked
- [ ] Test application features

---

## 🎯 Which File to Use When?

| Situation | File to Use |
|-----------|-------------|
| First time import | IMPORT_USERS_COMPLETE_GUIDE.md |
| Quick import | QUICK_IMPORT_TEMPLATE.sql |
| Visual understanding | IMPORT_FLOWCHART.md |
| Error debugging | TROUBLESHOOTING_IMPORT.sql |
| Database cleanup | COMPLETE_RESET_ALL_TABLES.sql |

---

## 🔥 Common Scenarios

### Scenario 1: Fresh Import (No existing users)
```
1. Read: IMPORT_USERS_COMPLETE_GUIDE.md
2. Run: QUICK_IMPORT_TEMPLATE.sql (all sections)
3. Done!
```

### Scenario 2: Re-import (Users already exist)
```
1. Run: COMPLETE_RESET_ALL_TABLES.sql
2. Run: QUICK_IMPORT_TEMPLATE.sql (Section C only)
3. Verify with Section D
```

### Scenario 3: Import Failed with Error
```
1. Check error message
2. Open: TROUBLESHOOTING_IMPORT.sql
3. Run relevant troubleshooting query
4. Fix issue
5. Retry import
```

### Scenario 4: Partial Import (Only some tables)
```
1. Open: QUICK_IMPORT_TEMPLATE.sql
2. Comment out unwanted tables
3. Run modified queries
4. Verify with custom queries
```

---

## 📊 Tables Included in Import

### Core Tables (Must Import):
- ✅ auth.users
- ✅ auth.identities
- ✅ profiles

### Optional Tables:
- ⭕ customers
- ⭕ locations
- ⭕ payment_settings
- ⭕ orders (historical)
- ⭕ invoices (historical)

### Preserved Tables (Not Deleted):
- 🔒 settings (global config)
- 🔒 products
- 🔒 categories
- 🔒 offers
- 🔒 email_templates

---

## 🚨 Emergency Contacts

### If Something Goes Wrong:

1. **Stop immediately** - Don't run more queries
2. **Check error message** - Copy full error text
3. **Run diagnostic query** from TROUBLESHOOTING_IMPORT.sql
4. **Restore from backup** if needed
5. **Ask for help** with error details

### Useful Diagnostic Queries:
```sql
-- Check current state
SELECT COUNT(*) FROM auth.users;
SELECT COUNT(*) FROM profiles;

-- Check for errors
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Check FK constraints
SHOW session_replication_role;
```

---

## ✅ Success Checklist

After import, verify these:

- [ ] User count matches source database
- [ ] All admin users can login
- [ ] Settings table has 1 row with is_global=true
- [ ] No orphaned records (users without profiles)
- [ ] No FK constraint errors in logs
- [ ] Sample orders can be created
- [ ] Dashboard loads correctly
- [ ] User list shows all users

---

## 📞 Support

Agar koi problem aaye:

1. Error message copy karo
2. Troubleshooting queries run karo
3. Results share karo
4. Help milegi!

---

## 🎉 Success!

Agar sab kuch sahi se ho gaya:

```
✓ Users imported
✓ Profiles created
✓ Admin linked
✓ Settings preserved
✓ Application working

Congratulations! Import successful! 🎊
```

---

## 📚 Additional Resources

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- PostgreSQL COPY: https://www.postgresql.org/docs/current/sql-copy.html
- FK Constraints: https://www.postgresql.org/docs/current/ddl-constraints.html

---

## 🔄 Version History

- v1.0 (2026-03-21): Initial release
  - Complete import guide
  - Quick template
  - Flowchart
  - Troubleshooting queries
  - Reset script

---

**Last Updated:** March 21, 2026
**Tested On:** Supabase PostgreSQL 15+
**Language:** Hindi/English (Hinglish)
