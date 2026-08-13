import type { MediaAssetTypePick } from '../../types/space-schema'

export interface MediaViewPresentation {
  collectionTitle: string
  uploadAccept: string
  uploadLabel: string
  uploadTooltip: string
  /** Which generation composer the view shows — video-only filters seed video generation. */
  composerMode: MediaAssetTypePick
}

export function resolveMediaViewPresentation(filters: MediaAssetTypePick[]): MediaViewPresentation {
  const uniqueFilters = [...new Set(filters)]
  const isImageOnly = uniqueFilters.length === 1 && uniqueFilters[0] === 'image'
  const isVideoOnly = uniqueFilters.length === 1 && uniqueFilters[0] === 'video'

  if (isVideoOnly) {
    return {
      collectionTitle: 'Your videos',
      uploadAccept: 'video/*',
      uploadLabel: 'Upload video',
      uploadTooltip: 'Upload videos',
      composerMode: 'video',
    }
  }

  if (isImageOnly) {
    return {
      collectionTitle: 'Your images',
      uploadAccept: 'image/*',
      uploadLabel: 'Upload image',
      uploadTooltip: 'Upload images',
      composerMode: 'image',
    }
  }

  return {
    collectionTitle: 'Your media',
    uploadAccept: 'image/*,video/*',
    uploadLabel: 'Upload media',
    uploadTooltip: 'Upload images or videos',
    composerMode: 'image',
  }
}
