'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bookmark,
  ClipboardCopy,
  Clock,
  ExternalLink,
  Eye,
  Film,
  Hash,
  Heart,
  Link2,
  Loader2,
  MessageSquare,
  Minimize2,
  Music,
  Play,
  Quote,
  Repeat2,
  Shield,
  Tag,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import {
  reportSocialResearchError,
  socialResearchContext,
} from '../../lib/report-social-research-error'
import {
  analyzeSocialPost,
  breakdownSocialPost,
  extractHook,
  fetchPostComments,
  formatViewCount,
  isTopicPreviewItemId,
  type SocialCommentItem,
  type SocialRichPostInfo,
  type VideoBreakdown,
} from '../../services/social-research.service'
import type { SpaceItem } from '../../types'
import type { SocialPlatform } from '../../types/space-schema'
import { CollapsibleSection } from '../analysis/CollapsibleSection'
import {
  proxiedSocialMediaUrl,
  resolveSocialThumbnailUrl,
} from '../social-research/social-image-proxy'
import { formatReadableMultiline, splitTranscriptParagraphs } from './ig-display-text'
import { resolveSocialResearchMediaFrame } from './social-research-media-frame'

interface ContentAnalysisModalProps {
  item: SpaceItem
  spaceId: string
  onClose: () => void
  onUpdated: () => Promise<void>
  /** When true on open, fullscreen video player is shown immediately (e.g. list Preview cell). */
  initialVideoExpanded?: boolean
  /** Defaults to 'instagram' so existing call sites keep working without churn. */
  platform?: SocialPlatform
  /**
   * Persists a topic-search preview as a real research item and returns its id.
   * Analysis stores enrichment on the item, so previews must be saved first.
   */
  onPersistPreview?: () => Promise<string | null>
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function resolveFormatLabel(mediaType: string, platform: SocialPlatform): string {
  if (mediaType === 'youtube_short') return 'Short'
  if (mediaType === 'youtube_video') return 'Video'
  if (mediaType === 'tweet') return 'Tweet'
  if (mediaType === 'tweet_video') return 'Video'
  if (mediaType === 'slideshow') return 'Slideshow'
  if (mediaType === 'reel') return platform === 'tiktok' ? 'Video' : 'Reel'
  if (platform === 'youtube') return 'Video'
  return 'Post'
}

function resolveAnalyzeActionLabel(platform: SocialPlatform, analyzing: boolean): string {
  if (analyzing) return 'Analyzing…'
  if (platform === 'youtube') return 'Analyze video'
  return 'Analyze post'
}

/** Decorative stack — aligns with artifact empty-state mockups (ads / funnels). */
function IgContentAnalyzeMockup() {
  return (
    <div aria-hidden className="relative mx-auto h-44 w-full max-w-[18rem] select-none">
      <div className="bg-muted-foreground absolute left-1/2 top-1/2 -z-10 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />
      <div className="card-glass absolute left-1 top-8 flex h-[4.25rem] w-[6.5rem] -rotate-6 flex-col overflow-hidden p-0 opacity-45 shadow-lg">
        <div className="border-border bg-muted flex h-6 shrink-0 items-center border-b px-2 opacity-90">
          <Film className="h-3 w-3 text-[var(--color-muted-foreground)] opacity-50" />
        </div>
        <div className="bg-secondary border-border min-h-0 flex-1 border-t-0" />
      </div>
      <div className="card-glass absolute left-1/2 top-3 flex h-[8.25rem] w-[11.5rem] -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="border-border bg-muted flex h-7 shrink-0 items-center justify-between border-b px-2.5 opacity-90">
          <div className="flex items-center gap-1.5">
            <Play className="h-3 w-3 text-[var(--color-muted-foreground)] opacity-50" />
            <div className="bg-muted-foreground h-2 w-12 rounded-full opacity-25" />
          </div>
          <div className="bg-muted-foreground h-2.5 w-9 rounded-full opacity-15" />
        </div>
        <div className="flex min-h-0 flex-1 gap-2 p-2">
          <div className="border-border bg-secondary w-[36%] shrink-0 rounded-md border" />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-0.5">
            <div className="bg-muted-foreground h-1.5 w-full rounded-full opacity-20" />
            <div className="bg-muted-foreground h-1 w-[88%] rounded-full opacity-15" />
            <div className="bg-muted-foreground h-1 w-3/5 rounded-full opacity-15" />
            <div className="relative mt-auto pt-1">
              <div className="bg-primary h-7 w-full rounded-md opacity-35" />
              <div className="absolute bottom-1 right-2">
                <Zap className="h-3 w-3 text-[var(--color-muted-foreground)] opacity-60 drop-shadow-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Centered formula card — same layout concept as IgContentAnalyzeMockup. */
function IgFormulaBreakdownMockup() {
  return (
    <div aria-hidden className="relative mx-auto h-44 w-full max-w-[18rem] select-none">
      <div className="bg-muted-foreground absolute left-1/2 top-1/2 -z-10 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />
      <div className="card-glass absolute left-1 top-8 flex h-[4.25rem] w-[6.5rem] -rotate-6 flex-col overflow-hidden p-0 opacity-45 shadow-lg">
        <div className="border-border bg-muted flex h-6 shrink-0 items-center border-b px-2 opacity-90">
          <Zap className="h-3 w-3 text-[var(--color-muted-foreground)] opacity-50" />
        </div>
        <div className="bg-secondary border-border min-h-0 flex-1 border-t-0" />
      </div>
      <div className="card-glass absolute left-1/2 top-3 flex h-[8.25rem] w-[11.5rem] -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="border-border bg-muted flex h-7 shrink-0 items-center justify-between border-b px-2.5 opacity-90">
          <div className="flex items-center gap-1.5">
            <Film className="h-3 w-3 text-[var(--color-muted-foreground)] opacity-50" />
            <div className="bg-muted-foreground h-2 w-12 rounded-full opacity-25" />
          </div>
          <div className="bg-muted-foreground h-2.5 w-9 rounded-full opacity-15" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2">
          <div className="border-border bg-secondary aspect-[2/1] w-full shrink-0 rounded-md border" />
          <div className="bg-muted-foreground h-1 w-full rounded-full opacity-20" />
          <div className="bg-muted-foreground h-1 w-[88%] rounded-full opacity-15" />
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2 py-1">
            <div className="bg-muted-foreground h-1 w-4/5 rounded-full opacity-20" />
          </div>
          <div className="relative mt-auto pt-0.5">
            <div className="bg-primary h-6 w-full rounded-md opacity-35" />
            <div className="absolute bottom-1 right-2">
              <Zap className="h-3 w-3 text-[var(--color-muted-foreground)] opacity-60 drop-shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Small comment-thread stack for the engagement empty state. */
function IgCommentsLoadMockup() {
  return (
    <div aria-hidden className="relative mx-auto h-28 w-full max-w-[14rem] select-none">
      <div className="bg-muted-foreground absolute left-1/2 top-1/2 -z-10 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-2xl" />
      <div className="card-glass absolute left-1 top-3 flex w-[10.5rem] flex-col gap-1.5 rounded-lg p-2.5 opacity-55 shadow-lg">
        <div className="flex items-center gap-1.5">
          <div className="bg-muted-foreground h-4 w-4 shrink-0 rounded-full opacity-20" />
          <div className="bg-muted-foreground h-1.5 w-16 rounded-full opacity-20" />
        </div>
        <div className="bg-muted-foreground h-1.5 w-full rounded-full opacity-15" />
        <div className="bg-muted-foreground h-1.5 w-[85%] rounded-full opacity-15" />
      </div>
      <div className="card-glass absolute bottom-1 right-1 flex w-[9.5rem] flex-col gap-1.5 rounded-lg p-2.5 shadow-xl">
        <div className="flex items-center gap-1.5">
          <div className="bg-muted-foreground h-4 w-4 shrink-0 rounded-full opacity-25" />
          <div className="bg-muted-foreground h-1.5 w-12 rounded-full opacity-25" />
          <MessageSquare className="ml-auto h-3 w-3 text-[var(--color-muted-foreground)] opacity-40" />
        </div>
        <div className="bg-muted-foreground h-1.5 w-full rounded-full opacity-20" />
        <div className="bg-muted-foreground h-1.5 w-3/5 rounded-full opacity-15" />
      </div>
    </div>
  )
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-[var(--foreground)]">{value}</span>
    </div>
  )
}

function DetailField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1 py-2.5">
      <span className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </span>
      <p className="text-sm leading-relaxed text-[var(--foreground)]">{value}</p>
    </div>
  )
}

type AnalysisTab = 'content' | 'formula' | 'engagement' | 'details'

function AnalysisTabBar({
  active,
  onChange,
}: {
  active: AnalysisTab
  onChange: (tab: AnalysisTab) => void
}) {
  const tabs: Array<{ id: AnalysisTab; label: string }> = [
    { id: 'content', label: 'Content' },
    { id: 'formula', label: 'Formula' },
    { id: 'engagement', label: 'Engagement' },
    { id: 'details', label: 'Details' },
  ]
  return (
    <div className="flex shrink-0 gap-1 border-b border-[var(--border)] px-2 pt-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'body-3 rounded-t-md px-3 py-2 font-medium transition-colors',
            active === tab.id
              ? 'border-b-2 border-[var(--color-primary)] text-[var(--foreground)]'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function ContentAnalysisModal({
  item,
  spaceId,
  onClose,
  onUpdated,
  initialVideoExpanded = false,
  platform = 'instagram',
  onPersistPreview,
}: ContentAnalysisModalProps) {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const shortcode = cd.shortcode as string
  const handle = cd._handle as string
  const thumbnailUrl = resolveSocialThumbnailUrl(platform, cd)
  const videoUrl = proxiedSocialMediaUrl(platform, cd.video_url as string | null)
  const playCount = (cd.play_count as number) ?? 0
  const outlierScore = (cd.outlier_score as number) ?? 0
  const mediaType = cd.media_type as string
  const takenAt = cd.taken_at as string | null

  const isAlreadyAnalyzed = Boolean(cd.analyzed_at)
  const analyzedAtFromItem = cd.analyzed_at as string | undefined

  const applyPostInfoToState = useCallback(
    (info: SocialRichPostInfo, nextTranscript: string | null) => {
      if (info.caption) setCaption(info.caption)
      if (info.like_count != null) setLikeCount(info.like_count)
      if (info.comment_count != null) setCommentCount(info.comment_count)
      if (info.play_count != null) setAnalyzedPlayCount(info.play_count)
      if (info.video_duration != null) setVideoDuration(info.video_duration)
      if (info.owner_username) setOwnerUsername(info.owner_username)
      if (info.owner_full_name) setOwnerFullName(info.owner_full_name)
      if (info.owner_follower_count != null) setOwnerFollowerCount(info.owner_follower_count)
      if (info.owner_is_verified) setOwnerIsVerified(info.owner_is_verified)
      if (info.audio_name) setAudioName(info.audio_name)
      if (info.audio_artist) setAudioArtist(info.audio_artist)
      if (info.is_original_audio) setIsOriginalAudio(info.is_original_audio)
      if (info.is_paid_partnership) setIsPaidPartnership(info.is_paid_partnership)
      if (info.tagged_users.length > 0) setTaggedUsers(info.tagged_users)
      if (info.retweet_count != null) setRetweetCount(info.retweet_count)
      if (info.quote_count != null) setQuoteCount(info.quote_count)
      if (info.bookmark_count != null) setBookmarkCount(info.bookmark_count)
      if (info.post_lang) setPostLang(info.post_lang)
      if (info.post_source) setPostSource(info.post_source)
      if (info.hashtag_names && info.hashtag_names.length > 0) setHashtagNames(info.hashtag_names)
      if (info.mention_handles && info.mention_handles.length > 0)
        setMentionHandles(info.mention_handles)
      if (info.link_urls && info.link_urls.length > 0) setLinkUrls(info.link_urls)
      if (info.post_description) setPostDescription(info.post_description)
      if (info.post_genre) setPostGenre(info.post_genre)
      if (info.keyword_names && info.keyword_names.length > 0) setYtKeywords(info.keyword_names)
      if (nextTranscript) setTranscript(nextTranscript)
    },
    [],
  )

  const applyCustomDataToState = useCallback((data: Record<string, unknown>) => {
    if (typeof data.caption === 'string') setCaption(data.caption)
    if (typeof data.transcript === 'string') setTranscript(data.transcript)
    if (data.like_count != null) setLikeCount(data.like_count as number)
    if (data.comment_count != null) setCommentCount(data.comment_count as number)
    if (data.play_count != null) setAnalyzedPlayCount(data.play_count as number)
    if (data.video_duration != null) setVideoDuration(data.video_duration as number)
    if (typeof data.owner_username === 'string') setOwnerUsername(data.owner_username)
    if (typeof data.owner_full_name === 'string') setOwnerFullName(data.owner_full_name)
    if (data.owner_follower_count != null)
      setOwnerFollowerCount(data.owner_follower_count as number)
    if (data.owner_is_verified === true) setOwnerIsVerified(true)
    if (typeof data.audio_name === 'string') setAudioName(data.audio_name)
    if (typeof data.audio_artist === 'string') setAudioArtist(data.audio_artist)
    if (data.is_original_audio === true) setIsOriginalAudio(true)
    if (data.is_paid_partnership === true) setIsPaidPartnership(true)
    if (Array.isArray(data.tagged_users) && data.tagged_users.length > 0) {
      setTaggedUsers(data.tagged_users as string[])
    }
    if (data.retweet_count != null) setRetweetCount(data.retweet_count as number)
    if (data.quote_count != null) setQuoteCount(data.quote_count as number)
    if (data.bookmark_count != null) setBookmarkCount(data.bookmark_count as number)
    if (typeof data.post_lang === 'string') setPostLang(data.post_lang)
    if (typeof data.post_source === 'string') setPostSource(data.post_source)
    if (Array.isArray(data.hashtag_names) && data.hashtag_names.length > 0) {
      setHashtagNames(data.hashtag_names as string[])
    }
    if (Array.isArray(data.mention_handles) && data.mention_handles.length > 0) {
      setMentionHandles(data.mention_handles as string[])
    }
    if (Array.isArray(data.link_urls) && data.link_urls.length > 0) {
      setLinkUrls(data.link_urls as string[])
    }
    if (typeof data.post_description === 'string') setPostDescription(data.post_description)
    if (typeof data.post_genre === 'string') setPostGenre(data.post_genre)
    if (Array.isArray(data.keyword_names) && data.keyword_names.length > 0) {
      setYtKeywords(data.keyword_names as string[])
    }
  }, [])

  const [caption, setCaption] = useState<string | null>((cd.caption as string) ?? null)
  const [transcript, setTranscript] = useState<string | null>((cd.transcript as string) ?? null)
  const [likeCount, setLikeCount] = useState<number | null>((cd.like_count as number) ?? null)
  const [commentCount, setCommentCount] = useState<number | null>(
    (cd.comment_count as number) ?? null,
  )
  const [videoDuration, setVideoDuration] = useState<number | null>(
    (cd.video_duration as number) ?? null,
  )
  const [ownerUsername, setOwnerUsername] = useState<string | null>(
    (cd.owner_username as string) ?? null,
  )
  const [ownerFullName, setOwnerFullName] = useState<string | null>(
    (cd.owner_full_name as string) ?? null,
  )
  const [ownerFollowerCount, setOwnerFollowerCount] = useState<number | null>(
    (cd.owner_follower_count as number) ?? null,
  )
  const [ownerIsVerified, setOwnerIsVerified] = useState<boolean>(
    (cd.owner_is_verified as boolean) ?? false,
  )
  const [audioName, setAudioName] = useState<string | null>((cd.audio_name as string) ?? null)
  const [audioArtist, setAudioArtist] = useState<string | null>((cd.audio_artist as string) ?? null)
  const [isOriginalAudio, setIsOriginalAudio] = useState<boolean>(
    (cd.is_original_audio as boolean) ?? false,
  )
  const [isPaidPartnership, setIsPaidPartnership] = useState<boolean>(
    (cd.is_paid_partnership as boolean) ?? false,
  )
  const [taggedUsers, setTaggedUsers] = useState<string[]>((cd.tagged_users as string[]) ?? [])
  const [retweetCount, setRetweetCount] = useState<number | null>(
    (cd.retweet_count as number) ?? null,
  )
  const [quoteCount, setQuoteCount] = useState<number | null>((cd.quote_count as number) ?? null)
  const [bookmarkCount, setBookmarkCount] = useState<number | null>(
    (cd.bookmark_count as number) ?? null,
  )
  const [postLang, setPostLang] = useState<string | null>((cd.post_lang as string) ?? null)
  const [postSource, setPostSource] = useState<string | null>((cd.post_source as string) ?? null)
  const [hashtagNames, setHashtagNames] = useState<string[]>((cd.hashtag_names as string[]) ?? [])
  const [mentionHandles, setMentionHandles] = useState<string[]>(
    (cd.mention_handles as string[]) ?? [],
  )
  const [linkUrls, setLinkUrls] = useState<string[]>((cd.link_urls as string[]) ?? [])
  const [postDescription, setPostDescription] = useState<string | null>(
    (cd.post_description as string) ?? null,
  )
  const [postGenre, setPostGenre] = useState<string | null>((cd.post_genre as string) ?? null)
  const [ytKeywords, setYtKeywords] = useState<string[]>((cd.keyword_names as string[]) ?? [])
  const [analyzedPlayCount, setAnalyzedPlayCount] = useState<number | null>(
    (cd.play_count as number) ?? null,
  )

  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(isAlreadyAnalyzed)
  const showAnalyzedView = analyzed || Boolean(analyzedAtFromItem)
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('content')
  const [videoExpanded, setVideoExpanded] = useState(false)
  const [openCaption, setOpenCaption] = useState(true)
  const [openDescription, setOpenDescription] = useState(true)
  const [openHook, setOpenHook] = useState(true)
  const [openFormulaTopic, setOpenFormulaTopic] = useState(true)
  const [openFormulaPackaging, setOpenFormulaPackaging] = useState(true)
  const [openFormulaQuestions, setOpenFormulaQuestions] = useState(true)
  const [openFormulaHook, setOpenFormulaHook] = useState(true)
  const [openFormulaSetup, setOpenFormulaSetup] = useState(true)
  const [openFormulaScript, setOpenFormulaScript] = useState(true)
  const [openFormulaSteal, setOpenFormulaSteal] = useState(true)
  const [openComments, setOpenComments] = useState(true)
  const [breakdown, setBreakdown] = useState<VideoBreakdown | null>(
    (cd.video_breakdown as VideoBreakdown) ?? null,
  )
  const [breakingDown, setBreakingDown] = useState(false)
  const [comments, setComments] = useState<SocialCommentItem[]>(
    Array.isArray(cd.comments) ? (cd.comments as SocialCommentItem[]) : [],
  )
  const [commentsCursor, setCommentsCursor] = useState<string | null>(
    typeof cd.comments_next_cursor === 'string' ? cd.comments_next_cursor : null,
  )
  const [loadingComments, setLoadingComments] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const appliedExpandIntentRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    const marker = `${item.id}:${initialVideoExpanded ? '1' : '0'}`
    if (appliedExpandIntentRef.current === marker) return
    appliedExpandIntentRef.current = marker
    setVideoExpanded(Boolean(initialVideoExpanded && videoUrl))
  }, [item.id, initialVideoExpanded, videoUrl])

  useEffect(() => {
    if (!analyzedAtFromItem) return
    const data = (item.custom_data ?? {}) as Record<string, unknown>
    setAnalyzed(true)
    applyCustomDataToState(data)
  }, [item.id, analyzedAtFromItem, applyCustomDataToState])

  useEffect(() => {
    const data = (item.custom_data ?? {}) as Record<string, unknown>
    if (data.video_breakdown) setBreakdown(data.video_breakdown as VideoBreakdown)
  }, [item.id, item.custom_data])

  const hook = useMemo(() => (transcript ? extractHook(transcript) : null), [transcript])

  const mediaPersonCaption = useMemo(() => {
    const full = ownerFullName?.trim()
    const user = ownerUsername ?? handle
    const videoTitle = caption?.trim() || item.title?.trim() || null

    if (platform === 'youtube') {
      const channelLine = full || (user ? `@${user}` : null)
      if (videoTitle) return { line1: videoTitle, line2: channelLine }
      if (channelLine) return { line1: channelLine, line2: null }
      return null
    }

    if (full) return { line1: full, line2: user ? `@${user}` : null }
    if (user) return { line1: `@${user}`, line2: null }
    return null
  }, [platform, caption, item.title, ownerFullName, ownerUsername, handle])

  const hasDetails = useMemo(
    () =>
      showAnalyzedView &&
      Boolean(ownerUsername || audioName || taggedUsers.length > 0 || isPaidPartnership),
    [showAnalyzedView, ownerUsername, audioName, taggedUsers.length, isPaidPartnership],
  )

  const hasXDetails = useMemo(
    () =>
      showAnalyzedView &&
      Boolean(
        ownerUsername ||
        ownerFullName ||
        hashtagNames.length > 0 ||
        mentionHandles.length > 0 ||
        linkUrls.length > 0 ||
        postLang ||
        postSource,
      ),
    [
      showAnalyzedView,
      ownerUsername,
      ownerFullName,
      hashtagNames.length,
      mentionHandles.length,
      linkUrls.length,
      postLang,
      postSource,
    ],
  )

  const hasYoutubeDetails = useMemo(
    () =>
      showAnalyzedView &&
      Boolean(ownerUsername || ownerFullName || postGenre || ytKeywords.length > 0 || takenAt),
    [showAnalyzedView, ownerUsername, ownerFullName, postGenre, ytKeywords.length, takenAt],
  )

  const displayPlayCount = analyzedPlayCount ?? playCount
  const mediaFrame = resolveSocialResearchMediaFrame(mediaType, platform, 'modal')
  const [visible, setVisible] = useState(true)

  const requestClose = useCallback(() => {
    setVisible(false)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (videoExpanded) setVideoExpanded(false)
        else requestClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [requestClose, videoExpanded])

  // Preview items don't exist in space_items — persist them once and reuse the
  // real id for every subsequent enrichment call in this modal session.
  const persistedIdRef = useRef<string | null>(null)
  const resolveTargetItemId = useCallback(async (): Promise<string | null> => {
    if (!isTopicPreviewItemId(item.id)) return item.id
    if (persistedIdRef.current) return persistedIdRef.current
    const persisted = (await onPersistPreview?.()) ?? null
    persistedIdRef.current = persisted
    return persisted
  }, [item.id, onPersistPreview])

  const handleAnalyze = useCallback(async () => {
    if (!shortcode) return
    const loadingId = toast.loading('Analyzing…')
    setAnalyzing(true)
    try {
      const targetItemId = await resolveTargetItemId()
      if (!targetItemId) {
        toast.error('Save this result to research first, then analyze', { id: loadingId })
        return
      }
      const result = await analyzeSocialPost(platform, spaceId, targetItemId, shortcode, {
        handle,
        isSlideshow: mediaType === 'slideshow' || mediaType === 'youtube_short',
      })
      const info: SocialRichPostInfo = result.postInfo
      applyPostInfoToState(info, result.transcript)
      setAnalyzed(true)
      setAnalysisTab('content')
      toast.success('Analysis ready', { id: loadingId })
      await onUpdated()
    } catch (err) {
      reportSocialResearchError(
        'post_analyze_failed',
        err,
        socialResearchContext(spaceId, platform, { item_id: item.id, shortcode }),
      )
      toast.dismiss(loadingId)
      toast.error('Failed to analyze post')
    } finally {
      setAnalyzing(false)
    }
  }, [
    platform,
    spaceId,
    shortcode,
    handle,
    mediaType,
    onUpdated,
    applyPostInfoToState,
    resolveTargetItemId,
  ])

  const handleBreakdown = useCallback(
    async (force = false) => {
      if (breakingDown) return
      const loadingId = toast.loading('Running formula breakdown…')
      setBreakingDown(true)
      try {
        const targetItemId = await resolveTargetItemId()
        if (!targetItemId) {
          toast.error('Save this result to research first, then run the breakdown', {
            id: loadingId,
          })
          return
        }
        const result = await breakdownSocialPost(platform, spaceId, targetItemId, force)
        setBreakdown(result)
        setAnalysisTab('formula')
        toast.success('Breakdown ready', { id: loadingId })
        await onUpdated()
      } catch (err) {
        reportSocialResearchError(
          'post_breakdown_failed',
          err,
          socialResearchContext(spaceId, platform, { item_id: item.id, shortcode }),
        )
        toast.dismiss(loadingId)
        toast.error('Failed to generate the breakdown')
      } finally {
        setBreakingDown(false)
      }
    },
    [breakingDown, onUpdated, platform, resolveTargetItemId, spaceId],
  )

  const handleLoadComments = useCallback(
    async (cursor?: string | null) => {
      if (loadingComments) return
      setLoadingComments(true)
      try {
        const targetItemId = await resolveTargetItemId()
        if (!targetItemId) {
          toast.error('Save this result to research first, then load comments')
          return
        }
        // The backend appends cursor pages onto the stored set and returns the
        // full merged list, so this always replaces local state wholesale.
        const page = await fetchPostComments(platform, spaceId, targetItemId, { cursor })
        setComments(page.comments)
        setCommentsCursor(page.nextCursor)
        if (page.comments.length === 0) toast.info('No comments found for this post')
        await onUpdated()
      } catch (err) {
        reportSocialResearchError(
          'post_comments_failed',
          err,
          socialResearchContext(spaceId, platform, { item_id: item.id, shortcode }),
        )
        const message = err instanceof Error && err.message ? err.message : ''
        toast.error(
          message.toLowerCase().includes('not found') ||
            message.toLowerCase().includes('unavailable')
            ? "The comments provider can't reach this post right now — try another post"
            : 'Failed to load comments',
        )
      } finally {
        setLoadingComments(false)
      }
    },
    [loadingComments, onUpdated, platform, resolveTargetItemId, spaceId],
  )

  const commentsCopyText = useMemo(() => {
    if (comments.length === 0) return null
    return comments
      .map(
        (c) =>
          `${c.author_name ?? 'Anonymous'}${c.author_is_creator ? ' (creator)' : ''}${c.like_count != null ? ` · ${c.like_count} likes` : ''}\n${c.text}`,
      )
      .join('\n\n')
  }, [comments])

  const igUrl = shortcode
    ? platform === 'tiktok'
      ? `https://www.tiktok.com/@${handle}/${mediaType === 'slideshow' ? 'photo' : 'video'}/${shortcode}`
      : platform === 'youtube'
        ? mediaType === 'youtube_short'
          ? `https://www.youtube.com/shorts/${shortcode}`
          : `https://www.youtube.com/watch?v=${shortcode}`
        : platform === 'twitter'
          ? `https://x.com/${handle}/status/${shortcode}`
          : `https://www.instagram.com/reel/${shortcode}/`
    : null
  const dateLabel = takenAt
    ? new Date(takenAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`))
  }, [])

  const hookTranscriptCopy = useMemo(() => {
    const parts: string[] = []
    if (hook) parts.push(`Hook:\n${hook}`)
    if (transcript) parts.push(`Transcript:\n${transcript}`)
    if (parts.length === 0)
      return { text: null as string | null, label: 'Hook + transcript' as const }
    return { text: parts.join('\n\n'), label: 'Hook + transcript' as const }
  }, [hook, transcript])

  const detailsCopyText = useMemo(() => {
    if (!hasDetails) return null
    const lines: string[] = []
    if (ownerUsername) {
      lines.push(
        `Creator: ${ownerFullName ?? ownerUsername}${ownerIsVerified ? ' ✓' : ''}${ownerFollowerCount != null ? ` · ${formatViewCount(ownerFollowerCount)} followers` : ''}`,
      )
    }
    if (audioName) {
      lines.push(
        `Audio: ${audioName}${audioArtist && !isOriginalAudio ? ` by ${audioArtist}` : ''}${isOriginalAudio ? ' (original)' : ''}`,
      )
    }
    if (isPaidPartnership) lines.push('Partnership: Paid partnership')
    if (taggedUsers.length > 0) lines.push(`Tagged: ${taggedUsers.map((u) => `@${u}`).join(', ')}`)
    const text = lines.join('\n')
    return text || null
  }, [
    hasDetails,
    ownerUsername,
    ownerFullName,
    ownerIsVerified,
    ownerFollowerCount,
    audioName,
    audioArtist,
    isOriginalAudio,
    isPaidPartnership,
    taggedUsers,
  ])

  const xDetailsCopyText = useMemo(() => {
    if (!hasXDetails) return null
    const lines: string[] = []
    if (ownerUsername || ownerFullName) {
      lines.push(
        `Creator: ${ownerFullName ?? ownerUsername}${ownerIsVerified ? ' ✓' : ''}${ownerFollowerCount != null ? ` · ${formatViewCount(ownerFollowerCount)} followers` : ''}`,
      )
    }
    if (postLang) lines.push(`Language: ${postLang}`)
    if (postSource) lines.push(`Source: ${postSource}`)
    if (hashtagNames.length > 0)
      lines.push(`Hashtags: ${hashtagNames.map((h) => `#${h}`).join(', ')}`)
    if (mentionHandles.length > 0) {
      lines.push(`Mentions: ${mentionHandles.map((u) => `@${u}`).join(', ')}`)
    }
    if (linkUrls.length > 0) lines.push(`Links:\n${linkUrls.join('\n')}`)
    return lines.join('\n') || null
  }, [
    hasXDetails,
    ownerUsername,
    ownerFullName,
    ownerIsVerified,
    ownerFollowerCount,
    postLang,
    postSource,
    hashtagNames,
    mentionHandles,
    linkUrls,
  ])

  const ytDetailsCopyText = useMemo(() => {
    if (!hasYoutubeDetails) return null
    const lines: string[] = []
    if (ownerUsername || ownerFullName) {
      lines.push(`Channel: ${ownerFullName ?? `@${ownerUsername}`}`)
    }
    if (postGenre) lines.push(`Genre: ${postGenre}`)
    if (ytKeywords.length > 0) lines.push(`Keywords: ${ytKeywords.join(', ')}`)
    if (dateLabel) lines.push(`Posted: ${dateLabel}`)
    return lines.join('\n') || null
  }, [hasYoutubeDetails, ownerUsername, ownerFullName, postGenre, ytKeywords, dateLabel])

  const renderCaptionSection = (title = 'Caption') => (
    <CollapsibleSection
      id="ig-detail-caption"
      title={title}
      open={openCaption}
      onToggle={() => setOpenCaption((o) => !o)}
      copyLabel={title}
      copyText={caption}
      onCopy={handleCopy}
    >
      {caption ? (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)]">
          {formatReadableMultiline(caption)}
        </p>
      ) : (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No {title.toLowerCase()} for this post.
        </p>
      )}
    </CollapsibleSection>
  )

  const renderDescriptionSection = () => (
    <CollapsibleSection
      id="ig-detail-description"
      title="Description"
      open={openDescription}
      onToggle={() => setOpenDescription((o) => !o)}
      copyLabel="Description"
      copyText={postDescription}
      onCopy={handleCopy}
    >
      {postDescription ? (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)]">
          {formatReadableMultiline(postDescription)}
        </p>
      ) : (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No description for this video.
        </p>
      )}
    </CollapsibleSection>
  )

  const renderHookTranscriptSection = () => (
    <CollapsibleSection
      id="ig-detail-hook"
      title="Hook + transcript"
      open={openHook}
      onToggle={() => setOpenHook((o) => !o)}
      copyLabel={hookTranscriptCopy.label}
      copyText={hookTranscriptCopy.text}
      onCopy={handleCopy}
    >
      <div className="space-y-4">
        <div>
          <h3 className="body-3 mb-2 text-[var(--color-muted-foreground)]">Hook</h3>
          {hook ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
              <p className="whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-[var(--foreground)]">
                {formatReadableMultiline(hook)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {!transcript && 'No transcript for this video.'}
              {transcript && 'No hook extracted from this transcript.'}
            </p>
          )}
        </div>
        <div>
          <h3 className="body-3 mb-2 text-[var(--color-muted-foreground)]">Transcript</h3>
          {transcript ? (
            <div className="space-y-3">
              {splitTranscriptParagraphs(transcript).map((paragraph, index) => (
                <p
                  key={index}
                  className="break-words text-sm leading-relaxed text-[var(--foreground)]"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No transcript for this video.
            </p>
          )}
        </div>
      </div>
    </CollapsibleSection>
  )

  const formulaTopicCopyText = useMemo(() => {
    if (!breakdown) return null
    return `Winning topic: ${breakdown.winning_topic}\nAngle: ${breakdown.topic_angle}`
  }, [breakdown])

  const formulaPackagingCopyText = useMemo(() => {
    if (!breakdown) return null
    const lines = [`Title: ${breakdown.packaging.title_analysis}`]
    if (breakdown.packaging.thumbnail_text)
      lines.push(`On-thumbnail text: ${breakdown.packaging.thumbnail_text}`)
    if (breakdown.packaging.thumbnail_description)
      lines.push(breakdown.packaging.thumbnail_description)
    if (breakdown.packaging.title_thumbnail_synergy)
      lines.push(`Synergy: ${breakdown.packaging.title_thumbnail_synergy}`)
    return lines.join('\n')
  }, [breakdown])

  const formulaQuestionsCopyText = useMemo(() => {
    if (!breakdown || breakdown.viewer_questions.length === 0) return null
    return breakdown.viewer_questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
  }, [breakdown])

  const formulaHookCopyText = useMemo(() => {
    if (!breakdown) return null
    const lines: string[] = []
    if (breakdown.hook.quote) lines.push(`"${breakdown.hook.quote}"`)
    lines.push(`Technique: ${breakdown.hook.technique}`)
    return lines.join('\n')
  }, [breakdown])

  const formulaSetupCopyText = useMemo(() => {
    if (!breakdown) return null
    const lines: string[] = []
    if (breakdown.setup.roadmap.length > 0) {
      lines.push('Roadmap:')
      breakdown.setup.roadmap.forEach((r) => lines.push(`- ${r}`))
    }
    if (breakdown.setup.big_claims.length > 0) {
      lines.push(`Big claims: ${breakdown.setup.big_claims.join(' · ')}`)
    }
    if (breakdown.setup.analysis) lines.push(breakdown.setup.analysis)
    return lines.length > 0 ? lines.join('\n') : null
  }, [breakdown])

  const formulaScriptCopyText = useMemo(() => {
    if (!breakdown || breakdown.main_points.length === 0) return null
    return breakdown.main_points
      .map((p, i) => {
        const lines = [`${i + 1}. ${p.title} (${p.delivery})`]
        if (p.re_hook) lines.push(`Re-hook: ${p.re_hook}`)
        lines.push(p.summary)
        return lines.join('\n')
      })
      .join('\n\n')
  }, [breakdown])

  const formulaStealCopyText = useMemo(() => {
    if (!breakdown || breakdown.steal_this.length === 0) return null
    return breakdown.steal_this.map((s) => `- ${s}`).join('\n')
  }, [breakdown])

  const platformOpenLabel =
    platform === 'youtube'
      ? 'YouTube'
      : platform === 'tiktok'
        ? 'TikTok'
        : platform === 'twitter'
          ? 'X'
          : 'Instagram'

  const renderFormulaPackagingContent = () => {
    if (!breakdown) return null
    const packaging = breakdown.packaging
    return (
      <div className="space-y-4 text-sm leading-relaxed text-[var(--foreground)]">
        <div>
          <h3 className="body-3 mb-2 text-[var(--color-muted-foreground)]">Title</h3>
          <p>{packaging.title_analysis}</p>
        </div>

        <div>
          <h3 className="body-3 mb-2 text-[var(--color-muted-foreground)]">Thumbnail</h3>
          {thumbnailUrl ? (
            <div
              className={cn(
                'relative w-full overflow-hidden rounded-lg border border-[var(--border)] bg-black/20',
                mediaFrame.aspectClass,
              )}
            >
              {igUrl ? (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full w-full"
                  title={`Open on ${platformOpenLabel}`}
                >
                  <img
                    src={thumbnailUrl}
                    alt={caption ?? item.title}
                    className="h-full w-full object-cover transition-opacity hover:opacity-90"
                  />
                </a>
              ) : (
                <img
                  src={thumbnailUrl}
                  alt={caption ?? item.title}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          ) : null}
          {packaging.thumbnail_text ? (
            <p className="mt-3">
              <span className="text-[var(--color-muted-foreground)]">On-thumbnail text: </span>
              &ldquo;{packaging.thumbnail_text}&rdquo;
            </p>
          ) : null}
          {packaging.thumbnail_description ? (
            <p className="mt-3">{packaging.thumbnail_description}</p>
          ) : !packaging.thumbnail_text ? (
            <p className="body-3 mt-3 text-[var(--color-muted-foreground)]">
              {thumbnailUrl ? 'No thumbnail breakdown.' : 'No thumbnail available.'}
            </p>
          ) : null}
        </div>

        {packaging.title_thumbnail_synergy ? (
          <div>
            <h3 className="body-3 mb-2 text-[var(--color-muted-foreground)]">
              Title + thumbnail synergy
            </h3>
            <p>{packaging.title_thumbnail_synergy}</p>
          </div>
        ) : null}
      </div>
    )
  }

  const renderFormulaSetupContent = () => {
    if (!breakdown) return null
    const { roadmap, big_claims, analysis } = breakdown.setup

    return (
      <div className="space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
        {roadmap.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {roadmap.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : null}
        {big_claims.length > 0 ? (
          <div className="space-y-1">
            <p className="text-[var(--color-muted-foreground)]">Big claims:</p>
            <p>{big_claims.join(' · ')}</p>
          </div>
        ) : null}
        {analysis ? (
          <div className="space-y-1">
            <p className="text-[var(--color-muted-foreground)]">Analysis:</p>
            <p>{analysis}</p>
          </div>
        ) : null}
        {roadmap.length === 0 && big_claims.length === 0 && !analysis ? (
          <p className="text-[var(--color-muted-foreground)]">No setup analysis.</p>
        ) : null}
      </div>
    )
  }

  const renderFormulaBreakdownEmptyState = (centered = true) => (
    <div className={cn('flex flex-col gap-3 py-2', centered ? 'items-center' : 'items-start')}>
      <IgFormulaBreakdownMockup />
      <p
        className={cn(
          'body-3 text-[var(--color-muted-foreground)]',
          centered && 'max-w-xs text-center',
        )}
      >
        Deconstruct this video through the creation formula — topic, packaging, the questions it
        plants, hook and setup, script structure, and the patterns worth stealing.
      </p>
      <button
        type="button"
        onClick={() => void handleBreakdown()}
        disabled={breakingDown}
        className="badge-glass badge-glass-green rounded-spacing-2 inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-success transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {breakingDown ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Zap className="h-3.5 w-3.5" />
        )}
        {breakingDown ? 'Breaking down…' : 'Run formula breakdown'}
      </button>
    </div>
  )

  const renderIgTiktokEngagementPanel = () => (
    <div className="px-2 pt-1">
      <div className="px-1 py-2">
        <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] px-3">
          <StatRow
            icon={<Eye className="h-3 w-3" />}
            label="Views"
            value={formatViewCount(displayPlayCount)}
          />
          {likeCount != null && (
            <StatRow
              icon={<Heart className="h-3 w-3" />}
              label="Likes"
              value={formatViewCount(likeCount)}
            />
          )}
          {commentCount != null && (
            <StatRow
              icon={<MessageSquare className="h-3 w-3" />}
              label="Comments"
              value={formatViewCount(commentCount)}
            />
          )}
        </div>
      </div>

      <CollapsibleSection
        id="ig-engagement-comments"
        title="Comments"
        open={openComments}
        onToggle={() => setOpenComments((o) => !o)}
        copyLabel="Comments"
        copyText={commentsCopyText}
        onCopy={handleCopy}
      >
        {comments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <IgCommentsLoadMockup />
            <p className="body-3 max-w-xs text-center text-[var(--color-muted-foreground)]">
              Pull top comments from this post to see what viewers are saying.
            </p>
            <button
              type="button"
              onClick={() => void handleLoadComments()}
              disabled={loadingComments}
              className="badge-glass badge-glass-green rounded-spacing-2 inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-success transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loadingComments ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
              {loadingComments ? 'Loading comments…' : 'Load comments'}
            </button>
          </div>
        ) : (
          renderYoutubeCommentCards()
        )}
      </CollapsibleSection>
    </div>
  )

  const renderIgDetailsPanel = () => (
    <div className="px-3 py-3">
      {hasDetails ? (
        <>
          <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] px-3">
            {ownerUsername && (
              <DetailField
                icon={<User className="h-3 w-3" />}
                label="Creator"
                value={`${ownerFullName ?? ownerUsername}${ownerIsVerified ? ' ✓' : ''}${ownerFollowerCount != null ? ` · ${formatViewCount(ownerFollowerCount)} followers` : ''}`}
              />
            )}
            {audioName && (
              <DetailField
                icon={<Music className="h-3 w-3" />}
                label="Audio"
                value={`${audioName}${audioArtist && !isOriginalAudio ? ` by ${audioArtist}` : ''}${isOriginalAudio ? ' (original)' : ''}`}
              />
            )}
            {isPaidPartnership && (
              <DetailField
                icon={<Shield className="h-3 w-3" />}
                label="Partnership"
                value="Paid partnership"
              />
            )}
            {taggedUsers.length > 0 && (
              <DetailField
                icon={<Tag className="h-3 w-3" />}
                label="Tagged"
                value={taggedUsers.map((u) => `@${u}`).join(', ')}
              />
            )}
          </div>
          {detailsCopyText ? (
            <button
              type="button"
              onClick={() => handleCopy(detailsCopyText, 'Details')}
              className="body-3 mt-3 inline-flex items-center gap-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              Copy details
            </button>
          ) : null}
        </>
      ) : (
        <p className="body-3 text-[var(--color-muted-foreground)]">
          No extra details for this post.
        </p>
      )}
    </div>
  )

  const renderTabbedFormulaPanel = () => {
    if (!breakdown) {
      return (
        <div className="px-2 pt-1">
          <div className="px-3 py-3">{renderFormulaBreakdownEmptyState(true)}</div>
        </div>
      )
    }

    return (
      <div className="px-2 pt-1">
        <CollapsibleSection
          id="formula-topic"
          title="Winning topic"
          open={openFormulaTopic}
          onToggle={() => setOpenFormulaTopic((o) => !o)}
          copyLabel="Winning topic"
          copyText={formulaTopicCopyText}
          onCopy={handleCopy}
        >
          <div className="space-y-1 text-sm leading-relaxed text-[var(--foreground)]">
            <p className="font-medium">{breakdown.winning_topic}</p>
            <p className="text-[var(--color-muted-foreground)]">{breakdown.topic_angle}</p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="formula-packaging"
          title="Packaging"
          open={openFormulaPackaging}
          onToggle={() => setOpenFormulaPackaging((o) => !o)}
          copyLabel="Packaging"
          copyText={formulaPackagingCopyText}
          onCopy={handleCopy}
        >
          {renderFormulaPackagingContent()}
        </CollapsibleSection>

        <CollapsibleSection
          id="formula-questions"
          title="Questions the packaging plants"
          open={openFormulaQuestions}
          onToggle={() => setOpenFormulaQuestions((o) => !o)}
          copyLabel="Viewer questions"
          copyText={formulaQuestionsCopyText}
          onCopy={handleCopy}
        >
          {breakdown.viewer_questions.length > 0 ? (
            <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-[var(--foreground)]">
              {breakdown.viewer_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No viewer questions.</p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          id="formula-hook"
          title="Hook"
          open={openFormulaHook}
          onToggle={() => setOpenFormulaHook((o) => !o)}
          copyLabel="Hook"
          copyText={formulaHookCopyText}
          onCopy={handleCopy}
        >
          <div className="space-y-2 text-sm leading-relaxed text-[var(--foreground)]">
            {breakdown.hook.quote ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                <p className="whitespace-pre-wrap break-words font-medium">
                  &ldquo;{breakdown.hook.quote}&rdquo;
                </p>
              </div>
            ) : null}
            <p className="text-[var(--color-muted-foreground)]">{breakdown.hook.technique}</p>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="formula-setup"
          title="Setup"
          open={openFormulaSetup}
          onToggle={() => setOpenFormulaSetup((o) => !o)}
          copyLabel="Setup"
          copyText={formulaSetupCopyText}
          onCopy={handleCopy}
        >
          {renderFormulaSetupContent()}
        </CollapsibleSection>

        {breakdown.main_points.length > 0 ? (
          <CollapsibleSection
            id="formula-script"
            title="Script structure"
            open={openFormulaScript}
            onToggle={() => setOpenFormulaScript((o) => !o)}
            copyLabel="Script structure"
            copyText={formulaScriptCopyText}
            onCopy={handleCopy}
          >
            <ol className="space-y-3 pl-0 text-sm leading-relaxed text-[var(--foreground)]">
              {breakdown.main_points.map((point, i) => (
                <li key={i} className="rounded-lg border border-[var(--border)] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {i + 1}. {point.title}
                    </p>
                    <span className="badge-glass badge-glass-muted shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider">
                      {point.delivery}
                    </span>
                  </div>
                  {point.re_hook && (
                    <p className="mt-1 text-xs italic text-[var(--color-muted-foreground)]">
                      Re-hook: {point.re_hook}
                    </p>
                  )}
                  <p className="mt-1">{point.summary}</p>
                </li>
              ))}
            </ol>
          </CollapsibleSection>
        ) : null}

        {breakdown.steal_this.length > 0 ? (
          <CollapsibleSection
            id="formula-steal"
            title="Steal this"
            open={openFormulaSteal}
            onToggle={() => setOpenFormulaSteal((o) => !o)}
            copyLabel="Steal this"
            copyText={formulaStealCopyText}
            onCopy={handleCopy}
          >
            <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--foreground)]">
              {breakdown.steal_this.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        ) : null}

        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            Generated {new Date(breakdown.generated_at).toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => void handleBreakdown(true)}
            disabled={breakingDown}
            className="body-3 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
          >
            {breakingDown ? 'Re-running…' : 'Re-run breakdown'}
          </button>
        </div>
      </div>
    )
  }

  const renderXEngagementPanel = () => (
    <div className="px-2 pt-1">
      <div className="px-1 py-2">
        <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] px-3">
          <StatRow
            icon={<Eye className="h-3 w-3" />}
            label="Views"
            value={formatViewCount(displayPlayCount)}
          />
          {likeCount != null && (
            <StatRow
              icon={<Heart className="h-3 w-3" />}
              label="Likes"
              value={formatViewCount(likeCount)}
            />
          )}
          {commentCount != null && (
            <StatRow
              icon={<MessageSquare className="h-3 w-3" />}
              label="Replies"
              value={formatViewCount(commentCount)}
            />
          )}
          {retweetCount != null && (
            <StatRow
              icon={<Repeat2 className="h-3 w-3" />}
              label="Retweets"
              value={formatViewCount(retweetCount)}
            />
          )}
          {quoteCount != null && (
            <StatRow
              icon={<Quote className="h-3 w-3" />}
              label="Quotes"
              value={formatViewCount(quoteCount)}
            />
          )}
          {bookmarkCount != null && (
            <StatRow
              icon={<Bookmark className="h-3 w-3" />}
              label="Bookmarks"
              value={formatViewCount(bookmarkCount)}
            />
          )}
        </div>
      </div>
    </div>
  )

  const renderXDetailsPanel = () => (
    <div className="px-3 py-3">
      {hasXDetails ? (
        <>
          <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] px-3">
            {(ownerUsername || ownerFullName) && (
              <DetailField
                icon={<User className="h-3 w-3" />}
                label="Creator"
                value={`${ownerFullName ?? `@${ownerUsername}`}${ownerIsVerified ? ' ✓' : ''}${ownerFollowerCount != null ? ` · ${formatViewCount(ownerFollowerCount)} followers` : ''}`}
              />
            )}
            {postLang && (
              <DetailField icon={<Tag className="h-3 w-3" />} label="Language" value={postLang} />
            )}
            {postSource && (
              <DetailField icon={<Zap className="h-3 w-3" />} label="Source" value={postSource} />
            )}
            {hashtagNames.length > 0 && (
              <DetailField
                icon={<Hash className="h-3 w-3" />}
                label="Hashtags"
                value={hashtagNames.map((h) => `#${h}`).join(', ')}
              />
            )}
            {mentionHandles.length > 0 && (
              <DetailField
                icon={<Tag className="h-3 w-3" />}
                label="Mentions"
                value={mentionHandles.map((u) => `@${u}`).join(', ')}
              />
            )}
          </div>
          {linkUrls.length > 0 && (
            <div className="mt-4">
              <h3 className="body-3 mb-2 text-[var(--color-muted-foreground)]">Links</h3>
              <ul className="space-y-2">
                {linkUrls.map((url) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="body-3 inline-flex items-start gap-1.5 break-all text-[var(--color-primary)] hover:underline"
                    >
                      <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {xDetailsCopyText ? (
            <button
              type="button"
              onClick={() => handleCopy(xDetailsCopyText, 'Details')}
              className="body-3 mt-3 inline-flex items-center gap-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              Copy details
            </button>
          ) : null}
        </>
      ) : (
        <p className="body-3 text-[var(--color-muted-foreground)]">
          No extra details for this post.
        </p>
      )}
    </div>
  )

  const renderYoutubeCommentCards = () => (
    <div className="space-y-2.5">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-lg border border-[var(--border)] px-3 py-2.5">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium text-[var(--foreground)]">
              {comment.author_name ?? 'Anonymous'}
            </span>
            {comment.author_is_creator && (
              <span className="badge-glass badge-glass-muted rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider">
                Creator
              </span>
            )}
            <span className="ml-auto flex items-center gap-2 text-[10px] text-[var(--color-muted-foreground)]">
              {comment.like_count != null && (
                <span className="inline-flex items-center gap-0.5">
                  <Heart className="h-2.5 w-2.5" />
                  {formatViewCount(comment.like_count)}
                </span>
              )}
              {comment.reply_count != null && comment.reply_count > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <MessageSquare className="h-2.5 w-2.5" />
                  {comment.reply_count}
                </span>
              )}
            </span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)]">
            {comment.text}
          </p>
        </div>
      ))}
      {commentsCursor && (
        <button
          type="button"
          onClick={() => void handleLoadComments(commentsCursor)}
          disabled={loadingComments}
          className="body-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] py-2 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
        >
          {loadingComments ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MessageSquare className="h-3.5 w-3.5" />
          )}
          {loadingComments ? 'Loading more…' : 'Load more comments'}
        </button>
      )}
    </div>
  )

  const renderYoutubeEngagementPanel = () => (
    <div className="px-2 pt-1">
      <div className="px-1 py-2">
        <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] px-3">
          <StatRow
            icon={<Eye className="h-3 w-3" />}
            label="Views"
            value={formatViewCount(displayPlayCount)}
          />
          {likeCount != null && (
            <StatRow
              icon={<Heart className="h-3 w-3" />}
              label="Likes"
              value={formatViewCount(likeCount)}
            />
          )}
          {commentCount != null && (
            <StatRow
              icon={<MessageSquare className="h-3 w-3" />}
              label="Comments"
              value={formatViewCount(commentCount)}
            />
          )}
        </div>
      </div>

      <CollapsibleSection
        id="yt-engagement-comments"
        title="Comments"
        open={openComments}
        onToggle={() => setOpenComments((o) => !o)}
        copyLabel="Comments"
        copyText={commentsCopyText}
        onCopy={handleCopy}
      >
        {comments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <IgCommentsLoadMockup />
            <p className="body-3 max-w-xs text-center text-[var(--color-muted-foreground)]">
              Pull top comments from this video to see what viewers are saying.
            </p>
            <button
              type="button"
              onClick={() => void handleLoadComments()}
              disabled={loadingComments}
              className="badge-glass badge-glass-green rounded-spacing-2 inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-success transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loadingComments ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
              {loadingComments ? 'Loading comments…' : 'Load comments'}
            </button>
          </div>
        ) : (
          renderYoutubeCommentCards()
        )}
      </CollapsibleSection>
    </div>
  )

  const renderYoutubeDetailsPanel = () => (
    <div className="px-3 py-3">
      {hasYoutubeDetails ? (
        <>
          <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] px-3">
            {(ownerUsername || ownerFullName) && (
              <DetailField
                icon={<User className="h-3 w-3" />}
                label="Channel"
                value={ownerFullName ?? `@${ownerUsername}`}
              />
            )}
            {postGenre && (
              <DetailField icon={<Tag className="h-3 w-3" />} label="Genre" value={postGenre} />
            )}
            {ytKeywords.length > 0 && (
              <DetailField
                icon={<Hash className="h-3 w-3" />}
                label="Keywords"
                value={ytKeywords.join(', ')}
              />
            )}
            {dateLabel && (
              <DetailField icon={<Zap className="h-3 w-3" />} label="Posted" value={dateLabel} />
            )}
          </div>
          {ytDetailsCopyText ? (
            <button
              type="button"
              onClick={() => handleCopy(ytDetailsCopyText, 'Details')}
              className="body-3 mt-3 inline-flex items-center gap-1.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              <ClipboardCopy className="h-3.5 w-3.5" />
              Copy details
            </button>
          ) : null}
        </>
      ) : (
        <p className="body-3 text-[var(--color-muted-foreground)]">
          No extra details for this video.
        </p>
      )}
    </div>
  )

  const renderTabbedContentPanel = () => (
    <div className="px-2 pt-1">
      {platform === 'youtube' ? (
        <>
          {renderCaptionSection('Title')}
          {renderDescriptionSection()}
          {renderHookTranscriptSection()}
        </>
      ) : (
        <>
          {renderCaptionSection()}
          {renderHookTranscriptSection()}
        </>
      )}
    </div>
  )

  const renderTabbedEngagementPanel = () => {
    if (platform === 'youtube') return renderYoutubeEngagementPanel()
    if (platform === 'twitter') return renderXEngagementPanel()
    return renderIgTiktokEngagementPanel()
  }

  const renderTabbedDetailsPanel = () => {
    if (platform === 'youtube') return renderYoutubeDetailsPanel()
    if (platform === 'twitter') return renderXDetailsPanel()
    return renderIgDetailsPanel()
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[99999] flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-modal-overlay"
            onClick={requestClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            className="rounded-l-spacing-2 relative ml-auto flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--color-background)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-end px-4 py-3">
              <button
                type="button"
                onClick={requestClose}
                className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body: header fixed; tab content scrolls */}
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Expanded video overlay */}
              <AnimatePresence>
                {videoExpanded && videoUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.4, y: -20, borderRadius: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0, borderRadius: 0 }}
                    exit={{ opacity: 0, scale: 0.4, y: -20, borderRadius: 12 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute inset-0 z-10 flex flex-col bg-black"
                  >
                    <div className="relative flex-1">
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        autoPlay
                        playsInline
                        className="h-full w-full object-contain"
                        poster={thumbnailUrl ?? undefined}
                      />
                      <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.15 }}
                          onClick={() => setVideoExpanded(false)}
                          className="rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
                        >
                          <Minimize2 className="h-4 w-4" />
                        </motion.button>
                        {igUrl ? (
                          <motion.a
                            href={igUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 }}
                            className="rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
                            title={
                              platform === 'tiktok'
                                ? 'Open on TikTok'
                                : platform === 'youtube'
                                  ? 'Open on YouTube'
                                  : platform === 'twitter'
                                    ? 'Open on X'
                                    : 'Open on Instagram'
                            }
                          >
                            <ExternalLink className="h-4 w-4" />
                          </motion.a>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Compact media + stats row */}
              <div className="flex shrink-0 gap-4 p-4">
                <div className={cn('flex shrink-0 flex-col gap-1.5', mediaFrame.columnWidthClass)}>
                  <div
                    className={cn(
                      'relative w-full overflow-hidden rounded-lg bg-black/20',
                      mediaFrame.aspectClass,
                    )}
                  >
                    {thumbnailUrl ? (
                      <>
                        {igUrl ? (
                          <a
                            href={igUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-full w-full"
                            title={
                              platform === 'twitter'
                                ? 'Open on X'
                                : platform === 'tiktok'
                                  ? 'Open on TikTok'
                                  : platform === 'youtube'
                                    ? 'Open on YouTube'
                                    : 'Open on Instagram'
                            }
                          >
                            <img
                              src={thumbnailUrl}
                              alt={item.title}
                              className="h-full w-full object-cover transition-opacity hover:opacity-90"
                            />
                          </a>
                        ) : (
                          <img
                            src={thumbnailUrl}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                        {videoUrl && (
                          <button
                            type="button"
                            onClick={() => setVideoExpanded(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
                          >
                            <Play className="h-6 w-6 text-white" fill="white" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--color-muted-foreground)]">
                        <Eye className="h-6 w-6 opacity-30" />
                      </div>
                    )}
                  </div>
                  {mediaPersonCaption ? (
                    <div className="w-full text-center">
                      <p
                        className={cn(
                          'text-xs font-medium text-[var(--foreground)]',
                          platform === 'youtube' ? 'line-clamp-2' : 'truncate',
                        )}
                        title={mediaPersonCaption.line1}
                      >
                        {mediaPersonCaption.line1}
                      </p>
                      {mediaPersonCaption.line2 ? (
                        <p
                          className="truncate text-[10px] text-[var(--color-muted-foreground)]"
                          title={mediaPersonCaption.line2}
                        >
                          {mediaPersonCaption.line2}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col justify-center">
                  <div className="divide-y divide-[var(--border)]">
                    <StatRow
                      icon={<Film className="h-3 w-3" />}
                      label="Format"
                      value={resolveFormatLabel(mediaType, platform)}
                    />
                    <StatRow
                      icon={<TrendingUp className="h-3 w-3" />}
                      label="Multiplier"
                      value={
                        <span
                          style={
                            outlierScore >= 3
                              ? { color: '#34d399' }
                              : outlierScore >= 2
                                ? { color: '#facc15' }
                                : undefined
                          }
                        >
                          {outlierScore.toFixed(1)}x
                        </span>
                      }
                    />
                    <StatRow
                      icon={<Eye className="h-3 w-3" />}
                      label="Views"
                      value={formatViewCount(displayPlayCount)}
                    />
                    {platform !== 'twitter' && platform !== 'youtube' && likeCount != null && (
                      <StatRow
                        icon={<Heart className="h-3 w-3" />}
                        label="Likes"
                        value={formatViewCount(likeCount)}
                      />
                    )}
                    {platform !== 'twitter' && platform !== 'youtube' && commentCount != null && (
                      <StatRow
                        icon={<MessageSquare className="h-3 w-3" />}
                        label="Comments"
                        value={formatViewCount(commentCount)}
                      />
                    )}
                    {videoDuration != null && (
                      <StatRow
                        icon={<Clock className="h-3 w-3" />}
                        label="Duration"
                        value={formatDuration(videoDuration)}
                      />
                    )}
                    {dateLabel && (
                      <StatRow
                        icon={<Zap className="h-3 w-3" />}
                        label="Posted"
                        value={dateLabel}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[var(--border)]">
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                  {!showAnalyzedView ? (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
                      <IgContentAnalyzeMockup />
                      <div className="mt-4 flex max-w-sm flex-col items-center gap-3 text-center">
                        <p className="body-3 text-[var(--color-muted-foreground)]">
                          {platform === 'twitter'
                            ? 'Extract caption, engagement metrics, creator context, and video transcript in one run.'
                            : platform === 'youtube'
                              ? 'Extract title, description, hook, transcript, engagement metrics, and channel details in one run.'
                              : 'Extract caption, opening hook, transcript, and creator context in one run.'}
                        </p>
                        <button
                          type="button"
                          onClick={handleAnalyze}
                          disabled={analyzing || !shortcode}
                          className="badge-glass badge-glass-green rounded-spacing-2 inline-flex items-center px-4 py-2.5 text-xs font-semibold text-success transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {resolveAnalyzeActionLabel(platform, analyzing)}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col">
                      <AnalysisTabBar active={analysisTab} onChange={setAnalysisTab} />
                      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
                        {analysisTab === 'content' && renderTabbedContentPanel()}
                        {analysisTab === 'formula' && renderTabbedFormulaPanel()}
                        {analysisTab === 'engagement' && renderTabbedEngagementPanel()}
                        {analysisTab === 'details' && renderTabbedDetailsPanel()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
