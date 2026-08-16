'use client'

import { useMemo, useState } from 'react'
import type {
  PublicWorkRequestDraft,
  WorkRequestOptions,
  WorkRequestPriority,
  WorkRequestType,
  WorkRequestUpdate,
} from '@/lib/work-requests'
import { WORK_REQUEST_ERRORS } from '../config/errors.config'
import { WORK_REQUEST_MESSAGES } from '../config/messages.config'

const REQUEST_TYPES: Array<{ id: WorkRequestType; label: string }> = [
  { id: 'design', label: 'Design' },
  { id: 'copy', label: 'Copy' },
  { id: 'funnel', label: 'Funnel' },
  { id: 'ghl', label: 'GoHighLevel' },
  { id: 'ad', label: 'Ads' },
  { id: 'video', label: 'Video' },
  { id: 'general', label: 'General' },
  { id: 'other', label: 'Other' },
]

const KNOWN_REQUIRED_FIELDS = new Set([
  'title',
  'description',
  'due_date',
  'priority',
  'campaign_space_id',
  'general_space_id',
  'links',
  'assets',
  'dependencies',
])

type Props = {
  draft: PublicWorkRequestDraft
  options: WorkRequestOptions
  onSave: (update: WorkRequestUpdate) => Promise<void>
  onSubmit: (update: WorkRequestUpdate) => Promise<void>
}

export function WorkRequestReviewForm({ draft, options, onSave, onSubmit }: Props) {
  const [clientWorkspaceId, setClientWorkspaceId] = useState(draft.client_workspace_id)
  const [campaignSpaceId, setCampaignSpaceId] = useState(draft.campaign_space_id ?? '')
  const [requestType, setRequestType] = useState(draft.request_type)
  const [assigneeName, setAssigneeName] = useState(draft.assignee_name ?? '')
  const [title, setTitle] = useState(draft.title)
  const [description, setDescription] = useState(draft.description ?? '')
  const [dueDate, setDueDate] = useState(draft.due_date ?? '')
  const [priority, setPriority] = useState<WorkRequestPriority>(draft.priority)
  const [links, setLinks] = useState(draft.links.join('\n'))
  const [assets, setAssets] = useState(
    draft.assets.map((asset) => `${asset.name} | ${asset.url}`).join('\n'),
  )
  const [dependencies, setDependencies] = useState(
    draft.dependencies
      .map((dependency) => `${dependency.title}${dependency.url ? ` | ${dependency.url}` : ''}`)
      .join('\n'),
  )
  const [structuredFields, setStructuredFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(draft.structured_fields).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value),
      ]),
    ),
  )
  const [busy, setBusy] = useState<'save' | 'submit' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const campaignSpaces = useMemo(
    () =>
      options.campaign_spaces.filter((space) => space.client_workspace_id === clientWorkspaceId),
    [clientWorkspaceId, options.campaign_spaces],
  )
  const customRequiredFields = draft.required_fields.filter(
    (field) => !KNOWN_REQUIRED_FIELDS.has(field),
  )

  const buildUpdate = (): WorkRequestUpdate => ({
    client_workspace_id: clientWorkspaceId,
    campaign_space_id: campaignSpaceId || null,
    request_type: requestType,
    assignee_name: assigneeName.trim() || null,
    title,
    description: description || null,
    due_date: dueDate || null,
    priority,
    links: lines(links),
    assets: pairs(assets).map(({ left, right }) => ({
      name: left,
      url: right,
    })),
    dependencies: pairs(dependencies, true).map(({ left, right }) => ({
      title: left,
      ...(right ? { url: right } : {}),
    })),
    structured_fields: structuredFields,
  })

  const run = async (kind: 'save' | 'submit') => {
    setBusy(kind)
    setError(null)
    setSaved(false)
    try {
      if (kind === 'save') {
        await onSave(buildUpdate())
        setSaved(true)
      } else {
        await onSubmit(buildUpdate())
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : kind === 'save'
            ? WORK_REQUEST_ERRORS.SAVE_FAILED.userMessage
            : WORK_REQUEST_ERRORS.FINALIZE_FAILED.userMessage,
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <form
      className="space-y-spacing-6"
      onSubmit={(event) => {
        event.preventDefault()
        void run('submit')
      }}
    >
      {draft.missing_fields.length > 0 && (
        <section className="bg-warning/10 border-warning rounded-spacing-2 p-spacing-4 space-y-spacing-2 border">
          <h2 className="body-2 font-semibold">Missing context</h2>
          <div className="gap-spacing-2 flex flex-wrap">
            {draft.missing_fields.map((field) => (
              <span key={field} className="badge-glass badge-glass-orange typo-caption">
                {humanize(field)}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="gap-spacing-4 grid md:grid-cols-2">
        <Field label="Client workspace">
          <select
            value={clientWorkspaceId}
            onChange={(event) => {
              setClientWorkspaceId(event.target.value)
              setCampaignSpaceId('')
            }}
            className={inputClass}
          >
            {options.client_workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Campaign Space">
          <select
            value={campaignSpaceId}
            onChange={(event) => setCampaignSpaceId(event.target.value)}
            className={inputClass}
          >
            <option value="">General client work</option>
            {campaignSpaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Request type">
          <select
            value={requestType}
            onChange={(event) => setRequestType(event.target.value as WorkRequestType)}
            className={inputClass}
          >
            {REQUEST_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as WorkRequestPriority)}
            className={inputClass}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </Field>
        <Field label="Requested assignee">
          <input
            value={assigneeName}
            onChange={(event) => setAssigneeName(event.target.value)}
            maxLength={300}
            placeholder="Optional"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Title">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={1000}
          required
          className={inputClass}
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={20_000}
          rows={7}
          className={textareaClass}
        />
      </Field>

      <div className="gap-spacing-4 grid md:grid-cols-2">
        <Field label="Due date">
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Links" hint="One URL per line">
          <textarea
            value={links}
            onChange={(event) => setLinks(event.target.value)}
            rows={3}
            className={textareaClass}
          />
        </Field>
      </div>

      {customRequiredFields.length > 0 && (
        <section className="space-y-spacing-4">
          <h2 className="body-1 font-semibold">Request details</h2>
          <div className="gap-spacing-4 grid md:grid-cols-2">
            {customRequiredFields.map((field) => (
              <Field key={field} label={humanize(field)}>
                <input
                  value={structuredFields[field] ?? ''}
                  onChange={(event) =>
                    setStructuredFields((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </Field>
            ))}
          </div>
        </section>
      )}

      <div className="gap-spacing-4 grid md:grid-cols-2">
        <Field label="Assets" hint="One per line: Name | URL">
          <textarea
            value={assets}
            onChange={(event) => setAssets(event.target.value)}
            rows={5}
            className={textareaClass}
          />
        </Field>
        <Field label="Dependencies" hint="One per line: Title | URL (optional)">
          <textarea
            value={dependencies}
            onChange={(event) => setDependencies(event.target.value)}
            rows={5}
            className={textareaClass}
          />
        </Field>
      </div>

      {error && (
        <p className="bg-destructive/10 border-destructive text-destructive rounded-spacing-2 p-spacing-3 body-3 border">
          {error}
        </p>
      )}
      {saved && <p className="text-success body-3">{WORK_REQUEST_MESSAGES.saved}</p>}

      <div className="gap-spacing-3 border-border pt-spacing-4 flex flex-col-reverse border-t sm:flex-row sm:justify-end">
        <button
          type="button"
          className="button-default button-glass-neutral"
          disabled={busy !== null}
          onClick={() => void run('save')}
        >
          {busy === 'save' ? WORK_REQUEST_MESSAGES.saving : 'Save draft'}
        </button>
        <button
          type="submit"
          className="button-default button-glass-primary"
          disabled={busy !== null}
        >
          {busy === 'submit' ? WORK_REQUEST_MESSAGES.submitting : 'Review & Submit'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="space-y-spacing-2 block">
      <span className="body-2 text-foreground block font-medium">{label}</span>
      {hint && <span className="body-4 text-muted-foreground block">{hint}</span>}
      {children}
    </label>
  )
}

const inputClass =
  'h-spacing-9 px-spacing-3 body-3 rounded-spacing-2 border border-border bg-background text-foreground w-full outline-none focus:ring-2 focus:ring-ring'
const textareaClass =
  'px-spacing-3 py-spacing-2 body-3 rounded-spacing-2 border border-border bg-background text-foreground w-full resize-y outline-none focus:ring-2 focus:ring-ring'

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 25)
}

function pairs(value: string, rightOptional = false) {
  return lines(value).flatMap((line) => {
    const [left, ...rest] = line.split('|')
    const right = rest.join('|').trim()
    if (!left?.trim() || (!right && !rightOptional)) return []
    return [{ left: left.trim(), right }]
  })
}

function humanize(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}
