import { describe, expect, it } from 'vitest'
import type { CalendarConfig } from '../../types/space-schema'
import {
  isCalendarSourceVisible,
  normalizeCalendarSources,
  patchCalendarSourceVisibility,
} from './calendar-source-utils'

describe('calendar-source-utils', () => {
  it('normalizes legacy source_mode into task and social visibility', () => {
    const config: CalendarConfig = { source_mode: 'campaign_social_posts' }
    const sources = normalizeCalendarSources(config)

    expect(sources.find((source) => source.id === 'space_items')?.visible).toBe(false)
    expect(sources.find((source) => source.id === 'campaign_social_posts')?.visible).toBe(true)
    expect(sources.find((source) => source.id === 'google_calendar')?.visible).toBe(true)
    expect(sources.find((source) => source.id === 'outlook')?.visible).toBe(true)
  })

  it('respects persisted source visibility over legacy source_mode', () => {
    const config: CalendarConfig = {
      source_mode: 'space_items',
      sources: [
        { id: 'space_items', type: 'space_items', visible: true, color: 'blue' },
        {
          id: 'campaign_social_posts',
          type: 'campaign_social_posts',
          visible: true,
          color: 'purple',
        },
      ],
    }

    expect(isCalendarSourceVisible(config, 'campaign_social_posts')).toBe(true)
  })

  it('patches one source without dropping the provider defaults', () => {
    const next = patchCalendarSourceVisibility({}, 'google_calendar', false)

    expect(isCalendarSourceVisible(next, 'google_calendar')).toBe(false)
    expect(isCalendarSourceVisible(next, 'outlook')).toBe(true)
    expect(isCalendarSourceVisible(next, 'space_items')).toBe(true)
  })
})
