'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import {
  CONNECTED_APP_FLOW_PROVIDERS,
  getConnectedAppFlowProviderLabel,
  getConnectedAppFlowTriggerBySlug,
  listConnectedAppFlowTriggersByProvider,
  type ConnectedAppFlowProvider,
} from '@/lib/flows/connected-app-flow-triggers'
import type { ContactsTriggerPickers } from '@/lib/flows/contacts-trigger-pickers'
import {
  fetchFathomSources,
  searchAutomationArtifacts,
  searchAutomationChannels,
  searchAutomationComposioAccounts,
  searchAutomationForms,
  type FathomSourceOptions,
} from '../../services/automations.service'
import type { AutomationTrigger, FathomTriggerSource, FieldDef } from '../../types/space-schema'
import { DueDateCell } from '../cells/DueDateCell'
import { OptionDot } from '../OptionBadge'
import {
  ALL_TRIGGER_SECTIONS_FOR_SEARCH,
  applyObjectToTrigger,
  defaultObjectForTriggerType,
  defaultTriggerForType,
  inferTriggerObject,
  isCustomAutomationField,
  TRIGGER_OBJECT_OPTIONS,
  triggerSectionsForObject,
  type TriggerObjectKey,
} from './automation-catalog'
import { buildAutomationStatusSections } from './automation-status-sections'
import {
  AutomationCategorizedSelect,
  type AutomationCategorizedOption,
  type AutomationCategorizedSection,
} from './AutomationCategorizedSelect'
import { AutomationLazySelect } from './AutomationLazySelect'
import { AutomationRosterSelect } from './AutomationRosterSelect'
import { ScheduleTriggerEditor } from './ScheduleTriggerEditor'
import { WebhookTriggerEditor } from './WebhookTriggerEditor'

function ensureOptionIncluded(
  options: AutomationSolidOption[],
  value: string | undefined,
): AutomationSolidOption[] {
  const v = value?.trim()
  if (!v) return options
  if (options.some((o) => o.value === v)) return options
  return [...options, { value: v, label: v }]
}

function connectedAppConfigLabel(key: string): string {
  switch (key) {
    case 'spreadsheet_id':
      return 'Spreadsheet ID'
    case 'database_id':
      return 'Database ID'
    default:
      return key
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
  }
}

function connectedAppConfigPlaceholder(key: string): string {
  switch (key) {
    case 'spreadsheet_id':
      return 'Paste the Google Sheets spreadsheet ID'
    case 'database_id':
      return 'Paste the Notion database ID'
    default:
      return `Enter ${connectedAppConfigLabel(key)}`
  }
}

interface TriggerBuilderProps {
  trigger: AutomationTrigger
  onChange: (t: AutomationTrigger) => void
  fields: FieldDef[]
  roster: TeamRosterEntry[]
  campaignId: string | null
  contactsTriggerPickers: ContactsTriggerPickers
  /**
   * Required to fetch the Fathom source picker options
   * (`/api/spaces/:id/automations/fathom-sources`). Sources are scoped per
   * space so the picker reflects the org context the rule is being saved into.
   */
  spaceId: string
  /** When `fields`, hides object/event pickers (shown in flow builder Setup phase). */
  mode?: 'full' | 'fields' | 'setup'
}

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

export function TriggerBuilder({
  trigger,
  onChange,
  fields,
  roster,
  campaignId,
  contactsTriggerPickers,
  spaceId,
  mode = 'full',
}: TriggerBuilderProps) {
  const statusField = useMemo(() => statusFieldDef(fields), [fields])
  const priorityField = useMemo(() => priorityFieldDef(fields), [fields])
  const statusOptions = statusField.options ?? []
  const priorityOptions = priorityField.options ?? []

  const automationStatusSections = useMemo(
    () => buildAutomationStatusSections(statusOptions),
    [statusOptions],
  )

  const anyStatusLeadingOptions = useMemo(() => [{ value: '', label: 'Any status' }], [])

  const optionalPrioritySolidOptions: AutomationSolidOption[] = useMemo(
    () => [
      { value: '', label: 'Any priority' },
      ...priorityOptions.map((p) => ({
        value: p.id,
        label: p.label,
        leading: <OptionDot color={p.color} size="sm" />,
      })),
    ],
    [priorityOptions],
  )

  const fieldSelectOptions: AutomationSolidOption[] = useMemo(
    () => fields.filter(isCustomAutomationField).map((f) => ({ value: f.id, label: f.name })),
    [fields],
  )

  const tagsField = useMemo(() => fields.find((f) => f.id === 'tags'), [fields])
  const tagOptions: AutomationSolidOption[] = useMemo(
    () => [
      { value: '', label: 'Any tag' },
      ...(tagsField?.options ?? []).map((o) => ({
        value: o.id,
        label: o.label,
        leading: o.color ? <OptionDot color={o.color} size="sm" /> : undefined,
      })),
    ],
    [tagsField],
  )

  const fieldValueField =
    trigger.type === 'field_changed' ? fields.find((f) => f.id === trigger.field_id) : null
  const fieldValueOptions: AutomationSolidOption[] = useMemo(() => {
    const opts = fieldValueField?.options ?? []
    return [
      { value: '', label: 'Any value' },
      ...opts.map((o) => ({
        value: o.id,
        label: o.label,
        leading: o.color ? <OptionDot color={o.color} size="sm" /> : undefined,
      })),
    ]
  }, [fieldValueField])

  const emailProviderOptions: AutomationSolidOption[] = [
    { value: 'gmail', label: 'Gmail' },
    { value: 'outlook', label: 'Outlook' },
  ]

  const gmailCategoryOptions: AutomationSolidOption[] = [
    { value: 'primary', label: 'Primary' },
    { value: 'promotions', label: 'Promotions' },
    { value: 'social', label: 'Social' },
    { value: 'updates', label: 'Updates' },
    { value: 'forums', label: 'Forums' },
  ]

  const slackTriggerOptions: AutomationSolidOption[] = [
    { value: 'SLACK_RECEIVE_DIRECT_MESSAGE', label: 'Direct message' },
    { value: 'SLACK_CHANNEL_MESSAGE_RECEIVED', label: 'Channel message' },
    { value: 'SLACK_RECEIVE_THREAD_REPLY', label: 'Thread reply' },
    { value: 'SLACKBOT_RECEIVE_DIRECT_MESSAGE', label: 'Bot direct message' },
    { value: 'SLACKBOT_CHANNEL_MESSAGE_RECEIVED', label: 'Bot channel message' },
    { value: 'SLACKBOT_RECEIVE_THREAD_REPLY', label: 'Bot thread reply' },
  ]

  const assigneeKindOptions: AutomationSolidOption[] = [
    { value: '', label: 'Any assignee' },
    { value: 'human', label: 'Person' },
    { value: 'agent', label: 'Agent' },
    { value: 'unassigned', label: 'Unassigned' },
  ]

  const contactFieldOptions: AutomationSolidOption[] = [
    { value: '', label: 'Any contact field' },
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

  const artifactKindOptions: AutomationSolidOption[] = [
    { value: '', label: 'Any artifact' },
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

  const artifactLifecycleOptions: AutomationSolidOption[] = [
    { value: 'created', label: 'Created' },
    { value: 'published', label: 'Published' },
    { value: 'unpublished', label: 'Unpublished' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'failed', label: 'Failed' },
    { value: 'status_changed', label: 'Status changed' },
  ]

  const triggerObject = inferTriggerObject(trigger)
  const eventSections = useMemo(() => triggerSectionsForObject(triggerObject), [triggerObject])
  const triggerPickerValue =
    trigger.type === 'external_app_event'
      ? (trigger.trigger_slug ?? 'external_app_event')
      : trigger.type
  const connectedAppSelectedMeta =
    trigger.type === 'external_app_event' && trigger.trigger_slug
      ? getConnectedAppFlowTriggerBySlug(trigger.trigger_slug)
      : null
  const connectedAppRequiredConfigKeys = connectedAppSelectedMeta?.requiredConfigKeys ?? []
  const connectedAppTriggerConfig =
    trigger.type === 'external_app_event' &&
    trigger.trigger_config &&
    typeof trigger.trigger_config === 'object' &&
    !Array.isArray(trigger.trigger_config)
      ? trigger.trigger_config
      : {}
  const emailFilterOptions = useMemo(() => {
    if (trigger.type !== 'external_email_received') return []
    return [
      ...(trigger.provider !== 'outlook' && !trigger.gmail_category
        ? [{ value: 'gmail_category', label: 'Inbox category' }]
        : []),
      ...(trigger.from_contains === undefined
        ? [{ value: 'from_contains', label: 'Sender contains' }]
        : []),
      ...(trigger.subject_contains === undefined
        ? [{ value: 'subject_contains', label: 'Subject contains' }]
        : []),
    ]
  }, [trigger])

  const handleObjectChange = (next: string) => {
    const nextObject = next as TriggerObjectKey
    onChange(applyObjectToTrigger(trigger, nextObject))
  }

  const handleTriggerTypeChange = (triggerType: string) => {
    const sectionsForCurrent = triggerSectionsForObject(triggerObject)
    const inCurrent = sectionsForCurrent.some((s) => s.options.some((o) => o.value === triggerType))
    const targetObject = inCurrent ? triggerObject : defaultObjectForTriggerType(triggerType)
    onChange(defaultTriggerForType(triggerType, targetObject))
  }

  return (
    <div className="rounded-spacing-2 bg-muted/10 p-spacing-3 space-y-3">
      {mode !== 'fields' ? (
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <div
            className={
              triggerObject === 'schedule' ? 'w-full min-w-[160px] flex-1' : 'min-w-[160px] flex-1'
            }
          >
            <AutomationSolidSelect
              options={TRIGGER_OBJECT_OPTIONS as unknown as AutomationSolidOption[]}
              value={triggerObject}
              onChange={handleObjectChange}
              placeholder="What"
            />
          </div>
          {triggerObject !== 'schedule' ? (
            <div className="min-w-[200px] flex-[2]">
              <AutomationCategorizedSelect
                sections={eventSections}
                crossScopeSections={ALL_TRIGGER_SECTIONS_FOR_SEARCH}
                value={triggerPickerValue}
                onChange={handleTriggerTypeChange}
                placeholder="When…"
                searchPlaceholder="Search triggers across objects…"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'setup' ? null : (
        <>
      {trigger.type === 'status_change' && (
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <div className="min-w-[140px] flex-1">
            <AutomationCategorizedSelect
              leadingOptions={anyStatusLeadingOptions}
              sections={automationStatusSections}
              value={trigger.from ?? ''}
              onChange={(v) => onChange({ ...trigger, from: v || undefined })}
              placeholder="From status"
              searchPlaceholder="Search…"
            />
          </div>
          <span className="typo-caption text-muted-foreground shrink-0">→</span>
          <div className="min-w-[140px] flex-1">
            <AutomationCategorizedSelect
              sections={automationStatusSections}
              value={trigger.to ?? ''}
              onChange={(v) => onChange({ ...trigger, to: v })}
              placeholder="Select status"
              searchPlaceholder="Search…"
            />
          </div>
        </div>
      )}

      {trigger.type === 'task_created' && (
        <AutomationCategorizedSelect
          leadingOptions={anyStatusLeadingOptions}
          sections={automationStatusSections}
          value={trigger.in_status ?? ''}
          onChange={(v) => onChange({ ...trigger, in_status: v || undefined })}
          placeholder="Initial status (optional)"
          searchPlaceholder="Search…"
        />
      )}

      {trigger.type === 'field_changed' && (
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <div className="min-w-[140px] flex-1">
            <AutomationSolidSelect
              options={fieldSelectOptions}
              value={trigger.field_id}
              onChange={(field_id) => onChange({ ...trigger, field_id, to: undefined })}
              placeholder="Field"
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <AutomationSolidSelect
              options={fieldValueOptions}
              value={trigger.to ?? ''}
              onChange={(v) => onChange({ ...trigger, to: v || undefined })}
              placeholder="Becomes…"
              disabled={!trigger.field_id}
            />
          </div>
        </div>
      )}

      {trigger.type === 'priority_changed' && (
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <div className="min-w-[140px] flex-1">
            <AutomationSolidSelect
              options={optionalPrioritySolidOptions}
              value={trigger.from ?? ''}
              onChange={(v) =>
                onChange({ ...trigger, from: (v || undefined) as typeof trigger.from })
              }
              placeholder="From priority"
            />
          </div>
          <span className="typo-caption text-muted-foreground shrink-0">→</span>
          <div className="min-w-[140px] flex-1">
            <AutomationSolidSelect
              options={optionalPrioritySolidOptions}
              value={trigger.to ?? ''}
              onChange={(v) => onChange({ ...trigger, to: (v || undefined) as typeof trigger.to })}
              placeholder="To priority"
            />
          </div>
        </div>
      )}

      {trigger.type === 'assignee_changed' && (
        <div className="gap-spacing-2 flex flex-wrap items-center">
          <div className="min-w-[140px] flex-1">
            <AutomationSolidSelect
              options={assigneeKindOptions}
              value={trigger.assignee_type ?? ''}
              onChange={(assignee_type) =>
                onChange({
                  ...trigger,
                  assignee_type: (assignee_type || undefined) as typeof trigger.assignee_type,
                  assignee_id: undefined,
                })
              }
              placeholder="Assignee"
            />
          </div>
          {(trigger.assignee_type === 'human' || trigger.assignee_type === 'agent') && (
            <div className="min-w-[160px] flex-[2]">
              <AutomationRosterSelect
                roster={roster}
                mode={trigger.assignee_type}
                value={trigger.assignee_id ?? ''}
                onChange={(assignee_id) => onChange({ ...trigger, assignee_id })}
                placeholder={trigger.assignee_type === 'agent' ? 'Select agent' : 'Select person'}
              />
            </div>
          )}
        </div>
      )}

      {(trigger.type === 'due_date_changed' || trigger.type === 'start_date_changed') && (
        <div className="gap-spacing-2 flex w-full flex-wrap items-center">
          <div className="min-w-0 flex-1">
            <DueDateCell
              value={{ start_date: null, due_date: trigger.from ?? null, recurrence: null }}
              onChange={(patch) => onChange({ ...trigger, from: patch.due_date ?? undefined })}
              fullWidthCustomTrigger
              customTrigger={
                <span className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground hover:bg-hover-subtle flex w-full min-w-0 items-center border text-left transition-colors">
                  <span className="min-w-0 flex-1 truncate">
                    {trigger.from ? new Date(trigger.from).toLocaleDateString() : 'Any from date'}
                  </span>
                </span>
              }
            />
          </div>
          <span className="typo-caption text-muted-foreground shrink-0">→</span>
          <div className="min-w-0 flex-1">
            <DueDateCell
              value={{ start_date: null, due_date: trigger.to ?? null, recurrence: null }}
              onChange={(patch) => onChange({ ...trigger, to: patch.due_date ?? undefined })}
              fullWidthCustomTrigger
              customTrigger={
                <span className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground hover:bg-hover-subtle flex w-full min-w-0 items-center border text-left transition-colors">
                  <span className="min-w-0 flex-1 truncate">
                    {trigger.to ? new Date(trigger.to).toLocaleDateString() : 'Any target date'}
                  </span>
                </span>
              }
            />
          </div>
        </div>
      )}

      {(trigger.type === 'tag_added' || trigger.type === 'tag_removed') && (
        <AutomationSolidSelect
          options={tagOptions}
          value={trigger.tag ?? ''}
          onChange={(tag) => onChange({ ...trigger, tag: tag || undefined })}
          placeholder="Tag"
        />
      )}

      {trigger.type === 'form_submitted' && (
        <div className="space-y-2">
          <AutomationLazySelect
            value={trigger.form_id ?? ''}
            onChange={(form_id) => onChange({ ...trigger, form_id })}
            placeholder="Any form"
            searchPlaceholder="Search forms..."
            loadOptions={async ({ search, offset, limit }) => {
              const result = await searchAutomationForms({ campaignId, search, offset, limit })
              return {
                options: result.options.map((form) => ({
                  value: form.id,
                  label: form.label,
                  description: form.description,
                })),
                hasMore: result.hasMore,
              }
            }}
          />
          <input
            type="text"
            value={trigger.field_id ?? ''}
            onChange={(e) => onChange({ ...trigger, field_id: e.target.value || undefined })}
            placeholder="Answer field ID (optional)"
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 w-full border outline-none"
          />
          <input
            type="text"
            value={trigger.field_value ?? ''}
            onChange={(e) => onChange({ ...trigger, field_value: e.target.value || undefined })}
            placeholder="Answer value (optional)"
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 w-full border outline-none"
          />
        </div>
      )}

      {(trigger.type === 'contact_updated' ||
        trigger.type === 'contact_type_changed' ||
        trigger.type === 'contact_source_changed') && (
        <div className="gap-spacing-2 flex flex-wrap items-center">
          {trigger.type === 'contact_updated' && (
            <AutomationSolidSelect
              options={contactFieldOptions}
              value={trigger.field_id ?? ''}
              onChange={(field_id) => onChange({ ...trigger, field_id: field_id || undefined })}
              placeholder="Contact field"
            />
          )}
          {trigger.type === 'contact_type_changed' && (
            <div className="min-w-[160px] flex-1">
              <AutomationSolidSelect
                options={ensureOptionIncluded(contactsTriggerPickers.typeOptions, trigger.to)}
                value={trigger.to ?? ''}
                onChange={(to) => onChange({ ...trigger, to: to || undefined })}
                placeholder="New type (optional)"
              />
            </div>
          )}
          {trigger.type === 'contact_source_changed' && (
            <div className="min-w-[160px] flex-1">
              <AutomationSolidSelect
                options={ensureOptionIncluded(contactsTriggerPickers.sourceOptions, trigger.to)}
                value={trigger.to ?? ''}
                onChange={(to) => onChange({ ...trigger, to: to || undefined })}
                placeholder="New source (optional)"
              />
            </div>
          )}
          {trigger.type === 'contact_updated' && trigger.field_id === 'contact_type' && (
            <div className="min-w-[160px] flex-1">
              <AutomationSolidSelect
                options={ensureOptionIncluded(contactsTriggerPickers.typeOptions, trigger.to)}
                value={trigger.to ?? ''}
                onChange={(to) => onChange({ ...trigger, to: to || undefined })}
                placeholder="Becomes (optional)"
              />
            </div>
          )}
          {trigger.type === 'contact_updated' && trigger.field_id === 'contact_source' && (
            <div className="min-w-[160px] flex-1">
              <AutomationSolidSelect
                options={ensureOptionIncluded(contactsTriggerPickers.sourceOptions, trigger.to)}
                value={trigger.to ?? ''}
                onChange={(to) => onChange({ ...trigger, to: to || undefined })}
                placeholder="Becomes (optional)"
              />
            </div>
          )}
          {trigger.type === 'contact_updated' &&
            trigger.field_id !== 'contact_type' &&
            trigger.field_id !== 'contact_source' && (
              <input
                type="text"
                value={trigger.to ?? ''}
                onChange={(e) => onChange({ ...trigger, to: e.target.value || undefined })}
                placeholder="Becomes (optional)"
                className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 min-w-[160px] flex-1 border outline-none"
              />
            )}
        </div>
      )}

      {(trigger.type === 'contact_tag_added' || trigger.type === 'contact_tag_removed') && (
        <AutomationSolidSelect
          options={ensureOptionIncluded(contactsTriggerPickers.tagOptions, trigger.tag)}
          value={trigger.tag ?? ''}
          onChange={(tag) => onChange({ ...trigger, tag: tag || undefined })}
          placeholder="Tag"
        />
      )}

      {trigger.type === 'artifact_lifecycle' && (
        <div className="space-y-2">
          <AutomationSolidSelect
            options={artifactKindOptions}
            value={trigger.artifact_kind ?? ''}
            onChange={(artifact_kind) =>
              onChange({
                ...trigger,
                artifact_kind: (artifact_kind || undefined) as typeof trigger.artifact_kind,
              })
            }
            placeholder="Artifact type"
          />
          <AutomationSolidSelect
            options={artifactLifecycleOptions}
            value={trigger.lifecycle_event ?? ''}
            onChange={(lifecycle_event) => onChange({ ...trigger, lifecycle_event })}
            placeholder="Lifecycle event"
          />
          {trigger.artifact_kind ? (
            <AutomationLazySelect
              value={trigger.artifact_id ?? ''}
              onChange={(artifact_id) =>
                onChange({ ...trigger, artifact_id: artifact_id || undefined })
              }
              placeholder="Any artifact"
              searchPlaceholder="Search artifacts..."
              loadOptions={async ({ search, offset, limit }) => {
                const result = await searchAutomationArtifacts({
                  campaignId,
                  kind: trigger.artifact_kind,
                  search,
                  offset,
                  limit,
                })
                return {
                  options: result.options.map((artifact) => ({
                    value: artifact.id,
                    label: artifact.label,
                    description: artifact.description,
                  })),
                  hasMore: result.hasMore,
                }
              }}
            />
          ) : null}
        </div>
      )}

      {trigger.type === 'webhook_received' && (
        <WebhookTriggerEditor
          spaceId={spaceId}
          webhookEndpointId={trigger.webhook_endpoint_id}
          onChange={(webhook_endpoint_id) => onChange({ ...trigger, webhook_endpoint_id })}
        />
      )}

      {trigger.type === 'external_email_received' && (
        <div className="space-y-2">
          <AutomationSolidSelect
            options={emailProviderOptions}
            value={trigger.provider ?? 'gmail'}
            onChange={(provider) =>
              onChange({
                ...trigger,
                provider: provider as 'gmail' | 'outlook',
                trigger_slug:
                  provider === 'outlook' ? 'OUTLOOK_MESSAGE_TRIGGER' : 'GMAIL_NEW_GMAIL_MESSAGE',
                connected_account_id: '',
                gmail_category: provider === 'gmail' ? trigger.gmail_category : undefined,
              })
            }
            placeholder="Email provider"
          />
          <AutomationLazySelect
            value={trigger.connected_account_id ?? ''}
            onChange={(connected_account_id) => onChange({ ...trigger, connected_account_id })}
            placeholder="Connected account"
            searchPlaceholder="Search connected accounts..."
            loadOptions={async ({ search, offset, limit }) => {
              const result = await searchAutomationComposioAccounts({
                toolkit: trigger.provider ?? 'gmail',
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
          <div className="space-y-spacing-2">
            <div className="typo-caption text-muted-foreground font-medium">Filters</div>
            {trigger.gmail_category ? (
              <div className="space-y-spacing-1">
                <div className="typo-caption text-muted-foreground">Inbox category</div>
                <AutomationSolidSelect
                  options={[
                    ...gmailCategoryOptions,
                    { value: '', label: 'Remove inbox category filter' },
                  ]}
                  value={trigger.gmail_category}
                  onChange={(gmail_category) =>
                    onChange({
                      ...trigger,
                      gmail_category:
                        gmail_category === ''
                          ? undefined
                          : (gmail_category as typeof trigger.gmail_category),
                    })
                  }
                  placeholder="Inbox category"
                />
              </div>
            ) : null}
            {trigger.from_contains !== undefined ? (
              <div className="space-y-spacing-1">
                <div className="typo-caption text-muted-foreground">Sender contains</div>
                <input
                  type="text"
                  value={trigger.from_contains ?? ''}
                  onChange={(e) => onChange({ ...trigger, from_contains: e.target.value })}
                  placeholder="Sender contains"
                  className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 w-full border outline-none"
                />
              </div>
            ) : null}
            {trigger.subject_contains !== undefined ? (
              <div className="space-y-spacing-1">
                <div className="typo-caption text-muted-foreground">Subject contains</div>
                <input
                  type="text"
                  value={trigger.subject_contains ?? ''}
                  onChange={(e) => onChange({ ...trigger, subject_contains: e.target.value })}
                  placeholder="Subject contains"
                  className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 w-full border outline-none"
                />
              </div>
            ) : null}
            {emailFilterOptions.length > 0 ? (
              <AutomationSolidSelect
                options={emailFilterOptions.map((option) => ({
                  ...option,
                  leading: <Plus className="icon-sm" />,
                }))}
                value=""
                onChange={(filter) => {
                  if (filter === 'gmail_category')
                    onChange({ ...trigger, gmail_category: 'primary' })
                  if (filter === 'from_contains') onChange({ ...trigger, from_contains: '' })
                  if (filter === 'subject_contains') onChange({ ...trigger, subject_contains: '' })
                }}
                placeholder="Add filter"
                className="border-dashed"
              />
            ) : null}
          </div>
        </div>
      )}

      {trigger.type === 'external_slack_message_received' && (
        <div className="space-y-2">
          <AutomationSolidSelect
            options={slackTriggerOptions}
            value={trigger.trigger_slug ?? 'SLACK_RECEIVE_DIRECT_MESSAGE'}
            onChange={(trigger_slug) =>
              onChange({
                ...trigger,
                trigger_slug: trigger_slug as typeof trigger.trigger_slug,
              })
            }
            placeholder="Slack trigger"
          />
          <AutomationLazySelect
            value={trigger.connected_account_id ?? ''}
            onChange={(connected_account_id) => onChange({ ...trigger, connected_account_id })}
            placeholder="Connected Slack account"
            searchPlaceholder="Search Slack accounts..."
            loadOptions={async ({ search, offset, limit }) => {
              const result = await searchAutomationComposioAccounts({
                toolkit: 'slack',
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
          <AutomationLazySelect
            value={trigger.channel_id ?? ''}
            onChange={(channel_id) => onChange({ ...trigger, channel_id: channel_id || undefined })}
            placeholder="Any channel"
            searchPlaceholder="Search channels..."
            loadOptions={async ({ search, offset, limit }) => {
              const result = await searchAutomationChannels({ search, offset, limit })
              return {
                options: result.options.map((channel) => ({
                  value: channel.id,
                  label: channel.label,
                  description: channel.description,
                })),
                hasMore: result.hasMore,
              }
            }}
          />
          <input
            type="text"
            value={trigger.text_contains ?? ''}
            onChange={(e) => onChange({ ...trigger, text_contains: e.target.value || undefined })}
            placeholder="Message contains (optional)"
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 w-full border outline-none"
          />
        </div>
      )}

      {trigger.type === 'external_app_event' && (
        <div className="space-y-2">
          <AutomationSolidSelect
            options={CONNECTED_APP_FLOW_PROVIDERS.map((provider) => ({
              value: provider,
              label: getConnectedAppFlowProviderLabel(provider),
            }))}
            value={trigger.provider ?? 'googlecalendar'}
            onChange={(provider) => {
              const nextProvider = provider as ConnectedAppFlowProvider
              const events = listConnectedAppFlowTriggersByProvider(nextProvider)
              onChange({
                type: 'external_app_event',
                provider: nextProvider,
                trigger_slug: events[0]?.triggerSlug ?? '',
                connected_account_id: '',
                trigger_config: undefined,
              })
            }}
            placeholder="App"
          />
          <AutomationSolidSelect
            options={listConnectedAppFlowTriggersByProvider(
              trigger.provider ?? 'googlecalendar',
            ).map((entry) => ({
              value: entry.triggerSlug,
              label: entry.eventLabel,
            }))}
            value={trigger.trigger_slug ?? ''}
            onChange={(trigger_slug) => {
              const meta = getConnectedAppFlowTriggerBySlug(trigger_slug)
              onChange({
                ...trigger,
                provider: meta?.provider ?? trigger.provider,
                trigger_slug: trigger_slug || undefined,
                trigger_config: undefined,
              })
            }}
            placeholder="Event"
          />
          {connectedAppRequiredConfigKeys.map((key) => (
            <div key={key} className="space-y-spacing-1">
              <div className="typo-caption text-muted-foreground">
                {connectedAppConfigLabel(key)}
              </div>
              <input
                type="text"
                value={String(connectedAppTriggerConfig[key] ?? '')}
                onChange={(e) =>
                  onChange({
                    ...trigger,
                    trigger_config: {
                      ...connectedAppTriggerConfig,
                      [key]: e.target.value,
                    },
                  })
                }
                placeholder={connectedAppConfigPlaceholder(key)}
                className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 w-full border outline-none"
              />
            </div>
          ))}
          <AutomationLazySelect
            value={trigger.connected_account_id ?? ''}
            onChange={(connected_account_id) => onChange({ ...trigger, connected_account_id })}
            placeholder="Connected account"
            searchPlaceholder="Search connected accounts..."
            loadOptions={async ({ search, offset, limit }) => {
              const result = await searchAutomationComposioAccounts({
                toolkit: trigger.provider ?? 'googlecalendar',
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
        </div>
      )}

      {trigger.type === 'external_fathom_recording_ready' && (
        <div className="space-y-2">
          <FathomSourcePicker
            spaceId={spaceId}
            value={trigger.source}
            onChange={(source) => onChange({ ...trigger, source })}
          />
          <input
            type="text"
            value={trigger.title_contains ?? ''}
            onChange={(e) => onChange({ ...trigger, title_contains: e.target.value || undefined })}
            placeholder="Meeting title contains (optional)"
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 w-full border outline-none"
          />
          <input
            type="text"
            value={trigger.recorded_by_contains ?? ''}
            onChange={(e) =>
              onChange({ ...trigger, recorded_by_contains: e.target.value || undefined })
            }
            placeholder="Recorded by contains (optional)"
            className="body-3 h-spacing-10 rounded-spacing-2 border-border bg-background px-spacing-3 text-foreground placeholder:text-muted-foreground/60 w-full border outline-none"
          />
        </div>
      )}

      {trigger.type === 'schedule' && (
        <ScheduleTriggerEditor
          schedule={trigger.schedule}
          timezone={trigger.timezone}
          onChange={({ schedule, timezone }) => onChange({ type: 'schedule', schedule, timezone })}
        />
      )}
        </>
      )}
    </div>
  )
}

/**
 * Picks WHICH Fathom feeds the rule. One dropdown lists every connected source
 * visible to the requester, grouped by People (self + org-shared individuals)
 * and Teams (only teams with at least one Fathom-connected member). The
 * dropdown value encodes the discriminated union from `FathomSourceSchema`:
 *   "self"
 *   "user:<user_integrations.id>"
 *   "team:<agent_teams.id>"
 * Decoded back to `{ mode, ... }` on change. Server-side validation
 * (`assertCanUseFathomSource`) still gates `user`/`team` picks to org admins.
 */
const FATHOM_SOURCE_SELF_VALUE = 'self'
const FATHOM_SOURCE_USER_PREFIX = 'user:'
const FATHOM_SOURCE_TEAM_PREFIX = 'team:'

function encodeFathomSourceValue(value: FathomTriggerSource | undefined): string {
  if (value?.mode === 'user' && value.user_integration_id) {
    return `${FATHOM_SOURCE_USER_PREFIX}${value.user_integration_id}`
  }
  if (value?.mode === 'team' && value.team_id) {
    return `${FATHOM_SOURCE_TEAM_PREFIX}${value.team_id}`
  }
  return FATHOM_SOURCE_SELF_VALUE
}

function decodeFathomSourceValue(raw: string): FathomTriggerSource {
  if (raw.startsWith(FATHOM_SOURCE_USER_PREFIX)) {
    return { mode: 'user', user_integration_id: raw.slice(FATHOM_SOURCE_USER_PREFIX.length) }
  }
  if (raw.startsWith(FATHOM_SOURCE_TEAM_PREFIX)) {
    return { mode: 'team', team_id: raw.slice(FATHOM_SOURCE_TEAM_PREFIX.length) }
  }
  return { mode: 'self' }
}

function FathomSourcePicker({
  spaceId,
  value,
  onChange,
}: {
  spaceId: string
  value: FathomTriggerSource | undefined
  onChange: (next: FathomTriggerSource) => void
}) {
  const [sources, setSources] = useState<FathomSourceOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchFathomSources(spaceId)
      .then((data) => {
        if (cancelled) return
        setSources(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load Fathom sources')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [spaceId])

  const sections: AutomationCategorizedSection[] = useMemo(() => {
    const peopleOptions: AutomationCategorizedOption[] = []
    if (sources?.self) {
      peopleOptions.push({ value: FATHOM_SOURCE_SELF_VALUE, label: 'My Fathom' })
    }
    for (const u of sources?.users ?? []) {
      peopleOptions.push({
        value: `${FATHOM_SOURCE_USER_PREFIX}${u.user_integration_id}`,
        label: u.display_name,
        description: 'Shared',
      })
    }
    const teamOptions: AutomationCategorizedOption[] = (sources?.teams ?? []).map((t) => ({
      value: `${FATHOM_SOURCE_TEAM_PREFIX}${t.team_id}`,
      label: t.name,
    }))

    const out: AutomationCategorizedSection[] = []
    if (peopleOptions.length > 0) out.push({ heading: 'People', options: peopleOptions })
    if (teamOptions.length > 0) out.push({ heading: 'Teams', options: teamOptions })
    return out
  }, [sources])

  if (loading) {
    return (
      <div className="body-3 text-muted-foreground rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 border">
        Loading Fathom sources…
      </div>
    )
  }

  if (sections.length === 0) {
    return (
      <div className="body-3 text-muted-foreground rounded-spacing-2 border-border bg-background px-spacing-3 py-spacing-2 border">
        No Fathom connections available. Connect Fathom in integration settings.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="body-3 text-muted-foreground font-medium">Listen to</label>
      <AutomationCategorizedSelect
        sections={sections}
        value={encodeFathomSourceValue(value)}
        onChange={(v) => onChange(decodeFathomSourceValue(v))}
        placeholder="Select Fathom source"
        searchPlaceholder="Search Fathom sources…"
      />
      {error && <p className="body-3 text-destructive">{error}</p>}
    </div>
  )
}
