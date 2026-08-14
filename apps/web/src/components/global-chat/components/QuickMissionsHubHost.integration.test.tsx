import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { QuickMissionsLauncherProvider, useQuickMissionsLauncher } from '@/lib/missions'
import { QuickMissionsHubHost } from './QuickMissionsHubHost'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('QuickMissionsHubHost integration', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the real Quick Missions dialog after a launch request', async () => {
    useSpacesStore.setState({ spaces: [], activeSpaceId: null, loadSpaces: vi.fn() })
    function Harness() {
      const { openLauncher } = useQuickMissionsLauncher()
      return (
        <>
          <button type="button" onClick={() => openLauncher()}>
            Launch Mission
          </button>
          <QuickMissionsHubHost />
        </>
      )
    }
    render(
      <QuickMissionsLauncherProvider>
        <Harness />
      </QuickMissionsLauncherProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Launch Mission' }))

    expect(await screen.findByRole('dialog')).toHaveTextContent('Quick Missions')
    expect(screen.getByText('Client Strategy')).toBeInTheDocument()
  })
})
