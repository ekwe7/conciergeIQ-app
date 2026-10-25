# Guest Experience CRM

A hotel guest-service platform that lets guests scan a room QR code to browse services, place food or item orders, request assistance, and track progress without installing an app. Staff manage requests in an authenticated dashboard; managers and owners review operations and business performance.

> **Implementation note:** This is architecture guidance. Verify route names, payloads, authentication, and event names against the backend and `packages/contracts` before wiring the UI.

## Workspace

- `apps/api` — backend API, business rules, persistence, authentication, and event publishing.
- `apps/guest-web` — mobile-first guest experience.
- `apps/dashboard-web` — staff and management workspace.
- `packages/contracts` — shared API, domain, and event types.
- `packages/ui` — stable reusable UI primitives.
- `packages/config` — shared TypeScript, lint, and formatting configuration.
- `docs/` — architecture and implementation guides.

## Core journey

1. Guest scans the QR code assigned to their room.
2. The guest app validates an opaque QR token and establishes a session for an active stay.
3. Guest browses the menu or service catalogue.
4. Guest submits an order or room-service request.
5. The server validates stay status, availability, prices, totals, and business rules.
6. Staff process the request in the dashboard.
7. Guest sees the latest confirmed status.

## Core principles

- The server is authoritative for authorization, active stays, availability, prices, totals, and order status.
- QR tokens are random opaque values; never use a room number as a credential.
- Every hotel-owned record and query must be scoped to the authenticated hotel.
- Guests can access only orders permitted by their active session.
- UI permission checks improve usability but do not replace backend authorization.
- Shared API/event definitions belong in `packages/contracts`.
- Real-time events improve freshness but are not the source of truth; reconcile with the API after reconnects.

## Suggested layout

```text
apps/
  api/
  guest-web/
  dashboard-web/
packages/
  contracts/
  ui/
  config/
docs/
  api-integration.md
  contracts-guide.md
  design-system.md
  frontend-architecture.md
  order-lifecycle.md
tests/
  e2e/
```

Adapt the structure to the existing repository rather than moving or overwriting working code without review.

## Local development

Use the Node.js version declared by the repository and enable Corepack if pnpm is used.

```bash
corepack enable
pnpm install
pnpm -r lint
pnpm -r typecheck
pnpm -r test
```

These commands are examples: ensure the scripts exist in the relevant package manifests and check the root `package.json` for canonical commands. Create local environment files from `.env.example` where provided. Never commit secrets, production tokens, or real guest data.

## Applications

### Guest web

QR/session entry, menu, item details, cart, checkout/confirmation, order tracking, and service requests. Optimize for mobile browsers, intermittent connectivity, clear prices, and accessible feedback.

### Dashboard web

Sign-in, live order queue, order details, rooms/stays, menu management, inventory, payments, reports, staff, settings, and activity history. Expose only modules and actions permitted for the user's role and hotel.

## Documentation

- [`docs/prd.md`](docs/prd.md) — product scope, functional requirements, and acceptance criteria.
- [`packages/contracts/README.md`](packages/contracts/README.md) — shared API and event contracts.
- [`docs/frontend-architecture.md`](docs/frontend-architecture.md) — app boundaries, state strategy, and data flow.
- [`docs/api-integration.md`](docs/api-integration.md) — REST endpoints, headers, and real-time WebSocket rules.
- [`docs/order-lifecycle.md`](docs/order-lifecycle.md) — order state machine, transitions, and cancellation rules.
- [`docs/design-system.md`](docs/design-system.md) — visual tokens, typography, and accessibility standards.
- [`docs/ui-ux/README.md`](docs/ui-ux/README.md) — screen renders, mockups, and UI prototypes.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — development workflow, code standards, and PR checklist.

## MVP recommendation

Deliver one complete vertical slice first:

**QR entry → guest session → menu → cart → order submission → staff queue → staff status update → guest tracking.**

This validates the core workflow and reveals API, authorization, and real-time gaps early.

## Definition of ready

Before implementing a feature, identify its user, permission boundary, contract types, loading/empty/error states, acceptance criteria, and tests. If the backend contract is undefined, agree on it before hardcoding assumptions in the UI.
