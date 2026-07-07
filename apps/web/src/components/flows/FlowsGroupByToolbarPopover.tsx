'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Trash2 } from 'lucide-react'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'
import type { FlowsGroupBy, FlowsGroupSort } from '@/lib/flows/flow-grouping-types'
import { cn } from '@/lib/utils/cn'

export interface FlowsGroupByToolbarOption<TValue extends string = Exclude<FlowsGroupBy, 'none'>> {
  id: TValue
  label: string
}

const GROUP_BY_OPTIONS: FlowsGroupByToolbarOption[] = [
  { id: 'status', label: 'Status' },
  { id: 'trigger', label: 'Trigger' },
  { id: 'enabled', label: 'On / off' },
  { id: 'space', label: 'Space' },
  { id: 'campaign', label: 'Campaign' },
]

interface FlowsGroupByToolbarPopoverProps<
  TValue extends string = Exclude<FlowsGroupBy, 'none'>,
> {
  open: boolean
  onClose: () => void
  anchorRef: RefObject<HTMLElement | null>
  groupBy: TValue | 'none'
  groupSort: FlowsGroupSort
  options?: readonly FlowsGroupByToolbarOption<TValue>[]
  onGroupByChange: (next: TValue | 'none') => void
  onGroupSortChange: (next: FlowsGroupSort) => void
}

export function FlowsGroupByToolbarPopover<
  TValue extends string = Exclude<FlowsGroupBy, 'none'>,
>({
  open,
  onClose,
  anchorRef,
  groupBy,
  groupSort,
  options,
  onGroupByChange,
  onGroupSortChange,
}: FlowsGroupByToolbarPopoverProps<TValue>) {
  const panelRef = useRef<HTMLDivElement>(null)
  const fieldClusterRef = useRef<HTMLDivElement>(null)
  const sortClusterRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const [fieldDropOpen, setFieldDropOpen] = useState(false)
  const [sortDropOpen, setSortDropOpen] = useState(false)
  const groupOptions =
    options ?? (GROUP_BY_OPTIONS as unknown as readonly FlowsGroupByToolbarOption<TValue>[])

  const fieldButtonLabel =
    groupBy === 'none' ? 'None' : (groupOptions.find((o) => o.id === groupBy)?.label ?? 'None')
  const hasGroup = groupBy !== 'none'

  const reposition = useCallback(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const gap = 6
    const panelW = 288
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
    let left = rect.right + gap
    if (left + panelW > vw - gap) {
      left = Math.max(gap, rect.left - panelW - gap)
    }
    setPanelPos({ top: rect.top, left })
  }, [open, anchorRef])

  useLayoutEffect(() => {
    if (!open) return
    reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  useEffect(() => {
    if (!open) {
      setFieldDropOpen(false)
      setSortDropOpen(false)
      return
    }
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (!panelRef.current?.contains(t) && !anchorRef.current?.contains(t)) {
        onClose()
        setFieldDropOpen(false)
        setSortDropOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        setFieldDropOpen(false)
        setSortDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside, true)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside, true)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose, anchorRef])

  useEffect(() => {
    if (!fieldDropOpen && !sortDropOpen) return
    const handle = (e: MouseEvent) => {
      const t = e.target as Node
      if (fieldDropOpen && !fieldClusterRef.current?.contains(t)) setFieldDropOpen(false)
      if (sortDropOpen && !sortClusterRef.current?.contains(t)) setSortDropOpen(false)
    }
    document.addEventListener('mousedown', handle, true)
    return () => document.removeEventListener('mousedown', handle, true)
  }, [fieldDropOpen, sortDropOpen])

  if (!open || !panelPos || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={panelRef}
      {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
      className="dropdown-menu-solid z-dropdown min-w-spacing-72 p-spacing-3 fixed"
      style={{ top: panelPos.top, left: panelPos.left }}
    >
      <p className="mb-spacing-2 body-4 text-muted-foreground font-medium">Group by</p>
      <div className="gap-spacing-2 flex items-center">
        <div ref={fieldClusterRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setFieldDropOpen((o) => !o)
              setSortDropOpen(false)
            }}
            className="gap-spacing-1 rounded-spacing-2 border-border px-spacing-3 py-spacing-1 body-4 text-foreground hover:border-foreground inline-flex items-center border transition-colors"
          >
            {fieldButtonLabel}
            <ChevronDown
              className={cn(
                'icon-xs text-muted-foreground transition-transform',
                fieldDropOpen ? 'rotate-180' : '',
              )}
            />
          </button>
          {fieldDropOpen ? (
            <div className="dropdown-menu-solid mt-spacing-1 w-spacing-48 absolute left-0 top-full z-10 py-spacing-1">
              <button
                type="button"
                onClick={() => {
                  onGroupByChange('none')
                  setFieldDropOpen(false)
                  onClose()
                }}
                className={cn(
                  'px-spacing-3 py-spacing-1 body-4 hover:bg-hover-subtle flex w-full items-center justify-between text-left transition-colors',
                  groupBy === 'none'
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                )}
              >
                <span>None</span>
                {groupBy === 'none' ? <Check className="icon-xs text-primary" /> : null}
              </button>
              {groupOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onGroupByChange(opt.id)
                    setFieldDropOpen(false)
                    onClose()
                  }}
                  className="px-spacing-3 py-spacing-1 body-4 text-foreground hover:bg-hover-subtle flex w-full items-center justify-between text-left transition-colors"
                >
                  <span>{opt.label}</span>
                  {groupBy === opt.id ? <Check className="icon-xs text-primary" /> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {hasGroup ? (
          <div ref={sortClusterRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setSortDropOpen((o) => !o)
                setFieldDropOpen(false)
              }}
              className="gap-spacing-1 rounded-spacing-2 border-border px-spacing-3 py-spacing-1 body-4 text-foreground hover:border-foreground inline-flex items-center border transition-colors"
            >
              {groupSort === 'asc' ? 'A-Z' : 'Z-A'}
              <ChevronDown
                className={cn(
                  'icon-xs text-muted-foreground transition-transform',
                  sortDropOpen ? 'rotate-180' : '',
                )}
              />
            </button>
            {sortDropOpen ? (
              <div className="dropdown-menu-solid mt-spacing-1 w-spacing-48 absolute left-0 top-full z-10 py-spacing-1">
                {(['asc', 'desc'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => {
                      onGroupSortChange(dir)
                      setSortDropOpen(false)
                    }}
                    className="px-spacing-3 py-spacing-1 body-4 text-foreground hover:bg-hover-subtle flex w-full items-center justify-between text-left transition-colors"
                  >
                    <span>{dir === 'asc' ? 'Ascending' : 'Descending'}</span>
                    {groupSort === dir ? <Check className="icon-xs text-primary" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {hasGroup ? (
          <button
            type="button"
            onClick={() => {
              onGroupByChange('none')
              onClose()
            }}
            className="rounded-spacing-2 p-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground transition-colors"
            title="Remove grouping"
          >
            <Trash2 className="icon-xs" />
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
