'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { MediaGenerateModal, MediaPickerModal } from '@/components/media'
import { cachedBrainScopeNav } from '@/features/brain/hooks/use-brain-scope-nav-options'
import {
  BRAIN_IMAGE_PICKER_EVENT,
  type BrainImagePickerDetail,
} from '@/features/brain/lib/brain-image-picker.events'
import { setBrainImage } from '@/features/brain/services/brain.service'
import { usePresignedUpload } from '@/lib/hooks/use-presigned-upload'
import type { MediaAsset } from '@/lib/services/media-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

export function BrainImagePickerHost() {
  const [target, setTarget] = useState<BrainImagePickerDetail | null>(null)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload: presignedUpload } = usePresignedUpload()
  const targetRef = useRef<BrainImagePickerDetail | null>(null)

  useEffect(() => {
    targetRef.current = target
  }, [target])

  const apply = useCallback(async (brainId: string, url: string | null) => {
    try {
      await setBrainImage(brainId, url)
      cachedBrainScopeNav.invalidate()
      await cachedBrainScopeNav.reload()
      toast.success(url ? 'Image updated' : 'Image removed')
    } catch (err) {
      toast.error(sanitizeUserError(err, 'Failed to update image'))
    }
  }, [])

  const handleFileUpload = useCallback(
    async (file: File | undefined, brainId: string) => {
      if (!file?.type.startsWith('image/')) return
      try {
        const res = await presignedUpload({
          file,
          name: file.name,
          category: 'upload',
          aiAnalysis: false,
        })
        const url = res.url || res.asset?.public_url
        if (url) await apply(brainId, url)
      } catch (err) {
        toast.error(sanitizeUserError(err, 'Upload failed'))
      }
    },
    [apply, presignedUpload],
  )

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<BrainImagePickerDetail>).detail
      if (!detail?.brainId) return
      setTarget(detail)
      switch (detail.action) {
        case 'upload':
          requestAnimationFrame(() => fileInputRef.current?.click())
          break
        case 'library':
          setMediaPickerOpen(true)
          break
        case 'generate':
          setGenerateOpen(true)
          break
        case 'remove':
          void apply(detail.brainId, null)
          break
      }
    }
    window.addEventListener(BRAIN_IMAGE_PICKER_EVENT, onEvent)
    return () => window.removeEventListener(BRAIN_IMAGE_PICKER_EVENT, onEvent)
  }, [apply])

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          const t = targetRef.current
          if (file && t) void handleFileUpload(file, t.brainId)
        }}
      />

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={() => {}}
        onSelectAsset={(asset: MediaAsset) => {
          const url = asset.public_url?.trim()
          setMediaPickerOpen(false)
          const t = targetRef.current
          if (url && t) void apply(t.brainId, url)
        }}
      />

      <MediaGenerateModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSelect={(url) => {
          setGenerateOpen(false)
          const t = targetRef.current
          if (t) void apply(t.brainId, url)
        }}
        title={target ? `Generate image for ${target.brainLabel}` : 'Generate brain image'}
        extraTags={['brain-image']}
      />
    </>
  )
}
