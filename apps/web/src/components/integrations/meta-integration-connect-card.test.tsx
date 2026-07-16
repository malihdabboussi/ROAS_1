import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MetaIntegrationConnectCard } from './MetaIntegrationConnectCard'
import type { Integration } from '@/lib/integrations/integrations.types'

const metaIntegration: Integration = {
  id: 'meta',
  provider: 'meta',
  name: 'Meta Ads',
  description: 'Connect Meta to publish Facebook and Instagram ads directly from ROAS.',
  category: 'ads_analytics',
  is_active: true,
}

describe('MetaIntegrationConnectCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('connects Meta directly in legacy mode', async () => {
    const onConnect = vi.fn().mockResolvedValue(undefined)

    render(
      <MetaIntegrationConnectCard
        integration={metaIntegration}
        isComposioMode={false}
        connecting={false}
        onConnect={onConnect}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    expect(onConnect).toHaveBeenCalledWith(metaIntegration)
  })

  it('shows the Composio confirmation before connecting in Composio mode', async () => {
    const onConnect = vi.fn().mockResolvedValue(undefined)

    render(
      <MetaIntegrationConnectCard
        integration={metaIntegration}
        isComposioMode
        connecting={false}
        onConnect={onConnect}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }))

    expect(screen.getByText(/ROAS uses Composio/i)).toBeTruthy()
    expect(onConnect).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onConnect).toHaveBeenCalledWith(metaIntegration)
  })
})
