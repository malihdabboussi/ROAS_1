import { describe, expect, it } from 'vitest'
import {
  CONNECTED_APP_FLOW_TRIGGER_SLUGS,
  CONNECTED_APP_FLOW_TRIGGERS,
} from '@/lib/flows/connected-app-flow-triggers'
import { defaultTriggerForType, triggerSectionsForObject } from '../automation-catalog'

describe('connected-app-flow-triggers', () => {
  it('exposes 13 verified trigger slugs', () => {
    expect(CONNECTED_APP_FLOW_TRIGGERS).toHaveLength(13)
    expect(CONNECTED_APP_FLOW_TRIGGER_SLUGS).toHaveLength(13)
    expect(new Set(CONNECTED_APP_FLOW_TRIGGER_SLUGS).size).toBe(13)
    expect(
      CONNECTED_APP_FLOW_TRIGGERS.some((entry) => (entry.provider as string) === 'hubspot'),
    ).toBe(false)
  })

  it('includes google drive file created slug', () => {
    expect(CONNECTED_APP_FLOW_TRIGGER_SLUGS).toContain('GOOGLEDRIVE_FILE_CREATED_TRIGGER')
  })

  it('uses concrete connected-app trigger slugs in the trigger picker', () => {
    const values = triggerSectionsForObject('connected_apps').flatMap((section) =>
      section.options.map((option) => option.value),
    )
    for (const slug of CONNECTED_APP_FLOW_TRIGGER_SLUGS) expect(values).toContain(slug)
    expect(values.filter((value) => value === 'external_app_event')).toHaveLength(0)
  })

  it('defaults external_app_event from the selected trigger slug', () => {
    expect(
      defaultTriggerForType('GOOGLEDRIVE_FILE_CREATED_TRIGGER', 'connected_apps'),
    ).toMatchObject({
      type: 'external_app_event',
      provider: 'googledrive',
      trigger_slug: 'GOOGLEDRIVE_FILE_CREATED_TRIGGER',
      connected_account_id: '',
    })
  })
})
