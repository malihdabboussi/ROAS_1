import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TeamAccessView, type TeamAccessGrants } from './TeamAccessView'

const loadIntegrations = vi.fn()

vi.mock('@/lib/integrations/use-integration-overview', () => ({
  useIntegrationOverview: () => ({
    availableIntegrations: [
      {
        id: 'slack',
        name: 'Slack',
      },
      {
        id: 'hubspot',
        name: 'HubSpot',
      },
      {
        id: 'github',
        name: 'GitHub',
      },
    ],
    userIntegrations: [
      {
        id: 'ui-slack',
        integration_id: 'slack',
        provider: 'slack',
        status: 'connected',
      },
      {
        id: 'ui-github',
        integration_id: 'github',
        provider: 'github',
        status: 'disconnected',
      },
    ],
    isLoading: false,
    loadData: loadIntegrations,
  }),
}))

function grants(overrides: Partial<TeamAccessGrants> = {}): TeamAccessGrants {
  return {
    integration: new Set<string>(),
    brain_domain: new Set<string>(),
    brain_access: new Set<string>(),
    campaign_context: new Set<string>(),
    channel: new Set<string>(),
    action_domain: new Set<string>(),
    ...overrides,
  }
}

describe('TeamAccessView', () => {
  afterEach(() => {
    cleanup()
    loadIntegrations.mockClear()
  })

  it('renders action domains and connected or granted integrations with current toggle behavior', async () => {
    const toggle = vi.fn()

    render(
      <TeamAccessView
        grants={grants({
          action_domain: new Set(['read_campaign']),
          integration: new Set(['hubspot']),
        })}
        savingKind={null}
        toggle={toggle}
        canEditTeam
      />,
    )

    await waitFor(() => expect(loadIntegrations).toHaveBeenCalledTimes(1))

    expect(screen.getByText('Action domains')).toBeTruthy()
    expect(screen.getByText('Read campaign data')).toBeTruthy()
    expect(screen.getByText('Integrations')).toBeTruthy()
    expect(screen.getByText('Slack')).toBeTruthy()
    expect(screen.getByText('HubSpot')).toBeTruthy()
    expect(screen.queryByText('GitHub')).toBeNull()

    const firstSwitch = screen.getAllByRole('switch')[0]
    if (!firstSwitch) throw new Error('Expected at least one access switch')

    fireEvent.click(firstSwitch)
    expect(toggle).toHaveBeenCalledWith('action_domain', 'read_campaign')
  })
})
