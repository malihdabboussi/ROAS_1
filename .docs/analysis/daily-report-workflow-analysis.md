# Daily Report Workflow — Meticulous Analysis

## 1. Problem Restatement

**User request (verbatim):**

> I want to make a new workflow that I just thought about now, calling it daily report, it does a complete analysis for the past 24 hours of data from funnels, emails, ads, social content, and we create a complete PDF report for the user at this end, please check this /meticulously and create a / workflow for this.

**Requirements:**

- Workflow name: `daily-report`
- Scope: Past 24 hours of data
- Data sources: Funnels, Emails, Ads, Social content
- Output: Complete PDF report for the user
- Pattern: Slash workflow (like `/onboard`, `/campaign_builder`, `/launch`)

---

## 2. Environment & Context

| Item              | Value                                                                      |
| ----------------- | -------------------------------------------------------------------------- |
| Workflow storage  | `agent_workflows` table (Supabase)                                         |
| Workflow schema   | `workflow_key`, `name`, `description`, `markdown_content`, `steps` (JSONB) |
| Slash menu source | `GET /api/missions/agents/vibey/workflows`                                 |
| Agent tool        | `vibey_backend` (agent-api artifacts)                                      |
| PDF generation    | `create_pdf` action (artifact-pdf.service)                                 |

---

## 3. Data Sources — Evidence

### 3.1 Funnels

- **RPC:** `get_campaign_analytics(p_campaign_id, p_start_date, p_end_date)`
- **Source:** `supabase/migrations/20260218155832_022_visitors_page_views.sql` (lines 145–230)
- **Returns:** `visitors`, `total_views`, `leads`, `conversion_rate`, `chart_data` (daily)
- **Tables:** `visitors_page_views`, `leads`

### 3.2 Emails

- **RPC:** `get_campaign_email_analytics(p_campaign_id, p_start_date, p_end_date)`
- **Source:** Same migration (lines 239–341)
- **Returns:** `sent`, `delivered`, `opened`, `clicked`, `bounced`, `open_rate`, `click_rate`, `chart_data`
- **Tables:** `sequences`, `email_sends`

### 3.3 Ads

- **RPC:** `get_campaign_ad_analytics(p_campaign_id, p_start_date, p_end_date)`
- **Source:** `supabase/migrations/20260224122500_ad_analytics_rpc.sql`
- **Returns:** `ad_visitors`, `ad_views`, `ad_leads`, `total_ads`, `conversion_rate`, `chart_data`, `breakdown`
- **Meta platform:** `get_meta_ads_insights` (vibey_backend) — campaign-level insights from Meta API

### 3.4 Social Content

- **No RPC.** `social_posts` table has `campaign_id`, `status`, `created_at`, `published_at`
- **Query:** Count by status (draft, scheduled, published) and filter `created_at` / `published_at` in last 24h
- **Note:** No engagement metrics (likes, shares) in DB — only creation/scheduling/publishing counts

---

## 4. Gaps & Missing Evidence

| Gap                                             | Impact                                    | Resolution                                                   |
| ----------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ |
| No `get_daily_report_data` vibey_backend action | Agent cannot fetch 24h analytics          | Add new action that aggregates RPCs + social query           |
| Social engagement (likes, shares)               | Report cannot include platform engagement | Out of scope — use creation/publish counts only              |
| Campaign context                                | Agent needs campaign_id                   | Use `resolveCampaignId` from session (same as other actions) |

---

## 5. Design

### 5.1 Workflow Steps

| Order | Key                | Name                 | Skill       | Requires Input | Description                              |
| ----- | ------------------ | -------------------- | ----------- | -------------- | ---------------------------------------- |
| 1     | identify-campaign  | Identify Campaign    | —           | Yes            | Ask which campaign, or use current       |
| 2     | gather-data        | Gather 24h Data      | —           | No             | Call `get_daily_report_data`             |
| 3     | analyze-synthesize | Analyze & Synthesize | —           | No             | Interpret metrics, highlight trends      |
| 4     | generate-pdf       | Generate PDF Report  | pdf-builder | No             | Call `create_pdf` with formatted content |

### 5.2 New Backend Action: `get_daily_report_data`

**Input:**

```json
{
  "campaign_id": "UUID (optional, from session)",
  "hours": 24
}
```

**Output:**

```json
{
  "period": { "start": "ISO", "end": "ISO" },
  "funnels": { "visitors", "total_views", "leads", "conversion_rate", "chart_data" },
  "emails": { "sent", "delivered", "opened", "clicked", "open_rate", "click_rate", "chart_data" },
  "ads": { "ad_visitors", "ad_views", "ad_leads", "total_ads", "conversion_rate", "chart_data", "breakdown" },
  "meta_insights": { "rows": [...] },
  "social": { "created_24h", "published_24h", "scheduled_24h", "total" }
}
```

**Implementation:** New `ArtifactAnalyticsService` in agent-api:

- Resolve campaign_id via `resolveCampaignId`
- Compute `start = now - 24h`, `end = now` (ISO)
- Call `supabase.rpc('get_campaign_analytics', ...)`
- Call `supabase.rpc('get_campaign_email_analytics', ...)`
- Call `supabase.rpc('get_campaign_ad_analytics', ...)`
- Call `target.getMetaAdsInsights({ campaign_id }, sessionKey)` (optional, may fail if no Meta)
- Query `social_posts` where `campaign_id` and `created_at >= start` / `published_at >= start`
- Return aggregated object

---

## 6. Implementation Plan

| Phase | Task                                  | Files                                                                                        |
| ----- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1     | Create `ArtifactAnalyticsService`     | `apps/agent-api/.../artifact-analytics.service.ts`                                           |
| 2     | Register action                       | artifact-action.dto, artifact-action.registry, artifact-capability.policy, artifacts.service |
| 3     | Add to vibey-api-action-docs          | `vibey-api-action-docs.ts`                                                                   |
| 4     | Add to docker vibey-backend allowlist | `docker/tools/vibey-backend/index.ts`                                                        |
| 5     | Seed workflow                         | `supabase/migrations/20260318160000_seed_daily_report_workflow.sql`                          |
| 6     | Create cursor command                 | `.cursor/commands/daily-report.md`                                                           |

---

## 7. Risk & Rollout

- **Risk:** `get_meta_ads_insights` may fail if Meta not connected — handle gracefully, return null for meta_insights
- **Rollout:** Workflow appears in slash menu after migration; agent-sync writes `workflows/daily-report/SKILL.md` to filesystem
- **Rollback:** Delete workflow row; remove action from allowlist

---

## 8. Quality Control Summary

- [x] Data sources verified (RPCs, tables)
- [x] PDF generation path verified (`create_pdf`)
- [x] Workflow pattern verified (onboard, campaign-builder, launch)
- [x] Campaign context resolution verified
- [x] Social data scope clarified (counts only, no engagement)
