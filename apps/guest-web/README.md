# Guest Web Application (`apps/guest-web`)

The guest-facing mobile-first web application for **Guest Experience CRM**. It provides hotel guests with friction-free access to hotel services simply by scanning an in-room QR code — no account creation or app installation required.

---

## Key Capabilities

- **Frictionless QR Entry:** Extracts opaque session tokens from the scan URL and handshakes with the backend session API.
- **Menu Browsing:** Browse food, beverages, and amenities by category with real-time availability badges.
- **Item Customization & Cart:** Add items with modifiers to the client cart with server-provided estimated totals.
- **Idempotent Checkout:** Safe order placement using server idempotency keys to prevent duplicate charges.
- **Live Order Tracking:** Real-time order progress updates (`PENDING` → `IN_PROGRESS` → `DELIVERED` / `CANCELLED`) over WebSockets with reconnection reconciliation.
- **Room Requests:** Submit requests for extra towels, toiletries, or housekeeping.

---

## Directory Layout

```
apps/guest-web/
├── public/                 # Static assets (favicon, images)
├── src/
│   ├── app/                # App shell, router, and query providers
│   ├── components/         # Shared guest UI, layout wrappers, and feedback states
│   ├── features/           # Domain-driven feature modules
│   │   ├── guest-session/  # QR token validation, stay context
│   │   ├── menu/           # Category/item browsing, item modal
│   │   ├── cart/           # Local cart state, quantity controls
│   │   ├── orders/         # Order creation, live tracking, order history
│   │   └── room-requests/  # Housekeeping & amenity requests
│   ├── hooks/              # Reusable guest hooks
│   ├── lib/                # API client, WebSocket subscriber, error handler
│   ├── pages/              # Top-level page views
│   ├── styles/             # Global styles and Tailwind configuration
│   ├── types/              # Internal app types
│   ├── App.tsx             # Root component
│   └── main.tsx            # Application entrypoint
├── tests/                  # Unit and component tests
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Local Development

```bash
# Run only guest-web development server
pnpm --filter guest-web dev

# Run unit/component tests
pnpm --filter guest-web test

# Typecheck and lint
pnpm --filter guest-web typecheck
pnpm --filter guest-web lint

# Build for production
pnpm --filter guest-web build
```

---

## Environment Variables

Copy `.env.example` in the project root or create a local `.env` inside `apps/guest-web`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000/ws
```

> **Warning:** Never include API secrets, private keys, or credentials in `VITE_*` environment variables. All variables bundled into the client build are publicly accessible in the browser.
