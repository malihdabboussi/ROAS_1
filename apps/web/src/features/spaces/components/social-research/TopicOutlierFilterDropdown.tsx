'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  formatTopicOutlierLabel,
  OUTLIER_MAX,
  OUTLIER_MIN,
  TopicOutlierFilterPanel,
} from './TopicOutlierFilterPanel'

interface TopicOutlierFilterDropdownProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function TopicOutlierFilterDropdown({
  value,
  onChange,
  disabled = false,
}: TopicOutlierFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })

  const OFFSET = 4
  const VIEWPORT_MARGIN = 8
  const clampedValue = Math.min(OUTLIER_MAX, Math.max(OUTLIER_MIN, value))

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const dropdownHeight = dropdownRef.current?.getBoundingClientRect().height ?? 0
    const spaceBelow = window.innerHeight - rect.bottom - OFFSET
    const openUp = dropdownHeight > 0 ? spaceBelow < dropdownHeight + OFFSET : spaceBelow < 200
    const top = openUp
      ? Math.max(VIEWPORT_MARGIN, rect.top - (dropdownHeight || 0) - OFFSET)
      : rect.bottom + OFFSET
    setPos({ top, left: rect.left, width: Math.max(rect.width, 220) })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return
    updatePosition()
    const raf = requestAnimationFrame(() => updatePosition())
    return () => cancelAnimationFrame(raf)
  }, [isOpen, updatePosition, clampedValue])

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return
    const scrollParents: Element[] = []
    let el: HTMLElement | null = triggerRef.current.parentElement
    while (el) {
      const { overflowY, overflow } = getComputedStyle(el)
      if (
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflow === 'auto' ||
        overflow === 'scroll'
      ) {
        scrollParents.push(el)
      }
      el = el.parentElement
    }
    const handleScroll = () => updatePosition()
    scrollParents.forEach((parent) =>
      parent.addEventListener('scroll', handleScroll, { passive: true }),
    )
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      scrollParents.forEach((parent) => parent.removeEventListener('scroll', handleScroll))
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen, updatePosition])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!dropdownRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (disabled) return
          setIsOpen((open) => !open)
        }}
        disabled={disabled}
        className="border-border bg-background text-foreground hover:bg-hover-subtle body-3 h-spacing-8 rounded-spacing-2 px-spacing-3 flex w-full items-center justify-between border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="text-foreground min-w-0 truncate">
          {formatTopicOutlierLabel(clampedValue)}
        </span>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-3.5 w-3.5 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="dropdown-menu-solid z-dropdown p-spacing-3"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
              maxWidth: 280,
            }}
          >
            <TopicOutlierFilterPanel value={clampedValue} onChange={onChange} />
          </div>,
          document.body,
        )}
    </div>
  )
}
