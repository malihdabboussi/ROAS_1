'use client'

import type { FireEmployeeHandoffInput } from '@/features/mission-control/services/missions.service'
import type { MissionAgent } from '@/features/mission-control/types'
import type { Campaign } from '@/features/studio/types'
import { FireEmployeeConfirmModal } from '../components/FireEmployeeConfirmModal'
import { ReadyEmployeesModal } from '../components/ready-employees-modal'
import { SlackSetupDialog } from '../components/SlackSetupDialog'
import { TelegramSetupDialog } from '../components/TelegramSetupDialog'

interface TeamModalsProps {
  agents: MissionAgent[]
  selected: MissionAgent | null
  generalCampaignId?: string
  hireFilterParam: string | null
  hireFilterRef: React.MutableRefObject<string | null>
  showReadyEmployees: boolean
  setShowReadyEmployees: (value: boolean) => void
  showTelegramSetup: boolean
  setShowTelegramSetup: (value: boolean) => void
  showSlackSetup: boolean
  setShowSlackSetup: (value: boolean) => void
  showUpgradeModal: boolean
  setShowUpgradeModal: (value: boolean) => void
  showFireConfirm: boolean
  setShowFireConfirm: (value: boolean) => void
  isSelectedRemovable: boolean
  isSelectedManager: boolean
  checkoutLoading: boolean
  brainError: string | null
  firingEmployee: boolean
  fireError: string | null
  fireBrainTotal: number | null
  fireBrainLoading: boolean
  fireHandoff: FireEmployeeHandoffInput | null
  setFireHandoff: (value: FireEmployeeHandoffInput | null) => void
  nonGeneralCampaigns: Campaign[]
  handleAddBrain: () => Promise<void>
  handleFireEmployee: () => Promise<void>
  loadAgents: (selectAgentKey?: string) => Promise<void>
  loadChannels: () => Promise<void>
  setFireError: (value: string | null) => void
}

export function TeamModals({
  agents,
  selected,
  generalCampaignId,
  hireFilterParam,
  hireFilterRef,
  showReadyEmployees,
  setShowReadyEmployees,
  showTelegramSetup,
  setShowTelegramSetup,
  showSlackSetup,
  setShowSlackSetup,
  showUpgradeModal,
  setShowUpgradeModal,
  showFireConfirm,
  setShowFireConfirm,
  isSelectedRemovable,
  isSelectedManager,
  checkoutLoading,
  brainError,
  firingEmployee,
  fireError,
  fireBrainTotal,
  fireBrainLoading,
  fireHandoff,
  setFireHandoff,
  nonGeneralCampaigns,
  handleAddBrain,
  handleFireEmployee,
  loadAgents,
  loadChannels,
  setFireError,
}: TeamModalsProps) {
  return (
    <>
      <ReadyEmployeesModal
        open={showReadyEmployees}
        onClose={() => {
          setShowReadyEmployees(false)
          hireFilterRef.current = null
        }}
        existingAgentNames={agents.map((a) => a.name)}
        agents={agents}
        campaignId={generalCampaignId}
        initialTeamFilter={hireFilterRef.current ?? hireFilterParam}
        onHired={(agentKey) => {
          void loadAgents(agentKey).then(() => {
            setTimeout(() => void loadAgents(agentKey), 8000)
          })
        }}
      />

      {showTelegramSetup && selected && selected.level !== 'system' && (
        <TelegramSetupDialog
          agentKey={selected.agent_key}
          agentName={selected.name}
          onClose={() => setShowTelegramSetup(false)}
          onConnected={() => {
            setShowTelegramSetup(false)
            void loadChannels()
          }}
        />
      )}

      {showSlackSetup && selected && selected.level !== 'system' && (
        <SlackSetupDialog
          agentKey={selected.agent_key}
          agentName={selected.name}
          onClose={() => setShowSlackSetup(false)}
          onConnected={() => {
            setShowSlackSetup(false)
            void loadChannels()
          }}
        />
      )}

      {showUpgradeModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-modal-overlay px-4">
          <div className="surface-card border-subtle rounded-spacing-3 p-spacing-5 w-full max-w-md border">
            <h3 className="text-foreground text-base font-semibold uppercase">ADD AGENT BRAIN</h3>
            <p className="body-3 text-muted-foreground mt-spacing-2">
              Activate a dedicated knowledge brain for {selected.name} at $10/month. Train{' '}
              {selected.name.split(' ')[0]} with your own data, docs, and context so they remember
              everything and perform like a real specialist on your team.
            </p>
            {brainError && <p className="body-4 mt-spacing-2 text-red-400">{brainError}</p>}
            <div className="mt-spacing-4 gap-spacing-2 flex justify-end">
              <button
                onClick={() => {
                  if (!checkoutLoading) setShowUpgradeModal(false)
                }}
                className="button-glass-neutral rounded-spacing-2 px-spacing-4 py-spacing-2 body-3"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAddBrain()}
                disabled={checkoutLoading}
                className="button-glass-primary rounded-spacing-2 px-spacing-4 py-spacing-2 body-3"
              >
                {checkoutLoading ? 'Processing...' : 'Confirm Upgrade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFireConfirm && selected && isSelectedRemovable && (
        <FireEmployeeConfirmModal
          open={showFireConfirm}
          selected={selected}
          agents={agents}
          nonGeneralCampaigns={nonGeneralCampaigns}
          isSelectedManager={isSelectedManager}
          firingEmployee={firingEmployee}
          fireError={fireError}
          fireBrainTotal={fireBrainTotal}
          fireBrainLoading={fireBrainLoading}
          fireHandoff={fireHandoff}
          setFireHandoff={setFireHandoff}
          onClose={() => {
            if (!firingEmployee) {
              setShowFireConfirm(false)
              setFireError(null)
            }
          }}
          onConfirm={() => void handleFireEmployee()}
        />
      )}
    </>
  )
}
