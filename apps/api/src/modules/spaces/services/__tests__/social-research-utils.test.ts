import { describe, expect, it } from 'vitest'
import {
  buildPostInfoCustomDataPatch,
  socialContentCustomData,
  socialPostUrlForContent,
} from '../social-research-utils'

describe('social-research-utils post_url', () => {
  it('stores post_url for all platforms on sync custom_data', () => {
    const baseItem = {
      media_id: 'abc123',
      shortcode: 'abc123',
      play_count: 1000,
      like_count: 10,
      comment_count: 2,
      thumbnail_url: null,
      video_url: null,
      taken_at: '2026-05-25T00:00:00.000Z',
      outlier_score: 1.5,
      caption: 'hello',
    }

    expect(
      socialContentCustomData(
        'instagram',
        'creator',
        { ...baseItem, media_type: 'reel', platform: 'instagram' },
        undefined,
      ).post_url,
    ).toBe('https://www.instagram.com/reel/abc123/')

    expect(
      socialContentCustomData(
        'tiktok',
        'creator',
        { ...baseItem, media_type: 'slideshow', platform: 'tiktok' },
        undefined,
      ).post_url,
    ).toBe('https://www.tiktok.com/@creator/photo/abc123')

    expect(
      socialContentCustomData(
        'youtube',
        'techchannel',
        { ...baseItem, media_type: 'youtube_short', platform: 'youtube' },
        undefined,
      ).post_url,
    ).toBe('https://www.youtube.com/shorts/abc123')

    expect(
      socialContentCustomData(
        'twitter',
        'elonmusk',
        { ...baseItem, media_type: 'tweet', platform: 'twitter' },
        undefined,
      ).post_url,
    ).toBe('https://x.com/elonmusk/status/abc123')
  })

  it('persists post_url in analyze patch', () => {
    const patch = buildPostInfoCustomDataPatch(
      {
        caption: 'test',
        like_count: 1,
        comment_count: 1,
        play_count: 1,
        video_duration: null,
        owner_username: 'creator',
        owner_full_name: null,
        owner_follower_count: null,
        owner_is_verified: false,
        owner_profile_pic: null,
        owner_post_count: null,
        audio_name: null,
        audio_artist: null,
        is_original_audio: false,
        is_paid_partnership: false,
        tagged_users: [],
        has_audio: false,
      },
      socialPostUrlForContent('youtube', 'techchannel', 'abc123', 'youtube_video'),
    )

    expect(patch.post_url).toBe('https://www.youtube.com/watch?v=abc123')
    expect(patch.analyzed_at).toBeTruthy()
  })
})
