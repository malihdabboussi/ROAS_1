import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Integration } from './integrations.types'
import { IntegrationsLibrary } from './IntegrationsLibrary'

vi.mock('./IntegrationCard', () => ({
  IntegrationCard: ({ integration }: { integration: Integration }) => <div>{integration.name}</div>,
}))

vi.mock('./IntegrationAccountsGroup', () => ({
  IntegrationAccountsGroup: ({ integration }: { integration: Integration }) => (
    <div>{integration.name}</div>
  ),
}))

const noop = vi.fn()

describe('IntegrationsLibrary', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders integrations in the automation category', () => {
    render(
      <IntegrationsLibrary
        availableIntegrations={[
          {
            id: 'higgsfield',
            provider: 'higgsfield',
            name: 'Higgsfield',
            description: 'Create and manage video assets.',
            category: 'automation',
            is_active: true,
          },
        ]}
        userIntegrations={[]}
        providerModes={{}}
        onConnect={noop}
        onRefresh={noop}
        onDisconnect={noop}
        onReconnect={noop}
        onRemove={noop}
        onSetDefault={noop}
        onChangeScope={noop}
        onRename={noop}
        canManageOrgShared={false}
      />,
    )

    expect(screen.getByText('Automation')).toBeTruthy()
    expect(screen.getByText('Higgsfield')).toBeTruthy()
  })
})
