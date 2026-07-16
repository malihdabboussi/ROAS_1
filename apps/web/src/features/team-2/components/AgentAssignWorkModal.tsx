'use client'

import { useCallback, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { MissionQuickCapture } from '@/features/mission-control/components/MissionQuickCapture'
import { createMission } from '@/features/mission-control/services/missions.service'
import type { MissionAgent } from '@/lib/agents'
import type { Campaign } from '@/lib/campaigns'
import { resolveMissionCreateToastMessage } from '@/lib/missions/mission-create-toast-errors'
import type { MissionPriority } from '@/lib/missions'
import { TEAM_OPS_DESK_MESSAGES } from '../config/messages.config'

interface AgentAssignWorkModalProps {
  open: boolean
  agent: MissionAgent | null
  campaigns: Campaign[]
  onOpenChange: (open: boolean) => void
  onCreated?: () => void | Promise<void>
}

export function AgentAssignWorkModal({
  open,
  agent,
  campaigns,
  onOpenChange,
  onCreated,
}: AgentAssignWorkModalProps) {
  const [value, setValue] = useState('')
  const [priority, setPriority] = useState<MissionPriority | null>('medium')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const campaignOptions = useMemo(
    () => campaigns.map((c) => ({ id: c.id, name: c.name })),
    [campaigns],
  )

  const reset = useCallback(() => {
    setValue('')
    setPriority('medium')
    setCampaignId(null)
    setFiles([])
    setSubmitting(false)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset()
      onOpenChange(next)
    },
    [onOpenChange, reset],
  )

  const handleSubmit = useCallback(async () => {
    const title = value.trim()
    if (!title || !agent) return
    if (!campaignId) {
      toast.error(TEAM_OPS_DESK_MESSAGES.ASSIGN_NEED_CAMPAIGN)
      return
    }
    setSubmitting(true)
    try {
      await createMission({
        title,
        brief: title,
        priority: priority ?? 'medium',
        campaign_id: campaignId,
        assigned_agent_key: agent.agent_key,
        idempotency_key: `mission-${crypto.randomUUID()}`,
      })
      toast.success(`Mission sent to ${agent.name}`)
      handleOpenChange(false)
      await onCreated?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : resolveMissionCreateToastMessage(err))
    } finally {
      setSubmitting(false)
    }
  }, [agent, campaignId, handleOpenChange, onCreated, priority, value])

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-modal-overlay z-modal-backdrop fixed inset-0" />
        <Dialog.Content className="z-modal-content fixed left-1/2 top-1/2 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 outline-none">
          <div className="surface-card border-border rounded-spacing-3 p-spacing-4 gap-spacing-3 flex flex-col border shadow-xl">
            <div className="flex items-start justify-between gap-spacing-2">
              <div className="gap-spacing-1 flex flex-col">
                <Dialog.Title className="title-h6 text-foreground">
                  {TEAM_OPS_DESK_MESSAGES.ASSIGN_MODAL_HEADING}
                </Dialog.Title>
                <Dialog.Description className="body-3 text-muted-foreground">
                  {agent
                    ? `${TEAM_OPS_DESK_MESSAGES.ASSIGN_MODAL_SUBTITLE} → ${agent.name}`
                    : TEAM_OPS_DESK_MESSAGES.ASSIGN_MODAL_SUBTITLE}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="btn-icon-glass" aria-label="Close">
                  <X className="icon-sm" />
                </button>
              </Dialog.Close>
            </div>
            <MissionQuickCapture
              value={value}
              priority={priority}
              campaigns={campaignOptions}
              selectedCampaignId={campaignId}
              files={files}
              disabled={submitting}
              onChange={setValue}
              onPriorityChange={setPriority}
              onCampaignChange={setCampaignId}
              onFilesChange={setFiles}
              onSubmit={() => void handleSubmit()}
              composerVariant="modern"
              heading={TEAM_OPS_DESK_MESSAGES.ASSIGN_MODAL_HEADING}
              subtitle={
                agent
                  ? `${TEAM_OPS_DESK_MESSAGES.ASSIGN_MODAL_SUBTITLE} → ${agent.name}`
                  : TEAM_OPS_DESK_MESSAGES.ASSIGN_MODAL_SUBTITLE
              }
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
