# Sidebar Audit: VibeyV2 vs Legacy

**Date:** 2026-02-11
**New Sidebar:** `/root/repos/VibeyV2/apps/web/src/components/layout/Sidebar.tsx`
**Legacy Sidebar:** `/root/repos/Vibey/apps/app/src/components/layouts/app-shell/components/CampaignSidebar.tsx`

---

## Executive Summary

The new VibeyV2 sidebar is a **significant simplification** from the legacy. It implements the core structure but **misses several key features** from the legacy sidebar. The most critical gaps are:

1. ❌ **No "Edit" option in campaign menu** — Legacy has Edit, new only has Pin/Open/Delete
2. ❌ **No CampaignFormModal** — New uses simplified `NewCampaignModal` instead of full `CampaignFormModal`
3. ❌ **Avatar dropdown severely limited** — Missing Credits, Workspace Settings, Theme submenu, What's New, Give Feedback
4. ⚠️ **Footer tabs not using proper Tabs component** — Custom div implementation vs `<Tabs variant="liquid">`

---

## 1. Structure Match

### ✅ Features that match 1:1

| Feature                                            | New | Legacy | Status                          |
| -------------------------------------------------- | --- | ------ | ------------------------------- |
| Logo + collapse toggle                             | ✅  | ✅     | **MATCH**                       |
| New Agent button (chip-glass-green, UserPlus icon) | ✅  | ✅     | **MATCH**                       |
| Search bar (input-glass)                           | ✅  | ✅     | **MATCH**                       |
| Campaigns section with accordion                   | ✅  | ✅     | **MATCH**                       |
| All Agents section with filter                     | ✅  | ✅     | **MATCH**                       |
| Footer: Create/Manage tabs + Avatar                | ✅  | ✅     | **MATCH** (but styling differs) |

### ⚠️ Structure order

Both follow the same order:

1. Top spacer
2. Logo + collapse toggle (absolute positioned)
3. New Agent button
4. Search bar (when expanded)
5. Campaigns section
6. All Agents section
7. Footer with tabs + avatar

**✅ Structure order matches.**

---

## 2. Campaign Features

### ✅ Features that match

| Feature                                             | Status       |
| --------------------------------------------------- | ------------ |
| Accordion expand/collapse with nested conversations | ✅ **MATCH** |
| Icon/chevron swap on hover (group/folder pattern)   | ✅ **MATCH** |
| Pin/unpin campaigns (sorted pinned first)           | ✅ **MATCH** |
| 3-dot menu with Pin, Open in new tab, Delete        | ✅ **MATCH** |

### ❌ Missing Features

| Feature                               | Issue                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Edit option in campaign menu**      | ❌ **MISSING** - Legacy has Edit button that opens `CampaignFormModal` for editing. New sidebar has NO edit option.                                                                                          |
| **CampaignFormModal for create/edit** | ❌ **MISSING** - Legacy uses `CampaignFormModal` which supports both create AND edit mode with full context (Offer, Skills, Theme, Goal). New uses simplified `NewCampaignModal` which only has name + icon. |

### 🔧 Fixes Required

1. Add "Edit" menu item to campaign dropdown
2. Replace `NewCampaignModal` with a proper `CampaignFormModal` that supports:
   - Creating new campaigns
   - Editing existing campaigns (with `initialData` prop)
   - Full context: Offer selection, Skills selection, Theme selection, Goal field

---

## 3. Conversation Features

### ✅ Features that match 1:1

| Feature                                        | Status       |
| ---------------------------------------------- | ------------ |
| Rename (inline input)                          | ✅ **MATCH** |
| Favorite toggle (star icon)                    | ✅ **MATCH** |
| Move to Campaign submenu                       | ✅ **MATCH** |
| Remove from Campaign                           | ✅ **MATCH** |
| Open in new tab                                | ✅ **MATCH** |
| Delete                                         | ✅ **MATCH** |
| Star/3-dots swap on hover (group/conv pattern) | ✅ **MATCH** |

**✅ All conversation features match!**

---

## 4. Filter Dropdown

### ✅ Features that match 1:1

| Feature                     | Status       |
| --------------------------- | ------------ |
| All Agents option           | ✅ **MATCH** |
| Non-Campaign Agents option  | ✅ **MATCH** |
| Favorites option            | ✅ **MATCH** |
| Check icon on active filter | ✅ **MATCH** |

**✅ Filter dropdown fully matches!**

---

## 5. Footer Tabs

### ⚠️ Partial Match

| Feature               | New                | Legacy                                      | Status           |
| --------------------- | ------------------ | ------------------------------------------- | ---------------- |
| Create/Manage tabs    | Custom div buttons | `<Tabs>` with `<TabsList variant="liquid">` | ⚠️ **DIFFERENT** |
| "Manage" tab disabled | Not disabled       | Has Tooltip "Coming soon" + disabled        | ⚠️ **DIFFERENT** |

**Legacy implementation:**

```tsx
<Tabs value={sidebarMode} onValueChange={...}>
  <TabsList variant="liquid">
    <TabsTrigger value="studio">Create</TabsTrigger>
    <Tooltip content="Coming soon">
      <TabsTrigger value="hq" disabled>Manage</TabsTrigger>
    </Tooltip>
  </TabsList>
</Tabs>
```

**New implementation:**

```tsx
<div className="flex h-8 items-center gap-0.5 rounded-lg bg-[var(--color-secondary)]/50 p-0.5">
  <button onClick={() => handleSwitchMode('studio')} className={...}>Create</button>
  <button onClick={() => handleSwitchMode('hq')} className={...}>Manage</button>
</div>
```

### 🔧 Fixes Required

1. Replace custom div with `<Tabs>` and `<TabsList variant="liquid">`
2. Add Tooltip "Coming soon" wrapper on Manage tab
3. Make Manage tab disabled

---

## 6. Avatar Dropdown

### ❌ MAJOR GAP

**Legacy `AvatarDropdown` has:**

1. ✅ Credits section (Total, Remaining, Buy More button)
2. ✅ Account Settings
3. ✅ Workspace Settings
4. ✅ Theme submenu (Light/Dark)
5. ✅ What's New link
6. ✅ Give Feedback
7. ✅ Log out

**New Sidebar avatar dropdown has:**

1. ❌ NO Credits section
2. ✅ Account Settings (links to /settings)
3. ❌ NO Workspace Settings
4. ❌ NO Theme submenu
5. ❌ NO What's New
6. ❌ NO Give Feedback
7. ✅ Log out

### 🔧 Fixes Required

1. Import and use the full `AvatarDropdown` component from legacy
2. OR create a new `AvatarDropdown` component with all features:
   - Credits usage section with entitlements data
   - Account Settings
   - Workspace Settings
   - Theme submenu (Light/Dark)
   - What's New
   - Give Feedback
   - Log out

---

## 7. Collapsed State

### ✅ Features that match 1:1

| Feature                                | Status       |
| -------------------------------------- | ------------ |
| Logo → expand icon on hover            | ✅ **MATCH** |
| Icon-only buttons                      | ✅ **MATCH** |
| Campaigns flyout dropdown (right side) | ✅ **MATCH** |
| Agents flyout dropdown (right side)    | ✅ **MATCH** |

**✅ Collapsed state fully matches!**

---

## 8. CSS Classes

### ✅ Classes that match

| Class                       | Usage              | Status       |
| --------------------------- | ------------------ | ------------ |
| `chip-glass-green`          | New Agent button   | ✅ **MATCH** |
| `nav-glass-selected-purple` | Active item        | ✅ **MATCH** |
| `nav-glass-hover-purple`    | Hover state        | ✅ **MATCH** |
| `nav-glass-text-purple`     | Active text        | ✅ **MATCH** |
| `input-glass`               | Search input       | ✅ **MATCH** |
| `surface-card`              | Sidebar background | ✅ **MATCH** |
| `body-2`, `body-3`          | Typography         | ✅ **MATCH** |
| `icon-sm`                   | Icons              | ✅ **MATCH** |

### ⚠️ Minor differences

| Class            | New              | Legacy                   | Issue                                |
| ---------------- | ---------------- | ------------------------ | ------------------------------------ |
| `border-t-glass` | `border-t-glass` | `border-t border-border` | ⚠️ Slightly different but equivalent |
| `typo-caption`   | Not used         | Used for section headers | ⚠️ New uses `text-[10px]` inline     |

---

## 9. Context & Props

### CampaignModeContext

**New (`/root/repos/VibeyV2/apps/web/src/features/studio/contexts/CampaignModeContext.tsx`):**

- ✅ Has `sidebarMode`
- ✅ Has `setSidebarMode`
- ✅ Has `activeCampaignId`, `activeCampaignName`
- ✅ Has panel state (isPanelMinimized, isPanelExpanded)
- ✅ Has `activePreviewTab`, `setActivePreviewTab`

**✅ Context is complete!**

### Dashboard Layout

**New (`/root/repos/VibeyV2/apps/web/src/app/(dashboard)/layout.tsx`):**

- ✅ Passes `userName`, `email`, `avatarUrl` to Sidebar

**But missing props that legacy sidebar receives:**

- ❌ `sidebarCollapsed`, `setSidebarCollapsed` — New manages internally
- ❌ `sidebarMode` — New gets from context
- ❌ Theme props (theme, setTheme)
- ❌ Modal state props (setBillingDialogOpen, setWordDialogOpen, setFeedbackModalOpen)
- ❌ `realtimeManager`

**This is fine** — the new sidebar is self-contained and gets what it needs from context. The props difference is architectural, not a bug.

---

## Summary: What Needs to Be Fixed

### High Priority (Breaking Features)

1. **❌ Add "Edit" option to campaign menu**
   - File: `Sidebar.tsx`
   - Add Edit menu item that opens campaign edit modal

2. **❌ Replace `NewCampaignModal` with full `CampaignFormModal`**
   - Either port the legacy `CampaignFormModal` to VibeyV2
   - Or enhance `NewCampaignModal` to support:
     - Edit mode (with `initialData` prop)
     - Goal field
     - Offer selection
     - Skills selection
     - Theme selection

3. **❌ Fix Avatar Dropdown**
   - Add Credits section
   - Add Workspace Settings
   - Add Theme submenu
   - Add What's New
   - Add Give Feedback

### Medium Priority (Polish)

4. **⚠️ Use proper Tabs component for footer**
   - Import `Tabs`, `TabsList`, `TabsTrigger` from UI library
   - Use `variant="liquid"`
   - Add Tooltip and disabled state for Manage tab

5. **⚠️ Use `typo-caption` class for section headers**
   - Replace `text-[10px] font-medium uppercase tracking-wider` with `typo-caption`

### Low Priority (Minor)

6. **Minor** — Persist favorite toggle to backend (has TODO comment)
7. **Minor** — Persist move-to-campaign to backend (has TODO comment)

---

## Files to Modify

1. `/root/repos/VibeyV2/apps/web/src/components/layout/Sidebar.tsx`
2. `/root/repos/VibeyV2/apps/web/src/components/layout/NewCampaignModal.tsx` → Enhance or replace
3. Create `/root/repos/VibeyV2/apps/web/src/components/layout/AvatarDropdown.tsx` (new file)

---

## Appendix: Legacy CampaignFormModal Features

The legacy `CampaignFormModal` supports:

```tsx
interface CampaignFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (campaign: Campaign) => void
  initialData?: CampaignWithDetails | Campaign | null // ← This enables EDIT mode
}
```

Fields:

- Project name (with icon picker)
- Goal (optional textarea)
- Add context (collapsible):
  - Offer selector
  - Skills selector (with "Include all" switch)
  - Theme selector

The new `NewCampaignModal` only has:

- Project name
- Icon picker

**This is a significant feature regression.**
