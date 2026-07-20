'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  Brain,
  Diamond,
  GraduationCap,
  MessageCircle,
  Mic,
  Plus,
  Settings2,
  Share2,
  Sparkles,
} from 'lucide-react'
import type { BrainScopeMenuContext } from '@/features/brain/hooks/use-brain-scope-menu-actions'
import { HUB_DOCK_PORTAL_GUARD } from '@/lib/ui/floating-control-attrs'
import { BrainImageMenuItem } from './BrainImageMenuItem'
import { CortexMaxIcon } from './CortexMaxIcon'

const MENU_WIDTH = 224

const ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:opacity-50 disabled:hover:bg-transparent'
const DANGER_ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left text-red-600 transition-colors hover:bg-red-500/10 [&_svg]:text-red-600'
const ITEM_ICON_CLS = 'h-3.5 w-3.5 shrink-0'
const QUICK_CELL_CLS =
  'body-3 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground flex min-h-7 min-w-0 flex-1 items-center justify-center truncate rounded-none px-2 text-center transition-colors'

export type BrainScopeContextMenuProps = {
  position: { x: number; y: number } | null
  ctx: BrainScopeMenuContext
  onClose: () => void
}

function row(
  icon: ReactNode,
  label: string,
  onPick: () => void,
  opts?: { danger?: boolean; disabled?: boolean },
) {
  return (
    <button
      type="button"
      disabled={opts?.disabled}
      className={opts?.danger ? DANGER_ITEM_CLS : ITEM_CLS}
      onClick={() => {
        if (opts?.disabled) return
        onPick()
      }}
    >
      {icon}
      <span className="flex-1 truncate">{label}</span>
    </button>
  )
}

export function BrainScopeContextMenu({ position, ctx, onClose }: BrainScopeContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const close = () => onClose()

  useLayoutEffect(() => {
    if (!position || !ref.current) {
      setPos(null)
      return
    }
    const dropRect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    let left = position.x
    let top = position.y
    if (left + dropRect.width > vw - pad) left = Math.max(pad, vw - dropRect.width - pad)
    if (top + dropRect.height > vh - pad) top = Math.max(pad, vh - dropRect.height - pad)
    setPos({ top, left })
  }, [position, ctx.canTrain, ctx.canShare])

  useEffect(() => {
    if (!position) return
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    const onScroll = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return
      close()
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [position])

  const placedStyle = pos
    ? { top: pos.top, left: pos.left, visibility: 'visible' as const }
    : { top: -9999, left: -9999, visibility: 'hidden' as const }

  const showWork =
    ctx.canAddInfo || ctx.canTrain || ctx.canVoice || ctx.canAgentChat || ctx.canManageAgent

  if (!position || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        ref={ref}
        data-brain-scope-menu
        {...{ [HUB_DOCK_PORTAL_GUARD]: '' }}
        className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 gap-spacing-1 fixed flex flex-col border shadow-lg"
        style={{ ...placedStyle, width: MENU_WIDTH }}
        role="menu"
      >
        <div className="border-border mb-spacing-1 overflow-hidden rounded-md border">
          <div className="divide-border flex w-full divide-x">
            <button
              type="button"
              onClick={() => {
                ctx.onCopyLink()
                close()
              }}
              className={QUICK_CELL_CLS}
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={() => {
                ctx.onOpenInNewTab()
                close()
              }}
              className={QUICK_CELL_CLS}
            >
              New tab
            </button>
          </div>
        </div>

        {row(<Brain className={ITEM_ICON_CLS} />, 'Open brain', () => {
          ctx.onOpenBrain()
          close()
        })}

        {showWork ? <div className="border-border border-t" /> : null}

        {ctx.canAddInfo
          ? row(<Plus className={ITEM_ICON_CLS} />, 'Add information', () => {
              ctx.onOpenWithAction('add-info')
              close()
            })
          : null}

        {ctx.canTrain ? (
          <>
            {row(<GraduationCap className={ITEM_ICON_CLS} />, 'Train brain', () => {
              ctx.onOpenWithAction('train')
              close()
            })}
            {row(<Diamond className={ITEM_ICON_CLS} />, 'Crystallize', () => {
              ctx.onOpenWithAction('crystallize')
              close()
            })}
            {row(<CortexMaxIcon size="sm" className={ITEM_ICON_CLS} />, 'Cortex MAX', () => {
              ctx.onOpenWithAction('cortex-max')
              close()
            })}
          </>
        ) : null}

        {ctx.canVoice
          ? row(<Mic className={ITEM_ICON_CLS} />, 'Talk to Atlas', () => {
              ctx.onOpenWithAction('voice')
              close()
            })
          : null}

        {ctx.canAgentChat || ctx.canManageAgent ? <div className="border-border border-t" /> : null}

        {ctx.canAgentChat
          ? row(<MessageCircle className={ITEM_ICON_CLS} />, 'Open agent chat', () => {
              ctx.onOpenAgentChat()
              close()
            })
          : null}

        {ctx.canManageAgent
          ? row(<Settings2 className={ITEM_ICON_CLS} />, 'Manage agent', () => {
              ctx.onManageAgent()
              close()
            })
          : null}

        {ctx.canChangeImage && ctx.brainId ? (
          <>
            <div className="border-border border-t" />
            <BrainImageMenuItem
              brainId={ctx.brainId}
              brainLabel={ctx.brainLabel}
              scopeId={ctx.scopeId ?? undefined}
              variant="menu"
              onAction={close}
            />
          </>
        ) : null}

        {ctx.canEnableCustomer
          ? row(<Sparkles className={ITEM_ICON_CLS} />, 'Enable Customer Brain', () => {
              ctx.onEnableCustomerBrain()
              close()
            })
          : null}

        {ctx.canDisableCustomer ? (
          <>
            <div className="border-border border-t" />
            {row(
              <Brain className={ITEM_ICON_CLS} />,
              'Disable Customer Brain',
              () => {
                ctx.onDisableCustomerBrain()
                close()
              },
              { danger: true },
            )}
          </>
        ) : null}

        {ctx.canShare ? (
          <>
            <div className="border-border border-t" />
            <button
              type="button"
              onClick={() => {
                ctx.onShare()
                close()
              }}
              className="button-glass-blue body-3 gap-spacing-2 px-spacing-3 py-spacing-1 mt-spacing-1 flex w-full items-center justify-center rounded-md font-medium"
            >
              <Share2 className="relative z-10 h-3.5 w-3.5 shrink-0" />
              <span className="relative z-10">Sharing &amp; Permissions</span>
            </button>
          </>
        ) : null}
      </div>
    </>,
    document.body,
  )
}
