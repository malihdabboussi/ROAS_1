'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronLeft, Loader2 } from 'lucide-react'
import { useWorkspaceSettingsModal } from '@/features/settings'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import {
  collectSelectedTagIds,
  ensurePageGraderTagOption,
  FALLBACK_PAGE_GRADER_TASK_TYPES,
  resolveDefaultPageGraderClientId,
  type PageGraderClientScopeMap,
  type PageGraderTaskTypeOption,
} from '../lib/page-grader-client-tag'
import {
  buildPageGraderSendPreviews,
  resolvePageGraderAssigneeSuggestion,
  resolveSharedPageGraderDueDate,
  type PageGraderAssigneeOption,
} from '../lib/page-grader-send-preview'
import {
  listPageGraderAssignees,
  listPageGraderClients,
  listPageGraderTaskTypes,
  savePageGraderClientScopeMap,
  type PageGraderClient,
} from '../services/page-grader-send.service'
import type { SpaceItem } from '../types'
import type { FieldDef, SelectOption } from '../types/space-schema'

type Step = 'client' | 'type' | 'assignee' | 'preview'

type Props = {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  selectedCount: number
  selectedItems: SpaceItem[]
  roster: TeamRosterEntry[]
  spaceId: string | null
  campaignId: string | null
  campaignName: string | null
  tagsField?: FieldDef
  attendeesField?: FieldDef
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onClose: () => void
  onSend: (input: {
    clientId: string
    clientName: string
    taskType: string
    note: string
    dueDate: string
    clientTagId: string
    clientTagLabel: string
    assignee: {
      pageGraderUserId?: string
      email?: string
      name?: string
    } | null
  }) => Promise<void>
}

function isNotConnectedError(message: string | null): boolean {
  if (!message) return false
  return /page grader is not connected/i.test(message)
}

function stepSubtitle(step: Step, selectedCount: number): string {
  if (step === 'client') return `${selectedCount} task${selectedCount > 1 ? 's' : ''} → pick a client`
  if (step === 'type') return 'What type of request is this?'
  if (step === 'assignee') return 'Who should own this in Page Grader?'
  return 'Preview before sending'
}

export function PageGraderBulkSendPanel({
  anchorRef,
  selectedCount,
  selectedItems,
  roster,
  spaceId,
  campaignId,
  campaignName,
  tagsField,
  attendeesField,
  onCreateOption,
  onClose,
  onSend,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [step, setStep] = useState<Step>('client')
  const [clients, setClients] = useState<PageGraderClient[]>([])
  const [clientScopeMap, setClientScopeMap] = useState<PageGraderClientScopeMap>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [taskTypes, setTaskTypes] = useState<PageGraderTaskTypeOption[]>(
    FALLBACK_PAGE_GRADER_TASK_TYPES,
  )
  const [taskTypesLoading, setTaskTypesLoading] = useState(false)
  const [selectedTaskTypeId, setSelectedTaskTypeId] = useState<string | null>(null)
  const [assignees, setAssignees] = useState<PageGraderAssigneeOption[]>([])
  const [assigneesLoading, setAssigneesLoading] = useState(false)
  const [assigneeQuery, setAssigneeQuery] = useState('')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [dueDate, setDueDate] = useState(() => resolveSharedPageGraderDueDate(selectedItems))
  const [sending, setSending] = useState(false)
  const [rememberCampaign, setRememberCampaign] = useState(true)
  const defaultAppliedRef = useRef(false)
  const assigneeDefaultAppliedRef = useRef(false)

  const tagOptions = tagsField?.options ?? []
  const selectedTagIds = useMemo(() => collectSelectedTagIds(selectedItems), [selectedItems])

  const hasExistingCampaignMap = useMemo(() => {
    if (!campaignId) return false
    return Object.values(clientScopeMap).some((row) => row.campaign_id === campaignId)
  }, [campaignId, clientScopeMap])

  useLayoutEffect(() => {
    if (!anchorRef.current) return
    const width = 320
    const rect = anchorRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.top
    const placeAbove = spaceBelow < 480 && rect.top > 480
    const rawLeft = rect.left + rect.width / 2 - width / 2
    const maxLeft = window.innerWidth - width - 8
    setPos({
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rawLeft, maxLeft)),
    })
  }, [anchorRef])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!panelRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, anchorRef])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void listPageGraderClients()
      .then((res) => {
        if (cancelled) return
        setClients(res.clients)
        setClientScopeMap(res.clientScopeMap)
        if (!defaultAppliedRef.current) {
          const preferred = resolveDefaultPageGraderClientId({
            clients: res.clients,
            clientTagMap: res.clientTagMap,
            clientScopeMap: res.clientScopeMap,
            selectedTagIds,
            tagOptions,
            spaceId,
            campaignId,
            campaignName,
          })
          setSelectedClientId(preferred ?? res.clients[0]?.id ?? null)
          defaultAppliedRef.current = true
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Could not load Page Grader clients')
        setClients([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (step !== 'type') return
    let cancelled = false
    setTaskTypesLoading(true)
    void listPageGraderTaskTypes()
      .then((types) => {
        if (cancelled) return
        setTaskTypes(types)
        setSelectedTaskTypeId((prev) => {
          if (prev && types.some((t) => t.id === prev)) return prev
          return types[0]?.id ?? null
        })
      })
      .catch(() => {
        if (cancelled) return
        setTaskTypes(FALLBACK_PAGE_GRADER_TASK_TYPES)
        setSelectedTaskTypeId((prev) => prev ?? FALLBACK_PAGE_GRADER_TASK_TYPES[0]?.id ?? null)
      })
      .finally(() => {
        if (!cancelled) setTaskTypesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [step])

  useEffect(() => {
    if (step !== 'assignee') return
    let cancelled = false
    setAssigneesLoading(true)
    void listPageGraderAssignees()
      .then((rows) => {
        if (cancelled) return
        setAssignees(rows)
        if (!assigneeDefaultAppliedRef.current) {
          const suggested = resolvePageGraderAssigneeSuggestion({
            selectedItems,
            roster,
            assignees: rows,
            attendeesField,
          })
          setSelectedAssigneeId(suggested)
          assigneeDefaultAppliedRef.current = true
        }
      })
      .catch(() => {
        if (cancelled) return
        setAssignees([])
      })
      .finally(() => {
        if (!cancelled) setAssigneesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [step, selectedItems, roster, attendeesField])

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null
  const selectedTaskType = taskTypes.find((t) => t.id === selectedTaskTypeId) ?? null
  const selectedAssignee =
    selectedAssigneeId == null
      ? null
      : (assignees.find((a) => a.id === selectedAssigneeId) ?? null)
  const needsConnect = isNotConnectedError(loadError)

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((client) => client.name.toLowerCase().includes(q))
  }, [clients, query])

  const filteredAssignees = useMemo(() => {
    const q = assigneeQuery.trim().toLowerCase()
    if (!q) return assignees
    return assignees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.email ? a.email.toLowerCase().includes(q) : false),
    )
  }, [assignees, assigneeQuery])

  const previews = useMemo(
    () => buildPageGraderSendPreviews(selectedItems, note, dueDate),
    [selectedItems, note, dueDate],
  )

  const runSend = async () => {
    if (!selectedClient || !selectedTaskType) return
    const option = ensurePageGraderTagOption(selectedClient.name, tagOptions)
    if (tagsField && onCreateOption && !tagOptions.some((o) => o.id === option.id)) {
      onCreateOption('tags', option)
    }
    setSending(true)
    try {
      if (rememberCampaign && campaignId && campaignName) {
        const nextMappings = Object.entries(clientScopeMap)
          .filter(([, row]) => row.campaign_id !== campaignId)
          .map(([id, row]) => ({
            clientId: id,
            campaignId: row.campaign_id,
            campaignName: row.campaign_name,
            spaceId: row.space_id ?? null,
            spaceTitle: row.space_title ?? null,
          }))
        nextMappings.push({
          clientId: selectedClient.id,
          campaignId,
          campaignName,
          spaceId: null,
          spaceTitle: null,
        })
        await savePageGraderClientScopeMap(nextMappings).catch(() => undefined)
      }
      await onSend({
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        taskType: selectedTaskType.id,
        note,
        dueDate: dueDate.trim().slice(0, 10),
        clientTagId: option.id,
        clientTagLabel: option.label,
        assignee: selectedAssignee
          ? {
              pageGraderUserId: selectedAssignee.id,
              ...(selectedAssignee.email ? { email: selectedAssignee.email } : {}),
              name: selectedAssignee.name,
            }
          : null,
      })
    } finally {
      setSending(false)
    }
  }

  if (!pos) return null

  return createPortal(
    <div
      ref={panelRef}
      className="dropdown-menu-solid fixed flex max-h-[520px] w-[320px] flex-col overflow-hidden"
      style={{
        top: pos.top,
        left: pos.left,
        zIndex: 100000,
        transform: pos.top < 100 ? undefined : 'translateY(-100%)',
      }}
    >
      <div className="border-border border-b px-3 py-2">
        <p className="text-foreground text-xs font-medium">Send to Page Grader</p>
        <p className="text-muted-foreground text-xs">{stepSubtitle(step, selectedCount)}</p>
      </div>

      {step === 'client' ? (
        <>
          <div className="border-border border-b px-3 py-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients"
              className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-2 py-1.5 text-xs outline-none"
              disabled={needsConnect}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
            {loading ? (
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading clients…
              </div>
            ) : needsConnect ? (
              <div className="space-y-spacing-2 px-2 py-3">
                <p className="text-foreground text-xs">
                  Connect Page Grader in Settings first (API Base URL + API key), then send tasks
                  here.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    openWorkspaceSettings('integrations', {
                      integrationsFocusIntegrationId: 'page_grader',
                    })
                  }}
                  className="button-glass-accent w-full rounded-md px-2 py-1.5 text-xs font-medium"
                >
                  Open Integrations
                </button>
              </div>
            ) : loadError ? (
              <p className="text-destructive px-2 py-3 text-xs">{loadError}</p>
            ) : filteredClients.length === 0 ? (
              <p className="text-muted-foreground px-2 py-3 text-xs">
                {clients.length === 0 ? 'No clients found.' : 'No clients match your search.'}
              </p>
            ) : (
              filteredClients.map((client) => {
                const selected = client.id === selectedClientId
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClientId(client.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                      selected
                        ? 'bg-secondary text-foreground'
                        : 'text-foreground hover:bg-hover-subtle',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{client.name}</span>
                    {selected ? <Check className="text-foreground h-3.5 w-3.5 shrink-0" /> : null}
                  </button>
                )
              })
            )}
          </div>
          <div className="border-border border-t px-3 py-2">
            {selectedClient ? (
              <div className="bg-secondary mb-2 flex items-center gap-2 rounded-md px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                    Selected client
                  </p>
                  <p className="text-foreground truncate text-xs font-medium">
                    {selectedClient.name}
                  </p>
                </div>
                <Check className="text-foreground h-3.5 w-3.5 shrink-0" />
              </div>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:bg-hover-subtle flex-1 rounded-md px-2 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedClientId || loading || needsConnect}
                onClick={() => setStep('type')}
                className="button-glass-accent flex-1 rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        </>
      ) : null}

      {step === 'type' ? (
        <>
          <div className="border-border space-y-spacing-2 border-b px-3 py-2">
            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              Client
            </p>
            <p className="text-foreground truncate text-xs font-medium">
              {selectedClient?.name ?? 'Selected client'}
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1 py-1">
            {taskTypesLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading request types…
              </div>
            ) : (
              taskTypes.map((kind) => {
                const selected = selectedTaskTypeId === kind.id
                return (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => setSelectedTaskTypeId(kind.id)}
                    className={cn(
                      'flex w-full flex-col rounded-md px-2 py-2 text-left',
                      selected
                        ? 'bg-secondary text-foreground'
                        : 'text-foreground hover:bg-hover-subtle',
                    )}
                  >
                    <span className="flex items-center gap-2 text-xs font-medium">
                      <span className="min-w-0 flex-1">{kind.label}</span>
                      {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                    </span>
                    {kind.hint ? (
                      <span className="text-muted-foreground mt-0.5 text-[11px]">{kind.hint}</span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
          <div className="border-border border-t px-3 py-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('client')}
                className="text-muted-foreground hover:bg-hover-subtle flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                type="button"
                disabled={!selectedTaskType || taskTypesLoading}
                onClick={() => setStep('assignee')}
                className="button-glass-accent flex-1 rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        </>
      ) : null}

      {step === 'assignee' ? (
        <>
          <div className="border-border border-b px-3 py-2">
            <input
              type="search"
              value={assigneeQuery}
              onChange={(e) => setAssigneeQuery(e.target.value)}
              placeholder="Search assignees"
              className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-md border px-2 py-1.5 text-xs outline-none"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
            {assigneesLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 px-2 py-3 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading assignees…
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedAssigneeId(null)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs',
                    selectedAssigneeId == null
                      ? 'bg-secondary text-foreground'
                      : 'text-foreground hover:bg-hover-subtle',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">Unassigned</span>
                  {selectedAssigneeId == null ? (
                    <Check className="h-3.5 w-3.5 shrink-0" />
                  ) : null}
                </button>
                {filteredAssignees.map((person) => {
                  const selected = person.id === selectedAssigneeId
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setSelectedAssigneeId(person.id)}
                      className={cn(
                        'flex w-full flex-col rounded-md px-2 py-1.5 text-left',
                        selected
                          ? 'bg-secondary text-foreground'
                          : 'text-foreground hover:bg-hover-subtle',
                      )}
                    >
                      <span className="flex items-center gap-2 text-xs font-medium">
                        <span className="min-w-0 flex-1 truncate">{person.name}</span>
                        {selected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                      </span>
                      {person.email ? (
                        <span className="text-muted-foreground truncate text-[11px]">
                          {person.email}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
                {!assigneesLoading && filteredAssignees.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-3 text-xs">
                    No Page Grader people match. Leave Unassigned or clear search.
                  </p>
                ) : null}
              </>
            )}
          </div>
          <div className="border-border border-t px-3 py-2">
            <div className="bg-secondary mb-2 rounded-md px-2 py-1.5">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Selected assignee
              </p>
              <p className="text-foreground truncate text-xs font-medium">
                {selectedAssignee?.name ?? 'Unassigned'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('type')}
                className="text-muted-foreground hover:bg-hover-subtle flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                type="button"
                disabled={assigneesLoading}
                onClick={() => setStep('preview')}
                className="button-glass-accent flex-1 rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        </>
      ) : null}

      {step === 'preview' ? (
        <>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
            <div className="space-y-1">
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Summary
              </p>
              <p className="text-foreground text-xs">
                {selectedClient?.name} · {selectedTaskType?.label} ·{' '}
                {selectedAssignee?.name ?? 'Unassigned'}
              </p>
            </div>
            {previews.map((row) => (
              <div key={row.spaceItemId} className="border-border rounded-md border px-2 py-2">
                <p className="text-foreground text-xs font-medium">{row.title}</p>
                {row.priority || row.dueDate ? (
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {[row.priority, row.dueDate].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-1 line-clamp-4 whitespace-pre-wrap text-[11px]">
                  {row.description || 'No description/notes on this Space task.'}
                </p>
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Deadline
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border-border bg-background text-foreground w-full rounded-md border px-2 py-1.5 text-xs outline-none"
              />
              <p className="text-muted-foreground text-[10px]">
                Saves on the ROAS task and Page Grader Deadline.
              </p>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note (saved on ROAS task + Page Grader)"
              rows={2}
              className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-md border px-2 py-1.5 text-xs outline-none"
            />
            {campaignId && campaignName ? (
              <label className="text-muted-foreground flex items-start gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={rememberCampaign}
                  onChange={(e) => setRememberCampaign(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  {hasExistingCampaignMap
                    ? `Update map: ${campaignName} → this client`
                    : `Map ${campaignName} campaign to this client`}
                </span>
              </label>
            ) : null}
          </div>
          <div className="border-border border-t px-3 py-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('assignee')}
                className="text-muted-foreground hover:bg-hover-subtle flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                type="button"
                disabled={!selectedClient || !selectedTaskType || sending}
                onClick={() => void runSend().catch(() => undefined)}
                className="button-glass-accent flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>,
    document.body,
  )
}
