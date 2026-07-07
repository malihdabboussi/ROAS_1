'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Repeat2,
  Send,
} from 'lucide-react'
import type { SocialPost } from '../../../types'

const INSTAGRAM_CAPTION_TRUNCATE_FEED = 125
const INSTAGRAM_CAPTION_TRUNCATE_REEL = 55
const LINKEDIN_CAPTION_TRUNCATE_CHARS = 210
const LINKEDIN_CAPTION_TRUNCATE_LINES = 3

function truncateByChars(caption: string, limit: number): string {
  if (caption.length <= limit) return caption
  return caption.slice(0, limit).trimEnd() + '…'
}

function truncateLinkedIn(caption: string): { text: string; truncated: boolean } {
  const lines = caption.split('\n')
  let charCount = 0
  let cutLine = -1
  let cutCharInLine = -1

  for (let i = 0; i < lines.length; i++) {
    if (i >= LINKEDIN_CAPTION_TRUNCATE_LINES) {
      cutLine = i
      cutCharInLine = 0
      break
    }
    const lineCharsNeeded = (i > 0 ? 1 : 0) + (lines[i]?.length ?? 0)
    if (charCount + lineCharsNeeded > LINKEDIN_CAPTION_TRUNCATE_CHARS) {
      cutLine = i
      cutCharInLine = LINKEDIN_CAPTION_TRUNCATE_CHARS - charCount - (i > 0 ? 1 : 0)
      break
    }
    charCount += lineCharsNeeded
  }

  if (cutLine === -1) return { text: caption, truncated: false }

  const kept = lines.slice(0, cutLine)
  const cutLineText = lines[cutLine]
  if (cutCharInLine > 0 && cutLineText) kept.push(cutLineText.slice(0, cutCharInLine).trimEnd())
  return { text: kept.join('\n').trimEnd() + '…', truncated: true }
}

interface SocialPostPlatformFrameProps {
  post: SocialPost
  children: ReactNode
  slides?: ReactNode[]
  activeSlide?: number
  onPrev?: () => void
  onNext?: () => void
  onCaptionChange?: (newCaption: string) => void
  onEditingChange?: (editing: boolean) => void
  visualCaptureRef?: RefObject<HTMLDivElement | null>
  hideInlineCarouselChrome?: boolean
}

export function LinkedInFrame({
  post,
  children,
  slides,
  activeSlide = 0,
  onPrev,
  onNext,
  onCaptionChange,
  onEditingChange,
  visualCaptureRef,
  hideInlineCarouselChrome = false,
}: SocialPostPlatformFrameProps) {
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const [editingCaption, setEditingCaption] = useState(false)
  const [draftCaption, setDraftCaption] = useState(post.caption ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const linkedInResult = post.caption ? truncateLinkedIn(post.caption) : null
  const showTruncated = linkedInResult?.truncated && !captionExpanded && !editingCaption
  const isCarousel = slides && slides.length > 1
  const slideCount = slides?.length ?? 0

  useEffect(() => {
    setDraftCaption(post.caption ?? '')
  }, [post.caption])

  const startEdit = useCallback(() => {
    setCaptionExpanded(true)
    setEditingCaption(true)
    onEditingChange?.(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [onEditingChange])

  const commitEdit = useCallback(() => {
    setEditingCaption(false)
    onEditingChange?.(false)
    if (draftCaption !== post.caption) onCaptionChange?.(draftCaption)
  }, [draftCaption, post.caption, onCaptionChange, onEditingChange])

  useEffect(() => {
    if (!editingCaption || !textareaRef.current) return
    const element = textareaRef.current
    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`
  }, [editingCaption, draftCaption])

  // Fixed LinkedIn mockup chrome intentionally mirrors the external platform UI.
  return (
    <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-lg bg-white text-zinc-900">
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-3">
        <div className="h-10 w-10 rounded-full bg-blue-600" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Your Brand</div>
          <div className="text-xs text-zinc-500">Just now</div>
        </div>
      </div>
      {(post.caption || editingCaption) && (
        <div className="px-4 pb-2 text-sm leading-relaxed">
          {editingCaption ? (
            <textarea
              ref={textareaRef}
              value={draftCaption}
              onChange={(event) => setDraftCaption(event.target.value)}
              onBlur={commitEdit}
              className="max-h-none w-full resize-none overflow-hidden rounded border border-blue-300 bg-white p-1 text-sm leading-relaxed text-zinc-900 outline-none focus:ring-1 focus:ring-blue-400"
              rows={3}
            />
          ) : (
            <span className="cursor-text whitespace-pre-wrap" onClick={startEdit}>
              {showTruncated ? linkedInResult!.text : post.caption}
            </span>
          )}
          {showTruncated && !editingCaption && (
            <button
              type="button"
              onClick={() => setCaptionExpanded(true)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              {' '}
              ...see more
            </button>
          )}
        </div>
      )}
      <div
        className="relative w-full overflow-hidden"
        style={{ maxHeight: Math.round((460 * 1350) / 1080) }}
      >
        {isCarousel ? (
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                ref={visualCaptureRef && index === activeSlide ? visualCaptureRef : undefined}
                className="w-full flex-shrink-0"
              >
                {slide}
              </div>
            ))}
          </div>
        ) : (
          children
        )}
        {isCarousel && !hideInlineCarouselChrome && (
          <>
            {activeSlide > 0 && (
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 shadow-md transition-opacity hover:bg-black/80"
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </button>
            )}
            {activeSlide < slideCount - 1 && (
              <button
                type="button"
                onClick={onNext}
                className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 shadow-md transition-opacity hover:bg-black/80"
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
              {[...Array(slideCount)].map((_, index) => (
                <div
                  key={index}
                  className={`rounded-full transition-all ${index === activeSlide ? 'h-[6px] w-[6px] bg-blue-600' : 'h-[5px] w-[5px] bg-zinc-400/60'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-around border-t border-zinc-200 px-2 py-2.5 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Heart className="h-4 w-4" /> Like
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-4 w-4" /> Comment
        </span>
        <span className="flex items-center gap-1">
          <Repeat2 className="h-4 w-4" /> Repost
        </span>
        <span className="flex items-center gap-1">
          <Send className="h-4 w-4" /> Send
        </span>
      </div>
    </div>
  )
}

export function InstagramFrame({
  post,
  children,
  slides,
  activeSlide = 0,
  onPrev,
  onNext,
  onCaptionChange,
  onEditingChange,
  visualCaptureRef,
  hideInlineCarouselChrome = false,
}: SocialPostPlatformFrameProps) {
  const [captionExpanded, setCaptionExpanded] = useState(false)
  const [editingCaption, setEditingCaption] = useState(false)
  const [draftCaption, setDraftCaption] = useState(post.caption ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const captionLimit =
    post.post_type === 'reel' ? INSTAGRAM_CAPTION_TRUNCATE_REEL : INSTAGRAM_CAPTION_TRUNCATE_FEED
  const isCaptionTruncated = post.caption ? post.caption.length > captionLimit : false
  const showTruncated = isCaptionTruncated && !captionExpanded && !editingCaption

  useEffect(() => {
    setDraftCaption(post.caption ?? '')
  }, [post.caption])

  const startEdit = useCallback(() => {
    setCaptionExpanded(true)
    setEditingCaption(true)
    onEditingChange?.(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [onEditingChange])

  const commitEdit = useCallback(() => {
    setEditingCaption(false)
    onEditingChange?.(false)
    if (draftCaption !== post.caption) onCaptionChange?.(draftCaption)
  }, [draftCaption, post.caption, onCaptionChange, onEditingChange])
  const isCarousel = slides && slides.length > 1
  const slideCount = slides?.length ?? 0

  // Fixed Instagram mockup chrome intentionally mirrors the external platform UI.
  return (
    <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-lg bg-black text-white">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600" />
        <div className="flex-1 text-sm font-semibold">your_brand</div>
      </div>
      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{ maxHeight: Math.round((390 * 1350) / 1080) }}
      >
        {isCarousel ? (
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                ref={visualCaptureRef && index === activeSlide ? visualCaptureRef : undefined}
                className="w-full flex-shrink-0"
              >
                {slide}
              </div>
            ))}
          </div>
        ) : (
          children
        )}
        {isCarousel && !hideInlineCarouselChrome && (
          <>
            {activeSlide > 0 && (
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4 text-zinc-800" />
              </button>
            )}
            {activeSlide < slideCount - 1 && (
              <button
                type="button"
                onClick={onNext}
                className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-opacity hover:bg-white"
              >
                <ChevronRight className="h-4 w-4 text-zinc-800" />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
              {[...Array(slideCount)].map((_, index) => (
                <div
                  key={index}
                  className={`rounded-full transition-all ${index === activeSlide ? 'h-[6px] w-[6px] bg-blue-500' : 'h-[5px] w-[5px] bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-4 px-3 pb-1 pt-2.5">
        <Heart className="h-6 w-6" />
        <MessageCircle className="h-6 w-6" />
        <Send className="h-6 w-6" />
        <div className="flex-1" />
        {isCarousel && !hideInlineCarouselChrome && (
          <div className="flex items-center gap-1">
            {[...Array(slideCount)].map((_, index) => (
              <div
                key={index}
                className={`rounded-full transition-all ${index === activeSlide ? 'h-[6px] w-[6px] bg-blue-500' : 'h-[5px] w-[5px] bg-zinc-600'}`}
              />
            ))}
          </div>
        )}
        <div className="flex-1" />
        <Bookmark className="h-6 w-6" />
      </div>
      {(post.caption || editingCaption) && (
        <div className="px-3 pb-2.5 pt-1">
          {editingCaption ? (
            <div className="text-sm">
              <span className="font-semibold">your_brand</span>{' '}
              <textarea
                ref={textareaRef}
                value={draftCaption}
                onChange={(event) => setDraftCaption(event.target.value)}
                onBlur={commitEdit}
                className="mt-1 w-full resize-none rounded border border-blue-400/50 bg-zinc-900 p-1 text-sm text-white outline-none focus:ring-1 focus:ring-blue-400"
                rows={Math.max(3, draftCaption.split('\n').length + 1)}
              />
            </div>
          ) : (
            <span className="text-sm">
              <span className="font-semibold">your_brand</span>{' '}
              <span className="cursor-text whitespace-pre-wrap" onClick={startEdit}>
                {showTruncated ? truncateByChars(post.caption!, captionLimit) : post.caption}
              </span>
              {showTruncated && (
                <button
                  type="button"
                  onClick={() => setCaptionExpanded(true)}
                  className="text-zinc-500"
                >
                  {' '}
                  more
                </button>
              )}
            </span>
          )}
          {post.hashtags &&
            post.hashtags.length > 0 &&
            (!isCaptionTruncated || captionExpanded) &&
            !editingCaption && (
              <div className="mt-1 text-sm text-blue-400">
                {post.hashtags.map((hashtag) => `#${hashtag}`).join(' ')}
              </div>
            )}
        </div>
      )}
    </div>
  )
}
