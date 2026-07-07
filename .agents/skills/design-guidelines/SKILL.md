---
name: design-follow
description: A protocol that should be used when editing UI components to ensure we follow the design system, tokens, and visual standards.
---

## CRITICAL: Design Context First

**BEFORE making ANY UI changes or creating new components:**

1. Read `.docs/guidelines/design/design-guidelines.md` **ENTIRELY** (read ALL of it)
2. Use grep to search globals.css for specific class names when needed - do NOT read the entire file. Reference design-guidelines.md for token/class patterns.
3. Read **ENTIRE target component files** you'll modify (not excerpts)
4. Check existing similar components for patterns

**Context Checklist - MUST verify ALL:**

- [ ] Read ENTIRE design-guidelines.md
- [ ] Understand design tokens (colors, spacing, typography)
- [ ] Know z-index hierarchy (z-modal-backdrop, z-modal-content, z-dropdown)
- [ ] Know **Spaces-style context / stacked action dropdowns** (this file → **Context menus & stacked action dropdowns**) vs **§8 HubTool / sort**, **§9 searchable**, **§16 Radix menu shell**
- [ ] Know button hierarchy (Layer 1-4)
- [ ] Know badge/card/input patterns
- [ ] Read ENTIRE target component file
- [ ] Check similar existing components for patterns

**If ANY box unchecked -> STOP. Gather context first.**

---

## Design Compliance

Please make sure that your UI implementation follows:

- `.docs/guidelines/design/design-guidelines.md` (tokens, components, patterns)

**Key Rules:**

- **NEVER hardcode colors** - Use tokens (`bg-card`, `text-foreground`, `border-border`)
- **NEVER use arbitrary z-index** - Use named classes (`z-modal-backdrop`, `z-modal-content`)
- **ALWAYS use spacing tokens** - `spacing-1` through `spacing-8`
- **ALWAYS use typography classes** - `body-1/2/3/4`, `title-h6`, `typo-caption`
- **ALWAYS use button hierarchy** - Layer 1 (Primary), Layer 2 (Dialog), Layer 3 (Card), Layer 4 (Micro)
- **ALWAYS use badge-glass classes** - `badge-glass badge-glass-{color}`
- **ALWAYS test in both light and dark themes**

---

## Quick Reference

**Typography:** `title-h6` (18px), `body-1` (16px), `body-2` (14px), `body-3` (13px), `body-4` (12px), `typo-caption` (11px)

**Spacing:** `spacing-1` (4px), `spacing-2` (8px), `spacing-3` (12px), `spacing-4` (16px), `spacing-6` (24px), `spacing-8` (32px)

**Button Classes:**

- `button-glass-primary` - Green, primary actions
- `button-glass-accent` - Green (lighter), dialog main buttons
- `button-glass-neutral` - Neutral, cancel/back buttons
- `button-glass-destructive` - Red, delete actions
- `button-glass-purple` - Purple, view actions
- `button-glass-blue` - Blue, toolbar controls
- `btn-icon-glass` - Icon-only buttons

**Badge Classes:** `badge-glass badge-glass-{blue|green|orange|red|purple|yellow|muted}`

**Card Classes:** `card card-elevated card-glass`, `surface-card`, `section-card`

**Hover States:**

- Tier 1 (Primary): Button CSS handles it
- Tier 2 (Secondary): `hover:bg-muted/20`
- Tier 3 (Tertiary): `hover:bg-hover-subtle hover:text-foreground`

**Input Glass Fix (White Background):**

- If input inside `.input-glass` shows white background → Add `input-glass` class to the `<input>` element itself
- The `:not(.input-glass)` selector in globals.css forces white on inputs without this class
- Fix: `<input className="input-glass ..." />` (not just on parent div)

---

## Context menus & stacked action dropdowns

**Scope:** Kebab/right-click portals, Spaces-style **action menus** (`data-funnel-menu`, `data-offer-menu` pattern), flyout submenus. **Not:** `<Select>` / multi-select/combobox/searchable lists (see **§9** in `design-guidelines.md`), HubTool filter or **sort** dropdowns (**§8**), Radix **`DropdownMenuContent`** shell (`dropdown-menu-solid` — **§16**).

**Golden reference:** `apps/web/src/features/spaces/components/artifacts/funnel/FunnelMenuDropdown.tsx`

**Offers (same checklist):** `apps/web/src/features/spaces/components/artifacts/offer/OfferMenuDropdown.tsx`

Use this checklist so duplicates match **token + pixel** intent:

### Panel shell

| Piece         | Classes                                                                 | Px (approx)                     |
| ------------- | ----------------------------------------------------------------------- | ------------------------------- |
| Portal layer  | `z-dropdown` `fixed` → `document.body`                                  | stacking per globals            |
| Card          | `rounded-spacing-2` `border-border` `surface-card` `border` `shadow-lg` | radius from `--spacing-2` (8px) |
| Outer padding | `p-spacing-2`                                                           | **8px** all sides               |
| Min width     | `min-w-56`                                                              | **224px**                       |

### Optional top segmented row (“table” chips)

| Piece   | Classes                                                                                                                   | Px (approx)                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Wrapper | `mb-spacing-2` `overflow-hidden` `rounded-md` `border` `border-border`                                                    | divider row sits in rounded rect                  |
| Columns | flex + `divide-x` `divide-border`                                                                                         | vertical rules stay **straight**                  |
| Cells   | `rounded-none` `min-h-7` (**28px**) `body-3` hover `hover:bg-[var(--color-hover-subtle)]` `text-center` `truncate` `px-2` | **no per-cell rounding** (avoids curved dividers) |

### Main stack (under the segmented row)

| Piece        | Classes                                        | Px (approx)                                                 |
| ------------ | ---------------------------------------------- | ----------------------------------------------------------- |
| List wrapper | `flex flex-col` `gap-spacing-1` `px-spacing-1` | **4px** gap between rows/seps; **4px** inset from panel pad |
| Divider      | `border-t` `border-border`                     | full width inside wrapper                                   |

### Menu row (`<button>`)

| Piece                      | Classes                                                                                                                                                                            | Px (approx)               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Row                        | `flex w-full items-center text-left` `rounded-spacing-2` `body-3` `text-muted-foreground` hover `hover:bg-[var(--color-hover-subtle)]` `hover:text-foreground` `transition-colors` | text **~13px** (`body-3`) |
| Row padding                | `px-spacing-2` `py-spacing-1`                                                                                                                                                      | **8px ×** **4px**         |
| Icon ↔ label gap           | `gap-spacing-2`                                                                                                                                                                    | **8px**                   |
| Leading icons              | `h-3.5 w-3.5 shrink-0`                                                                                                                                                             | **14×14px**               |
| Submenu chevron (trailing) | `h-3 w-3 shrink-0`                                                                                                                                                                 | **12×12px**               |
| Disabled                   | `disabled:opacity-50` `disabled:hover:bg-transparent`                                                                                                                              | —                         |
| Destructive                | Same padding + gap as row; `text-red-600` `hover:bg-red-500/10` `[&_svg]:text-red-600`                                                                                             | —                         |

### Flyout submenu (e.g. campaign list)

| Piece | Classes                                                                           | Px (approx)                               |
| ----- | --------------------------------------------------------------------------------- | ----------------------------------------- |
| Panel | Same shell pattern; `flex flex-col` `gap-spacing-1` `py-spacing-2` `px-spacing-3` | **8px** vertical pad, **12px** horizontal |
| Rows  | Same as main row; optional trailing check **`h-3.5 w-3.5`** where spec’d          | —                                         |

**Implementation notes**

- Prefer `data-*` on the portal root for dismiss logic (e.g. `data-funnel-menu`, `data-offer-menu`).
- Do **not** put **rounded corners on segmented inner cells** when using `divide-x`—straight rules need `rounded-none` on cells + outer `overflow-hidden`.

---

**card-glass-blue Toggle Fix (White Border Flash):**

- `card-glass-blue` sets `border: 1px solid rgba(...)`. If the unselected state has NO border, switching causes a layout shift + white border flash.
- **Always reserve border space on BOTH states.** Unselected state must have `border border-transparent`, selected state applies `card-glass-blue` which overrides the border color.
- Also add `outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]` to suppress browser focus ring flash.
- Pattern (toggle buttons):
  - Base: `border rounded-lg outline-none focus:outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]`
  - Selected: `card-glass-blue text-foreground`
  - Unselected: `border-transparent bg-muted/20 text-muted-foreground hover:bg-muted/40`
- See: `MediaPickerModal.tsx` (uses `border-2 border-transparent` / `card-glass-blue border-primary`), `BillingPageContent.tsx` (wrapping div always has `border-border`)
