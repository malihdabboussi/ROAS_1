'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWorkspaceSettingsModal } from '@/lib/settings'
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
import {
  isNotConnectedError,
  stepSubtitle,
  type PageGraderBulkStep,
} from './page-grader-bulk-send/page-grader-bulk-send-helpers'
import { PageGraderBulkAssigneeStep } from './page-grader-bulk-send/PageGraderBulkAssigneeStep'
import { PageGraderBulkClientStep } from './page-grader-bulk-send/PageGraderBulkClientStep'
import { PageGraderBulkPreviewStep } from './page-grader-bulk-send/PageGraderBulkPreviewStep'
import { PageGraderBulkTypeStep } from './page-grader-bulk-send/PageGraderBulkTypeStep'
import type { PageGraderBulkSendPanelProps } from './page-grader-bulk-send/types'

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
}: PageGraderBulkSendPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [step, setStep] = useState<PageGraderBulkStep>('client')
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
        setLoadError(err instanceof Error ? err.message : 'Could not load The ROAS Portal clients')
        setClients([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
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
    selectedAssigneeId == null ? null : (assignees.find((a) => a.id === selectedAssigneeId) ?? null)
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
        a.name.toLowerCase().includes(q) || (a.email ? a.email.toLowerCase().includes(q) : false),
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
        <p className="text-foreground text-xs font-medium">Send to The ROAS Portal</p>
        <p className="text-muted-foreground text-xs">{stepSubtitle(step, selectedCount)}</p>
      </div>

      {step === 'client' ? (
        <PageGraderBulkClientStep
          query={query}
          setQuery={setQuery}
          loading={loading}
          needsConnect={needsConnect}
          loadError={loadError}
          clients={clients}
          filteredClients={filteredClients}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
          selectedClient={selectedClient}
          onClose={onClose}
          openIntegrations={() => {
            onClose()
            openWorkspaceSettings('integrations', {
              integrationsFocusIntegrationId: 'page_grader',
            })
          }}
          onContinue={() => setStep('type')}
        />
      ) : null}

      {step === 'type' ? (
        <PageGraderBulkTypeStep
          selectedClient={selectedClient}
          taskTypesLoading={taskTypesLoading}
          taskTypes={taskTypes}
          selectedTaskTypeId={selectedTaskTypeId}
          setSelectedTaskTypeId={setSelectedTaskTypeId}
          selectedTaskType={selectedTaskType}
          onBack={() => setStep('client')}
          onContinue={() => setStep('assignee')}
        />
      ) : null}

      {step === 'assignee' ? (
        <PageGraderBulkAssigneeStep
          assigneeQuery={assigneeQuery}
          setAssigneeQuery={setAssigneeQuery}
          assigneesLoading={assigneesLoading}
          filteredAssignees={filteredAssignees}
          selectedAssigneeId={selectedAssigneeId}
          setSelectedAssigneeId={setSelectedAssigneeId}
          selectedAssignee={selectedAssignee}
          onBack={() => setStep('type')}
          onContinue={() => setStep('preview')}
        />
      ) : null}

      {step === 'preview' ? (
        <PageGraderBulkPreviewStep
          selectedClient={selectedClient}
          selectedTaskType={selectedTaskType}
          selectedAssignee={selectedAssignee}
          previews={previews}
          dueDate={dueDate}
          setDueDate={setDueDate}
          note={note}
          setNote={setNote}
          campaignId={campaignId}
          campaignName={campaignName}
          hasExistingCampaignMap={hasExistingCampaignMap}
          rememberCampaign={rememberCampaign}
          setRememberCampaign={setRememberCampaign}
          sending={sending}
          onBack={() => setStep('assignee')}
          onSend={() => void runSend().catch(() => undefined)}
        />
      ) : null}
    </div>,
    document.body,
  )
}
