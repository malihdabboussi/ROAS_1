'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { getTheme } from '../../../themes/services/themes.service'
import { formatFunnelElementContext } from '../../lib/funnel-element-trace'
import {
  buildPresentationTweakCss,
  normalizePresentationTweaks,
} from '../../lib/presentation-theme-tweaks'
import type { FunnelPage, FunnelPageBundle } from '../../services/artifact-preview.service'
import { useFunnelCommentsChatStore } from '../../store/use-funnel-comments-chat-store'
import { useFunnelDesignChatStore } from '../../store/use-funnel-design-chat-store'
import { useFunnelFullModeStore } from '../../store/use-funnel-full-mode-store'
import { useFunnelTweaksChatStore } from '../../store/use-funnel-tweaks-chat-store'
import type {
  FunnelEditMode,
  FunnelElementTrace,
  FunnelMarkupStroke,
  PresentationMarkupStrokePoint,
} from '../../types'
import { FunnelDrawingOverlay } from './FunnelDrawingOverlay'
import { FunnelPageRail } from './FunnelPageRail'
import { PresentationMarkupOverlay } from './PresentationMarkupOverlay'

const FUNNEL_PAGE_SIDEBAR_WIDTH_PX = 240
const FUNNEL_PAGE_SIDEBAR_WIDTH_TRANSITION_MS = 250

interface FunnelFullModeShellProps {
  funnelId: string
  name: string
  themeId: string | null
  funnelMetadata: Record<string, unknown> | null
  bundle: FunnelPageBundle | null
  pages: FunnelPage[]
  activePageId: string | null
  onPageChange: (pageId: string) => void
  renderPreview: (props: {
    mode: FunnelEditMode
    onElementSelect: (trace: FunnelElementTrace) => void
    onDrawingEvent: (
      phase: 'start' | 'move' | 'end',
      point: PresentationMarkupStrokePoint | null,
    ) => void
  }) => ReactNode
}

type FunnelDrawingStreamEvent = {
  id: number
  phase: 'start' | 'move' | 'end'
  point: PresentationMarkupStrokePoint | null
}

function dispatchFunnelVibeRequest(detail: {
  funnelId: string
  funnelName: string
  content: string
  systemContext: string
  drawingDataUrl?: string
}) {
  window.dispatchEvent(new CustomEvent('funnel-editor:send-to-vibe', { detail }))
}

export function FunnelFullModeShell({
  funnelId,
  name,
  themeId,
  funnelMetadata,
  bundle,
  pages,
  activePageId,
  onPageChange,
  renderPreview,
}: FunnelFullModeShellProps) {
  const mode = useFunnelFullModeStore((s) => s.mode)
  const pagesOpen = useFunnelFullModeStore((s) => s.pagesOpen)
  const setMode = useFunnelFullModeStore((s) => s.setMode)
  const setLiveThemeCss = useFunnelFullModeStore((s) => s.setLiveThemeCss)
  const [drawingActive, setDrawingActive] = useState(false)
  const [selectedTrace, setSelectedTrace] = useState<FunnelElementTrace | null>(null)
  const drawingEventIdRef = useRef(0)
  const [drawingStreamEvent, setDrawingStreamEvent] = useState<FunnelDrawingStreamEvent | null>(
    null,
  )
  const registerSession = useFunnelCommentsChatStore((s) => s.registerSession)
  const clearSession = useFunnelCommentsChatStore((s) => s.clearSession)
  const addCommentToStore = useFunnelCommentsChatStore((s) => s.addComment)
  const commentsChatActive = useFunnelCommentsChatStore((s) => s.commentsChatActive)
  const registerDesignSession = useFunnelDesignChatStore((s) => s.registerSession)
  const clearDesignSession = useFunnelDesignChatStore((s) => s.clearSession)
  const setDesignBundle = useFunnelDesignChatStore((s) => s.setBundle)
  const setDesignSelectedTrace = useFunnelDesignChatStore((s) => s.setSelectedTrace)
  const designChatActive = useFunnelDesignChatStore((s) => s.designChatActive)
  const registerTweaksSession = useFunnelTweaksChatStore((s) => s.registerSession)
  const clearTweaksSession = useFunnelTweaksChatStore((s) => s.clearSession)
  const setTweaksBundle = useFunnelTweaksChatStore((s) => s.setBundle)
  const setTweaksContext = useFunnelTweaksChatStore((s) => s.setTweaksContext)
  const tweaksChatActive = useFunnelTweaksChatStore((s) => s.tweaksChatActive)

  useEffect(() => {
    registerSession({ funnelId, funnelName: name })
    registerDesignSession({ funnelId, funnelName: name })
    registerTweaksSession({ funnelId, funnelName: name })
    setTweaksContext({ themeId, metadata: funnelMetadata })
    return () => {
      clearSession()
      clearDesignSession()
      clearTweaksSession()
    }
  }, [
    clearDesignSession,
    clearSession,
    clearTweaksSession,
    funnelId,
    funnelMetadata,
    name,
    registerDesignSession,
    registerSession,
    registerTweaksSession,
    setTweaksContext,
    themeId,
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
    if (mode !== 'markup') setDrawingActive(false)
  }, [mode])

  useEffect(() => {
    const tweaks = normalizePresentationTweaks(funnelMetadata?.tweaks)
    const resolvedThemeId = tweaks.themeId ?? themeId ?? null
    if (mode === 'tweaks') return
    let cancelled = false
    const apply = (theme: Parameters<typeof buildPresentationTweakCss>[1]) => {
      if (cancelled) return
      const { css, fontsUrl } = buildPresentationTweakCss(
        { ...tweaks, themeId: resolvedThemeId },
        theme,
      )
      setLiveThemeCss(css, fontsUrl)
    }
    if (resolvedThemeId) {
      void getTheme(resolvedThemeId)
        .then(apply)
        .catch(() => apply(null))
    } else {
      apply(null)
    }
    return () => {
      cancelled = true
    }
  }, [funnelMetadata, mode, setLiveThemeCss, themeId])

  const addComment = useCallback(
    (body: string, trace: FunnelElementTrace | null = selectedTrace) => {
      addCommentToStore({
        body,
        trace,
        pageId: activePageId,
      })
      setSelectedTrace(null)
      setDesignSelectedTrace(null)
    },
    [activePageId, addCommentToStore, selectedTrace, setDesignSelectedTrace],
  )

  const sendToVibe = useCallback(
    (content: string, trace: FunnelElementTrace | null = selectedTrace) => {
      const traceContext = trace ? formatFunnelElementContext(trace) : ''
      dispatchFunnelVibeRequest({
        funnelId,
        funnelName: name,
        content,
        systemContext: [
          'The user is editing an HTML-first funnel page in full mode.',
          `Funnel: ${name}`,
          `Funnel ID: ${funnelId}`,
          activePageId ? `Funnel page ID: ${activePageId}` : '',
          traceContext,
        ]
          .filter(Boolean)
          .join('\n\n'),
      })
      setSelectedTrace(null)
      setMode('preview')
    },
    [activePageId, funnelId, name, selectedTrace, setMode],
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

  const pageSidebarWidthStyle: CSSProperties = {
    width: pagesOpen ? `${FUNNEL_PAGE_SIDEBAR_WIDTH_PX}px` : '0px',
    transition: `width ${FUNNEL_PAGE_SIDEBAR_WIDTH_TRANSITION_MS}ms ease-out`,
  }

  return (
    <div className="bg-background relative flex min-h-0 flex-1 overflow-hidden">
      <div
        className="flex min-h-0 shrink-0 flex-col overflow-hidden will-change-[width]"
        style={pageSidebarWidthStyle}
        aria-hidden={!pagesOpen}
      >
        <div className={cn('w-spacing-60 h-full min-h-0', !pagesOpen && 'pointer-events-none')}>
          <FunnelPageRail
            funnelId={funnelId}
            pages={pages}
            activePageId={activePageId}
            activePageBundle={bundle}
            onSelectPage={onPageChange}
          />
        </div>
      </div>
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <div className="relative h-full w-full">
            {renderPreview({
              mode,
              onElementSelect: (trace) => {
                setSelectedTrace(trace)
                setDesignSelectedTrace(trace)
              },
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
              <FunnelDrawingOverlay
                funnelId={funnelId}
                funnelPageId={activePageId}
                streamEvent={drawingStreamEvent}
                onCancel={() => {
                  setDrawingActive(false)
                  setDrawingStreamEvent(null)
                }}
                onSendDrawing={(note: string, dataUrl: string, strokes: FunnelMarkupStroke[]) => {
                  dispatchFunnelVibeRequest({
                    funnelId,
                    funnelName: name,
                    content: note || 'Review this drawing on the funnel page.',
                    drawingDataUrl: dataUrl,
                    systemContext: [
                      'The user drew over the current funnel page.',
                      `Funnel ID: ${funnelId}`,
                      `Funnel page ID: ${activePageId ?? 'unknown'}`,
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
