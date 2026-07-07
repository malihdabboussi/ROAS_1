# Vibey — Design Guidelines

**UI/UX Authority — Visual Patterns, Design Tokens, Component Standards**

> Canon: **Spaces** (`apps/web/src/features/spaces/...`). Every pattern here is anchored to a real Spaces file. If a screen disagrees with this doc, the screen is wrong.

> White-label readiness: every visible color, surface, and accent flows from a single token namespace (`--color-*`). A tenant override file replaces the namespace and the entire app reskins. Do not introduce values that bypass tokens — see §A "White-label rules".

---

## 0. Quick Reference

**Foundation**
1. [Token system](#1-token-system) — `--color-*` is the only namespace
2. [Theme & dark mode](#2-theme--dark-mode)
3. [Z-index layers](#3-z-index-layers)
4. [Typography scale](#4-typography-scale)
5. [Color semantics](#5-color-semantics) — incl. **icon tint in nav / lists**
6. [Spacing & sizing](#6-spacing--sizing) — incl. **input/button height scale**

**Components**
7. [Buttons](#7-buttons)
8. [Inputs](#8-inputs)
9. [Switches](#9-switches)
10. [Modals & dialogs](#10-modals--dialogs)
11. [Dropdowns & menus](#11-dropdowns--menus) — the Spaces "main menu" pattern
12. [Submenus / nested action menus](#12-submenus--nested-action-menus)
13. [Tabs](#13-tabs)
14. [Tooltips & popovers](#14-tooltips--popovers)
15. [Badges & status pills](#15-badges--status-pills)
16. [Cards & surfaces](#16-cards--surfaces)
17. [Hover & selection states](#17-hover--selection-states)
18. [Loading & error states](#18-loading--error-states)

**Appendix**
- [A. White-label rules](#a-white-label-rules) — what's swappable, what isn't
- [B. Migration from legacy patterns](#b-migration-from-legacy-patterns)
- [C. Pre-PR checklist](#c-pre-pr-checklist)

---

## 1. Token system

**Rule:** Every visible color comes from a `--color-*` token via a utility class. **Never** inline a CSS variable. **Never** use a Tailwind palette color (`text-red-500`, `bg-blue-400`, etc.).

### 1.1 Canonical namespace

| Concern | Token | Utility class |
|---|---|---|
| Page background | `--color-background` | `bg-background` |
| Card / dropdown surface | `--color-card` | `bg-card`, `surface-card` |
| Inline hover surface | `--color-hover-subtle` | `bg-hover-subtle` |
| Secondary surface (inline edit field, chip) | `--color-secondary` | `bg-secondary` |
| Primary text | `--color-foreground` | `text-foreground` |
| Muted text / inactive icons | `--color-muted-foreground` | `text-muted-foreground` |
| Border (default) | `--color-border` | `border-border` |
| Brand primary | `--color-primary` | `text-primary`, `bg-primary` |
| Selected accent (purple) | `--color-accent-selected` | `nav-glass-selected-purple` |
| Destructive | `--color-destructive` | `text-destructive`, `bg-destructive/10`, `border-destructive` |
| Warning | `--color-warning` | `text-warning`, `bg-warning/10` |
| Success | `--color-success` | `text-success`, `bg-success/10` |

### 1.2 Forbidden

```tsx
// ❌ WRONG — inlines a CSS variable
<div className="text-[var(--color-foreground)] bg-[var(--color-card)]" />

// ❌ WRONG — Tailwind palette
<button className="text-red-400 bg-blue-500/10" />

// ❌ WRONG — hex / rgb / inline style
<div style={{ color: '#fff', background: 'rgba(0,0,0,0.6)' }} />
```

```tsx
// ✅ RIGHT — utilities only
<div className="text-foreground bg-card" />
<button className="text-destructive bg-destructive/10" />
<div className="bg-modal-overlay" />
```

### 1.3 Deprecated alias namespace (do not use)

The codebase still has `--foreground`, `--border`, `--background`, `--card`, `--muted-foreground`, `--secondary`, `--primary`. These are **deprecated aliases** of `--color-*`. Do not write new code against them. They will be removed.

---

## 2. Theme & dark mode

**Rule:** All components must work in both themes without conditional code. Theme changes happen by swapping `--color-*` values; component code never branches on theme.

```tsx
// ✅ RIGHT — theme-agnostic
<div className="bg-card text-foreground border border-border" />

// ❌ WRONG — branches on theme
<div className="bg-white dark:bg-gray-900" />
```

The only legitimate `dark:` variant is for opacity tweaks of an already-tokenized color (rare).

---

## 3. Z-index layers

**Rule:** Always use a named utility. Numeric `z-[100001]` and `style={{ zIndex: 100001 }}` are **forbidden**.

| Layer | Utility | Use case |
|---|---|---|
| App shell / sticky headers | `z-40` | Top nav, sticky toolbars |
| Modal backdrop | `z-modal-backdrop` | Dialog overlay (z-index only — pair with `bg-modal-overlay` for the tint) |
| Modal content | `z-modal-content` | Standard dialogs |
| Modal layer 2 | `z-modal-layer-2` | Nested dialog over a dialog |
| Modal layer 3 | `z-modal-layer-3` | Centered Radix Content wrapper |
| Dropdowns / menus / tooltips | `z-dropdown` | Portaled menus, popovers, submenus |

**Stacked submenus** (e.g. Move/Copy nested flyouts) **still use `z-dropdown`** for every level. The portal order in the DOM gives later menus the higher render position — do not invent numeric stacks.

---

## 4. Typography scale

**Rule:** Use the named scale. **No** arbitrary `text-[Npx]`.

| Class | Px | Use |
|---|---:|---|
| `title-h6` | 18 | Page titles, modal titles |
| `body-1` | 16 | Card titles, primary content |
| `body-2` | 14 | Form labels, list items, default body |
| `body-3` | 13 | Dropdown items, secondary text, dense rows |
| `body-4` | 12 | Metadata, search input text, small chips |
| `typo-caption` | 11 | Captions, hints, helper text |
| `typo-section-label` | 10 (uppercase, tracked) | Dropdown section headings ("CAMPAIGNS", "PERSONAL / ORGS") |

> If `typo-section-label` is not yet defined as a utility, treat its current spelling (`text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`) as a single migration target. Do not invent new ad-hoc text sizes.

---

## 5. Color semantics

| Semantic | Use | Class examples |
|---|---|---|
| **Foreground / Muted** | Primary body text & **default chrome icons** | `text-foreground` / `text-muted-foreground` |
| **Border** | All hairlines, dividers | `border-border` |
| **Hover (subtle)** | Inline hover on rows, menu items, ghost buttons | `hover:bg-hover-subtle hover:text-foreground` |
| **Primary (brand)** | Brand-tied accents — *swappable per tenant* | `text-primary`, `bg-primary`, `ring-primary` |
| **Selected accent (purple)** | Active item in switcher / sidebar / nav | `nav-glass-selected-purple text-[rgb(var(--vibe-purple-light))]` |
| **Destructive** | Delete, error, danger — *not red, destructive* | `text-destructive`, `bg-destructive/10`, `border-destructive` |
| **Warning** | Archive, caution, non-fatal alerts | `text-warning`, `bg-warning/10` |
| **Success** | Verified, connected, completed | `text-success`, `bg-success/10` |

**Forbidden semantic mappings:**
- ❌ `text-red-*`, `bg-red-*`, `border-red-*` → **always** `destructive`
- ❌ `text-amber-*`, `text-orange-*` for status → `warning`
- ❌ `text-emerald-*`, `text-green-*` for status → `success`
- ❌ `text-blue-*` for "info" — use `text-primary` or omit

The exception: data-coded color palettes (tag colors, calendar colors, brand color picker swatches) live in dedicated palette files (`tag-picker-colors.ts`, `note-color-picker.tsx` etc.). Those are *data*, not styling, and stay where they are.

### 5.1 Icon tint — navigation, sidebars, menus, breadcrumbs

**Rule:** Lucide glyphs in rails, inbox rows, Teams panel, Spaces header, breadcrumb strips, dropdown rows, chevrons, and toolbar chrome icons use **`text-muted-foreground`** by default — **the same neutral gray tier as Teams and Home communication nav**, not bright `text-foreground`.

**Color only when user chose it:** Space / Team / Campaign entity icons get `getIconColor(schema.icon_color)` (`IconPicker` palette). **`default`** in `ICON_COLORS` maps to **`text-muted-foreground`** — not foreground. That keeps breadcrumb folders, chevrons, and the space glyph visually aligned unless the user explicitly picks Purple, Blue, Green, etc.

```tsx
// ✅ RIGHT — contextual chrome icons (inactive)
<FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

// ✅ RIGHT — space / team glyph with persisted user color
<LucideIcon name={iconName} className={`icon-sm shrink-0 ${getIconColor(colorId).textColor}`} />

// ❌ WRONG — bright-white icon beside muted breadcrumb folders
<button className="text-foreground">
  <LucideIcon ... className="text-foreground" />
</button>
```

**Row label:** can stay **`text-foreground`** on the clickable title alongside a **muted default** glyph. Do not downgrade the entire row to muted — only the icon (and sibling folder/chevron glyphs) stays muted unless selected or user-colored.

**Reference:** Teams list rows — `SidebarTeam2Flyout` (`text-muted-foreground` on inactive rows + `getIconColor(team.color)` on the icon chip). Align Spaces `SpaceBreadcrumbHeader` / `SpaceSwitcherDropdown` with this rule.

**Implementation:** `apps/web/src/components/ui/IconPicker.tsx` → `ICON_COLORS` entry `id: 'default'` uses `text-muted-foreground`.

---

## 6. Spacing & sizing

### 6.1 Spacing scale

| Token | Px | Token | Px |
|---|---:|---|---:|
| `--spacing-1` | 4 | `--spacing-7` | 28 |
| `--spacing-2` | 8 | `--spacing-8` | 32 |
| `--spacing-3` | 12 | `--spacing-9` | 36 |
| `--spacing-4` | 16 | `--spacing-10` | 40 |
| `--spacing-5` | 20 | `--spacing-12` | 48 |
| `--spacing-6` | 24 | `--spacing-16` | 64 |

**Rule:** Use `p-spacing-*`, `gap-spacing-*`, `mt-spacing-*`, `h-spacing-*`, etc. **No** raw `p-3`, `gap-2`, `h-9`, etc. for tokens that have a `-spacing-` variant.

### 6.2 Canonical input + button height scale ⭐

This is the canonical scale. All inputs and their paired action buttons live on the same row height.

| Tier | Input class | Button class | Px | When |
|---|---|---|---:|---|
| **Compact** | `h-spacing-7` | `button-compact` | **28** | Toolbar search, search-paired controls (filter/sort/+ icon-buttons next to a 28 px search) |
| **Default** | `h-spacing-9` | `button-default` | **36** | All form inputs in modals, dialogs, settings pages, plus their action buttons (Save, Cancel, Continue) |
| **Large** | `h-spacing-12` | `button-large` | **48** | Hero search, onboarding key fields |
| **Icon-only square** | — | `btn-icon-glass` / `btn-icon-bare` | **32** | Square icon-only buttons — never used for text inputs |

**Compose** size class with color variant:

```tsx
// Compact green search-row CTA
<button className="button-compact button-glass-primary">
  <Plus className="h-3.5 w-3.5" />
  Add
</button>

// Default modal action
<button className="button-default button-glass-primary">Continue</button>

// Default modal cancel
<button className="button-default button-glass-neutral">Cancel</button>
```

**Forbidden:**
- ❌ `h-spacing-10` (40 px) — drift between buttons (40) and inputs (36) breaks alignment. Available but not canon.
- ❌ Raw `h-7`, `h-9`, `h-10` — use the `h-spacing-*` token instead.
- ❌ Mixing tiers within one form (don't have a 36 px name input next to a 40 px description — see legacy `CreateSpaceModal` for what to fix).

### 6.3 Icon sizes

| Class | Px | Use |
|---|---:|---|
| `icon-xs` | 12 | Submenu chevrons, very dense rows |
| `icon-sm` | 14 | Default — menu items, inline icons, button icons |
| `icon-md` | 16 | Modal headers, larger interactive icons |
| `icon-lg` | 24 | Empty-state icons, large status badges |

If `icon-*` utilities are missing, the literal mapping is `h-3 w-3`, `h-3.5 w-3.5`, `h-4 w-4`, `h-6 w-6` — but prefer the named utility.

---

## 7. Buttons

### 7.1 Composition model

Every button = **size class** + **color variant class**.

```tsx
<button className="button-default button-glass-primary">Save</button>
<button className="button-default button-glass-neutral">Cancel</button>
<button className="button-default button-glass-destructive">Delete</button>
<button className="button-compact button-glass-neutral">Filter</button>
```

### 7.2 Color variants

| Class | Use | Example |
|---|---|---|
| `button-glass-primary` | Primary CTA — green/emerald glass, brand-aligned | "Continue", "Create", "Add" |
| `button-glass-neutral` | Cancel, Back, secondary action | "Cancel", "Back" |
| `button-glass-destructive` | Destructive action | "Delete", "Remove" |
| `button-glass-purple` | Special / nav-aligned action | View entity, navigate-into |

> All glass variants ship with built-in opacity transition, light sweep on hover, lift effect, and pulse glow (`primary`, `destructive`). **Never** add inline `style={{ opacity }}`, `onMouseEnter`/`Leave` for visual state, or duplicate hover handlers in JS.

### 7.3 Icon-only buttons

```tsx
// Default icon button (32x32, glass)
<button className="btn-icon-glass">
  <MoreHorizontal className="icon-sm" />
</button>

// Bare icon button (no glass — modal close, lightweight chrome)
<button className="btn-icon-bare">
  <X className="icon-xs" />
</button>

// Destructive icon button
<button className="btn-icon-glass-destructive">
  <Trash2 className="icon-sm" />
</button>
```

**Modal close = `btn-icon-bare`.** Do not use `btn-icon-glass btn-close-absolute` — that pattern is deprecated.

### 7.4 Forbidden

- ❌ Inline gradient/box-shadow styles for hover effects — use the variant class
- ❌ JS hover handlers (`onMouseEnter`/`onMouseLeave`) for visual state
- ❌ Mixing the size with raw `h-N` / `px-N` — use the size class

---

## 8. Inputs

### 8.1 Default form input (36 px)

Used in **every** modal, dialog, and settings form.

```tsx
<input
  className="h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 border border-border bg-background text-foreground placeholder:text-muted-foreground w-full outline-none focus:ring-2 focus:ring-ring"
  placeholder="e.g. Marketing"
/>
```

**With label:**

```tsx
<label htmlFor="name" className="body-2 text-foreground block font-medium">
  Name
</label>
<input
  id="name"
  className="h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 border border-border bg-background text-foreground placeholder:text-muted-foreground w-full outline-none focus:ring-2 focus:ring-ring mt-spacing-2"
/>
```

**Error state:** add `border-destructive focus:ring-destructive`.

### 8.2 Compact toolbar / search input (28 px)

```tsx
<input
  type="search"
  placeholder="Search..."
  className="h-spacing-7 w-full px-spacing-2-5 body-4 rounded-spacing-2 border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
/>
```

Use **alongside** `button-compact` controls (filter, sort, +).

### 8.3 Inline editable input (chip-on-surface)

For headers, switcher dropdowns, table cells where the input *is* the title.

```tsx
<input
  className="rounded-spacing-1 bg-secondary px-spacing-2 py-spacing-0-5 body-2 text-foreground min-w-0 flex-1 font-medium outline-none"
  aria-label="Item name"
/>
```

### 8.4 Search input with leading icon

```tsx
<div className="relative w-full">
  <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
  <input
    type="search"
    className="input-leading h-spacing-9 w-full body-3 rounded-spacing-2 border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
    placeholder="Search..."
  />
</div>
```

### 8.5 Number input — no spinners

Append: `[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`

### 8.6 Forbidden

- ❌ `h-7`, `h-9`, `h-10` (raw) — use `h-spacing-*`
- ❌ Two heights inside a single form
- ❌ `bg-white`, `bg-[var(--background)]` — use `bg-background`

---

## 9. Switches

**Rule:** Always use the `Switch` component. It applies the canonical glossy-glass styling (`switch-glass-primary` + thumb).

```tsx
import { Switch } from '@/components/ui/forms/switch'

<Switch checked={isOn} onCheckedChange={setIsOn} />
```

**Specs (don't override):** 20 px tall × 36 px wide, 16 px thumb, slides via `translate-x-1` / `translate-x-4`. Disabled = `opacity-50 cursor-not-allowed` (built in).

**Reference:** `apps/web/src/components/ui/forms/switch.tsx`

---

## 10. Modals & dialogs

**Rule:** Always **Radix Dialog primitives** + **DialogPortal**. Custom `<div>` modals are forbidden — they get trapped in parent stacking contexts.

### 10.1 Standard dialog (Spaces canon)

```tsx
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

<DialogPrimitive.Root open={open} onOpenChange={handleClose}>
  <DialogPrimitive.Portal>
    {/* Overlay: pair the layer class with the new tint utility */}
    <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />

    {/* Centered content wrapper */}
    <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
      <div className="surface-card wizard-container-border rounded-spacing-4 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border bg-card shadow-2xl">
        {/* Header */}
        <div className="px-spacing-6 pt-spacing-5 pb-spacing-3 shrink-0">
          <div className="gap-spacing-3 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="title-h6 text-foreground">
                Title
              </DialogPrimitive.Title>
              <p className="body-3 text-muted-foreground mt-spacing-1">Description</p>
            </div>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="btn-icon-bare shrink-0"
              aria-label="Close"
            >
              <X className="icon-xs" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-spacing-6 py-spacing-4 space-y-spacing-5 flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Form fields */}
        </div>

        {/* Footer */}
        <div className="border-border px-spacing-6 py-spacing-3 gap-spacing-3 flex shrink-0 items-center justify-end border-t">
          <button className="button-default button-glass-neutral">Cancel</button>
          <button className="button-default button-glass-primary">Continue</button>
        </div>
      </div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
</DialogPrimitive.Root>
```

### 10.2 Specs

| Slot | Class |
|---|---|
| Overlay | `z-modal-backdrop bg-modal-overlay fixed inset-0` |
| Content wrapper | `z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center` |
| Inner card | `surface-card wizard-container-border rounded-spacing-4 ... border bg-card shadow-2xl` |
| Header padding | `px-spacing-6 pt-spacing-5 pb-spacing-3` |
| Body padding | `px-spacing-6 py-spacing-4 space-y-spacing-5 overflow-y-auto` |
| Footer padding | `border-border px-spacing-6 py-spacing-3 gap-spacing-3 border-t` |
| Close button | `btn-icon-bare` |
| Action buttons | `button-default button-glass-{primary\|neutral\|destructive}` |

### 10.3 Width

| Class | Max-width | Use |
|---|---|---|
| `max-w-md` | 448 | Confirmations |
| `max-w-lg` | 512 | **Standard** (Create Space) |
| `max-w-2xl` | 672 | Forms with side-by-side fields |
| `max-w-4xl` | 896 | DNS records, log viewers |

### 10.4 Delete confirmation dialogs

**Two tiers:**

- **Simple delete** (domain, segment, integration): destructive icon header + Cancel + "Delete" — no typed confirmation.
- **Critical delete** (offer, campaign, funnel, space): same shell but adds an input where user types `DELETE`. Confirm button stays disabled until match.

Both use the standard dialog shell from §10.1 with `button-default button-glass-destructive` for the destroy action.

**Reference:** `apps/web/src/features/spaces/components/CreateSpaceModal.tsx` (canonical add/edit dialog).

---

## 11. Dropdowns & menus

This section is the **Spaces Main Menu** pattern (the `…` next to a space, sidebar context menu, switcher row). For **searchable filter dropdowns** see §11.4.

### 11.1 Anatomy

Every menu in Spaces:

1. **Portaled** to `document.body` via `createPortal` — never inline rendered.
2. **Positioned `fixed`** at `{top, left}` computed from the trigger's `getBoundingClientRect()`.
3. **Z-index = `z-dropdown`** — never numeric.
4. **Container = `dropdown-menu-solid`** + `rounded-xl` + `py-spacing-1`.
5. **Width = explicit pixel** (180/224/240/280 are the canonical widths).
6. **Outside-close** = `mousedown` listener + `data-` attribute guard or `ref.contains` check.

### 11.2 Standard menu container

```tsx
import { createPortal } from 'react-dom'

createPortal(
  <div
    className="dropdown-menu-solid z-dropdown fixed w-[180px] overflow-hidden rounded-xl py-spacing-1"
    style={{ top: pos.top, left: pos.left }}
  >
    {/* items */}
  </div>,
  document.body,
)
```

Width pick:

- `w-[180px]` — short action menu (Spaces "more")
- `w-[224px]` — standard menu (sidebar context, MoveCopy root)
- `w-[240px]` — wider with descriptions (MoveCopy nested, space-step)
- `w-[280px]` — switcher / picker with hierarchy

### 11.3 Item rows

**Default item:**

```tsx
<button
  type="button"
  className="gap-spacing-2 px-spacing-3 py-spacing-1-5 body-3 text-foreground hover:bg-hover-subtle flex w-full items-center text-left"
  onClick={...}
>
  <Icon className="icon-sm text-muted-foreground" />
  <span className="flex-1 truncate">Action</span>
</button>
```

**Destructive item:**

```tsx
<button
  type="button"
  className="gap-spacing-2 px-spacing-3 py-spacing-1-5 body-3 text-destructive hover:bg-destructive/10 flex w-full items-center text-left"
  onClick={...}
>
  <Trash2 className="icon-sm" />
  <span>Delete</span>
</button>
```

**Section label:**

```tsx
<p className="px-spacing-3 py-spacing-1 typo-section-label text-muted-foreground">
  Campaigns
</p>
```

**Divider:**

```tsx
<div className="my-spacing-1 h-px bg-border" />
```

**Submenu chevron** (right-aligned, in items that open a flyout):

```tsx
<ChevronRight className="icon-xs text-muted-foreground shrink-0" />
```

### 11.4 Searchable filter dropdown (HubTool / sort / multi-select)

For "select-from-list" dropdowns with a search bar at top:

```tsx
<div className="dropdown-menu-solid z-dropdown fixed flex max-h-[500px] w-80 flex-col overflow-hidden rounded-spacing-2 border border-border shadow-lg" style={{ top, left }}>
  {/* Search bar */}
  <div className="border-border border-b">
    <div className="gap-spacing-2 bg-background p-spacing-2 group flex items-center">
      <Search className="icon-sm text-muted-foreground group-focus-within:text-foreground shrink-0" />
      <input
        type="text"
        autoFocus
        placeholder="Search..."
        className="typo-caption placeholder:text-muted-foreground flex-1 bg-transparent outline-none"
      />
    </div>
  </div>

  {/* Items */}
  <div className="p-spacing-2 flex-1 overflow-y-auto space-y-spacing-1">
    {filtered.map((item) => (
      <button
        key={item.id}
        className="px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle hover:text-foreground body-3 text-muted-foreground w-full text-left"
        onClick={...}
      >
        {item.label}
      </button>
    ))}
  </div>
</div>
```

**Selected option** in a single-select sort menu uses `dropdown-sort-option-selected` + the `dropdown-sort-check` glyph (green check) — see `CreateSpaceModal`'s permission picker for the canonical implementation.

### 11.5 Forbidden

- ❌ Numeric `style={{ zIndex: 100001 }}` — use `z-dropdown`
- ❌ Custom `<div>` menus inside parent containers — always portal
- ❌ `text-red-400` for delete — use `text-destructive`
- ❌ `dropdown-menu-glass` for filter/action menus — only for special decorative contexts

**Reference:**
- `apps/web/src/features/spaces/components/header/SpaceMoreMenu.tsx`
- `apps/web/src/features/spaces/components/header/SpaceSwitcherDropdown.tsx`
- `apps/web/src/components/layout/sidebar/SidebarSpaceContextMenu.tsx`

---

## 12. Submenus / nested action menus

Nested flyouts (Move/Copy → Org → Campaign → Space) follow the same anatomy as §11 with these additions:

1. **Exclusive group** — wrap sibling submenu triggers in a context that closes the others when one opens. See `MoveCopySubmenuExclusiveGroup`.
2. **Hover delay** — 140 ms close delay (`HOVER_CLOSE_DELAY_MS`) on `mouseleave` so users can move diagonally to the flyout.
3. **All levels use `z-dropdown`** — DOM portal order handles stacking. Never invent numeric layers.
4. **Same dim/blur on the parent menu while a child is open** — handled by the design system, do not override.
5. **Position calculation** — flyout opens to the right of the row; if it would overflow viewport, flip to left.

**Reference:** `apps/web/src/components/menus/MoveCopySubmenu.tsx`

---

## 13. Tabs

**Rule:** Default to the **liquid glass** variant. Other variants are legacy / deprecated.

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'

<Tabs defaultValue="overview" className="space-y-spacing-6">
  <TabsList variant="liquid">
    <TabsTrigger value="overview" className="px-spacing-4">Overview</TabsTrigger>
    <TabsTrigger value="settings" className="px-spacing-4">Settings</TabsTrigger>
  </TabsList>

  <TabsContent value="overview"><OverviewPanel /></TabsContent>
  <TabsContent value="settings"><SettingsPanel /></TabsContent>
</Tabs>
```

**Variant rules:**

| Variant | Status |
|---|---|
| `"liquid"` | ✅ **Default** — use everywhere |
| `"default"` | ⚠️ Legacy — only if liquid genuinely doesn't fit |
| `"glass"` | ❌ Deprecated — replace with `"liquid"` |

---

## 14. Tooltips & popovers

### 14.1 Tooltip — short label on hover

```tsx
import { Tooltip } from '@/components/ui/tooltip'

<Tooltip label="Manage content" side="bottom">
  <button className="btn-icon-bare"><Settings className="icon-sm" /></button>
</Tooltip>
```

200 ms delay, top/bottom/right placement, dark surface. Use for **labels**, not for help text.

### 14.2 Popover — explanatory body text on hover

```tsx
import { Popover } from '@/components/ui/overlays/popover'

<Popover content="Longer explanatory help text…" side="right">
  <span className="rounded-spacing-1 border-border text-muted-foreground inline-flex h-4 w-4 cursor-help items-center justify-center text-xs leading-none border">
    ?
  </span>
</Popover>
```

Use for **help "?" icons** next to titles or labels.

---

## 15. Badges & status pills

**Rule:** Always `badge-glass` + a color variant. Never hardcode colors.

```tsx
<span className="badge-glass badge-glass-green typo-caption font-medium">Live</span>
<span className="badge-glass badge-glass-orange typo-caption font-medium">Paused</span>
<span className="badge-glass badge-glass-red typo-caption font-medium">Failed</span>
<span className="badge-glass badge-glass-muted typo-caption font-medium">Draft</span>
```

**Color → meaning** (don't deviate):

| Variant | Meaning |
|---|---|
| `badge-glass-green` | Live / Active / Verified / Connected / Success |
| `badge-glass-orange` | Paused / Pending / Warning |
| `badge-glass-red` | Failed / Error / Past Due |
| `badge-glass-blue` | Email / Trial / Lead / Sent |
| `badge-glass-purple` | Special / Pro / Ads / Opened |
| `badge-glass-yellow` | Unsubscribed |
| `badge-glass-muted` | Draft / Canceled / Default |

**Badges are static** — no hover state changes. If a badge needs to be a button, use a button class, not a badge class.

### 15.1 Icon-with-background chip (activity feed style)

```tsx
<div className="bg-success/10 border-success/20 h-spacing-8 w-spacing-8 flex items-center justify-center rounded-full border">
  <Mail className="icon-sm text-success" />
</div>
```

Pattern: background `/10` opacity, border `/20` opacity, icon full color. Works in both themes.

---

## 16. Cards & surfaces

| Class | Purpose |
|---|---|
| `surface-card` | Standard card (background + foreground tokens, backdrop blur) |
| `card` + `card-elevated` | Sized card with elevation |
| `card-glass` | Glassmorphic variant — adds gradient + border + shadow, **no hover effects** |
| `container-glass-nested` | Lighter glass for nested elements (form wrappers inside cards) |
| `section-card` | Settings section container |
| `dialog-glass` | Modal-internal glass overlay |
| `banner-glass-purple` | Resume / "Continue with Vibey" notification banners |

**Standard card:**

```tsx
<div className="surface-card border border-border rounded-spacing-4 p-spacing-4">
  {/* content */}
</div>
```

**Card with footer actions:**

```tsx
<div className="surface-card border border-border rounded-spacing-4 flex h-full flex-col">
  <div className="flex-1 p-spacing-4">{/* content */}</div>
  <div className="border-border border-t p-spacing-4">{/* actions */}</div>
</div>
```

---

## 17. Hover & selection states

### 17.1 The 3-tier hover system

| Tier | Use | Class |
|---|---|---|
| **Tier 1 — Primary CTA** | Glass buttons | (built into `button-glass-*` — do nothing) |
| **Tier 2 — Subtle ghost** | Outline / secondary buttons, sidebar items | `hover:bg-hover-subtle` |
| **Tier 3 — Inline rows** | Dropdown items, table rows, menu items | `hover:bg-hover-subtle hover:text-foreground` |

### 17.2 Semantic hover (destructive / warning)

```tsx
// Destructive
<button className="text-destructive hover:bg-destructive/10">Delete</button>

// Warning / archive
<button className="text-warning hover:bg-warning/10 hover:text-warning">Archive</button>
```

### 17.3 Selected state — purple accent

The canonical "selected" visual is the **purple glass** background. This is the Vibey accent identity and is **tenant-swappable** via `--color-accent-selected`.

```tsx
<button className={isActive
  ? 'nav-glass-selected-purple text-[rgb(var(--vibe-purple-light))] hover:brightness-110'
  : 'text-foreground hover:bg-hover-subtle'
}>
  {item.label}
</button>
```

**Reference:** `apps/web/src/features/spaces/components/header/SwitcherSection.tsx`

---

## 18. Loading & error states

### 18.1 Loading — the CSS orb is the only loading state

**Rule:** All loading states use **`VibeyLoadingOrb`** — the pure-CSS animated orb (no canvas, no Three.js, cheap). Always include descriptive text underneath.

```tsx
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

<VibeyLoadingOrb text="Loading your spaces..." />
```

The component wraps `VibeyChatOrb` with auto-cycling animation styles (`elastic → trails → constellation → liquid → firefly` every 3 s). Pure `<div>`s + CSS — no GPU canvas.

**Size variants:**

| Variant | Orb px | Use |
|---|---:|---|
| `sm` | 32 | Inline next to a label, button-row spinners |
| `md` *(default)* | 56 | Section / panel loaders |
| `lg` | 96 | Full-page route loaders, modal-blocking loads |

**Examples:**

```tsx
{/* Page loader */}
<div className="flex h-full items-center justify-center">
  <VibeyLoadingOrb size="lg" text="Loading your spaces..." />
</div>

{/* Section loader */}
<VibeyLoadingOrb text="Fetching activity..." />

{/* Inline next to button label */}
<button className="button-default button-glass-neutral" disabled>
  <VibeyLoadingOrb size="sm" />
  Saving
</button>
```

**State prop** (`'idle' | 'processing' | 'thinking' | 'streaming'`) — leave at default (`processing`) for loaders. The other states are reserved for chat/agent presence.

### 18.1.1 NOT for loading: `VibeyLoadingSphereSimple` and `VibeyHeroDepthOrb`

These are **3D Three.js / WebGL** scenes (rings, particles, bloom, eye expressions). They are heavy, GPU-bound, and meant for **chat/agent presence and hero surfaces** — never for general loaders.

Use only in:
- Chat threads / agent presence panels (`SpaceVibeyChatPanel`, `AgentChatPanel`, `AgentInfoPanelPortraitSection`)
- Onboarding "Vibey awakening" hero
- Studio home / Vibey idle states

**Do not** import them for buttons, table loads, dropdowns, or page chrome.

### 18.2 Errors

```tsx
import { toast } from '@/lib/utils/toast-helpers'

// Quick feedback
toast.error('Upload failed', { action: { label: 'Try again', onClick: retry } })

// Field-level
{error && <FieldError message="Please enter a valid email" />}

// Page-level
if (error) return <ErrorState message={error} onRetry={loadData} />
```

---

## A. White-label rules

The product is being prepared for a white-label distribution. **Every** style decision must allow a tenant to override the brand without touching component code.

### A.1 What is swappable (per tenant)

| Token | Swappable? | Notes |
|---|---|---|
| `--color-background`, `--color-card`, `--color-secondary` | ✅ | Page chrome |
| `--color-foreground`, `--color-muted-foreground` | ✅ | Text palette |
| `--color-border` | ✅ | Hairlines |
| `--color-primary` | ✅ | Brand primary (default green) |
| `--color-accent-selected` | ✅ | Selected nav state (default Vibey purple) |
| `--color-destructive`, `--color-warning`, `--color-success` | ✅ | Semantic states |

### A.2 What is **not** swappable

- The Vibey **loading sphere** brand mark.
- Data-coded color palettes (calendar/tag colors) — these are user data, not tenant theming.
- Glass effects (gradients, blur, shadows) — these are the Vibey *aesthetic*, not the *palette*.

### A.3 White-label kill list

These patterns make a tenant override impossible. They are **forbidden** in any new code and must be migrated when touched:

1. **Inlined CSS variables** — `text-[var(--color-foreground)]` → `text-foreground`. (~3,000 sites in the codebase.)
2. **Two parallel namespaces** — `--foreground` is a deprecated alias of `--color-foreground`. Pick one.
3. **Tailwind palette colors** — `text-red-*`, `bg-blue-*`, etc. (~887 sites). Always map to a semantic token.
4. **Hex / rgb literals** — `#fff`, `rgba(0,0,0,0.6)`. Use `bg-modal-overlay` and friends.
5. **Inline `style={{ color/background }}`** — moves the value out of CSS, unreachable.
6. **Numeric z-index** — breaks tenant overrides of layer ordering.

---

## B. Migration from legacy patterns

| Legacy | Canon |
|---|---|
| `bg-black/60` (modal overlay) | `bg-modal-overlay` |
| `text-[var(--color-muted-foreground)]` | `text-muted-foreground` |
| `text-[var(--foreground)]` | `text-foreground` |
| `bg-[var(--color-hover-subtle)]` | `bg-hover-subtle` |
| `text-red-400` / `text-red-500` / `text-red-600` | `text-destructive` |
| `bg-red-500/10` | `bg-destructive/10` |
| `style={{ zIndex: 100001 }}` | `className="z-dropdown"` |
| `h-7` (input or button) | `h-spacing-7` + paired `button-compact` |
| `h-9` (input or button) | `h-spacing-9` + paired `button-default` |
| `h-10` (input) | `h-spacing-9` (collapse to default) |
| `btn-icon-glass btn-close-absolute` | `btn-icon-bare` |
| `text-[10px]` section labels | `typo-section-label` |
| `<div>` modals (no DialogPortal) | Radix `DialogPrimitive` + `DialogPortal` |
| `dropdown-menu-glass` (filter/action menus) | `dropdown-menu-solid` |
| Tabs `variant="default"` / `"glass"` | `variant="liquid"` |
| HubTool toolbar patterns (Offers/Funnels/Campaigns hubs) | Removed — use `views/<view>/Toolbar.tsx` per-view |
| `button-small` / `button-medium` (referenced but undefined) | `button-compact` (28) / `button-default` (36) / `button-large` (48) |
| IconPicker **`default`** tint + undecorated nav icons | `text-muted-foreground` — **not** `text-foreground`; user palette swatches (`purple`, `blue`, …) only when explicit |
---

## C. Pre-PR checklist

Before opening a PR with UI changes:

- [ ] Every color comes from a `--color-*` token via a utility class
- [ ] No `[var(--…)]` arbitrary classes in the diff
- [ ] No Tailwind palette colors (`red-*`, `blue-*`, `emerald-*`, etc.) — only semantic tokens
- [ ] No hex codes / `rgb()` / inline `style={{ color/background }}` (data palettes excepted)
- [ ] Z-index uses `z-dropdown` / `z-modal-*` / `z-40` — no numeric values
- [ ] Inputs use `h-spacing-7 / 9 / 12` paired with `button-compact / button-default / button-large`
- [ ] No mix of input heights inside a single form
- [ ] Modals use `DialogPrimitive` + `DialogPortal` + the §10 shell exactly
- [ ] Modal close button = `btn-icon-bare`
- [ ] Modal overlay uses `bg-modal-overlay` + `z-modal-backdrop`
- [ ] Buttons compose `button-{compact|default|large}` + `button-glass-*`
- [ ] Dropdowns are portaled, fixed-positioned, `z-dropdown`, container = `dropdown-menu-solid`
- [ ] Tabs use `variant="liquid"`
- [ ] Tested in light **and** dark themes — no `dark:` branches besides token swaps
- [ ] Loading uses `VibeyLoadingOrb` (CSS orb) with descriptive `text`. **Never** `VibeyLoadingSphereSimple` for general loaders — that's the 3D chat/hero presence orb.
- [ ] Default entity icons (IconPicker **`default`** / no user color): glyph uses **`text-muted-foreground`** — same tier as Teams flyout rows and inbox chromes. Color tokens only apply when user picks a palette swatch (`purple`, `blue`, …). Chrome icons (`FolderKanban`, chevrons, kebab glyphs) stay **`text-muted-foreground`** unless selected / semantic (destructive, etc.)
- [ ] Selected-state uses `nav-glass-selected-purple` + `--color-accent-selected` (not hardcoded purple)
- [ ] Change is logged in today's `.docs/logs/changelog<YYYY-MM-DD>.md`

---

**Cross-references**
- Code architecture: `.cursor/rules/code-guidelines.mdc`
- Token definitions: `apps/web/src/app/globals.css`
- Canonical Spaces files (cite these in PR descriptions when copying patterns):
  - Modal: `features/spaces/components/CreateSpaceModal.tsx`
  - Main menu / 3-dots: `features/spaces/components/header/SpaceMoreMenu.tsx`
  - Switcher dropdown: `features/spaces/components/header/SpaceSwitcherDropdown.tsx`
  - Sidebar context menu: `components/layout/sidebar/SidebarSpaceContextMenu.tsx`
  - Submenu engine: `components/menus/MoveCopySubmenu.tsx`
  - Toolbar / search row: `features/spaces/views/artifacts/ArtifactsToolbar.tsx`
  - Switch: `components/ui/forms/switch.tsx`
