import { describe, expect, it } from 'vitest'
import {
  buildFlowConnectedAppTrigger,
  getTriggerIntegrationLogoSrc,
  resolveComposioToolkitForFlowConnectedApp,
  resolveFlowConnectedAppDisplay,
  resolveFlowConnectedAppKey,
} from './flow-builder-connected-app-trigger.utils'

describe('flow-builder-connected-app-trigger.utils', () => {
  it('resolves Fathom triggers with logo and event label', () => {
    const trigger = { type: 'external_fathom_recording_ready' } as const
    expect(resolveFlowConnectedAppKey(trigger)).toBe('fathom')
    expect(getTriggerIntegrationLogoSrc(trigger)).toBe('/Integrations/Fathom.png')
    expect(resolveFlowConnectedAppDisplay(trigger)).toEqual({
      appKey: 'fathom',
      appLabel: 'Fathom',
      eventLabel: 'Recording ready',
      logoSrc: '/Integrations/Fathom.png',
    })
  })

  it('builds composio app triggers with default event slug', () => {
    expect(buildFlowConnectedAppTrigger('github')).toEqual({
      type: 'external_app_event',
      provider: 'github',
      trigger_slug: 'GITHUB_ISSUE_CREATED_TRIGGER',
      connected_account_id: '',
    })
  })

  it('maps flow connected app keys to composio toolkit slugs', () => {
    expect(resolveComposioToolkitForFlowConnectedApp('slack')).toBe('slack')
    expect(resolveComposioToolkitForFlowConnectedApp('googledrive')).toBe('googledrive')
  })
})
