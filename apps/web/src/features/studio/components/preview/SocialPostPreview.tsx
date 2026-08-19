'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { updateSocialPost } from '../../services/artifact-preview.service'
import type { SocialPost } from '../../types'
import {
  getSocialPostPreviewTitle,
  getSocialPostScheduledLabel,
} from './social-post-preview/social-post-preview-labels'
import { InstagramFrame, LinkedInFrame } from './social-post-preview/SocialPostPlatformFrames'
import {
  SocialPostPreviewToolbar,
  type SocialPostPreviewMenuProps,
} from './social-post-preview/SocialPostPreviewToolbar'
import { SocialPostScheduleDialog } from './social-post-preview/SocialPostScheduleDialog'
import { buildSocialPostVisualPresentation } from './social-post-preview/SocialPostVisualPresentation'
import { looksLikeVideoUrl } from './social-post-preview/SocialPostVisualRenderers'
import { useSocialPostExportActions } from './social-post-preview/useSocialPostExportActions'
import {
  IMAGE_ACCEPT_MIME,
  useSocialPostMediaActions,
  VIDEO_ACCEPT_MIME,
} from './social-post-preview/useSocialPostMediaActions'
import { useSocialPostPreviewData } from './social-post-preview/useSocialPostPreviewData'
import { useSocialPostScheduleActions } from './social-post-preview/useSocialPostScheduleActions'

type AspectKey = '1:1' | '4:5' | '9:16' | '1.91:1'

const DIMENSIONS: Record<AspectKey, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '1.91:1': { width: 1200, height: 627 },
}

function getPreviewRenderSize(aspect: AspectKey, platform: SocialPost['platform']) {
  const base = DIMENSIONS[aspect]
  const previewWidth = platform === 'linkedin' ? 460 : platform === 'instagram' ? 390 : 360
  return {
    width: previewWidth,
    height: Math.round((previewWidth * base.height) / base.width),
  }
}

function defaultAspectForPost(post: SocialPost): AspectKey {
  if (post.post_type === 'text_only') return '4:5'
  if (post.post_type === 'story' || post.post_type === 'reel') return '9:16'
  // 2026 feed-first default: portrait (4:5) performs best for both IG carousels and LinkedIn visuals.
  if (post.post_type === 'single_image' || post.post_type === 'carousel') return '4:5'
  // Keep landscape as explicit fallback only.
  if (post.platform === 'linkedin') return '1.91:1'
  return '4:5'
}

function getSocialPostExportDimensions(post: SocialPost) {
  return DIMENSIONS[defaultAspectForPost(post)]
}

interface SocialPostPreviewProps {
  socialPostId: string
  onPublish?: (socialPostId: string) => void
  hideToolbar?: boolean
  /** Prepended before platform pill / title (e.g. Spaces deep-work Back). */
  toolbarLeading?: ReactNode
  toolbarTrailing?: ReactNode
  /** When provided, renders left of the 3-dot post menu in the new toolbar order. */
  fullscreenButton?: ReactNode
  /** When provided, renders at the very right (after Schedule), as the last "other icon" group. */
  closeChrome?: ReactNode
  /** Called after the kebab-menu delete completes (host clears selection). */
  onResourceDeleted?: () => void
  renderPostMenu?: (props: SocialPostPreviewMenuProps) => ReactNode
}

export default function SocialPostPreview({
  socialPostId,
  hideToolbar,
  toolbarLeading,
  toolbarTrailing,
  fullscreenButton,
  closeChrome,
  onResourceDeleted,
  renderPostMenu,
}: SocialPostPreviewProps) {
  const [carouselIndex, setCarouselIndex] = useState(0)
  const previewRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [publishErrors, setPublishErrors] = useState<string[]>([])
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false)
  const [postMenuOpen, setPostMenuOpen] = useState(false)
  const postMenuButtonRef = useRef<HTMLButtonElement>(null)
  const resetCarouselIndex = useCallback(() => setCarouselIndex(0), [])
  const { post, setPost, loading, error, integrationConnected, existingSchedules, refreshPost } =
    useSocialPostPreviewData({
      socialPostId,
      onLoadStart: resetCarouselIndex,
    })
  const {
    scheduleOpen,
    setScheduleOpen,
    scheduleMode,
    setScheduleMode,
    scheduleValue,
    scheduleMonth,
    scheduleWorking,
    validation,
    selectedScheduleDate,
    scheduledOnSelectedDay,
    nextSlot,
    openScheduleDialog,
    handleScheduleDateButtonClick,
    handleSchedulePrevMonth,
    handleScheduleNextMonth,
    handleScheduleDateSelect,
    handleScheduleJumpToday,
    handleScheduleTimeChange,
    handleScheduleConfirm,
  } = useSocialPostScheduleActions({
    post,
    setPost,
    integrationConnected,
    existingSchedules,
    setPublishErrors,
  })
  const {
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
  } = useSocialPostMediaActions({ post, setPost })
  const {
    isExporting,
    isExportingCarousel,
    handleExportPng,
    handleExportCarouselPDF,
    handleExportCarouselZIP,
  } = useSocialPostExportActions({
    post,
    previewRef,
    setCarouselIndex,
    setPublishErrors,
    getExportDimensions: getSocialPostExportDimensions,
  })

  useEffect(() => {
    setDownloadMenuOpen(false)
    setUploadMenuOpen(false)
    setPostMenuOpen(false)
  }, [socialPostId])

  const handleCaptionChange = useCallback(
    async (newCaption: string) => {
      if (!post || newCaption === post.caption) return
      const updated = await updateSocialPost(post.id, { caption: newCaption })
      setPost(updated)
    },
    [post],
  )

  const slidesRef = useRef(0)
  const handlePrev = useCallback(() => setCarouselIndex((prev) => Math.max(0, prev - 1)), [])
  const handleNext = useCallback(
    () => setCarouselIndex((prev) => Math.min(slidesRef.current - 1, prev + 1)),
    [],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb size="md" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-zinc-400">
        {error || 'Social post not found'}
      </div>
    )
  }

  const aspect = defaultAspectForPost(post)
  const { width, height } = getPreviewRenderSize(aspect, post.platform)
  const carouselSlides = post.carousel_slides ?? []
  slidesRef.current = carouselSlides.length
  const isCarousel = post.post_type === 'carousel'
  const safeCarouselIndex =
    carouselSlides.length > 0 ? Math.min(carouselIndex, carouselSlides.length - 1) : 0
  const { hasTsx, hasVideo, hasImage, carouselSlideElements, singleVisualContent } =
    buildSocialPostVisualPresentation({
      post,
      carouselSlides,
      safeCarouselIndex,
      isCarousel,
      width,
      height,
      previewRef,
      mediaUploading,
      openFilePicker,
      openLibraryPicker,
    })

  const postTitle = getSocialPostPreviewTitle(post)
  const scheduledLabel = getSocialPostScheduledLabel(post)

  return (
    <div
      className={`@container flex min-h-0 flex-1 flex-col rounded-tl-2xl ${hideToolbar ? 'overflow-visible' : 'overflow-hidden'}`}
    >
      {!hideToolbar && (
        <SocialPostPreviewToolbar
          post={post}
          postTitle={postTitle}
          scheduledLabel={scheduledLabel}
          isEditing={isEditing}
          toolbarLeading={toolbarLeading}
          toolbarTrailing={toolbarTrailing}
          fullscreenButton={fullscreenButton}
          closeChrome={closeChrome}
          mediaUploading={mediaUploading}
          uploadMenuOpen={uploadMenuOpen}
          downloadMenuOpen={downloadMenuOpen}
          postMenuOpen={postMenuOpen}
          postMenuButtonRef={postMenuButtonRef}
          isCarousel={isCarousel}
          carouselSlideCount={carouselSlides.length}
          hasVideo={hasVideo}
          hasImage={hasImage}
          hasTsx={hasTsx}
          isExporting={isExporting}
          isExportingCarousel={isExportingCarousel}
          renderPostMenu={renderPostMenu}
          onToggleUploadMenu={() => setUploadMenuOpen((open) => !open)}
          onCloseUploadMenu={() => setUploadMenuOpen(false)}
          onToggleDownloadMenu={() => setDownloadMenuOpen((open) => !open)}
          onCloseDownloadMenu={() => setDownloadMenuOpen(false)}
          onTogglePostMenu={() => setPostMenuOpen((open) => !open)}
          onClosePostMenu={() => setPostMenuOpen(false)}
          onPostMenuChanged={() => {
            void refreshPost().catch(() => {})
          }}
          onOpenFilePicker={openFilePicker}
          onOpenLibraryPicker={openLibraryPicker}
          onRemoveMedia={removePostMedia}
          onExportPng={handleExportPng}
          onExportCarouselPDF={handleExportCarouselPDF}
          onExportCarouselZIP={handleExportCarouselZIP}
          onSchedule={openScheduleDialog}
          onDeleted={onResourceDeleted}
        />
      )}

      {publishErrors.length > 0 && (
        <div className="shrink-0 px-3 pb-1 pt-0">
          <div className="text-destructive rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs">
            {publishErrors.map((message, index) => (
              <div key={`${message}-${index}`}>{message}</div>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="px-spacing-3 py-spacing-4 flex w-full flex-col items-center">
          {post.platform === 'instagram' ? (
            <InstagramFrame
              post={post}
              slides={carouselSlideElements}
              activeSlide={safeCarouselIndex}
              onPrev={handlePrev}
              onNext={handleNext}
              onCaptionChange={handleCaptionChange}
              onEditingChange={setIsEditing}
              visualCaptureRef={isCarousel && carouselSlides.length > 1 ? previewRef : undefined}
              hideInlineCarouselChrome={isCarousel && carouselSlides.length > 1}
            >
              {singleVisualContent}
            </InstagramFrame>
          ) : (
            <LinkedInFrame
              post={post}
              slides={carouselSlideElements}
              activeSlide={safeCarouselIndex}
              onPrev={handlePrev}
              onNext={handleNext}
              onCaptionChange={handleCaptionChange}
              onEditingChange={setIsEditing}
              visualCaptureRef={isCarousel && carouselSlides.length > 1 ? previewRef : undefined}
              hideInlineCarouselChrome={isCarousel && carouselSlides.length > 1}
            >
              {singleVisualContent}
            </LinkedInFrame>
          )}
        </div>
        {isCarousel && carouselSlides.length > 1 ? (
          <div className="px-spacing-3 py-spacing-2 flex shrink-0 items-center justify-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={safeCarouselIndex === 0}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 rounded-spacing-2 text-muted-foreground flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft className="icon-sm" />
            </button>
            <div className="flex items-center gap-2">
              {carouselSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCarouselIndex(idx)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    idx === safeCarouselIndex
                      ? 'indicator-dot-glass-blue h-2.5 w-2.5'
                      : 'bg-border hover:bg-muted-foreground/40'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleNext}
              disabled={safeCarouselIndex === carouselSlides.length - 1}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 rounded-spacing-2 text-muted-foreground flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight className="icon-sm" />
            </button>
          </div>
        ) : null}
      </div>

      <input
        ref={videoFileRef}
        type="file"
        accept={VIDEO_ACCEPT_MIME}
        className="hidden"
        onChange={handleVideoFileChange}
      />
      <input
        ref={imageFileRef}
        type="file"
        accept={IMAGE_ACCEPT_MIME}
        className="hidden"
        onChange={handleImageFileChange}
      />

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => {
          setMediaPickerOpen(false)
          const kind: 'video' | 'image' = looksLikeVideoUrl(url) ? 'video' : 'image'
          void applyPostMedia({ kind, url }).catch((err) => {
            toast.error(sanitizeUserError(err, 'Failed to attach media'))
          })
        }}
        onSelectAsset={handleMediaFromLibrary}
        campaignId={post.campaign_id ?? undefined}
      />

      <SocialPostScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        isReschedule={Boolean(post.scheduled_at)}
        postTitle={postTitle}
        validation={validation}
        scheduleMode={scheduleMode}
        onScheduleModeChange={setScheduleMode}
        scheduleValue={scheduleValue}
        selectedScheduleDate={selectedScheduleDate}
        scheduleMonth={scheduleMonth}
        scheduledOnSelectedDay={scheduledOnSelectedDay}
        nextSlot={nextSlot}
        scheduleWorking={scheduleWorking}
        onDateButtonClick={handleScheduleDateButtonClick}
        onPrevMonth={handleSchedulePrevMonth}
        onNextMonth={handleScheduleNextMonth}
        onSelectDate={handleScheduleDateSelect}
        onJumpToday={handleScheduleJumpToday}
        onTimeChange={handleScheduleTimeChange}
        onConfirm={() => void handleScheduleConfirm()}
      />
    </div>
  )
}
