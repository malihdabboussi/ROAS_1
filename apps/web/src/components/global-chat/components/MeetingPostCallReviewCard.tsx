'use client'

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Calendar, RefreshCw, X } from 'lucide-react'
import { ClientCampaignCell } from '@/components/spaces/cells/ClientCampaignCell'
import { DueDateCell } from '@/components/spaces/cells/DueDateCell'
import { MultiSelectCell } from '@/components/spaces/cells/MultiSelectCell'
import { SelectCell } from '@/components/ui/forms/SelectCell'
import { OptionDot } from '@/components/ui/status/OptionBadge'
import { MEETING_POST_CALL_REVIEW_MESSAGES } from '@/features/home/config/meeting-post-call-actions.config'
import {
  useClientCampaignGroups,
  type ClientCampaignGroup,
  type ClientCampaignMapping,
} from '@/lib/agency-clients'
import type { MeetingPostCallReview } from '../store/use-global-chat-store'

export function MeetingPostCallReviewCard({
  review,
  onContinue,
  onRefreshFollowUps,
  clientWorkspaceOptions,
}: {
  review: MeetingPostCallReview
  onContinue: (review: MeetingPostCallReview) => void | Promise<void>
  onRefreshFollowUps?: () => Promise<void>
  clientWorkspaceOptions?: ClientCampaignMapping[]
}) {
  const [draft, setDraft] = useState(() => normalizeReviewSummary(review))
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const loaded = useClientCampaignGroups(clientWorkspaceOptions === undefined)
  const groups = useMemo<ClientCampaignGroup[] | undefined>(() => {
    if (clientWorkspaceOptions === undefined) return loaded.groups ?? undefined
    return clientWorkspaceOptions.map((option) => ({
      clientId: option.client_id,
      clientName: option.client_name,
      inactive: false,
      campaigns: [
        {
          id: option.campaign_id,
          name: option.campaign_name || option.client_name,
          roasSpaceId: option.roas_space_id ?? null,
        },
      ],
    }))
  }, [clientWorkspaceOptions, loaded.groups])
  const completeTasks = draft.followUps.every(
    (item) => item.title.trim() && item.owner.trim() && item.dueDate,
  )

  useEffect(() => setDraft(normalizeReviewSummary(review)), [review])

  return (
    <div className="border-border bg-background px-spacing-4 py-spacing-3 border-b">
      <div className="surface-card border-border rounded-spacing-3 space-y-spacing-3 p-spacing-3 border">
        <div>
          <p className="body-2 text-foreground font-medium">
            {MEETING_POST_CALL_REVIEW_MESSAGES.title}
          </p>
          <p className="body-3 text-muted-foreground">
            {MEETING_POST_CALL_REVIEW_MESSAGES.description}
          </p>
        </div>
        <label className="gap-spacing-1 flex flex-col">
          <span className="body-3 text-muted-foreground">Meeting summary</span>
          <textarea
            value={draft.summary}
            rows={summaryRows(draft.summary)}
            onChange={(event) =>
              setDraft((current) => ({ ...current, summary: event.target.value }))
            }
            className="input-glass body-3 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 focus:ring-ring w-full resize-y border outline-none focus:ring-2"
          />
        </label>
        <div className="gap-spacing-3 grid sm:grid-cols-2">
          <MeetingSelect
            label="Call Kind"
            field={draft.fields.callKind}
            value={draft.callKind}
            onChange={(callKind) => setDraft((current) => ({ ...current, callKind }))}
          />
          <MeetingSelect
            label="Call status"
            field={draft.fields.callStatus}
            value={draft.callStatus}
            onChange={(callStatus) => setDraft((current) => ({ ...current, callStatus }))}
          />
        </div>
        <div className="gap-spacing-1 flex flex-col">
          <span className="body-3 text-muted-foreground">Client Workspace</span>
          <div className="input-glass border-border rounded-spacing-2 min-h-spacing-9 px-spacing-2 flex items-center border">
            <ClientCampaignCell
              field={{ id: 'client_workspace', name: 'Client Workspace', type: 'text' }}
              value={draft.clientCampaign}
              displayMode="client"
              groupsOverride={groups}
              onChange={(value) => {
                const selected = value as ClientCampaignMapping | null
                const canonical = selected
                  ? (clientWorkspaceOptions?.find(
                      (option) => option.client_id === selected.client_id,
                    ) ?? selected)
                  : null
                setDraft((current) => ({
                  ...current,
                  clientCampaign: canonical,
                  clientWorkspace: canonical?.client_name ?? '',
                }))
              }}
            />
          </div>
        </div>
        <div className="gap-spacing-1 flex flex-col">
          <span className="body-3 text-muted-foreground">Attendees</span>
          <div className="input-glass border-border rounded-spacing-2 min-h-spacing-9 px-spacing-2 flex items-center border">
            <MultiSelectCell
              field={draft.fields.attendees}
              value={draft.attendeeIds}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  attendeeIds: Array.isArray(value) ? value.map(String) : [],
                }))
              }
            />
          </div>
        </div>
        <div className="gap-spacing-2 flex flex-col">
          <div className="gap-spacing-2 flex items-start justify-between">
            <div>
              <p className="body-3 text-muted-foreground">
                Follow-ups to review ({draft.followUps.length})
              </p>
              <p className="body-4 text-muted-foreground">
                Every task requires WHO, WHAT, and WHEN.
              </p>
            </div>
            {onRefreshFollowUps ? (
              <button
                type="button"
                className="button-default button-glass-neutral"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true)
                  setSubmitError(null)
                  try {
                    await onRefreshFollowUps()
                  } catch {
                    setSubmitError(MEETING_POST_CALL_REVIEW_MESSAGES.refreshError)
                  } finally {
                    setRefreshing(false)
                  }
                }}
              >
                <RefreshCw className="icon-xs" aria-hidden />
                {refreshing ? 'Refreshing...' : 'Refresh from meeting'}
              </button>
            ) : null}
          </div>
          {draft.followUps.map((followUp) => (
            <div
              key={followUp.id}
              className="border-border rounded-spacing-2 gap-spacing-2 p-spacing-3 flex flex-col border"
            >
              <div className="gap-spacing-2 flex items-start">
                <TaskInput
                  label="WHAT"
                  value={followUp.title}
                  onChange={(title) => updateFollowUp(setDraft, followUp.id, { title })}
                />
                <button
                  type="button"
                  className="btn-icon-bare text-destructive shrink-0"
                  aria-label={`Dismiss ${followUp.title}`}
                  onClick={() =>
                    setDraft((current) => {
                      const followUps = current.followUps.filter((item) => item.id !== followUp.id)
                      return { ...current, followUps, followUpCount: followUps.length }
                    })
                  }
                >
                  <X className="icon-xs" aria-hidden />
                </button>
              </div>
              <div className="gap-spacing-2 grid sm:grid-cols-2">
                <TaskInput
                  label="WHO"
                  value={followUp.owner}
                  placeholder="Responsible person"
                  onChange={(owner) => updateFollowUp(setDraft, followUp.id, { owner })}
                />
                <label className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
                  <span className="typo-caption text-muted-foreground">WHEN</span>
                  <div className="input-glass body-3 border-border rounded-spacing-2 h-spacing-9 px-spacing-3 flex items-center border">
                    <DueDateCell
                      value={{
                        start_date: null,
                        due_date: followUp.dueDate || null,
                        recurrence: null,
                      }}
                      triggerField="due"
                      displayFormat="date"
                      fullWidthCustomTrigger
                      customTrigger={
                        <span className="gap-spacing-2 flex w-full min-w-0 items-center">
                          <Calendar
                            className="icon-sm text-muted-foreground shrink-0"
                            aria-hidden
                          />
                          <span
                            className={
                              followUp.dueDate
                                ? 'body-3 text-foreground min-w-0 truncate'
                                : 'body-3 text-muted-foreground min-w-0 truncate'
                            }
                          >
                            {formatTaskDueDate(followUp.dueDate)}
                          </span>
                        </span>
                      }
                      onChange={(patch) =>
                        updateFollowUp(setDraft, followUp.id, {
                          dueDate: patch.due_date?.slice(0, 10) ?? '',
                        })
                      }
                    />
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>
        {!completeTasks ? (
          <p className="body-3 text-warning">Add a responsible person and date to every task.</p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="button"
            disabled={
              !draft.summary.trim() || !draft.clientCampaign || !completeTasks || submitting
            }
            className="button-default button-glass-accent disabled:opacity-50"
            onClick={async () => {
              setSubmitting(true)
              setSubmitError(null)
              try {
                await onContinue(draft)
              } catch {
                setSubmitError(MEETING_POST_CALL_REVIEW_MESSAGES.continueError)
              } finally {
                setSubmitting(false)
              }
            }}
          >
            {submitting ? 'Preparing task review...' : 'Continue to task review'}
          </button>
        </div>
        {submitError ? (
          <p role="alert" className="body-3 text-destructive">
            {submitError}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function MeetingSelect({
  label,
  field,
  value,
  onChange,
}: {
  label: string
  field: MeetingPostCallReview['fields']['callKind']
  value: string
  onChange: (value: string) => void
}) {
  const selected = field.options?.find((option) => option.id === value)

  return (
    <div className="gap-spacing-1 flex flex-col">
      <span className="body-3 text-muted-foreground">{label}</span>
      <div className="input-glass border-border rounded-spacing-2 h-spacing-9 px-spacing-3 flex items-center border">
        <SelectCell
          field={field}
          value={value}
          customTrigger={
            <span className="gap-spacing-2 flex w-full min-w-0 items-center">
              <OptionDot color={selected?.color} />
              <span className="body-3 text-foreground min-w-0 truncate">
                {selected?.label ?? value}
              </span>
            </span>
          }
          onChange={(next) => onChange(String(next ?? ''))}
        />
      </div>
    </div>
  )
}

function normalizeReviewSummary(review: MeetingPostCallReview): MeetingPostCallReview {
  return {
    ...review,
    summary: stripSlackHeadingMarkers(review.summary),
    followUps: review.followUps.map((followUp) => ({
      ...followUp,
      dueDate: normalizeTaskDueDate(followUp.dueDate),
    })),
  }
}

function normalizeTaskDueDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : ''
}

function stripSlackHeadingMarkers(summary: string): string {
  return summary.replace(/^[\t ]*\*([^*\n]+)\*[\t ]*$/gm, '$1').trim()
}

function summaryRows(summary: string): number {
  const visualLines = summary
    .split('\n')
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 90)), 0)
  return Math.min(14, Math.max(8, visualLines))
}

function formatTaskDueDate(value: string): string {
  if (!value) return 'Select a date'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Select a date'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function TaskInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
      <span className="typo-caption text-muted-foreground">{label}</span>
      <input
        className="input-glass body-3 border-border rounded-spacing-2 h-spacing-9 px-spacing-3 border"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function updateFollowUp(
  setDraft: Dispatch<SetStateAction<MeetingPostCallReview>>,
  id: string,
  patch: Partial<MeetingPostCallReview['followUps'][number]>,
) {
  setDraft((current) => ({
    ...current,
    followUps: current.followUps.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }))
}
