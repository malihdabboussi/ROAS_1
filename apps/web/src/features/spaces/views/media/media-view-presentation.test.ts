import { describe, expect, it } from 'vitest'
import { resolveMediaViewPresentation } from './media-view-presentation'

describe('resolveMediaViewPresentation', () => {
  it('seeds video generation in a dedicated video view', () => {
    expect(resolveMediaViewPresentation(['video'])).toEqual({
      collectionTitle: 'Your videos',
      uploadAccept: 'video/*',
      uploadLabel: 'Upload video',
      uploadTooltip: 'Upload videos',
      composerMode: 'video',
    })
  })

  it('labels a dedicated image view clearly', () => {
    expect(resolveMediaViewPresentation(['image'])).toMatchObject({
      collectionTitle: 'Your images',
      uploadAccept: 'image/*',
      uploadLabel: 'Upload image',
      composerMode: 'image',
    })
  })

  it('uses the combined media presentation for mixed or unfiltered views', () => {
    expect(resolveMediaViewPresentation([])).toMatchObject({
      collectionTitle: 'Your media',
      uploadAccept: 'image/*,video/*',
      uploadLabel: 'Upload media',
      composerMode: 'image',
    })
    expect(resolveMediaViewPresentation(['video', 'image'])).toMatchObject({
      collectionTitle: 'Your media',
      composerMode: 'image',
    })
  })
})
