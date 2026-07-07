'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { ARTIFACT_CATEGORIES } from './constants'
import type { ArtifactCategoryId } from './types'

export type SourceFilterValue = 'all' | 'vibey' | 'meta'

const SOURCE_OPTIONS: Array<{ value: SourceFilterValue; label: string }> = [
  { value: 'all', label: 'All Sources' },
  { value: 'vibey', label: 'Vibey Only' },
  { value: 'meta', label: 'Meta Only' },
]

interface ArtifactFilterDropdownProps {
  filterSet: Set<ArtifactCategoryId> | null
  onToggle: (id: ArtifactCategoryId) => void
  onShowAll: () => void
  sourceFilter: SourceFilterValue
  onSourceFilterChange: (value: SourceFilterValue) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
}

export function ArtifactFilterDropdown({
  filterSet,
  onToggle,
  onShowAll,
  sourceFilter,
  onSourceFilterChange,
  onClose,
  anchorRef,
}: ArtifactFilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!anchorRef.current || !dropdownRef.current) return
    const anchorRect = anchorRef.current.getBoundingClientRect()
    const dropRect = dropdownRef.current.getBoundingClientRect()
    const pad = 8
    const spaceBelow = window.innerHeight - anchorRect.bottom - pad
    const spaceAbove = anchorRect.top - pad
    let top =
      spaceBelow >= dropRect.height || spaceBelow >= spaceAbove
        ? anchorRect.bottom + 4
        : anchorRect.top - dropRect.height - 4
    let left = anchorRect.left
    if (top + dropRect.height > window.innerHeight - pad)
      top = window.innerHeight - dropRect.height - pad
    if (top < pad) top = pad
    if (left + dropRect.width > window.innerWidth - pad)
      left = window.innerWidth - dropRect.width - pad
    if (left < pad) left = pad
    setPos({ top, left })
  }, [anchorRef])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !anchorRef.current?.contains(target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, anchorRef])

  const isShowAll = filterSet === null

  const dropdown = (
    <div
      data-dropdown
      ref={dropdownRef}
      className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-44 border shadow-lg"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="space-y-spacing-1">
        <button
          type="button"
          onClick={onShowAll}
          className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center text-left ${
            isShowAll
              ? 'bg-primary/10 text-foreground'
              : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
          }`}
        >
          {isShowAll ? <Check className="icon-sm text-primary" /> : <div className="icon-sm" />}
          <span>Show All</span>
        </button>
        <div className="border-border my-spacing-1 border-t" />
        {ARTIFACT_CATEGORIES.map((cat) => {
          const isSelected = filterSet?.has(cat.id) ?? false
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggle(cat.id)}
              className="gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 hover:bg-hover-subtle body-3 flex w-full items-center text-left"
            >
              {isSelected ? (
                <Check className="icon-sm text-primary" />
              ) : (
                <div className="icon-sm" />
              )}
              <span className="text-muted-foreground">{cat.label}</span>
            </button>
          )
        })}
        <div className="border-border my-spacing-1 border-t" />
        <p className="typo-caption text-muted-foreground px-spacing-2 pb-spacing-1 pt-spacing-1 font-medium uppercase tracking-wider opacity-60">
          Source
        </p>
        {SOURCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSourceFilterChange(opt.value)}
            className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center text-left ${
              sourceFilter === opt.value
                ? 'bg-primary/10 text-foreground'
                : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
            }`}
          >
            {sourceFilter === opt.value ? (
              <Check className="icon-sm text-primary" />
            ) : (
              <div className="icon-sm" />
            )}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  return createPortal(dropdown, document.body)
}
