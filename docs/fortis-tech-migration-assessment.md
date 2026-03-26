# Fortis Migration Assessment

## Current State

The current ACH integration uses the legacy Fortis Gateway API pattern:

- `POST /transactions`
- header auth with `developer-id`, `user-id`, and `user-api-key`
- gateway-specific numeric `status_id` handling in the app

That path is now workable for the existing codebase, but it is still a legacy integration surface with higher long-term maintenance risk.

## Reasons To Migrate

1. Fortis positions the legacy Gateway/Zeamster API as maintenance-oriented, while directing new integrations to `Fortis.Tech`.
2. The current implementation is tightly coupled to legacy auth headers and legacy ACH status IDs.
3. ACH requires delayed status review for returns and exceptions, so webhook/event support and richer status models matter operationally.

## Reasons Not To Migrate Immediately

1. A migration is not a small credential swap. It affects auth, request payloads, status mapping, and likely reporting workflows.
2. The existing UI and admin settings already assume the legacy provider model and stored credential shape.
3. If production go-live is blocked right now, finishing operational controls on the current path may be faster than a same-cycle gateway rewrite.

## Recommended Path

Use a phased approach:

1. Keep the current legacy Fortis ACH path only as a short-term bridge.
2. Run sandbox smoke tests and delayed ACH return monitoring on the legacy path until payment operations are stable.
3. Start a separate Fortis.Tech spike before any new certification effort or broadening processor usage.

## Migration Scope To Expect

If migrating to `Fortis.Tech`, plan for:

- credential and auth changes
- payment request/response model changes
- status and settlement mapping rewrite
- admin settings schema changes
- smoke tests and reconciliation updates
- a coexistence period where legacy Fortis transactions still need to be readable in reporting

## Recommendation

Do not treat the legacy Gateway API as the final strategic endpoint if this is a new certification or long-lived payment investment.

Use it only if:

- you need continuity with existing code now
- you already have working credentials on that stack
- you explicitly accept a later migration project
