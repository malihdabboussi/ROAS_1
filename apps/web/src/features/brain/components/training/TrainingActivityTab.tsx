'use client'

import { useMemo, type ReactNode } from 'react'
import { Bot, Brain, Building2, CheckCircle2, Loader2, Share2, Users, XCircle } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { CampaignBrainIconDisplay } from '@/features/brain/components/CampaignBrainIconPicker'
import { useBrainQueue, type BrainQueueUiJob } from '@/features/brain/hooks/use-brain-queue'
import { useBrainScopeNavOptions } from '@/features/brain/hooks/use-brain-scope-nav-options'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

function jobLastActivityIso(job: BrainQueueUiJob): string {
  return job.updated_at ?? job.completed_at ?? job.created_at
}

function listAvatarFallback(scopeType: BrainScopeNavOption['scopeType'], label: string): ReactNode {
  const iconCls = 'h-3.5 w-3.5 text-muted-foreground'
  switch (scopeType) {
    case 'user':
    case 'person':
    case 'shared':
      return (
        <span className="typo-caption text-muted-foreground font-semibold">
          {label.slice(0, 1).toUpperCase()}
        </span>
      )
    case 'company':
      return <Building2 className={iconCls} />
    case 'customer':
      return <Users className={iconCls} />
    case 'agent':
      return <Bot className={iconCls} />
    case 'campaign':
    case 'campaign_knowledge':
      return <Brain className={iconCls} />
  }
}

function resolveBrainForJob(
  job: BrainQueueUiJob,
  brainById: Map<string, BrainScopeNavOption>,
  userScope: BrainScopeNavOption | undefined,
): BrainScopeNavOption {
  const brainId = job.brain_id?.trim()
  if (brainId) {
    const match = brainById.get(brainId)
    if (match) return match
  }
  if (userScope) return userScope
  return {
    id: 'unknown',
    label: 'Your Brain',
    agentId: null,
    brainId: brainId ?? null,
    scopeType: 'user',
    imageUrl: null,
  }
}

function JobStatusIcon({ job }: { job: BrainQueueUiJob }) {
  if (job.status === 'queued' || job.status === 'retry') {
    return <Loader2 className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
  }
  if (job.status === 'processing') {
    return <Loader2 className="text-primary h-3.5 w-3.5 shrink-0 animate-spin" />
  }
  if (job.status === 'succeeded') {
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
  }
  return <XCircle className="text-destructive h-3.5 w-3.5 shrink-0" />
}

function BrainCell({ option }: { option: BrainScopeNavOption }) {
  const imageUrl = option.imageUrl ?? null
  return (
    <div className="gap-spacing-2 flex min-w-0 items-center">
      {option.scopeType === 'campaign_knowledge' && option.campaignId ? (
        <CampaignBrainIconDisplay
          variant="inline"
          icon={option.campaignIcon ?? 'brain'}
          iconColor={option.campaignIconColor ?? 'purple'}
          imageUrl={imageUrl}
        />
      ) : imageUrl ? (
        <img src={imageUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
          {option.scopeType === 'shared' ? (
            <Share2 className="text-muted-foreground h-3.5 w-3.5" />
          ) : (
            listAvatarFallback(option.scopeType, option.label)
          )}
        </span>
      )}
      <span className="body-4 text-foreground min-w-0 truncate">{option.label}</span>
    </div>
  )
}

export function TrainingActivityTab({ open }: { open: boolean }) {
  const { jobs, loading, cancel, retry, dismiss } = useBrainQueue({
    retainCompleted: true,
    limit: 100,
  })
  const { scopeOptions } = useBrainScopeNavOptions()

  const brainById = useMemo(() => {
    const map = new Map<string, BrainScopeNavOption>()
    for (const option of scopeOptions) {
      if (option.brainId) map.set(option.brainId, option)
    }
    return map
  }, [scopeOptions])

  const userScope = useMemo(
    () => scopeOptions.find((option) => option.scopeType === 'user'),
    [scopeOptions],
  )

  const sortedJobs = useMemo(
    () =>
      [...jobs].sort(
        (a, b) =>
          new Date(jobLastActivityIso(b)).getTime() - new Date(jobLastActivityIso(a)).getTime(),
      ),
    [jobs],
  )

  if (!open) return null

  return (
    <div className="px-spacing-5 py-spacing-4 flex h-full min-h-0 flex-col overflow-hidden">
      <div className="surface-card border-subtle rounded-spacing-3 flex min-h-0 flex-1 flex-col overflow-hidden border">
        <div className="gap-spacing-3 border-border body-4 text-muted-foreground px-spacing-3 py-spacing-2 grid shrink-0 grid-cols-[1.5fr_1.1fr_0.85fr_0.75fr] border-b font-medium uppercase tracking-wide">
          <div>Name</div>
          <div>Brain</div>
          <div>Last activity</div>
          <div>Actions</div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {loading && sortedJobs.length === 0 ? (
            <div className="p-spacing-4">
              <ListSkeleton rows={4} label="Loading activity…" />
            </div>
          ) : sortedJobs.length === 0 ? (
            <p className="body-4 text-muted-foreground p-spacing-4 text-center">
              No training activity yet.
            </p>
          ) : (
            sortedJobs.map((job) => {
              const brain = resolveBrainForJob(job, brainById, userScope)
              const isActive =
                job.status === 'queued' || job.status === 'processing' || job.status === 'retry'
              return (
                <div
                  key={job.id}
                  className="gap-spacing-3 border-border body-4 text-foreground px-spacing-3 py-spacing-2 grid grid-cols-[1.5fr_1.1fr_0.85fr_0.75fr] items-center border-b last:border-b-0"
                >
                  <div className="gap-spacing-2 flex min-w-0 items-center">
                    <JobStatusIcon job={job} />
                    <span className="body-4 min-w-0 truncate">{job.title}</span>
                  </div>
                  <BrainCell option={brain} />
                  <div className="text-muted-foreground tabular-nums">
                    {relativeTime(jobLastActivityIso(job))}
                  </div>
                  <div className="gap-spacing-2 flex min-w-0 items-center">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => void cancel(job.id)}
                        className="typo-caption text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    ) : null}
                    {job.status === 'failed' ? (
                      <>
                        <button
                          type="button"
                          disabled={job.isRetrying}
                          onClick={() => void retry(job.id)}
                          className="typo-caption text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => void dismiss(job.id)}
                          className="typo-caption text-muted-foreground hover:text-foreground"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : null}
                    {!isActive && job.status !== 'failed' ? (
                      <span className="text-muted-foreground typo-caption">—</span>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
