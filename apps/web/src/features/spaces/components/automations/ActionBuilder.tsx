'use client'

import { useMemo, type ReactNode } from 'react'
import { ArrowDown, ChevronDown, Clock, Info, Plus, Trash2, UserPlus } from 'lucide-react'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import { Tooltip } from '@/components/ui/tooltip'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import {
  searchAutomationArtifacts,
  searchAutomationChannels,
  searchAutomationComposioAccounts,
  searchAutomationContacts,
  searchCursorConnections,
  searchGitHubReposForAutomation,
} from '../../services/automations.service'
import type {
  AutomationAction,
  AutomationTrigger,
  FieldDef,
  SendToAgentOutputType,
} from '../../types/space-schema'
import {
  buildFlowBuilderActionStepOptions,
  buildFlowBuilderPriorActionStepOptions,
} from '@/lib/flows/flow-builder-step-index.utils'
import { SelectCell } from '../cells/SelectCell'
import { OptionDot } from '../OptionBadge'
import {
  ACTION_SECTIONS,
  contactReferenceOptions,
  contextsForTrigger,
  defaultAction,
  deriveContextsAfterActions,
  sectionsForAvailableContexts,
  stepTemplateVars,
  triggerTemplateVars,
} from './automation-catalog'
import { buildAutomationStatusSections } from './automation-status-sections'
import { AutomationToggleChip } from './automation-toggle-chip'
import { AutomationCategorizedSelect } from './AutomationCategorizedSelect'
import { AutomationContactFieldsEditor } from './AutomationContactFieldsEditor'
import { AutomationLazySelect } from './AutomationLazySelect'
import { AutomationRosterSelect } from './AutomationRosterSelect'
import { AutomationTaskFieldsEditor } from './AutomationTaskFieldsEditor'
import { PromptTemplateEditor } from './PromptTemplateEditor'

interface ActionBuilderProps {
  actions: AutomationAction[]
  trigger: AutomationTrigger
  onChange: (actions: AutomationAction[]) => void
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  campaignId: string | null
  /** When set, only that one step's editor body renders and the bottom “Add action” CTA is hidden. */
  singleStepIndex?: number
  /** Hide the action type picker (shown in flow builder Setup phase). */
  hideTypeSelect?: boolean
}

const ARTIFACT_KIND_OPTIONS: AutomationSolidOption[] = [
  { value: 'funnel', label: 'Funnel' },
  { value: 'website', label: 'Website' },
  { value: 'form', label: 'Form' },
  { value: 'email', label: 'Email' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'social_post', label: 'Social post' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'ad', label: 'Ad' },
  { value: 'offer', label: 'Offer' },
  { value: 'avatar', label: 'Avatar' },
]

const CONTACT_FIELD_OPTIONS: AutomationSolidOption[] = [
  { value: 'email', label: 'Email' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'phone', label: 'Phone' },
  { value: 'business_name', label: 'Business name' },
  { value: 'website', label: 'Website' },
  { value: 'contact_type', label: 'Contact type' },
  { value: 'contact_source', label: 'Contact source' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'country', label: 'Country' },
]

const EMAIL_TOOL_OPTIONS: AutomationSolidOption[] = [
  { value: 'GMAIL_SEND_EMAIL', label: 'Gmail' },
  { value: 'OUTLOOK_SEND_EMAIL', label: 'Outlook' },
]

const AGENT_OUTPUT_OPTIONS: AutomationSolidOption[] = [
  { value: 'none', label: 'None' },
  { value: 'email_artifact', label: 'Email artifact' },
  { value: 'document_artifact', label: 'Document' },
  { value: 'pdf_artifact', label: 'PDF' },
  { value: 'funnel_artifact', label: 'Funnel' },
  { value: 'website_artifact', label: 'Website' },
  { value: 'sequence_artifact', label: 'Email sequence' },
  { value: 'social_post_artifact', label: 'Social post' },
  { value: 'presentation_artifact', label: 'Presentation' },
  { value: 'ad_artifact', label: 'Ad' },
  { value: 'offer_artifact', label: 'Offer' },
  { value: 'avatar_artifact', label: 'Avatar' },
  { value: 'blog_post_artifact', label: 'Blog post' },
]

const EMAIL_CONTENT_SOURCE_OPTIONS: AutomationSolidOption[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'artifact', label: 'From email artifact' },
]

const SOCIAL_RESEARCH_PLATFORM_OPTIONS: AutomationSolidOption[] = [
  { value: 'all', label: 'Instagram + TikTok + YouTube + X' },
  { value: 'both', label: 'Instagram + TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X' },
]

const SOCIAL_RESEARCH_SYNC_MODE_OPTIONS: AutomationSolidOption[] = [
  { value: 'use_existing', label: 'Use existing data' },
  { value: 'resync_30d', label: 'Re-sync last 30 days' },
]

const SOCIAL_RESEARCH_OUTLIER_OPTIONS: AutomationSolidOption[] = [
  { value: '2', label: '2x+' },
  { value: '5', label: '5x+' },
  { value: '10', label: '10x+' },
]

const SOCIAL_RESEARCH_ENRICHMENT_OPTIONS: AutomationSolidOption[] = [
  { value: 'caption', label: 'Caption' },
  { value: 'hook', label: 'Hook' },
  { value: 'transcript', label: 'Transcript' },
]

const BRAIN_IMPORT_DOMAIN_OPTIONS: AutomationSolidOption[] = [
  { value: 'strategy', label: 'Strategy' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'creative', label: 'Creative' },
  { value: 'general', label: 'General' },
]

const TASK_TARGET_ACTIONS = new Set<AutomationAction['type']>([
  'send_to_agent',
  'send_to_agents',
  'send_to_cursor',
  'add_brain_context_to_task',
  'assign_to',
  'change_status',
  'change_priority',
  'add_comment',
  'human_gate',
  'create_subtask',
  'attach_artifact_to_item',
])

function statusFieldDef(fields: FieldDef[]): FieldDef {
  return (
    fields.find((f) => f.id === 'status') ?? {
      id: 'status',
      name: 'Status',
      type: 'select',
      options: [],
    }
  )
}

function priorityFieldDef(fields: FieldDef[]): FieldDef {
  return (
    fields.find((f) => f.id === 'priority') ?? {
      id: 'priority',
      name: 'Priority',
      type: 'select',
      options: [
        { id: 'low', label: 'Low', color: 'slate' },
        { id: 'medium', label: 'Medium', color: 'blue' },
        { id: 'high', label: 'High', color: 'orange' },
        { id: 'urgent', label: 'Urgent', color: 'red' },
      ],
    }
  )
}

function AutomationFieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-spacing-1">
      <div className="typo-caption text-muted-foreground font-medium">{label}</div>
      {children}
    </div>
  )
}

function agentDisplayName(roster: TeamRosterEntry[], agentKey?: string | null): string {
  if (!agentKey?.trim()) return 'the selected agent'
  return (
    roster.find((entry) => entry.kind === 'agent' && entry.agent_key === agentKey)?.display_name ??
    'the selected agent'
  )
}

function statusTrigger(
  selected: { id: string; label: string; color?: string } | null,
  placeholder: string,
) {
  return (
    <span className="body-3 h-spacing-10 gap-spacing-2 rounded-spacing-2 border-border bg-background px-spacing-3 hover:bg-hover-subtle flex min-w-0 flex-1 items-center border text-left transition-colors">
      {selected ? (
        <>
          <OptionDot color={selected.color} size="sm" />
          <span className="text-foreground truncate">{selected.label}</span>
        </>
      ) : (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
      <ChevronDown className="icon-sm text-muted-foreground ml-auto shrink-0 opacity-60" />
    </span>
  )
}

export function ActionBuilder({
  actions,
  trigger,
  onChange,
  fields,
  roster,
  campaignId,
  singleStepIndex,
  hideTypeSelect = false,
}: ActionBuilderProps) {
  const isSingle = typeof singleStepIndex === 'number'
  const statusField = useMemo(() => statusFieldDef(fields), [fields])
  const priorityField = useMemo(() => priorityFieldDef(fields), [fields])
  const statusOptions = statusField.options ?? []
  const priorityOptions = priorityField.options ?? []

  const automationStatusSections = useMemo(
    () => buildAutomationStatusSections(statusOptions),
    [statusOptions],
  )

  const defaultStatusLeadingOptions = useMemo(() => [{ value: '', label: 'Default status' }], [])

  const addAction = () => {
    onChange([...actions, { type: 'choose_action' }])
  }

  const updateAction = (idx: number, patch: Partial<AutomationAction>) => {
    const next = actions.map((a, i) => (i === idx ? ({ ...a, ...patch } as AutomationAction) : a))
    onChange(next)
  }

  const removeAction = (idx: number) => {
    onChange(actions.filter((_, i) => i !== idx))
  }

  const loadContacts = async ({
    search,
    offset,
    limit,
  }: {
    search: string
    offset: number
    limit: number
  }) => {
    const result = await searchAutomationContacts({ search, offset, limit })
    return {
      options: result.options.map((contact) => ({
        value: contact.id,
        label: contact.label,
        description: contact.description,
      })),
      hasMore: result.hasMore,
    }
  }

  const loadChannels = async ({
    search,
    offset,
    limit,
  }: {
    search: string
    offset: number
    limit: number
  }) => {
    const result = await searchAutomationChannels({ search, offset, limit })
    return {
      options: result.options.map((channel) => ({
        value: channel.id,
        label: channel.label,
        description: channel.description,
      })),
      hasMore: result.hasMore,
    }
  }

  const loadArtifacts =
    (kind: string | null | undefined) =>
    async ({ search, offset, limit }: { search: string; offset: number; limit: number }) => {
      const result = await searchAutomationArtifacts({ campaignId, kind, search, offset, limit })
      return {
        options: result.options.map((artifact) => ({
          value: artifact.id,
          label: artifact.label,
          description: artifact.description,
        })),
        hasMore: result.hasMore,
      }
    }

  const emailToolkitForTool = (toolSlug?: string | null) => {
    if (toolSlug?.startsWith('OUTLOOK')) return 'outlook'
    return 'gmail'
  }

  const triggerHasTask = contextsForTrigger(trigger).has('task')
  const connectedAppTrigger =
    trigger.type === 'external_email_received' ||
    trigger.type === 'external_slack_message_received' ||
    trigger.type === 'external_app_event'

  const taskTargetOptions = (beforeIndex: number): AutomationSolidOption[] => {
    const options: AutomationSolidOption[] = []
    if (triggerHasTask) {
      options.push({ value: '', label: 'Current task' })
      options.push({ value: 'trigger', label: 'Trigger task' })
    }
    for (let i = 0; i < beforeIndex; i++) {
      if (actions[i]?.type === 'create_task') {
        options.push({ value: `{{steps.${i + 1}.item_id}}`, label: `Task from step ${i + 1}` })
      }
    }
    return options
  }

  return (
    <div className="space-y-0">
      {connectedAppTrigger ? (
        <p className="typo-caption text-muted-foreground mb-spacing-3">
          Incoming messages are not added to your task list until you include a Create task step.
        </p>
      ) : null}
      {actions.map((action, idx) => {
        if (isSingle && idx !== singleStepIndex) return null
        const changePrioritySelected =
          action.type === 'change_priority'
            ? (priorityOptions.find((p) => p.id === action.priority) ?? null)
            : null

        const typeSelectValue = action.type === 'choose_action' ? '' : action.type
        const availableContexts = deriveContextsAfterActions(trigger, actions, idx)
        const actionSections = sectionsForAvailableContexts(ACTION_SECTIONS, availableContexts)
        const targetOptions = taskTargetOptions(idx)
        const showTaskTarget =
          TASK_TARGET_ACTIONS.has(action.type) &&
          (triggerHasTask ? targetOptions.length > 2 : targetOptions.length > 0)
        const templateVars = [...triggerTemplateVars(trigger), ...stepTemplateVars(actions, idx)]
        const templateStepContext = { trigger, actions, beforeIndex: idx }
        const includeTaskVars = availableContexts.has('task')
        const contactOptions = contactReferenceOptions(trigger, actions, idx)
        const showContinuation = idx < actions.length - 1
        const canWaitForCompletion =
          action.type === 'send_to_agent' ||
          action.type === 'send_to_agents' ||
          action.type === 'send_to_cursor'
        const continuation = (action as Record<string, unknown>).continuation as string | undefined
        const isWait = continuation === 'after_task_completes'
        const assigneeValue =
          action.type === 'assign_to' ||
          action.type === 'create_task' ||
          action.type === 'human_gate'
            ? action.assignees?.length
              ? action.assignees
              : (action.assignee_type === 'human' || action.assignee_type === 'agent') &&
                  action.assignee_id
                ? [{ type: action.assignee_type, id: action.assignee_id }]
                : []
            : []
        const priorStepOptions: AutomationSolidOption[] = buildFlowBuilderPriorActionStepOptions(
          actions,
          idx,
        )
        const allStepOptions: AutomationSolidOption[] = buildFlowBuilderActionStepOptions(actions)
        const branchFieldOptions: AutomationSolidOption[] = fields
          .filter((field) => field.id === 'status' || field.id === 'priority' || !field.system)
          .map((field) => ({ value: field.id, label: field.name }))

        return (
          <div key={idx}>
            <div className="space-y-spacing-3 rounded-spacing-2 bg-muted/10 p-spacing-3">
              {!isSingle && (
                <div className="typo-caption text-muted-foreground font-semibold uppercase tracking-wide">
                  Step {idx + 1}
                </div>
              )}
              {!hideTypeSelect ? (
              <div className="gap-spacing-2 flex items-center">
                <div className="flex-1">
                  <AutomationCategorizedSelect
                    sections={actionSections}
                    value={typeSelectValue}
                    onChange={(type) => {
                      const newAction = defaultAction(type)
                      if (newAction) {
                        if (newAction.type === 'create_contact') {
                          if (trigger.type === 'external_email_received') {
                            newAction.email_template = '{{trigger.email}}'
                            newAction.name_template = '{{trigger.name}}'
                          }
                          if (trigger.type === 'form_submitted') {
                            newAction.email_template = '{{trigger.answers.email}}'
                            newAction.name_template = '{{trigger.answers.name}}'
                          }
                        }
                        if (newAction.type === 'create_task') {
                          if (trigger.type === 'external_email_received') {
                            newAction.title_template = '{{trigger.subject}}'
                            newAction.notes_template =
                              'From: {{trigger.from}}\nCC: {{trigger.cc}}\n\n{{trigger.body}}'
                          }
                          if (trigger.type === 'external_slack_message_received') {
                            newAction.title_template = '{{trigger.text}}'
                          }
                        }
                        const next = [...actions]
                        next[idx] = newAction
                        onChange(next)
                      }
                    }}
                    placeholder="Choose an Action"
                    searchPlaceholder="Search actions…"
                  />
                </div>
                {!isSingle && (
                  <button
                    type="button"
                    onClick={() => removeAction(idx)}
                    className="btn-icon-glass shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="icon-sm text-muted-foreground" />
                  </button>
                )}
              </div>
              ) : null}

              {showTaskTarget && (
                <AutomationFieldGroup label="Task target">
                  <AutomationSolidSelect
                    options={targetOptions}
                    value={(action as { target_item_ref?: string }).target_item_ref ?? ''}
                    onChange={(target_item_ref) =>
                      updateAction(idx, {
                        target_item_ref: target_item_ref || undefined,
                      } as Partial<AutomationAction>)
                    }
                    placeholder="Task target"
                  />
                </AutomationFieldGroup>
              )}

              {action.type === 'send_to_agent' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Agent">
                    <AutomationRosterSelect
                      roster={roster}
                      mode="agent"
                      value={action.agent_key}
                      onChange={(agent_key) =>
                        updateAction(idx, { agent_key } as Partial<AutomationAction>)
                      }
                      placeholder="Select agent"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Prompt">
                    <PromptTemplateEditor
                      value={action.prompt_template}
                      onChange={(v) =>
                        updateAction(idx, { prompt_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      tokenKind="message"
                    />
                  </AutomationFieldGroup>
                  <div className="rounded-spacing-2 border-border bg-background/60 px-spacing-3 py-spacing-2 flex items-center justify-between border">
                    <div className="gap-spacing-2 flex min-w-0 items-center">
                      <span className="body-3 text-foreground font-medium">
                        Agent Collaboration
                      </span>
                      <Tooltip
                        label="Allow this agent to ask, delegate, or brainstorm with other agents during this run."
                        side="top"
                        triggerClassName="inline-flex"
                      >
                        <span className="text-muted-foreground inline-flex">
                          <Info className="icon-xs" />
                        </span>
                      </Tooltip>
                    </div>
                    <input
                      type="checkbox"
                      checked={action.agent_collaboration !== 'disabled'}
                      onChange={(e) =>
                        updateAction(idx, {
                          agent_collaboration: e.target.checked ? 'allowed' : 'disabled',
                        } as Partial<AutomationAction>)
                      }
                      className="checkbox-glass-green shrink-0"
                    />
                  </div>
                  <div className="rounded-spacing-2 border-border bg-background/60 px-spacing-3 py-spacing-2 flex items-center justify-between border">
                    <div className="gap-spacing-2 flex min-w-0 items-center">
                      <span className="body-3 text-foreground font-medium">
                        Extended Brain Knowledge
                      </span>
                      <Tooltip
                        label={`Before running this task, ${agentDisplayName(roster, action.agent_key)} searches the User Brain, Company Cortex, Customer Brain, and this agent's Agent Brain when available, then injects the most relevant context into this one agent run.`}
                        side="top"
                        triggerClassName="inline-flex"
                      >
                        <span className="text-muted-foreground inline-flex">
                          <Info className="icon-xs" />
                        </span>
                      </Tooltip>
                    </div>
                    <input
                      type="checkbox"
                      checked={action.extended_brain_knowledge === true}
                      onChange={(e) =>
                        updateAction(idx, {
                          extended_brain_knowledge: e.target.checked,
                        } as Partial<AutomationAction>)
                      }
                      className="checkbox-glass-green shrink-0"
                    />
                  </div>
                  <AutomationFieldGroup label="Output">
                    <AutomationSolidSelect
                      options={AGENT_OUTPUT_OPTIONS}
                      value={action.output_type ?? 'none'}
                      onChange={(value) => {
                        const output_type = value as SendToAgentOutputType
                        updateAction(idx, {
                          output_type,
                          continuation:
                            output_type !== 'none' ? 'after_task_completes' : action.continuation,
                        } as Partial<AutomationAction>)
                      }}
                      placeholder="Output"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Set status when complete">
                    <AutomationCategorizedSelect
                      leadingOptions={[{ value: '', label: "Don't change status" }]}
                      sections={automationStatusSections}
                      value={action.completed_status ?? ''}
                      onChange={(status) =>
                        updateAction(idx, {
                          completed_status: status || undefined,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Don't change status"
                      searchPlaceholder="Search…"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'send_to_agents' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Shared prompt">
                    <PromptTemplateEditor
                      value={action.prompt_template}
                      onChange={(v) =>
                        updateAction(idx, { prompt_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      tokenKind="message"
                    />
                  </AutomationFieldGroup>
                  <div className="space-y-spacing-2">
                    {(action.agent_tasks ?? []).map((agentTask, agentIndex) => (
                      <div
                        key={agentIndex}
                        className="space-y-spacing-2 rounded-spacing-2 border-border bg-background/60 p-spacing-3 border"
                      >
                        <div className="gap-spacing-2 flex items-center">
                          <div className="min-w-0 flex-1">
                            <AutomationRosterSelect
                              roster={roster}
                              mode="agent"
                              value={agentTask.agent_key}
                              onChange={(agent_key) => {
                                const agent_tasks = [...(action.agent_tasks ?? [])]
                                agent_tasks[agentIndex] = { ...agentTask, agent_key }
                                updateAction(idx, { agent_tasks } as Partial<AutomationAction>)
                              }}
                              placeholder="Select agent"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const agent_tasks = (action.agent_tasks ?? []).filter(
                                (_, i) => i !== agentIndex,
                              )
                              updateAction(idx, { agent_tasks } as Partial<AutomationAction>)
                            }}
                            className="btn-icon-glass shrink-0"
                            title="Remove agent"
                          >
                            <Trash2 className="icon-sm text-muted-foreground" />
                          </button>
                        </div>
                        <PromptTemplateEditor
                          value={agentTask.prompt_template ?? ''}
                          onChange={(v) => {
                            const agent_tasks = [...(action.agent_tasks ?? [])]
                            agent_tasks[agentIndex] = {
                              ...agentTask,
                              prompt_template: v || undefined,
                            }
                            updateAction(idx, { agent_tasks } as Partial<AutomationAction>)
                          }}
                          fields={fields}
                          extraVars={templateVars}
                          includeSystemVars={includeTaskVars}
                          stepContext={templateStepContext}
                          placeholder="Optional agent-specific prompt..."
                          tokenKind="message"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const agent_tasks = [...(action.agent_tasks ?? []), { agent_key: '' }]
                        updateAction(idx, { agent_tasks } as Partial<AutomationAction>)
                      }}
                      className="body-3 text-muted-foreground hover:text-foreground gap-spacing-2 rounded-spacing-2 border-border px-spacing-3 py-spacing-2 hover:bg-hover-subtle flex w-full items-center justify-center border border-dashed transition-colors"
                    >
                      <Plus className="icon-sm" />
                      Add agent
                    </button>
                  </div>
                  <div className="rounded-spacing-2 border-border bg-background/60 px-spacing-3 py-spacing-2 flex items-center justify-between border">
                    <div className="gap-spacing-2 flex min-w-0 items-center">
                      <span className="body-3 text-foreground font-medium">
                        Agent Collaboration
                      </span>
                      <Tooltip
                        label="Allow each selected agent to ask, delegate, or brainstorm with other agents during this batch."
                        side="top"
                        triggerClassName="inline-flex"
                      >
                        <span className="text-muted-foreground inline-flex">
                          <Info className="icon-xs" />
                        </span>
                      </Tooltip>
                    </div>
                    <input
                      type="checkbox"
                      checked={action.agent_collaboration === 'allowed'}
                      onChange={(e) =>
                        updateAction(idx, {
                          agent_collaboration: e.target.checked ? 'allowed' : 'disabled',
                        } as Partial<AutomationAction>)
                      }
                      className="checkbox-glass-green shrink-0"
                    />
                  </div>
                  <div className="rounded-spacing-2 border-border bg-background/60 px-spacing-3 py-spacing-2 flex items-center justify-between border">
                    <div className="gap-spacing-2 flex min-w-0 items-center">
                      <span className="body-3 text-foreground font-medium">
                        Extended Brain Knowledge
                      </span>
                      <Tooltip
                        label="Before running this task, every selected agent searches available Brain context and receives the relevant context for that run."
                        side="top"
                        triggerClassName="inline-flex"
                      >
                        <span className="text-muted-foreground inline-flex">
                          <Info className="icon-xs" />
                        </span>
                      </Tooltip>
                    </div>
                    <input
                      type="checkbox"
                      checked={action.extended_brain_knowledge === true}
                      onChange={(e) =>
                        updateAction(idx, {
                          extended_brain_knowledge: e.target.checked,
                        } as Partial<AutomationAction>)
                      }
                      className="checkbox-glass-green shrink-0"
                    />
                  </div>
                  <AutomationFieldGroup label="Set status when all complete">
                    <AutomationCategorizedSelect
                      leadingOptions={[{ value: '', label: "Don't change status" }]}
                      sections={automationStatusSections}
                      value={action.completed_status ?? ''}
                      onChange={(status) =>
                        updateAction(idx, {
                          completed_status: status || undefined,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Don't change status"
                      searchPlaceholder="Search…"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'send_to_cursor' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Cursor account">
                    <AutomationLazySelect
                      value={action.connection_id ?? ''}
                      onChange={(connection_id) =>
                        updateAction(idx, {
                          connection_id: connection_id || undefined,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Default Cursor account"
                      searchPlaceholder="Search Cursor accounts..."
                      loadOptions={async ({ search, offset, limit }) => {
                        const result = await searchCursorConnections({ search, offset, limit })
                        return {
                          options: result.options.map((row) => ({
                            value: row.id,
                            label: row.label,
                            description: row.description ?? undefined,
                          })),
                          hasMore: result.hasMore,
                        }
                      }}
                      allowClear
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="GitHub repository">
                    <AutomationLazySelect
                      value={action.repo_url ?? ''}
                      onChange={(repo_url) =>
                        updateAction(idx, { repo_url } as Partial<AutomationAction>)
                      }
                      placeholder="Select repository"
                      searchPlaceholder="Search GitHub repos..."
                      loadOptions={async ({ search, offset, limit }) => {
                        const result = await searchGitHubReposForAutomation({
                          search,
                          offset,
                          limit,
                        })
                        return {
                          options: result.options.map((repo) => ({
                            value: repo.id,
                            label: repo.label,
                            description: repo.description ?? undefined,
                          })),
                          hasMore: result.hasMore,
                        }
                      }}
                      allowClear={false}
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Base branch">
                    <input
                      type="text"
                      value={action.base_branch ?? 'main'}
                      onChange={(e) =>
                        updateAction(idx, {
                          base_branch: e.target.value || 'main',
                        } as Partial<AutomationAction>)
                      }
                      className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Branch name (optional)">
                    <input
                      type="text"
                      value={action.branch_name ?? ''}
                      onChange={(e) =>
                        updateAction(idx, {
                          branch_name: e.target.value || undefined,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Auto-generated if empty"
                      className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Prompt">
                    <PromptTemplateEditor
                      value={action.prompt_template}
                      onChange={(v) =>
                        updateAction(idx, { prompt_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      tokenKind="message"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Set status when complete">
                    <AutomationCategorizedSelect
                      leadingOptions={[{ value: '', label: "Don't change status" }]}
                      sections={automationStatusSections}
                      value={action.completed_status ?? ''}
                      onChange={(status) =>
                        updateAction(idx, {
                          completed_status: status || undefined,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Don't change status"
                      searchPlaceholder="Search…"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'add_brain_context_to_task' && (
                <div className="body-3 text-muted-foreground rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 border">
                  Atlas searches the available brains and appends the relevant context to this
                  task&apos;s description.
                </div>
              )}

              {action.type === 'agent_suggest_tasks' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Agent">
                    <AutomationRosterSelect
                      roster={roster}
                      mode="agent"
                      value={action.agent_key ?? 'vibey'}
                      onChange={(agent_key) =>
                        updateAction(idx, { agent_key } as Partial<AutomationAction>)
                      }
                      placeholder="Select agent"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Max suggestions">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={action.max_suggestions ?? 10}
                      onChange={(e) =>
                        updateAction(idx, {
                          max_suggestions: Number(e.target.value || 10),
                        } as Partial<AutomationAction>)
                      }
                      className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Instructions">
                    <textarea
                      value={action.instructions ?? ''}
                      onChange={(e) =>
                        updateAction(idx, {
                          instructions: e.target.value,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Tell the agent what kind of tasks to suggest..."
                      className="body-3 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 text-foreground placeholder:text-muted-foreground min-h-[96px] w-full resize-none border outline-none"
                    />
                  </AutomationFieldGroup>
                  <div className="rounded-spacing-2 border-border bg-background/60 px-spacing-3 py-spacing-2 flex items-center justify-between border">
                    <div className="gap-spacing-2 flex min-w-0 items-center">
                      <span className="body-3 text-foreground font-medium">
                        Extended Brain Knowledge
                      </span>
                      <Tooltip
                        label={`Before suggesting tasks, ${agentDisplayName(roster, action.agent_key ?? 'vibey')} searches the User Brain, Company Cortex, Customer Brain, and this agent's Agent Brain when available, then includes the most relevant context in the suggestion payload.`}
                        side="top"
                        triggerClassName="inline-flex"
                      >
                        <span className="text-muted-foreground inline-flex">
                          <Info className="icon-xs" />
                        </span>
                      </Tooltip>
                    </div>
                    <input
                      type="checkbox"
                      checked={action.extended_brain_knowledge === true}
                      onChange={(e) =>
                        updateAction(idx, {
                          extended_brain_knowledge: e.target.checked,
                        } as Partial<AutomationAction>)
                      }
                      className="checkbox-glass-green shrink-0"
                    />
                  </div>
                </div>
              )}

              {action.type === 'create_task' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Title">
                    <PromptTemplateEditor
                      value={action.title_template}
                      onChange={(v) =>
                        updateAction(idx, { title_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Task title..."
                      tokenKind="title"
                      rows={1}
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Status">
                    <AutomationCategorizedSelect
                      leadingOptions={defaultStatusLeadingOptions}
                      sections={automationStatusSections}
                      value={action.status ?? ''}
                      onChange={(status) =>
                        updateAction(idx, {
                          status: status || undefined,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Initial status"
                      searchPlaceholder="Search…"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Assignee">
                    <AssigneeCell
                      value={assigneeValue}
                      roster={roster}
                      currentUserId={null}
                      onChange={(assignees) =>
                        updateAction(idx, {
                          assignees,
                          assignee_type: assignees[0]?.type ?? 'unassigned',
                          assignee_id: assignees[0]?.id,
                        } as Partial<AutomationAction>)
                      }
                      customTrigger={
                        <span className="body-3 h-spacing-10 gap-spacing-2 rounded-spacing-2 border-border bg-background px-spacing-3 hover:bg-hover-subtle flex w-full items-center justify-between border text-left transition-colors">
                          <span className="gap-spacing-2 flex min-w-0 items-center">
                            <UserPlus className="icon-sm text-muted-foreground shrink-0" />
                            <span className="text-foreground truncate">
                              {assigneeValue.length > 0
                                ? `${assigneeValue.length} assignee${assigneeValue.length === 1 ? '' : 's'}`
                                : 'Select assignee'}
                            </span>
                          </span>
                          <ChevronDown className="icon-sm text-muted-foreground shrink-0 opacity-60" />
                        </span>
                      }
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Priority">
                    <AutomationSolidSelect
                      options={[
                        { value: '', label: 'No priority' },
                        ...priorityOptions.map((p) => ({
                          value: p.id,
                          label: p.label,
                          leading: <OptionDot color={p.color} size="sm" />,
                        })),
                      ]}
                      value={action.priority ?? ''}
                      onChange={(priority) =>
                        updateAction(idx, {
                          priority: (priority || undefined) as
                            | 'low'
                            | 'medium'
                            | 'high'
                            | 'urgent'
                            | undefined,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Priority"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Description">
                    <PromptTemplateEditor
                      value={action.notes_template ?? ''}
                      onChange={(v) =>
                        updateAction(idx, { notes_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Task description..."
                      tokenKind="message"
                    />
                  </AutomationFieldGroup>
                  <AutomationTaskFieldsEditor
                    values={action.field_values ?? {}}
                    fields={fields}
                    extraVars={templateVars}
                    includeSystemVars={includeTaskVars}
                    stepContext={templateStepContext}
                    onChange={(field_values) =>
                      updateAction(idx, { field_values } as Partial<AutomationAction>)
                    }
                  />
                </div>
              )}

              {action.type === 'assign_to' && (
                <AutomationFieldGroup label="Assignees">
                  <AssigneeCell
                    value={assigneeValue}
                    roster={roster}
                    currentUserId={null}
                    onChange={(assignees) =>
                      updateAction(idx, {
                        assignees,
                        assignee_type: assignees[0]?.type,
                        assignee_id: assignees[0]?.id,
                      } as Partial<AutomationAction>)
                    }
                    customTrigger={
                      <span className="body-3 h-spacing-10 gap-spacing-2 rounded-spacing-2 border-border bg-background px-spacing-3 hover:bg-hover-subtle flex w-full items-center justify-between border text-left transition-colors">
                        <span className="gap-spacing-2 flex min-w-0 items-center">
                          <UserPlus className="icon-sm text-muted-foreground shrink-0" />
                          <span className="text-foreground truncate">
                            {assigneeValue.length > 0
                              ? `${assigneeValue.length} assignee${assigneeValue.length === 1 ? '' : 's'}`
                              : 'Select assignees'}
                          </span>
                        </span>
                        <ChevronDown className="icon-sm text-muted-foreground shrink-0 opacity-60" />
                      </span>
                    }
                  />
                </AutomationFieldGroup>
              )}

              {action.type === 'change_status' && (
                <AutomationFieldGroup label="Status">
                  <AutomationCategorizedSelect
                    sections={automationStatusSections}
                    value={action.status ?? ''}
                    onChange={(v) =>
                      updateAction(idx, { status: String(v) } as Partial<AutomationAction>)
                    }
                    placeholder="Select status"
                    searchPlaceholder="Search…"
                  />
                </AutomationFieldGroup>
              )}

              {action.type === 'change_priority' && (
                <AutomationFieldGroup label="Priority">
                  <SelectCell
                    field={priorityField}
                    value={action.priority ?? ''}
                    onChange={(id) =>
                      updateAction(idx, { priority: String(id) } as Partial<AutomationAction>)
                    }
                    customTrigger={statusTrigger(changePrioritySelected, 'Select priority')}
                  />
                </AutomationFieldGroup>
              )}

              {action.type === 'add_comment' && (
                <AutomationFieldGroup label="Comment">
                  <PromptTemplateEditor
                    value={action.message_template}
                    onChange={(v) =>
                      updateAction(idx, { message_template: v } as Partial<AutomationAction>)
                    }
                    fields={fields}
                    extraVars={templateVars}
                    includeSystemVars={includeTaskVars}
                    stepContext={templateStepContext}
                    placeholder="Comment message..."
                    tokenKind="message"
                  />
                </AutomationFieldGroup>
              )}

              {action.type === 'human_gate' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Reviewer">
                    <AssigneeCell
                      value={assigneeValue}
                      roster={roster}
                      currentUserId={null}
                      onChange={(assignees) =>
                        updateAction(idx, {
                          assignees,
                          assignee_type: assignees[0]?.type,
                          assignee_id: assignees[0]?.id,
                        } as Partial<AutomationAction>)
                      }
                      customTrigger={
                        <span className="body-3 h-spacing-10 gap-spacing-2 rounded-spacing-2 border-border bg-background px-spacing-3 hover:bg-hover-subtle flex w-full items-center justify-between border text-left transition-colors">
                          <span className="gap-spacing-2 flex min-w-0 items-center">
                            <UserPlus className="icon-sm text-muted-foreground shrink-0" />
                            <span className="text-foreground truncate">
                              {assigneeValue.length > 0
                                ? `${assigneeValue.length} reviewer${assigneeValue.length === 1 ? '' : 's'}`
                                : 'Select reviewer'}
                            </span>
                          </span>
                          <ChevronDown className="icon-sm text-muted-foreground shrink-0 opacity-60" />
                        </span>
                      }
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Waiting status">
                    <AutomationCategorizedSelect
                      sections={automationStatusSections}
                      value={action.waiting_status ?? 'in_review'}
                      onChange={(v) =>
                        updateAction(idx, { waiting_status: String(v) } as Partial<AutomationAction>)
                      }
                      placeholder="Select status"
                      searchPlaceholder="Search…"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Approve status">
                    <AutomationCategorizedSelect
                      sections={automationStatusSections}
                      value={action.resume_on_status ?? 'done'}
                      onChange={(v) =>
                        updateAction(idx, {
                          resume_on_status: String(v),
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Select status"
                      searchPlaceholder="Search…"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Reject status">
                    <AutomationCategorizedSelect
                      sections={automationStatusSections}
                      value={action.reject_on_status ?? 'needs_revision'}
                      onChange={(v) =>
                        updateAction(idx, {
                          reject_on_status: String(v),
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Select status"
                      searchPlaceholder="Search…"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="On reject, loop back to">
                    <AutomationSolidSelect
                      options={priorStepOptions}
                      value={
                        typeof action.on_reject_goto_step_index === 'number'
                          ? String(action.on_reject_goto_step_index)
                          : ''
                      }
                      onChange={(value) =>
                        updateAction(idx, {
                          on_reject_goto_step_index: value ? Number(value) : undefined,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Select earlier step"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Review message">
                    <PromptTemplateEditor
                      value={action.message_template ?? ''}
                      onChange={(v) =>
                        updateAction(idx, { message_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Message for the reviewer..."
                      tokenKind="message"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'flow_loop' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Loop back to step">
                    <AutomationSolidSelect
                      options={priorStepOptions}
                      value={
                        typeof action.target_step_index === 'number'
                          ? String(action.target_step_index)
                          : ''
                      }
                      onChange={(value) =>
                        updateAction(idx, {
                          target_step_index: value ? Number(value) : 0,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Select step"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="When">
                    <AutomationSolidSelect
                      options={[
                        { value: 'on_reject', label: 'On reject' },
                        { value: 'always', label: 'Always' },
                      ]}
                      value={action.when ?? 'on_reject'}
                      onChange={(when) =>
                        updateAction(idx, {
                          when: when as 'on_reject' | 'always',
                        } as Partial<AutomationAction>)
                      }
                      placeholder="When to loop"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Max iterations">
                    <AutomationSolidSelect
                      options={[1, 2, 3, 5, 10].map((n) => ({
                        value: String(n),
                        label: String(n),
                      }))}
                      value={String(action.max_iterations ?? 3)}
                      onChange={(value) =>
                        updateAction(idx, {
                          max_iterations: Number(value),
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Max iterations"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'flow_branch' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="If field">
                    <AutomationSolidSelect
                      options={branchFieldOptions}
                      value={action.field_id ?? ''}
                      onChange={(field_id) =>
                        updateAction(idx, { field_id } as Partial<AutomationAction>)
                      }
                      placeholder="Select field"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Condition">
                    <AutomationSolidSelect
                      options={[
                        { value: 'equals', label: 'Equals' },
                        { value: 'not_equals', label: 'Does not equal' },
                        { value: 'contains', label: 'Contains' },
                        { value: 'is_empty', label: 'Is empty' },
                        { value: 'is_not_empty', label: 'Is not empty' },
                      ]}
                      value={action.operator ?? 'equals'}
                      onChange={(operator) =>
                        updateAction(idx, {
                          operator: operator as 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty',
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Operator"
                    />
                  </AutomationFieldGroup>
                  {action.operator !== 'is_empty' && action.operator !== 'is_not_empty' ? (
                    action.field_id === 'status' ? (
                      <AutomationFieldGroup label="Value">
                        <AutomationCategorizedSelect
                          sections={automationStatusSections}
                          value={action.value ?? ''}
                          onChange={(value) =>
                            updateAction(idx, { value: String(value) } as Partial<AutomationAction>)
                          }
                          placeholder="Select status"
                          searchPlaceholder="Search…"
                        />
                      </AutomationFieldGroup>
                    ) : action.field_id === 'priority' ? (
                      <AutomationFieldGroup label="Value">
                        <AutomationSolidSelect
                          options={priorityOptions.map((row) => ({
                            value: row.id,
                            label: row.label,
                          }))}
                          value={action.value ?? ''}
                          onChange={(value) =>
                            updateAction(idx, { value } as Partial<AutomationAction>)
                          }
                          placeholder="Select priority"
                        />
                      </AutomationFieldGroup>
                    ) : (
                      <AutomationFieldGroup label="Value">
                        <input
                          type="text"
                          value={action.value ?? ''}
                          onChange={(e) =>
                            updateAction(idx, { value: e.target.value } as Partial<AutomationAction>)
                          }
                          placeholder="Compare value"
                          className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
                        />
                      </AutomationFieldGroup>
                    )
                  ) : null}
                  <AutomationFieldGroup label="Then go to step">
                    <AutomationSolidSelect
                      options={allStepOptions.filter((row) => row.value !== String(idx))}
                      value={
                        typeof action.then_step_index === 'number'
                          ? String(action.then_step_index)
                          : ''
                      }
                      onChange={(value) =>
                        updateAction(idx, {
                          then_step_index: value ? Number(value) : 0,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Select step"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Otherwise go to step (optional)">
                    <AutomationSolidSelect
                      options={[
                        { value: '', label: 'Continue to next step' },
                        ...allStepOptions.filter((row) => row.value !== String(idx)),
                      ]}
                      value={
                        typeof action.else_step_index === 'number'
                          ? String(action.else_step_index)
                          : ''
                      }
                      onChange={(value) =>
                        updateAction(idx, {
                          else_step_index: value ? Number(value) : undefined,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Continue to next step"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'send_email' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Email provider">
                    <AutomationSolidSelect
                      options={EMAIL_TOOL_OPTIONS}
                      value={action.tool_slug ?? ''}
                      onChange={(tool_slug) =>
                        updateAction(idx, {
                          tool_slug,
                          connected_account_id: '',
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Email provider"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Connected account">
                    <AutomationLazySelect
                      value={action.connected_account_id ?? ''}
                      onChange={(connected_account_id) =>
                        updateAction(idx, { connected_account_id } as Partial<AutomationAction>)
                      }
                      placeholder="Connected account"
                      searchPlaceholder="Search connected accounts..."
                      loadOptions={async ({ search, offset, limit }) => {
                        const result = await searchAutomationComposioAccounts({
                          toolkit: emailToolkitForTool(action.tool_slug),
                          search,
                          offset,
                          limit,
                        })
                        return {
                          options: result.options.map((account) => ({
                            value: account.id,
                            label: account.label,
                            description: account.description,
                          })),
                          hasMore: result.hasMore,
                        }
                      }}
                      allowClear={false}
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="To">
                    <PromptTemplateEditor
                      value={action.to ?? ''}
                      onChange={(v) => updateAction(idx, { to: v } as Partial<AutomationAction>)}
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="To..."
                      rows={1}
                      tokenKind="email"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Subject/body source">
                    <AutomationSolidSelect
                      options={EMAIL_CONTENT_SOURCE_OPTIONS}
                      value={action.subject_source ?? 'manual'}
                      onChange={(subject_source) =>
                        updateAction(idx, {
                          subject_source: subject_source as 'manual' | 'artifact',
                          email_artifact_id:
                            subject_source === 'artifact' ? action.email_artifact_id : undefined,
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Subject/body source"
                    />
                  </AutomationFieldGroup>
                  {action.subject_source === 'artifact' ? (
                    <>
                      <div className="body-3 rounded-spacing-2 border-border bg-muted/20 px-spacing-3 py-spacing-2 text-muted-foreground border">
                        Subject and body will come from the email artifact linked to this task.
                      </div>
                      <AutomationFieldGroup label="Specific email artifact">
                        <AutomationLazySelect
                          value={action.email_artifact_id ?? ''}
                          onChange={(email_artifact_id) =>
                            updateAction(idx, {
                              email_artifact_id: email_artifact_id || undefined,
                            } as Partial<AutomationAction>)
                          }
                          placeholder="Linked email artifact on task"
                          searchPlaceholder="Search email artifacts..."
                          loadOptions={loadArtifacts('email')}
                        />
                      </AutomationFieldGroup>
                    </>
                  ) : (
                    <>
                      <AutomationFieldGroup label="Subject">
                        <PromptTemplateEditor
                          value={action.subject_template ?? ''}
                          onChange={(v) =>
                            updateAction(idx, { subject_template: v } as Partial<AutomationAction>)
                          }
                          fields={fields}
                          extraVars={templateVars}
                          includeSystemVars={includeTaskVars}
                          stepContext={templateStepContext}
                          placeholder="Subject..."
                          tokenKind="title"
                          rows={1}
                        />
                      </AutomationFieldGroup>
                      <AutomationFieldGroup label="Body">
                        <PromptTemplateEditor
                          value={action.body_template ?? ''}
                          onChange={(v) =>
                            updateAction(idx, { body_template: v } as Partial<AutomationAction>)
                          }
                          fields={fields}
                          extraVars={templateVars}
                          includeSystemVars={includeTaskVars}
                          stepContext={templateStepContext}
                          placeholder="Email body..."
                          tokenKind="message"
                        />
                      </AutomationFieldGroup>
                    </>
                  )}
                </div>
              )}

              {action.type === 'send_slack_message' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Channel">
                    <AutomationLazySelect
                      value={action.channel_id ?? ''}
                      onChange={(channel_id) =>
                        updateAction(idx, { channel_id } as Partial<AutomationAction>)
                      }
                      placeholder="Select channel"
                      searchPlaceholder="Search channels..."
                      loadOptions={loadChannels}
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Message">
                    <PromptTemplateEditor
                      value={action.text_template ?? ''}
                      onChange={(v) =>
                        updateAction(idx, { text_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Slack message..."
                      tokenKind="message"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'send_channel_message' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Channel">
                    <AutomationLazySelect
                      value={action.channel_id ?? ''}
                      onChange={(channel_id) =>
                        updateAction(idx, { channel_id } as Partial<AutomationAction>)
                      }
                      placeholder="Select channel"
                      searchPlaceholder="Search channels..."
                      loadOptions={loadChannels}
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Message">
                    <PromptTemplateEditor
                      value={action.content_template ?? ''}
                      onChange={(v) =>
                        updateAction(idx, { content_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Channel message..."
                      tokenKind="message"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'create_contact' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Email">
                    <PromptTemplateEditor
                      value={action.email_template ?? ''}
                      onChange={(v) =>
                        updateAction(idx, { email_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Contact email..."
                      tokenKind="email"
                      rows={1}
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Name">
                    <PromptTemplateEditor
                      value={action.name_template ?? ''}
                      onChange={(v) =>
                        updateAction(idx, { name_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Contact name..."
                      tokenKind="name"
                      rows={1}
                    />
                  </AutomationFieldGroup>
                  <AutomationContactFieldsEditor
                    values={action.field_values ?? {}}
                    onChange={(field_values) =>
                      updateAction(idx, { field_values } as Partial<AutomationAction>)
                    }
                    fields={fields}
                    templateVars={templateVars}
                    includeSystemVars={includeTaskVars}
                    stepContext={templateStepContext}
                  />
                </div>
              )}

              {action.type === 'update_contact_field' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Contact">
                    {contactOptions.length > 0 ? (
                      <AutomationSolidSelect
                        options={contactOptions}
                        value={action.contact_id ?? ''}
                        onChange={(contact_id) =>
                          updateAction(idx, { contact_id } as Partial<AutomationAction>)
                        }
                        placeholder="Contact"
                      />
                    ) : (
                      <AutomationLazySelect
                        value={action.contact_id ?? ''}
                        onChange={(contact_id) =>
                          updateAction(idx, { contact_id } as Partial<AutomationAction>)
                        }
                        placeholder="Select contact"
                        searchPlaceholder="Search contacts..."
                        loadOptions={loadContacts}
                      />
                    )}
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Field">
                    <AutomationSolidSelect
                      options={CONTACT_FIELD_OPTIONS}
                      value={action.field_id ?? ''}
                      onChange={(field_id) =>
                        updateAction(idx, { field_id } as Partial<AutomationAction>)
                      }
                      placeholder="Contact field"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Value">
                    <PromptTemplateEditor
                      value={action.value_template ?? ''}
                      onChange={(v) =>
                        updateAction(idx, { value_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Value..."
                      tokenKind="message"
                      rows={1}
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {(action.type === 'add_contact_tag' || action.type === 'remove_contact_tag') && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Contact">
                    {contactOptions.length > 0 ? (
                      <AutomationSolidSelect
                        options={contactOptions}
                        value={action.contact_id ?? ''}
                        onChange={(contact_id) =>
                          updateAction(idx, { contact_id } as Partial<AutomationAction>)
                        }
                        placeholder="Contact"
                      />
                    ) : (
                      <AutomationLazySelect
                        value={action.contact_id ?? ''}
                        onChange={(contact_id) =>
                          updateAction(idx, { contact_id } as Partial<AutomationAction>)
                        }
                        placeholder="Select contact"
                        searchPlaceholder="Search contacts..."
                        loadOptions={loadContacts}
                      />
                    )}
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Tag">
                    <input
                      type="text"
                      value={action.tag ?? ''}
                      onChange={(e) =>
                        updateAction(idx, { tag: e.target.value } as Partial<AutomationAction>)
                      }
                      placeholder="Tag"
                      className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 w-full border outline-none"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'attach_note_to_contact' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Contact">
                    {contactOptions.length > 0 ? (
                      <AutomationSolidSelect
                        options={contactOptions}
                        value={action.contact_id ?? ''}
                        onChange={(contact_id) =>
                          updateAction(idx, { contact_id } as Partial<AutomationAction>)
                        }
                        placeholder="Contact"
                      />
                    ) : (
                      <AutomationLazySelect
                        value={action.contact_id ?? ''}
                        onChange={(contact_id) =>
                          updateAction(idx, { contact_id } as Partial<AutomationAction>)
                        }
                        placeholder="Select contact"
                        searchPlaceholder="Search contacts..."
                        loadOptions={loadContacts}
                      />
                    )}
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Note">
                    <PromptTemplateEditor
                      value={action.content_template ?? ''}
                      onChange={(v) =>
                        updateAction(idx, { content_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Note..."
                      tokenKind="message"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'link_item_to_contact' &&
                (contactOptions.length > 0 ? (
                  <AutomationFieldGroup label="Contact">
                    <AutomationSolidSelect
                      options={contactOptions}
                      value={action.contact_id ?? ''}
                      onChange={(contact_id) =>
                        updateAction(idx, { contact_id } as Partial<AutomationAction>)
                      }
                      placeholder="Contact"
                    />
                  </AutomationFieldGroup>
                ) : (
                  <AutomationFieldGroup label="Contact">
                    <AutomationLazySelect
                      value={action.contact_id ?? ''}
                      onChange={(contact_id) =>
                        updateAction(idx, { contact_id } as Partial<AutomationAction>)
                      }
                      placeholder="Select contact"
                      searchPlaceholder="Search contacts..."
                      loadOptions={loadContacts}
                      allowClear={false}
                    />
                  </AutomationFieldGroup>
                ))}

              {action.type === 'sync_social_research' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Platform">
                    <AutomationSolidSelect
                      options={SOCIAL_RESEARCH_PLATFORM_OPTIONS}
                      value={action.platform ?? 'all'}
                      onChange={(platform) =>
                        updateAction(idx, { platform } as Partial<AutomationAction>)
                      }
                      placeholder="Platform"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Sync mode">
                    <AutomationSolidSelect
                      options={SOCIAL_RESEARCH_SYNC_MODE_OPTIONS}
                      value={action.sync_mode ?? 'use_existing'}
                      onChange={(sync_mode) =>
                        updateAction(idx, { sync_mode } as Partial<AutomationAction>)
                      }
                      placeholder="Sync mode"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'select_social_outliers' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Platform">
                    <AutomationSolidSelect
                      options={SOCIAL_RESEARCH_PLATFORM_OPTIONS}
                      value={action.platform ?? 'all'}
                      onChange={(platform) =>
                        updateAction(idx, { platform } as Partial<AutomationAction>)
                      }
                      placeholder="Platform"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Outlier threshold">
                    <AutomationSolidSelect
                      options={SOCIAL_RESEARCH_OUTLIER_OPTIONS}
                      value={String(action.min_outlier_score ?? 2)}
                      onChange={(v) =>
                        updateAction(idx, {
                          min_outlier_score: Number(v),
                        } as Partial<AutomationAction>)
                      }
                      placeholder="Min outlier score"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Limit">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className="input-glass w-full"
                      value={action.limit ?? 10}
                      onChange={(e) =>
                        updateAction(idx, {
                          limit: Number(e.target.value),
                        } as Partial<AutomationAction>)
                      }
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'enrich_social_research_items' && (
                <AutomationFieldGroup label="Enrichments">
                  <div className="gap-spacing-2 flex flex-wrap">
                    {SOCIAL_RESEARCH_ENRICHMENT_OPTIONS.map((opt) => {
                      const selected = (action.enrichments ?? []).includes(
                        opt.value as 'caption' | 'hook' | 'transcript',
                      )
                      return (
                        <AutomationToggleChip
                          key={opt.value}
                          selected={selected}
                          onClick={() => {
                            const current = new Set(action.enrichments ?? [])
                            if (selected)
                              current.delete(opt.value as 'caption' | 'hook' | 'transcript')
                            else current.add(opt.value as 'caption' | 'hook' | 'transcript')
                            updateAction(idx, {
                              enrichments: [...current],
                            } as Partial<AutomationAction>)
                          }}
                        >
                          {opt.label}
                        </AutomationToggleChip>
                      )
                    })}
                  </div>
                </AutomationFieldGroup>
              )}

              {action.type === 'ingest_youtube_channel_to_agent_brain' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Agent">
                    <AutomationRosterSelect
                      roster={roster}
                      mode="agent"
                      value={action.agent_key ?? ''}
                      onChange={(agent_key) =>
                        updateAction(idx, { agent_key } as Partial<AutomationAction>)
                      }
                      placeholder="Select agent"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Channel URLs">
                    <textarea
                      value={(action.channel_urls ?? []).join('\n')}
                      onChange={(e) =>
                        updateAction(idx, {
                          channel_urls: e.target.value
                            .split(/\r?\n/)
                            .map((line) => line.trim())
                            .filter(Boolean),
                        } as Partial<AutomationAction>)
                      }
                      placeholder="https://youtube.com/@channel"
                      className="body-3 rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 text-foreground placeholder:text-muted-foreground min-h-[96px] w-full resize-none border outline-none"
                    />
                  </AutomationFieldGroup>
                  <div className="gap-spacing-3 grid grid-cols-2">
                    <AutomationFieldGroup label="Days">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
                        value={action.since_days ?? 7}
                        onChange={(e) =>
                          updateAction(idx, {
                            since_days: Number(e.target.value),
                          } as Partial<AutomationAction>)
                        }
                      />
                    </AutomationFieldGroup>
                    <AutomationFieldGroup label="Max per channel">
                      <input
                        type="number"
                        min={1}
                        max={200}
                        className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground w-full border outline-none"
                        value={action.max_videos_per_channel ?? 25}
                        onChange={(e) =>
                          updateAction(idx, {
                            max_videos_per_channel: Number(e.target.value),
                          } as Partial<AutomationAction>)
                        }
                      />
                    </AutomationFieldGroup>
                  </div>
                  <AutomationFieldGroup label="Domain">
                    <AutomationSolidSelect
                      options={BRAIN_IMPORT_DOMAIN_OPTIONS}
                      value={action.domain ?? 'strategy'}
                      onChange={(domain) =>
                        updateAction(idx, { domain } as Partial<AutomationAction>)
                      }
                      placeholder="Domain"
                    />
                  </AutomationFieldGroup>
                  <div className="rounded-spacing-2 border-border bg-background/60 px-spacing-3 py-spacing-2 flex items-center justify-between border">
                    <span className="body-3 text-foreground font-medium">Include Shorts</span>
                    <input
                      type="checkbox"
                      checked={action.include_shorts === true}
                      onChange={(e) =>
                        updateAction(idx, {
                          include_shorts: e.target.checked,
                        } as Partial<AutomationAction>)
                      }
                      className="checkbox-glass-green shrink-0"
                    />
                  </div>
                </div>
              )}

              {action.type === 'create_artifact' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Type">
                    <AutomationSolidSelect
                      options={ARTIFACT_KIND_OPTIONS}
                      value={action.artifact_kind ?? ''}
                      onChange={(artifact_kind) =>
                        updateAction(idx, { artifact_kind } as Partial<AutomationAction>)
                      }
                      placeholder="Artifact type"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Title">
                    <PromptTemplateEditor
                      value={action.title_template ?? ''}
                      onChange={(v) =>
                        updateAction(idx, { title_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Artifact title..."
                      tokenKind="title"
                      rows={1}
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {(action.type === 'publish_artifact' ||
                action.type === 'unpublish_artifact' ||
                action.type === 'attach_artifact_to_item') && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Artifact type">
                    <AutomationSolidSelect
                      options={ARTIFACT_KIND_OPTIONS}
                      value={action.artifact_kind ?? ''}
                      onChange={(artifact_kind) =>
                        updateAction(idx, { artifact_kind } as Partial<AutomationAction>)
                      }
                      placeholder="Artifact type"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Artifact">
                    <AutomationLazySelect
                      value={action.artifact_id ?? ''}
                      onChange={(artifact_id) =>
                        updateAction(idx, { artifact_id } as Partial<AutomationAction>)
                      }
                      placeholder="Select artifact"
                      searchPlaceholder="Search artifacts..."
                      loadOptions={loadArtifacts(action.artifact_kind)}
                      allowClear={false}
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'ask_agent_to_improve_artifact' && (
                <div className="space-y-spacing-3">
                  <AutomationFieldGroup label="Artifact type">
                    <AutomationSolidSelect
                      options={ARTIFACT_KIND_OPTIONS}
                      value={action.artifact_kind ?? ''}
                      onChange={(artifact_kind) =>
                        updateAction(idx, { artifact_kind } as Partial<AutomationAction>)
                      }
                      placeholder="Artifact type"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Artifact">
                    <AutomationLazySelect
                      value={action.artifact_id ?? ''}
                      onChange={(artifact_id) =>
                        updateAction(idx, { artifact_id } as Partial<AutomationAction>)
                      }
                      placeholder="Select artifact"
                      searchPlaceholder="Search artifacts..."
                      loadOptions={loadArtifacts(action.artifact_kind)}
                      allowClear={false}
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Agent">
                    <AutomationRosterSelect
                      roster={roster}
                      mode="agent"
                      value={action.agent_key ?? ''}
                      onChange={(agent_key) =>
                        updateAction(idx, { agent_key } as Partial<AutomationAction>)
                      }
                      placeholder="Select agent"
                    />
                  </AutomationFieldGroup>
                  <AutomationFieldGroup label="Prompt">
                    <PromptTemplateEditor
                      value={action.prompt_template ?? ''}
                      onChange={(v) =>
                        updateAction(idx, { prompt_template: v } as Partial<AutomationAction>)
                      }
                      fields={fields}
                      extraVars={templateVars}
                      includeSystemVars={includeTaskVars}
                      stepContext={templateStepContext}
                      placeholder="Improvement prompt..."
                      tokenKind="message"
                    />
                  </AutomationFieldGroup>
                </div>
              )}

              {action.type === 'create_subtask' && (
                <AutomationFieldGroup label="Title">
                  <PromptTemplateEditor
                    value={action.title_template}
                    onChange={(v) =>
                      updateAction(idx, { title_template: v } as Partial<AutomationAction>)
                    }
                    fields={fields}
                    extraVars={templateVars}
                    includeSystemVars={includeTaskVars}
                    stepContext={templateStepContext}
                    placeholder="Subtask title..."
                    tokenKind="title"
                    rows={1}
                  />
                </AutomationFieldGroup>
              )}
            </div>

            {showContinuation && !isSingle && (
              <div className="flex items-center justify-center py-1">
                {canWaitForCompletion ? (
                  <button
                    type="button"
                    onClick={() => {
                      const next = isWait ? undefined : 'after_task_completes'
                      updateAction(idx, { continuation: next } as Partial<AutomationAction>)
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors ${
                      isWait
                        ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/25'
                        : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle'
                    }`}
                    title={
                      isWait
                        ? 'Waits for agent completion — click to switch to immediate'
                        : 'Runs immediately — click to wait for agent completion'
                    }
                  >
                    {isWait ? (
                      <>
                        <Clock className="h-3 w-3" />
                        <span className="typo-caption font-medium">After agent completes</span>
                      </>
                    ) : (
                      <>
                        <ArrowDown className="h-3 w-3 opacity-50" />
                        <span className="typo-caption">Then</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-muted-foreground flex items-center gap-1.5 rounded-full px-2.5 py-1">
                    <ArrowDown className="h-3 w-3 opacity-50" />
                    <span className="typo-caption">Then</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {isSingle ? null : (
        <button
          type="button"
          onClick={() => addAction()}
          className="body-3 text-muted-foreground hover:text-foreground gap-spacing-2 rounded-spacing-2 border-border px-spacing-3 py-spacing-2 hover:bg-hover-subtle flex w-full items-center justify-center border border-dashed transition-colors"
        >
          <Plus className="icon-sm" />
          Add action
        </button>
      )}
    </div>
  )
}
