# Shared UI Package (`packages/ui`)

This package provides accessible, reusable UI component primitives, layout patterns, and design token implementations shared across `apps/guest-web` and `apps/dashboard-web`.

---

## Design Principles

1. **Primitives, Not Domain Features:** Keep business domain workflows (such as cart logic, order cards, or stay check-ins) in the respective app's `src/features/` folders. `packages/ui` only contains generic UI primitives (Button, Input, Modal, Table, Skeleton, Badge, etc.).
2. **Accessible by Default (WCAG 2.2 AA):**
   - Visible focus indicators on all interactive elements.
   - Logical tab indices and keyboard accessibility (`Escape` to dismiss dialogs, arrows for list navigation).
   - ARIA roles, states, and properties properly wired.
   - Sufficient color contrast (never communicate state using color alone).
3. **Design Token Consumption:** Styling relies on CSS custom properties defined in [`docs/design-system.md`](../../docs/design-system.md) (e.g. `--color-brand`, `--color-surface`, `--space-4`, `--radius-md`).

---

## Directory Layout

```
packages/ui/
├── src/
│   ├── components/         # Reusable primitives
│   │   ├── button/
│   │   ├── input/
│   │   ├── modal/
│   │   ├── badge/
│   │   ├── table/
│   │   ├── card/
│   │   ├── skeleton/
│   │   └── toast/
│   ├── hooks/              # UI interaction hooks (e.g., useDisclosure, useFocusTrap)
│   └── index.ts            # Public barrel export
├── package.json
└── tsconfig.json
```

---

## Component Standards

- **Buttons:** Support variants (`primary`, `secondary`, `destructive`, `ghost`, `outline`), size scales, pending/loading spinner state, and explicit `disabled` attributes.
- **Form Controls:** Include linked labels, helper text, and accessible error message association (`aria-describedby`, `aria-invalid`).
- **Modals / Dialogs:** Trap focus inside the active dialog, disable background scrolling, and return focus to the triggering element upon dismissal.
- **Badges:** Support status variants (`neutral`, `success`, `warning`, `danger`) accompanied by readable label text.

---

## Usage in Applications

```tsx
import { Button, Badge, Modal } from '@conciergeiq/ui';

export function OrderSummary() {
  return (
    <div>
      <Badge variant="success">Confirmed</Badge>
      <Button variant="primary" onClick={() => alert('Proceed')}>
        View Order
      </Button>
    </div>
  );
}
```
