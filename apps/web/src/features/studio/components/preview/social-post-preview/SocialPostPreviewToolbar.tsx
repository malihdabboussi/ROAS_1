'use client'

import type { MouseEvent, ReactNode, RefObject } from 'react'
import {
  Archive,
  CalendarClock,
  Download,
  FileDown,
  FolderOpen,
  Image as ImageIcon,
  MoreVertical,
  Upload,
  Video as VideoIcon,
  X,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { SocialPost } from '../../../types'
import { SOCIAL_POST_PLATFORM_LOGO_SRC } from './social-post-preview.constants'

export interface SocialPostPreviewMenuProps {
  post: {
    id: string
    caption: string | null
    headline: string | null
    status: SocialPost['status']
    scheduled_at: string | null
    campaign_id: string | null
    platform: SocialPost['platform'] | null
  }
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
  onChanged: () => void
  onSchedule: () => void
  onDeleted?: () => void
}

interface SocialPostPreviewToolbarProps {
  post: SocialPost
  postTitle: string
  scheduledLabel: string | null
  isEditing: boolean
  toolbarLeading?: ReactNode
  toolbarTrailing?: ReactNode
  fullscreenButton?: ReactNode
  closeChrome?: ReactNode
  mediaUploading: boolean
  uploadMenuOpen: boolean
  downloadMenuOpen: boolean
  postMenuOpen: boolean
  postMenuButtonRef: RefObject<HTMLButtonElement | null>
  isCarousel: boolean
  carouselSlideCount: number
  hasVideo: boolean
  hasImage: boolean
  hasTsx: boolean
  isExporting: boolean
  isExportingCarousel: boolean
  renderPostMenu?: (props: SocialPostPreviewMenuProps) => ReactNode
  onToggleUploadMenu: () => void
  onCloseUploadMenu: () => void
  onToggleDownloadMenu: () => void
  onCloseDownloadMenu: () => void
  onTogglePostMenu: () => void
  onClosePostMenu: () => void
  onPostMenuChanged: () => void
  onOpenFilePicker: (kind: 'video' | 'image') => void
  onOpenLibraryPicker: () => void
  onRemoveMedia: () => Promise<void>
  onExportPng: () => Promise<void>
  onExportCarouselPDF: () => Promise<void>
  onExportCarouselZIP: () => Promise<void>
  onSchedule: () => void
  onDeleted?: () => void
}

function stopThen(callback: () => void) {
  return (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    callback()
  }
}

export function SocialPostPreviewToolbar({
  post,
  postTitle,
  scheduledLabel,
  isEditing,
  toolbarLeading,
  toolbarTrailing,
  fullscreenButton,
  closeChrome,
  mediaUploading,
  uploadMenuOpen,
  downloadMenuOpen,
  postMenuOpen,
  postMenuButtonRef,
  isCarousel,
  carouselSlideCount,
  hasVideo,
  hasImage,
  hasTsx,
  isExporting,
  isExportingCarousel,
  renderPostMenu,
  onToggleUploadMenu,
  onCloseUploadMenu,
  onToggleDownloadMenu,
  onCloseDownloadMenu,
  onTogglePostMenu,
  onClosePostMenu,
  onPostMenuChanged,
  onOpenFilePicker,
  onOpenLibraryPicker,
  onRemoveMedia,
  onExportPng,
  onExportCarouselPDF,
  onExportCarouselZIP,
  onSchedule,
  onDeleted,
}: SocialPostPreviewToolbarProps) {
  const showMediaControls = !isCarousel && post.post_type !== 'text_only'
  const showDownloadMenu = hasTsx || (isCarousel && carouselSlideCount > 1)

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 px-3 py-2">
        {toolbarLeading}
        {isEditing && (
          <span className="badge-glass badge-glass-orange body-4 shrink-0 rounded-full font-semibold">
            Edit Mode
          </span>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="body-3 flex shrink-0 items-center leading-none">
            <img
              src={SOCIAL_POST_PLATFORM_LOGO_SRC[post.platform]}
              alt=""
              className="social-post-toolbar-platform-logo"
            />
          </span>
          <span className="text-foreground body-3 min-w-0 truncate">{postTitle}</span>
          {post.status === 'published' && (
            <span className="badge-glass badge-glass-green typo-caption shrink-0 font-medium">
              Published
            </span>
          )}
          {scheduledLabel && (
            <span className="badge-glass badge-glass-blue typo-caption @[400px]:inline hidden shrink-0 font-medium">
              Scheduled {scheduledLabel}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {closeChrome}
          {showMediaControls && (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={onToggleUploadMenu}
                  disabled={mediaUploading}
                  data-tooltip="Upload media"
                  data-side="bottom"
                  className="tooltip btn-icon-bare disabled:opacity-50"
                  aria-expanded={uploadMenuOpen}
                  aria-haspopup="menu"
                >
                  <Upload className="icon-sm" />
                </button>
                {uploadMenuOpen && (
                  <>
                    <div
                      className="z-dropdown fixed inset-0"
                      onClick={onCloseUploadMenu}
                      aria-hidden
                    />
                    <div
                      className="dropdown-glass z-dropdown absolute right-0 top-full mt-1 min-w-40 py-1"
                      role="menu"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onCloseUploadMenu()
                          onOpenFilePicker('video')
                        }}
                        disabled={mediaUploading}
                        className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                      >
                        <VideoIcon className="icon-sm text-muted-foreground shrink-0" />
                        Upload video
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onCloseUploadMenu()
                          onOpenFilePicker('image')
                        }}
                        disabled={mediaUploading}
                        className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                      >
                        <ImageIcon className="icon-sm text-muted-foreground shrink-0" />
                        Upload image
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          onCloseUploadMenu()
                          onOpenLibraryPicker()
                        }}
                        disabled={mediaUploading}
                        className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                      >
                        <FolderOpen className="icon-sm text-muted-foreground shrink-0" />
                        Pick from library
                      </button>
                    </div>
                  </>
                )}
              </div>
              {(hasVideo || hasImage) && (
                <Tooltip label="Remove media">
                  <button
                    type="button"
                    onClick={() => void onRemoveMedia()}
                    className="btn-icon-bare"
                  >
                    <X className="icon-sm" />
                  </button>
                </Tooltip>
              )}
            </>
          )}
          {!fullscreenButton && toolbarTrailing}
          {showDownloadMenu && (
            <div className="relative">
              <button
                type="button"
                onClick={onToggleDownloadMenu}
                data-tooltip="Download"
                data-side="bottom"
                className="tooltip btn-icon-bare"
                aria-expanded={downloadMenuOpen}
                aria-haspopup="menu"
              >
                <Download className="icon-sm" />
              </button>
              {downloadMenuOpen && (
                <>
                  <div
                    className="z-dropdown fixed inset-0"
                    onClick={onCloseDownloadMenu}
                    aria-hidden
                  />
                  <div
                    className="dropdown-glass z-dropdown absolute right-0 top-full mt-1 min-w-40 py-1"
                    role="menu"
                  >
                    {hasTsx ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          void onExportPng().finally(onCloseDownloadMenu)
                        }}
                        disabled={isExporting}
                        className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                      >
                        <Download className="icon-sm text-muted-foreground shrink-0" />
                        PNG
                      </button>
                    ) : null}
                    {isCarousel && carouselSlideCount > 1 ? (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            void onExportCarouselPDF().finally(onCloseDownloadMenu)
                          }}
                          disabled={isExportingCarousel}
                          className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                        >
                          <FileDown className="icon-sm text-muted-foreground shrink-0" />
                          All as PDF
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            void onExportCarouselZIP().finally(onCloseDownloadMenu)
                          }}
                          disabled={isExportingCarousel}
                          className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                        >
                          <Archive className="icon-sm text-muted-foreground shrink-0" />
                          All as ZIP
                        </button>
                      </>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )}
          <span aria-hidden className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" />
          {fullscreenButton}
          <button
            ref={postMenuButtonRef}
            type="button"
            onClick={stopThen(onTogglePostMenu)}
            data-tooltip="Post options"
            data-side="bottom"
            aria-haspopup="menu"
            aria-expanded={postMenuOpen}
            className="tooltip btn-icon-bare"
          >
            <MoreVertical className="icon-sm" />
          </button>
          <button
            type="button"
            onClick={onSchedule}
            className="chip-glass-green rounded-spacing-2 h-spacing-8 flex items-center gap-1.5 px-2.5 transition-all"
          >
            <CalendarClock className="icon-sm shrink-0" />
            <span className="body-3 font-medium">
              {post.scheduled_at ? 'Reschedule' : 'Schedule'}
            </span>
          </button>
        </div>
      </div>

      {postMenuOpen && renderPostMenu
        ? renderPostMenu({
            post: {
              id: post.id,
              caption: post.caption ?? null,
              headline: post.headline ?? null,
              status: post.status,
              scheduled_at: post.scheduled_at ?? null,
              campaign_id: post.campaign_id ?? null,
              platform: post.platform ?? null,
            },
            anchorRef: postMenuButtonRef,
            onClose: onClosePostMenu,
            onChanged: onPostMenuChanged,
            onSchedule,
            onDeleted,
          })
        : null}
    </>
  )
}
