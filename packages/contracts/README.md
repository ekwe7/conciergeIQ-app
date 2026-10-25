# Shared Contracts Guide

## Purpose

`packages/contracts` is the framework-independent source for the shapes of data exchanged between the API, guest app, dashboard, and real-time consumers. Contracts describe interfaces; they do not implement business rules, database access, HTTP handlers, UI state, or persistence.

## What belongs here

- Public domain identifiers and enums.
- API request and response types/schemas.
- Standard API error shapes and pagination metadata.
- Real-time event envelopes and payloads.
- Runtime validation schemas, if the repository has selected a schema library.
- Contract-level examples and tests.

Do not put ORM entities, route handlers, React components, environment-specific configuration, secrets, or internal implementation-only types here.

## Suggested layout

```text
packages/contracts/
  src/
    index.ts
    common/
      identifiers.ts
      errors.ts
      pagination.ts
    guest/
      session.ts
      menu.ts
      orders.ts
      requests.ts
    dashboard/
      auth.ts
      orders.ts
      rooms.ts
      stays.ts
    events/
      envelope.ts
      order-events.ts
    schemas/        # only if runtime schemas are used
  tests/
  package.json
  tsconfig.json
  README.md
```

Adapt this layout to the current package instead of duplicating existing definitions.

## Naming and design

- Prefer explicit names such as `CreateOrderRequest`, `CreateOrderResponse`, and `OrderStatusChangedEvent`.
- Separate request types from response/view types when their fields differ.
- Use a consistent enum or string-literal-union style.
- Use documented ISO 8601 timestamps, preferably UTC.
- Represent money precisely. A recommended wire format is integer minor units plus currency, e.g. `{ amountMinor: 1250, currency: "NGN" }`. If the backend already uses another format, document it and remain consistent. Never use floating-point arithmetic for authoritative totals.
- Keep identifiers opaque. A room number is a display label, not a security credential.
- Define whether fields are optional, nullable, paginated, or complete snapshots.

## Illustrative example only

```ts
export type OrderStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "CANCELLED";

export interface Money {
  amountMinor: number;
  currency: string;
}

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  total: Money;
  createdAt: string;
  updatedAt: string;
}
```

These names and shapes are examples, not a claim that these exact exports already exist. Align them with the real backend before consuming them.

## Runtime validation

TypeScript types do not validate data at runtime. Validate untrusted request data on the server, QR token exchange input, WebSocket payloads, and third-party or persisted data that may not match the current contract. Where practical, derive types from a single canonical runtime schema to avoid drift.

## Importing contracts

Import from the package's public entry point, not deep internal paths:

```ts
import type { OrderStatus, OrderSummary } from "@guest-experience-crm/contracts";
```

The package name and export path are examples. Use the actual `name` and `exports` fields in `packages/contracts/package.json`.

Do not copy/paste types into apps to work around broken package exports; fix the package configuration.

## Compatibility

- Additive fields are safe only when existing consumers can ignore them.
- Renaming/removing fields, changing meaning, making optional fields required, or changing enum values can be breaking changes.
- Update server and consumers together when possible.
- Add contract tests and representative fixtures.
- Search all consumers before changing a shared type.
- If deployments may be out of sync, design transitions to support old and new clients temporarily.

## Test and review checklist

- [ ] Types describe a real cross-package interface.
- [ ] No database/framework implementation details or sensitive fields are exposed.
- [ ] Runtime validation exists at trust boundaries.
- [ ] Money, timestamps, identifiers, nullability, and pagination are consistent.
- [ ] API and event consumers have been checked.
- [ ] Contract tests and examples are updated.
