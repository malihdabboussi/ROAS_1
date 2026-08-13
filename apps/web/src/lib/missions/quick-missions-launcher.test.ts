import { afterEach, describe, expect, it } from 'vitest'
import { openQuickMissions, useQuickMissionsLauncherStore } from './quick-missions-launcher'

describe('quick missions launcher', () => {
  afterEach(() => {
    useQuickMissionsLauncherStore.setState({ open: false, playbookKey: null })
  })

  it('keeps an open request available for the host to observe', () => {
    openQuickMissions('client-strategy')

    expect(useQuickMissionsLauncherStore.getState()).toMatchObject({
      open: true,
      playbookKey: 'client-strategy',
    })
  })
})
