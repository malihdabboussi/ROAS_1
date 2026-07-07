import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { toast } from 'sonner'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import type { MediaAsset } from '@/lib/services/media-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { updateSocialPost } from '../../../services/artifact-preview.service'
import type { SocialPost } from '../../../types'

export const VIDEO_ACCEPT_MIME = 'video/mp4,video/quicktime,video/webm'
export const IMAGE_ACCEPT_MIME = 'image/jpeg,image/png,image/webp,image/jpg'

const MAX_VIDEO_SIZE_IG_BYTES = 200 * 1024 * 1024
const MAX_VIDEO_SIZE_LI_BYTES = 4 * 1024 * 1024 * 1024
const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024

function isVideoMime(mime: string | null | undefined): boolean {
  return typeof mime === 'string' && mime.toLowerCase().startsWith('video/')
}

function isImageMime(mime: string | null | undefined): boolean {
  return typeof mime === 'string' && mime.toLowerCase().startsWith('image/')
}

interface UseSocialPostMediaActionsParams {
  post: SocialPost | null
  setPost: Dispatch<SetStateAction<SocialPost | null>>
}

export function useSocialPostMediaActions({ post, setPost }: UseSocialPostMediaActionsParams) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [mediaUploading, setMediaUploading] = useState(false)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const imageFileRef = useRef<HTMLInputElement>(null)
  const { upload: presignedUpload } = usePresignedUpload()

  const applyPostMedia = useCallback(
    async (media: { kind: 'video' | 'image'; url: string | null; assetId?: string | null }) => {
      if (!post) return
      const patch: Parameters<typeof updateSocialPost>[1] = {}
      if (media.kind === 'video') {
        patch.video_url = media.url
        patch.video_asset_id = media.assetId ?? null
        patch.image_url = null
        patch.image_asset_id = null
      } else {
        patch.image_url = media.url
        patch.image_asset_id = media.assetId ?? null
        patch.video_url = null
        patch.video_asset_id = null
      }
      const updated = await updateSocialPost(post.id, patch)
      setPost(updated)
    },
    [post, setPost],
  )

  const uploadMediaFile = useCallback(
    async (file: File, kind: 'video' | 'image') => {
      if (!post) return
      if (kind === 'video') {
        if (!isVideoMime(file.type)) {
          toast.error('Please upload a video file (mp4, mov, webm)')
          return
        }
        const maxBytes =
          post.platform === 'linkedin' ? MAX_VIDEO_SIZE_LI_BYTES : MAX_VIDEO_SIZE_IG_BYTES
        if (file.size > maxBytes) {
          toast.error(
            `Video is too large (${Math.round(file.size / (1024 * 1024))} MB). Max ${Math.round(maxBytes / (1024 * 1024))} MB for ${post.platform === 'linkedin' ? 'LinkedIn' : 'Instagram'}.`,
          )
          return
        }
      } else {
        if (!isImageMime(file.type)) {
          toast.error('Please upload an image file (jpg, png, webp)')
          return
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          toast.error(
            `Image is too large (${Math.round(file.size / (1024 * 1024))} MB). Max ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))} MB.`,
          )
          return
        }
      }

      setMediaUploading(true)
      try {
        const confirmed = await presignedUpload({
          file,
          category: 'social-posts',
          campaign_id: post.campaign_id ?? undefined,
        })
        const publicUrl = confirmed.asset.public_url || confirmed.url
        if (!publicUrl) {
          toast.error('Upload succeeded but no public URL was returned')
          return
        }
        await applyPostMedia({
          kind,
          url: publicUrl,
          assetId: kind === 'video' ? confirmed.asset.id : null,
        })
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Failed to upload media'))
      } finally {
        setMediaUploading(false)
      }
    },
    [post, presignedUpload, applyPostMedia],
  )

  const handleVideoFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) void uploadMediaFile(file, 'video')
      if (videoFileRef.current) videoFileRef.current.value = ''
    },
    [uploadMediaFile],
  )

  const handleImageFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) void uploadMediaFile(file, 'image')
      if (imageFileRef.current) imageFileRef.current.value = ''
    },
    [uploadMediaFile],
  )

  const handleMediaFromLibrary = useCallback(
    async (asset: MediaAsset) => {
      setMediaPickerOpen(false)
      if (!post) return
      const url = asset.public_url
      if (!url) {
        toast.error('Selected media has no public URL')
        return
      }
      const kind: 'video' | 'image' = isVideoMime(asset.mime_type) ? 'video' : 'image'
      try {
        await applyPostMedia({
          kind,
          url,
          assetId: kind === 'video' ? asset.id : null,
        })
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Failed to attach media'))
      }
    },
    [post, applyPostMedia],
  )

  const openFilePicker = useCallback((kind: 'video' | 'image') => {
    if (kind === 'video') videoFileRef.current?.click()
    else imageFileRef.current?.click()
  }, [])

  const openLibraryPicker = useCallback(() => {
    setMediaPickerOpen(true)
  }, [])

  const removePostMedia = useCallback(async () => {
    if (!post) return
    try {
      const updated = await updateSocialPost(post.id, {
        video_url: null,
        video_asset_id: null,
        image_url: null,
        image_asset_id: null,
      })
      setPost(updated)
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to remove media'))
    }
  }, [post, setPost])

  return {
    mediaPickerOpen,
    mediaUploading,
    videoFileRef,
    imageFileRef,
    setMediaPickerOpen,
    applyPostMedia,
    handleVideoFileChange,
    handleImageFileChange,
    handleMediaFromLibrary,
    openFilePicker,
    openLibraryPicker,
    removePostMedia,
  }
}
