'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { MapPin, PenLine, RotateCcw, Trash2, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { cn } from '@/lib/utils/cn'
import {
  type ImageMarkupAnnotation,
  type ImageMarkupKind,
  type ImageMarkupPoint,
} from './media-image-markup'

const SVG_SIZE = 1000

function toPoint(event: PointerEvent<SVGSVGElement>): ImageMarkupPoint | null {
  const bounds = event.currentTarget.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return null
  return {
    x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
  }
}

function pathData(points: ImageMarkupPoint[]): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * SVG_SIZE} ${point.y * SVG_SIZE}`)
    .join(' ')
}

export function MediaImageMarkupCanvas({
  src,
  alt,
  active,
  applying,
  onApply,
}: {
  src: string
  alt: string
  active: boolean
  applying: boolean
  onApply: (annotations: ImageMarkupAnnotation[]) => void
}) {
  const [tool, setTool] = useState<ImageMarkupKind>('pen')
  const [annotations, setAnnotations] = useState<ImageMarkupAnnotation[]>([])
  const [draftPoints, setDraftPoints] = useState<ImageMarkupPoint[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sequenceRef = useRef(0)

  useEffect(() => {
    setAnnotations([])
    setDraftPoints([])
    setSelectedId(null)
  }, [src])

  const addAnnotation = useCallback((kind: ImageMarkupKind, points: ImageMarkupPoint[]) => {
    if (points.length === 0) return
    sequenceRef.current += 1
    const id = `annotation-${sequenceRef.current}`
    setAnnotations((current) => [...current, { id, kind, points, feedback: '' }])
    setSelectedId(id)
  }, [])

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (!active || applying) return
    const point = toPoint(event)
    if (!point) return
    if (tool === 'pin') {
      addAnnotation('pin', [point])
      return
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDraftPoints([point])
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!active || applying || tool !== 'pen' || draftPoints.length === 0) return
    const point = toPoint(event)
    if (!point) return
    setDraftPoints((current) => [...current, point])
  }

  const finishPen = () => {
    if (draftPoints.length === 0) return
    addAnnotation('pen', draftPoints)
    setDraftPoints([])
  }

  const selectedIndex = annotations.findIndex((annotation) => annotation.id === selectedId)
  const selected = selectedIndex >= 0 ? annotations[selectedIndex] : null
  const ready =
    annotations.length > 0 && annotations.every((annotation) => annotation.feedback.trim())

  return (
    <div className="relative flex h-full max-h-full w-full max-w-full items-center justify-center">
      <div className="relative inline-flex max-h-full max-w-full">
        <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
        {active ? (
          <svg
            role="application"
            aria-label="Image markup canvas"
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            preserveAspectRatio="none"
            className="text-primary absolute inset-0 h-full w-full cursor-crosshair touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishPen}
            onPointerCancel={() => setDraftPoints([])}
          >
            {annotations.map((annotation) =>
              annotation.kind === 'pen' ? (
                <path
                  key={annotation.id}
                  d={pathData(annotation.points)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ) : (
                <g
                  key={annotation.id}
                  transform={`translate(${annotation.points[0]!.x * SVG_SIZE} ${annotation.points[0]!.y * SVG_SIZE})`}
                >
                  <circle r="18" fill="currentColor" vectorEffect="non-scaling-stroke" />
                  <circle
                    r="7"
                    className="text-card"
                    fill="currentColor"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ),
            )}
            {draftPoints.length > 0 ? (
              <path
                d={pathData(draftPoints)}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
        ) : null}
      </div>

      {active ? (
        <>
          <div className="surface-card border-border top-spacing-4 left-spacing-4 p-spacing-2 gap-spacing-1 rounded-spacing-3 z-dropdown absolute flex items-center border shadow-lg">
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={cn(
                'button-compact gap-spacing-1',
                tool === 'pen' ? 'button-glass-primary' : 'button-glass-neutral',
              )}
              aria-label="Pen tool"
            >
              <PenLine className="icon-sm" />
              Pen
            </button>
            <button
              type="button"
              onClick={() => setTool('pin')}
              className={cn(
                'button-compact gap-spacing-1',
                tool === 'pin' ? 'button-glass-primary' : 'button-glass-neutral',
              )}
              aria-label="Pin tool"
            >
              <MapPin className="icon-sm" />
              Pin
            </button>
            <button
              type="button"
              disabled={annotations.length === 0}
              onClick={() => {
                const next = annotations.slice(0, -1)
                setAnnotations(next)
                setSelectedId(next.at(-1)?.id ?? null)
              }}
              className="btn-icon-bare disabled:opacity-50"
              aria-label="Undo last annotation"
            >
              <RotateCcw className="icon-sm" />
            </button>
            <button
              type="button"
              disabled={annotations.length === 0}
              onClick={() => {
                setAnnotations([])
                setSelectedId(null)
              }}
              className="btn-icon-bare text-destructive disabled:opacity-50"
              aria-label="Clear annotations"
            >
              <Trash2 className="icon-sm" />
            </button>
          </div>

          {selected ? (
            <div className="surface-card border-border top-spacing-4 right-spacing-4 p-spacing-3 gap-spacing-2 rounded-spacing-3 z-dropdown absolute flex w-72 flex-col border shadow-lg">
              <div className="gap-spacing-2 flex items-center">
                <p className="body-3 text-foreground flex-1 font-medium">
                  Feedback for mark {selectedIndex + 1}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="btn-icon-bare"
                  aria-label="Close annotation feedback"
                >
                  <X className="icon-xs" />
                </button>
              </div>
              <div className="gap-spacing-1 flex flex-wrap">
                {annotations.map((annotation, index) => (
                  <button
                    key={annotation.id}
                    type="button"
                    onClick={() => setSelectedId(annotation.id)}
                    className={cn(
                      'button-compact',
                      annotation.id === selected.id
                        ? 'button-glass-primary'
                        : 'button-glass-neutral',
                    )}
                    aria-label={`Edit feedback for annotation ${index + 1}`}
                  >
                    Mark {index + 1}
                  </button>
                ))}
              </div>
              <textarea
                value={selected.feedback}
                onChange={(event) =>
                  setAnnotations((current) =>
                    current.map((annotation) =>
                      annotation.id === selected.id
                        ? { ...annotation, feedback: event.target.value }
                        : annotation,
                    ),
                  )
                }
                rows={3}
                autoFocus
                aria-label={`Feedback for annotation ${selectedIndex + 1}`}
                placeholder="What should change here?"
                className="body-3 text-foreground placeholder:text-muted-foreground border-border bg-background rounded-spacing-2 p-spacing-2 focus:ring-ring w-full resize-none border outline-none focus:ring-2"
              />
              <button
                type="button"
                disabled={!ready || applying}
                onClick={() => onApply(annotations)}
                className="button-default button-glass-primary disabled:opacity-50"
                aria-label="Apply marked edits"
              >
                {applying ? (
                  <VibeyLoadingOrb state="processing" size="sm" className="gap-0 py-0" />
                ) : (
                  'Apply marked edits'
                )}
              </button>
            </div>
          ) : annotations.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedId(annotations.at(-1)?.id ?? null)}
              className="button-compact button-glass-neutral top-spacing-4 right-spacing-4 z-dropdown absolute"
            >
              {annotations.length} mark{annotations.length === 1 ? '' : 's'}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
