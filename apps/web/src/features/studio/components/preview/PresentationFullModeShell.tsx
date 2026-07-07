'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/utils/cn'
import { getTheme } from '../../../themes/services/themes.service'
import { formatPresentationElementContext } from '../../lib/presentation-element-trace'
import { resolvePresentationRenderTheme } from '../../lib/presentation-render-theme.util'
import {
  parsePresentationSections,
  rebuildPresentationHtml,
  remapSlideIndexAfterReorder,
} from '../../lib/presentation-sections.util'
import {
  buildPresentationTweakCss,
  normalizePresentationTweaks,
} from '../../lib/presentation-theme-tweaks'
import {
  fetchPresentationBundleCached,
  savePresentationFile,
} from '../../services/artifact-preview.service'
import { usePresentationCommentsChatStore } from '../../store/use-presentation-comments-chat-store'
import { usePresentationDesignChatStore } from '../../store/use-presentation-design-chat-store'
import { usePresentationFullModeStore } from '../../store/use-presentation-full-mode-store'
import { usePresentationTweaksChatStore } from '../../store/use-presentation-tweaks-chat-store'
import type {
  PresentationBundle,
  PresentationEditMode,
  PresentationElementTrace,
  PresentationMarkupStroke,
  PresentationMarkupStrokePoint,
  PresentationSlideThumbnail,
} from '../../types'
import { PresentationDrawingOverlay } from './PresentationDrawingOverlay'
import { PresentationMarkupOverlay } from './PresentationMarkupOverlay'
import { PresentationThumbnailRail } from './PresentationThumbnailRail'

const PRESENTATION_THUMBNAIL_SIDEBAR_WIDTH_PX = 240
const PRESENTATION_THUMBNAIL_SIDEBAR_WIDTH_TRANSITION_MS = 250
/** Slides are authored 16:9; the canvas letterboxes the preview to that ratio. */
const PRESENTATION_STAGE_ASPECT_W = 16
const PRESENTATION_STAGE_ASPECT_H = 9

interface PresentationFullModeShellProps {
  presentationId: string
  name: string
  bundleVersionKey?: string
  renderPreview: (props: {
    mode: PresentationEditMode
    activeSlideIndex: number | null
    onElementSelect: (trace: PresentationElementTrace) => void
    onSlideChange: (index: number | null) => void
    onDrawingEvent: (
      phase: 'start' | 'move' | 'end',
      point: PresentationMarkupStrokePoint | null,
    ) => void
  }) => ReactNode
}

type PresentationDrawingStreamEvent = {
  id: number
  phase: 'start' | 'move' | 'end'
  point: PresentationMarkupStrokePoint | null
}

function extractSlideThumbnails(bundle: PresentationBundle | null): PresentationSlideThumbnail[] {
  const entry = bundle?.files.find((file) => file.path === bundle.entry_file)
  if (!entry) return []
  const matches = [...entry.content.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)]
  return matches.map((match, index) => {
    const text = (match[1] ?? '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return {
      index,
      label: `Slide ${index + 1}`,
      title: text ? text.slice(0, 40) : null,
    }
  })
}

function dispatchPresentationVibeRequest(detail: {
  presentationId: string
  presentationName: string
  content: string
  systemContext: string
  drawingDataUrl?: string
}) {
  window.dispatchEvent(new CustomEvent('presentation-editor:send-to-vibe', { detail }))
}

export function PresentationFullModeShell({
  presentationId,
  name,
  renderPreview,
}: PresentationFullModeShellProps) {
  const mode = usePresentationFullModeStore((s) => s.mode)
  const thumbnailsOpen = usePresentationFullModeStore((s) => s.thumbnailsOpen)
  const activateFullMode = usePresentationFullModeStore((s) => s.activate)
  const deactivateFullMode = usePresentationFullModeStore((s) => s.deactivate)
  const setMode = usePresentationFullModeStore((s) => s.setMode)
  const setLiveThemeCss = usePresentationFullModeStore((s) => s.setLiveThemeCss)
  const bumpBundleReload = usePresentationFullModeStore((s) => s.bumpBundleReload)
  const [drawingActive, setDrawingActive] = useState(false)
  const [reorderingSlides, setReorderingSlides] = useState(false)
  const [activeSlideIndex, setActiveSlideIndex] = useState<number | null>(0)
  const [selectedTrace, setSelectedTrace] = useState<PresentationElementTrace | null>(null)
  const drawingEventIdRef = useRef(0)
  const [drawingStreamEvent, setDrawingStreamEvent] =
    useState<PresentationDrawingStreamEvent | null>(null)
  const [bundle, setBundle] = useState<PresentationBundle | null>(null)
  const registerSession = usePresentationCommentsChatStore((s) => s.registerSession)
  const clearSession = usePresentationCommentsChatStore((s) => s.clearSession)
  const addCommentToStore = usePresentationCommentsChatStore((s) => s.addComment)
  const commentsChatActive = usePresentationCommentsChatStore((s) => s.commentsChatActive)
  const registerDesignSession = usePresentationDesignChatStore((s) => s.registerSession)
  const clearDesignSession = usePresentationDesignChatStore((s) => s.clearSession)
  const setDesignBundle = usePresentationDesignChatStore((s) => s.setBundle)
  const setDesignSelectedTrace = usePresentationDesignChatStore((s) => s.setSelectedTrace)
  const designChatActive = usePresentationDesignChatStore((s) => s.designChatActive)
  const registerTweaksSession = usePresentationTweaksChatStore((s) => s.registerSession)
  const clearTweaksSession = usePresentationTweaksChatStore((s) => s.clearSession)
  const setTweaksBundle = usePresentationTweaksChatStore((s) => s.setBundle)
  const tweaksChatActive = usePresentationTweaksChatStore((s) => s.tweaksChatActive)
  const savedTweaksBundle = usePresentationTweaksChatStore((s) => s.bundle)

  useEffect(() => {
    registerSession({ presentationId, presentationName: name })
    registerDesignSession({ presentationId, presentationName: name })
    registerTweaksSession({ presentationId, presentationName: name })
    activateFullMode(presentationId)
    return () => {
      clearSession()
      clearDesignSession()
      clearTweaksSession()
      deactivateFullMode()
    }
  }, [
    activateFullMode,
    clearDesignSession,
    clearSession,
    clearTweaksSession,
    deactivateFullMode,
    name,
    presentationId,
    registerDesignSession,
    registerSession,
    registerTweaksSession,
  ])

  useEffect(() => {
    if (!commentsChatActive && mode === 'comments') {
      setMode('preview')
    }
  }, [commentsChatActive, mode, setMode])

  useEffect(() => {
    if (!designChatActive && mode === 'edit') {
      setMode('preview')
    }
  }, [designChatActive, mode, setMode])

  useEffect(() => {
    if (!tweaksChatActive && mode === 'tweaks') {
      setMode('preview')
    }
  }, [tweaksChatActive, mode, setMode])

  useEffect(() => {
    setDesignBundle(bundle)
    setTweaksBundle(bundle)
  }, [bundle, setDesignBundle, setTweaksBundle])

  useEffect(() => {
    if (!savedTweaksBundle || savedTweaksBundle.presentation.id !== presentationId) return
    setBundle((current) => {
      if (!current || current.presentation.id !== presentationId) return savedTweaksBundle
      if (
        current.presentation.updated_at === savedTweaksBundle.presentation.updated_at &&
        current.presentation.metadata === savedTweaksBundle.presentation.metadata
      ) {
        return current
      }
      return savedTweaksBundle
    })
  }, [presentationId, savedTweaksBundle])

  useEffect(() => {
    let cancelled = false
    // Cached — shared with PresentationPreview mounted alongside this shell
    // (the bundle was previously downloaded twice per full-view open).
    void fetchPresentationBundleCached(presentationId)
      .then((nextBundle) => {
        return resolvePresentationRenderTheme(nextBundle).then((renderTheme) => ({
          nextBundle,
          renderTheme,
        }))
      })
      .then(({ nextBundle, renderTheme }) => {
        if (!cancelled) {
          setLiveThemeCss(renderTheme.css, renderTheme.fontsUrl)
          setBundle(nextBundle)
        }
      })
      .catch(() => {
        if (!cancelled) setBundle(null)
      })
    return () => {
      cancelled = true
    }
  }, [presentationId, setLiveThemeCss])

  useEffect(() => {
    if (mode !== 'markup') setDrawingActive(false)
  }, [mode])

  useEffect(() => {
    if (!bundle) return
    const tweaks = normalizePresentationTweaks(
      (bundle.presentation.metadata as Record<string, unknown> | null | undefined)?.tweaks,
    )
    const themeId = tweaks.themeId ?? bundle.presentation.theme_id ?? null
    if (mode === 'tweaks') return
    let cancelled = false
    const apply = (theme: Parameters<typeof buildPresentationTweakCss>[1]) => {
      if (cancelled) return
      const { css, fontsUrl } = buildPresentationTweakCss({ ...tweaks, themeId }, theme, {
        applySlideChrome: false,
      })
      setLiveThemeCss(css, fontsUrl)
    }
    if (themeId) {
      void getTheme(themeId)
        .then(apply)
        .catch(() => apply(null))
    } else {
      apply(null)
    }
    return () => {
      cancelled = true
    }
  }, [bundle, mode, setLiveThemeCss])

  const thumbnails = useMemo(() => extractSlideThumbnails(bundle), [bundle])

  const addComment = useCallback(
    (body: string, trace: PresentationElementTrace | null = selectedTrace) => {
      addCommentToStore({
        body,
        trace,
        slideIndex: trace?.slide_index ?? activeSlideIndex,
      })
      setSelectedTrace(null)
      setDesignSelectedTrace(null)
    },
    [activeSlideIndex, addCommentToStore, selectedTrace, setDesignSelectedTrace],
  )

  const sendToVibe = useCallback(
    (content: string, trace: PresentationElementTrace | null = selectedTrace) => {
      const traceContext = trace ? formatPresentationElementContext(trace) : ''
      dispatchPresentationVibeRequest({
        presentationId,
        presentationName: name,
        content,
        systemContext: [
          'The user is editing an HTML-first presentation in full mode.',
          `Presentation: ${name}`,
          `Presentation ID: ${presentationId}`,
          traceContext,
        ]
          .filter(Boolean)
          .join('\n\n'),
      })
      setSelectedTrace(null)
      setMode('preview')
    },
    [name, presentationId, selectedTrace, setMode],
  )

  const handleDrawingEvent = useCallback(
    (phase: 'start' | 'move' | 'end', point: PresentationMarkupStrokePoint | null) => {
      if (phase === 'start') {
        setSelectedTrace(null)
        setDrawingActive(true)
      }
      drawingEventIdRef.current += 1
      setDrawingStreamEvent({ id: drawingEventIdRef.current, phase, point })
    },
    [],
  )

  const handleReorderSlides = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!bundle?.has_entry || reorderingSlides) return
      const entry = bundle.files.find((file) => file.path === bundle.entry_file)
      if (!entry) return

      const parsed = parsePresentationSections(entry.content)
      if (!parsed) return

      const sections = [...parsed.sections]
      const [moved] = sections.splice(fromIndex, 1)
      if (!moved) return
      sections.splice(toIndex, 0, moved)

      setReorderingSlides(true)
      try {
        const nextContent = rebuildPresentationHtml({ ...parsed, sections })
        await savePresentationFile(
          presentationId,
          bundle.entry_file,
          nextContent,
          entry.role ?? undefined,
        )
        // savePresentationFile invalidated the bundle cache — this re-primes it.
        const nextBundle = await fetchPresentationBundleCached(presentationId)
        setBundle(nextBundle)
        bumpBundleReload()

        const nextActiveIndex = remapSlideIndexAfterReorder(activeSlideIndex, fromIndex, toIndex)
        setActiveSlideIndex(nextActiveIndex)
        if (nextActiveIndex != null) {
          window.dispatchEvent(
            new CustomEvent('presentation-editor:jump-slide', {
              detail: { presentationId, index: nextActiveIndex },
            }),
          )
        }
      } finally {
        setReorderingSlides(false)
      }
    },
    [activeSlideIndex, bumpBundleReload, bundle, presentationId, reorderingSlides],
  )

  const thumbnailSidebarWidthStyle: CSSProperties = {
    width: thumbnailsOpen ? `${PRESENTATION_THUMBNAIL_SIDEBAR_WIDTH_PX}px` : '0px',
    transition: `width ${PRESENTATION_THUMBNAIL_SIDEBAR_WIDTH_TRANSITION_MS}ms ease-out`,
  }

  const stageContainerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState<{ width: number; height: number } | null>(null)

  useLayoutEffect(() => {
    const el = stageContainerRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      const unit = Math.min(
        rect.width / PRESENTATION_STAGE_ASPECT_W,
        rect.height / PRESENTATION_STAGE_ASPECT_H,
      )
      setStageSize({
        width: Math.round(unit * PRESENTATION_STAGE_ASPECT_W),
        height: Math.round(unit * PRESENTATION_STAGE_ASPECT_H),
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="bg-background relative flex min-h-0 flex-1 overflow-hidden">
      <div
        className="flex min-h-0 shrink-0 flex-col overflow-hidden will-change-[width]"
        style={thumbnailSidebarWidthStyle}
        aria-hidden={!thumbnailsOpen}
      >
        <div
          className={cn('w-spacing-60 h-full min-h-0', !thumbnailsOpen && 'pointer-events-none')}
        >
          <PresentationThumbnailRail
            thumbnails={thumbnails}
            bundle={bundle}
            activeSlideIndex={activeSlideIndex}
            reordering={reorderingSlides}
            onReorderSlides={bundle?.has_entry ? handleReorderSlides : undefined}
            onSelectSlide={(index) => {
              setActiveSlideIndex(index)
              window.dispatchEvent(
                new CustomEvent('presentation-editor:jump-slide', {
                  detail: { presentationId, index },
                }),
              )
            }}
          />
        </div>
      </div>
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div
          ref={stageContainerRef}
          className="bg-muted relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
        >
          <div
            className={cn('relative overflow-hidden', !stageSize && 'h-full w-full')}
            style={
              stageSize
                ? { width: `${stageSize.width}px`, height: `${stageSize.height}px` }
                : undefined
            }
          >
            {renderPreview({
              mode,
              activeSlideIndex,
              onElementSelect: (trace) => {
                setSelectedTrace(trace)
                setDesignSelectedTrace(trace)
              },
              onSlideChange: setActiveSlideIndex,
              onDrawingEvent: handleDrawingEvent,
            })}
            {mode === 'markup' ? (
              <PresentationMarkupOverlay
                selectedTrace={selectedTrace}
                onAddComment={addComment}
                onSendToVibe={sendToVibe}
              />
            ) : null}
            {mode === 'markup' && drawingActive ? (
              <PresentationDrawingOverlay
                presentationId={presentationId}
                slideIndex={activeSlideIndex}
                streamEvent={drawingStreamEvent}
                onCancel={() => {
                  setDrawingActive(false)
                  setDrawingStreamEvent(null)
                }}
                onSendDrawing={(
                  note: string,
                  dataUrl: string,
                  strokes: PresentationMarkupStroke[],
                ) => {
                  dispatchPresentationVibeRequest({
                    presentationId,
                    presentationName: name,
                    content: note || 'Review this drawing on the presentation.',
                    drawingDataUrl: dataUrl,
                    systemContext: [
                      'The user drew over the current presentation slide.',
                      `Presentation ID: ${presentationId}`,
                      `Slide index: ${activeSlideIndex ?? 'unknown'}`,
                      `Stroke count: ${strokes.length}`,
                    ].join('\n'),
                  })
                  setDrawingActive(false)
                  setDrawingStreamEvent(null)
                }}
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
