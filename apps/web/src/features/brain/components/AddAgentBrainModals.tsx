'use client'

import { useCallback, useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { BRAIN_PENDING_ADD_AGENT_KEY } from '@/features/brain/config/brain-sidebar.constants'
import {
  BRAIN_TOAST_ERRORS,
  BRAIN_TOAST_SUCCESS,
} from '@/features/brain/config/brain-toast-errors.config'
import { useBrainScopeNavOptions } from '@/features/brain/hooks/use-brain-scope-nav-options'
import {
  BRAIN_ADD_AGENT_MODAL_EVENT,
  BRAIN_SETUP_AGENT_MODAL_EVENT,
  dispatchBrainAgentActivated,
  type BrainSetupAgentModalDetail,
} from '@/features/brain/lib/brain-agent-modal.events'
import { useUserRole } from '@/hooks/use-user-role'
import { billingApi } from '@/lib/billing/billing-api'

export function AddAgentBrainModals() {
  const { role } = useUserRole()
  const isEnterprise = role === 'enterprise'
  const { agentsWithoutBrain, reload: reloadScopeNav } = useBrainScopeNavOptions()
  const [addBrainModalOpen, setAddBrainModalOpen] = useState(false)
  const [upgradingAgentKey, setUpgradingAgentKey] = useState<string | null>(null)
  const [confirmUpgradeAgent, setConfirmUpgradeAgent] = useState<{
    agentKey: string
    agentName: string
  } | null>(null)

  const handleUpgradeAgent = useCallback(
    async (agentKey: string) => {
      setConfirmUpgradeAgent(null)
      setUpgradingAgentKey(agentKey)
      try {
        const result = await billingApi.createAgentBrainCheckout(agentKey)
        if (result.url) {
          window.location.href = result.url
          return
        }
        toast.success(BRAIN_TOAST_SUCCESS.ACTIVATED.userMessage)
        setAddBrainModalOpen(false)
        dispatchBrainAgentActivated({ agentKey })
        void reloadScopeNav()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.ACTIVATE_FAILED.userMessage,
        )
      } finally {
        setUpgradingAgentKey(null)
      }
    },
    [reloadScopeNav],
  )

  const openConfirmForAgent = useCallback(
    (agentKey: string, agentName: string) => {
      if (isEnterprise) {
        void handleUpgradeAgent(agentKey)
        return
      }
      setConfirmUpgradeAgent({ agentKey, agentName })
    },
    [handleUpgradeAgent, isEnterprise],
  )

  useEffect(() => {
    try {
      if (sessionStorage.getItem(BRAIN_PENDING_ADD_AGENT_KEY) === '1') {
        sessionStorage.removeItem(BRAIN_PENDING_ADD_AGENT_KEY)
        setAddBrainModalOpen(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const onAdd = () => setAddBrainModalOpen(true)
    const onSetup = (e: Event) => {
      const detail = (e as CustomEvent<BrainSetupAgentModalDetail>).detail
      if (!detail?.agentKey) return
      const fromList = agentsWithoutBrain.find((a) => a.agent_key === detail.agentKey)
      openConfirmForAgent(detail.agentKey, fromList?.name ?? detail.agentName ?? detail.agentKey)
    }
    window.addEventListener(BRAIN_ADD_AGENT_MODAL_EVENT, onAdd)
    window.addEventListener(BRAIN_SETUP_AGENT_MODAL_EVENT, onSetup)
    return () => {
      window.removeEventListener(BRAIN_ADD_AGENT_MODAL_EVENT, onAdd)
      window.removeEventListener(BRAIN_SETUP_AGENT_MODAL_EVENT, onSetup)
    }
  }, [agentsWithoutBrain, openConfirmForAgent])

  return (
    <>
      <DialogPrimitive.Root
        open={addBrainModalOpen}
        onOpenChange={(open) => {
          if (!open && !upgradingAgentKey) setAddBrainModalOpen(false)
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
          <DialogPrimitive.Content className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>Add Agent Brain</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-lg">
              <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
                <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                  <div className="flex items-center justify-between">
                    <h2 className="title-h6">ADD AGENT BRAIN</h2>
                    <button
                      type="button"
                      aria-label="Close Add Agent Brain"
                      onClick={() => {
                        if (!upgradingAgentKey) setAddBrainModalOpen(false)
                      }}
                      className="btn-icon-bare"
                    >
                      <X className="icon-xs" />
                    </button>
                  </div>
                  <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                    {isEnterprise
                      ? 'Give your agents their own dedicated brain with specific knowledge. Included in Enterprise.'
                      : 'Give your agents their own dedicated brain with specific knowledge. $10/month per agent.'}
                  </DialogPrimitive.Description>
                </div>
                <div className="px-spacing-6 py-spacing-4 space-y-spacing-2 flex-1 overflow-y-auto">
                  {agentsWithoutBrain.map((agent) => {
                    const isUpgrading = upgradingAgentKey === agent.agent_key
                    return (
                      <div
                        key={agent.id}
                        className="border-border rounded-spacing-2 bg-muted/20 px-spacing-3 py-spacing-2 flex items-center justify-between border"
                      >
                        <div className="gap-spacing-2 flex min-w-0 items-center">
                          {agent.image_url ? (
                            <img
                              src={agent.image_url}
                              alt={agent.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="bg-muted/30 flex h-8 w-8 items-center justify-center rounded-full text-sm">
                              🧠
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="body-3 text-foreground truncate font-medium">
                              {agent.name}
                            </p>
                            <p className="typo-caption text-muted-foreground">{agent.role}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!!upgradingAgentKey}
                          onClick={() => openConfirmForAgent(agent.agent_key, agent.name)}
                          className="button-glass-accent px-spacing-3 body-4 shrink-0 rounded-lg py-1 font-medium disabled:opacity-40"
                        >
                          <span className="relative z-10">
                            {isUpgrading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Activate'
                            )}
                          </span>
                        </button>
                      </div>
                    )
                  })}
                  {agentsWithoutBrain.length === 0 && (
                    <p className="body-3 text-muted-foreground py-spacing-4 text-center">
                      All your agents already have a brain.
                    </p>
                  )}
                </div>
                <div className="px-spacing-6 py-spacing-4 border-border flex items-center justify-end border-t">
                  <button
                    type="button"
                    onClick={() => {
                      if (!upgradingAgentKey) setAddBrainModalOpen(false)
                    }}
                    className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root
        open={!!confirmUpgradeAgent && !isEnterprise}
        onOpenChange={(open) => {
          if (!open && !upgradingAgentKey) setConfirmUpgradeAgent(null)
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
          <DialogPrimitive.Content className="z-modal-layer-4 fixed inset-0 flex items-center justify-center p-4">
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>Confirm charge</DialogPrimitive.Title>
            </VisuallyHidden.Root>
            <div className="surface-card border-subtle rounded-spacing-3 p-spacing-5 w-full max-w-md border">
              <h3 className="text-foreground title-h6 uppercase">Confirm charge</h3>
              <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-2">
                You will be charged <strong>$10/month</strong> for{' '}
                {confirmUpgradeAgent?.agentName ?? 'this agent'}&apos;s Agent Brain. Are you sure?
              </DialogPrimitive.Description>
              <div className="mt-spacing-4 gap-spacing-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!upgradingAgentKey) setConfirmUpgradeAgent(null)
                  }}
                  className="button-glass-neutral rounded-spacing-2 px-spacing-4 py-spacing-2 body-3"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmUpgradeAgent) return
                    void handleUpgradeAgent(confirmUpgradeAgent.agentKey)
                  }}
                  disabled={!confirmUpgradeAgent || !!upgradingAgentKey}
                  className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 disabled:opacity-40"
                >
                  {upgradingAgentKey ? (
                    <Loader2 className="icon-sm animate-spin" />
                  ) : (
                    'Upgrade for $10/m'
                  )}
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
