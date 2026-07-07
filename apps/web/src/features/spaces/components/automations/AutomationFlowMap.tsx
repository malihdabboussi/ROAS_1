'use client'

import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowDown,
  Bot,
  Clock,
  GitBranch,
  Layers,
  MessageSquare,
  Plus,
  SquareKanban,
  Telescope,
  Trash2,
  UserPlus,
  Zap,
} from 'lucide-react'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import {
  getConnectedAppFlowProviderLabel,
  getConnectedAppFlowTriggerBySlug,
} from '@/lib/flows/connected-app-flow-triggers'
import { cn } from '@/lib/utils/cn'
import type { AutomationAction, AutomationTrigger, FieldDef } from '../../types/space-schema'

export type FlowSelection = { kind: 'trigger' } | { kind: 'action'; index: number }

/** Action types after which `after_task_completes` actually pauses the engine.
 * The resume hook (`apps/api/src/modules/spaces/controllers/space-automations-internal.controller.ts`)
 * fires only on task status transitions, so the toggle is only meaningful after actions
 * whose completion can fire `done` / `failed`. */
const ACTIONS_SUPPORTING_CONTINUATION_WAIT: ReadonlySet<AutomationAction['type']> = new Set([
  'send_to_agent',
  'send_to_agents',
])

function actionSupportsContinuationWait(action: AutomationAction): boolean {
  return ACTIONS_SUPPORTING_CONTINUATION_WAIT.has(action.type)
}

interface AutomationFlowMapProps {
  trigger: AutomationTrigger
  actions: AutomationAction[]
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  selected: FlowSelection
  onSelect: (next: FlowSelection) => void
  /** Insert a new (empty) action at this index. `actions.length` appends at the end. */
  onAddAt: (index: number) => void
  /** Remove the action at this index. */
  onRemoveAction: (index: number) => void
  /** Toggle the `continuation` flag on the action at `index`. Used by the between-steps toggle. */
  onToggleContinuation: (index: number) => void
  triggerError: string | null
  /** One entry per action, aligned by index. `null` = step is OK. */
  actionErrors: (string | null)[]
  /** Preview mode: hide add/delete controls (Loop build panel). */
  readOnly?: boolean
}

function statusLabel(fields: FieldDef[], id: string): string {
  if (!id) return '…'
  const opt = fields.find((f) => f.id === 'status')?.options?.find((o) => o.id === id)
  return opt?.label ?? id
}

function fieldName(fields: FieldDef[], id: string): string {
  if (!id) return '…'
  return fields.find((f) => f.id === id)?.name ?? id
}

function priorityLabel(fields: FieldDef[], id: string): string {
  if (!id) return 'Any priority'
  const opt = fields.find((f) => f.id === 'priority')?.options?.find((o) => o.id === id)
  return opt?.label ?? id
}

function emailProviderLabel(toolSlug?: string): string {
  if (toolSlug?.startsWith('OUTLOOK')) return 'Outlook'
  if (toolSlug?.startsWith('GMAIL')) return 'Gmail'
  return 'Email'
}

function assigneeLabel(roster: TeamRosterEntry[], type: 'human' | 'agent', id: string): string {
  if (!id) return '…'
  if (type === 'agent') {
    return roster.find((r) => r.kind === 'agent' && r.agent_key === id)?.display_name ?? id
  }
  return roster.find((r) => r.kind === 'human' && r.user_id === id)?.display_name ?? id
}

function scopePrefix(scope?: 'tasks' | 'subtasks' | 'all'): string {
  if (scope === 'subtasks') return 'Subtask · '
  if (scope === 'all') return 'Any task · '
  return 'Task · '
}

function triggerSummary(
  trigger: AutomationTrigger,
  fields: FieldDef[],
  roster: TeamRosterEntry[],
): { title: string; detail: string } {
  switch (trigger.type) {
    case 'status_change': {
      const from = trigger.from ? statusLabel(fields, trigger.from) : 'Any status'
      const to = statusLabel(fields, trigger.to)
      return {
        title: `${scopePrefix(trigger.task_scope)}Status changes`,
        detail: `${from} → ${to}`,
      }
    }
    case 'task_created': {
      const st = trigger.in_status ? statusLabel(fields, trigger.in_status) : null
      return {
        title: `${scopePrefix(trigger.task_scope)}Task created`,
        detail: st ? `Initial status: ${st}` : 'Any initial status',
      }
    }
    case 'mission_completed':
      return {
        title: `${scopePrefix(trigger.task_scope)}Agent completes`,
        detail: 'Linked mission succeeds',
      }
    case 'mission_failed':
      return {
        title: `${scopePrefix(trigger.task_scope)}Agent fails`,
        detail: 'Linked mission errors',
      }
    case 'field_changed': {
      const fn = fieldName(fields, trigger.field_id)
      const f = fields.find((fl) => fl.id === trigger.field_id)
      const toLabel =
        trigger.to && f?.options?.length
          ? (f.options.find((o) => o.id === trigger.to)?.label ?? trigger.to)
          : trigger.to
      const tv = toLabel ? ` → ${toLabel}` : ''
      return {
        title: `${scopePrefix(trigger.task_scope)}Field changes`,
        detail: `${fn}${tv}`,
      }
    }
    case 'priority_changed': {
      const from = trigger.from ? priorityLabel(fields, trigger.from) : 'Any priority'
      const to = trigger.to ? priorityLabel(fields, trigger.to) : 'Any priority'
      return {
        title: `${scopePrefix(trigger.task_scope)}Priority changes`,
        detail: `${from} → ${to}`,
      }
    }
    case 'assignee_changed': {
      const title = `${scopePrefix(trigger.task_scope)}Assignee changes`
      if (trigger.assignee_type === 'unassigned') {
        return { title, detail: 'Becomes unassigned' }
      }
      if (trigger.assignee_type === 'human' || trigger.assignee_type === 'agent') {
        const assignee = trigger.assignee_id
          ? assigneeLabel(roster, trigger.assignee_type, trigger.assignee_id)
          : trigger.assignee_type === 'agent'
            ? 'Any agent'
            : 'Any person'
        return { title, detail: assignee }
      }
      return { title, detail: 'Any assignee' }
    }
    case 'due_date_changed': {
      const from = trigger.from || 'Any'
      const to = trigger.to || 'Any'
      return {
        title: `${scopePrefix(trigger.task_scope)}Due date changes`,
        detail: `${from} → ${to}`,
      }
    }
    case 'start_date_changed': {
      const from = trigger.from || 'Any'
      const to = trigger.to || 'Any'
      return {
        title: `${scopePrefix(trigger.task_scope)}Start date changes`,
        detail: `${from} → ${to}`,
      }
    }
    case 'tag_added': {
      const tagsField = fields.find((f) => f.id === 'tags')
      const tagLabel = trigger.tag
        ? (tagsField?.options?.find((o) => o.id === trigger.tag)?.label ?? trigger.tag)
        : 'Any tag'
      return {
        title: `${scopePrefix(trigger.task_scope)}Tag added`,
        detail: tagLabel,
      }
    }
    case 'tag_removed': {
      const tagsField = fields.find((f) => f.id === 'tags')
      const tagLabel = trigger.tag
        ? (tagsField?.options?.find((o) => o.id === trigger.tag)?.label ?? trigger.tag)
        : 'Any tag'
      return {
        title: `${scopePrefix(trigger.task_scope)}Tag removed`,
        detail: tagLabel,
      }
    }
    case 'form_submitted':
      return { title: 'Form submitted', detail: trigger.form_id || '…' }
    case 'contact_created':
      return { title: 'Contact created', detail: 'Any contact' }
    case 'contact_updated':
      return { title: 'Contact updated', detail: trigger.field_id || 'Any field' }
    case 'contact_tag_added':
      return { title: 'Contact tag added', detail: trigger.tag || 'Any tag' }
    case 'contact_tag_removed':
      return { title: 'Contact tag removed', detail: trigger.tag || 'Any tag' }
    case 'contact_type_changed':
      return { title: 'Contact type changed', detail: trigger.to || 'Any type' }
    case 'contact_source_changed':
      return { title: 'Contact source changed', detail: trigger.to || 'Any source' }
    case 'artifact_lifecycle':
      return {
        title: 'Artifact lifecycle',
        detail: [trigger.artifact_kind || 'Any artifact', trigger.lifecycle_event || '…']
          .filter(Boolean)
          .join(' · '),
      }
    case 'external_email_received': {
      const provider = trigger.provider === 'outlook' ? 'Outlook' : 'Gmail'
      const filters = [
        trigger.from_contains ? `from contains "${trigger.from_contains}"` : null,
        trigger.subject_contains ? `subject contains "${trigger.subject_contains}"` : null,
      ].filter(Boolean)
      return {
        title: `${provider} email received`,
        detail: filters.length ? filters.join(' · ') : 'Any inbound email',
      }
    }
    case 'external_slack_message_received': {
      const filters = [
        trigger.channel_id ? `channel ${trigger.channel_id}` : null,
        trigger.text_contains ? `text contains "${trigger.text_contains}"` : null,
      ].filter(Boolean)
      return {
        title: 'Slack message received',
        detail: filters.length ? filters.join(' · ') : 'Any Slack message',
      }
    }
    case 'external_fathom_recording_ready': {
      const filters = [
        trigger.title_contains ? `title contains "${trigger.title_contains}"` : null,
        trigger.recorded_by_contains
          ? `recorded by contains "${trigger.recorded_by_contains}"`
          : null,
      ].filter(Boolean)
      return {
        title: 'Fathom recording ready',
        detail: filters.length ? filters.join(' · ') : 'Any completed recording',
      }
    }
    case 'external_app_event': {
      const meta = trigger.trigger_slug
        ? getConnectedAppFlowTriggerBySlug(trigger.trigger_slug)
        : null
      const providerLabel =
        meta?.providerLabel ??
        (trigger.provider ? getConnectedAppFlowProviderLabel(trigger.provider) : 'Connected app')
      const eventLabel = meta?.eventLabel ?? trigger.trigger_slug ?? '…'
      return {
        title: `${providerLabel} event`,
        detail: eventLabel,
      }
    }
    default:
      return { title: 'When', detail: '—' }
  }
}

function actionSummary(
  action: AutomationAction,
  fields: FieldDef[],
  roster: TeamRosterEntry[],
  index: number,
): { icon: LucideIcon; title: string; detail: string } {
  switch (action.type) {
    case 'create_task':
      return {
        icon: SquareKanban,
        title: `Step ${index + 1}: Create task`,
        detail: action.title_template ? 'Task from trigger' : '…',
      }
    case 'send_to_agent': {
      const name = assigneeLabel(roster, 'agent', action.agent_key)
      return {
        icon: Bot,
        title: `Step ${index + 1}: Run Task`,
        detail: action.extended_brain_knowledge ? `${name} · extended brain knowledge` : name,
      }
    }
    case 'send_to_agents': {
      const agentNames = action.agent_tasks
        .map((task) => assigneeLabel(roster, 'agent', task.agent_key))
        .filter(Boolean)
      return {
        icon: Bot,
        title: `Step ${index + 1}: Run Agents`,
        detail: [
          agentNames.length > 0 ? agentNames.join(', ') : 'Select agents',
          action.agent_collaboration === 'disabled' ? 'no agent collaboration' : null,
          action.extended_brain_knowledge ? 'extended brain knowledge' : null,
        ]
          .filter(Boolean)
          .join(' · '),
      }
    }
    case 'add_brain_context_to_task':
      return {
        icon: Bot,
        title: `Step ${index + 1}: Add brain context`,
        detail: 'Atlas appends relevant brain knowledge',
      }
    case 'agent_suggest_tasks': {
      const name = assigneeLabel(roster, 'agent', action.agent_key ?? 'vibey')
      return {
        icon: Bot,
        title: `Step ${index + 1}: Suggest tasks`,
        detail: `${name} · up to ${action.max_suggestions ?? 10}${
          action.extended_brain_knowledge ? ' · extended brain knowledge' : ''
        }`,
      }
    }
    case 'assign_to': {
      const assignees = action.assignees?.length
        ? action.assignees
        : action.assignee_type && action.assignee_id
          ? [{ type: action.assignee_type, id: action.assignee_id }]
          : []
      const names = assignees.map((assignee) => assigneeLabel(roster, assignee.type, assignee.id))
      return {
        icon: UserPlus,
        title: `Step ${index + 1}: Assign`,
        detail: names.length > 0 ? names.join(', ') : 'Select assignees',
      }
    }
    case 'change_status':
      return {
        icon: SquareKanban,
        title: `Step ${index + 1}: Status`,
        detail: statusLabel(fields, action.status),
      }
    case 'change_priority':
      return {
        icon: SquareKanban,
        title: `Step ${index + 1}: Priority`,
        detail: action.priority ? priorityLabel(fields, action.priority) : '…',
      }
    case 'add_comment':
      return {
        icon: MessageSquare,
        title: `Step ${index + 1}: Comment`,
        detail: action.message_template ? 'Message with @ tokens' : '…',
      }
    case 'send_email':
      return {
        icon: MessageSquare,
        title: `Step ${index + 1}: Email`,
        detail: [
          emailProviderLabel(action.tool_slug),
          action.subject_source === 'artifact' ? 'From email artifact' : 'Manual content',
          action.to || '…',
        ].join(' · '),
      }
    case 'send_slack_message':
      return {
        icon: MessageSquare,
        title: `Step ${index + 1}: Slack`,
        detail: action.channel_id || '…',
      }
    case 'send_channel_message':
      return {
        icon: MessageSquare,
        title: `Step ${index + 1}: Channel`,
        detail: action.channel_id || '…',
      }
    case 'create_contact':
      return {
        icon: UserPlus,
        title: `Step ${index + 1}: Contact`,
        detail: action.email_template ? 'Create contact' : '…',
      }
    case 'update_contact_field':
      return {
        icon: UserPlus,
        title: `Step ${index + 1}: Contact field`,
        detail: action.field_id || '…',
      }
    case 'add_contact_tag':
    case 'remove_contact_tag':
      return {
        icon: UserPlus,
        title: `Step ${index + 1}: Contact tag`,
        detail: action.tag || '…',
      }
    case 'attach_note_to_contact':
      return {
        icon: MessageSquare,
        title: `Step ${index + 1}: Contact note`,
        detail: action.content_template ? 'Note template' : '…',
      }
    case 'link_item_to_contact':
      return {
        icon: UserPlus,
        title: `Step ${index + 1}: Link contact`,
        detail: action.contact_id || '…',
      }
    case 'create_artifact':
      return {
        icon: Layers,
        title: `Step ${index + 1}: Create artifact`,
        detail: action.artifact_kind || '…',
      }
    case 'publish_artifact':
    case 'unpublish_artifact':
      return {
        icon: Layers,
        title: `Step ${index + 1}: Artifact status`,
        detail: `${action.artifact_kind || '…'} · ${action.artifact_id || '…'}`,
      }
    case 'ask_agent_to_improve_artifact':
      return {
        icon: Bot,
        title: `Step ${index + 1}: Improve artifact`,
        detail: `${action.artifact_kind || '…'} · ${action.agent_key || '…'}`,
      }
    case 'attach_artifact_to_item':
      return {
        icon: Layers,
        title: `Step ${index + 1}: Attach artifact`,
        detail: `${action.artifact_kind || '…'} · ${action.artifact_id || '…'}`,
      }
    case 'create_subtask':
      return {
        icon: GitBranch,
        title: `Step ${index + 1}: Subtask`,
        detail: action.title_template ? 'Title template' : '…',
      }
    case 'sync_social_research':
      return {
        icon: Telescope,
        title: `Step ${index + 1}: Sync social research`,
        detail:
          action.sync_mode === 'resync_30d'
            ? `Re-sync 30d · ${action.platform ?? 'all'}`
            : `Use existing · ${action.platform ?? 'all'}`,
      }
    case 'select_social_outliers':
      return {
        icon: Telescope,
        title: `Step ${index + 1}: Find top outliers`,
        detail: `${action.min_outlier_score ?? 2}x+ · limit ${action.limit ?? 10}`,
      }
    case 'enrich_social_research_items':
      return {
        icon: Telescope,
        title: `Step ${index + 1}: Extract hook/transcript`,
        detail: (action.enrichments ?? []).join(', ') || '…',
      }
    case 'ingest_youtube_channel_to_agent_brain': {
      const agentLabel = action.agent_key?.trim()
        ? assigneeLabel(roster, 'agent', action.agent_key)
        : null
      return {
        icon: Telescope,
        title: `Step ${index + 1}: Train agent brain`,
        detail: [
          agentLabel,
          `${action.channel_urls?.filter(Boolean).length ?? 0} channels`,
          `${action.since_days ?? 7}d`,
        ]
          .filter(Boolean)
          .join(' · '),
      }
    }
    case 'choose_action':
      return {
        icon: Layers,
        title: `Step ${index + 1}`,
        detail: 'Choose an action…',
      }
    default:
      return { icon: Layers, title: `Step ${index + 1}`, detail: '—' }
  }
}

function ErrorBadge({ message, className }: { message: string; className?: string }) {
  return (
    <span
      title={message}
      className={cn('badge-glass badge-glass-sm badge-glass-orange gap-spacing-1', className)}
    >
      <AlertTriangle className="h-3 w-3" />
      <span className="hidden sm:inline">Needs setup</span>
    </span>
  )
}

interface ContinuationControl {
  isWait: boolean
  onToggle: () => void
}

function ContinuationToggle({ control }: { control: ContinuationControl }) {
  const { isWait, onToggle } = control
  return (
    <button
      type="button"
      onClick={onToggle}
      title={
        isWait
          ? 'Wait until completed — click to run right after'
          : 'Right after — click to wait until completed'
      }
      className={cn(
        'px-spacing-3 py-spacing-1 gap-spacing-1 typo-caption flex items-center rounded-full transition-colors',
        isWait
          ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
          : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle',
      )}
    >
      {isWait ? (
        <>
          <Clock className="h-3 w-3" />
          <span className="font-medium">Wait until completed</span>
        </>
      ) : (
        <>
          <ArrowDown className="h-3 w-3 opacity-50" />
          <span>Right after</span>
        </>
      )}
    </button>
  )
}

function AddStepChip({
  targetIndex,
  onAddAt,
  className,
}: {
  targetIndex: number
  onAddAt: (index: number) => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onAddAt(targetIndex)}
      title="Add step"
      aria-label={`Add step at position ${targetIndex + 1}`}
      className={cn(
        'px-spacing-3 py-spacing-1 gap-spacing-1 rounded-spacing-2 typo-caption inline-flex items-center border border-dashed border-[var(--color-border)] bg-[var(--background)] text-[var(--color-muted-foreground)] shadow-sm transition-all duration-200',
        'hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]',
        className,
      )}
    >
      <Plus className="h-3 w-3" />
      Add step
    </button>
  )
}

function InsertSlot({
  targetIndex,
  variant,
  onAddAt,
  continuation,
}: {
  targetIndex: number
  /** `hover` = arrow/toggle shown by default, Add step chip on hover. `always` = Add step chip always visible. */
  variant: 'hover' | 'always'
  onAddAt: (index: number) => void
  /** When provided, the slot also exposes a continuation toggle (Right after / Wait until completed). */
  continuation?: ContinuationControl
}) {
  if (variant === 'always') {
    return (
      <div className="py-spacing-3 flex w-full items-center justify-center">
        <AddStepChip targetIndex={targetIndex} onAddAt={onAddAt} />
      </div>
    )
  }

  if (continuation) {
    return (
      <div className="group/insert gap-spacing-1 py-spacing-2 relative flex w-full flex-col items-center">
        <ContinuationToggle control={continuation} />
        <AddStepChip
          targetIndex={targetIndex}
          onAddAt={onAddAt}
          className="-translate-y-1 opacity-0 group-hover/insert:translate-y-0 group-hover/insert:opacity-100"
        />
      </div>
    )
  }

  return (
    <div className="group/insert h-spacing-10 relative flex w-full items-center justify-center">
      <span
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center justify-center transition-all duration-200',
          'group-hover/insert:-translate-y-1 group-hover/insert:opacity-0',
        )}
      >
        <ArrowDown className="icon-sm text-muted-foreground shrink-0 opacity-50" />
      </span>
      <AddStepChip
        targetIndex={targetIndex}
        onAddAt={onAddAt}
        className="absolute -translate-y-1 opacity-0 group-hover/insert:translate-y-0 group-hover/insert:opacity-100"
      />
    </div>
  )
}

export function AutomationFlowMap({
  trigger,
  actions,
  fields,
  roster,
  selected,
  onSelect,
  onAddAt,
  onRemoveAction,
  onToggleContinuation,
  triggerError,
  actionErrors,
  readOnly = false,
}: AutomationFlowMapProps) {
  const when = triggerSummary(trigger, fields, roster)
  const triggerSelected = selected.kind === 'trigger'

  return (
    <div className="border-border bg-muted/15 rounded-spacing-4 flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border">
      <div className="border-border px-spacing-4 py-spacing-3 shrink-0 border-b">
        <div className="body-3 text-muted-foreground font-medium uppercase tracking-wider">
          Flow
        </div>
      </div>

      <div className="px-spacing-4 py-spacing-4 min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-stretch">
          <button
            type="button"
            onClick={() => onSelect({ kind: 'trigger' })}
            aria-pressed={triggerSelected}
            className={cn(
              'rounded-spacing-2 px-spacing-3 py-spacing-3 w-full text-left transition-all',
              triggerSelected
                ? 'card-glass-blue !rounded-spacing-2'
                : 'bg-background border-border hover:bg-hover-subtle border shadow-sm',
            )}
          >
            <div className="text-muted-foreground mb-spacing-1 gap-spacing-2 flex items-center">
              <span className="bg-primary/15 text-primary flex h-7 w-7 items-center justify-center rounded-full">
                <Zap className="icon-sm" />
              </span>
              <span className="typo-caption font-semibold uppercase tracking-wide">When</span>
              {triggerError ? (
                <span className="ml-auto">
                  <ErrorBadge message={triggerError} />
                </span>
              ) : null}
            </div>
            <p className="body-3 text-foreground font-medium">{when.title}</p>
            <p className="typo-caption text-muted-foreground mt-spacing-1 line-clamp-3">
              {when.detail}
            </p>
          </button>

          {readOnly ? (
            actions.length === 0 ? (
              <div className="h-spacing-10 flex w-full items-center justify-center">
                <ArrowDown className="icon-sm text-muted-foreground shrink-0 opacity-50" />
              </div>
            ) : null
          ) : (
            <InsertSlot
              targetIndex={0}
              variant={actions.length === 0 ? 'always' : 'hover'}
              onAddAt={onAddAt}
            />
          )}

          {actions.map((action, i) => {
            const { icon: Icon, title, detail } = actionSummary(action, fields, roster, i)
            const isSelected = selected.kind === 'action' && selected.index === i
            const stepError = actionErrors[i] ?? null
            const continuation = (action as Record<string, unknown>).continuation as
              | string
              | undefined
            const nextIsWait = continuation === 'after_task_completes'
            const isLast = i === actions.length - 1
            const supportsWait = actionSupportsContinuationWait(action)
            return (
              <div key={i} className="flex flex-col items-stretch">
                <div className="group/card relative">
                  <button
                    type="button"
                    onClick={() => onSelect({ kind: 'action', index: i })}
                    aria-pressed={isSelected}
                    className={cn(
                      'rounded-spacing-2 px-spacing-3 py-spacing-3 w-full text-left transition-all',
                      isSelected
                        ? 'card-glass-blue !rounded-spacing-2'
                        : 'bg-background border-border hover:bg-hover-subtle border shadow-sm',
                    )}
                  >
                    <div className="text-muted-foreground mb-spacing-1 gap-spacing-2 flex items-center">
                      <span className="bg-muted flex h-7 w-7 items-center justify-center rounded-full">
                        <Icon className="icon-sm" />
                      </span>
                      <span className="typo-caption font-semibold uppercase tracking-wide">
                        Then
                      </span>
                    </div>
                    <p className="body-3 text-foreground font-medium">{title}</p>
                    <p
                      className="typo-caption text-muted-foreground mt-spacing-1 truncate"
                      title={detail}
                    >
                      {detail}
                    </p>
                  </button>

                  {stepError ? (
                    <ErrorBadge
                      message={stepError}
                      className="top-spacing-3 right-spacing-3 pointer-events-none !absolute z-10 transition-opacity duration-200 group-hover/card:opacity-0"
                    />
                  ) : null}
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveAction(i)
                      }}
                      title="Delete step"
                      aria-label={`Delete step ${i + 1}`}
                      className="top-spacing-3 right-spacing-3 text-muted-foreground hover:text-destructive hover:bg-hover-subtle absolute z-20 translate-x-2 rounded-md p-1 opacity-0 transition-all duration-200 group-hover/card:translate-x-0 group-hover/card:opacity-100"
                    >
                      <Trash2 className="icon-sm" />
                    </button>
                  ) : null}
                </div>

                {readOnly ? (
                  !isLast ? (
                    <div className="h-spacing-10 flex w-full items-center justify-center">
                      <ArrowDown className="icon-sm text-muted-foreground shrink-0 opacity-50" />
                    </div>
                  ) : null
                ) : (
                  <InsertSlot
                    targetIndex={i + 1}
                    variant={isLast ? 'always' : 'hover'}
                    onAddAt={onAddAt}
                    continuation={
                      isLast || !supportsWait
                        ? undefined
                        : { isWait: nextIsWait, onToggle: () => onToggleContinuation(i) }
                    }
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
