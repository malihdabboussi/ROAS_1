'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ListTodo } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns'
import { fetchPrograms, type Program } from '@/lib/programs'
import { buildSpaceItemHref } from '@/lib/spaces/space-item-href'
import { fetchTaskRollup, type TaskRollupItem, type TaskRollupView } from '@/lib/tasks'
import { ALL_TASKS_TOAST_ERRORS } from '../config/all-tasks-toast-errors.config'

function formatDue(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function AllTasksBoard() {
  const router = useRouter()
  const [view, setView] = useState<TaskRollupView>('my')
  const [programId, setProgramId] = useState<string>('')
  const [campaignId, setCampaignId] = useState<string>('')
  const [programs, setPrograms] = useState<Program[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [items, setItems] = useState<TaskRollupItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadMeta = useCallback(async () => {
    const [programRows, campaignRows] = await Promise.all([
      fetchPrograms().catch(() => [] as Program[]),
      fetchCampaigns().catch(() => [] as Campaign[]),
    ])
    setPrograms(programRows)
    setCampaigns(campaignRows)
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await fetchTaskRollup({
        view,
        programId: programId || null,
        campaignId: campaignId || null,
        limit: 200,
      })
      setItems(rows)
    } catch {
      toast.error(ALL_TASKS_TOAST_ERRORS.LOAD_FAILED.userMessage)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [view, programId, campaignId])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const campaignOptions = useMemo(() => {
    if (!programId) return campaigns
    return campaigns.filter((c) => c.program_id === programId)
  }, [campaigns, programId])

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="p-spacing-4 md:p-spacing-6 mx-auto w-full max-w-5xl">
        <div className="mb-spacing-4">
          <h1 className="title-h3 text-foreground">ALL TASKS</h1>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            Roll up open space tasks across campaigns. Your Turn stays the personal inbox.
          </p>
        </div>

        <div className="mb-spacing-4 gap-spacing-2 flex flex-wrap items-center">
          <div className="gap-spacing-1 border-border flex rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setView('my')}
              className={`body-3 rounded-md px-3 py-1.5 font-medium ${
                view === 'my'
                  ? 'button-glass-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Tasks
            </button>
            <button
              type="button"
              onClick={() => setView('all')}
              className={`body-3 rounded-md px-3 py-1.5 font-medium ${
                view === 'all'
                  ? 'button-glass-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Tasks
            </button>
          </div>

          <select
            value={programId}
            onChange={(e) => {
              setProgramId(e.target.value)
              setCampaignId('')
            }}
            className="input-glass body-3 text-foreground rounded-lg px-3 py-2"
            aria-label="Filter by program"
          >
            <option value="">All programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="input-glass body-3 text-foreground rounded-lg px-3 py-2"
            aria-label="Filter by campaign"
          >
            <option value="">All campaigns</option>
            {campaignOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <VibeyLoadingOrb text="Loading tasks..." state="processing" size="sm" />
          </div>
        ) : items.length === 0 ? (
          <div className="surface-card border-border rounded-spacing-3 p-spacing-6 border text-center">
            <ListTodo className="text-muted-foreground mb-spacing-2 mx-auto h-8 w-8" />
            <p className="body-2 text-foreground font-medium">No open tasks</p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              {view === 'my'
                ? 'Nothing assigned to you in this scope.'
                : 'No open tasks match these filters.'}
            </p>
          </div>
        ) : (
          <div className="surface-card border-border rounded-spacing-3 overflow-hidden border">
            <div className="border-border text-muted-foreground body-4 hidden grid-cols-12 gap-2 border-b px-4 py-2 font-medium md:grid">
              <span className="col-span-4">Task</span>
              <span className="col-span-2">Campaign</span>
              <span className="col-span-2">Space</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2">Due</span>
            </div>
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-border border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => router.push(buildSpaceItemHref(item.space_id, item.id))}
                    className="hover:bg-hover-subtle body-3 text-foreground grid w-full grid-cols-1 gap-1 px-4 py-3 text-left md:grid-cols-12 md:items-center md:gap-2"
                  >
                    <span className="col-span-4 truncate font-medium">{item.title}</span>
                    <span className="text-muted-foreground col-span-2 truncate">
                      {item.campaign_name ?? '—'}
                    </span>
                    <span className="text-muted-foreground col-span-2 truncate">
                      {item.space_title}
                    </span>
                    <span className="text-muted-foreground col-span-2 truncate capitalize">
                      {item.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-muted-foreground col-span-2 truncate">
                      {formatDue(item.due_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
