import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Presentation } from '@/lib/artifacts/artifact-types'
import { PresentationCardMetaRows } from './PresentationCardMetaRows'

function presentation(overrides: Partial<Presentation> = {}): Presentation {
  return {
    id: 'presentation-1',
    user_id: 'user-1',
    campaign_id: 'campaign-1',
    offer_id: null,
    name: 'Deck',
    slides: [],
    generated_html: null,
    theme_id: null,
    file_url: null,
    status: 'draft',
    slug: null,
    published_url: null,
    domain_id: null,
    hide_branding: false,
    metadata: {},
    created_at: '2026-07-17T00:00:00.000Z',
    updated_at: '2026-07-17T00:00:00.000Z',
    ...overrides,
  }
}

describe('PresentationCardMetaRows', () => {
  it('uses the persisted HTML bundle slide count when legacy slides are stripped', () => {
    render(
      <PresentationCardMetaRows
        presentation={presentation({ metadata: { slide_count: 15 } })}
        fieldIds={['slide_count']}
      />,
    )

    expect(screen.getByText('15 slides')).toBeTruthy()
  })
})
