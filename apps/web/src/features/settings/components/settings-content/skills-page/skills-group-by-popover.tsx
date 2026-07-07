'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Trash2 } from 'lucide-react'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'
import { skillsGroupByLabel, skillsGroupByOptions } from './skills-catalog-sections'
import type { SkillsGroupBy, SkillsGroupSort } from './skills-page.types'
import { DEFAULT_SKILLS_GROUP_BY, DEFAULT_SKILLS_GROUP_SORT } from './skills-page.types'

export function SkillsGroupByPopover({
  open,
  onClose,
  anchorRef,
  skillsViewKey,
  skillsGroupBy,
  skillsGroupSort,
  onGroupByChange,
  onGroupSortChange,
}: {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  skillsViewKey: 'all' | string
  skillsGroupBy: SkillsGroupBy
  skillsGroupSort: SkillsGroupSort
  onGroupByChange: (value: SkillsGroupBy) => void
  onGroupSortChange: (value: SkillsGroupSort) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const fieldClusterRef = useRef<HTMLDivElement>(null)
  const sortClusterRef = useRef<HTMLDivElement>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const [fieldDropOpen, setFieldDropOpen] = useState(false)
  const [sortDropOpen, setSortDropOpen] = useState(false)

  const fieldButtonLabel = skillsGroupByLabel(skillsGroupBy, skillsViewKey) ?? 'None'
  const hasGroup = skillsGroupBy !== 'none'
  const groupOptions = skillsGroupByOptions(skillsViewKey).filter((opt) => opt.id !== 'none')

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
      className="dropdown-menu-solid fixed z-[99999] min-w-[18rem] rounded-xl p-3"
      style={{ top: panelPos.top, left: panelPos.left }}
    >
      <p className="mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">Group by</p>
      <div className="flex items-center gap-2">
        <div ref={fieldClusterRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setFieldDropOpen((o) => !o)
              setSortDropOpen(false)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:border-[var(--border)]"
          >
            {fieldButtonLabel}
            <ChevronDown
              className={`h-3 w-3 text-[var(--color-muted-foreground)] transition-transform ${fieldDropOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {fieldDropOpen ? (
            <div className="dropdown-menu-solid absolute left-0 top-full z-10 mt-1 w-48 rounded-xl py-1">
              <button
                type="button"
                onClick={() => {
                  onGroupByChange(DEFAULT_SKILLS_GROUP_BY)
                  onGroupSortChange(DEFAULT_SKILLS_GROUP_SORT)
                  setFieldDropOpen(false)
                  onClose()
                }}
                className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)] ${
                  skillsGroupBy === 'none'
                    ? 'font-medium text-[var(--foreground)]'
                    : 'text-[var(--color-muted-foreground)]'
                }`}
              >
                <span>None</span>
                {skillsGroupBy === 'none' ? (
                  <Check className="h-3 w-3 text-[var(--color-primary)]" />
                ) : null}
              </button>
              {groupOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onGroupByChange(opt.id)
                    onGroupSortChange(skillsGroupSort ?? DEFAULT_SKILLS_GROUP_SORT)
                    setFieldDropOpen(false)
                    onClose()
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <span>{opt.label}</span>
                  {skillsGroupBy === opt.id ? (
                    <Check className="h-3 w-3 text-[var(--color-primary)]" />
                  ) : null}
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:border-[var(--border)]"
            >
              {skillsGroupSort === 'asc' ? 'A-Z' : 'Z-A'}
              <ChevronDown
                className={`h-3 w-3 text-[var(--color-muted-foreground)] transition-transform ${sortDropOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {sortDropOpen ? (
              <div className="dropdown-menu-solid absolute left-0 top-full z-10 mt-1 w-40 rounded-xl py-1">
                {(['asc', 'desc'] as const).map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => {
                      onGroupSortChange(dir)
                      setSortDropOpen(false)
                    }}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-xs text-[var(--foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
                  >
                    <span>{dir === 'asc' ? 'Ascending' : 'Descending'}</span>
                    {skillsGroupSort === dir ? (
                      <Check className="h-3 w-3 text-[var(--color-primary)]" />
                    ) : null}
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
              onGroupByChange(DEFAULT_SKILLS_GROUP_BY)
              onGroupSortChange(DEFAULT_SKILLS_GROUP_SORT)
              onClose()
            }}
            className="rounded-lg p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
            title="Remove grouping"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
