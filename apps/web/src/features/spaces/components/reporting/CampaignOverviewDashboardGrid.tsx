'use client'

import { useCallback, useMemo, useRef, type Ref } from 'react'
import type { Layout } from 'react-grid-layout'
import ReactGridLayout, { WidthProvider, type ResizeHandleAxis } from 'react-grid-layout/legacy'
import { GripHorizontal, Trash2 } from 'lucide-react'
import {
  layoutToPersistable,
  mergeOverviewSectionLayouts,
  type OverviewSectionLayoutItem,
} from './overview-section-layout'

const GridWithWidth = WidthProvider(ReactGridLayout)

export type OverviewDashboardSection = {
  id: string
  node: React.ReactNode
  onRemove?: () => void
}

type Props = {
  sections: OverviewDashboardSection[]
  savedLayout: readonly OverviewSectionLayoutItem[] | undefined
  editMode: boolean
  onLayoutPersist: (layout: OverviewSectionLayoutItem[]) => void
  glassStyle?: React.CSSProperties
  refreshing?: boolean
}

export function CampaignOverviewDashboardGrid({
  sections,
  savedLayout,
  editMode,
  onLayoutPersist,
  glassStyle,
  refreshing,
}: Props) {
  const ids = sections.map((s) => s.id)
  const layout = useMemo(() => mergeOverviewSectionLayouts(savedLayout, ids), [savedLayout, ids])
  const lastLayoutRef = useRef<string>('')

  const handleLayoutChange = useCallback(
    (next: Layout) => {
      const key = JSON.stringify(next.map((l) => [l.i, l.x, l.y, l.w, l.h]))
      if (key === lastLayoutRef.current) return
      lastLayoutRef.current = key
      onLayoutPersist(layoutToPersistable(next))
    },
    [onLayoutPersist],
  )

  const renderResizeHandle = useCallback((axis: ResizeHandleAxis, ref: Ref<HTMLElement>) => {
    if (axis === 'e' || axis === 'w') {
      return (
        <span
          ref={ref as Ref<HTMLSpanElement>}
          className={`react-resizable-handle react-resizable-handle-${axis} ov-overview-resize-hit z-20`}
        >
          <span
            className={`resize-divider-line-blue-full ov-overview-resize-line ov-overview-resize-line-${axis} pointer-events-none`}
            aria-hidden
          />
        </span>
      )
    }
    if (axis === 's') {
      return (
        <span
          ref={ref as Ref<HTMLSpanElement>}
          className="react-resizable-handle react-resizable-handle-s ov-overview-resize-hit z-20"
        >
          <span
            className="resize-divider-line-blue-horizontal-full ov-overview-resize-line ov-overview-resize-line-s pointer-events-none"
            aria-hidden
          />
        </span>
      )
    }
    return <span ref={ref as Ref<HTMLSpanElement>} />
  }, [])

  const gridResizeProps = editMode
    ? ({
        resizeHandles: ['e', 'w', 's'] satisfies ResizeHandleAxis[],
        resizeHandle: renderResizeHandle,
      } as const)
    : ({ resizeHandles: [] as ResizeHandleAxis[] } as const)

  return (
    <div
      className={`reporting-overview-themed transition-opacity duration-200 ${editMode ? 'overview-dashboard-edit overview-grid-edit-bg' : ''} ${
        refreshing ? 'opacity-60' : ''
      }`}
      style={editMode ? { ...glassStyle, minHeight: '100vh' } : glassStyle}
    >
      <GridWithWidth
        cols={12}
        rowHeight={10}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        compactType="vertical"
        layout={layout as Layout}
        onDragStop={handleLayoutChange}
        onResizeStop={handleLayoutChange}
        isDraggable={editMode}
        isResizable={editMode}
        draggableCancel={editMode ? '.overview-dashboard-no-drag' : undefined}
        {...gridResizeProps}
      >
        {sections.map((s) => (
          <div
            key={s.id}
            className={
              editMode
                ? 'group relative flex h-full min-h-0 w-full cursor-grab flex-col overflow-visible rounded-2xl transition-shadow hover:shadow-md active:cursor-grabbing'
                : 'h-full w-full'
            }
          >
            {editMode ? (
              <>
                <div className="pointer-events-none absolute inset-0 z-[1] rounded-2xl border border-dashed border-[var(--color-border)]" />
                <div className="py-spacing-1 pointer-events-none absolute inset-x-0 top-0 z-10 flex shrink-0 justify-center">
                  <GripHorizontal
                    className="h-4 w-4 text-[var(--color-muted-foreground)] opacity-60"
                    aria-hidden
                  />
                </div>
                {s.onRemove ? (
                  <button
                    type="button"
                    aria-label="Remove block"
                    className="overview-dashboard-no-drag text-muted-foreground hover:bg-hover-subtle hover:text-foreground absolute -top-8 right-0 z-20 flex items-center justify-center rounded-md p-1 opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={s.onRemove}
                  >
                    <Trash2 className="icon-xs" />
                  </button>
                ) : null}
                <div className="relative z-[2] flex min-h-0 flex-1 flex-col">{s.node}</div>
              </>
            ) : (
              s.node
            )}
          </div>
        ))}
      </GridWithWidth>
    </div>
  )
}
