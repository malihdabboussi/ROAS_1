'use client'

import { useCallback } from 'react'
import { billingApi } from '@/lib/billing/billing-api'
import type { ModelStrategyId } from './model-strategies'
import { reportTeamError } from './report-agent-error'
import type { TeamContainerHandlersData } from './team-container-handlers.types'
import { updateAgentCommunication } from './mission-agents-api'

export function useTeamContainerCommunicationHandlers(data: TeamContainerHandlersData) {
  const handleCommunicationModelChange = useCallback(
    async (nextModelId: string) => {
      if (!data.selectedAgentKey) return
      data.setCommunicationSaving(true)
      data.setCommunicationError(null)
      try {
        const updated = await updateAgentCommunication(data.selectedAgentKey, {
          model_id: nextModelId,
        })
        data.setAgents((prev) =>
          prev.map((a) =>
            a.agent_key === data.selectedAgentKey ? { ...a, config: updated.config } : a,
          ),
        )
      } catch (err) {
        reportTeamError('communication_model_save_failed', err, {
          agentKey: data.selectedAgentKey,
        })
        data.setCommunicationError(err instanceof Error ? err.message : 'Failed to save model')
      } finally {
        data.setCommunicationSaving(false)
      }
    },
    [data],
  )

  const handleCommunicationStrategyChange = useCallback(
    async (strategyId: ModelStrategyId) => {
      if (!data.selectedAgentKey) return
      data.setModelDropdownOpen(false)
      await handleCommunicationModelChange(strategyId)
    },
    [data, handleCommunicationModelChange],
  )

  const handleVoiceChange = useCallback(
    async (voiceName: string | null) => {
      if (!data.selectedAgentKey) return
      data.setCommunicationSaving(true)
      data.setCommunicationError(null)
      try {
        await updateAgentCommunication(data.selectedAgentKey, {
          voice_name: voiceName,
        })
      } catch (err) {
        data.setCommunicationError(err instanceof Error ? err.message : 'Failed to save voice')
      } finally {
        data.setCommunicationSaving(false)
      }
    },
    [data],
  )

  const handleCommunicationStyleChange = useCallback(
    async (style: string) => {
      if (!data.selectedAgentKey) return
      data.setCommunicationSaving(true)
      data.setCommunicationError(null)
      try {
        const updated = await updateAgentCommunication(data.selectedAgentKey, {
          communication_style: style,
        })
        data.setAgents((prev) =>
          prev.map((a) =>
            a.agent_key === data.selectedAgentKey ? { ...a, config: updated.config } : a,
          ),
        )
      } catch (err) {
        data.setCommunicationError(err instanceof Error ? err.message : 'Failed to save style')
      } finally {
        data.setCommunicationSaving(false)
      }
    },
    [data],
  )

  const handleAddBrain = useCallback(async () => {
    if (!data.selectedAgentKey) return
    data.setCheckoutLoading(true)
    data.setBrainError(null)
    try {
      const result = await billingApi.createAgentBrainCheckout(data.selectedAgentKey)
      if (result.url) {
        window.location.href = result.url
        return
      }
      data.setHasBrain(true)
      data.setShowUpgradeModal(false)
    } catch (err) {
      data.setBrainError(err instanceof Error ? err.message : 'Failed to activate Agent Brain')
    } finally {
      data.setCheckoutLoading(false)
    }
  }, [data])

  return {
    handleCommunicationModelChange,
    handleCommunicationStrategyChange,
    handleVoiceChange,
    handleCommunicationStyleChange,
    handleAddBrain,
  }
}
