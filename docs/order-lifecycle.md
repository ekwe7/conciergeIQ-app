# Order Lifecycle

## Purpose

This document defines expected UI behavior. The backend remains authoritative for legal transitions and must validate every status-changing request.

## Statuses

| Status | Meaning | Guest UI | Staff UI |
|---|---|---|---|
| `PENDING` | Accepted and awaiting staff action | “Received” / waiting | New order requiring attention |
| `IN_PROGRESS` | Staff have started fulfilment | “In progress” | Active work queue |
| `DELIVERED` | Fulfilled | “Delivered” / completed | Completed; ordinarily read-only |
| `CANCELLED` | Cancelled | “Cancelled” and safe-to-disclose reason | Cancelled with reason/audit details where authorized |

These are the intended baseline statuses. Do not add states such as `PREPARING`, `READY`, or `FAILED` unless the backend contract and product requirements explicitly introduce them.

## Baseline transitions

```text
PENDING ───────────────> IN_PROGRESS ───────────────> DELIVERED
   │                         │
   └──────────> CANCELLED <──┘
```

Whether cancellation from `IN_PROGRESS` is allowed, which roles can cancel, and whether a reason is mandatory must be confirmed in the backend contract. `DELIVERED` and `CANCELLED` are terminal in the baseline model.

## Transition rules

- Send an action to the server; do not treat it as confirmed before the server responds unless robust optimistic rollback is implemented.
- The server validates current status, role, hotel scope, guest session access, and cancellation requirements.
- If staff update the same order concurrently, handle conflict responses by refreshing and showing the latest state.
- On success, update or invalidate relevant query-cache entries.
- Real-time events can update the screen quickly, but the client must reconcile after reconnecting or detecting a gap.

## Guest behavior

- Display plain-language status text and an accessible indicator.
- Keep order ID and submitted items visible where appropriate.
- Explain that `PENDING` means received, not necessarily being prepared.
- Show cancellation only after the server confirms it.
- Never expose staff-only notes, audit details, or another room's order.
- If refresh fails, preserve the last known status and clearly indicate that it could not be refreshed.

## Staff behavior

- Make new pending work easy to identify without relying on color alone.
- Show only actions valid for the status and user's permission.
- Prevent repeated submissions while a mutation is in flight.
- Explain failed transitions and provide a recovery action.
- Restrict cancellation and audit details to authorized users.
- Provide useful empty states for status filters.

## Real-time events

Use event names and payloads from `packages/contracts`; do not invent event strings in UI code.

On receipt:
1. Validate the payload.
2. Confirm it belongs to the current authorized hotel/session scope.
3. Update or invalidate affected queries.
4. Handle duplicates safely where event IDs or versions exist.
5. Refetch authoritative state after reconnecting.

## Acceptance criteria

- [ ] Only server-supported transitions are offered.
- [ ] Guest status reflects confirmed server state.
- [ ] Staff actions respect role and current status.
- [ ] Conflicts, expired sessions, and network failures have recovery states.
- [ ] Cancellation follows backend reason and audit requirements.
- [ ] Tests cover valid/invalid transitions, duplicate clicks, and concurrent updates.
