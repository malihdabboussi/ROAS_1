'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, MessageCircle, Power, Upload, Wrench } from 'lucide-react'
import type { MissionAgent } from '@/features/mission-control/types'

export function SkillsAgentTabMenuDropdown({
  pointerPosition,
  canWriteSkills,
  onClose,
  onCopyAgentKey,
  onCopyAgentId,
  onOpenInNewTab,
  onNewSkill,
  onUploadSkill,
  onEnableAll,
  onOpenChat,
}: {
  agent: MissionAgent
  pointerPosition: { x: number; y: number }
  canWriteSkills: boolean
  onClose: () => void
  onCopyAgentKey: () => void | Promise<void>
  onCopyAgentId: () => void | Promise<void>
  onOpenInNewTab: () => void
  onNewSkill: () => void
  onUploadSkill: () => void
  onEnableAll: () => void | Promise<void>
  onOpenChat: () => void
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ top: pointerPosition.y, left: pointerPosition.x })

  useLayoutEffect(() => {
    const el = dropdownRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pad = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    let top = pointerPosition.y
    let left = pointerPosition.x
    if (left + rect.width > vw - pad) left = Math.max(pad, vw - rect.width - pad)
    if (top + rect.height > vh - pad) top = Math.max(pad, vh - rect.height - pad)
    if (top < pad) top = pad
    posRef.current = { top, left }
    el.style.top = `${top}px`
    el.style.left = `${left}px`
  }, [pointerPosition, canWriteSkills])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-skills-agent-tab-menu]')) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const close = () => onClose()
  const wrap = (fn: () => void | Promise<void>) => async () => {
    try {
      await fn()
    } finally {
      close()
    }
  }

  const quickCellCls =
    'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'
  const itemCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const itemIcon = 'h-3.5 w-3.5 shrink-0'

  return createPortal(
    <div
      data-skills-agent-tab-menu
      ref={dropdownRef}
      className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed min-w-56 border shadow-lg"
      style={{ top: posRef.current.top, left: posRef.current.left }}
    >
      <div className="border-border mb-spacing-2 overflow-hidden rounded-md border">
        <div className="divide-border flex w-full divide-x">
          <button type="button" onClick={wrap(onCopyAgentKey)} className={quickCellCls}>
            Copy key
          </button>
          <button type="button" onClick={wrap(onCopyAgentId)} className={quickCellCls}>
            Copy ID
          </button>
        </div>
      </div>

      <div className="gap-spacing-1 px-spacing-1 flex flex-col">
        <button type="button" onClick={wrap(onOpenInNewTab)} className={itemCls}>
          <ExternalLink className={itemIcon} />
          <span>Open in new tab</span>
        </button>

        {canWriteSkills ? (
          <>
            <div className="border-border border-t" />
            <button type="button" onClick={wrap(onNewSkill)} className={itemCls}>
              <Wrench className={itemIcon} />
              <span>New skill</span>
            </button>
            <button type="button" onClick={wrap(onUploadSkill)} className={itemCls}>
              <Upload className={itemIcon} />
              <span>Upload skill</span>
            </button>
            <button type="button" onClick={wrap(onEnableAll)} className={itemCls}>
              <Power className={itemIcon} />
              <span>Enable all custom</span>
            </button>
          </>
        ) : null}

        <div className="border-border border-t" />
        <button type="button" onClick={wrap(onOpenChat)} className={itemCls}>
          <MessageCircle className={itemIcon} />
          <span>Open chat</span>
        </button>
      </div>
    </div>,
    document.body,
  )
}
