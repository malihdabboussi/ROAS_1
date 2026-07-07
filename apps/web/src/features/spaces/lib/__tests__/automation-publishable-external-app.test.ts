import { describe, expect, it } from 'vitest'
import type { AutomationTrigger } from '../../types/space-schema'
import { validateTrigger } from '../automation-publishable'

describe('validateTrigger external_app_event', () => {
  it('requires provider, event slug, and connected account', () => {
    const incomplete = {
      type: 'external_app_event',
      provider: 'github',
      trigger_slug: 'GITHUB_ISSUE_CREATED_TRIGGER',
      connected_account_id: '',
    } as AutomationTrigger
    expect(validateTrigger(incomplete)).toBe('Choose a connected account')

    const complete = {
      ...incomplete,
      connected_account_id: 'ca_1',
    } as AutomationTrigger
    expect(validateTrigger(complete)).toBeNull()
  })

  it('rejects provider and trigger slug mismatches', () => {
    expect(
      validateTrigger({
        type: 'external_app_event',
        provider: 'github',
        trigger_slug: 'GOOGLEDRIVE_FILE_CREATED_TRIGGER',
        connected_account_id: 'ca_1',
      } as AutomationTrigger),
    ).toBe('Choose an event for the selected app')
  })

  it('requires trigger config fields for configurable events', () => {
    const trigger = {
      type: 'external_app_event',
      provider: 'googlesheets',
      trigger_slug: 'GOOGLESHEETS_NEW_ROWS_TRIGGER',
      connected_account_id: 'ca_1',
    } as AutomationTrigger

    expect(validateTrigger(trigger)).toBe('Add spreadsheet id')
    expect(
      validateTrigger({
        ...trigger,
        trigger_config: { spreadsheet_id: 'sheet_1' },
      } as AutomationTrigger),
    ).toBeNull()
  })
})
