'use client'

import type { ComponentProps } from 'react'
import { Zap } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import { CampaignIntegrationsSettingsSection } from '../CampaignIntegrationsSettingsSection'

type CampaignIntegrationsProps = ComponentProps<typeof CampaignIntegrationsSettingsSection>

type ModelStrategyOption = {
  id: string
  label: string
  description: string
  chipClass: string
  textClass: string
}

interface AgentSettingsSectionProps {
  campaignId: string
  mediaGenerationEnabled: boolean
  savingAgentSettings: boolean
  onMediaGenerationToggle: (checked: boolean) => Promise<void> | void
  campaignModelStrategy: string
  onModelStrategyChange: (strategyId: string) => Promise<void> | void
  modelStrategies: ReadonlyArray<ModelStrategyOption>
  userIntegrations: CampaignIntegrationsProps['userIntegrations']
  providerModes: CampaignIntegrationsProps['providerModes']
  availableIntegrations: CampaignIntegrationsProps['availableIntegrations']
  loadUserIntegrations: CampaignIntegrationsProps['loadUserIntegrations']
}

export function AgentSettingsSection({
  campaignId,
  mediaGenerationEnabled,
  savingAgentSettings,
  onMediaGenerationToggle,
  campaignModelStrategy,
  onModelStrategyChange,
  modelStrategies,
  userIntegrations,
  providerModes,
  availableIntegrations,
  loadUserIntegrations,
}: AgentSettingsSectionProps) {
  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-spacing-4">
        <div className="card-glass gap-spacing-4 rounded-spacing-2 p-spacing-4 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <span className="body-3 text-foreground block font-medium">
              Image + Video Generation
            </span>
            <span className="body-3 text-muted-foreground mt-spacing-1 block">
              Allow ROAS to generate images and videos for this campaign.
            </span>
          </div>
          <div className="gap-spacing-2 flex items-center">
            {savingAgentSettings && (
              <span className="body-3 text-muted-foreground">Saving...</span>
            )}
            <Switch
              checked={mediaGenerationEnabled}
              onCheckedChange={(checked) => {
                void onMediaGenerationToggle(checked)
              }}
            />
          </div>
        </div>

        <div className="card-glass rounded-spacing-2 p-spacing-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="gap-spacing-2 flex items-center">
                <Zap className="text-muted-foreground icon-sm shrink-0" />
                <span className="body-3 text-foreground font-medium">Default Model Power</span>
              </div>
              <span className="body-3 text-muted-foreground mt-spacing-1 block">
                All chats in this campaign will start with this model unless overridden.
              </span>
            </div>
            {savingAgentSettings && (
              <span className="body-3 text-muted-foreground shrink-0">Saving...</span>
            )}
          </div>
          <div className="mt-spacing-3 flex gap-spacing-2">
            {modelStrategies.map((strategy) => {
              const isSelected = campaignModelStrategy === strategy.id
              return (
                <button
                  key={strategy.id}
                  type="button"
                  onClick={() => void onModelStrategyChange(strategy.id)}
                  className={`rounded-spacing-1 flex-1 px-spacing-3 py-spacing-2 text-center transition-all ${
                    isSelected ? strategy.chipClass : 'card-glass hover:bg-hover-subtle'
                  }`}
                >
                  <span
                    className={`body-3 block font-medium ${isSelected ? strategy.textClass : 'text-muted-foreground'}`}
                  >
                    {strategy.label}
                  </span>
                  <span className="body-4 text-muted-foreground mt-spacing-1 block">
                    {strategy.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <CampaignIntegrationsSettingsSection
        campaignId={campaignId}
        userIntegrations={userIntegrations}
        providerModes={providerModes}
        availableIntegrations={availableIntegrations}
        loadUserIntegrations={loadUserIntegrations}
      />
    </div>
  )
}
