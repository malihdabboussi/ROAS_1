'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUp,
  ArrowUpDown,
  Ban,
  CalendarClock,
  Check,
  EyeOff,
  ListOrdered,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { DateDisplayFormat, SortDef } from '../types/space-schema'

export type ListColumnHeaderMenuConfig = {
  grouped: boolean
  primarySort: SortDef | undefined
  sortScope: 'per_group' | 'global'
  onSortPerGroup: (fieldId: string) => void
  onSortGlobal: (fieldId: string) => void
  onClearSort: () => void
  onMoveColumn: (fieldId: string, placement: 'start' | 'end') => void
  onHideColumn: (fieldId: string) => void
  dateFormat?: {
    fieldIds: string[]
    value: (fieldId: string) => DateDisplayFormat
    onChange: (fieldId: string, format: DateDisplayFormat) => void
  }
}

type OpenState = {
  fieldId: string
  x: number
  y: number
}

export function useListColumnHeaderMenuAnchor() {
  const [open, setOpen] = useState<OpenState | null>(null)
  const close = () => setOpen(null)
  const openAt = (fieldId: string, clientX: number, clientY: number) => {
    setOpen({ fieldId, x: clientX, y: clientY })
  }
  return { open, openAt, close }
}

const ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
const DANGER_ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left text-red-600 transition-colors hover:bg-red-500/10 [&_svg]:text-red-600'
const ITEM_ICON_CLS = 'h-3.5 w-3.5 shrink-0'
const DATE_FORMAT_OPTIONS: Array<{ value: DateDisplayFormat; label: string }> = [
  { value: 'relative', label: 'Relative (6d)' },
  { value: 'date_time', label: 'Date + time' },
  { value: 'date', label: 'Date only' },
  { value: 'time', label: 'Time only' },
]

export function ListColumnHeaderMenuPortal({
  open,
  config,
  nameColumnFieldId,
  onClose,
}: {
  open: OpenState | null
  config: ListColumnHeaderMenuConfig | undefined
  nameColumnFieldId: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !ref.current) {
      setPos(null)
      return
    }
    const dropRect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let top = open.y + 4
    let left = open.x
    if (left + dropRect.width > vw - pad) left = Math.max(pad, vw - dropRect.width - pad)
    if (top + dropRect.height > vh - pad) top = Math.max(pad, vh - dropRect.height - pad)
    setPos({ top, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !config || typeof document === 'undefined') return null

  const { fieldId } = open
  const isNameCol = fieldId === nameColumnFieldId
  const showPerGroupSort = config.grouped
  const cur = config.primarySort
  const perGroupActive = cur?.field === fieldId && config.sortScope === 'per_group'
  const globalActive = cur?.field === fieldId && config.sortScope === 'global'
  const sortAnyActive = perGroupActive || globalActive
  const showDateFormat = config.dateFormat?.fieldIds.includes(fieldId) ?? false

  function dirIcon(dir: SortDef['dir']) {
    return dir === 'asc' ? (
      <ArrowUp className={ITEM_ICON_CLS} />
    ) : (
      <ArrowDown className={ITEM_ICON_CLS} />
    )
  }

  function row(
    icon: ReactNode,
    label: string,
    onPick: () => void,
    opts?: { danger?: boolean; checked?: boolean },
  ) {
    return (
      <button
        type="button"
        className={opts?.danger ? DANGER_ITEM_CLS : ITEM_CLS}
        onClick={() => {
          onPick()
          onClose()
        }}
      >
        {icon}
        <span className="flex-1 truncate" title={label}>{label}</span>
        {opts?.checked ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> : null}
      </button>
    )
  }

  const placedStyle = pos
    ? { top: pos.top, left: pos.left, visibility: 'visible' as const }
    : { top: -9999, left: -9999, visibility: 'hidden' as const }

  return createPortal(
    <div
      ref={ref}
      data-list-column-header-menu
      className={cn(
        'z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-56 border shadow-lg',
        'gap-spacing-1 flex flex-col',
      )}
      style={placedStyle}
      role="menu"
    >
      {showPerGroupSort
        ? row(
            perGroupActive ? dirIcon(cur!.dir) : <ArrowUpDown className={ITEM_ICON_CLS} />,
            'Sort',
            () => config.onSortPerGroup(fieldId),
            { checked: perGroupActive },
          )
        : null}
      {row(
        globalActive ? dirIcon(cur!.dir) : <ListOrdered className={ITEM_ICON_CLS} />,
        'Sort entire column',
        () => config.onSortGlobal(fieldId),
        { checked: globalActive },
      )}
      {sortAnyActive
        ? row(<Ban className={ITEM_ICON_CLS} />, 'Clear sort', () => config.onClearSort())
        : null}

      {showDateFormat && config.dateFormat ? (
        <>
          <div className="border-border border-t" />
          <p className="typo-section-label text-muted-foreground px-spacing-2 py-spacing-1">
            Format
          </p>
          {DATE_FORMAT_OPTIONS.map((option) =>
            row(
              <CalendarClock className={ITEM_ICON_CLS} />,
              option.label,
              () => config.dateFormat?.onChange(fieldId, option.value),
              { checked: config.dateFormat?.value(fieldId) === option.value },
            ),
          )}
        </>
      ) : null}

      {!isNameCol ? (
        <>
          <div className="border-border border-t" />
          {row(<ArrowLeftToLine className={ITEM_ICON_CLS} />, 'Move to start', () =>
            config.onMoveColumn(fieldId, 'start'),
          )}
          {row(<ArrowRightToLine className={ITEM_ICON_CLS} />, 'Move to end', () =>
            config.onMoveColumn(fieldId, 'end'),
          )}
          <div className="border-border border-t" />
          {row(
            <EyeOff className={ITEM_ICON_CLS} />,
            'Hide column',
            () => config.onHideColumn(fieldId),
            { danger: true },
          )}
        </>
      ) : null}
    </div>,
    document.body,
  )
}
