'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  ChannelComposer,
  type ChannelComposerHandle,
} from '@/components/channels/ChannelComposerAdapter'
import type { TeamRosterEntry } from '@/lib/team'
import { cn } from '@/lib/utils/cn'
import { mapComposerAttachments, mapComposerMentions } from '../../lib/composer-payload-to-activity'
import {
  defaultTaskAgentSendInclude,
  TASK_AGENT_SEND_FIELDS,
} from '../../lib/task-agent-send-fields'
import { buildTaskComposerMembersFromRoster } from '../../lib/task-composer-members'
import { invokeTaskAgent } from '../../services/spaces.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceItem } from '../../types'
import type { FieldDef } from '../../types/space-schema'
import { readFieldValue } from '../space-item-values'
import {
  SendTaskToAgentModePicker,
  type SendTaskToAgentMode,
} from './SendTaskToAgentModePicker'

export interface SendToAgentInstructionsSeed { html: string }

interface SendTaskToAgentModalProps {
  open: boolean
  spaceItem: SpaceItem
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  campaignId?: string | null
  currentUserId?: string | null
  initialInstructionsHtml?: string | null
  onClose: () => void
  onSent?: () => void
}

const AGENT_PICKER_LIMIT = 5

function buildRosterAvatarsMap(roster: TeamRosterEntry[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const e of roster) {
    if (!e.avatar_url) continue
    if (e.kind === 'human' && e.user_id) map.set(e.user_id, e.avatar_url)
    if (e.kind === 'agent' && e.agent_key) map.set(e.agent_key, e.avatar_url)
  }
  return map
}

function resolveAssignedAgentKey(item: SpaceItem, agents: TeamRosterEntry[]): string | null {
  const availableKeys = new Set(
    agents.flatMap((agent) => (agent.agent_key ? [agent.agent_key] : [])),
  )
  const candidates = [
    item.assignee_type === 'agent' ? item.assignee_id : null,
    ...(item.assignees ?? [])
      .filter((assignee) => assignee.type === 'agent')
      .map((assignee) => assignee.id),
  ].filter((key): key is string => Boolean(key))

  return candidates.find((key) => availableKeys.has(key)) ?? null
}

export function SendTaskToAgentModal({
  open,
  spaceItem,
  allFields: _allFields,
  roster,
  campaignId,
  currentUserId,
  initialInstructionsHtml,
  onClose,
  onSent,
}: SendTaskToAgentModalProps) {
  const [sending, setSending] = useState(false)
  const [agentSearch, setAgentSearch] = useState('')
  const composerRef = useRef<ChannelComposerHandle>(null)
  const [selectedAgentKey, setSelectedAgentKey] = useState<string | null>(null)
  const [sendMode, setSendMode] = useState<SendTaskToAgentMode>('task')
  const [include, setInclude] = useState<Record<string, boolean>>(defaultTaskAgentSendInclude)
  const pushToAgent = useSpacesStore((s) => s.pushToAgent)
  const storeCampaignId = useSpacesStore(
    (s) => s.spaces.find((space) => space.id === spaceItem.space_id)?.campaign_id ?? null,
  )
  const resolvedCampaignId = campaignId ?? storeCampaignId

  const agents = useMemo(() => roster.filter((r) => r.kind === 'agent' && r.agent_key), [roster])
  const assignedAgentKey = useMemo(
    () => resolveAssignedAgentKey(spaceItem, agents),
    [spaceItem, agents],
  )

  useEffect(() => {
    if (!open) return
    setAgentSearch('')
    setSelectedAgentKey(assignedAgentKey)
    setSendMode('task')
    setInclude(defaultTaskAgentSendInclude())
  }, [open, spaceItem.id, assignedAgentKey])

  useEffect(() => {
    if (!open) return
    const seed = initialInstructionsHtml?.trim()
    const timer = window.setTimeout(() => {
      if (seed) composerRef.current?.setContent(seed)
      else composerRef.current?.clear()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open, spaceItem.id, initialInstructionsHtml])

  const filteredAgents = useMemo(() => {
    if (!agentSearch.trim()) return agents
    const q = agentSearch.toLowerCase()
    return agents.filter(
      (a) =>
        a.display_name?.toLowerCase().includes(q) ||
        a.agent_key?.toLowerCase().includes(q) ||
        a.role_label?.toLowerCase().includes(q),
    )
  }, [agents, agentSearch])

  const displayedAgents = useMemo(
    () => filteredAgents.slice(0, AGENT_PICKER_LIMIT),
    [filteredAgents],
  )

  const hasMoreAgents = filteredAgents.length > AGENT_PICKER_LIMIT

  const rosterAvatars = useMemo(() => buildRosterAvatarsMap(roster), [roster])
  const composerMembers = useMemo(
    () => buildTaskComposerMembersFromRoster(roster, currentUserId),
    [roster, currentUserId],
  )

  const hasValue = useMemo(() => {
    const result: Record<string, boolean> = {}
    for (const f of TASK_AGENT_SEND_FIELDS) {
      if (f.id === 'title') {
        result[f.id] = true
        continue
      }
      if (f.id === 'subtasks') {
        result[f.id] = true
        continue
      }
      if (f.id === 'custom_fields') {
        result[f.id] = Object.keys(spaceItem.custom_data ?? {}).length > 0
        continue
      }
      if (f.id === 'notes') {
        result[f.id] = Boolean(spaceItem.notes)
        continue
      }
      if (f.id === 'tags') {
        const tags = spaceItem.custom_data?.tags
        result[f.id] = Array.isArray(tags) && tags.length > 0
        continue
      }
      if (f.id === 'due_date') {
        result[f.id] = Boolean(spaceItem.due_date || spaceItem.start_date)
        continue
      }
      const val = readFieldValue(spaceItem, f.id)
      result[f.id] = val != null && val !== ''
    }
    return result
  }, [spaceItem])

  async function handleSend() {
    if (!selectedAgentKey) {
      toast.error('Choose an agent')
      return
    }
    if (composerRef.current?.hasUploadingFiles()) {
      toast.error('Wait for files to finish uploading.')
      return
    }
    const payload = composerRef.current?.getPayload()
    const agent = agents.find((a) => a.agent_key === selectedAgentKey)
    const mentions = payload ? mapComposerMentions(payload.mentions) : []
    const attachments = payload?.attachments ? mapComposerAttachments(payload.attachments) : []
    setSending(true)
    try {
      if (sendMode === 'mission') {
        if (!resolvedCampaignId) {
          toast.error('Missions require a campaign-linked space')
          return
        }
        await pushToAgent(spaceItem.id, {
          include,
          preferred_agent_keys: [selectedAgentKey],
          extra_notes: payload?.content.trim() || '',
        })
        window.dispatchEvent(
          new CustomEvent('space:open-missions-view', {
            detail: { spaceId: spaceItem.space_id, openCapture: true },
          }),
        )
        toast.success('Sent as mission')
      } else {
        await invokeTaskAgent(spaceItem.space_id, spaceItem.id, {
          agent_key: selectedAgentKey,
          agent_label: agent?.display_name ?? selectedAgentKey,
          include,
          extra_notes: payload?.content.trim() || undefined,
          skill_keys: payload?.skill_keys?.length ? payload.skill_keys : undefined,
          mentions: mentions.length > 0 ? mentions : undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        })
        toast.success('Sent to agent')
      }
      onSent?.()
      onClose()
    } catch {
      toast.error(sendMode === 'mission' ? 'Failed to send as mission' : 'Failed to send to agent')
    } finally {
      setSending(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="z-modal-backdrop flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-modal-overlay"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="z-modal-content surface-card border-border container-modal-lg relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <div className="px-spacing-4 sm:px-spacing-6 flex items-center justify-between py-4">
          <h2 className="title-h6">Send to agent</h2>
          <button type="button" onClick={onClose} className="btn-icon-bare" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <SendTaskToAgentModePicker
            value={sendMode}
            missionEnabled={Boolean(resolvedCampaignId)}
            onChange={setSendMode}
          />

          <div className="px-spacing-4 sm:px-spacing-6 pb-2 pt-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Agent
            </span>
            {agents.length > 0 ? (
              <>
                <div className="relative mt-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="Search agents..."
                    className="w-full rounded-lg border border-[var(--color-border)] bg-transparent py-1.5 pl-8 pr-3 text-sm text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-violet-500"
                  />
                </div>
                <div className="mt-1.5 flex flex-col gap-0.5">
                  {displayedAgents.map((agent) => {
                    const key = agent.agent_key!
                    const isSelected = selectedAgentKey === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedAgentKey(key)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                          isSelected
                            ? 'bg-violet-500/15 text-[var(--color-foreground)]'
                            : 'hover:bg-[var(--color-hover-subtle)]',
                        )}
                      >
                        {agent.avatar_url ? (
                          <img
                            src={agent.avatar_url}
                            alt=""
                            className="h-5 w-5 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-400">
                            <Bot className="h-3 w-3" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">{agent.display_name ?? key}</span>
                        {agent.role_label && (
                          <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
                            {agent.role_label}
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {filteredAgents.length === 0 && (
                    <span className="px-2 py-1.5 text-xs text-[var(--color-muted-foreground)]">
                      No agents found
                    </span>
                  )}
                  {hasMoreAgents && (
                    <span className="px-2 py-1 text-xs text-[var(--color-muted-foreground)]">
                      Showing {AGENT_PICKER_LIMIT} of {filteredAgents.length} — search to narrow
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                No agents in roster
              </p>
            )}
          </div>

          <div className="px-spacing-4 sm:px-spacing-6 pb-2 pt-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Context to include
            </span>
            <div className="mt-2 flex flex-col gap-1">
              {TASK_AGENT_SEND_FIELDS.map((f) => (
                <label
                  key={f.id}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
                    f.locked
                      ? 'cursor-default opacity-60'
                      : 'cursor-pointer hover:bg-[var(--color-hover-subtle)]',
                  )}
                >
                  <input
                    type="checkbox"
                    className="checkbox-glass-green shrink-0"
                    checked={include[f.id] ?? false}
                    disabled={f.locked}
                    onChange={(e) => {
                      if (f.locked) return
                      setInclude((prev) => ({ ...prev, [f.id]: e.target.checked }))
                    }}
                  />
                  <span className="flex-1 text-[var(--color-foreground)]">{f.label}</span>
                  {!hasValue[f.id] && !f.locked && (
                    <span className="text-[10px] text-[var(--color-muted-foreground)]">empty</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="px-spacing-4 sm:px-spacing-6 pb-4 pt-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
              Extra instructions
            </span>
            <div className="mt-2">
              <ChannelComposer
                embedded
                channelId={`send-task-agent-${spaceItem.id}`}
                campaignId={resolvedCampaignId}
                members={composerMembers}
                rosterAvatars={rosterAvatars}
                entityMentionPeopleMembers={composerMembers}
                composerHandleRef={composerRef}
                onSend={() => {}}
                disabled={sending}
                skillAgentKeys={selectedAgentKey ? [selectedAgentKey] : []}
              />
            </div>
          </div>
        </div>

        <div className="px-spacing-4 py-spacing-4 sm:px-spacing-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !selectedAgentKey}
            className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <span className="relative z-10">
              {sending ? 'Sending…' : sendMode === 'mission' ? 'Send as mission' : 'Send to agent'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
