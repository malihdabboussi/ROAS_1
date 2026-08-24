'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CircleDollarSign, RefreshCw, Target, UsersRound } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchAgencyCampaignOverview, type AgencyCampaignOverview } from '@/lib/agency-clients'
import type { SpaceItem } from '../../types'

export function PageGraderCampaignOverviewView({
  clientId,
  pageGraderCampaignId,
  spaceItems,
  spaceId,
  onOpenTask,
}: {
  clientId: string
  pageGraderCampaignId: string
  spaceItems: SpaceItem[]
  spaceId: string
  onOpenTask: (item: SpaceItem) => void
}) {
  const [overview, setOverview] = useState<AgencyCampaignOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true)
      else setLoading(true)
      try {
        setOverview(await fetchAgencyCampaignOverview(clientId, pageGraderCampaignId))
        setError(null)
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : 'Could not load this campaign overview.',
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [clientId, pageGraderCampaignId],
  )

  useEffect(() => {
    void load()
  }, [load])

  const nativeItems = useMemo(
    () => new Map(spaceItems.map((item) => [item.id, item])),
    [spaceItems],
  )

  if (loading)
    return (
      <div className="flex flex-1 items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading campaign overview..." />
      </div>
    )
  if (error || !overview)
    return (
      <div className="p-spacing-6">
        <p className="body-3 text-destructive">{error || 'Campaign overview is unavailable.'}</p>
        <button type="button" className="button-compact mt-spacing-3" onClick={() => void load()}>
          Try again
        </button>
      </div>
    )

  const performance = overview.performance
  return (
    <div className="scrollbar-thin gap-spacing-6 p-spacing-5 flex h-0 min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="gap-spacing-3 flex flex-wrap items-start justify-between">
        <div>
          <div className="gap-spacing-2 flex flex-wrap items-center">
            <span className="body-4 bg-primary/10 text-primary px-spacing-2 py-spacing-1 rounded-full capitalize">
              {readable(
                overview.campaign.platform_status || overview.campaign.status || 'planning',
              )}
            </span>
            {overview.campaign.campaign_type ? (
              <span className="body-4 bg-secondary text-muted-foreground px-spacing-2 py-spacing-1 rounded-full capitalize">
                {readable(String(overview.campaign.campaign_type))}
              </span>
            ) : null}
          </div>
          {overview.campaign.description ? (
            <p className="body-3 text-muted-foreground mt-spacing-2 max-w-3xl">
              {String(overview.campaign.description)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="button-compact gap-spacing-2"
        >
          <RefreshCw className={refreshing ? 'icon-sm animate-spin' : 'icon-sm'} /> Refresh live
          data
        </button>
      </header>

      <section className="gap-spacing-3 flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="heading-3 text-foreground">Campaign requests</h2>
          <span className="body-4 text-muted-foreground">
            {overview.tasks.length} tasks
            {overview.task_sync ? ` · ${overview.task_sync.synced} mirrored` : ''}
          </span>
        </div>
        {overview.task_sync &&
        (overview.task_sync.skipped > 0 || overview.task_sync.errors.length > 0) ? (
          <p className="body-4 text-warning">
            {overview.task_sync.skipped > 0
              ? `${overview.task_sync.skipped} campaign tasks need a campaign Space mapping. `
              : ''}
            {overview.task_sync.errors.length > 0
              ? `${overview.task_sync.errors.length} campaign tasks failed to mirror.`
              : ''}
          </p>
        ) : null}
        <div className="surface-card rounded-spacing-3 border-border overflow-x-auto border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="body-4 text-muted-foreground border-border bg-secondary border-b text-left">
                <th className="px-spacing-4 py-spacing-3">Status</th>
                <th className="px-spacing-4 py-spacing-3">Task</th>
                <th className="px-spacing-4 py-spacing-3">Priority</th>
                <th className="px-spacing-4 py-spacing-3">Assignee</th>
                <th className="px-spacing-4 py-spacing-3">Due date</th>
              </tr>
            </thead>
            <tbody>
              {overview.tasks.map((task) => {
                const nativeId = stringValue(task.roas_space_item_id)
                const nativeItem = nativeId
                  ? (nativeItems.get(nativeId) ?? taskToSpaceItem(task, nativeId, spaceId))
                  : undefined
                return (
                  <tr
                    key={stringValue(task.id)}
                    onClick={() => nativeItem && onOpenTask(nativeItem)}
                    className={
                      nativeItem
                        ? 'hover:bg-hover-subtle border-border cursor-pointer border-b last:border-b-0'
                        : 'border-border border-b last:border-b-0'
                    }
                  >
                    <td className="px-spacing-4 py-spacing-3">
                      <span className="body-4 bg-secondary px-spacing-2 py-spacing-1 rounded-full capitalize">
                        {readable(stringValue(task.clickup_status, task.status) || 'to do')}
                      </span>
                    </td>
                    <td className="body-3 text-foreground px-spacing-4 py-spacing-3 font-medium">
                      {stringValue(task.task_description) || 'Untitled task'}
                    </td>
                    <td className="body-4 text-muted-foreground px-spacing-4 py-spacing-3 capitalize">
                      {readable(stringValue(task.priority) || 'normal')}
                    </td>
                    <td className="body-4 text-muted-foreground px-spacing-4 py-spacing-3">
                      {stringValue(task.assignee_name) || 'Unassigned'}
                    </td>
                    <td className="body-4 text-muted-foreground px-spacing-4 py-spacing-3">
                      {formatDate(stringValue(task.due_date))}
                    </td>
                  </tr>
                )
              })}
              {overview.tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="body-3 text-muted-foreground p-spacing-6 text-center">
                    No campaign tasks yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="gap-spacing-3 flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="heading-3 text-foreground">Performance snapshot</h2>
          <span className="body-4 text-muted-foreground">
            {overview.snapshot_at
              ? `Updated ${formatDate(overview.snapshot_at)}`
              : 'No snapshot yet'}
          </span>
        </div>
        <div className="gap-spacing-3 grid grid-cols-2 lg:grid-cols-5">
          <Metric icon={CircleDollarSign} label="Spend" value={money(performance.spend)} />
          <Metric icon={UsersRound} label="Leads" value={whole(performance.leads)} />
          <Metric icon={Target} label="Conversions" value={whole(performance.conversions)} />
          <Metric
            icon={CircleDollarSign}
            label="Cost per lead"
            value={money(performance.cost_per_lead)}
          />
          <Metric icon={CalendarDays} label="CPM" value={money(performance.cpm)} />
        </div>
      </section>

      <section className="gap-spacing-3 flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="heading-3 text-foreground">Best-performing ads</h2>
          <span className="body-4 text-muted-foreground">Linked Meta campaigns only</span>
        </div>
        <div className="surface-card rounded-spacing-3 border-border overflow-x-auto border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="body-4 text-muted-foreground border-border bg-secondary border-b text-left">
                <th className="px-spacing-4 py-spacing-3">Ad</th>
                <th className="px-spacing-4 py-spacing-3">Campaign</th>
                <th className="px-spacing-4 py-spacing-3">Spend</th>
                <th className="px-spacing-4 py-spacing-3">Results</th>
                <th className="px-spacing-4 py-spacing-3">Cost / result</th>
                <th className="px-spacing-4 py-spacing-3">CTR</th>
              </tr>
            </thead>
            <tbody>
              {overview.top_ads.slice(0, 10).map((ad, index) => (
                <tr
                  key={stringValue(ad.ad_id, ad.id) || String(index)}
                  className="border-border border-b last:border-b-0"
                >
                  <td className="body-3 text-foreground px-spacing-4 py-spacing-3 font-medium">
                    {stringValue(ad.ad_name, ad.name) || 'Untitled ad'}
                  </td>
                  <td className="body-4 text-muted-foreground px-spacing-4 py-spacing-3">
                    {stringValue(ad.campaign_name) || '—'}
                  </td>
                  <td className="body-4 px-spacing-4 py-spacing-3">{money(ad.spend)}</td>
                  <td className="body-4 px-spacing-4 py-spacing-3">{whole(ad.conversions)}</td>
                  <td className="body-4 px-spacing-4 py-spacing-3">
                    {money(ad.cost_per_conversion)}
                  </td>
                  <td className="body-4 px-spacing-4 py-spacing-3">{percent(ad.ctr)}</td>
                </tr>
              ))}
              {overview.top_ads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="body-3 text-muted-foreground p-spacing-6 text-center">
                    {overview.linked_meta_campaign_ids.length === 0
                      ? 'Link Meta campaigns in Page Grader to see campaign performance.'
                      : 'No ad data is available for the linked campaigns yet.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target
  label: string
  value: string
}) {
  return (
    <div className="surface-card rounded-spacing-3 border-border p-spacing-4 border">
      <div className="flex items-center justify-between">
        <span className="body-4 text-muted-foreground">{label}</span>
        <Icon className="icon-sm text-primary" />
      </div>
      <p className="heading-2 text-foreground mt-spacing-3">{value}</p>
    </div>
  )
}
function stringValue(...values: unknown[]) {
  for (const value of values) if (typeof value === 'string' && value.trim()) return value.trim()
  return ''
}
function readable(value: string) {
  return value.replace(/[_-]/g, ' ').toLowerCase()
}
function numberValue(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
function money(value: unknown) {
  const number = numberValue(value)
  return number == null
    ? '—'
    : number.toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      })
}
function whole(value: unknown) {
  const number = numberValue(value)
  return number == null ? '—' : Math.round(number).toLocaleString()
}
function percent(value: unknown) {
  const number = numberValue(value)
  return number == null ? '—' : `${number.toFixed(2)}%`
}
function formatDate(value: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function taskToSpaceItem(task: Record<string, unknown>, id: string, spaceId: string): SpaceItem {
  const now = new Date().toISOString()
  const rawStatus = readable(stringValue(task.status, task.clickup_status) || 'todo').replace(
    /\s+/g,
    '_',
  )
  const priority = stringValue(task.priority).toLowerCase()
  return {
    id,
    space_id: spaceId,
    org_id: '',
    user_id: '',
    title: stringValue(task.task_description) || 'Untitled task',
    status: rawStatus,
    priority: ['low', 'medium', 'high', 'urgent'].includes(priority)
      ? (priority as SpaceItem['priority'])
      : null,
    assignee_type: stringValue(task.assignee_id) ? 'human' : 'unassigned',
    assignee_id: stringValue(task.assignee_id) || null,
    assignees: [],
    start_date: null,
    due_date: stringValue(task.due_date) || null,
    recurrence: null,
    parent_item_id: null,
    recurrence_parent_id: null,
    description: stringValue(task.notes, task.task_description) || null,
    notes: stringValue(task.notes) || null,
    doc_body: null,
    source: 'manual',
    linked_mission_id: null,
    linked_mission_subtask_id: null,
    form_id: null,
    task_execution_status: null,
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    sort_order: 0,
    custom_data: {
      page_grader_work_id: stringValue(task.id),
      page_grader_client_id: stringValue(task.client_id),
      page_grader_campaign_id: stringValue(task.campaign_id),
      clickup_task_id: stringValue(task.clickup_task_id),
      clickup_task_url: stringValue(task.clickup_task_url),
      source: 'page_grader',
    },
    created_at: stringValue(task.created_at) || now,
    updated_at: stringValue(task.updated_at) || now,
  }
}
