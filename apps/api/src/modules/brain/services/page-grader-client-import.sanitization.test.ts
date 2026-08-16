import { describe, expect, it } from 'vitest'
import {
  buildPortalResourceRegistry,
  mapPortalAvatar,
  mapPortalOffer,
  sanitizePortalBrainValue,
} from './page-grader-client-import.service'

describe('sanitizePortalBrainValue', () => {
  it('removes Portal brand-color guesses and secrets recursively', () => {
    expect(
      sanitizePortalBrainValue({
        name: 'Example Client',
        brand_primary_color: '#000000',
        nested: {
          password_value: 'plaintext',
          access_token: 'token',
          safe_link: 'https://example.com',
        },
        records: [{ api_key: 'secret', title: 'Keep me' }],
      }),
    ).toEqual({
      name: 'Example Client',
      nested: {
        safe_link: 'https://example.com',
      },
      records: [{ title: 'Keep me' }],
    })
  })

  it('maps Portal offers and avatars into provenance-preserving canonical snapshots', () => {
    expect(
      mapPortalOffer({
        id: 'offer-1',
        name: 'Webinar Offer',
        price: '$997',
        transformation: 'Speak with executive confidence',
        status: 'confirmed',
      }),
    ).toMatchObject({
      name: 'Webinar Offer',
      price: '$997',
      transformation: 'Speak with executive confidence',
      source: {
        system: 'page_grader',
        page_grader_offer_id: 'offer-1',
      },
    })

    expect(
      mapPortalAvatar({
        id: 'avatar-1',
        name: 'Growth-stage coaching founder',
        pain_points: ['Inconsistent authority'],
      }),
    ).toMatchObject({
      name: 'Growth-stage coaching founder',
      pain_points: ['Inconsistent authority'],
      source: {
        system: 'page_grader',
        page_grader_avatar_id: 'avatar-1',
      },
    })
  })

  it('separates connected resources from unverified discovered links', () => {
    expect(
      buildPortalResourceRegistry({
        envelope: { exported_at: '2026-08-16T10:00:00.000Z' },
        client: {
          website_url: 'https://client.example',
          drive_link: 'https://drive.google.com/drive/folders/abc',
          slack_channel_url: 'https://roas.slack.com/archives/C123',
        },
        source_pointers: {
          clickup_ids: { url: 'https://app.clickup.com/t/abc' },
        },
        social_links: [{ platform: 'instagram', url: 'https://instagram.com/example' }],
      }),
    ).toMatchObject({
      website: 'https://client.example/',
      drive_folder: 'https://drive.google.com/drive/folders/abc',
      instagram: 'https://instagram.com/example',
      registry: expect.arrayContaining([
        expect.objectContaining({ type: 'drive', verification_status: 'connected' }),
        expect.objectContaining({ type: 'instagram', verification_status: 'unverified' }),
      ]),
    })
  })
})
