'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cachedBrainScopeNav } from '@/features/brain/hooks/use-brain-scope-nav-options'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { brainScopeAbsoluteUrl, brainScopeHref } from '@/features/brain/lib/brain-scope-nav'
import type { BrainScopeToolbarAction } from '@/features/brain/lib/brain-scope-nav'
import { canTrainBrainScope } from '@/features/brain/lib/brain-train-permissions'
import { dispatchBrainTrainModal } from '@/features/brain/lib/brain-training-modal.events'
import { setCustomerBrainEnabled } from '@/features/brain/services/brain.service'
import { fetchMissionAgents, useTeam2Perms, type MissionAgent } from '@/lib/agents'
import { useOrgStore } from '@/lib/org'
import { openInNewTab } from '@/lib/utils/open-in-new-tab'

export type BrainScopeMenuContext = {
  canTrain: boolean
  canAddInfo: boolean
  canVoice: boolean
  canShare: boolean
  canAgentChat: boolean
  canManageAgent: boolean
  canEnableCustomer: boolean
  canDisableCustomer: boolean
  canChangeImage: boolean
  brainId: string | null
  brainLabel: string
  scopeId: string | null
  onCopyLink: () => void
  onOpenInNewTab: () => void
  onOpenBrain: () => void
  onOpenWithAction: (action: BrainScopeToolbarAction) => void
  onOpenAgentChat: () => void
  onManageAgent: () => void
  onShare: () => void
  onEnableCustomerBrain: () => void
  onDisableCustomerBrain: () => void
}

export function useBrainScopeMenuActions() {
  const router = useRouter()
  const perms = useTeam2Perms()
  const isOrg = useOrgStore((s) => s.isOrgContext())
  const [agentsByKey, setAgentsByKey] = useState<Map<string, MissionAgent>>(new Map())
  const [shareTarget, setShareTarget] = useState<{
    brainId: string
    name: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetchMissionAgents()
      .then((rows) => {
        if (cancelled) return
        setAgentsByKey(new Map(rows.map((a) => [a.agent_key, a])))
      })
      .catch(() => {
        if (!cancelled) setAgentsByKey(new Map())
      })
    return () => {
      cancelled = true
    }
  }, [])

  const navigateScope = useCallback(
    (scopeId: string, action?: BrainScopeToolbarAction) => {
      router.push(brainScopeHref(scopeId, action))
    },
    [router],
  )

  const getMenuContext = useCallback(
    (option: BrainScopeNavOption | null): BrainScopeMenuContext => {
      const noop = () => {}
      if (!option) {
        return {
          canTrain: false,
          canAddInfo: false,
          canVoice: false,
          canShare: false,
          canAgentChat: false,
          canManageAgent: false,
          canEnableCustomer: false,
          canDisableCustomer: false,
          canChangeImage: false,
          brainId: null,
          brainLabel: '',
          scopeId: null,
          onCopyLink: noop,
          onOpenInNewTab: noop,
          onOpenBrain: noop,
          onOpenWithAction: noop,
          onOpenAgentChat: noop,
          onManageAgent: noop,
          onShare: noop,
          onEnableCustomerBrain: noop,
          onDisableCustomerBrain: noop,
        }
      }

      const brainId = option.brainId
      const agent =
        option.scopeType === 'agent' && option.agentId ? agentsByKey.get(option.agentId) : undefined

      const canTrain = canTrainBrainScope(option, {
        isOrg,
        isAdmin: perms.isAdmin,
        agentsByKey,
        canEditAgent: perms.canEditAgent,
      })

      const canAddInfo =
        (option.scopeType === 'user' || option.scopeType === 'customer') && !brainId

      const canVoice = !!brainId

      const canShare = isOrg && perms.isAdmin && !!brainId && option.scopeType !== 'shared'

      const canAgentChat = option.scopeType === 'agent' && !!option.agentId
      const canManageAgent =
        option.scopeType === 'agent' &&
        !!option.agentId &&
        (agent ? perms.canEditAgent(agent) : false)

      const canEnableCustomer =
        isOrg && perms.isAdmin && option.scopeType === 'customer' && brainId == null
      const canDisableCustomer =
        isOrg && perms.isAdmin && option.scopeType === 'customer' && !!brainId

      const canChangeImage =
        !!brainId &&
        (option.scopeType === 'company' || option.scopeType === 'customer') &&
        isOrg &&
        perms.isAdmin

      return {
        canTrain,
        canAddInfo,
        canVoice,
        canShare,
        canAgentChat,
        canManageAgent,
        canEnableCustomer,
        canDisableCustomer,
        canChangeImage,
        brainId: brainId ?? null,
        brainLabel: option.label,
        scopeId: option.id,
        onCopyLink: () => {
          void navigator.clipboard.writeText(brainScopeAbsoluteUrl(option.id)).then(
            () => toast.success('Link copied'),
            () => toast.error('Failed to copy link'),
          )
        },
        onOpenInNewTab: () => {
          openInNewTab(brainScopeHref(option.id))
        },
        onOpenBrain: () => navigateScope(option.id),
        onOpenWithAction: (action) => {
          if (action === 'train' && canTrain) {
            dispatchBrainTrainModal({ scopeId: option.id })
            return
          }
          navigateScope(option.id, action)
        },
        onOpenAgentChat: () => {
          if (!option.agentId) return
          router.push(`/team?agent=${encodeURIComponent(option.agentId)}&tab=chat`)
        },
        onManageAgent: () => {
          if (!option.agentId) return
          router.push(`/team?agent=${encodeURIComponent(option.agentId)}&tab=chat`)
        },
        onShare: () => {
          if (!brainId) return
          setShareTarget({ brainId, name: option.label })
        },
        onEnableCustomerBrain: () => {
          void setCustomerBrainEnabled(true)
            .then(() => {
              toast.success('Customer Brain enabled.')
              cachedBrainScopeNav.invalidate()
              void cachedBrainScopeNav.reload()
              navigateScope('customer')
            })
            .catch(() => toast.error('Failed to enable Customer Brain.'))
        },
        onDisableCustomerBrain: () => {
          void setCustomerBrainEnabled(false)
            .then(() => {
              toast.success('Customer Brain disabled.')
              cachedBrainScopeNav.invalidate()
              void cachedBrainScopeNav.reload()
              router.push('/brain')
            })
            .catch(() => toast.error('Failed to disable Customer Brain.'))
        },
      }
    },
    [agentsByKey, isOrg, navigateScope, perms, router],
  )

  const shareModalProps = useMemo(
    () =>
      shareTarget
        ? {
            open: true as const,
            resourceId: shareTarget.brainId,
            resourceName: shareTarget.name,
            onClose: () => setShareTarget(null),
          }
        : null,
    [shareTarget],
  )

  return { getMenuContext, shareModalProps }
}
