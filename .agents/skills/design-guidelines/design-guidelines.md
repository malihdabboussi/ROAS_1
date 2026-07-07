# Vibey - Design Guidelines

**UI/UX Authority - Visual Patterns, Design Tokens, Component Standards**

---

## 🔍 **Keyword Index (AI Search)**

**Foundation:** `design-tokens`, `theming`, `dark-mode`, `z-index`, `tokens`, `globals.css`
**Typography:** `typography`, `text-sizing`, `body-1`, `body-2`, `body-3`, `body-4`, `title-h6`, `typo-caption`
**Colors:** `color-tokens`, `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `primary`, `accent`, `destructive`
**Spacing:** `spacing-tokens`, `spacing-1`, `spacing-2`, `spacing-3`, `spacing-4`, `spacing-6`, `spacing-8`, `gap-spacing`
**Components:** `modal`, `dialog-header`, `dialog-footer`, `dropdown`, `dropdown-search`, `context-menu`, `portal-menu`, `stacked-dropdown`, `searchable-dropdown`, `hubtool-filter`, `popover`, `helper`, `helper-icon`, `question-mark`, `drawer`, `tooltip`, `button`, `button-hierarchy`, `button-layers`, `glass-button`, `pulse-glow`, `shimmer`, `badge`, `badge-glass`, `glossy-badge`, `status-badge`, `type-badge`, `icon-badge`, `icon-background`, `activity-icon`, `table`, `card`, `glossy-card`, `input`, `input-glass`, `glass-input`, `white-background`, `input-visibility`, `search`, `tabs`, `page-tabs`, `liquid-glass-tabs`, `glass-tabs`, `tabs-liquid-glass`, `switch`, `toggle`, `switch-glass-primary`, `glossy-switch`
**States:** `hover`, `hover-subtle`, `hover-primary`, `hover-destructive`, `hover-archive`, `hover-warning`, `loading`, `error`, `disabled`, `focus`
**Layouts:** `wizard-footer`, `list-table`, `grid-view`, `card-layout`, `page-layout`

---

## 📖 **Quick Reference**

**FOUNDATION**

1. [Design Tokens](#1-design-tokens--theming)
2. [Dark Mode](#2-dark-mode-policy)
3. [Z-Index](#3-z-index-hierarchy)

**VISUAL STANDARDS** 4. [Typography](#4-typography-standards) 5. [Colors](#5-color-token-standards) 6. [Spacing](#6-spacing-standards)

**COMPONENTS** 7. [Modals](#7-modals--popups) 8. [Dropdowns](#8-dropdowns--popovers) 9. [Searchable Dropdowns](#9-searchable-dropdowns) 10. [Drawers](#10-slide-in-drawers) 11. [Page Tabs](#11-page-tabs) 12. [Hover States](#12-hover-states) 13. [Badges](#13-badges--tags) 14. [Icon Badges with Backgrounds](#14-icon-badges-with-backgrounds) 15. [Error Handling](#15-error-handling-ui) 16. [Button Hierarchy & Styles](#16-button-hierarchy--styles) 17. [Wizard Footer](#17-wizard-footer) 18. [Cards & Layouts](#18-cards--layouts) 19. [Tables](#19-list-tables) 20. [Context menus & stacked action dropdowns](#20-context-menus--stacked-action-dropdowns) 21. [Popovers](#21-popovers) 22. [Helper Icons](#22-helper-icons) 23. [Form Inputs](#23-form-input-fields)
23.5. [Input Glass Fix](#235-input-glass-containers-white-background-fix) 24. [Search Inputs](#24-search-inputs) 25. [Filter Badges](#25-filter-count-badges) 26. [Tooltips](#26-tooltips) 27. [Page Metadata](#27-page-metadata) 28. [Vibey Animation](#28-vibey-animation) 29. [Loading States](#29-loading-states) 30. [Switches](#30-switches)

---

## 1. Design Tokens & Theming

**Keywords:** `design-tokens`, `theming`, `tokens`, `globals.css`, `hardcoded-colors`

**Rule:** Always use tokenized utilities from `apps/app/src/app/globals.css`. Never hardcode colors.

**Core Tokens:**

- **Backgrounds:** `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `surface-bg`
- **Text:** `text-foreground`, `text-card-foreground`, `text-muted-foreground`
- **Borders:** `border-border`, `border-input`
- **Variants:** `bg-primary text-primary-foreground`, `bg-accent text-accent-foreground`, `bg-destructive text-destructive-foreground`
- **Focus:** `ring-ring` with `focus-visible:ring-[3px]`

**Pattern:**

```tsx
// ✅ CORRECT
<div className="bg-card border-border text-foreground">

// ❌ WRONG
<div className="bg-white border-gray-200 text-gray-900">
```

**Reference:** `apps/app/src/app/globals.css`

---

## 2. Dark Mode Policy

**Keywords:** `dark-mode`, `theme-aware`, `light-theme`, `dark-theme`

**Rule:** All components work in both themes without modification.

**Section Titles Pattern:**

```tsx
<summary className="typo-caption text-foreground dark:text-primary font-medium">
  SECTION TITLE
</summary>
```

**Checklist:**

- [ ] No hardcoded colors
- [ ] All colors use tokens
- [ ] Tested in both themes

---

## 2.5. App UI Context (Themed Containers)

**Keywords:** `app-ui-context`, `themed-container`, `brand-colors`, `ui-controls`, `theme-override`, `portal`

**Problem:** When UI controls (toolbars, menus, popovers) render inside themed containers (like the Lead Magnet editor), they inherit the user's selected theme colors instead of app branding colors.

**Solution:** Use the `.app-ui-context` class to reset CSS variables to app/brand colors.

**When to Use:**

- UI controls (toolbars, dropdowns, menus) rendered via React portals inside themed containers
- Any element that should maintain app branding regardless of the surrounding theme

**Pattern:**

```tsx
// ✅ CORRECT - Add app-ui-context class to portal content
import { createPortal } from 'react-dom'

return createPortal(
  <div className="app-ui-context surface-card border-border border ...">
    {/* UI controls here will use app branding */}
    <button className="button-glass-blue">Edit</button>
  </div>,
  container,
)

// ❌ WRONG - UI inherits theme colors (looks wrong)
return createPortal(
  <div className="surface-card border-border border ...">
    {/* This will use theme colors, not app branding */}
  </div>,
  container,
)
```

**What `.app-ui-context` Does:**
Resets these CSS variables to app/brand values:

- `--color-foreground`, `--color-muted-foreground` - Text colors
- `--color-card`, `--color-background` - Surface colors
- `--color-border`, `--color-hover-subtle` - UI feedback colors
- `--color-primary`, `--color-accent` - Brand colors

**For Third-Party Components (BlockNote, etc.):**
If you can't add classes directly (e.g., BlockNote's built-in components), use CSS overrides:

```css
/* Mirror .app-ui-context values for third-party components */
.themed-container .third-party-menu {
  --color-foreground: rgb(var(--vibe-black));
  --color-muted-foreground: rgb(var(--vibe-gray-500));
  /* ... other variables */
}

html.dark .themed-container .third-party-menu {
  --color-foreground: #ffffff;
  --color-muted-foreground: #999999;
  /* ... other variables */
}
```

**Reference:**

- Class definition: `apps/app/src/app/globals.css` (search for `.app-ui-context`)
- Usage example: `apps/app/src/features/lead-magnets/components/editor/blocknote/ChartToolbarPortal.tsx`
- CSS overrides: `apps/app/src/features/lead-magnets/components/editor/blocknote/blocknote-overrides.css` (APP BRANDING RESET section)

---

## 3. Z-Index Hierarchy

**Keywords:** `z-index`, `z-modal-backdrop`, `z-modal-content`, `z-dropdown`, `z-40`

**Rule:** Always use named utility classes. Never use arbitrary values like `z-[100]`.

**Layers:**
| Layer | Class | Value | Use Case |
|-------|-------|-------|----------|
| App Shell | `.z-40` | 40 | Header, navigation |
| Modal Backdrop | `.z-modal-backdrop` | 45 | Overlay |
| Modal Content | `.z-modal-content` | 60 | Dialogs |
| Modal Layer 2 | `.z-modal-layer-2` | 70 | Nested modals |
| Dropdowns | `.z-dropdown` | 9999 | Dropdowns, tooltips |

**Pattern:**

```tsx
// ✅ CORRECT
<div className="z-modal-backdrop">...</div>
<div className="z-modal-content">...</div>

// ❌ WRONG
<div className="z-[100]">...</div>
```

---

## 4. Typography Standards

**Keywords:** `typography`, `body-1`, `body-2`, `body-3`, `body-4`, `title-h6`, `typo-caption`

**Text Sizing:**

- `title-h6`: 18px, semibold - Page titles
- `body-1`: 16px - Card titles, primary content
- `body-2`: 14px - List items, form labels, table content
- `body-3`: 13px - Secondary text, dropdown items
- `body-4`: 12px - Small text, metadata
- `typo-caption`: 11px - Captions, hints

**Pattern:**

```tsx
<h1 className="title-h6">Page Title</h1>
<p className="body-2">Content text</p>
<span className="typo-caption text-muted-foreground">Hint</span>
```

---

## 5. Color Token Standards

**Keywords:** `color-tokens`, `bg-background`, `text-foreground`, `primary`, `accent`, `destructive`, `muted-foreground`, `muted-foreground-light`

**Semantic Tokens:**

- **Backgrounds:** `bg-background`, `bg-card`, `bg-popover`, `bg-muted`
- **Text:** `text-foreground`, `text-muted-foreground`
- **Borders:** `border-border`, `border-input`
- **States:** `bg-primary`, `bg-accent`, `bg-destructive`, `bg-success`, `bg-warning`

**Muted Foreground Usage:**

- **Text:** Use `text-muted-foreground` (darker, readable) for all text content
- **Backgrounds:** Use `bg-muted-foreground-light` (lighter) with opacity for backgrounds
  - Example: `bg-muted-foreground-light/30` or `bg-muted-foreground-light/50`
  - ❌ **Never use** `bg-muted-foreground` for backgrounds (too dark/hard in light theme)
  - ✅ **Always use** `bg-muted-foreground-light` for subtle background tints

**Icon Tints:** Use `text-*` tokens. Icons inherit via `currentColor`.

---

## 6. Spacing Standards

**Keywords:** `spacing-tokens`, `spacing-1`, `spacing-2`, `spacing-3`, `spacing-4`, `spacing-6`, `spacing-8`

**Scale:** `spacing-1` (4px) → `spacing-2` (8px) → `spacing-3` (12px) → `spacing-4` (16px) → `spacing-6` (24px) → `spacing-8` (32px)

**Pattern:**

```tsx
<div className="p-spacing-4 gap-spacing-2">
<div className="mt-spacing-6 mb-spacing-3">
```

---

## 7. Modals & Popups

**Keywords:** `modal`, `popup`, `dialog`, `radix-dialog`, `backdrop`, `portal`, `dialog-header`, `dialog-footer`

**Rule:** Use Radix Dialog primitives. Never manual divs (causes top line gaps).

**Pattern:**

```tsx
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogPortal } from '@/components/ui/overlays/dialog'

;<Dialog open={open} onOpenChange={onClose}>
  <DialogPortal>
    <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0 bg-black/55 backdrop-blur-sm" />
    <DialogPrimitive.Content className="z-modal-content p-spacing-6 fixed inset-0 flex items-center justify-center">
      <div className="bg-card border-border rounded-spacing-4 w-full max-w-[600px] border shadow-2xl">
        {/* Content */}
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
</Dialog>
```

**Information Dialog Pattern (Standard for Add/Edit/Create Dialogs):**

**Use for:** Add Domain, Add Segment, Add Sender, Create Contact, and similar information input dialogs.

**Structure:**

```tsx
import { Input } from '@/components/ui/forms/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/overlays/dialog'

;<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="container-modal-lg flex max-h-[85vh] flex-col" showCloseButton={false}>
    {/* Header */}
    <DialogHeader className="px-spacing-6 pt-spacing-4 pb-spacing-2">
      <div className="flex items-center justify-between">
        <DialogTitle className="title-h6">Dialog Title</DialogTitle>
        {/* Layer 4A: Icon-Only Button (Close) */}
        <button onClick={onClose} className="btn-icon-glass">
          <svg className="icon-xs" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <DialogDescription className="body-3 text-muted-foreground mt-spacing-1">
        Description text explaining what this dialog does.
      </DialogDescription>
    </DialogHeader>

    {/* Body - Scrollable */}
    <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
      <form id="form-id" onSubmit={handleSubmit} className="space-y-spacing-4">
        {/* Use Input component with variant="glass" for all inputs */}
        <div>
          <label className="body-3 text-foreground">Field Label</label>
          <div className="mt-spacing-2">
            <Input
              type="text"
              placeholder="Placeholder text"
              value={value}
              onChange={handleChange}
              variant="glass"
              disabled={isSubmitting}
            />
          </div>
          <p className="body-3 text-muted-foreground mt-spacing-1">Optional hint text</p>
        </div>
      </form>
    </div>

    {/* Footer */}
    <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-t">
      {/* Layer 2C: Technical Button (Cancel) = Glass Neutral + t3 Hover */}
      <button
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
        className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancel
      </button>
      {/* Layer 2A: Main Button (Submit) = Glass Accent + Pulse Glow */}
      <button
        type="submit"
        form="form-id"
        disabled={isSubmitting || !isValid}
        className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="gap-spacing-2 relative z-10 flex items-center">
          {isSubmitting && (
            <svg className="icon-sm animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {isSubmitting ? 'Saving...' : 'Submit'}
        </span>
      </button>
    </div>
  </DialogContent>
</Dialog>
```

**Key Characteristics:**

- **Container:** `container-modal-lg max-h-[85vh] flex flex-col` (flex layout for header/body/footer)
- **showCloseButton:** `false` (use custom close button in header)
- **Header:** `px-spacing-6 pt-spacing-4 pb-spacing-2` with title, custom close button (`btn-icon-glass`), and description
- **Body:** `flex-1 overflow-y-auto px-spacing-6 py-spacing-4 space-y-spacing-4` (scrollable content area)
- **Inputs:** Always use `<Input variant="glass" />` for glossy input styling
- **Footer:** `px-spacing-6 py-spacing-4 border-t border-border` with Cancel (glass neutral) and Submit (glass accent with pulse glow - CSS handles automatically) buttons
- **Form:** Use `form="form-id"` attribute on submit button to link to form outside footer

**When to Use:**

- Add/Create dialogs (Add Domain, Add Segment, Add Sender, Create Contact)
- Edit dialogs with form inputs
- Information input dialogs requiring user data entry

**Reference:** `apps/app/src/features/communications/components/email/domains/AddEmailDomainDialog.tsx`, `apps/app/src/app/(protected)/settings/properties/page.tsx` (Segment Dialog)

**Large Modals:** Use `createPortal` to `document.body` for modals >800px.

**Reference:**

- Dialog Header/Footer: `apps/app/src/features/communications/components/email/domains/AddEmailDomainDialog.tsx`
- Full modals: `OfferCopilotWizardContainer.tsx`, `FunnelCopilotModal.tsx`

---

## 8. Dropdowns & Popovers

**Keywords:** `dropdown`, `popover`, `menu`, `positioning`, `hubtool-filter`, `filter-dropdown`

**Out of scope here:** Kebab/right-click **portaled action menus** (Spaces funnel menu, flyout submenus). Use **`design-guidelines/SKILL.md` → Context menus & stacked action dropdowns** and **§20** below—**not** this section’s HubTool/filter/sort patterns.

**Standard Pattern:**

```tsx
<div className="relative">
  <Button onClick={() => setIsOpen(!isOpen)}>Trigger</Button>
  {isOpen && (
    <div className="mt-spacing-1 absolute right-0 top-full z-50" data-dropdown>
      <div className="surface-card border-border rounded-spacing-2 p-spacing-2 min-w-40 border shadow-lg">
        {/* Menu items */}
      </div>
    </div>
  )}
</div>
```

**HubTool Filter Dropdown Pattern (Offers/Funnels/Campaigns):**

```tsx
{
  /* Simple list items */
}
;<div className="space-y-spacing-1">
  {OPTIONS.map((option) => {
    const isSelected = selected.includes(option.id)
    return (
      <button
        key={option.id}
        className="gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 hover:bg-hover-subtle body-3 flex w-full items-center text-left"
        onClick={() => handleToggle(option.id)}
      >
        {isSelected ? <Check className="icon-sm text-primary" /> : <div className="icon-sm" />}
        <span className="text-muted-foreground">{option.label}</span>
      </button>
    )
  })}
</div>

{
  /* Grouped options with sections */
}
;<div className="space-y-spacing-3">
  <h3 className="body-3 text-foreground px-spacing-2 py-spacing-1 font-medium">Section Title</h3>
  {GROUPS.map((group) => (
    <div key={group.group} className="space-y-spacing-1">
      <div className="typo-caption text-muted-foreground px-spacing-2 uppercase tracking-wider">
        {group.group}
      </div>
      <div className="space-y-spacing-0">
        {group.options.map((option) => {
          const isSelected = current === option.id
          return (
            <button
              key={option.id}
              className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left ${
                isSelected
                  ? 'bg-primary/10 text-muted-foreground'
                  : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
              } `}
              onClick={() => handleSelect(option.id)}
            >
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="typo-caption text-muted-foreground">{option.description}</div>
              </div>
              {isSelected && <Check className="icon-sm text-muted-foreground" />}
            </button>
          )
        })}
      </div>
    </div>
  ))}
</div>
```

**Click Outside:** Use `useEffect` with `mousedown` listener checking `data-dropdown` attribute:

```tsx
useEffect(() => {
  if (!isOpen) return
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('[data-dropdown]') && !target.closest('button')) {
      setIsOpen(false)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [isOpen])
```

**Reference:** `apps/app/src/features/offer/components/hub/OffersHubToolbar.tsx`

---

**HubTool Sort Dropdown Pattern (Standard for Sort Menus):**

**Use for:** All sort dropdowns in HubTools (Offers, Funnels, Campaigns, CRM, Lab, Themes, Media)

**Pattern:**

```tsx
{
  activeDropdown === 'sort' && (
    <div className="mt-spacing-1 absolute right-0 top-full z-50" data-dropdown>
      <div className="dropdown-menu-solid p-spacing-2 min-w-48">
        <div className="space-y-spacing-3">
          <h3 className="body-3 text-foreground px-spacing-2 py-spacing-1 font-medium">Sort by</h3>
          {SORT_OPTIONS.map((group) => (
            <div key={group.group} className="space-y-spacing-1">
              <div className="typo-caption text-muted-foreground px-spacing-2 uppercase tracking-wider">
                {group.group}
              </div>
              <div className="space-y-spacing-0">
                {group.options.map((option) => {
                  const isSelected = currentSort === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSortSelect(option.id)}
                      className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                        isSelected
                          ? 'dropdown-sort-option-selected text-muted-foreground'
                          : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                      } `}
                    >
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="typo-caption text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="dropdown-sort-check ml-spacing-2">
                          <svg
                            viewBox="0 0 20 20"
                            className="tint-green relative z-30 h-2.5 w-2.5"
                            fill="currentColor"
                            aria-hidden="true"
                            style={{ filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))' }}
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Key Characteristics:**

- **Selected state:** `dropdown-sort-option-selected` class (green glossy background matching checkbox selected state)
- **Hover state:** `hover:bg-hover-subtle hover:text-foreground` (t3 hover effect)
- **Check icon:** `dropdown-sort-check` class with green circle checkmark SVG (right-aligned)
- **Structure:** Grouped options with sections (group title + options with descriptions)
- **Container:** `dropdown-menu-solid min-w-48 p-spacing-2`

**CSS Classes:**

- `.dropdown-sort-option-selected` - Green glossy background for selected option
- `.dropdown-sort-check` - Green circle check icon (right-aligned)

**When to Use:**

- All sort dropdowns in HubTools
- Single-select dropdowns (not multi-select checkboxes)
- Dropdowns requiring visual indication of selected state with green glossy styling

**Reference:** `apps/app/src/features/crm/components/hub/CrmHubToolbar.tsx`, `apps/app/src/features/offer/components/hub/OffersHubToolbar.tsx`

---

## 9. Searchable Dropdowns

**Keywords:** `dropdown-search`, `searchable-dropdown`, `filter-dropdown`, `dropdown-with-search`

**Pattern:** Dropdown with search input at top, filtered selectable items below.

**Standard Pattern (Conversation History):**

```tsx
const [searchQuery, setSearchQuery] = useState('')
const [isOpen, setIsOpen] = useState(false)

// Filter items based on search
const filteredItems = useMemo(() => {
  if (!searchQuery.trim()) return items
  return items.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
}, [items, searchQuery])

{
  isOpen && (
    <div className="mt-spacing-1 bg-card border-border rounded-spacing-2 absolute right-0 top-full z-50 flex max-h-[500px] w-80 flex-col overflow-hidden border shadow-lg">
      {/* Search Bar */}
      <div className="border-border border-b">
        <div className="gap-spacing-2 bg-background p-spacing-2 group flex items-center">
          <Search className="icon-sm text-muted-foreground group-focus-within:text-foreground flex-shrink-0 transition-colors" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="typo-caption placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Filtered Items List */}
      <div className="p-spacing-2 flex-1 overflow-y-auto">
        {filteredItems.length > 0 ? (
          <div className="space-y-spacing-1">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className="px-spacing-2 py-spacing-2 rounded-spacing-1 hover:bg-hover-subtle hover:text-foreground body-3 text-muted-foreground w-full text-left"
              >
                {item.title}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-spacing-4 text-center">
            <p className="body-3 text-muted-foreground">No results found</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Pattern with Action Button (Conversation Selector):**

```tsx
{
  /* Search Bar with Action */
}
;<div className="gap-spacing-2 p-spacing-3 border-border flex items-center border-b">
  <div className="gap-spacing-2 bg-muted/20 rounded-spacing-2 px-spacing-3 py-spacing-2 flex min-w-0 flex-1 items-center">
    <Search className="icon-sm text-muted-foreground flex-shrink-0" />
    <input
      type="text"
      placeholder="Search..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="body-2 placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent focus:outline-none"
    />
  </div>
  <button
    onClick={handleAction}
    className="p-spacing-2 hover:bg-muted/20 rounded-spacing-2 flex-shrink-0"
    title="Action"
  >
    <Plus className="icon-sm text-muted-foreground" />
  </button>
</div>
```

**Key Classes:**

- Container: `flex flex-col overflow-hidden` (allows scrollable content area)
- Search bar: `border-b border-border` (separator)
- Search input container: `bg-background p-spacing-2` or `bg-muted/20 rounded-spacing-2 px-spacing-3 py-spacing-2`
- Search icon: `icon-sm text-muted-foreground group-focus-within:text-foreground`
- Input: `flex-1 bg-transparent typo-caption` or `body-2`
- Items container: `flex-1 overflow-y-auto p-spacing-2` (scrollable area)
- Empty state: `py-spacing-4 text-center body-3 text-muted-foreground`

**Structure:**

- Search bar always at top with `border-b border-border`
- Items list is scrollable (`overflow-y-auto`) with `flex-1` to fill remaining space
- Use `useMemo` to filter items based on search query
- Auto-focus search input when dropdown opens

**Reference:** `apps/app/src/features/vibey/components/conversation/ConversationHistoryModal.tsx`, `apps/app/src/features/vibey/components/conversation/ConversationSelector.tsx`

---

## 10. Slide-in Drawers

**Keywords:** `drawer`, `slide-in`, `filter-drawer`, `panel`

**Pattern:**

```tsx
<div
  className={cn(
    'bg-card border-border z-modal-content fixed right-0 top-0 h-full w-[400px] transform border-l transition-transform duration-300',
    isOpen ? 'translate-x-0' : 'translate-x-full',
  )}
>
  {/* Drawer content */}
</div>
```

**Gap Spacing:** Use `gap-spacing-4` between drawer and main content.

**Reference:** Filter drawers in Campaign Map, Offers List

---

## 11. Page Tabs

**Keywords:** `tabs`, `page-tabs`, `tab-navigation`, `radix-tabs`, `liquid-glass-tabs`, `glass-tabs`

**Component:** `@/components/ui/navigation/tabs`

### 11.1. Liquid Glass Tabs (Recommended)

**Use for:** All tabs in the application - settings pages, modals, integrations, etc.

**Pattern:**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'

;<Tabs defaultValue="tab1" className="space-y-spacing-6">
  {/* Tab Navigation - Liquid Glass Variant */}
  <TabsList variant="liquid">
    <TabsTrigger value="tab1" className="px-spacing-4">
      Tab 1
    </TabsTrigger>
    <TabsTrigger value="tab2" className="px-spacing-4">
      Tab 2
    </TabsTrigger>
    <TabsTrigger value="tab3" className="px-spacing-4">
      Tab 3
    </TabsTrigger>
  </TabsList>

  {/* Tab Content */}
  <TabsContent value="tab1">
    <Tab1Content />
  </TabsContent>
  <TabsContent value="tab2">
    <Tab2Content />
  </TabsContent>
  <TabsContent value="tab3">
    <Tab3Content />
  </TabsContent>
</Tabs>
```

**Key Props:**

- `variant="liquid"` on TabsList applies the liquid glass styling
- No additional classes needed on TabsTrigger (CSS handles active states)

**Characteristics:**

- Frosted glass background with subtle blur effect
- Theme-aware (works in both light and dark modes)
- Active tab has soft white/translucent background with inset shadow
- Smooth hover transitions on inactive tabs
- Consistent with app's glossy design language

**CSS Classes (defined in globals.css):**

- `tabs-liquid-glass` - Applied to TabsList container
- `tabs-liquid-glass-trigger` - Applied to TabsTrigger elements
- Active state uses `[data-state="active"][data-variant="liquid"]` selector

---

### 11.2. Default Tabs (Legacy)

**Use for:** Only if liquid glass doesn't fit the context (rare cases)

**Pattern:**

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'

;<div className="p-spacing-8">
  <Tabs defaultValue="tab1" className="space-y-spacing-6">
    {/* Tab Navigation - Default Variant */}
    <TabsList className="bg-muted p-1">
      <TabsTrigger value="tab1" className="px-spacing-4">
        Tab 1
      </TabsTrigger>
      <TabsTrigger value="tab2" className="px-spacing-4">
        Tab 2
      </TabsTrigger>
    </TabsList>

    <TabsContent value="tab1">
      <Tab1Content />
    </TabsContent>
  </Tabs>
</div>
```

**Key Classes:**

- Container: `p-spacing-8` (page padding)
- Tabs wrapper: `space-y-spacing-6` (spacing between tabs and content)
- TabsList: `bg-muted p-1` (muted background with 1px padding)
- TabsTrigger: `px-spacing-4` (horizontal padding for tab labels)

---

### 11.3. TabsList Variants

| Variant     | Class Applied                       | Use Case                                                        |
| ----------- | ----------------------------------- | --------------------------------------------------------------- |
| `"liquid"`  | `tabs-liquid-glass`                 | **Default choice** - All tabs in settings, modals, integrations |
| `"default"` | `surface-card border border-border` | Legacy/fallback                                                 |
| `"glass"`   | `tabs-glass`                        | Deprecated - use `"liquid"` instead                             |

**Structure:**

- Tabs component wraps everything with `defaultValue` and `space-y-spacing-6`
- TabsList contains all TabsTrigger elements with `variant="liquid"`
- Each TabsTrigger has `px-spacing-4` for consistent padding
- TabsContent wraps each tab's content (no additional classes needed)

**Reference:**

- Settings pages: `apps/app/src/app/(protected)/settings/communications/email/page.tsx`
- Modals: `apps/app/src/features/communications/components/email/compose/BroadcastComposeModal.tsx`
- Integrations: `apps/app/src/features/integrations/components/general/IntegrationsView.tsx`

---

## 12. Hover States

**Keywords:** `hover`, `hover-subtle`, `hover-primary`, `hover-states`, `hover-destructive`, `hover-archive`, `hover-warning`

**3-Tier System:**

**Tier 1 (Primary):** No class needed - Button component CSS handles it

```tsx
<Button>Save</Button>
```

**Tier 2 (Secondary):** `hover:bg-muted/20`

```tsx
<Button variant="outline" className="hover:bg-muted/20">
  Regenerate
</Button>
```

**Tier 3 (Tertiary):** `hover:bg-hover-subtle hover:text-foreground`

```tsx
<button className="hover:bg-hover-subtle hover:text-foreground">Cancel</button>
```

**Special Cases:**

**Archive Actions (Orange/Warning):**

```tsx
<button className="gap-spacing-2 px-spacing-2 py-spacing-2 hover:bg-warning/10 hover:text-warning body-3 text-warning flex w-full items-center text-left">
  <Archive className="icon-sm" />
  <span>Archive</span>
</button>
```

- Default: `text-warning` (orange)
- Hover: `hover:bg-warning/10 hover:text-warning` (orange background + text)

**Delete Actions (Red/Destructive):**

```tsx
<button className="gap-spacing-2 px-spacing-2 py-spacing-2 hover:bg-destructive/10 body-3 text-destructive flex w-full items-center text-left">
  <Trash2 className="icon-sm" />
  <span>Delete</span>
</button>
```

- Default: `text-destructive` (red)
- Hover: `hover:bg-destructive/10` (red background, text stays red - no hover text class needed)

**Navigation:**

- `hover:bg-interactive` (already implemented in AppShell)

**Reference:** `apps/app/src/features/vibey/components/conversation/ConversationSidebar.tsx`, `apps/app/src/features/offer/components/list/OffersListView.tsx`

---

## 13. Badges & Tags

**Keywords:** `badge`, `tag`, `status-badge`, `type-badge`, `badge-glass`, `glossy-badge`

**Rule:** Always use glossy badge classes from `globals.css`. Never hardcode colors or use inline styles.

**Base Pattern:**

```tsx
// ✅ CORRECT - Always combine base class + color variant
<span className="badge-glass badge-glass-blue typo-caption font-medium">
  Email
</span>

// ❌ WRONG - Don't use hardcoded hex colors
<span className="bg-[#3b82f6]/10 text-[#3b82f6] border-2 border-[#3b82f6]">
  Email
</span>
```

**Available Badge Classes:**

**Base Class (Required):**

- `badge-glass` - Base styling (padding, border-radius, backdrop-filter, transitions)

**Color Variants (Use with base class):**

- `badge-glass-blue` - Email, Trial, Lead Magnet, Sent status, DNS verified
- `badge-glass-green` - Active, Success, Call Booking, SMS, Verified, Delivered, Connected
- `badge-glass-orange` - Webinar, Warning, Canceling, Pending, Verifying, Bounced
- `badge-glass-red` - Destructive, Error, Past Due, Unpaid, Failed, SSL failed, Spam
- `badge-glass-purple` - Email Clicked, Special Actions, Default Category, Pro Plan, Opened, Ads, VSL
- `badge-glass-yellow` - Unsubscribed, Warning States
- `badge-glass-muted` - Draft, Canceled, Default States, Sales Page, Queued, Dropped
- `badge-glass-indigo` - Email Clicked Status
- `badge-glass-success-bg` - Published/Live status (light green/gray tone)
- `badge-glass-warning-bg` - Paused status (light orange/gray tone)
- `badge-glass-secondary-bg` - Archived status (dark gray tone)

**Common Use Cases:**

**Funnel Types:**

```tsx
// Lead Magnet
<span className="badge-glass badge-glass-blue typo-caption font-medium">Lead Magnet</span>

// Call Booking
<span className="badge-glass badge-glass-green typo-caption font-medium">Call Booking</span>

// Webinar
<span className="badge-glass badge-glass-orange typo-caption font-medium">Webinar</span>

// Sales Page
<span className="badge-glass badge-glass-muted typo-caption font-medium">Sales Page</span>
```

**Status Badges:**

```tsx
// Published/Live
<span className="badge-glass badge-glass-success-bg typo-caption font-medium">Live</span>

// Paused
<span className="badge-glass badge-glass-warning-bg typo-caption font-medium">Paused</span>

// Draft
<span className="badge-glass badge-glass-muted typo-caption font-medium">Draft</span>

// Archived
<span className="badge-glass badge-glass-secondary-bg typo-caption font-medium">Archived</span>
```

**Email Status:**

```tsx
const STATUS_COLORS: Record<EmailStatus, string> = {
  queued: 'badge-glass badge-glass-muted',
  sent: 'badge-glass badge-glass-blue',
  delivered: 'badge-glass badge-glass-green',
  opened: 'badge-glass badge-glass-purple',
  clicked: 'badge-glass badge-glass-indigo',
  bounced: 'badge-glass badge-glass-orange',
  dropped: 'badge-glass badge-glass-muted',
  spam: 'badge-glass badge-glass-red',
  unsubscribed: 'badge-glass badge-glass-yellow',
  failed: 'badge-glass badge-glass-red',
}

<span className={`${STATUS_COLORS[email.status]} typo-caption font-medium`}>
  {email.status}
</span>
```

**Domain/Integration Status:**

```tsx
// Verified/Connected
<span className="badge-glass badge-glass-green typo-caption font-medium">Verified</span>

// Pending/Verifying
<span className="badge-glass badge-glass-orange typo-caption font-medium">Pending</span>

// Failed/Error
<span className="badge-glass badge-glass-red typo-caption font-medium">Failed</span>
```

**Content Types:**

```tsx
// Email
<span className="badge-glass badge-glass-blue typo-caption font-medium">Email</span>

// SMS
<span className="badge-glass badge-glass-green typo-caption font-medium">SMS</span>

// Social
<span className="badge-glass badge-glass-orange typo-caption font-medium">Social</span>

// Ads/VSL
<span className="badge-glass badge-glass-purple typo-caption font-medium">Ads</span>
```

**Key Characteristics:**

- **Always combine:** `badge-glass` + color variant (e.g., `badge-glass badge-glass-blue`)
- **Typography:** Use `typo-caption` for badge text (11px)
- **Font weight:** Use `font-medium` for badge text
- **Theme-aware:** Automatically adapts to light/dark themes
- **Glossy effect:** Backdrop blur, gradient backgrounds, inset shadows
- **No hover effects:** Badges are static (no hover state changes)

**Reference:** `apps/app/src/app/globals.css` (lines 1278-1445), `apps/app/src/features/funnels/components/FunnelsListView.tsx`, `apps/app/src/features/communications/components/email/history/EmailHistoryTable.tsx`

---

## 14. Icon Badges with Backgrounds

**Keywords:** `icon-badge`, `icon-background`, `activity-icon`, `chip-icon`, `colored-icon-badge`

**Pattern:** Icons with colored backgrounds that work in both light and dark themes using opacity-based colors.

**Standard Pattern:**

```tsx
// Background: 10% opacity (adapts to theme)
// Border: 20% opacity (subtle definition)
// Icon: Full color (always visible)

<div className="h-spacing-8 w-spacing-8 flex items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10">
  <Mail className="icon-sm text-blue-500" />
</div>
```

**Color Examples:**

```tsx
// Email (Blue)
className = 'bg-blue-500/10 border border-blue-500/20'
icon: text - blue - 500

// Conversion/Success (Green)
className = 'bg-green-500/10 border border-green-500/20'
icon: text - green - 500

// Primary/Dark (Primary Dark)
className = 'bg-primary-dark/10 border border-primary-dark/20'
icon: text - primary - dark

// Clicked/Link (Purple)
className = 'bg-purple-500/10 border border-purple-500/20'
icon: text - purple - 500

// Delivered (Light Green)
className = 'bg-green-400/10 border border-green-400/20'
icon: text - green - 400
```

**Key Principles:**

- **Background opacity:** Always use `/10` (10% opacity) - adapts to theme background
- **Border opacity:** Always use `/20` (20% opacity) - subtle definition without overwhelming
- **Icon color:** Full color (no opacity) - ensures visibility in both themes
- **Size:** Standard is `h-spacing-8 w-spacing-8` (32px) for activity icons
- **Shape:** Always `rounded-full` for icon badges

**Why This Works:**

- Low-opacity backgrounds blend with theme (light/dark)
- Full-color icons maintain contrast in both themes
- Borders provide subtle definition without visual weight
- Consistent pattern across all activity types

**When to Use:**

- Activity icons (email, conversion, booking, etc.)
- Status indicators with icons
- Category badges with icons
- Any icon that needs colored background for visual distinction

**❌ WRONG - Gray Background with White Text:**

```tsx
// Don't use this - poor contrast in dark mode
<div className="bg-gray-500 text-white">
  <Icon />
</div>
```

**Reference:** `apps/app/src/features/crm/components/detail/ActivityEventItem.tsx` (lines 18-42, 203, 231)

---

## 15. Error Handling UI

**Keywords:** `error`, `toast`, `inline-error`, `error-state`, `validation`

**3 Patterns:**

**Toast (Quick Feedback):**

```tsx
import { toast } from '@/lib/utils/toast-helpers'

toast.error('Upload failed', { action: { label: 'Try Again', onClick: retry } })
```

**Inline (Field-Level):**

```tsx
import { FieldError } from '@/components/ui/inline-error'

{
  error && <FieldError message="Please enter a valid email" />
}
```

**Error State (Page-Level):**

```tsx
import { ErrorState } from '@/components/ui/error-state'

if (error) return <ErrorState message={error} onRetry={loadData} />
```

**Reference:** `apps/app/src/lib/error-handling-guide.md`

---

## 15.5. Simple Delete Confirmation Dialogs

**Keywords:** `delete-dialog`, `delete-confirmation`, `simple-delete`, `delete-confirm-dialog`

**Pattern:** Simple delete confirmation dialog without "Type DELETE" requirement. Used for less critical deletions.

**Standard Pattern:**

```tsx
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/overlays/dialog'

;<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="container-modal-md">
    <DialogHeader className="text-center">
      <div className="bg-destructive/10 mb-spacing-3 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive h-6 w-6" />
      </div>
      <DialogTitle className="title-h5">{title}</DialogTitle>
      <DialogDescription className="body-2 text-muted-foreground mt-spacing-6">
        {itemName && (
          <>
            Are you sure you want to delete <span className="font-semibold">"{itemName}"</span>
            ?{' '}
          </>
        )}
        {description}
      </DialogDescription>
    </DialogHeader>

    <div className="gap-spacing-3 pt-spacing-2">
      <div className="gap-spacing-2 pt-spacing-2 flex">
        {/* Layer 2C: Technical Button (Cancel) = Glass Neutral + t3 Hover */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        {/* Layer 2E: Destructive Button (Delete) = Glass Destructive + Pulse Glow */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isDeleting}
          className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="relative z-10">{isDeleting ? 'Deleting...' : confirmButtonText}</span>
        </button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

**Key Characteristics:**

- **Container:** `container-modal-md` (not `dialog-glass`)
- **Header:** `text-center` alignment
- **Icon:** `w-12 h-12 bg-destructive/10 rounded-full mb-spacing-3` with AlertTriangle icon
- **Title:** `title-h5` class
- **Description:** `body-2 text-muted-foreground mt-spacing-6` (important: `mt-spacing-6` for spacing)
- **Content wrapper:** `gap-spacing-3 pt-spacing-2`
- **Buttons wrapper:** `flex gap-spacing-2 pt-spacing-2`
- **Cancel button:** `button-glass-neutral flex-1` with t3 hover
- **Delete button:** `button-glass-destructive flex-1` with pulse glow animation on hover (CSS handles automatically)
- **No confirmation input:** User clicks delete directly (no "Type DELETE" requirement)

**When to Use:**

- Simple deletions (domains, segments, integrations)
- Less critical operations
- When user intent is clear from context

**When NOT to Use:**

- Critical deletions (offers, campaigns, funnels) → Use "Type DELETE" pattern instead
- High-risk operations → Use confirmation input pattern

**Reference:** `apps/app/src/components/ui/overlays/delete-confirm-dialog.tsx`

---

## 15.6. Critical Delete Confirmation Dialogs (Type DELETE)

**Keywords:** `delete-dialog`, `type-delete`, `critical-delete`, `delete-confirmation-input`

**Pattern:** Critical delete confirmation dialog requiring user to type "DELETE" to confirm. Used for high-risk deletions.

**Standard Pattern:**

```tsx
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/forms/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/overlays/dialog'

const [confirmText, setConfirmText] = useState('')
const isConfirmValid = confirmText === 'DELETE'

<Dialog open={isOpen} onOpenChange={handleClose}>
  <DialogContent className="container-modal-md">
    <DialogHeader className="text-center">
      <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-spacing-3">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <DialogTitle className="title-h5">
        {title}
      </DialogTitle>
      <DialogDescription className="body-2 text-muted-foreground mt-spacing-2">
        {description}
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-spacing-4 pt-spacing-4">
      <div>
        <label className="block label-text text-foreground mb-spacing-2">
          Type "DELETE" to confirm deletion of <span className="font-semibold">"{itemName}"</span>
        </label>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE here"
          className="w-full"
          disabled={isDeleting}
        />
      </div>

      <div className="flex gap-spacing-3 pt-spacing-2">
        {/* Layer 2C: Technical Button (Cancel) = Glass Neutral + t3 Hover */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isDeleting}
          className="button-glass-neutral flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-hover-subtle hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          Cancel
        </button>
        {/* Layer 2E: Destructive Button (Delete) = Glass Destructive + Pulse Glow */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isConfirmValid || isDeleting}
          className="button-glass-destructive flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <span className="relative z-10">
            {isDeleting ? 'Deleting...' : confirmButtonText}
          </span>
        </button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

**Key Characteristics:**

- **Container:** `container-modal-md`
- **Header:** `text-center` alignment with AlertTriangle icon
- **Icon:** `w-12 h-12 bg-destructive/10 rounded-full mb-spacing-3`
- **Title:** `title-h5` class
- **Description:** `body-2 text-muted-foreground mt-spacing-2`
- **Confirmation Input:** Label with "Type DELETE" instruction, Input field
- **Content wrapper:** `space-y-spacing-4 pt-spacing-4`
- **Buttons wrapper:** `flex gap-spacing-3 pt-spacing-2`
- **Cancel button:** `button-glass-neutral flex-1` with t3 hover
- **Delete button:** `button-glass-destructive flex-1` with pulse glow animation on hover (CSS handles automatically)
- **Button disabled state:** Delete button disabled until `confirmText === 'DELETE'`
- **Pulse glow:** CSS handles hover animation automatically (disabled buttons don't animate)

**When to Use:**

- Critical deletions (offers, campaigns, funnels, sequences, marketing content, leads)
- High-risk operations that cannot be undone
- When extra confirmation is required for safety

**When NOT to Use:**

- Simple deletions (domains, segments, integrations) → Use Simple Delete Dialog pattern instead
- Less critical operations → Use Simple Delete Dialog pattern

**Reference:** `apps/app/src/features/offer/components/dialogs/DeleteOfferDialog.tsx`, `apps/app/src/features/funnels/components/dialogs/DeleteFunnelDialog.tsx`, `apps/app/src/features/campaigns/components/dialogs/DeleteCampaignDialog.tsx`

---

## 16. Button Hierarchy & Styles

**Keywords:** `button`, `button-hierarchy`, `button-layers`, `glass-button`, `pulse-glow`, `shimmer`

### 16.1. Button Hierarchy (4 Layers)

Buttons are organized into 4 hierarchical layers based on their context and importance:

---

#### **Layer 1: Top-Level Primary Actions**

**Context:** Main CTAs in hub toolbars - Entry points for creating new resources

**Style:** Primary Button (Glossy with Shimmer Effect)

```tsx
<Button className="gap-spacing-2 flex items-center">
  <Plus className="icon-sm" />
  New Offer
</Button>
```

**Characteristics:**

- Primary variant (glossy with shimmer effect)
- Prominent placement (right side of toolbar)
- Icon + text label
- Main entry point for creation flows
- Used in: OffersHubToolbar, FunnelsHubToolbar, CampaignsHubToolbar

**Reference:** `apps/app/src/features/offer/components/hub/OffersHubToolbar.tsx`

---

#### **Layer 2: Dialog/Modal Secondary Actions**

**Context:** Decision points in dialogs, wizards, and forms

**Sub-types:**

**2A: Main Button (Continue, Generate, Finalize, Save Changes, Start Fresh, Continue with Vibey)**

- **Style:** Glass Accent + Pulse Glow (CSS handles hover animation automatically)

```tsx
<button className="button-glass-accent rounded-lg px-4 py-2 font-medium">
  <span className="relative z-10">Continue</span>
</button>
```

**2B: Secondary Button (Regenerate)**

- **Style:** Glass Neutral + Animated Icon (no t3 hover)

```tsx
<button
  className="button-glass-neutral rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
  onMouseEnter={() => setHoveredButton('regenerate')}
  onMouseLeave={() => setHoveredButton(null)}
>
  <span className="flex items-center gap-2">
    <RotateCw
      className={`h-4 w-4 transition-transform duration-500 ${hoveredButton === 'regenerate' ? 'animate-spin' : ''}`}
    />
    Regenerate
  </span>
</button>
```

**2C: Technical Button (Cancel/Back)**

- **Style:** Glass Neutral + t3 Hover Effect

```tsx
<button className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 font-medium transition-all duration-200">
  <span className="flex items-center gap-2">
    <ArrowLeft className="h-4 w-4" />
    Back
  </span>
</button>
```

**2D: Keep My Draft (Choice Dialogs)**

- **Style:** Outline + Animated Icon

```tsx
<button
  className="border-border hover:bg-hover-subtle group relative flex-1 rounded-lg border bg-transparent px-4 py-2 font-medium transition-all duration-300"
  onMouseEnter={() => setHoveredButton('keep-draft')}
  onMouseLeave={() => setHoveredButton(null)}
>
  <span className="flex items-center justify-center gap-2">
    <FileText
      className={`h-4 w-4 transition-transform duration-500 ${hoveredButton === 'keep-draft' ? 'animate-bounce' : ''}`}
    />
    Keep My Draft
  </span>
</button>
```

**2E: Destructive Button (Delete, Remove, Archive)**

- **Style:** Glass Destructive (Red) + Pulse Glow - Glossy red variant matching purple/primary glass buttons with pulse animation (CSS handles hover animation automatically)

```tsx
<button className="button-glass-destructive rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">
  <span className="relative z-10">Yes, delete it</span>
</button>
```

**Characteristics:**

- Glass effect with red gradient background (matches purple/primary glass style)
- Red border and shadow for visual emphasis
- Theme-aware (darker red in light mode, lighter red in dark mode)
- Used for destructive actions (delete, remove, archive)
- Always requires confirmation (e.g., "Type DELETE to confirm")

**Used in:** DeleteOfferDialog, DeleteFunnelDialog, Remove actions in dialogs

**Reference:** `apps/app/src/features/offer/components/dialogs/DeleteOfferDialog.tsx`

---

**Used in:** StartFreshDialog, OfferCopilotWizardContainer, Form/Settings dialogs, Banner actions

**Reference:** `apps/app/src/features/funnels/components/dialogs/StartFreshDialog.tsx`, `apps/app/src/features/offer/containers/OfferCopilotWizardContainer.tsx`

---

#### **Layer 3: Card/Toolbar Tertiary Actions**

**Context:** Utility actions on cards and toolbar controls

**3A: Card Actions (View Offer)**

- **Style:** Glass Purple with Reduced Opacity (0.7 default, 1.0 on hover - CSS handles automatically)

```tsx
<button className="button-glass-purple gap-spacing-2 px-spacing-3 h-spacing-8 inline-flex items-center rounded-lg font-medium">
  <span className="relative z-10 flex items-center gap-1.5">
    <Eye className="h-4 w-4" />
    View Offer
  </span>
</button>
```

**3B: Hub Toolbar Controls (Search, Filter, Sort, View Toggle)**

- **Style:** Glass Blue with Reduced Opacity (0.7 default, 1.0 on hover - CSS handles automatically)

```tsx
<button className="button-glass-blue gap-spacing-1 h-spacing-8 px-spacing-3 flex items-center rounded-lg font-medium">
  <span className="relative z-10 flex items-center gap-1">
    <Search className="icon-sm" />
    <Filter className="icon-sm" />
  </span>
</button>
```

**Used in:** OffersListView (card actions), OffersHubToolbar (toolbar controls)

**Reference:** `apps/app/src/features/offer/components/list/OffersListView.tsx`, `apps/app/src/features/offer/components/hub/OffersHubToolbar.tsx`

---

#### **Layer 4: Micro Actions**

**Context:** Minimal visual weight - Icon-only and inline micro-interactions

**4A: Icon-Only Buttons (3-dot menu, close buttons, edit buttons)**

- **Style:** CSS-only soft glass with hover effects

```tsx
// ✅ CORRECT - Use btn-icon-glass class (CSS handles all effects)
<button className="btn-icon-glass">
  <MoreVertical className="w-4 h-4" />
</button>

// ❌ WRONG - Don't use inline styles or JS hover handlers
<button
  style={{ background: 'linear-gradient(...)', ... }}
  onMouseEnter={() => setHoveredButton('icon')}
>
```

**Built-in Effects:**

- ✅ Soft glass gradient background
- ✅ Light sweep effect on hover
- ✅ Lift effect (`translateY(-1px)`) on hover
- ✅ Color change (muted → foreground) on hover
- ✅ Consistent 32x32px sizing

**Reference:** `apps/app/src/app/globals.css` (search for `.btn-icon-glass`)

**4A-Destructive: Destructive Icon Buttons (Delete/Remove Actions)**

- **Style:** CSS-only destructive glass with red gradient and hover effects

```tsx
// ✅ CORRECT - Use btn-icon-glass-destructive class (CSS handles all effects)
<button className="btn-icon-glass-destructive">
  <Trash2 className="icon-sm" />
</button>

// ❌ WRONG - Don't use inline styles or manual hover classes
<button
  className="btn-icon-glass text-destructive hover:bg-destructive/10"
>
```

**Built-in Effects:**

- ✅ Destructive red glass gradient background
- ✅ Red border and shadow for visual emphasis
- ✅ Light sweep effect on hover
- ✅ Lift effect (`translateY(-1px)`) on hover
- ✅ Color change (darker red → lighter red) on hover
- ✅ Theme-aware (darker red in light mode, lighter red in dark mode)
- ✅ Consistent 32x32px sizing

**When to Use:**

- Delete/remove actions in tables and lists
- Destructive operations that require visual emphasis
- Icon-only buttons that perform destructive actions

**Reference:** `apps/app/src/app/globals.css` (search for `.btn-icon-glass-destructive`)

**4B: Pills/Tabs (All, Draft, Complete, Archived)**

- **Style:** CSS-only glass effect with built-in hover (no JS needed)

```tsx
// ✅ CORRECT - CSS class handles all hover effects
<button className={`pill pill--sm ${selectedPill === 'all' ? 'pill--active' : ''}`}>
  All
</button>

// ❌ WRONG - Don't use inline styles or JS hover handlers
<button style={{ opacity: 0.7 }} onMouseEnter={...}>
```

**Available Pill Classes:**
| Class | Purpose |
|-------|---------|
| `pill` | Base pill styling with glass effect |
| `pill--sm` | Small size variant |
| `pill--active` | Active state (full opacity) |

**Built-in Effects:**

- ✅ Opacity transition (0.7 → 1.0 on hover)
- ✅ Light sweep effect (`::after` pseudo-element)
- ✅ Lift effect (`translateY(-1px)` on hover)
- ✅ Consistent styling across all features

**Used in:** Hub toolbars (Offers, Campaigns, Lab, Funnels, Themes)

**Reference:** `apps/app/src/app/globals.css` (search for `.pill`)

---

### 16.2. Button Heights & Icon Sizes

**Button Heights:**

- Small: `h-spacing-8` (32px)
- Medium: `h-spacing-10` (40px) - Default
- Large: `h-spacing-12` (48px)

**Icon Sizes:**

- `icon-xs`: 12px
- `icon-sm`: 16px (default)
- `icon-md`: 20px
- `icon-lg`: 24px

---

### 16.3. Glass Button Classes

**Available Classes:**
| Class | Color | Use Case |
|-------|-------|----------|
| `button-glass-primary` | Green | Primary actions |
| `button-glass-accent` | Green (lighter) | Secondary emphasis |
| `button-glass-purple` | Purple | View/navigation actions |
| `button-glass-blue` | Blue | Toolbar controls |
| `button-glass-neutral` | Neutral | Cancel, back buttons |
| `button-glass-destructive` | Red | Delete actions |
| `button-glass-pink` | Pink | Special actions |

**Built-in Effects (CSS-only, no JS needed):**

- ✅ Opacity transition (0.7 → 1.0 on hover)
- ✅ Light sweep effect (`::after` pseudo-element)
- ✅ Lift effect (`translateY(-1px)` on hover)
- ✅ Pulse glow animation on hover (`button-glass-accent` and `button-glass-destructive`)
- ✅ Dark mode support

**⚠️ CRITICAL: Never use inline styles or JS hover handlers**

- ❌ **NEVER** use `style={{ opacity: 0.7 }}` or `onMouseEnter`/`onMouseLeave` for opacity
- ❌ **NEVER** use `style={{ boxShadow: ... }}` or JS handlers for pulse glow animations
- ✅ **ALWAYS** use CSS classes only - all effects are handled automatically

**Usage:**

```tsx
// ✅ CORRECT - CSS class handles all hover effects
<button className="button-glass-purple px-4 py-2 rounded-lg">
  View Offer
</button>

// ❌ WRONG - Don't add inline hover handlers for visual effects
<button
  className="button-glass-purple"
  onMouseEnter={(e) => e.target.style.opacity = '1'}
  style={{ opacity: 0.7 }}
>
```

**Button Size Utilities:**
| Class | Height | Padding |
|-------|--------|---------|
| `button-small` | 32px | 4px 12px |
| `button-medium` | 40px | 8px 16px |
| `button-large` | 48px | 12px 24px |

**Additional Classes:**

- `button-secondary` - Neutral glass button (alternative to `button-glass-neutral`)
- `btn-icon-glass` - Icon-only glass button (32x32px)

**Reference:** `apps/app/src/app/globals.css` (search for `button-glass-`)

---

## 17. Wizard Footer

**Keywords:** `wizard-footer`, `continue-button`, `back-button`, `wizard-navigation`

**Pattern:**

```tsx
<div className="p-4 border-t border-border flex justify-between">
  {currentStep === 0 ? <div /> : (
    {/* Layer 2: Technical Button (Back) = Glass Neutral + t3 Hover */}
    <button className="button-glass-neutral px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-hover-subtle hover:text-foreground">
      <span className="flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back
      </span>
    </button>
  )}
  <div className="flex gap-2">
    {/* Layer 2: Main Button (Continue) = Glass Accent + Pulse Glow */}
    <button className="button-glass-accent px-6 py-2 rounded-lg font-medium">
      <span className="relative z-10">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {currentStep === 0 ? 'Generate' : 'Continue'}
      </span>
    </button>
  </div>
</div>
```

**Reference:** `apps/app/src/features/offer/containers/OfferCopilotWizardContainer.tsx`, `apps/app/src/features/funnels/components/dialogs/StartFreshDialog.tsx`

---

## 18. Cards & Layouts

**Keywords:** `card`, `card-layout`, `grid-view`, `list-view`, `glossy-card`, `card-style`

### 18.1. Card Styles

---

#### **Glossy Card Style (Default for Grid Cards)**

**Use for:** Grid view cards (e.g., Offer cards, Funnel cards, Campaign cards, Sequence cards)

**Style:**

```tsx
// ✅ CORRECT - Use CSS utility classes (no inline styles)
<div className="card card-elevated card-glass">{/* Card content */}</div>
```

**Available Card Classes:**
| Class | Purpose |
|-------|---------|
| `card` | Base card sizing (min-height: 220px) |
| `card-elevated` | Elevation and shadow |
| `card-glass` | Glassmorphic gradient, border, shadow (no hover effects) |
| `surface-card` | Standard card background with backdrop blur |

**Characteristics:**

- `card-glass` provides gradient background, border, and shadow
- No hover effects (explicitly disabled for consistency)
- Works in both light and dark themes
- Combines with `card` and `card-elevated` for full styling

**Reference:** `apps/app/src/app/globals.css` (search for `.card-glass`)

---

#### **Container & Input Glass Styles**

**Use for:** Wizard input containers, nested elements, form wrappers

**Classes:**

```tsx
// Nested glass container (lighter effect)
<div className="container-glass-nested p-spacing-6 rounded-spacing-2">
  <Input className="border-0 bg-transparent shadow-none" />
</div>

// Section card (settings panels)
<div className="section-card p-spacing-6">
  <h3>Section Title</h3>
  {/* Content */}
</div>

// Dialog glass overlay
<div className="dialog-glass p-spacing-6">
  {/* Modal content */}
</div>
```

**Available Container Classes:**
| Class | Purpose | Use Case |
|-------|---------|----------|
| `container-glass-nested` | Lighter glass for nested elements | Wizard inputs, editable cards |
| `section-card` | Settings section containers | Business profile cards, settings groups |
| `dialog-glass` | Modal glass overlay | Dialog containers, wizard overlays |
| `surface-card` | Standard card with backdrop blur | Toolbars, general containers |
| `banner-glass-purple` | Purple glass banner with glow | "Continue with Vibey" banners, draft resume notifications |

**Banner Glass Purple Usage:**

```tsx
// Resume draft / Continue banner pattern
<div className="banner-glass-purple">
  <div className="gap-spacing-6 relative z-10 flex items-center justify-between">
    <div className="space-y-spacing-2">
      <span className="body-2 text-foreground">Title text</span>
      <span className="body-3 text-muted-foreground block">Subtitle text</span>
    </div>
    <div className="gap-spacing-2 flex flex-shrink-0 items-center">
      <button className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium">
        <span className="relative z-10">Continue with Vibey</span>
      </button>
      <button className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-lg">
        <X className="h-4 w-4" />
      </button>
    </div>
  </div>
</div>
```

---

#### **Icon Button Glass Style**

**Use for:** Icon-only buttons (3-dot menus, edit buttons, close buttons)

**Style:**

```tsx
// ✅ CORRECT - Use btn-icon-glass class
<button className="btn-icon-glass">
  <Edit className="w-4 h-4" />
</button>

// ❌ WRONG - Inline styles
<button style={{ background: 'linear-gradient(...)', ... }}>
```

**Characteristics:**

- Subtle glass gradient background
- Light sweep effect on hover
- Lift effect (`translateY(-1px)`) on hover
- Consistent sizing (32x32px)
- Works in both light and dark themes

---

#### **Dropdown Menu Styles**

**Use for:** **Radix/shadcn** `DropdownMenuContent` wrappers (opaque vs glass chrome only).

**Not for:** Spaces-style **portaled context / stacked action menus** (`createPortal`, segmented top row + dense rows)—those follow **`SKILL.md` → Context menus & stacked action dropdowns** and **§20** (`FunnelMenuDropdown.tsx` reference).

**Classes:**

```tsx
// Solid dropdown (recommended for filters)
<DropdownMenuContent className="dropdown-menu-solid">
  <DropdownMenuItem>Item 1</DropdownMenuItem>
</DropdownMenuContent>

// Glass dropdown (special contexts)
<DropdownMenuContent className="dropdown-menu-glass">
  <DropdownMenuItem>Item 1</DropdownMenuItem>
</DropdownMenuContent>
```

**Available Dropdown Classes:**
| Class | Purpose | Use Case |
|-------|---------|----------|
| `dropdown-menu-solid` | Opaque background (no transparency) | Filter dropdowns, action menus |
| `dropdown-menu-glass` | Glassmorphic with backdrop blur | Special decorative contexts |

**Important:** Always use `dropdown-menu-solid` for filter/action dropdowns to prevent background bleed-through. (Distinct from §20 portaled Spaces menus.)

---

#### **Standard Card Pattern**

**Use for:** General cards, dialogs, containers

**Style:**

```tsx
<div className="surface-card border-border rounded-spacing-4 p-spacing-4 border">
  {/* Content */}
</div>
```

**Actions at Bottom:**

```tsx
<div className="flex h-full flex-col">
  <div className="flex-1">{/* Content */}</div>
  <div className="border-border p-spacing-4 border-t">{/* Actions */}</div>
</div>
```

---

## 19. List Tables

**Keywords:** `table`, `list-table`, `grid-layout`, `table-row`, `table-header`

**Pattern:**

```tsx
<div className="gap-spacing-4 grid grid-cols-[var(--spacing-6)_2fr_0.8fr_0.8fr_1fr_var(--spacing-44)]">
  {/* Header */}
  <div className="bg-muted/10 body-3 text-muted-foreground py-spacing-2">Header</div>

  {/* Rows */}
  <Card className="hover:shadow-md">
    <div className="body-2 text-foreground font-medium">Title</div>
    <div className="body-4 text-muted-foreground">Content</div>
  </Card>
</div>
```

**Row Click:** Use `e.stopPropagation()` on buttons inside clickable rows.

**Reference:** Offers List, Funnels List, Campaigns List

---

## 20. Context menus & stacked action dropdowns

**Keywords:** `context-menu`, `action-menu`, `kebab-menu`, `portal-menu`, `stacked-dropdown`, `funnel-menu`, `spaces-menu`

**Canonical implementation:** `apps/web/src/features/spaces/components/artifacts/funnel/FunnelMenuDropdown.tsx`

**Offers (same layout + classes):** `apps/web/src/features/spaces/components/artifacts/offer/OfferMenuDropdown.tsx`

**Duplicate from:** Claude skill **`.claude/skills/design-guidelines/SKILL.md` → Context menus & stacked action dropdowns** (tables with **exact classes + px**).

**Not this section:**

- `<Select>` / multi-select / combobox (pickers elsewhere)
- **§8** HubTool filter lists & **sort** dropdown (`dropdown-sort-*`, `dropdown-menu-solid` panels)
- **§9** Searchable dropdowns
- Radix **`DropdownMenu`** surface only (**§16** `dropdown-menu-solid` / `dropdown-menu-glass`)

**Behaviour:** `fixed` portal + **`z-dropdown`**, **`data-*`** attribute on menu root for outside dismiss; optional **segmented top row** with **`divide-x`** and **`rounded-none`** cells inside **`overflow-hidden rounded-md`** wrapper; stacked rows use **`rounded-spacing-2`**, **`px-spacing-2 py-spacing-1`**, **`gap-spacing-2`**, **`h-3.5 w-3.5`** leading icons, **`h-3 w-3`** submenu chevron, **`hover:bg-[var(--color-hover-subtle)]`**.

**Removal note:** Older “Card Dropdown Pattern” rows (**`py-spacing-2`**, **`px-spacing-3`**, **`h-4 w-4`** icons, **`hover:bg-muted/20`**) for **this menu type** are deprecated—match **`FunnelMenuDropdown`**, **`OfferMenuDropdown`**, or **SKILL** spec instead.

---

## 21. Popovers

**Keywords:** `popover`, `helper-text`, `info-popover`

**Component:** `@/components/ui/overlays/popover`

**Pattern:**

```tsx
import { Popover } from '@/components/ui/overlays/popover'

;<Popover content="Helper text here" side="right">
  <button className="icon-container--sm">
    <Info className="icon-sm text-muted-foreground" />
  </button>
</Popover>
```

**When to Use:** Helper text, explanations, additional context (not tooltips).

---

## 22. Helper Icons

**Keywords:** `helper`, `helper-icon`, `question-mark`, `wizard-helper`, `field-helper`

**Component:** `@/components/ui/overlays/popover`

**Pattern:** Question mark icon next to titles/descriptions that shows explanatory text on hover.

**Next to Title (Smaller):**

```tsx
import { Popover } from '@/components/ui/overlays/popover'

;<div className="gap-spacing-1 flex items-center">
  <h1 className="title-h6">Step Title</h1>
  <Popover content="Explanatory help text here" side="right">
    <span className="rounded-spacing-1 border-light text-muted-foreground flex h-4 w-4 cursor-help items-center justify-center text-xs leading-none">
      ?
    </span>
  </Popover>
</div>
```

**Next to Label (Larger):**

```tsx
<label className="label-text text-foreground gap-spacing-2 block flex items-center">
  <span>Field Label</span>
  <Popover content="Help text explaining this field" side="right">
    <span className="rounded-spacing-1 border-light text-muted-foreground inline-flex h-5 w-5 cursor-help items-center justify-center">
      ?
    </span>
  </Popover>
</label>
```

**Key Classes:**

- Container: `flex items-center gap-spacing-1` or `gap-spacing-2` (spacing between title/label and helper)
- Helper icon: `flex items-center justify-center` or `inline-flex items-center justify-center`
- Size: `w-4 h-4` (smaller, for titles) or `w-5 h-5` (larger, for labels)
- Styling: `rounded-spacing-1 border-light text-muted-foreground cursor-help`
- Typography: `text-xs leading-none` (for smaller w-4 h-4 version)

**Structure:**

- Always use Popover component wrapping the "?" span
- Position helper icon immediately after title/label text
- Use `side="right"` for most cases (shows to the right of icon)
- Helper text appears on hover (Popover handles this automatically)

**When to Use:**

- Next to wizard step titles
- Next to form field labels that need explanation
- For contextual help that's longer than a tooltip
- When explanation text is more than one sentence

**Reference:** `apps/app/src/features/offer/containers/OfferCopilotWizardContainer.tsx`, `apps/app/src/features/offer/components/wizard/steps/GetStartedForm.tsx`

---

## 23. Form Input Fields

**Keywords:** `input`, `form-input`, `text-input`, `input-field`

**Pattern:**

```tsx
<input
  type="text"
  className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground dark:placeholder:text-muted-foreground/70 text-foreground w-full border"
/>
```

**With Label:**

```tsx
<div>
  <label className="body-2 mb-spacing-2 block">Field Label</label>
  <input className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground dark:placeholder:text-muted-foreground/70 text-foreground w-full border" />
</div>
```

**Height:** Always `h-spacing-10` (40px) to match buttons.

---

## 23.5. Input Glass Containers (White Background Fix)

**Keywords:** `input-glass`, `white-background`, `themed-container`, `input-visibility`, `glass-input`

**Problem:** Inputs inside `.input-glass` containers appear with white backgrounds instead of transparent.

**Root Cause:** There's a global CSS rule that forces white backgrounds on all inputs to ensure visibility in themed containers (like the Lead Magnet editor where slides can have custom dark themes):

```css
/* Line ~273 in globals.css */
input[type='search']:not(.input-glass):not(.preview-input) {
  background-color: rgba(255, 255, 255, 0.95) !important;
}
```

This rule has **higher CSS specificity** (0,3,1) than the `.input-glass input` rule (0,2,1), so it wins even when the input is inside an `.input-glass` container.

**The Fix:** Add `input-glass` class directly to the `<input>` element itself (not just the parent container).

```tsx
// ❌ WRONG - Input has white background (parent has class, input doesn't)
<div className="input-glass">
  <input type="search" className="..." />
</div>

// ✅ CORRECT - Input is transparent (input has class directly)
<div className="input-glass">
  <input type="search" className="input-glass ..." />
</div>
```

**Why This Works:**

- The selector `:not(.input-glass)` means "if the input does NOT have this class"
- Adding `input-glass` to the input → selector no longer matches → no forced white background

**Quick Reference:**

| Symptom                                  | Fix                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| Input inside `.input-glass` has white bg | Add `input-glass` class to the `<input>` itself                           |
| Still white after adding class           | Also add `bg-transparent` or `style={{ backgroundColor: 'transparent' }}` |

**When You'll Encounter This:**

- Search inputs in dropdown pickers (IconPicker, ColorPicker, etc.)
- Text inputs inside glass-styled wizard forms
- Any input nested inside a `.input-glass` container

**Reference:** `apps/app/src/app/globals.css` (lines ~271-276 and ~1363)

---

## 24. Search Inputs

**Keywords:** `search-input`, `search-field`, `search-bar`

**Pattern:**

```tsx
<div className="w-container-tool-md relative">
  <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none" />
  <input type="search" className="input-leading w-full" placeholder="Search..." />
</div>
```

**Key Classes:**

- Container: `relative w-container-tool-md`
- Icon: `icon-left-center icon-sm text-muted-foreground pointer-events-none`
- Input: `w-full input-leading`

---

## 25. Filter Count Badges

**Keywords:** `filter-badge`, `count-badge`, `filter-count`

**Pattern:**

```tsx
{
  filterCount > 0 && (
    <span className="px-spacing-1 bg-primary text-primary-foreground typo-caption inline-flex h-5 min-w-[20px] items-center justify-center rounded-full font-medium">
      {filterCount}
    </span>
  )
}
```

**Calculation:** Count only filters with meaningful values (not empty strings/arrays).

---

## 26. Tooltips

**Keywords:** `tooltip`, `hover-tooltip`, `icon-tooltip`

**Component:** `@/components/ui/tooltip`

**Pattern:**

```tsx
<Tooltip content="Manage Content">
  <button>...</button>
</Tooltip>
```

**Specs:** 200ms delay, top placement, `bg-gray-900 text-white text-[11px]`.

---

## 27. Page Metadata

**Keywords:** `page-metadata`, `page-title`, `metadata-title`

**Utility:** `@/lib/utils/page-metadata`

**Pattern:**

```tsx
import { getPageMetadata } from '@/lib/utils/page-metadata'

export const metadata = getPageMetadata('offers')
// Returns: { title: 'Offers | Vibey' }
```

**Available Pages:** `offers`, `funnels`, `campaigns`, `branding`, `crm`, `automation`, `settings`

---

## 28. Vibey Animation

**Keywords:** `vibey-animation`, `loading-sphere`, `vibey-loader`

**Component:** `VibeyLoadingSphereSimple` (not Full version)

**Pattern:**

```tsx
import { VibeyLoadingSphereSimple } from '@/components/ui/vibey-loading-sphere'

;<div className="h-12 w-12">
  <VibeyLoadingSphereSimple size="small" />
  <span className="vibey-text">Vibey</span>
</div>
```

**Sizes:** `small` (5 rings) or `medium` (10 rings). Use `small` for performance.

**Reference:** `@/components/ui/vibey-loading-sphere`

---

## 29. Loading States

**Keywords:** `loading-state`, `page-loading`, `vibey-loading`, `loading-spinner`

**Pattern:** Always use `VibeyLoadingSphereSimple` with descriptive loading text.

**Component:** `PageLoadingState` wrapper with `VibeyLoadingSphereSimple` + message

**Standard Pattern:**

```tsx
import { PageLoadingState } from '@/components/ui/feedback/page-loading-state'

;<PageLoadingState message="Loading your offers..." />
```

**Custom Loading Pattern:**

```tsx
import { VibeyLoadingSphereSimple } from '@/components/vibey/vibey-loading-sphere-simple'

;<div className="flex flex-col items-center justify-center gap-4 p-8">
  <div className="h-12 w-12">
    <VibeyLoadingSphereSimple size="small" />
  </div>
  <p className="body-2 text-muted-foreground">Loading your XYZ...</p>
</div>
```

**Rules:**

- Always include descriptive text ("Loading your [entity]...")
- Use `size="small"` for performance (5 rings)
- Center both spinner and text vertically/horizontally
- Use `text-muted-foreground` for loading text
- Maintain consistent spacing (`gap-4` or `gap-spacing-4`)

**Reference:** `@/components/ui/feedback/page-loading-state`, `@/components/vibey/vibey-loading-sphere-simple`

---

## 30. Switches

**Keywords:** `switch`, `toggle`, `switch-glass-primary`, `glossy-switch`

**Component:** `@/components/ui/forms/switch`

**Pattern:** Always use the `Switch` component which automatically applies the glossy glass primary style.

**Standard Pattern:**

```tsx
import Switch from '@/components/ui/forms/switch'

;<Switch checked={isEnabled} onCheckedChange={(checked) => setIsEnabled(checked)} />
```

**Characteristics:**

- **Style:** Glass Primary (Green Glossy) - matches button-glass-primary styling
- **Enabled state:** Green glass gradient background with glossy effect
- **Disabled state:** Subtle white/neutral glass background
- **Thumb:** White glossy circle that slides smoothly
- **Theme-aware:** Automatically adapts to light/dark themes
- **Size:** Standard height `h-5` (20px), width `w-9` (36px)
- **Thumb size:** `h-4 w-4` (16px)

**CSS Classes:**

- `.switch-glass-primary` - Applied to switch container (handled by Switch component)
- `.switch-glass-primary-thumb` - Applied to thumb element (handled by Switch component)

**When to Use:**

- Toggle settings (notifications, auto-save, tracking options)
- Enable/disable features
- Boolean preference toggles
- Any on/off state control

**Implementation Details:**

- Switch component automatically applies `switch-glass-primary` class
- Thumb position controlled by `translate-x-4` (enabled) or `translate-x-1` (disabled)
- Smooth transitions for all state changes (0.3s ease)
- Backdrop blur and gradient effects match button-glass-primary styling

**Reference:** `apps/app/src/components/ui/forms/switch.tsx`, `apps/app/src/app/globals.css` (search for `.switch-glass-primary`)

---

## 31. Quick Checklist

**Before PR:**

- [ ] All colors use tokens (no hardcoded)
- [ ] Tested in light and dark themes
- [ ] Z-index uses named classes (no arbitrary values)
- [ ] Hover states use 3-tier system
- [ ] Modals use Radix Dialog primitives
- [ ] Buttons use standard heights (`h-spacing-8/10/12`)
- [ ] Icons use standard sizes (`icon-sm/md/lg`)
- [ ] Spacing uses tokens (`spacing-1` through `spacing-8`)
- [ ] Typography uses standard classes (`body-1/2/3/4`, `title-h6`)

---

**For detailed patterns, see:**

- Code architecture: `.cursor/rules/code-guidelines.mdc`
- Project structure: `docs/.project-architecture.md`
- Error handling: `apps/app/src/lib/error-handling-guide.md`
