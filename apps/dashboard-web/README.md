# Hotel Management Dashboard (`apps/dashboard-web`)

The desktop and tablet web application for hotel staff, receptionists, managers, and property owners to manage live orders, room stays, inventory, and hotel operations.

---

## Key Capabilities

- **Role-Based Access Control:** Role-tailored views and permitted actions for Staff, Receptionists, Managers, and Admins/Owners.
- **Live Order Board:** Real-time incoming order queue categorized by status (`PENDING`, `IN_PROGRESS`, `DELIVERED`, `CANCELLED`).
- **Order Management & Detail Drawer:** Progress orders, reject with validated cancellation reasons, and view guest room details.
- **Rooms & QR Codes:** Room inventory list, QR code regeneration, and printable room tent cards.
- **Stay Management:** Reception check-in, check-out, and active stay verification.
- **Menu & Stock Controls:** Toggle item 86/availability states, update prices, and edit menu categories.
- **Payments:** Mark-as-paid and bill-to-room reconciliation flows.
- **Audit & Activity Logs:** Comprehensive immutable activity trail.
- **Operational Reports:** Daily sales, order volume, and performance insights for owners.

---

## Directory Layout

```
apps/dashboard-web/
├── public/                 # Static assets
├── src/
│   ├── app/                # App shell, router, query provider
│   ├── components/         # Shared dashboard layout (Sidebar, Header, ProtectedRoute)
│   ├── features/           # Domain-driven feature modules
│   │   ├── auth/           # Staff login, session lifecycle
│   │   ├── orders/         # Live order queue, order detail drawer, actions
│   │   ├── rooms/          # Room status, QR code generator
│   │   ├── stays/          # Check-in, check-out management
│   │   ├── menu/           # Menu editor, item availability toggles
│   │   ├── inventory/      # Stock tracking and thresholds
│   │   ├── payments/       # Transaction status, mark-as-paid
│   │   ├── staff/          # Staff accounts, roles & permissions
│   │   ├── activity-log/   # Hotel audit trail
│   │   ├── reports/        # Analytics, revenue, order reports
│   │   └── settings/       # Hotel profile, branding, operational hours
│   ├── hooks/              # Dashboard hooks
│   ├── lib/                # API client, WebSocket client, permissions helper
│   ├── pages/              # Top-level route pages
│   ├── styles/             # Global CSS and Tailwind theme
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entrypoint
├── tests/                  # Unit and component tests
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Local Development

```bash
# Run dashboard-web development server
pnpm --filter dashboard-web dev

# Run unit and component tests
pnpm --filter dashboard-web test

# Typecheck and lint
pnpm --filter dashboard-web typecheck
pnpm --filter dashboard-web lint

# Build for production
pnpm --filter dashboard-web build
```

---

## Environment Variables

Copy `.env.example` in the project root or create `.env` inside `apps/dashboard-web`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000/ws
```

> **Security Note:** The UI adapts navigation and action buttons based on user roles, but the backend Fastify server is the sole authoritative enforcer for permissions and hotel data isolation.
