'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Clapperboard, Image, Layers, X } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { getIgMediaToggles } from '../../../../lib/ig-research-media-toggles'
import type { SocialPlatform, ViewDef } from '../../../../types/space-schema'
import { getSocialConfig, patchSocialConfig } from './instagram-customize.helpers'

export function IgFormatSubView({
  activeView,
  platform = 'instagram',
  onViewPatch,
  onBack,
  onClose,
}: {
  activeView: ViewDef
  platform?: SocialPlatform
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
}) {
  const ic = getSocialConfig(activeView, platform)
  const { reels, images, slideshows, youtubeVideos, youtubeShorts, xTweets, xVideos } =
    getIgMediaToggles(ic, platform)

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-3 font-semibold text-[var(--foreground)]">Format</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <div className="mb-1 mt-3 flex items-center justify-between">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">Shown in grid & list</p>
        </div>
        <div className="space-y-0.5">
          {platform === 'youtube' ? (
            <>
              <div className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]">
                <div className="flex min-w-0 items-center gap-2">
                  <Clapperboard className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--foreground)]">Videos</span>
                </div>
                <Switch
                  checked={youtubeVideos}
                  onCheckedChange={(v) => {
                    patchSocialConfig(
                      onViewPatch,
                      ic,
                      {
                        media_show_yt_videos: v,
                        media_show_yt_shorts: youtubeShorts,
                      },
                      platform,
                      activeView,
                    )
                  }}
                />
              </div>
              <div className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]">
                <div className="flex min-w-0 items-center gap-2">
                  <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--foreground)]">Shorts</span>
                </div>
                <Switch
                  checked={youtubeShorts}
                  onCheckedChange={(v) => {
                    patchSocialConfig(
                      onViewPatch,
                      ic,
                      {
                        media_show_yt_videos: youtubeVideos,
                        media_show_yt_shorts: v,
                      },
                      platform,
                      activeView,
                    )
                  }}
                />
              </div>
            </>
          ) : platform === 'twitter' ? (
            <>
              <div className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]">
                <div className="flex min-w-0 items-center gap-2">
                  <Image className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--foreground)]">Tweets</span>
                </div>
                <Switch
                  checked={xTweets}
                  onCheckedChange={(v) => {
                    patchSocialConfig(
                      onViewPatch,
                      ic,
                      {
                        media_show_x_tweets: v,
                        media_show_x_videos: xVideos,
                      },
                      platform,
                      activeView,
                    )
                  }}
                />
              </div>
              <div className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]">
                <div className="flex min-w-0 items-center gap-2">
                  <Clapperboard className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--foreground)]">Videos</span>
                </div>
                <Switch
                  checked={xVideos}
                  onCheckedChange={(v) => {
                    patchSocialConfig(
                      onViewPatch,
                      ic,
                      {
                        media_show_x_tweets: xTweets,
                        media_show_x_videos: v,
                      },
                      platform,
                      activeView,
                    )
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]">
                <div className="flex min-w-0 items-center gap-2">
                  <Clapperboard className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--foreground)]">
                    {platform === 'tiktok' ? 'Videos' : 'Reels'}
                  </span>
                </div>
                <Switch
                  checked={reels}
                  onCheckedChange={(v) => {
                    patchSocialConfig(
                      onViewPatch,
                      ic,
                      {
                        media_show_reels: v,
                        media_show_images: images,
                        media_show_slideshows: slideshows,
                        media_filter: undefined,
                      },
                      platform,
                      activeView,
                    )
                  }}
                />
              </div>
              <div className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]">
                <div className="flex min-w-0 items-center gap-2">
                  <Image className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--foreground)]">
                    {platform === 'tiktok' ? 'Photos' : 'Images'}
                  </span>
                </div>
                <Switch
                  checked={images}
                  onCheckedChange={(v) => {
                    patchSocialConfig(
                      onViewPatch,
                      ic,
                      {
                        media_show_reels: reels,
                        media_show_images: v,
                        media_show_slideshows: slideshows,
                        media_filter: undefined,
                      },
                      platform,
                      activeView,
                    )
                  }}
                />
              </div>
              {platform === 'tiktok' ? (
                <div className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]">
                  <div className="flex min-w-0 items-center gap-2">
                    <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                    <span className="body-3 truncate text-[var(--foreground)]">Slideshows</span>
                  </div>
                  <Switch
                    checked={slideshows}
                    onCheckedChange={(v) => {
                      patchSocialConfig(
                        onViewPatch,
                        ic,
                        {
                          media_show_reels: reels,
                          media_show_images: images,
                          media_show_slideshows: v,
                          media_filter: undefined,
                        },
                        platform,
                      )
                    }}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
