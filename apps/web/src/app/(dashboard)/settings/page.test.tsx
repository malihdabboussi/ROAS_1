import { beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsRedirectPage from './page'

const redirectMock = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ redirect: redirectMock }))

describe('SettingsRedirectPage', () => {
  beforeEach(() => {
    redirectMock.mockReset()
  })

  it('marks direct settings links so the integrations modal opens on Home', async () => {
    await SettingsRedirectPage({
      searchParams: Promise.resolve({ tab: 'manage' }),
    })

    expect(redirectMock).toHaveBeenCalledWith('/home?tab=manage&settings=integrations')
  })

  it('preserves integration callback query values', async () => {
    await SettingsRedirectPage({
      searchParams: Promise.resolve({ github_connected: '1', integration: 'github' }),
    })

    expect(redirectMock).toHaveBeenCalledWith(
      '/home?github_connected=1&integration=github&tab=manage&settings=integrations',
    )
  })
})
