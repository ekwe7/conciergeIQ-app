# Frontend Architecture

## Goals

- Keep guest and dashboard experiences separate and independently buildable.
- Share contracts and stable UI primitives without coupling domain workflows.
- Separate server state, transient UI state, and identity/session state.
- Make failures, session changes, and real-time updates predictable.
- Deliver incrementally around a complete MVP workflow.

## Applications

### `apps/guest-web`

Mobile-first app opened from a room QR code. Owns guest session entry, menu browsing, cart, order submission, order tracking, and room-service requests.

```text
src/
  app/                  # router, providers, query client
  features/
    guest-session/
    menu/
    cart/
    orders/
    room-requests/
  components/
    ui/
    layout/
    feedback/
  lib/                  # API client, realtime client, error mapping
  pages/
  styles/
  main.tsx
```

### `apps/dashboard-web`

Authenticated workspace for staff, reception, managers, and owners. Owns the live order queue and authorized hotel management workflows.

```text
src/
  app/                  # router, providers, query client
  features/
    auth/
    orders/
    rooms/
    stays/
    menu/
    inventory/
    payments/
    reports/
    staff/
    activity-log/
    settings/
  components/
    ui/
    layout/
    feedback/
  lib/                  # API client, realtime client, permissions, errors
  pages/
  styles/
  main.tsx
```

Create files as features are implemented; avoid generating large sets of empty placeholders.

## Shared packages

- `packages/contracts`: request/response/event types and boundary schemas.
- `packages/ui`: stable presentation primitives.
- `packages/config`: shared lint, TypeScript, and formatting configuration.
- `packages/utils`: only truly generic utilities.

Do not import app-specific feature code across apps. Keep each app independently buildable.

## Recommended stack

Follow the existing repository conventions first. Reasonable defaults are React + TypeScript + Vite, pnpm workspaces, React Router, TanStack Query, the project's established styling approach, Vitest/React Testing Library, and Playwright for critical E2E flows. Wrap the backend's actual real-time transport in a small lifecycle-managed client.

Do not add dependencies only because this document mentions them; inspect the lockfile and package setup first.

## State boundaries

- **Server state:** menu, orders, active stays, inventory, reports. Fetch through typed feature services and cache with appropriately scoped query keys.
- **Local UI state:** dialogs, tabs, expanded rows, and temporary form state.
- **Cart state:** isolated in the guest app. The server revalidates item IDs, availability, prices, and totals at submission.
- **Session/auth state:** centralize current guest session or dashboard identity. On logout, expiry, or scope change, clear protected cached data and close scoped real-time subscriptions.

## Data flow

```text
Page / feature component
        |
        v
Feature hook
        |
        v
Typed feature service
        |
        v
API client ------> Backend API
        |
        v
packages/contracts

Backend event stream --> realtime client --> query-cache update/invalidation
```

Keep components focused on rendering and interaction. Put network orchestration in feature hooks/services. Keep authoritative business rules in the backend.

## Routing and authorization

- Use explicit routes for primary journeys.
- Handle loading, unauthenticated, forbidden, and not-found states for protected dashboard URLs.
- Hide unavailable actions for usability, but rely on server authorization.
- Never use a room number or editable route parameter as proof of guest access.

## Real-time lifecycle

Connect only when auth/session prerequisites are ready. Subscribe to the smallest authorized scope, clean up on unmount or scope change, validate event payloads, update/invalidate affected queries, and reconcile after reconnect. Avoid opening one connection per component.

## Accessibility and failure states

Follow [`design-system.md`](./design-system.md). Every feature defines loading, empty, error, success, and offline/reconnect behavior. Prefer semantic HTML, accessible labels, keyboard support, and appropriate status announcements.

## Testing

- Unit tests for pure helpers and state transitions.
- Component tests for accessible interactions and error states.
- Service tests for request construction and error mapping.
- Contract tests for shared schemas and types.
- E2E tests for the MVP journey and important session/authorization boundaries.
- Reconnect and stale-data recovery tests for real-time features.

## Implementation sequence

1. Inspect workspace configuration and existing contracts.
2. Establish providers, routing, lint/typecheck/test commands.
3. Implement guest QR entry/session handling and menu.
4. Implement cart and server-confirmed order submission.
5. Implement dashboard authentication and order queue.
6. Connect staff status transitions and guest tracking.
7. Add management modules incrementally.
8. Harden accessibility, security, responsiveness, observability, and E2E coverage.

## Decision rules

Prefer the smallest design that meets current needs. Verify backend routes and events before building assumptions around them. Keep contracts framework-independent, avoid duplicating business logic in the browser, and make tenant/session boundaries explicit in cache keys and real-time subscriptions.
