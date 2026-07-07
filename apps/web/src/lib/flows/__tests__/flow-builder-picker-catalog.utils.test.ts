import { describe, expect, it } from 'vitest'
import {
  buildFlowBuilderIntegrationCatalogApps,
  buildFlowBuilderSpaceTriggerEvents,
  sortFlowBuilderPickerAppsConnectedFirst,
  splitPickerAppsByConnection,
} from '../flow-builder-picker-catalog.utils'

describe('flow-builder-picker-catalog.utils', () => {
  it('includes catalog integrations beyond the legacy hardcoded set', () => {
    const apps = buildFlowBuilderIntegrationCatalogApps({
      allowTriggers: false,
      connectedIntegrationIds: new Set(),
    })
    expect(apps.some((app) => app.id === 'hubspot')).toBe(true)
    expect(apps.some((app) => app.id === 'stripe')).toBe(true)
    expect(apps.length).toBeGreaterThan(15)
  })

  it('sorts connected integrations first', () => {
    const apps = sortFlowBuilderPickerAppsConnectedFirst([
      {
        id: 'b',
        label: 'Beta',
        logoSrc: null,
        connected: false,
        events: [],
      },
      {
        id: 'a',
        label: 'Alpha',
        logoSrc: null,
        connected: true,
        events: [],
      },
    ])
    expect(apps.map((app) => app.id)).toEqual(['a', 'b'])
  })

  it('splits connected and available integration groups', () => {
    const { connected, available } = splitPickerAppsByConnection([
      {
        id: 'slack',
        label: 'Slack',
        logoSrc: null,
        connected: true,
        events: [],
      },
      {
        id: 'notion',
        label: 'Notion',
        logoSrc: null,
        connected: false,
        events: [],
      },
    ])
    expect(connected).toHaveLength(1)
    expect(available).toHaveLength(1)
  })

  it('includes common space triggers in the trigger picker catalog', () => {
    const events = buildFlowBuilderSpaceTriggerEvents()
    expect(events.some((event) => event.label === 'Task created')).toBe(true)
    expect(events.some((event) => event.label === 'Status changes')).toBe(true)
    expect(events.some((event) => event.selection.kind === 'trigger')).toBe(true)
  })
})
