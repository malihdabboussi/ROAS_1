'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function useOverviewFluidType(
  containerRef: RefObject<HTMLElement | null>,
  variant: 'heading' | 'note',
): {
  titlePx: number
  subPx: number
  bodyPx: number
} {
  const [dims, setDims] = useState({ w: 280, h: 160 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      setDims({ w: cr.width, h: cr.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef])

  const scale = Math.sqrt(Math.max(dims.w * dims.h, 1))

  if (variant === 'heading') {
    const h = dims.h
    const titlePx = clamp(Math.round(h * 0.42), 12, 64)
    const subPx = clamp(Math.round(titlePx * 0.42), 10, 28)
    return { titlePx, subPx, bodyPx: subPx }
  }

  const bodyPx = clamp(Math.round(scale * 0.032), 11, 18)
  return { titlePx: bodyPx, subPx: bodyPx, bodyPx }
}

function useDebouncedPersist<T>(_value: T, persist: (_v: T) => void, delay = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistRef = useRef(persist)
  persistRef.current = persist

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return useCallback(
    (next: T) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => persistRef.current(next), delay)
    },
    [delay],
  )
}

const headingInputClass =
  'overview-dashboard-no-drag bg-transparent text-foreground placeholder:text-muted-foreground w-full min-w-0 rounded-none border-0 border-b border-transparent px-0 py-0.5 font-semibold uppercase tracking-tight outline-none transition-colors focus-visible:border-muted-foreground/40 focus-visible:bg-muted/15'

const subtitleInputClass =
  'overview-dashboard-no-drag bg-transparent text-muted-foreground placeholder:text-muted-foreground/60 w-full min-w-0 rounded-none border-0 border-b border-transparent px-0 py-0.5 outline-none transition-colors focus-visible:border-muted-foreground/30 focus-visible:bg-muted/10'

export function OverviewHeadingWidget(props: {
  title: string
  subtitle: string
  editMode: boolean
  onChange: (patch: { title?: string; subtitle?: string }) => void
}) {
  const { editMode, onChange } = props
  const ref = useRef<HTMLDivElement>(null)
  const fluid = useOverviewFluidType(ref, 'heading')

  const [localTitle, setLocalTitle] = useState(props.title)
  const [localSubtitle, setLocalSubtitle] = useState(props.subtitle)

  useEffect(() => {
    setLocalTitle(props.title)
  }, [props.title])
  useEffect(() => {
    setLocalSubtitle(props.subtitle)
  }, [props.subtitle])

  const debouncedPersist = useDebouncedPersist(
    { title: localTitle, subtitle: localSubtitle },
    (v) => onChange(v),
  )

  const handleTitle = (v: string) => {
    setLocalTitle(v)
    debouncedPersist({ title: v, subtitle: localSubtitle })
  }
  const handleSubtitle = (v: string) => {
    setLocalSubtitle(v)
    debouncedPersist({ title: localTitle, subtitle: v })
  }

  return (
    <div
      ref={ref}
      className="px-spacing-2 relative flex h-full min-h-0 w-full flex-1 flex-col justify-center overflow-hidden"
    >
      <div className="flex min-h-0 w-full flex-col gap-0.5">
        {editMode ? (
          <>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => handleTitle(e.target.value)}
              className={headingInputClass}
              style={{ fontSize: fluid.titlePx, lineHeight: 1.15 }}
              placeholder="Title"
              autoComplete="off"
            />
            <input
              type="text"
              value={localSubtitle}
              onChange={(e) => handleSubtitle(e.target.value)}
              className={subtitleInputClass}
              style={{ fontSize: fluid.subPx, lineHeight: 1.3 }}
              placeholder="Subtitle"
              autoComplete="off"
            />
          </>
        ) : (
          <>
            <h2
              className="text-foreground font-bold uppercase tracking-tight"
              style={{ fontSize: fluid.titlePx, lineHeight: 1.15 }}
            >
              {localTitle || 'Title'}
            </h2>
            <p
              className="text-muted-foreground font-medium"
              style={{ fontSize: fluid.subPx, lineHeight: 1.3 }}
            >
              {localSubtitle || 'Subtitle'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export function OverviewNoteWidget(props: {
  body: string
  editMode: boolean
  onChange: (patch: { body?: string }) => void
}) {
  const { editMode, onChange } = props
  const ref = useRef<HTMLDivElement>(null)
  const fluid = useOverviewFluidType(ref, 'note')

  const [localBody, setLocalBody] = useState(props.body)
  useEffect(() => {
    setLocalBody(props.body)
  }, [props.body])

  const debouncedPersist = useDebouncedPersist(localBody, (v) => onChange({ body: v }))

  const handleBody = (v: string) => {
    setLocalBody(v)
    debouncedPersist(v)
  }

  return (
    <div
      ref={ref}
      className="card-glass px-spacing-2 pb-spacing-2 pt-spacing-1 relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {editMode ? (
          <textarea
            value={localBody}
            onChange={(e) => handleBody(e.target.value)}
            className="overview-dashboard-no-drag text-foreground placeholder:text-muted-foreground min-h-0 w-full flex-1 resize-none border-0 bg-transparent p-0 leading-relaxed outline-none"
            style={{ fontSize: fluid.bodyPx }}
            placeholder="Note"
          />
        ) : (
          <p
            className="text-foreground whitespace-pre-wrap leading-relaxed"
            style={{ fontSize: fluid.bodyPx }}
          >
            {localBody || '—'}
          </p>
        )}
      </div>
    </div>
  )
}
