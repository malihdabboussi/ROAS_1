# Floating Menu Anchor Utilities

Last updated: 2026-06-29

## Purpose

`apps/web/src/lib/ui/floating-menu-anchor.ts` centralizes small fixed-position menu helpers used by portaled dropdowns, popovers, and composer menus.

Use it when a component already has an anchor rectangle or a precomputed `{ top, left }` menu position and needs to keep the positioning behavior consistent across frontend features.

## API

```ts
import { fixedFloatingPortalStyle, positionFloatingMenuFromAnchorRect } from '@/lib/ui'
```

### `positionFloatingMenuFromAnchorRect`

Computes a clamped menu position from an anchor rectangle. It prefers opening above the anchor when there is room, flips below when needed, and clamps the left edge inside the viewport.

### `fixedFloatingPortalStyle`

Builds the fixed-position React style object for a portaled surface from a precomputed `{ top, left }` position.

```ts
fixedFloatingPortalStyle(
  { top: 120, left: 80 },
  { transform: 'translateY(-100%)', width: 448 },
)
```

## Usage Rules

- Keep menu content and feature state in the feature component.
- Keep reusable positioning object construction in this helper.
- Do not move feature-owned store, router, or service wiring into `@/lib/ui`.
- Use `z-dropdown` or the correct shared z-index utility on the portaled element.

## Testing

Covered by:

- `apps/web/src/lib/ui/floating-menu-anchor.test.ts`

## Change History

- 2026-06-29: Added `fixedFloatingPortalStyle` for shared fixed portal style construction.
