# Design System

## Purpose

Provide a consistent, accessible interface across both applications while respecting their different needs: the guest app prioritizes speed and confidence on a phone; the dashboard prioritizes operational clarity.

> For visual screen mockups and interactive HTML prototypes, see [UI/UX Prototypes and Mockups](./ui-ux/README.md).

## Principles

1. Clear before clever.
2. Mobile-first guest journeys.
3. Scannable dashboard information hierarchy.
4. Accessible behavior by default.
5. Honest loading, empty, success, offline, and error feedback.
6. Reuse patterns when behavior is genuinely shared.

## Tokens

Define brand, semantic colors, spacing, typography, radii, and elevation as CSS variables or in the shared UI package. Avoid scattering literal values across components.

```css
:root {
  /* Starter values; replace with approved brand tokens. */
  --color-brand: #245c4f;
  --color-brand-strong: #17463c;
  --color-surface: #ffffff;
  --color-surface-muted: #f5f7f6;
  --color-text: #17211e;
  --color-text-muted: #58645f;
  --color-border: #dce4df;
  --color-success: #247348;
  --color-warning: #8a5a00;
  --color-danger: #b42318;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  --radius-sm: 0.375rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
}
```

These are starter values, not final branding. Confirm colors, typography, and logo rules before release. Never communicate status using color alone.

## Typography and layout

- Use a readable sans-serif stack and restrained type scale.
- Keep body text comfortable to read on mobile.
- Use consistent spacing and alignment.
- Give guest pages one clear primary action at a time.
- Establish consistent page title, filters, actions, and content hierarchy in the dashboard.
- Avoid horizontal scrolling for essential guest tasks.

## Component standards

### Buttons
Use verb labels (“Place order”, “Mark in progress”), distinguish primary/secondary/destructive actions, show pending states, prevent accidental duplicate submission, and provide visible focus.

### Forms
Associate inputs with visible labels, show validation near the field, preserve safe values after recoverable errors, and do not ask guests to type a room number when secure QR context already provides it.

### Cards and lists
Prioritize status, room label, order age, item summary, and next action in staff order rows. Avoid ambiguous nested interactions.

### Status indicators
Pair color with text and optionally an icon. Use consistent labels across apps. Do not present network status as an order status.

### Feedback
Design loading, empty, success, offline, and error states. Offer retry where appropriate. Confirm destructive actions and explain consequences.

## Accessibility target

Target WCAG 2.2 AA:

- Keyboard operation and logical focus order.
- Visible focus indicators and sufficient contrast.
- Semantic headings, landmarks, buttons, and form controls.
- Accessible names for icon-only controls.
- Assistive-technology announcements for important status changes without repetitive noise.
- Touch targets around 44 × 44 CSS pixels where practical.
- Respect reduced-motion preferences.
- Do not rely on color, sound, or animation alone.

## Guest-specific patterns

- Keep menu browsing fast and prices visible.
- Make quantity changes and cart totals obvious.
- Distinguish estimates from server-confirmed totals.
- Explain session expiration and how to rescan the room QR code.
- Keep order tracking simple.
- Never expose staff-only fields.

## Dashboard-specific patterns

- Use persistent navigation and consistent page headers.
- Support filtering, sorting, pagination, and empty results as data grows.
- Preserve useful filters when navigating into and back from an order.
- Make pending work easy to find without excessive animation.
- Confirm cancellations and other destructive actions.
- Hide unavailable actions for usability, while relying on backend enforcement for security.

## Shared UI package

Use `packages/ui` for stable primitives such as buttons, inputs, dialogs, badges, skeletons, and layout elements. Keep domain workflows in each app's feature folders; do not force different workflows into a shared component.

## Review checklist

- [ ] Works at the smallest supported viewport.
- [ ] Primary action is clear.
- [ ] Loading, empty, error, success, and offline states exist.
- [ ] Keyboard and screen-reader interactions are supported.
- [ ] Status is understandable without color.
- [ ] Prices and totals are unambiguous.
- [ ] Sensitive information is hidden from unauthorized users.
- [ ] Shared tokens are used consistently.
