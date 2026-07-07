import { describe, expect, it } from 'vitest'
import { cachedSocialProfileImageUrl, cachedSocialThumbnailUrl } from './social-image-proxy'

describe('social cached image resolvers', () => {
  it('returns cached thumbnail URLs only when an asset id exists', () => {
    expect(
      cachedSocialThumbnailUrl('instagram', {
        thumbnail_url: 'https://storage.example.com/thumb.jpg',
        thumbnail_asset_id: 'asset-1',
      }),
    ).toBe('https://storage.example.com/thumb.jpg')

    expect(
      cachedSocialThumbnailUrl('instagram', {
        thumbnail_url: 'https://storage.example.com/thumb.jpg',
      }),
    ).toBeNull()
  })

  it('does not render legacy Instagram CDN thumbnails', () => {
    expect(
      cachedSocialThumbnailUrl('instagram', {
        thumbnail_url: 'https://instagram.fadd2-1.fna.fbcdn.net/v/t51.71878-15/example.jpg',
        thumbnail_asset_id: 'asset-1',
      }),
    ).toBeNull()
  })

  it('does not render legacy TikTok CDN thumbnails', () => {
    expect(
      cachedSocialThumbnailUrl('tiktok', {
        thumbnail_url: 'https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/example.jpeg',
        thumbnail_asset_id: 'asset-1',
      }),
    ).toBeNull()
  })

  it('returns cached profile image URLs only when an asset id exists', () => {
    expect(
      cachedSocialProfileImageUrl('instagram', {
        profile_pic_url: 'https://storage.example.com/profile.jpg',
        profile_pic_asset_id: 'asset-2',
      }),
    ).toBe('https://storage.example.com/profile.jpg')

    expect(
      cachedSocialProfileImageUrl('instagram', {
        profile_pic_url: 'https://instagram.cdninstagram.com/profile.jpg',
      }),
    ).toBeNull()
  })
})
