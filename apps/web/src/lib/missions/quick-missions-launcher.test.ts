import { createElement, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QuickMissionsLauncherProvider, useQuickMissionsLauncher } from './quick-missions-launcher'

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QuickMissionsLauncherProvider, null, children)
}

describe('quick missions launcher', () => {
  it('keeps launch state inside the mounted chat surface', () => {
    const { result } = renderHook(() => useQuickMissionsLauncher(), { wrapper })

    act(() => result.current.openLauncher('client-strategy'))

    expect(result.current).toMatchObject({
      open: true,
      playbookKey: 'client-strategy',
      spaceId: null,
      parentMissionId: null,
    })
  })

  it('stores the source mission and space for extend launches', () => {
    const { result } = renderHook(() => useQuickMissionsLauncher(), { wrapper })

    act(() =>
      result.current.openLauncher('webinar-fulfillment', {
        spaceId: 'space-1',
        parentMissionId: 'mission-1',
      }),
    )

    expect(result.current).toMatchObject({
      open: true,
      playbookKey: 'webinar-fulfillment',
      spaceId: 'space-1',
      parentMissionId: 'mission-1',
    })
  })
})
