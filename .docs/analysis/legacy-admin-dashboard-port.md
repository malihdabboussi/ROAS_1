# Legacy Admin Dashboard — Meticulous Analysis & Port Plan

> **Generated**: 2026-03-04  
> **Purpose**: Port sophisticated cards and charts from `Vibey_legacy/apps/admin` to `apps/admin`

---

## 1. Problem Restatement

**Current admin dashboard** (`apps/admin`):

- Simple cards: label + number only (e.g. "Total Users" → `123`, "MRR" → `$1,234.56`)
- No charts
- No multi-metric cards
- No trend visualization

**Legacy admin dashboard** (`Vibey_legacy/apps/admin`):

- Sophisticated cards with multiple metrics per card (icon + label + value rows)
- Area charts for Users Growth, Cost Trends, Error Activity (7d + 30d)
- MRR Goal card with progress bar, ARPU, conversion rate, ETA
- FinanceSummaryCards with icon, value, subtitle, help popover
- Full Finances page with tabs, ProfitabilityChart, UserGrowthChart, CostTrendsInteractiveChart, etc.

---

## 2. Legacy Components Inventory

### 2.1 Dashboard (`/dashboard`)

| Component             | Path                                                      | Purpose                                      |
| --------------------- | --------------------------------------------------------- | -------------------------------------------- |
| DashboardContainer    | `features/dashboard/containers/DashboardContainer.tsx`    | Fetches stats, renders DashboardMetricsCards |
| DashboardMetricsCards | `features/dashboard/components/DashboardMetricsCards.tsx` | 4 metric cards + 3 trend cards               |
| MrrGoalCard           | `features/dashboard/components/MrrGoalCard.tsx`           | $100K MRR goal with progress, ARPU, ETA      |
| dashboard.service     | `features/dashboard/services/dashboard.service.ts`        | GET /api/admin/dashboard/stats               |
| dashboard.types       | `features/dashboard/types/dashboard.types.ts`             | DashboardStats interface                     |

**DashboardMetricsCards structure:**

- **Row 1 (4 cards)**: Users | Revenue | Costs | Errors
  - Each card: header + "View All →" link, 4 rows of (icon + label + value)
  - Users: Total Users, New 24h, New 7d, Active 7d
  - Revenue: Paid Users, MRR, ARR, Users > $20
  - Costs: Total 30d, AI Requests, Total Tokens
  - Errors: Total Groups, Open, Critical, Recent 24h
- **Row 2**: MrrGoalCard (full width)
- **Row 3 (3 trend cards)**: Users Growth | Cost Trends | Error Activity
  - Each: 7d AreaChart + 30d AreaChart (recharts AreaChart, ChartContainer, ChartTooltip)

**MrrGoalCard structure:**

- Header: "$100K MRR GOAL" + "% complete"
- Left (2 cols): Hero MRR value + progress bar
- Right (1 col): Paid Users, ARPU, Growth, ETA, Conv. Rate, Signups 30d

### 2.2 Finances (`/finances`)

| Component                  | Path                                                          | Purpose                                                                                    |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| FinancesContainer          | `features/finances/containers/FinancesContainer.tsx`          | Tabs, date range, orchestrates all finance components                                      |
| FinanceSummaryCards        | `features/finances/components/FinanceSummaryCards.tsx`        | 6 cards: Total Revenue, Total Costs, Net Profit, Active Paid Users, Cost per Customer, ROI |
| ProfitabilityChart         | `features/finances/components/ProfitabilityChart.tsx`         | Revenue vs costs visualization                                                             |
| UserGrowthChart            | `features/finances/components/UserGrowthChart.tsx`            | User growth over time                                                                      |
| CostTrendsInteractiveChart | `features/finances/components/CostTrendsInteractiveChart.tsx` | Cost trends                                                                                |
| ArrGrowthChart             | `features/finances/components/ArrGrowthChart.tsx`             | ARR growth                                                                                 |
| MonthlyVsAnnualChart       | `features/finances/components/MonthlyVsAnnualChart.tsx`       | Plan mix                                                                                   |
| OnboardingTrialsChart      | `features/finances/components/OnboardingTrialsChart.tsx`      | Trial funnel                                                                               |
| PaidTrialsVsOtoChart       | `features/finances/components/PaidTrialsVsOtoChart.tsx`       | Trials vs OTO                                                                              |
| RadialBarChart             | recharts                                                      | Profit margin, ROI in FinancesContainer                                                    |

**FinanceSummaryCards structure:**

- 6 cards in grid (1 md:2 lg:3)
- Each: Icon top-left, ? help popover top-right, Title + Value, Subtitle badge
- Uses `card card-elevated card-glass`, `badge-glass badge-glass-muted`

### 2.3 Usage (`/usage`)

| Component               | Path                                                    | Purpose                       |
| ----------------------- | ------------------------------------------------------- | ----------------------------- |
| UsageDashboardContainer | `features/usage/containers/UsageDashboardContainer.tsx` | Orchestrates usage components |
| UsageSummaryCards       | `features/usage/components/UsageSummaryCards.tsx`       | Summary cards                 |
| CostTrendsChart         | `features/usage/components/CostTrendsChart.tsx`         | Cost trends                   |
| FeatureCostChart        | `features/usage/components/FeatureCostChart.tsx`        | Feature cost breakdown        |
| CacheStatsCard          | `features/usage/components/CacheStatsCard.tsx`          | Cache stats                   |

### 2.4 Operations (`/operations`)

| Component              | Path                                                        | Purpose                     |
| ---------------------- | ----------------------------------------------------------- | --------------------------- |
| OperationsContainer    | `features/operations/containers/OperationsContainer.tsx`    | Orchestrates ops components |
| OperationsSummaryCards | `features/operations/components/OperationsSummaryCards.tsx` | Summary cards               |
| ErrorRateChart         | `features/operations/components/ErrorRateChart.tsx`         | Error rate                  |
| RequestVolumeChart     | `features/operations/components/RequestVolumeChart.tsx`     | Request volume              |
| ApiPerformanceChart    | `features/operations/components/ApiPerformanceChart.tsx`    | API performance             |

---

## 3. Data Contracts

### 3.1 DashboardStats (legacy)

```ts
interface DashboardStats {
  users: {
    totalUsers: number
    newUsersLast24h: number
    newUsersLast7Days: number
    activeUsersLast7Days: number
    userTrend7d: Array<{ date: string; count: number }>
    userTrend30d: Array<{ date: string; count: number }>
  }
  revenue: {
    paidUsers: number
    mrr: number
    arr: number
    usersOver20: number
  }
  costs: {
    totalCost30d: number
    totalRequests30d: number
    totalTokens30d: number
    costTrend7d: Array<{ date: string; totalCost: number }>
    costTrend30d: Array<{ date: string; totalCost: number }>
  }
  errors: {
    totalErrorGroups: number
    openErrors: number
    criticalErrors: number
    recentErrors: number
    errorTrend7d: Array<{ date: string; count: number }>
    errorTrend30d: Array<{ date: string; count: number }>
  }
}
```

### 3.2 Current AdminService.getDashboard() return shape

```ts
{
  totalUsers: number
  activeUsers7d: number
  mrr: number
  arr: number
  totalCost30d: number
}
```

**Gap**: Current backend returns flat structure. Legacy expects full DashboardStats with trends and errors.

### 3.3 Schema Dependencies

| Table                       | Legacy                | Current V2      | Notes                                         |
| --------------------------- | --------------------- | --------------- | --------------------------------------------- |
| user_profiles               | user_profile          | user_profiles   | V2 uses plural                                |
| ai_usage_events             | token_ai_usage_events | ai_usage_events | V2 uses ai_usage_events                       |
| user_subscriptions          | ✓                     | ✓               | Same                                          |
| subscription_plans          | ✓                     | ✓               | Same                                          |
| app_errors                  | ✓                     | ✓               | AdminService.getOperations, getErrors use it  |
| app_error_groups            | ✓                     | ?               | Legacy uses for error grouping; V2 schema TBD |
| token_usage_rollups_monthly | ✓                     | ?               | Legacy uses for usersOver20                   |

---

## 4. UI Dependencies

### 4.1 Legacy admin package.json

- `recharts`: ^2.13.3
- `lucide-react`: ^0.469.0
- Radix: avatar, checkbox, dialog, dropdown-menu, select, slot, tabs
- `class-variance-authority`, `clsx`, `tailwind-merge`

### 4.2 Current admin package.json

- `lucide-react`: ^0.563.0
- **No recharts**
- **No chart component**
- **No Card component** (uses `card-glass` divs directly)

### 4.3 Legacy admin UI components used by dashboard

- `@/components/ui/card` — Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription
- `@/components/ui/chart` — ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent
- `recharts` — Area, AreaChart, XAxis, YAxis, CartesianGrid

### 4.4 Web app (reference)

- `apps/web` has: recharts ^3.7.0, chart.tsx, Card (if any)
- Chart component at `apps/web/src/components/ui/chart.tsx`
- Uses `cn` from `@/lib/utils/cn`

---

## 5. Port Plan (Phased)

### Phase 1: Dashboard cards + charts (minimal viable port)

1. **Extend AdminService.getDashboard()** (`apps/api/src/modules/admin/services/admin.service.ts`)
   - Return full DashboardStats shape
   - Add: newUsersLast24h, newUsersLast7Days, userTrend7d, userTrend30d
   - Add: paidUsers, usersOver20
   - Add: totalRequests30d, totalTokens30d, costTrend7d, costTrend30d
   - Add: errors block — use app_errors if app_error_groups doesn't exist (return 0 or derive from app_errors)

2. **Add dependencies to admin** (`apps/admin/package.json`)
   - `recharts`: ^3.7.0 (match web)
   - `clsx`, `tailwind-merge` if not present

3. **Copy/create UI components in admin**
   - `apps/admin/src/components/ui/card.tsx` — port from legacy or web
   - `apps/admin/src/components/ui/chart.tsx` — copy from `apps/web/src/components/ui/chart.tsx`
   - Ensure `cn` util exists: `apps/admin/src/lib/utils/cn.ts`

4. **Create dashboard feature in admin**
   - `apps/admin/src/features/dashboard/types/dashboard.types.ts`
   - `apps/admin/src/features/dashboard/services/dashboard.service.ts` (use adminGet('dashboard'))
   - `apps/admin/src/features/dashboard/components/DashboardMetricsCards.tsx`
   - `apps/admin/src/features/dashboard/components/MrrGoalCard.tsx`
   - `apps/admin/src/features/dashboard/containers/DashboardContainer.tsx`

5. **Update dashboard page**
   - Replace AdminDataView with DashboardContainer
   - Or keep AdminDataView but change render to use DashboardContainer when path is dashboard

6. **CSS verification**
   - Admin globals.css has: surface-card, card-glass, badge-glass-muted, icon-sm, title-h3, title-h4, body-2, body-3
   - Add `text-emerald`, `text-orange`, `text-destructive` if missing

### Phase 2: Finances page (optional)

- Port FinanceSummaryCards, FinancesContainer
- Requires finances API to return profitability, revenue metrics, cost trends
- Current AdminService.getFinances() may need extension

### Phase 3: Usage, Operations (optional)

- Port UsageSummaryCards, CostTrendsChart, etc.
- Port OperationsSummaryCards, ErrorRateChart, etc.

---

## 6. Evidence Pack

### Files read (100%)

- `Vibey_legacy/apps/admin/src/app/(protected)/dashboard/page.tsx`
- `Vibey_legacy/apps/admin/src/features/dashboard/containers/DashboardContainer.tsx`
- `Vibey_legacy/apps/admin/src/features/dashboard/components/DashboardMetricsCards.tsx` (355 lines)
- `Vibey_legacy/apps/admin/src/features/dashboard/components/MrrGoalCard.tsx` (167 lines)
- `Vibey_legacy/apps/admin/src/features/dashboard/types/dashboard.types.ts`
- `Vibey_legacy/apps/admin/src/features/dashboard/services/dashboard.service.ts`
- `Vibey_legacy/apps/admin/src/app/api/admin/dashboard/stats/route.ts` (324 lines)
- `Vibey_legacy/apps/admin/src/features/finances/components/FinanceSummaryCards.tsx` (147 lines)
- `Vibey_legacy/apps/admin/src/features/finances/containers/FinancesContainer.tsx` (419 lines)
- `apps/admin/src/app/(protected)/dashboard/page.tsx`
- `apps/api/src/modules/admin/services/admin.service.ts` (227 lines)
- `apps/api/src/modules/admin/controllers/admin.controller.ts`
- `apps/web/src/components/ui/chart.tsx` (370 lines)
- `Vibey_legacy/apps/admin/src/components/ui/card.tsx`

### Data flow

```
Legacy: Page → DashboardContainer → getDashboardStats() → GET /api/admin/dashboard/stats
        → Next.js API route (getServerAdmin, Supabase queries) → DashboardStats JSON
        → DashboardMetricsCards + MrrGoalCard

Current: Page → AdminDataView → adminGet('dashboard') → GET /api/proxy/admin/dashboard
         → apps/api GET /admin/dashboard → AdminService.getDashboard() → flat JSON
         → Simple card grid (name + number)
```

---

## 7. Risk & Rollout

- **Schema risk**: app_error_groups may not exist. Fallback: return 0 for error metrics or derive from app_errors.
- **token_usage_rollups_monthly**: Legacy uses for usersOver20. If missing, return 0 or omit.
- **Chart styling**: Ensure admin globals.css has `--border` and chart color variables compatible with dark theme.

---

## 8. Quality Control Summary

- [x] Read entire target files (DashboardMetricsCards, MrrGoalCard, FinancesContainer, etc.)
- [x] Read all files that import dashboard components
- [x] Read dashboard service and API route
- [x] Understand complete data flow
- [x] Searched for usages (grep)
- [x] Data contract documented
- [x] Port plan phased and actionable
