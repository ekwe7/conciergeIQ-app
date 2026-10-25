# Product Requirements Document (PRD)
## Guest Experience CRM — Frontend Applications

- **Document status:** Draft for implementation planning
- **Product scope:** Frontend only
- **Backend:** Built separately; frontend integrates through agreed API and event contracts
- **Applications:** Guest Web App and Hotel Management Dashboard

---

## 1. Product Overview

Guest Experience CRM is a hotel guest-service platform that uses a QR code in each room to give guests quick access to hotel services without installing an application or creating a traditional account. Guests can browse the menu, place orders, request room items, and follow order progress. Hotel employees manage orders and hotel operations through a separate dashboard, while managers and owners access permitted operational and reporting views.

This PRD specifies the browser-based frontend experiences. It does not redefine backend business rules, database schemas, payment processing, authorization, or event delivery. Those responsibilities remain in the backend and shared contracts.

---

## 2. Problem Statement

Hotel guests may need to call reception or use an in-room telephone to order food or request items. This can be inconvenient for guests and creates manual work for staff. Staff may also lack a single, timely view of incoming orders and their status. Managers and owners need accessible operational information without relying on informal updates.

The frontend should make guest requests simple and give hotel teams a clear interface for acting on them, while accurately reflecting backend state.

---

## 3. Product Goals

- Let a guest enter the service experience by scanning a room QR code, with no app installation.
- Make browsing, ordering, and requesting room items straightforward on mobile devices.
- Show clear order status and update it when authoritative backend events arrive.
- Give authorized hotel staff a usable queue for receiving and progressing orders.
- Provide role-appropriate interfaces for room/stay operations, menu and inventory management, payments, activity logs, and reports as supported by backend APIs.
- Share UI patterns, validation conventions, and API/event contracts across both apps.
- Meet baseline accessibility, responsiveness, reliability, and security expectations.

---

## 4. Non-Goals

- Building or changing the Fastify backend, database, migrations, business rules, or event outbox.
- Calculating authoritative prices, taxes, fees, discounts, or totals in the browser.
- Treating frontend route guards as security enforcement.
- Creating a native iOS or Android application.
- Implementing offline order submission in the initial release.
- Adding the AI guest helper, advanced upselling, or other Stage 2 features unless separately approved.
- Replacing the backend's authentication, authorization, hotel isolation, or audit mechanisms.
- Guaranteeing payment settlement from a client-side success screen.

---

## 5. Users and Roles

- **Guest:** Arrives from a QR code, browses available services, submits orders or room requests, and checks progress. A guest should not need to know the room number or enter hotel credentials.
- **Staff:** Views incoming orders and performs permitted status transitions, such as accepting, processing, or delivering an order.
- **Receptionist:** Uses permitted room and stay workflows, including check-in and check-out, when those backend capabilities are available.
- **Manager:** Oversees operations and uses authorized menu, stock, staff, and reporting capabilities.
- **Admin / Owner:** Uses the highest level of permitted hotel administration and reporting capabilities. The exact access hierarchy and permissions must match backend contracts.

> **Role rule:** The UI may hide or disable unavailable actions for clarity, but the backend remains authoritative for every permission and resource access decision.

---

## 6. Applications and Information Architecture

### 6.1 Guest Web App — `apps/guest-web`

**Primary routes** (final route patterns must align with backend QR/session contracts):
- Guest entry/session initialization from QR token
- Menu browsing
- Cart
- Checkout / order submission
- Order tracking and order history for the active guest session
- Room-service item requests
- Error, expired-session, unavailable-service, and not-found states

**Suggested feature areas:**
- `guest-session`: QR token handling and session initialization
- `menu`: menu categories, item details, availability
- `cart`: local cart state and quantity changes
- `orders`: order submission, confirmation, status tracking
- `room-requests`: towels, toiletries, and other supported requests
- `lib`: API client, WebSocket lifecycle, error handling
- `components/ui`: accessible shared primitives

### 6.2 Hotel Management Dashboard — `apps/dashboard-web`

**Primary areas:**
- Login and session handling
- Live order queue and order details
- Rooms and QR-code-related room information, as supported by APIs
- Check-in / check-out and active stays
- Menu management
- Inventory and stock
- Payments / mark-as-paid workflow, when supported
- Staff management and permissions, as supported
- Activity log
- Reports and owner views
- Hotel settings and branding, as supported

**Suggested feature areas:**
- `auth`
- `orders`
- `rooms`
- `stays`
- `menu`
- `inventory`
- `payments`
- `staff`
- `activity-log`
- `reports`
- `settings`

> Do not implement a screen against an endpoint that has not been agreed. Use a documented mock adapter during parallel development and replace it with the real API adapter when the contract is ready.

---

## 7. Core User Journeys

### 7.1 Guest Enters from QR Code
1. Guest scans the QR code.
2. The app extracts the opaque token from the URL and submits it to the backend session endpoint.
3. The backend validates the token and active stay and returns the permitted guest session context.
4. The app loads the menu and available services.
5. If the token is invalid, expired, or the stay is inactive, show a clear recovery message and do not enable ordering.

### 7.2 Guest Places an Order
1. Guest browses available menu items.
2. Guest adds items and quantities to the cart.
3. The app displays an indicative cart summary using server-provided prices; it must not determine the authoritative payable amount.
4. Guest submits the order with the backend-required idempotency mechanism.
5. The app displays success only after a confirmed backend response.
6. On timeout or uncertain response, provide a safe retry/reconciliation path that avoids duplicate orders.

### 7.3 Guest Tracks an Order
1. The app loads the order status from the backend.
2. It subscribes to authorized live updates using the agreed WebSocket contract.
3. It renders the supported status sequence: `PENDING`, `IN_PROGRESS`, `DELIVERED`, or `CANCELLED`.
4. On reconnect, it re-fetches authoritative state or uses the agreed catch-up mechanism.
5. It handles duplicate, delayed, or out-of-order events without regressing to an older status.

### 7.4 Staff Processes an Order
1. Authorized staff sign in and open the order queue.
2. The dashboard loads orders scoped by the backend to the staff member's hotel and permissions.
3. Incoming orders appear through refresh/polling or WebSocket events according to the agreed contract.
4. Staff opens an order and performs an allowed transition.
5. The app confirms the transition only after backend acceptance and updates the view from the response/event.
6. Errors such as stale status, missing permission, or network loss are shown clearly.

### 7.5 Hotel Operations and Reporting
1. Authorized users open a permitted management area.
2. The app requests data from the relevant backend endpoint.
3. Forms validate input for usability and submit to the server.
4. The app reflects the server's saved state and displays validation or permission errors.
5. Reports display only the metrics and date ranges provided by the reporting API.

---

## 8. Functional Requirements

- **FR-1: Responsive experience**
  - Guest flows must work on small mobile screens and common modern mobile browsers.
  - Dashboard must adapt to desktop and tablet widths; critical order actions must remain usable at narrower widths.
  - Layouts must not rely on hover for essential actions.
- **FR-2: Guest session**
  - Read the opaque QR token from the agreed URL format.
  - Send it to the backend session endpoint; never derive a room number from the token.
  - Avoid exposing tokens in analytics, application logs, or error reports.
  - Handle invalid, expired, or inactive-stay responses.
  - Do not persist more guest/session information than necessary.
- **FR-3: Menu browsing**
  - Load categories, items, prices, and availability from the backend.
  - Show loading, empty, unavailable, and failure states.
  - Do not present unavailable items as orderable.
  - Refresh or reconcile item availability before final order submission as required by the API.
- **FR-4: Cart and order submission**
  - Support adding/removing items and changing quantities.
  - Show a clear summary and server-provided pricing information.
  - Submit only the fields defined in shared contracts.
  - Use the backend's idempotency mechanism for order creation.
  - Prevent accidental repeated submission while a request is pending, without relying on this UI guard for server correctness.
  - Preserve a recoverable state when a request fails, without claiming that an order exists when the result is unknown.
- **FR-5: Order status and room requests**
  - Display order status in plain language with accessible status indicators.
  - Subscribe to only the events authorized by the backend contract.
  - Reconnect safely and reconcile state after interruptions.
  - Show cancellation reason where returned and appropriate.
  - Submit room-item requests only through supported backend APIs.
- **FR-6: Dashboard authentication and authorization UX**
  - Provide sign-in/sign-out and session-expiry handling according to backend auth design.
  - Handle unauthorized and forbidden responses distinctly.
  - Display navigation and actions appropriate to the user's role.
  - Never treat client-side role data as sufficient authorization.
- **FR-7: Live order management**
  - Display the staff order queue with useful status grouping and order details.
  - Reflect new orders and changes through the agreed real-time mechanism.
  - Provide clear pending, loading, reconnecting, and stale-data states.
  - Support only backend-allowed status transitions and require a cancellation reason if the backend contract requires it.
  - Prevent duplicate action submissions and reconcile conflicting updates.
- **FR-8: Hotel management modules**
  - Provide forms, tables, filters, and details for rooms, stays, menu, inventory, staff, and settings where corresponding endpoints exist.
  - Use server responses as the source of truth.
  - Show validation errors next to relevant fields and a useful summary for general errors.
  - Confirm destructive or consequential actions.
  - Do not invent management actions that are absent from the backend API.
- **FR-9: Payments and reports**
  - Show payment state returned by the backend.
  - Treat "mark as paid" as a backend-controlled action and confirm only after success.
  - Do not collect or store raw card data unless a separately approved payment-provider flow requires it.
  - Render report metrics, filters, and date ranges supported by the reporting API.
  - Clearly indicate empty data and failed report requests.
- **FR-10: Activity log**
  - Display backend-provided activity records with timestamps, actor/action details, and supported filters.
  - Do not fabricate or edit audit records in the browser.
- **FR-11: Branding and localization readiness**
  - Keep reusable visual tokens and text resources structured for future hotel branding and localization.
  - Apply dynamic branding only from trusted, validated backend data.
  - Full multi-language support is out of the initial scope unless explicitly prioritized.

---

## 9. Design and UX Principles

- Mobile-first for guests; task-focused and information-dense for staff.
- Clear visual hierarchy, legible typography, adequate touch targets, and predictable navigation.
- Every data-driven view includes loading, empty, error, and success states.
- Use optimistic updates only when safe and reconcile them against server responses.
- Use confirmation for consequential actions, not for every small interaction.
- Keep order status labels consistent across guest and staff apps.
- Share design tokens and reusable primitives through `packages/ui`; do not force unrelated workflows into one generic component.
- Avoid decorative animation that delays ordering or order handling.

---

## 10. Technical Requirements and Architecture

### Stack
- React
- TypeScript
- Vite
- pnpm workspace
- React Router
- TanStack Query for server-state caching and invalidation
- Tailwind CSS for styling
- A tested WebSocket client/service that matches the backend contract
- Vitest and React Testing Library for unit/component tests
- Playwright for end-to-end browser tests, if approved in the workspace

### Monorepo Boundaries
- `apps/guest-web`: guest-only UI and workflows
- `apps/dashboard-web`: staff/management UI and workflows
- `packages/contracts`: shared API/event types and schemas owned with the backend team
- `packages/ui`: framework-level reusable visual components
- `packages/config`: shared lint, TypeScript, and formatting configuration
- `packages/utils`: only small, genuinely cross-app utilities

### API Integration
- Centralize base URL, headers, request serialization, and error normalization in an API client per app or shared client package.
- Validate external data at runtime where contracts or trust boundaries require it; TypeScript types alone do not validate network responses.
- Keep request/response and event definitions aligned with `packages/contracts`.
- Avoid direct fetch calls scattered throughout components.
- Do not put secrets in Vite client environment variables. Anything bundled into the browser is public.

### Real-Time Behavior
- Centralize connection lifecycle, subscriptions, and cleanup.
- Handle reconnect with backoff and avoid duplicate listeners.
- Re-fetch or catch up after reconnect; the browser must not assume it received every event.
- Ignore duplicate events and prevent older events from overwriting newer state when event metadata supports ordering.
- Show a connection/staleness indicator where the user needs to know the data may be delayed.

---

## 11. Security and Privacy Requirements

- Backend enforces hotel isolation, role permissions, active-stay checks, valid order transitions, and authoritative prices.
- Do not store room numbers in QR tokens or attempt to decode tokens client-side.
- Do not log QR tokens, credentials, session secrets, or sensitive request payloads.
- Use the backend's approved cookie/token storage strategy; do not independently invent an authentication scheme.
- Render user-generated or hotel-provided text safely; avoid unsafe HTML injection.
- Avoid placing sensitive data in URL query strings unless the backend contract explicitly requires it and the risk is reviewed.
- Apply dependency scanning and lint/security checks in CI.
- Follow applicable privacy and retention decisions made by the product owner.

---

## 12. Accessibility Requirements

Target WCAG 2.2 AA where practical:
- Semantic HTML and correct heading hierarchy.
- Keyboard-accessible dashboard navigation and dialogs.
- Visible focus indicators.
- Form labels and field-level error associations.
- Sufficient text and interface contrast.
- Status changes announced appropriately to assistive technology without excessively interrupting users.
- Do not communicate status using color alone.
- Respect reduced-motion preferences.

---

## 13. Performance and Reliability

Initial targets, to be confirmed against deployment conditions:
- Guest menu should become usable quickly on a typical mobile connection; target Largest Contentful Paint (LCP) of 2.5 seconds or less at the 75th percentile after production measurement.
- Avoid unnecessary JavaScript and lazy-load noncritical dashboard areas.
- Paginate or incrementally load large order, activity, and report lists.
- Avoid polling and WebSocket subscriptions that duplicate the same data without a clear reason.
- Show a recoverable error instead of a blank screen when requests fail.
- Prevent duplicate orders through backend idempotency, not merely disabled buttons.
- Measure performance with production-like builds and realistic network conditions.

---

## 14. Analytics and Observability

If product analytics are approved, track only necessary, privacy-reviewed events, such as:
- Guest session started
- Menu loaded
- Item added to cart
- Order submission attempted / confirmed / failed
- Order tracking opened
- Staff order opened and status action attempted / confirmed

Do not include QR tokens, credentials, room-identifying data, or sensitive payloads in analytics. Client errors should include a correlation/request ID when provided by the backend, while excluding secrets.

---

## 15. Testing Strategy

### Unit Tests
- Cart quantity and removal behavior
- Formatting of server-provided prices and statuses
- Form validation and error mapping
- Permission-based navigation presentation
- WebSocket duplicate/reconnect handling

### Component Tests
- Menu loading, empty, unavailable, and failure states
- Cart and checkout submission states
- Order status changes
- Dashboard queue actions and error handling
- Accessible forms, dialogs, and navigation

### Integration Tests
- Guest session against a mocked contract-compliant API
- Order submission and idempotency-related UI behavior
- Dashboard authentication and permission responses
- WebSocket event delivery, reconnect, and state reconciliation

### End-to-End Tests
- Valid QR token → guest menu → cart → order confirmation
- Invalid/expired token → clear blocked state
- Guest order status updates after a staff action
- Staff login → receive order → progress order → guest sees status
- Forbidden role cannot successfully perform restricted backend action
- Cross-hotel data isolation is verified by backend/API tests; frontend tests should also verify the UI does not accidentally mix tenant contexts.

> Frontend tests cannot replace backend integration and security tests.

---

## 16. Acceptance Criteria

The frontend MVP is acceptable when:
1. Both applications install, run, lint, type-check, test, and build from documented workspace commands.
2. The guest app can initialize a session from a valid QR token using the agreed API.
3. Guests can browse backend-provided menu data and submit an order using the agreed contracts.
4. The UI never invents authoritative prices or claims success before server confirmation.
5. Guests can view order status and recover from temporary real-time disconnection by reconciling with backend state.
6. Authorized staff can view orders and perform supported status transitions.
7. Dashboard navigation and actions reflect roles while backend authorization remains authoritative.
8. Every major screen has loading, empty, error, and success handling as applicable.
9. The main guest journey works on a mobile viewport, and dashboard critical workflows work on desktop and tablet.
10. Accessibility checks cover keyboard use, focus, labels, and status announcements.
11. CI runs lint, type-check, tests, and production builds.
12. No secrets or sensitive QR/session tokens are exposed in client bundles, logs, or analytics.

---

## 17. Delivery Phases

- **Phase F0 — Foundation**
  - Confirm workspace and package boundaries.
  - Configure Vite, TypeScript, routing, styling, linting, tests, environment validation, and CI.
  - Establish API client conventions, error model, and shared UI tokens.
- **Phase F1 — Guest Entry and Menu**
  - QR session initialization
  - Session expiry/error states
  - Menu browsing and item availability
- **Phase F2 — Guest Order Flow**
  - Cart
  - Checkout and safe submission
  - Order confirmation and tracking
  - Room-item requests if endpoint contracts are ready
- **Phase F3 — Dashboard Foundation**
  - Authentication/session lifecycle
  - Dashboard shell and role-aware navigation
  - Shared table, form, dialog, and feedback components
- **Phase F4 — Staff Order Operations**
  - Order queue
  - Live updates and reconnect handling
  - Order detail and permitted status actions
- **Phase F5 — Hotel Operations**
  - Rooms and stays
  - Menu and inventory
  - Staff and settings, according to available APIs
- **Phase F6 — Owner and Financial Views**
  - Payments
  - Activity log
  - Reports
- **Phase F7 — Hardening**
  - Accessibility and responsive review
  - End-to-end testing
  - Performance measurement
  - Security review, error states, and production build verification

> A phase may begin in parallel with backend development only when its API and event contracts are agreed. Mock adapters must be clearly marked and must not become an accidental production dependency.

---

## 18. Dependencies and Decisions Required

Before implementation of each feature, confirm:
- The relevant endpoint, request/response schema, and error format exist in `packages/contracts`.
- Authentication and session transport are documented.
- WebSocket authentication, event names, payloads, ordering/version metadata, and reconnect/catch-up behavior are agreed.
- QR URL format and token lifetime/rotation behavior are defined.
- Supported order status transitions and cancellation requirements are documented.
- Which roles may use each dashboard feature is documented.
- Payment UI behavior and what constitutes a confirmed payment state are agreed.
- Branding and localization requirements are prioritized.
- Deployment origins, CORS, cookie policy, and environment variable names are documented by the backend/deployment owner.

---

## 19. Risks and Mitigations

| Risk | Mitigation |
| :--- | :--- |
| **Frontend built against changing APIs** | Agree contracts first; use typed mock adapters and contract tests. |
| **Duplicate orders after timeouts** | Use server idempotency and explicit uncertain-result recovery. |
| **Stale or duplicated live events** | Central connection manager, deduplication, and authoritative refresh. |
| **Frontend-only authorization** | Enforce permissions on backend and test forbidden actions. |
| **Guest token leakage** | Keep tokens out of logs/analytics and minimize persistence. |
| **Too much shared abstraction too early** | Share only proven primitives and utilities. |
| **Dashboard scope becomes too large** | Deliver by feature and role; prioritize live order operations. |
| **Missing backend endpoints block screens** | Mark features blocked; do not fabricate production behavior. |

---

## 20. Definition of Done

A frontend task is complete only when:
- It implements the agreed scope without unrelated features.
- Types and schemas align with `packages/contracts`.
- Loading, empty, success, failure, and permission states are handled as applicable.
- Responsive and accessibility expectations are met.
- Unit/component tests are added, with integration/E2E coverage where appropriate.
- Lint, type-check, tests, and production build pass.
- No secrets or sensitive tokens are exposed.
- The pull request describes the behavior, links the task, lists checks run, and includes screenshots or a short recording for visual changes.
- Another developer reviews and approves the pull request.

---

## 21. Open Questions

1. Is the frontend part of the same repository and pnpm workspace as the backend?
2. What authentication/session mechanism will the backend expose to dashboard users?
3. What exact QR URL format and guest session response will be used?
4. Will the dashboard's initial release include all management modules or only orders, rooms/stays, menu/stock, and payments?
5. Which browsers and minimum device sizes must be supported?
6. Is multi-language support required for the MVP?
7. What payment provider and payment states should the UI represent?
8. Which analytics, if any, are approved?

> **Product recommendation:** Ship the first usable slice as guest QR entry → menu → order → staff order queue → staff status update → guest tracking. This validates the core experience before the team invests in the full management and reporting surface.
