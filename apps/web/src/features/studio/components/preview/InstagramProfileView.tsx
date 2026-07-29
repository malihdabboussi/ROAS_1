'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, ExternalLink, Grid3X3, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchInstagramMedia,
  fetchInstagramProfile,
  fetchIntegrationStatus,
  type InstagramMediaItem,
  type InstagramProfileData,
} from '../../services/artifact-preview.service'

function InstagramPostCell({
  item,
  username,
  profileUrl,
}: {
  item: InstagramMediaItem
  username: string
  profileUrl: string | null
}) {
  const [showOverlay, setShowOverlay] = useState(false)
  const postLink = item.permalink ?? (profileUrl ? `${profileUrl}/p/${item.id}` : null)
  const commentsCount = item.comments_count ?? 0
  const caption = item.caption ?? ''

  const handleCopyCaption = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!caption) return
    navigator.clipboard.writeText(caption).catch(() => {})
    toast.success('Caption copied')
  }

  const handleAskVibey = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = postLink ?? `https://www.instagram.com/${username}/p/${item.id}`
    const message = `Check this post ${link} in my IG profile and please write for me answers to the comments.`
    window.dispatchEvent(new CustomEvent('vibey:sendMessage', { detail: { content: message } }))
  }

  const overlayVisible = showOverlay
  return (
    <div
      tabIndex={0}
      role="button"
      aria-label="Post actions"
      onClick={() => setShowOverlay((v) => !v)}
      className="bg-muted/30 group relative aspect-square cursor-pointer overflow-hidden focus-within:[&_.post-overlay]:pointer-events-auto focus-within:[&_.post-overlay]:opacity-100"
    >
      {item.media_type === 'VIDEO' ? (
        <video
          src={item.media_url}
          poster={item.thumbnail_url}
          className="h-full w-full object-cover"
          muted
          playsInline
        />
      ) : (
        <img
          src={item.thumbnail_url ?? item.media_url ?? ''}
          alt={caption.slice(0, 50) ?? ''}
          className="h-full w-full object-cover"
        />
      )}
      <div
        className={`post-overlay absolute inset-x-0 bottom-0 flex items-end justify-center gap-2 bg-gradient-to-t from-black/50 to-transparent pb-2 pt-8 transition-opacity ${
          overlayVisible
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            e.stopPropagation()
            setShowOverlay(false)
          }
        }}
        role="presentation"
      >
        <div className="flex items-center gap-1.5">
          <Tooltip label="Copy caption">
            <button
              type="button"
              onClick={handleCopyCaption}
              disabled={!caption}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip
            label={`${commentsCount} comment${commentsCount !== 1 ? 's' : ''} · Ask Pixel to reply`}
          >
            <button
              type="button"
              onClick={handleAskVibey}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-black/70 text-white hover:bg-black/85"
            >
              <MessageCircle className="h-4 w-4" />
              {commentsCount > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-black">
                  {commentsCount}
                </span>
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

export function InstagramProfileView() {
  const [profile, setProfile] = useState<InstagramProfileData | null>(null)
  const [media, setMedia] = useState<InstagramMediaItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [status, profileData, mediaData] = await Promise.all([
        fetchIntegrationStatus('instagram'),
        fetchInstagramProfile(),
        fetchInstagramMedia(12),
      ])
      setConnected(status.connected)
      if (!status.connected) {
        setError('Connect Instagram in Settings to view your profile.')
        return
      }
      setProfile(profileData)
      setMedia(mediaData ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load profile'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-zinc-400">{error}</p>
        {connected === false && (
          <a
            href="/settings?tab=manage"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            Connect Instagram
          </a>
        )}
      </div>
    )
  }

  const username = profile?.username ?? 'your_brand'
  const picUrl = profile?.profile_picture_url
  const bio = profile?.biography ?? ''
  const postsCount = profile?.media_count ?? media?.length ?? 0
  const followersCount = profile?.followers_count ?? 0
  const followingCount = profile?.follows_count ?? 0

  const profileUrl =
    username && username !== 'your_brand' ? `https://instagram.com/${username}` : null
  const displayName = profile?.name ?? username

  return (
    <div className="flex h-full flex-col items-center overflow-auto px-4 pt-4">
      <div className="card-glass border-border rounded-spacing-3 mx-auto w-full max-w-[480px] shrink-0 overflow-hidden border">
        <header className="border-border border-b px-4 py-3">
          <span className="text-foreground text-base font-semibold">{username}</span>
        </header>

        <div className="px-4 py-4">
          <div className="flex gap-6">
            <div className="flex-shrink-0">
              {picUrl ? (
                <img
                  src={picUrl}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 sm:h-24 sm:w-24" />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-1">
              <div className="flex gap-6">
                <div className="flex flex-col items-center">
                  <span className="text-foreground text-base font-semibold">{postsCount}</span>
                  <span className="text-muted-foreground text-xs">posts</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-foreground text-base font-semibold">{followersCount}</span>
                  <span className="text-muted-foreground text-xs">followers</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-foreground text-base font-semibold">{followingCount}</span>
                  <span className="text-muted-foreground text-xs">following</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-left">
            <div className="text-foreground font-semibold">{displayName}</div>
            {bio && (
              <p className="text-muted-foreground mt-1 whitespace-pre-wrap break-words text-sm">
                {bio}
              </p>
            )}
          </div>

          {profileUrl && (
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground border-border mt-3 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              View on Instagram
            </a>
          )}
        </div>

        <div className="border-border border-t">
          <div className="border-border flex justify-center border-b">
            <div className="text-foreground flex items-center gap-1 px-4 py-2">
              <Grid3X3 className="h-4 w-4" />
              <span className="text-xs font-medium">Posts</span>
            </div>
          </div>
        </div>
        <div className="bg-muted/20 grid grid-cols-3 gap-px">
          {(media ?? []).map((item) => (
            <InstagramPostCell
              key={item.id}
              item={item}
              username={username}
              profileUrl={profileUrl}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
