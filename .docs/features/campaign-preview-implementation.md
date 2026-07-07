# Campaign Preview Panel — Full Implementation Plan

**Date:** February 10, 2026  
**Status:** Analysis Complete — Ready for Phased Execution  
**Scope:** Port legacy campaign preview functionality into V2 Studio

---

## 1. Current State Summary

### What V2 Has (UI Shell — Placeholders Only)

- `CampaignPreviewPanel.tsx` — wrapper with tab toolbar
- `PreviewTabToolbar.tsx` — tab buttons (chip-glass styling)
- `ArtifactsTab.tsx` — static tree skeleton, no data
- `DashboardTab.tsx` — "analytics will appear here" text
- `LeadsTab.tsx` — "no leads yet" text
- `SettingsTab.tsx` — Agent/Theme nav with "Coming soon" placeholders
- `DocsTab.tsx` — empty documents tree
- `CampaignModeContext.tsx` — state management for panel (working)
- `usePanelResize.ts` — drag resize (working)

### What Legacy Has (Full Functionality)

| Component                  | Lines | Functionality                                                                                          |
| -------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| `CreateAgentContainer.tsx` | 1,963 | Orchestrator: 9 tabs, 14 lazy-loaded components, 16 state vars, campaign data hooks                    |
| `ArtifactsTree.tsx`        | 578   | Real tree from campaign data: funnels, sequences, lead magnets, offers, avatars with lazy page loading |
| `StudioDashboardTab.tsx`   | 121   | SSE metadata streaming, goal header, analytics cards                                                   |
| `CampaignLeadsTab.tsx`     | 249   | CRM table with campaign funnel filtering, sort, pagination                                             |
| `AgentSettingsPanel.tsx`   | 142   | Skills + offers loading, context/model/confirmation settings                                           |
| `DocsTab.tsx`              | 191   | Document tree + preview with real-time streaming support                                               |
| `DocumentsTree.tsx`        | 721   | Hierarchical document navigation                                                                       |
| `DocumentPreview.tsx`      | 558   | Markdown preview with typewriter effect                                                                |

### Legacy Hooks & Services (24 files)

| Hook/Service                  | Lines   | Purpose                                  |
| ----------------------------- | ------- | ---------------------------------------- |
| `useCampaignData`             | 124     | Campaign CRUD (fetch, update, delete)    |
| `useCampaignAgentContext`     | 310     | Agent settings inheritance chain         |
| `useCampaignMetadataStream`   | 141     | SSE for title + goal generation          |
| `useCampaignResources`        | 937     | Manage funnels/sequences within campaign |
| `useCampaignMap`              | 360     | React Flow visualization                 |
| `useCampaignGeneration`       | 271     | Poll generation status                   |
| `useCampaignMediaRealtime`    | 108     | Supabase Realtime for media              |
| `useArtifactState`            | 50      | Artifact selection state                 |
| `CampaignsService` (backend)  | 1,949   | Full campaign business logic             |
| `CampaignsService` (frontend) | 358     | Frontend enrichment layer                |
| `CampaignsController`         | 1,956   | REST endpoints (NestJS)                  |
| Campaign generator services   | ~2,400+ | Title, goal, funnel, sequence generation |

---

## 2. Database Gap Analysis

### V2 Database (qfrvykscoymiwwgysvsr) — 26 tables

**Tables that exist and are campaign-relevant:**

| Table                    | Rows | Ready?                                              |
| ------------------------ | ---- | --------------------------------------------------- |
| `campaigns`              | 0    | Schema present, no data                             |
| `campaign_tasks`         | 0    | Schema present                                      |
| `campaign_plans`         | 0    | Schema present                                      |
| `conversations`          | 2    | Working (linked to campaigns via campaign_id)       |
| `messages`               | 2    | Working                                             |
| `conversation_documents` | 0    | Schema present                                      |
| `offers`                 | 0    | Simplified (step1-5 jsonb) vs V1 (70+ columns)      |
| `avatars`                | 0    | Simplified (persona_data jsonb) vs V1 (50+ columns) |
| `funnels`                | 0    | Schema present                                      |
| `funnel_pages`           | 0    | Schema present                                      |
| `lead_magnets`           | 0    | Schema present                                      |
| `sequences`              | 0    | Schema present                                      |
| `sequence_emails`        | 0    | Schema present                                      |
| `contacts`               | 0    | Schema present (replaces V1 `leads`)                |
| `agent_configs`          | 2    | Working                                             |
| `agent_tasks`            | 0    | Schema present                                      |
| `templates`              | 3    | Has seed data                                       |
| `themes`                 | 0    | Schema present                                      |

### V1 Tables Missing from V2

**Critical (needed for campaign preview):**

| V1 Table                           | Rows   | Why Needed                                             | Action                                                             |
| ---------------------------------- | ------ | ------------------------------------------------------ | ------------------------------------------------------------------ |
| `conversation_links`               | 72     | Links conversations to resources (funnel, offer, etc.) | Evaluate — V2 may use `conversation_documents.resource_id` instead |
| `campaign_map_layouts`             | 14     | React Flow node/edge storage                           | Skip (Phase 2+ — canvas tab)                                       |
| `media_assets`                     | 37     | Campaign media management                              | Skip (Phase 2+ — media tab)                                        |
| `visitors` + `visitors_page_views` | 29/103 | Funnel analytics for dashboard                         | Skip (Phase 2+ — needs published funnels)                          |
| `offer_avatars`                    | 113    | Many-to-many offer-avatar linking                      | V2 uses `avatars.offer_id` FK instead                              |
| `branding_themes`                  | 11     | Rich theme system                                      | V2 `themes` table exists but simpler                               |

**Not needed for campaign preview (skip for now):**

| V1 Table                                       | Reason to Skip                  |
| ---------------------------------------------- | ------------------------------- |
| `marketing_content`, `marketing_sequences`     | Email generation (Phase 2+)     |
| `email_*` tables (7 tables)                    | SendGrid integration (Phase 2+) |
| `sequence_enrollments`, `sequence_email_sends` | Email automation (Phase 2+)     |
| `broadcast_*` tables                           | Broadcasting (Phase 2+)         |
| `contact_tags`, `segments`                     | CRM features (Phase 2+)         |
| `funnel_preview_tokens`                        | Preview auth (Phase 2+)         |
| `user_skills`                                  | Custom skills (Phase 2+)        |
| `agent_settings_profiles`                      | Reusable profiles (Phase 2+)    |
| `analytics_*` tables                           | Analytics engine (Phase 2+)     |

### Schema Verdict

**V2 database schema is sufficient for Phase 1 campaign preview.** No migrations needed. All core tables (`campaigns`, `offers`, `funnels`, `lead_magnets`, `sequences`, `contacts`, `conversation_documents`) exist with correct foreign keys.

The V2 schema uses JSONB blobs (`offers.step1_data`, `campaigns.config`) where V1 had explicit columns. This is a design choice — the data fits, just structured differently.

---

## 3. What's Missing — Layer by Layer

### Layer 1: Backend API (apps/api)

Currently the V2 API (`apps/api`) needs these endpoints:

| Endpoint                       | Method     | Purpose                                                      | Priority |
| ------------------------------ | ---------- | ------------------------------------------------------------ | -------- |
| `/campaigns`                   | POST       | Create campaign                                              | P0       |
| `/campaigns`                   | GET        | List user campaigns                                          | P0       |
| `/campaigns/:id`               | GET        | Get campaign with artifacts                                  | P0       |
| `/campaigns/:id`               | PATCH      | Update campaign                                              | P0       |
| `/campaigns/:id`               | DELETE     | Delete/archive campaign                                      | P1       |
| `/campaigns/:id/artifacts`     | GET        | Get all linked artifacts (funnels, offers, leads, sequences) | P0       |
| `/conversations`               | POST       | Create conversation (optionally linked to campaign)          | P0       |
| `/conversations/:id/documents` | GET        | Get conversation documents                                   | P1       |
| `/agent/chat`                  | POST (SSE) | Send message + stream response (existing?)                   | P0       |

**Current V2 API state:** Need to check what routes exist in `apps/api/`.

### Layer 2: Frontend Services

| Service                         | Purpose                                                | Port From                                  |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `campaigns.service.ts`          | Campaign CRUD + artifact fetching                      | V1 `campaigns-backend-api.ts` (simplified) |
| `campaign-artifacts.service.ts` | Fetch funnels, offers, leads, sequences for a campaign | New (combines V1 queries)                  |

### Layer 3: Frontend Hooks

| Hook                          | Purpose                                     | Port From                        |
| ----------------------------- | ------------------------------------------- | -------------------------------- |
| `useCampaignData.ts`          | Fetch campaign + related data, auto-refresh | V1 `useCampaignData` (124 lines) |
| `useConversationDocuments.ts` | Fetch + manage conversation documents       | V1 `useConversationDocuments`    |
| `useArtifactState.ts`         | Selected artifact + slide index             | V1 `useArtifactState` (50 lines) |

### Layer 4: Frontend Components (Replace Placeholders)

| Component             | Replace             | Port From                               | Estimated Lines   |
| --------------------- | ------------------- | --------------------------------------- | ----------------- |
| `ArtifactsTab.tsx`    | Current placeholder | V1 `ArtifactsTree.tsx` (578 lines)      | ~400 (simplified) |
| `DashboardTab.tsx`    | Current placeholder | V1 `StudioDashboardTab.tsx` (121 lines) | ~100              |
| `LeadsTab.tsx`        | Current placeholder | V1 `CampaignLeadsTab.tsx` (249 lines)   | ~200              |
| `SettingsTab.tsx`     | Current placeholder | V1 `AgentSettingsPanel.tsx` (142 lines) | ~120              |
| `DocsTab.tsx`         | Current placeholder | V1 `DocsTab.tsx` (191 lines)            | ~150              |
| `DocumentsTree.tsx`   | New sub-component   | V1 `DocumentsTree.tsx` (721 lines)      | ~400 (simplified) |
| `DocumentPreview.tsx` | New sub-component   | V1 `DocumentPreview.tsx` (558 lines)    | ~300 (simplified) |

---

## 4. Data Flow Architecture

### Campaign Creation Flow

```
User sends message → Chat API → AI classifies intent →
  "Create campaign" → Creates campaign row →
  Creates conversation linked to campaign →
  AI generates: campaign name, goal, offer →
  Creates artifacts (funnels, sequences, lead magnets) →
  Each artifact triggers campaign_tasks updates →
  Preview panel shows artifacts in real-time
```

### Campaign Preview Data Flow

```
Sidebar: User clicks campaign →
  CampaignModeContext.setActiveCampaign(id, name) →
  StudioContainer: isPanelExpanded = true →
  CampaignPreviewPanel mounts →
  useCampaignData(campaignId) fetches:
    campaign → campaigns table
    funnels → funnels table (WHERE campaign_id = X)
    offers → offers table (WHERE campaign_id = X)
    lead_magnets → lead_magnets table (WHERE campaign_id = X)
    sequences → sequences table (WHERE campaign_id = X)
  ArtifactsTab builds tree from campaign data →
  User clicks artifact → Preview renders in right panel
```

### Sidebar → Campaign Context Connection

```
Sidebar.tsx (activeCampaignId state) ──→ needs to connect to CampaignModeContext
                                          ↓
                                    CampaignModeProvider (in StudioContainer)
                                          ↓
                                    isPanelExpanded → show/hide preview panel
```

**Gap:** The Sidebar currently has its own `activeCampaignId` state (local useState). It needs to communicate with `CampaignModeContext` inside StudioContainer. Options:

1. Lift CampaignModeProvider to DashboardLayout (above Sidebar)
2. Use URL params/searchParams to pass campaign ID
3. Use a shared Zustand store

**Recommended:** Option 1 — Lift `CampaignModeProvider` to `DashboardLayout` so both Sidebar and StudioContainer can access it.

---

## 5. Execution Plan — Phased

### Phase 1: Campaign CRUD + Sidebar Connection (Foundation)

**Goal:** Users can create campaigns, see them in sidebar, and clicking opens the preview panel.

| Step | Task                                                           | Files                              | Effort      |
| ---- | -------------------------------------------------------------- | ---------------------------------- | ----------- |
| 1.1  | Check/create campaign API routes in `apps/api`                 | `apps/api/src/`                    | 2-3 hours   |
| 1.2  | Create `campaigns.service.ts` (frontend)                       | `features/studio/services/`        | 1 hour      |
| 1.3  | Create `useCampaignData` hook                                  | `features/studio/hooks/`           | 1 hour      |
| 1.4  | Lift `CampaignModeProvider` to DashboardLayout                 | `app/(dashboard)/layout.tsx`       | 30 min      |
| 1.5  | Connect Sidebar campaign clicks to CampaignModeContext         | `components/layout/Sidebar.tsx`    | 1 hour      |
| 1.6  | Load real campaigns from DB in Sidebar (replace demo data)     | `components/layout/Sidebar.tsx`    | 1.5 hours   |
| 1.7  | Connect StudioContainer to show preview when campaign selected | Already done (CampaignModeContext) | Verify only |

**Estimated:** 7-8 hours

### Phase 2: Artifacts Tab (Real Data)

**Goal:** ArtifactsTab shows real funnels, sequences, lead magnets, offers from the selected campaign.

| Step | Task                                             | Files                       | Effort    |
| ---- | ------------------------------------------------ | --------------------------- | --------- |
| 2.1  | Create `campaign-artifacts.service.ts`           | `features/studio/services/` | 1.5 hours |
| 2.2  | Port `buildTreeFromCampaign()` logic from V1     | `preview/ArtifactsTab.tsx`  | 2 hours   |
| 2.3  | Port `TreeNode` component with expand/collapse   | `preview/ArtifactsTab.tsx`  | 1.5 hours |
| 2.4  | Port funnel page lazy loading                    | `preview/ArtifactsTab.tsx`  | 1 hour    |
| 2.5  | Create `useArtifactState` hook                   | `hooks/useArtifactState.ts` | 30 min    |
| 2.6  | Wire selected artifact to a preview area (basic) | `preview/ArtifactsTab.tsx`  | 1 hour    |

**Estimated:** 7-8 hours

### Phase 3: Dashboard Tab (Real Metrics)

**Goal:** DashboardTab shows campaign name, goal, and basic metrics.

| Step | Task                                  | Files                      | Effort  |
| ---- | ------------------------------------- | -------------------------- | ------- |
| 3.1  | Create `CampaignGoalHeader` component | `preview/dashboard/`       | 2 hours |
| 3.2  | Create basic `CampaignAnalyticsCard`  | `preview/dashboard/`       | 2 hours |
| 3.3  | Wire DashboardTab to campaign data    | `preview/DashboardTab.tsx` | 1 hour  |

**Estimated:** 5 hours
_Note: SSE metadata streaming (useCampaignMetadataStream) deferred to Phase 5._

### Phase 4: Leads Tab (Real CRM Data)

**Goal:** LeadsTab shows contacts captured by campaign funnels.

| Step | Task                                                       | Files                    | Effort    |
| ---- | ---------------------------------------------------------- | ------------------------ | --------- |
| 4.1  | Create leads/contacts API endpoint                         | `apps/api/src/`          | 1.5 hours |
| 4.2  | Create `useLeadsData` hook (simplified from V1 useCrmData) | `features/studio/hooks/` | 2 hours   |
| 4.3  | Create `LeadsTable` component (simplified CRM table)       | `preview/leads/`         | 3 hours   |
| 4.4  | Wire LeadsTab with funnel filtering                        | `preview/LeadsTab.tsx`   | 1 hour    |

**Estimated:** 7-8 hours

### Phase 5: Settings Tab (Real Settings)

**Goal:** SettingsTab manages agent context, model, and confirmation preferences.

| Step | Task                                                 | Files                                  | Effort    |
| ---- | ---------------------------------------------------- | -------------------------------------- | --------- |
| 5.1  | Port `ContextSelection` with real skills/offers data | `settings/ContextSelection.tsx`        | 2 hours   |
| 5.2  | Port `ModelSelection` with model dropdown            | `settings/ModelSelection.tsx`          | 1.5 hours |
| 5.3  | Port `ConfirmationPreferences`                       | `settings/ConfirmationPreferences.tsx` | 1 hour    |
| 5.4  | Port `ThemeSettings` (basic theme selector)          | `settings/ThemeSettings.tsx`           | 1.5 hours |
| 5.5  | Wire settings to agent_configs table                 | `preview/SettingsTab.tsx`              | 1 hour    |

**Estimated:** 7 hours

### Phase 6: Docs Tab (Real Documents)

**Goal:** DocsTab shows conversation documents with tree navigation and preview.

| Step | Task                                             | Files                              | Effort    |
| ---- | ------------------------------------------------ | ---------------------------------- | --------- |
| 6.1  | Create `useConversationDocuments` hook           | `features/studio/hooks/`           | 1.5 hours |
| 6.2  | Port `DocumentsTree` (simplified from 721 lines) | `preview/docs/DocumentsTree.tsx`   | 3 hours   |
| 6.3  | Port `DocumentPreview` with markdown rendering   | `preview/docs/DocumentPreview.tsx` | 2.5 hours |
| 6.4  | Wire DocsTab to conversation context             | `preview/DocsTab.tsx`              | 1 hour    |

**Estimated:** 8 hours

---

## 6. Dependencies & Blockers

### Must Be Resolved Before Phase 1

| Dependency                                | Status                                | Required For               |
| ----------------------------------------- | ------------------------------------- | -------------------------- |
| V2 API routes (`apps/api`) — what exists? | UNKNOWN — needs audit                 | All phases                 |
| Supabase client setup in frontend         | EXISTS (`@/lib/supabase/client`)      | All data fetching          |
| Auth context (user ID)                    | EXISTS (DashboardLayout injects user) | Campaign ownership         |
| Chat streaming (SSE)                      | EXISTS (`chat.service.ts`)            | Campaign creation via chat |

### Not Blockers (Can Be Deferred)

| Feature                                | Why Deferrable                                        |
| -------------------------------------- | ----------------------------------------------------- |
| Campaign creation via AI chat          | Can create campaigns manually first                   |
| SSE metadata streaming                 | Dashboard works without streaming (shows static data) |
| Funnel preview/editor (GrapesJS)       | Artifacts can show metadata without visual editor     |
| Email sending                          | Sequences can be created without actually sending     |
| Real analytics (visitors, conversions) | Dashboard can show placeholder metrics                |

---

## 7. Estimated Total Effort

| Phase     | Description                        | Hours           |
| --------- | ---------------------------------- | --------------- |
| Phase 1   | Campaign CRUD + Sidebar Connection | 7-8             |
| Phase 2   | Artifacts Tab (Real Data)          | 7-8             |
| Phase 3   | Dashboard Tab (Real Metrics)       | 5               |
| Phase 4   | Leads Tab (Real CRM Data)          | 7-8             |
| Phase 5   | Settings Tab (Real Settings)       | 7               |
| Phase 6   | Docs Tab (Real Documents)          | 8               |
| **Total** |                                    | **41-45 hours** |

---

## 8. Immediate Next Steps

1. **Audit `apps/api/`** — Determine what API routes already exist for campaigns, conversations, etc.
2. **Start Phase 1.4** — Lift CampaignModeProvider to DashboardLayout (quick win, unblocks everything)
3. **Start Phase 1.2** — Create frontend campaign service with Supabase direct queries (can bypass API initially)
4. **Start Phase 1.6** — Replace demo campaigns in Sidebar with real data from DB

---

## 9. Key Architecture Decisions

### Decision 1: Direct Supabase vs API Routes

- **V1 approach:** Mix of direct Supabase calls + NestJS API
- **V2 recommendation:** Start with direct Supabase client calls from frontend (faster). Migrate to API routes as needed for complex business logic.

### Decision 2: V2 Simplified Schema

- V2 uses JSONB blobs where V1 had 70+ explicit columns (offers, avatars)
- **Keep V2 approach** — JSONB is more flexible, easier to evolve
- Artifact display logic reads from jsonb fields instead of individual columns

### Decision 3: Component Simplification

- V1 had 1,963-line CreateAgentContainer with everything crammed in
- **V2 approach:** Already decomposed into separate tab components + context
- Each tab is independent, lazy-loaded, with its own data hook
- Estimated 60% less code than V1 for same functionality

### Decision 4: Campaign Creation

- V1 created campaigns through complex multi-step AI orchestration
- **Phase 1 V2:** Simple "New Campaign" button that creates a DB row
- **Phase 2+ V2:** AI-assisted campaign creation via chat (port V1 agent logic)
