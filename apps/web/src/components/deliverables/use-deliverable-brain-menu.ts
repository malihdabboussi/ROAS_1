'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { BrainOption } from '@/components/deliverables/deliverable-preview-modal.types'
import { fetchMissionAgents, type MissionAgent } from '@/lib/agents/mission-agents-api'
import { billingApi } from '@/lib/billing/billing-api'
import { enqueueSkIngest, rememberDocumentMemory } from '@/lib/brain'
import { enqueueCampaignKnowledgeFileImport, fetchCampaigns } from '@/lib/campaigns'

export function useDeliverableBrainMenu({
  deliverableTitle,
  effectiveContent,
}: {
  deliverableTitle: string | null | undefined
  effectiveContent: string | null | undefined
}) {
  const brainButtonRef = useRef<HTMLButtonElement>(null)
  const [brainDropdownOpen, setBrainDropdownOpen] = useState(false)
  const [brainOptions, setBrainOptions] = useState<BrainOption[]>([])
  const [brainsLoading, setBrainsLoading] = useState(false)
  const [brainsLoaded, setBrainsLoaded] = useState(false)
  const [confirmBrain, setConfirmBrain] = useState<BrainOption | null>(null)
  const [brainIngesting, setBrainIngesting] = useState(false)
  const [brainDropdownPos, setBrainDropdownPos] = useState({ top: 0, left: 0, right: 0 })

  useLayoutEffect(() => {
    if (!brainDropdownOpen || !brainButtonRef.current) return
    const rect = brainButtonRef.current.getBoundingClientRect()
    setBrainDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      right: window.innerWidth - rect.right,
    })
  }, [brainDropdownOpen])

  useEffect(() => {
    if (!brainDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (brainButtonRef.current?.contains(t)) return
      if (t.closest('[data-dropdown="brain-ingest"]')) return
      setBrainDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [brainDropdownOpen])

  const loadBrainOptions = useCallback(async () => {
    if (brainsLoaded || brainsLoading) return
    setBrainsLoading(true)
    try {
      const [missionAgents, campaigns] = await Promise.all([
        fetchMissionAgents().catch(() => [] as MissionAgent[]),
        fetchCampaigns().catch(() => []),
      ])
      const nonSystem = missionAgents.filter((a) => a.level !== 'system')
      const statuses = await Promise.all(
        nonSystem.map(async (a) => {
          try {
            const s = await billingApi.getAgentBrainStatus(a.agent_key)
            return { agent: a, hasBrain: s.hasBrain, brainId: s.brainId }
          } catch {
            return { agent: a, hasBrain: false, brainId: null }
          }
        }),
      )
      const opts: BrainOption[] = [
        { id: 'user', label: 'Your Brain', type: 'user' },
        ...statuses
          .filter((e) => e.hasBrain)
          .map((e) => ({
            id: `agent:${e.agent.agent_key}`,
            label: e.agent.name,
            type: 'agent' as const,
            brainId: e.brainId,
          })),
        ...campaigns
          .filter((c) => (c.config as Record<string, unknown>)?.system_kind !== 'general')
          .map((c) => ({
            id: `campaign:${c.id}`,
            label: c.name,
            type: 'campaign' as const,
            campaignId: c.id,
          })),
      ]
      setBrainOptions(opts)
      setBrainsLoaded(true)
    } catch {
      setBrainOptions([{ id: 'user', label: 'Your Brain', type: 'user' }])
      setBrainsLoaded(true)
    } finally {
      setBrainsLoading(false)
    }
  }, [brainsLoaded, brainsLoading])

  const handleBrainDropdownToggle = useCallback(() => {
    setBrainDropdownOpen((o) => {
      if (!o) void loadBrainOptions()
      return !o
    })
  }, [loadBrainOptions])

  const handleBrainIngest = useCallback(async () => {
    if (!confirmBrain || !effectiveContent || brainIngesting) return
    setBrainIngesting(true)
    try {
      const title = deliverableTitle ?? 'Deliverable'
      const content = effectiveContent

      if (confirmBrain.type === 'user') {
        await rememberDocumentMemory({ content, title, sourceType: 'document' })
      } else if (confirmBrain.type === 'campaign' && confirmBrain.campaignId) {
        await enqueueCampaignKnowledgeFileImport({
          campaignId: confirmBrain.campaignId,
          title,
          content,
          sourceType: 'upload',
        })
      } else if (confirmBrain.type === 'agent' && confirmBrain.brainId) {
        await enqueueSkIngest({
          brainId: confirmBrain.brainId,
          text: content,
          sourceType: 'deliverable',
          title,
        })
      }
      toast.success(`Queued for ingestion into ${confirmBrain.label}`)
      setConfirmBrain(null)
    } catch {
      toast.error('Failed to queue ingestion')
    } finally {
      setBrainIngesting(false)
    }
  }, [confirmBrain, effectiveContent, deliverableTitle, brainIngesting])

  return {
    brainButtonRef,
    brainDropdownOpen,
    setBrainDropdownOpen,
    brainOptions,
    brainsLoading,
    confirmBrain,
    setConfirmBrain,
    brainIngesting,
    brainDropdownPos,
    handleBrainDropdownToggle,
    handleBrainIngest,
  }
}
