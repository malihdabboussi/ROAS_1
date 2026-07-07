import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SocialResearchConfig } from '../../types/space-schema'
import { AccountTracker } from './AccountTracker'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('../../services/social-research.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/social-research.service')>()
  return {
    ...actual,
    getConnectedSocialHandle: vi.fn().mockResolvedValue(null),
    searchSocialAccounts: vi.fn().mockResolvedValue([]),
  }
})

const emptyConfig: SocialResearchConfig = {
  tracked_accounts: [],
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('AccountTracker', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('keeps pending account rows scoped to the platform that started the add', async () => {
    const pendingAdd = deferred()

    render(
      <div>
        <section aria-label="Instagram tracker">
          <AccountTracker
            config={emptyConfig}
            platform="instagram"
            onAddAccount={() => pendingAdd.promise}
            onSyncAccount={vi.fn()}
            onRemoveAccount={vi.fn()}
          />
        </section>
        <section aria-label="YouTube tracker">
          <AccountTracker
            config={emptyConfig}
            platform="youtube"
            onAddAccount={vi.fn()}
            onSyncAccount={vi.fn()}
            onRemoveAccount={vi.fn()}
          />
        </section>
      </div>,
    )

    const instagram = screen.getByRole('region', { name: 'Instagram tracker' })
    const youtube = screen.getByRole('region', { name: 'YouTube tracker' })

    fireEvent.change(within(instagram).getByPlaceholderText('@handle or URL'), {
      target: { value: 'neelhome' },
    })
    fireEvent.click(within(instagram).getByRole('button', { name: 'Add' }))

    expect(within(instagram).getByText('@neelhome')).toBeTruthy()
    expect(within(youtube).queryByText('@neelhome')).toBeNull()

    pendingAdd.resolve()
    await waitFor(() => expect(within(instagram).queryByText('@neelhome')).toBeNull())
  })
})
