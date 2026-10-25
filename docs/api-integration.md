# API Integration Guide

## Purpose

This guide defines frontend integration rules. The backend and `packages/contracts` are authoritative. Endpoint paths and payloads are intentionally not invented here.

## Confirm before implementation

For each feature, verify the actual route, HTTP method, request/response schema, error shape, authentication/session mechanism, role requirements, tenant scope, pagination, idempotency, and relevant real-time events. Record unresolved gaps instead of hardcoding guesses.

## API client

Centralize:
- Base URL and environment configuration.
- Request/response typing from `packages/contracts`.
- Credential handling as defined by the backend.
- JSON serialization and content types.
- Consistent API error parsing.
- Request cancellation where supported.
- Correlation IDs if supported by the backend.

Do not put business rules in the API client. Feature services map user actions to API operations; backend code makes authoritative business decisions.

## Environment variables

Example public variables:

```text
VITE_API_BASE_URL=
VITE_REALTIME_URL=
```

Names must match the actual implementation. Anything exposed as a Vite `VITE_` variable is public in the browser bundle. Never put database credentials, signing keys, private tokens, or other secrets in frontend environment variables. Validate required configuration at startup and do not silently fall back to production.

## Guest sessions and dashboard authentication

### Guest app
- QR codes carry an opaque, high-entropy token or URL token defined by the backend.
- Validate/exchange it through the documented flow.
- Do not infer authorization from room number, query labels, or local state.
- Follow backend rules for active stays, expiry, and revocation.
- Clear guest-scoped caches on session change or expiry.
- Never expose another guest's order history.

### Dashboard app
- Use the backend-approved authentication mechanism.
- If cookie sessions are used, follow cookie and CSRF requirements.
- If bearer tokens are used, follow the approved storage and renewal approach; do not persist sensitive tokens casually.
- Distinguish unauthenticated from forbidden responses.
- Hidden navigation is not an authorization boundary.

## Queries and mutations

- Use a server-state library such as TanStack Query if adopted by the project.
- Include the relevant tenant/user/session scope in cache keys.
- Invalidate or update cache after successful mutations.
- Cancel stale requests when identity or scope changes.
- Do not automatically retry non-idempotent order submissions unless idempotency is supported.
- Disable repeat submission while a mutation is pending.
- Never calculate authoritative prices, discounts, taxes, availability, totals, or permissions in the browser.

## Error handling

Map backend errors to safe, actionable messages. Do not show stack traces, SQL details, internal infrastructure messages, tokens, or sensitive payloads.

- Validation: explain what to correct.
- Unauthenticated/session expired: sign in or rescan QR.
- Forbidden: explain that the action is unavailable without exposing protected details.
- Not found: show a safe not-found state.
- Conflict/stale state: refresh and show latest server state.
- Rate limited: explain that the user should wait before retrying.
- Network/server error: preserve safe input and offer retry where appropriate.

Use the canonical error shape in `packages/contracts` once confirmed.

## Real-time integration

Follow the actual backend transport and contract—WebSocket, SSE, or polling—rather than adding a second transport without need.

- Connect only after session/auth context is ready.
- Subscribe to the smallest authorized scope.
- Clean up listeners and connections when scope changes.
- Validate incoming event payloads.
- Handle reconnects and duplicate events safely.
- Refetch authoritative data after reconnect.
- Never leak events between hotels or guest sessions.

## Security checklist

- [ ] No secrets in frontend bundles or environment variables.
- [ ] Hotel-owned API operations are tenant-scoped and authorized server-side.
- [ ] QR tokens are opaque and not room numbers.
- [ ] Prices and totals are server-calculated.
- [ ] UI permission checks are not treated as security controls.
- [ ] Logs and errors do not expose personal data or credentials.
- [ ] Session caches clear on logout, expiry, and scope changes.
- [ ] Mutations have appropriate duplicate-submit/idempotency handling.

## Integration tests

Test successful/failed QR exchange, active/expired stays, menu availability and price changes, order totals, status transitions, conflicts, unauthorized and cross-tenant access, and real-time reconnect/stale-cache recovery.
