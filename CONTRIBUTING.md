# Contributing Guidelines

Thank you for contributing to **Guest Experience CRM (`conciergeIQ`)**! This guide sets out the workflow, standards, and Definition of Done for developing across the monorepo.

---

## 1. Development Principles

1. **Backend & Contracts are Authoritative:** Never calculate prices, invent HTTP routes, or construct mock permissions client-side without consulting [`packages/contracts`](./packages/contracts/README.md).
2. **Strict Application Boundaries:** Keep guest workflows in `apps/guest-web` and staff workflows in `apps/dashboard-web`. Only share genuine primitives through `packages/ui` and cross-app helpers in `packages/utils`.
3. **Privacy by Default:** Never log opaque QR tokens, session tokens, guest credentials, or room numbers to console logs, analytics, or error tracking.
4. **Resilience & State Recovery:** Design network and WebSocket handlers to handle reconnects with backoff and reconcile against the authoritative server state.

---

## 2. Getting Started

### Prerequisites
- Node.js `22.x` (or `20.x` LTS minimum)
- `pnpm` (version `9.x`):
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

### Workspace Commands
```bash
# Install workspace dependencies
pnpm install

# Run development servers concurrently
pnpm -r --parallel dev

# Run workspace-wide quality checks
pnpm -r lint
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

---

## 3. Branching & Commit Conventions

### Branch Naming
- `feature/<ticket-or-scope>-short-description`
- `fix/<ticket-or-scope>-short-description`
- `docs/<description>`

### Commit Messages
We follow the **Conventional Commits** specification:
- `feat(guest-web): add item customizer modal`
- `fix(dashboard-web): reconcile stale order state on reconnect`
- `docs(contracts): update order transition payload schema`
- `refactor(ui): extract reusable dialog primitive`
- `test(e2e): add guest checkout happy path test`

---

## 4. Definition of Done Checklist

Before submitting a Pull Request, verify every item on this checklist (aligned with PRD Section 20):

- [ ] **Scope:** Implements only the agreed scope without unrelated refactors.
- [ ] **Contracts:** Types, DTOs, and schemas align with `packages/contracts`.
- [ ] **Centralized API Calls:** No raw `fetch` calls scattered in React components; all queries/mutations go through centralized API client hooks.
- [ ] **State Handling:** Loading, empty, success, failure, and permission-denied states are explicitly rendered.
- [ ] **Responsiveness:** Guest screens tested on mobile viewports (≤ 390px); Dashboard screens tested on tablet and desktop.
- [ ] **Accessibility (WCAG 2.2 AA):**
  - Logical keyboard navigation (`Tab` / `Shift+Tab`) and visible focus indicators.
  - Interactive elements have accessible names and aria attributes.
  - Color is never the sole indicator of status.
  - Form inputs are associated with `<label>` and field-level error messages.
- [ ] **Security:** No secrets or sensitive tokens exposed in client bundles or analytics payloads.
- [ ] **Testing:** Unit/component tests added for business logic and UI states.
- [ ] **Automated Checks:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass with zero errors.
