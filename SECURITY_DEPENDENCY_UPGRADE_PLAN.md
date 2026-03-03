# Security Dependency Upgrade Plan

## Objective
Keep production dependencies at zero known vulnerabilities while minimizing workflow breakage.

## Non-Breaking Track (Safe First)

These updates are expected to be safe and are now applied:

- Frontend
  - `axios` -> `^1.13.6`
  - `swiper` -> `^12.1.2`
  - `write-excel-file` added for Excel export
  - `xlsx` removed
- Server
  - `axios` -> `^1.13.2`
  - `nodemailer` -> `^8.0.1`
  - `overrides.axios` added to force secure transitive axios

Validation:
- `npm audit --omit=dev` (root): `0` vulnerabilities
- `npm audit --omit=dev` (server): `0` vulnerabilities
- `npm run build`: passes

## Breaking / Higher-Risk Track

These were higher risk and need compatibility checks before release. They are now upgraded and verified by build:

- `jspdf` -> `^4.2.0`
- `jspdf-autotable` -> `^5.0.7`

Risk controls used:
- Rebuilt frontend after upgrade.
- Verified generated bundle includes updated `jspdf`/`autotable` chunks.
- Switched analytics Excel export away from `xlsx` to avoid unresolved upstream security issues.

## Ongoing Policy

1. Run monthly:
   - `npm audit --omit=dev`
   - `npm outdated`
2. Apply non-breaking updates immediately.
3. Batch breaking updates behind:
   - build verification
   - smoke test for payments, PDF generation, and analytics export
4. Keep `server/package.json` override for axios unless `authorizenet` publishes a fully patched dependency chain.
