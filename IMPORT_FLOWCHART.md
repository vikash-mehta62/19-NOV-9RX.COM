# User Import Process - Visual Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER IMPORT PROCESS                          │
│                  (Dusre DB se Import Kaise Kare)               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: PREPARATION (Tayyari)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✓ Current database ka backup lo                               │
│  ✓ Source database ka access check karo                        │
│  ✓ Admin credentials ready rakho                               │
│  ✓ CSV export location decide karo                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: SOURCE DATABASE - EXPORT (Data Nikalo)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source Database (Old/Other DB)                                │
│  ┌──────────────────────────────────────┐                      │
│  │  Run Export Queries:                 │                      │
│  │                                       │                      │
│  │  1. COPY auth.users → CSV            │                      │
│  │  2. COPY auth.identities → CSV       │                      │
│  │  3. COPY profiles → CSV              │                      │
│  │  4. COPY customers → CSV (optional)  │                      │
│  │  5. COPY locations → CSV (optional)  │                      │
│  └──────────────────────────────────────┘                      │
│                    ↓                                            │
│  Files Created:                                                 │
│  📄 auth_users_export.csv                                       │
│  📄 auth_identities_export.csv                                  │
│  📄 profiles_export.csv                                         │
│  📄 customers_export.csv                                        │
│  📄 locations_export.csv                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: TARGET DATABASE - RESET (Safai Karo)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Target Database (Current/New DB)                              │
│  ┌──────────────────────────────────────┐                      │
│  │  1. SET session_replication_role     │                      │
│  │     = 'replica'                      │                      │
│  │     (FK constraints disable)         │                      │
│  │                                       │                      │
│  │  2. UPDATE settings                  │                      │
│  │     SET profile_id = NULL            │                      │
│  │     (Settings preserve karo)         │                      │
│  │                                       │                      │
│  │  3. DELETE FROM 89+ tables           │                      │
│  │     (Saara user data delete)         │                      │
│  │                                       │                      │
│  │  4. DELETE FROM profiles             │                      │
│  │     (Profiles delete)                │                      │
│  │                                       │                      │
│  │  5. DELETE FROM auth.users           │                      │
│  │     DELETE FROM auth.identities      │                      │
│  │     (Auth data delete)               │                      │
│  │                                       │                      │
│  │  6. SET session_replication_role     │                      │
│  │     = 'origin'                       │                      │
│  │     (FK constraints enable)          │                      │
│  └──────────────────────────────────────┘                      │
│                    ↓                                            │
│  Result: Clean Database                                        │
│  ✓ All users deleted                                           │
│  ✓ All profiles deleted                                        │
│  ✓ Settings preserved (1 row)                                  │
│  ✓ Products/Categories intact                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: VERIFY RESET (Check Karo)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Run Verification Query:                                       │
│  ┌──────────────────────────────────────┐                      │
│  │  SELECT COUNT(*) FROM:               │                      │
│  │  • auth.users        → 0 ✓           │                      │
│  │  • auth.identities   → 0 ✓           │                      │
│  │  • profiles          → 0 ✓           │                      │
│  │  • customers         → 0 ✓           │                      │
│  │  • settings          → 1 ✓           │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
│  ⚠️ Agar koi table 0 nahi hai (except settings),               │
│     toh reset query dobara run karo!                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: TARGET DATABASE - IMPORT (Data Daalo)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Target Database (Current/New DB)                              │
│  ┌──────────────────────────────────────┐                      │
│  │  1. SET session_replication_role     │                      │
│  │     = 'replica'                      │                      │
│  │     (FK constraints disable)         │                      │
│  │                                       │                      │
│  │  2. COPY auth.users FROM CSV         │                      │
│  │     (Users import)                   │                      │
│  │                                       │                      │
│  │  3. COPY auth.identities FROM CSV    │                      │
│  │     (Identities import)              │                      │
│  │                                       │                      │
│  │  4. COPY profiles FROM CSV           │                      │
│  │     (Profiles import)                │                      │
│  │                                       │                      │
│  │  5. COPY customers FROM CSV          │                      │
│  │     (Customers import - optional)    │                      │
│  │                                       │                      │
│  │  6. COPY locations FROM CSV          │                      │
│  │     (Locations import - optional)    │                      │
│  │                                       │                      │
│  │  7. SET session_replication_role     │                      │
│  │     = 'origin'                       │                      │
│  │     (FK constraints enable)          │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: VERIFY IMPORT (Confirm Karo)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Run Verification Queries:                                     │
│  ┌──────────────────────────────────────┐                      │
│  │  1. Count Check:                     │                      │
│  │     • auth.users     → 1000+ ✓       │                      │
│  │     • auth.identities → 1000+ ✓      │                      │
│  │     • profiles       → 1000+ ✓       │                      │
│  │                                       │                      │
│  │  2. Sample Data Check:               │                      │
│  │     SELECT * FROM profiles LIMIT 10  │                      │
│  │                                       │                      │
│  │  3. Linkage Check:                   │                      │
│  │     auth.users.id = profiles.id ✓    │                      │
│  │                                       │                      │
│  │  4. Orphan Check:                    │                      │
│  │     No orphaned records ✓            │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: LINK ADMIN TO SETTINGS (Admin Setup)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────┐                      │
│  │  1. Find Admin User:                 │                      │
│  │     SELECT id FROM profiles          │                      │
│  │     WHERE role = 'admin'             │                      │
│  │                                       │                      │
│  │  2. Link to Settings:                │                      │
│  │     UPDATE settings                  │                      │
│  │     SET profile_id = 'admin_id'      │                      │
│  │     WHERE is_global = true           │                      │
│  │                                       │                      │
│  │  3. Verify Link:                     │                      │
│  │     SELECT * FROM settings           │                      │
│  │     WHERE is_global = true           │                      │
│  └──────────────────────────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: TEST LOGIN (Final Test)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✓ Admin user se login karo                                    │
│  ✓ Dashboard access check karo                                 │
│  ✓ Settings page open karo                                     │
│  ✓ User list dekho                                             │
│  ✓ Sample order create karo                                    │
│                                                                 │
│  🎉 SUCCESS! Import Complete!                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                        IMPORTANT TABLES
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ CORE TABLES (Must Import)                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. auth.users                                                  │
│     • User authentication data                                 │
│     • Encrypted passwords                                      │
│     • Email verification status                                │
│                                                                 │
│  2. auth.identities                                             │
│     • OAuth provider data                                      │
│     • Links users to providers                                 │
│                                                                 │
│  3. profiles                                                    │
│     • User profile information                                 │
│     • Business details                                         │
│     • License numbers                                          │
│     • Role and permissions                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ OPTIONAL TABLES (Import if needed)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  4. customers                                                   │
│     • Customer records                                         │
│     • Linked to profiles                                       │
│                                                                 │
│  5. locations                                                   │
│     • Business locations                                       │
│     • Shipping addresses                                       │
│                                                                 │
│  6. payment_settings                                            │
│     • Payment gateway configs                                  │
│     • Per-profile settings                                     │
│                                                                 │
│  7. orders (if historical data needed)                         │
│     • Past orders                                              │
│     • Order history                                            │
│                                                                 │
│  8. invoices (if historical data needed)                       │
│     • Past invoices                                            │
│     • Payment records                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                        COMMON ERRORS
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ ERROR 1: FK Constraint Violation                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Error Message:                                                 │
│  "violates foreign key constraint"                             │
│                                                                 │
│  Solution:                                                      │
│  • Check if table is in delete list                            │
│  • Add missing table to reset query                            │
│  • Use session_replication_role = 'replica'                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ERROR 2: CSV File Not Found                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Error Message:                                                 │
│  "could not open file for reading"                             │
│                                                                 │
│  Solution:                                                      │
│  • Check file path (use absolute path)                         │
│  • Windows: Use double backslash \\                            │
│  • Check file permissions                                      │
│  • Verify file exists                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ERROR 3: Duplicate Key Violation                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Error Message:                                                 │
│  "duplicate key value violates unique constraint"              │
│                                                                 │
│  Solution:                                                      │
│  • Verify reset was complete                                   │
│  • Check for existing data                                     │
│  • Run reset query again                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ERROR 4: Column Mismatch                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Error Message:                                                 │
│  "column does not exist" or "extra data after last column"     │
│                                                                 │
│  Solution:                                                      │
│  • Check schema versions match                                 │
│  • Run migrations on target DB                                 │
│  • Specify columns explicitly in COPY                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                        QUICK COMMANDS
═══════════════════════════════════════════════════════════════════

Export (Source DB):
  COPY auth.users TO '/tmp/users.csv' WITH CSV HEADER;

Import (Target DB):
  COPY auth.users FROM '/tmp/users.csv' WITH CSV HEADER;

Count Check:
  SELECT COUNT(*) FROM auth.users;

Find Admin:
  SELECT id, email FROM profiles WHERE role = 'admin';

Link Settings:
  UPDATE settings SET profile_id = 'admin_id' WHERE is_global = true;


═══════════════════════════════════════════════════════════════════
                        TIME ESTIMATES
═══════════════════════════════════════════════════════════════════

Small DB (< 1000 users):     15-30 minutes
Medium DB (1000-10k users):  30-60 minutes
Large DB (10k+ users):       1-2 hours

Steps breakdown:
  • Export:  5-15 minutes
  • Reset:   2-5 minutes
  • Import:  5-30 minutes
  • Verify:  3-10 minutes
  • Setup:   5-10 minutes


═══════════════════════════════════════════════════════════════════
                        CHECKLIST
═══════════════════════════════════════════════════════════════════

Before Starting:
  [ ] Backup current database
  [ ] Source database access confirmed
  [ ] CSV export location ready
  [ ] Admin credentials ready

During Process:
  [ ] Export completed successfully
  [ ] CSV files downloaded
  [ ] Reset verified (all counts = 0)
  [ ] Import completed without errors
  [ ] Counts match source database

After Completion:
  [ ] Admin can login
  [ ] Settings linked correctly
  [ ] Sample users visible
  [ ] No FK errors in logs
  [ ] Application working normally

═══════════════════════════════════════════════════════════════════
