# Studio UI — One-to-One Replication Plan

**Date:** February 10, 2026  
**Scope:** Replicate legacy Studio layout, navigation, chat, and campaign preview panel into V2  
**Constraint:** Zero hardcoded colors — use CSS design system tokens only

---

## 1. What We're Building

The legacy Studio has this exact layout:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Full screen (h-screen, flex row)                                    │
├──────────┬──────────────────────────────┬───────────────────────────┤
│ SIDEBAR  │  CHAT PANEL                  │  CAMPAIGN PREVIEW PANEL   │
│ (240/72) │  (resizable, default 40%)    │  (flex-1, remaining)      │
│          │                              │                           │
│ Logo     │  ┌── Header Bar ──────────┐  │  ┌── Tab Toolbar ──────┐  │
│ + Toggle │  │ Breadcrumbs | Tab icons│  │  │ Artifacts|Dashboard │  │
│          │  └────────────────────────┘  │  │ Leads|Settings|Docs │  │
│ [+ New   │                              │  └────────────────────┘  │
│  Agent]  │  Messages area               │                           │
│          │  (scrollable)                │  Tab Content Area         │
│ ──Search │                              │  (card-glass container)   │
│          │                              │                           │
│ CAMPAIGNS│                              │                           │
│ ├─Camp 1 │                              │                           │
│ │ ├─Conv │                              │                           │
│ │ └─Conv │                              │                           │
│ ├─Camp 2 │                              │                           │
│          │                              │                           │
│ ALL      │  ┌── Composer ────────────┐  │                           │
│ AGENTS   │  │ Tags row               │  │                           │
│ ├─Conv 1 │  │ [composer-glass input] │  │                           │
│ ├─Conv 2 │  │ [Send/Stop button]     │  │                           │
│          │  └────────────────────────┘  │                           │
│ ─────────│                              │                           │
│ Create|  │                              │                           │
│ Manage   │                              │                           │
│ [Avatar] │                              │                           │
└──────────┴──────────────────────────────┴───────────────────────────┘
```

**Scope for V2 (Phase 1):**

- Sidebar with campaigns, conversations, Create/Manage tabs (Manage = "Coming Soon")
- Chat interface with composer
- Campaign preview panel with tabs: **Artifacts**, **Dashboard**, **Leads**, **Settings**, **Docs**
- All using the design system CSS classes — no hardcoded colors

---

## 2. Current V2 State vs. Target

### What V2 Already Has (Reusable)

| Component              | File                                                  | Status                                                                                                               |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `globals.css`          | `apps/web/src/app/globals.css`                        | ✅ Has full design system (1326 lines) — glass classes, tokens, spacing, typography                                  |
| `tailwind.config.ts`   | `apps/web/tailwind.config.ts`                         | ✅ Colors mapped to CSS vars                                                                                         |
| `Sidebar.tsx`          | `src/components/layout/Sidebar.tsx`                   | ✅ Already has CampaignSidebar structure (623 lines) — campaigns, conversations, Create/Manage tabs, avatar dropdown |
| `TopBar.tsx`           | `src/components/layout/TopBar.tsx`                    | ✅ Campaign selector, avatar                                                                                         |
| `MobileNav.tsx`        | `src/components/layout/MobileNav.tsx`                 | ✅ Bottom nav                                                                                                        |
| `DashboardLayout`      | `src/app/(dashboard)/layout.tsx`                      | ✅ Flex row layout (sidebar + main)                                                                                  |
| `StudioContainer.tsx`  | `src/features/studio/components/StudioContainer.tsx`  | ⚠️ Has 3-column layout but deviates from legacy                                                                      |
| `ChatInterface.tsx`    | `src/features/studio/components/ChatInterface.tsx`    | ⚠️ Basic structure exists, needs alignment                                                                           |
| `ChatInput.tsx`        | `src/features/studio/components/ChatInput.tsx`        | ⚠️ Composer exists, has hardcoded colors                                                                             |
| `MessageBubble.tsx`    | `src/features/studio/components/MessageBubble.tsx`    | ⚠️ Exists, needs review                                                                                              |
| `ConversationList.tsx` | `src/features/studio/components/ConversationList.tsx` | ⚠️ Exists inside feature, needs alignment                                                                            |
| `ModelSelector.tsx`    | `src/features/studio/components/ModelSelector.tsx`    | ⚠️ Exists                                                                                                            |

### What's Missing (Must Build)

| Component                                      | Legacy Reference                         | Priority         |
| ---------------------------------------------- | ---------------------------------------- | ---------------- |
| Campaign Preview Panel (right panel)           | `CreateAgentContainer.tsx`               | 🔴 HIGH          |
| Preview Panel Tab Toolbar                      | `CreateAgentContainer.tsx` (tab buttons) | 🔴 HIGH          |
| Artifacts Tab                                  | `ArtifactsTree.tsx` (579 lines)          | 🔴 HIGH          |
| Dashboard Tab                                  | `StudioDashboardTab.tsx` (122 lines)     | 🟡 MEDIUM        |
| Leads Tab                                      | `CampaignLeadsTab.tsx` (250 lines)       | 🟡 MEDIUM        |
| Settings Tab (Agent + Theme)                   | `AgentSettingsPanel.tsx` (143 lines)     | 🟡 MEDIUM        |
| Docs Tab                                       | `DocsTab.tsx` (192 lines)                | 🟡 MEDIUM        |
| Resizable Panel Divider                        | `usePanelResize.ts` hook                 | 🔴 HIGH          |
| Header Bar (breadcrumbs + minimized tab icons) | `CreateAgentContainer.tsx` top section   | 🟡 MEDIUM        |
| Panel minimize/expand logic                    | Campaign mode context                    | 🔴 HIGH          |
| Mobile Bottom Tab Bar                          | `MobileBottomTabBar.tsx`                 | 🟢 LOW (phase 2) |
| Mobile Preview Sheet                           | `MobilePreviewSheet.tsx`                 | 🟢 LOW (phase 2) |

---

## 3. Hardcoded Color Audit & Fixes

### V2 Files with Hardcoded Colors (Must Fix)

| File                  | Hardcoded Value                                        | Fix To                                                                      |
| --------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| `StudioContainer.tsx` | `border-[rgb(217,252,103)]`                            | `border-accent` or `border-[var(--accent)]`                                 |
| `StudioContainer.tsx` | `text-[rgb(225,255,140)]`                              | `text-[var(--color-primary-hover)]`                                         |
| `StudioContainer.tsx` | `bg-black/50`                                          | `bg-foreground/50` (acceptable pattern)                                     |
| `ChatInterface.tsx`   | `text-[rgb(52,199,89)]`                                | `text-[var(--color-success)]`                                               |
| `ChatInput.tsx`       | `caret-[rgb(217,252,103)]`                             | `caret-accent` or `caret-[var(--accent)]`                                   |
| `ChatInput.tsx`       | `bg-red-500/20`, `text-red-400`, `hover:bg-red-500/30` | `bg-[var(--color-destructive)]/20`, `text-[var(--color-destructive)]`, etc. |

### CSS Variable Naming Inconsistency (Must Standardize)

**Problem:** Two naming conventions coexist:

- Sidebar uses: `var(--color-foreground)`, `var(--color-primary)`, `var(--color-border)`
- TopBar/MobileNav use: `var(--foreground)`, `var(--primary)`, `var(--border)`

Both are defined in `globals.css` with identical values.

**Decision:** Standardize on **`var(--color-*)`** (prefixed) across all components — matches the legacy pattern and is more explicit. The unprefixed versions stay in `globals.css` for Tailwind utility compatibility (`bg-primary`, `text-foreground`, etc.).

---

## 4. File-by-File Implementation Plan

### 4.1 New Files to Create

```
src/features/studio/
├── components/
│   ├── preview/                          # NEW — Campaign preview panel
│   │   ├── CampaignPreviewPanel.tsx      # Panel container + tab toolbar
│   │   ├── PreviewTabToolbar.tsx         # Tab button row
│   │   ├── ArtifactsTab.tsx             # Tree view + preview area
│   │   ├── DashboardTab.tsx             # Campaign metrics (placeholder)
│   │   ├── LeadsTab.tsx                 # Leads table (placeholder)
│   │   ├── SettingsTab.tsx              # Agent settings (Agent/Theme nav)
│   │   ├── DocsTab.tsx                  # Documents tree + preview
│   │   └── index.ts                     # Barrel exports
│   ├── layout/                           # NEW — Studio-specific layout pieces
│   │   ├── StudioHeaderBar.tsx          # Top breadcrumbs + minimized tab icons
│   │   ├── ResizableDivider.tsx         # Draggable panel divider
│   │   └── index.ts
│   └── settings/                         # NEW — Settings sub-components
│       ├── ContextSelection.tsx          # (Placeholder for now)
│       ├── ModelSelection.tsx            # (Placeholder for now)
│       ├── ConfirmationPreferences.tsx   # (Placeholder for now)
│       ├── ThemeSettings.tsx             # (Placeholder for now)
│       └── index.ts
├── hooks/
│   ├── usePanelResize.ts                # NEW — Resizable panel logic
│   └── useCampaignMode.ts              # NEW — Campaign mode state
├── contexts/
│   └── CampaignModeContext.tsx          # NEW — Campaign mode provider
└── types/
    └── studio.types.ts                  # NEW — Tab types, panel state types
```

### 4.2 Files to Modify

| File                  | Changes                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StudioContainer.tsx` | Replace 3-column layout with legacy-matching 2-panel (chat + preview) layout. Remove hardcoded colors.                                            |
| `ChatInterface.tsx`   | Fix hardcoded `text-[rgb(52,199,89)]` → `text-[var(--color-success)]`. Ensure layout matches legacy.                                              |
| `ChatInput.tsx`       | Fix hardcoded caret color, stop button colors. Match legacy `composer-glass` pattern.                                                             |
| `Sidebar.tsx`         | Already mostly aligned. Verify Create/Manage tabs match legacy `tabs-liquid-glass` pattern. Ensure "Manage" is disabled with "Coming Soon" state. |

### 4.3 Files That Stay Unchanged

| File                 | Reason                             |
| -------------------- | ---------------------------------- |
| `globals.css`        | Already has the full design system |
| `tailwind.config.ts` | Already properly configured        |
| `DashboardLayout`    | Layout structure is correct        |
| `TopBar.tsx`         | Works as-is                        |
| `MobileNav.tsx`      | Works as-is                        |
| `MessageBubble.tsx`  | Review only, likely fine           |
| `ModelSelector.tsx`  | Works for settings tab             |

---

## 5. Component Specifications

### 5.1 `StudioContainer.tsx` (Rewrite)

**Layout:**

```
<div className="flex h-full overflow-hidden">
  {/* Chat Panel — width controlled by usePanelResize */}
  <div style={{ width: `${chatWidthPercent}%` }} className="flex h-full flex-col min-h-0">
    <StudioHeaderBar />
    <ChatInterface />
  </div>

  {/* Resizable Divider — only when panel expanded */}
  {isPanelExpanded && <ResizableDivider onResize={handleResize} />}

  {/* Campaign Preview Panel — flex-1 fills remaining */}
  {isPanelExpanded && (
    <div className="flex-1 flex flex-col min-h-0">
      <CampaignPreviewPanel />
    </div>
  )}
</div>
```

**States:**

1. No campaign selected → Chat full width, no panel
2. Campaign selected, panel minimized → Chat centered (max-w-3xl), tab icons in header
3. Campaign selected, panel expanded → Side-by-side with resizable divider

**Default chat width:** 40% (range: 20-60%)

### 5.2 `CampaignPreviewPanel.tsx`

**Layout:**

```
<div className="flex h-full flex-col min-h-0">
  {/* Tab Toolbar */}
  <PreviewTabToolbar
    activeTab={activeTab}
    onTabChange={setActiveTab}
    isCampaignMode={isCampaignMode}
    onMinimize={handleMinimize}
  />

  {/* Tab Content */}
  <div className="flex-1 flex flex-col min-h-0 p-0 md:pt-spacing-4 md:pr-spacing-4 md:pb-spacing-4">
    {activeTab === 'artifacts' && <ArtifactsTab />}
    {activeTab === 'dashboard' && <DashboardTab />}
    {activeTab === 'leads' && <LeadsTab />}
    {activeTab === 'docs' && <DocsTab />}
    {activeTab === 'settings' && <SettingsTab />}
  </div>
</div>
```

### 5.3 `PreviewTabToolbar.tsx`

**Layout:**

```
<div className="hidden md:flex items-center gap-spacing-1 pt-spacing-4 pr-spacing-4">
  {tabs.map(tab => (
    <button
      key={tab.id}
      className={`h-spacing-8 px-spacing-3 rounded-spacing-3 flex items-center gap-spacing-1 body-3 transition-all duration-[600ms] ease-in-out ${
        activeTab === tab.id ? 'chip-glass-blue' : 'chip-glass-neutral'
      }`}
      onClick={() => onTabChange(tab.id)}
    >
      <tab.icon className="icon-sm" />
      {tab.label}
    </button>
  ))}

  <div className="ml-auto flex items-center gap-spacing-1">
    <button className="chip-glass-neutral h-spacing-8 rounded-spacing-3" onClick={onMinimize}>
      <PanelRightClose className="icon-sm" />
    </button>
  </div>
</div>
```

**Tab definitions:**

| Tab ID      | Label     | Icon              | Condition     |
| ----------- | --------- | ----------------- | ------------- |
| `artifacts` | Artifacts | `Box`             | Campaign mode |
| `dashboard` | Dashboard | `LayoutDashboard` | Always        |
| `leads`     | Leads     | `Users`           | Campaign mode |
| `docs`      | Docs      | `FileText`        | Always        |
| `settings`  | Settings  | `Settings`        | Always        |

### 5.4 `ArtifactsTab.tsx`

**Layout:**

```
<div className="card-glass rounded-spacing-4 overflow-hidden flex h-full">
  {/* Left: Tree view */}
  <div className="w-[280px] flex-shrink-0 flex flex-col overflow-hidden border-r-glass">
    <div className="px-spacing-3 py-spacing-2 border-b border-[var(--color-border)]/30">
      <span className="body-2 font-medium">Artifacts</span>
    </div>
    <div className="flex-1 overflow-y-auto p-spacing-2">
      {/* Tree items — Funnels, Sequences, Offers, etc. */}
      {/* Placeholder for Phase 1 */}
    </div>
  </div>

  {/* Right: Preview area */}
  <div className="flex-1 overflow-hidden">
    {/* Selected artifact preview or empty state */}
  </div>
</div>
```

### 5.5 `DashboardTab.tsx`

```
<div className="card-glass rounded-spacing-4 overflow-auto p-spacing-4 w-full h-full min-h-[600px]">
  <div className="space-y-spacing-6">
    {/* Campaign metrics — placeholder for Phase 1 */}
    <div className="text-center py-spacing-12">
      <LayoutDashboard className="w-12 h-12 mx-auto text-[var(--color-muted-foreground)] mb-spacing-4" />
      <p className="body-2 text-[var(--color-muted-foreground)]">Campaign analytics will appear here</p>
    </div>
  </div>
</div>
```

### 5.6 `LeadsTab.tsx`

```
<div className="card-glass rounded-spacing-4 overflow-hidden flex flex-col h-full">
  {/* Header */}
  <div className="flex items-center justify-between px-spacing-4 py-spacing-3 border-b border-[var(--color-border)] flex-shrink-0">
    <div className="flex items-center gap-spacing-2">
      <Users className="icon-sm text-[var(--color-muted-foreground)]" />
      <span className="body-2 font-medium">Leads</span>
    </div>
  </div>

  {/* Content — placeholder */}
  <div className="flex-1 overflow-auto p-spacing-4">
    <div className="text-center py-spacing-12">
      <Users className="w-12 h-12 mx-auto text-[var(--color-muted-foreground)] mb-spacing-4" />
      <p className="body-2 text-[var(--color-muted-foreground)]">No leads yet</p>
      <p className="body-3 text-[var(--color-muted-foreground)]">Create a funnel to start capturing leads</p>
    </div>
  </div>
</div>
```

### 5.7 `SettingsTab.tsx`

**Layout (matches legacy `AgentSettingsPanel` exactly):**

```
<div className="card-glass rounded-spacing-4 overflow-hidden flex h-full">
  {/* Left nav */}
  <div className="w-48 border-r border-[var(--color-border)] p-spacing-4 flex-shrink-0">
    <nav className="space-y-spacing-1">
      <button className={activeSection === 'agent'
        ? 'nav-glass-selected-purple nav-glass-text-purple font-medium ...'
        : 'text-[var(--color-foreground)] nav-glass-hover-purple ...'
      }>
        <Bot className="icon-sm" /> Agent
      </button>
      <button className={...}>
        <Palette className="icon-sm" /> Theme
      </button>
    </nav>
  </div>

  {/* Right content */}
  <div className="flex-1 overflow-y-auto p-spacing-6">
    {activeSection === 'agent' && (
      <div className="max-w-xl space-y-spacing-8">
        <ContextSelection />
        <div className="border-t border-[var(--color-border)]" />
        <ModelSelection variant="dropdown" />
        <div className="border-t border-[var(--color-border)]" />
        <ConfirmationPreferences />
      </div>
    )}
    {activeSection === 'theme' && (
      <div className="max-w-xl">
        <ThemeSettings />
      </div>
    )}
  </div>
</div>
```

### 5.8 `DocsTab.tsx`

```
<div className="card-glass rounded-spacing-4 overflow-hidden flex h-full">
  {/* Left: Documents tree */}
  <div className="w-[280px] flex-shrink-0 flex flex-col overflow-hidden border-r-glass">
    <div className="px-spacing-3 py-spacing-2 border-b border-[var(--color-border)]/30">
      <span className="body-2 font-medium">Documents</span>
    </div>
    <div className="flex-1 overflow-y-auto p-spacing-2">
      {/* Document tree items — placeholder */}
    </div>
  </div>

  {/* Right: Document preview */}
  <div className="flex-1 overflow-hidden flex items-center justify-center">
    <div className="text-center">
      <FileText className="w-12 h-12 mx-auto text-[var(--color-muted-foreground)] mb-spacing-4" />
      <p className="body-2 text-[var(--color-muted-foreground)]">Start a conversation to see documents here</p>
    </div>
  </div>
</div>
```

### 5.9 `ResizableDivider.tsx`

```
<div
  className="w-4 cursor-col-resize flex items-center justify-center hover:bg-[var(--color-secondary)] transition-colors"
  onMouseDown={handleMouseDown}
>
  <GripVertical className="icon-sm text-[var(--color-muted-foreground)]" />
</div>
```

### 5.10 `StudioHeaderBar.tsx`

```
<div className="absolute top-0 left-0 right-0 z-40 hidden md:block">
  <div className="h-spacing-4 bg-[var(--color-background)]" />
  <div className="h-spacing-10 flex items-center bg-[var(--color-background)] pr-spacing-8 py-spacing-1 rounded-br-spacing-4">
    {/* Left: Breadcrumbs */}
    <div className="flex items-center gap-spacing-2 body-2">
      <CampaignIcon className="icon-sm" />
      <span>{campaignName}</span>
      <ChevronRight className="icon-xs text-[var(--color-muted-foreground)]" />
      <span className="text-[var(--color-muted-foreground)]">{conversationTitle}</span>
    </div>

    {/* Right: Minimized tab icons (only when panel minimized) */}
    {isPanelMinimized && (
      <div className="ml-auto flex items-center gap-spacing-1">
        {tabs.map(tab => (
          <button key={tab.id} className="chip-glass-neutral h-spacing-8 rounded-spacing-3 p-spacing-2"
            onClick={() => expandPanel(tab.id)}>
            <tab.icon className="icon-sm" />
          </button>
        ))}
      </div>
    )}
  </div>
</div>
```

---

## 6. `usePanelResize` Hook

```typescript
interface UsePanelResizeReturn {
  chatWidthPercent: number
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent) => void
}

// Default: 40%, Range: 20-60%
// Updates chatWidthPercent on mousemove
// Stops on mouseup
```

---

## 7. `CampaignModeContext`

```typescript
interface CampaignModeState {
  activeCampaignId: string | null
  activeCampaignName: string | null
  isPanelMinimized: boolean
  isPanelExpanded: boolean // derived: !isPanelMinimized && activeCampaignId !== null
  sidebarMode: 'studio' | 'hq'
  activePreviewTab: TabType
}

type TabType = 'artifacts' | 'dashboard' | 'leads' | 'docs' | 'settings'
```

---

## 8. CSS Classes Reference (No Hardcoded Colors)

Every component must use ONLY these patterns:

| Purpose            | Class to Use                                       | Never Use                                 |
| ------------------ | -------------------------------------------------- | ----------------------------------------- |
| Surface background | `surface-bg`                                       | `bg-[#hex]`                               |
| Card background    | `surface-card` or `card-glass`                     | `bg-white`, `bg-[rgb(...)]`               |
| Text primary       | `text-[var(--color-foreground)]`                   | `text-black`, `text-[#1a1a1a]`            |
| Text muted         | `text-[var(--color-muted-foreground)]`             | `text-gray-500`                           |
| Borders            | `border-[var(--color-border)]` or `border-r-glass` | `border-gray-200`                         |
| Primary color      | `text-[var(--color-primary)]` or `bg-primary`      | `text-[rgb(217,252,103)]`                 |
| Accent color       | `text-accent` or `bg-accent`                       | `text-[rgb(217,252,103)]`                 |
| Success            | `text-[var(--color-success)]`                      | `text-[rgb(52,199,89)]`, `text-green-500` |
| Danger             | `text-[var(--color-destructive)]`                  | `text-red-500`, `bg-red-500`              |
| Active tab         | `chip-glass-blue`                                  | hardcoded backgrounds                     |
| Inactive tab       | `chip-glass-neutral`                               | hardcoded backgrounds                     |
| Nav active         | `nav-glass-selected-purple`                        | hardcoded backgrounds                     |
| Input              | `input-glass` or `composer-glass`                  | custom backgrounds                        |
| Button primary     | `button-glass-primary` or `button-solid-lime`      | hardcoded colors                          |
| Caret              | `caret-accent`                                     | `caret-[rgb(217,252,103)]`                |

---

## 9. Execution Order

| Step   | Task                                                 | Files                                                                | Effort    |
| ------ | ---------------------------------------------------- | -------------------------------------------------------------------- | --------- |
| **1**  | Fix hardcoded colors in existing files               | `StudioContainer.tsx`, `ChatInterface.tsx`, `ChatInput.tsx`          | 30 min    |
| **2**  | Create types and context                             | `studio.types.ts`, `CampaignModeContext.tsx`                         | 30 min    |
| **3**  | Create `usePanelResize` hook                         | `hooks/usePanelResize.ts`                                            | 30 min    |
| **4**  | Create `ResizableDivider` component                  | `layout/ResizableDivider.tsx`                                        | 15 min    |
| **5**  | Create `StudioHeaderBar` component                   | `layout/StudioHeaderBar.tsx`                                         | 30 min    |
| **6**  | Create `PreviewTabToolbar`                           | `preview/PreviewTabToolbar.tsx`                                      | 30 min    |
| **7**  | Create tab placeholder components                    | `ArtifactsTab`, `DashboardTab`, `LeadsTab`, `DocsTab`, `SettingsTab` | 1.5 hours |
| **8**  | Create `CampaignPreviewPanel` (wraps toolbar + tabs) | `preview/CampaignPreviewPanel.tsx`                                   | 30 min    |
| **9**  | Rewrite `StudioContainer.tsx` layout                 | Match legacy 2-panel layout with all states                          | 2 hours   |
| **10** | Verify Sidebar alignment                             | Check Create/Manage tabs, campaign list, conversation list           | 30 min    |
| **11** | Integration test — full layout                       | Verify panel resize, tab switching, minimize/expand                  | 1 hour    |

**Total estimated effort:** ~7-8 hours

---

## 10. What's NOT In Scope (Phase 2+)

| Feature                           | Reason                           |
| --------------------------------- | -------------------------------- |
| Manage tab functionality          | Explicitly "Coming Soon"         |
| Artifact tree with real data      | Needs backend integration        |
| Dashboard with real analytics     | Needs backend + Supabase queries |
| Leads table with real data        | Needs CRM backend                |
| Document tree with real documents | Needs backend integration        |
| Canvas/Map tab                    | Hidden/commented out in legacy   |
| Media tab                         | Lower priority                   |
| Plan tab                          | Needs plan generation feature    |
| Mobile Bottom Tab Bar             | Phase 2                          |
| Mobile Preview Sheet              | Phase 2                          |
| GrapesJS editor integration       | Phase 2+                         |
| Sequence generation               | Phase 2+                         |

---

## 11. Design System Compliance Checklist

Before marking any component complete:

- [ ] Zero `rgb(...)` or `#hex` color values in JSX
- [ ] Zero Tailwind color utilities (`text-gray-500`, `bg-red-500`, etc.) — use design tokens
- [ ] All backgrounds use `surface-bg`, `surface-card`, `card-glass`, or `var(--color-*)` tokens
- [ ] All text colors use `var(--color-foreground)`, `var(--color-muted-foreground)`, or design system classes
- [ ] All borders use `var(--color-border)`, `border-*-glass`, or design system classes
- [ ] All buttons use `button-glass-*`, `button-solid-lime`, `chip-glass-*` classes
- [ ] All inputs use `input-glass` or `composer-glass`
- [ ] All active navigation uses `nav-glass-selected-purple`
- [ ] Dark mode works (test by toggling `.dark` class)
- [ ] Spacing uses `spacing-*` tokens, not arbitrary pixel values
- [ ] Typography uses `body-2`, `body-3`, `typo-caption` classes or `text-[var(--text-*)]`
