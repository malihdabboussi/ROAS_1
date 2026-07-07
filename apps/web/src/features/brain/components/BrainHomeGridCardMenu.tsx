'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Diamond, ExternalLink, GraduationCap, Mic, Share2 } from 'lucide-react'
import type { BrainScopeMenuContext } from '@/features/brain/hooks/use-brain-scope-menu-actions'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { BrainImageMenuItem } from './BrainImageMenuItem'
import { CampaignBrainIconMenuItem } from './CampaignBrainIconPicker'
import { CortexMaxIcon } from './CortexMaxIcon'

export const BRAIN_CARD_MENU_WIDTH = 224

const ITEM_CLS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-hover-subtle hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors'

interface BrainHomeGridCardMenuProps {
  position: { x: number; y: number } | null
  ctx: BrainScopeMenuContext
  option: BrainScopeNavOption
  imageUrl?: string | null
  onClose: () => void
}

export function BrainHomeGridCardMenu({
  position,
  ctx,
  option,
  imageUrl,
  onClose,
}: BrainHomeGridCardMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!position) return
    const onDocDown = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) return
      onClose()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const onScroll = (event: Event) => {
      if (ref.current?.contains(event.target as Node)) return
      onClose()
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onClose)
    }
  }, [position, onClose])

  if (!position || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={ref}
      className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 gap-spacing-1 fixed flex flex-col border shadow-lg"
      style={{ top: position.y, left: position.x, width: BRAIN_CARD_MENU_WIDTH }}
      role="menu"
    >
      {ctx.canTrain ? (
        <button
          type="button"
          className={ITEM_CLS}
          onClick={() => {
            ctx.onOpenWithAction('train')
            onClose()
          }}
        >
          <GraduationCap className="h-3.5 w-3.5 shrink-0" />
          Train
        </button>
      ) : null}
      {ctx.canVoice ? (
        <button
          type="button"
          className={ITEM_CLS}
          onClick={() => {
            ctx.onOpenWithAction('voice')
            onClose()
          }}
        >
          <Mic className="h-3.5 w-3.5 shrink-0" />
          Talk to Atlas
        </button>
      ) : null}
      {ctx.canTrain ? (
        <>
          <button
            type="button"
            className={ITEM_CLS}
            onClick={() => {
              ctx.onOpenWithAction('cortex-max')
              onClose()
            }}
          >
            <CortexMaxIcon size="sm" className="h-3.5 w-3.5 shrink-0" />
            Cortex MAX
          </button>
          <button
            type="button"
            className={ITEM_CLS}
            onClick={() => {
              ctx.onOpenWithAction('crystallize')
              onClose()
            }}
          >
            <Diamond className="h-3.5 w-3.5 shrink-0" />
            Crystallize
          </button>
        </>
      ) : null}
      <button
        type="button"
        className={ITEM_CLS}
        onClick={() => {
          ctx.onOpenInNewTab()
          onClose()
        }}
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        Open in new tab
      </button>
      {option.scopeType === 'campaign_knowledge' && option.campaignId ? (
        <CampaignBrainIconMenuItem
          campaignId={option.campaignId}
          campaignLabel={option.label}
          icon={option.campaignIcon ?? 'brain'}
          iconColor={option.campaignIconColor ?? 'purple'}
          imageUrl={imageUrl ?? null}
          variant="card"
          onAction={onClose}
        />
      ) : null}
      {ctx.canChangeImage && ctx.brainId ? (
        <BrainImageMenuItem
          brainId={ctx.brainId}
          brainLabel={ctx.brainLabel}
          scopeId={ctx.scopeId ?? undefined}
          variant="card"
          onAction={onClose}
        />
      ) : null}
      {ctx.canShare ? (
        <>
          <div className="border-border border-t" />
          <button
            type="button"
            onClick={() => {
              ctx.onShare()
              onClose()
            }}
            className="button-glass-blue body-3 gap-spacing-2 px-spacing-3 py-spacing-1 mt-spacing-1 flex w-full items-center justify-center rounded-md font-medium"
          >
            <Share2 className="relative z-10 h-3.5 w-3.5 shrink-0" />
            <span className="relative z-10">Sharing &amp; Permissions</span>
          </button>
        </>
      ) : null}
    </div>,
    document.body,
  )
}
