import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentSettingsSection } from './agent-settings-section'

vi.mock('../CampaignIntegrationsSettingsSection', () => ({
  CampaignIntegrationsSettingsSection: ({
    campaignId,
    userIntegrations,
    providerModes,
    availableIntegrations,
    loadUserIntegrations,
  }: {
    campaignId: string
    userIntegrations: Array<{ integration_id: string }>
    providerModes: Record<string, string>
    availableIntegrations: Array<{ id: string }>
    loadUserIntegrations: () => Promise<void>
  }) => (
    <button
      type="button"
      data-testid="campaign-integrations-settings"
      data-campaign-id={campaignId}
      data-user-count={String(userIntegrations.length)}
      data-provider-mode={providerModes.meta}
      data-available-count={String(availableIntegrations.length)}
      onClick={() => void loadUserIntegrations()}
    >
      campaign integrations
    </button>
  ),
}))

afterEach(cleanup)

const modelStrategies = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Balanced',
    chipClass: 'bg-primary/10',
    textClass: 'text-primary',
  },
  {
    id: 'auto:power',
    label: 'Power',
    description: 'Deeper reasoning',
    chipClass: 'bg-accent/10',
    textClass: 'text-accent',
  },
]

describe('AgentSettingsSection', () => {
  it('keeps media, model strategy, and integrations delegation behavior intact', () => {
    const onMediaGenerationToggle = vi.fn().mockResolvedValue(undefined)
    const onModelStrategyChange = vi.fn().mockResolvedValue(undefined)
    const loadUserIntegrations = vi.fn().mockResolvedValue(undefined)

    render(
      <AgentSettingsSection
        campaignId="campaign-1"
        mediaGenerationEnabled={true}
        savingAgentSettings={true}
        onMediaGenerationToggle={onMediaGenerationToggle}
        campaignModelStrategy="auto"
        onModelStrategyChange={onModelStrategyChange}
        modelStrategies={modelStrategies}
        userIntegrations={[
          { id: 'user-integration-1', integration_id: 'meta', provider: 'meta', status: 'connected' },
        ]}
        providerModes={{ meta: 'composio' }}
        availableIntegrations={[
          {
            id: 'meta',
            provider: 'meta',
            name: 'Meta Ads',
            description: 'Meta advertising account',
            is_active: true,
          },
        ]}
        loadUserIntegrations={loadUserIntegrations}
      />,
    )

    expect(screen.getByText('Image + Video Generation')).toBeTruthy()
    expect(screen.getByText('Default Model Power')).toBeTruthy()
    expect(screen.getAllByText('Saving...')).toHaveLength(2)

    fireEvent.click(screen.getByRole('switch'))
    expect(onMediaGenerationToggle).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByText('Power').closest('button')!)
    expect(onModelStrategyChange).toHaveBeenCalledWith('auto:power')

    const delegated = screen.getByTestId('campaign-integrations-settings')
    expect(delegated.dataset.campaignId).toBe('campaign-1')
    expect(delegated.dataset.userCount).toBe('1')
    expect(delegated.dataset.providerMode).toBe('composio')
    expect(delegated.dataset.availableCount).toBe('1')

    fireEvent.click(delegated)
    expect(loadUserIntegrations).toHaveBeenCalledTimes(1)
  })
})
