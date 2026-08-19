'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Loader2, X } from 'lucide-react'
import type { FireEmployeeHandoffInput } from '@/features/mission-control/services/missions.service'
import type { MissionAgent } from '@/features/mission-control/types'
import type { Campaign } from '@/features/studio/types'
import { SYSTEM_LIKE_AGENT_KEYS } from '@/features/team/constants/team.constants'
import { VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'

type HandoffChoice = 'default' | 'agent' | 'campaign' | 'delete'

function handoffToChoice(handoff: FireEmployeeHandoffInput | null): HandoffChoice {
  if (!handoff) return 'delete'
  return handoff.scope
}

export interface FireEmployeeConfirmModalProps {
  open: boolean
  selected: MissionAgent
  agents: MissionAgent[]
  nonGeneralCampaigns: Campaign[]
  isSelectedManager: boolean
  firingEmployee: boolean
  fireError: string | null
  fireBrainTotal: number | null
  fireBrainLoading: boolean
  fireHandoff: FireEmployeeHandoffInput | null
  setFireHandoff: (value: FireEmployeeHandoffInput | null) => void
  onClose: () => void
  onConfirm: () => void
}

interface HandoffRadioProps {
  active: boolean
  label: string
  onClick: () => void
  disabled?: boolean
  children?: React.ReactNode
}

function HandoffRadio({ active, label, onClick, disabled, children }: HandoffRadioProps) {
  const borderClass = active
    ? 'border-emerald-500/40 bg-emerald-500/10'
    : 'border-subtle surface-card'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-spacing-2 p-spacing-3 border text-left ${borderClass} disabled:opacity-40`}
    >
      <div className="gap-spacing-2 flex items-center">
        <span
          className={`h-4 w-4 rounded-full border ${
            active ? 'border-emerald-400 bg-emerald-500' : 'border-subtle'
          }`}
        />
        <span className="body-3 text-foreground">{label}</span>
      </div>
      {children}
    </button>
  )
}

export function FireEmployeeConfirmModal({
  open,
  selected,
  agents,
  nonGeneralCampaigns,
  isSelectedManager,
  firingEmployee,
  fireError,
  fireBrainTotal,
  fireBrainLoading,
  fireHandoff,
  setFireHandoff,
  onClose,
  onConfirm,
}: FireEmployeeConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('')
  const agentName = selected.name
  const canConfirm = confirmText.trim() === agentName.trim()

  const firedAgentKey = selected.agent_key
  const selectableAgents = agents.filter(
    (a) => a.agent_key !== firedAgentKey && !SYSTEM_LIKE_AGENT_KEYS.has(a.agent_key),
  )
  const brainHasData = (fireBrainTotal ?? 0) > 0
  const choice = handoffToChoice(fireHandoff)

  const confirmLabel = firingEmployee
    ? isSelectedManager
      ? 'Removing…'
      : 'Firing…'
    : isSelectedManager
      ? 'Remove'
      : 'Fire'

  const setChoice = (next: HandoffChoice) => {
    if (next === 'default') setFireHandoff({ scope: 'default' })
    else if (next === 'agent') {
      const firstAgent = selectableAgents[0]
      if (firstAgent) setFireHandoff({ scope: 'agent', agent_key: firstAgent.agent_key })
      else setFireHandoff({ scope: 'default' })
    } else if (next === 'campaign') {
      const firstCampaign = nonGeneralCampaigns[0]
      if (firstCampaign) setFireHandoff({ scope: 'campaign', campaign_id: firstCampaign.id })
      else setFireHandoff({ scope: 'default' })
    } else {
      setFireHandoff(null)
    }
  }

  useEffect(() => {
    if (!open) setConfirmText('')
  }, [open])

  if (!open || typeof document === 'undefined') return null

  const title = isSelectedManager ? 'Remove manager?' : 'Fire employee?'

  return createPortal(
    <div {...{ [VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD]: '' }}>
      <div className="z-modal-backdrop bg-modal-overlay fixed inset-0" onClick={onClose} />
      <div className="z-modal-content fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6">
        <div
          className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={firingEmployee}
            className="btn-icon-bare btn-close-absolute"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
          </button>

          <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="px-spacing-6 pt-spacing-6 pb-spacing-4 flex flex-col items-center text-center">
              <div className="bg-destructive/10 mb-spacing-3 flex h-12 w-12 items-center justify-center rounded-full">
                <AlertCircle className="text-destructive h-6 w-6" />
              </div>
              <h2 className="title-h6 text-foreground">{title}</h2>
              <p className="body-3 text-muted-foreground mt-spacing-2">
                This will remove {agentName} from your team and reassign active work to your
                leadership team.
              </p>
            </div>

            <div className="px-spacing-6 pb-spacing-4">
              {fireBrainLoading ? (
                <p className="body-4 text-muted-foreground">Checking brain…</p>
              ) : brainHasData ? (
                <div className="gap-spacing-2 flex flex-col">
                  <p className="body-4 text-muted-foreground">
                    {agentName.split(' ')[0]}&apos;s brain holds{' '}
                    <span className="text-foreground font-semibold">{fireBrainTotal}</span> items
                    (memories, snapshots, knowledge, notes). What should happen to them?
                  </p>

                  <HandoffRadio
                    active={choice === 'default'}
                    label="Move everything to my Default Brain"
                    onClick={() => setChoice('default')}
                  />

                  <HandoffRadio
                    active={choice === 'agent'}
                    disabled={selectableAgents.length === 0}
                    label="Move everything to another agent"
                    onClick={() => setChoice('agent')}
                  >
                    {choice === 'agent' && selectableAgents.length > 0 && (
                      <select
                        value={fireHandoff?.scope === 'agent' ? fireHandoff.agent_key : ''}
                        onChange={(e) =>
                          setFireHandoff({ scope: 'agent', agent_key: e.target.value })
                        }
                        className="input-glass body-4 px-spacing-3 py-spacing-2 mt-spacing-2 w-full"
                      >
                        {selectableAgents.map((agent) => (
                          <option key={agent.agent_key} value={agent.agent_key}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </HandoffRadio>

                  <HandoffRadio
                    active={choice === 'campaign'}
                    disabled={nonGeneralCampaigns.length === 0}
                    label="Move everything to a campaign"
                    onClick={() => setChoice('campaign')}
                  >
                    {choice === 'campaign' && nonGeneralCampaigns.length > 0 && (
                      <select
                        value={fireHandoff?.scope === 'campaign' ? fireHandoff.campaign_id : ''}
                        onChange={(e) =>
                          setFireHandoff({ scope: 'campaign', campaign_id: e.target.value })
                        }
                        className="input-glass body-4 px-spacing-3 py-spacing-2 mt-spacing-2 w-full"
                      >
                        {nonGeneralCampaigns.map((campaign) => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </HandoffRadio>

                  <HandoffRadio
                    active={choice === 'delete'}
                    label="Delete everything (14-day recovery window)"
                    onClick={() => setChoice('delete')}
                  />

                  <p className="body-4 text-muted-foreground mt-spacing-2">
                    Billing for this agent&apos;s brain stops now. Data stays recoverable for 14
                    days.
                  </p>
                </div>
              ) : (
                <p className="body-4 text-muted-foreground">
                  This agent&apos;s brain has no saved data. Billing for it stops now.
                </p>
              )}

              {fireError ? (
                <p className="body-4 mt-spacing-3 text-destructive">{fireError}</p>
              ) : null}

              <div className="mt-spacing-4 space-y-spacing-2">
                <label className="body-3 text-foreground block text-left">
                  Type <strong>{agentName}</strong> to confirm
                </label>
                <input
                  type="text"
                  className="input-glass w-full"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={agentName}
                  disabled={firingEmployee}
                />
              </div>
            </div>
          </div>

          <div className="gap-spacing-3 px-spacing-6 py-spacing-4 border-border flex shrink-0 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={firingEmployee}
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm || firingEmployee || fireBrainLoading}
              className="button-glass-destructive flex-1 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {firingEmployee ? (
                <span className="gap-spacing-2 relative z-10 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {confirmLabel}
                </span>
              ) : (
                <span className="relative z-10">{confirmLabel}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
