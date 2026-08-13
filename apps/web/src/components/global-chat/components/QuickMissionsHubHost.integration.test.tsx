import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { openQuickMissions, useQuickMissionsLauncherStore } from '@/lib/missions'
import { QuickMissionsHubHost } from './QuickMissionsHubHost'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('QuickMissionsHubHost integration', () => {
  afterEach(() => {
    cleanup()
    useQuickMissionsLauncherStore.setState({ open: false, playbookKey: null })
  })

  it('renders the real Quick Missions dialog after a launch request', async () => {
    useSpacesStore.setState({ spaces: [], activeSpaceId: null, loadSpaces: vi.fn() })
    render(<QuickMissionsHubHost />)

    act(() => openQuickMissions())

    expect(await screen.findByRole('dialog')).toHaveTextContent('Quick Missions')
    expect(screen.getByText('Client Strategy')).toBeInTheDocument()
  })
})
