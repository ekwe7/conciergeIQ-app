# End-to-End Tests (`tests/e2e`)

Cross-application end-to-end browser test suite using **Playwright**.

---

## Purpose

While unit and component tests verify isolated logic in `apps/guest-web` and `apps/dashboard-web`, the E2E suite verifies cross-application vertical slices and user journeys across real browser sessions.

---

## Key Test Scenarios

1. **Guest Order Happy Path:**
   - Guest visits entry URL with valid QR token `?token=VALID_STAY_TOKEN`.
   - App initialises session and displays room menu.
   - Guest adds items and customisations to cart.
   - Guest proceeds through checkout with idempotency key.
   - Order confirmation appears with status `PENDING`.

2. **Cross-App Order Progress & Sync:**
   - Order submitted by guest appears on the Staff Live Orders Board in `apps/dashboard-web`.
   - Staff accepts order → status transitions to `IN_PROGRESS`.
   - Guest tracking screen in `apps/guest-web` receives WebSocket event and updates status to `IN_PROGRESS` without full page reload.
   - Staff marks order `DELIVERED` → Guest view updates accordingly.

3. **Session Expiry & Invalid Token Handling:**
   - Navigating to guest app with expired or tampered token shows clear error/recovery view.
   - Ordering actions are disabled.

4. **Role Permission Boundaries:**
   - Staff user attempts to access manager-only route (`/menu-management` or `/reports`) → redirected or shown forbidden feedback.
   - Backend contract enforcement verified.

---

## Running E2E Tests Locally

### 1. Install Playwright Browsers
```bash
pnpm exec playwright install --with-deps
```

### 2. Run Tests
```bash
# Run all end-to-end test specs in headless mode
pnpm --filter @conciergeiq/e2e test

# Run tests with interactive Playwright UI
pnpm --filter @conciergeiq/e2e test --ui

# Debug specific test file
pnpm exec playwright test tests/e2e/guest-order.spec.ts --debug
```

---

## Test Guidelines

- **Mock API / Contracts:** Use contract-compliant API mocks for local E2E runs unless running against an integration test environment.
- **Accessible Selectors:** Prefer querying by user-facing roles and labels (`getByRole`, `getByLabelText`, `getByText`) rather than brittle CSS class selectors or test IDs.
- **Tenant Context Isolation:** Assert that tenant/hotel data contexts are not mixed between guest orders and staff boards.
