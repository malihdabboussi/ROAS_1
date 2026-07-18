'use client'

import { useRouter } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import {
  TRY_NOW_OPEN_CREATE_ORG,
  TRY_NOW_OPEN_WORKSPACE_SKILLS,
  TRY_NOW_OPEN_WORKSPACE_SKILLS_LEGACY,
  type FeatureUpdate,
} from '@/features/updates/types'

export interface FeatureUpdateDetailModalProps {
  open: boolean
  update: FeatureUpdate | null
  onClose: () => void
}

export function FeatureUpdateDetailModal({ open, update, onClose }: FeatureUpdateDetailModalProps) {
  const router = useRouter()

  const handleTryNow = () => {
    if (!update) return
    const path = update.try_now_path
    if (path === TRY_NOW_OPEN_CREATE_ORG) {
      window.dispatchEvent(new CustomEvent('open-create-org'))
    } else if (
      path === TRY_NOW_OPEN_WORKSPACE_SKILLS ||
      path === TRY_NOW_OPEN_WORKSPACE_SKILLS_LEGACY
    ) {
      router.push('/team/skills')
    } else if (path) {
      router.push(path)
    }
    onClose()
  }

  if (!update) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{update.title}</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="relative w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[85vh] flex-col overflow-hidden">
              <button
                type="button"
                onClick={onClose}
                className="btn-icon-bare btn-close-absolute"
                aria-label="Close"
              >
                <X className="icon-sm" />
              </button>

              {update.video_url ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  src={update.video_url}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="bg-muted body-3 text-muted-foreground flex aspect-video w-full items-center justify-center">
                  Video coming soon
                </div>
              )}

              <div className="px-spacing-6 pb-spacing-2 pt-spacing-4">
                <h2 className="title-h6">{update.title}</h2>
                <DialogPrimitive.Description className="body-2 text-muted-foreground mt-spacing-2">
                  {update.description}
                </DialogPrimitive.Description>
              </div>

              <div className="border-border px-spacing-6 py-spacing-4 flex items-center justify-between border-t">
                {update.learn_more_url ? (
                  <a
                    href={update.learn_more_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
                  >
                    Learn More
                  </a>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={handleTryNow}
                  disabled={!update.try_now_path}
                  className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-10">Try Now</span>
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
