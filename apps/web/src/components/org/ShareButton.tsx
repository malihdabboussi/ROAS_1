'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { type ShareResourceType, useOrgStore } from '@/lib/org'
import { ShareModal } from './ShareModal'

export function ShareButton({
  resourceType,
  resourceId,
  resourceName,
  variant = 'menu-item',
  onOpenChange,
}: {
  resourceType: ShareResourceType
  resourceId: string
  resourceName: string
  variant?: 'menu-item' | 'icon' | 'toolbar'
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const { isOrgContext } = useOrgStore()

  if (!isOrgContext()) return null

  const handleOpen = () => {
    setOpen(true)
    onOpenChange?.(true)
  }
  const handleClose = () => {
    setOpen(false)
    onOpenChange?.(false)
  }

  const toolbarButtonClass =
    'rounded-spacing-2 p-spacing-1-5 text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground'

  return (
    <>
      {variant === 'menu-item' ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            handleOpen()
          }}
          className="button-glass-blue gap-spacing-2 px-spacing-3 py-spacing-1-5 body-2 flex w-full items-center rounded-md font-medium"
        >
          <Share2 className="icon-sm" />
          Sharing & Permissions
        </button>
      ) : null}
      {variant === 'icon' ? (
        <Tooltip label="Share with your team" side="top" delayMs={200}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              handleOpen()
            }}
            className="btn-icon-glass"
          >
            <Share2 className="icon-sm" />
          </button>
        </Tooltip>
      ) : null}
      {variant === 'toolbar' ? (
        <Tooltip
          label="Share with your team"
          side="top"
          triggerClassName="flex h-full items-center"
          delayMs={200}
        >
          <span className="inline-flex">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                handleOpen()
              }}
              className={toolbarButtonClass}
              aria-label="Share with your team"
            >
              <Share2 className="icon-sm shrink-0" aria-hidden />
            </button>
          </span>
        </Tooltip>
      ) : null}
      <ShareModal
        open={open}
        onClose={handleClose}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
      />
    </>
  )
}
