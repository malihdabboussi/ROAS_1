import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RootProviders } from './root-providers'

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/settings/containers/SettingsModalProvider', () => ({
  SettingsModalProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/lib/observability/client-observability-provider', () => ({
  ClientObservabilityProvider: () => null,
}))

vi.mock('./themed-toaster', () => ({
  ThemedToaster: () => null,
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('RootProviders transient scrollbars', () => {
  it('shows scrollbars during scrolling and hides them after activity stops', () => {
    vi.useFakeTimers()
    render(
      <RootProviders>
        <div>App</div>
      </RootProviders>,
    )

    const root = document.documentElement
    expect(root).toHaveAttribute('data-transient-scrollbars', 'true')
    expect(root).not.toHaveAttribute('data-scrolling')

    fireEvent.scroll(document)
    expect(root).toHaveAttribute('data-scrolling', 'true')

    act(() => vi.advanceTimersByTime(701))
    expect(root).not.toHaveAttribute('data-scrolling')
  })
})
