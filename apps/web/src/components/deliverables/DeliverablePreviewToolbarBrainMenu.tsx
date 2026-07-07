'use client'

import type { Dispatch, RefObject, SetStateAction } from 'react'
import { createPortal } from 'react-dom'
import { Brain, Loader2 } from 'lucide-react'
import type { BrainOption } from '@/components/deliverables/deliverable-preview-modal.types'
import { brainOptionBadge } from '@/components/deliverables/deliverable-preview-modal.utils'
import { Tooltip } from '@/components/ui/tooltip'

export function DeliverablePreviewToolbarBrainMenu({
  effectiveContent,
  brainButtonRef,
  brainDropdownOpen,
  handleBrainDropdownToggle,
  brainsLoading,
  brainDropdownPos,
  isMobileToolbar,
  brainOptions,
  setConfirmBrain,
  setBrainDropdownOpen,
}: {
  effectiveContent: string | null | undefined
  brainButtonRef: RefObject<HTMLButtonElement | null>
  brainDropdownOpen: boolean
  handleBrainDropdownToggle: () => void
  brainsLoading: boolean
  brainDropdownPos: { top: number; left: number; right: number }
  isMobileToolbar: boolean
  brainOptions: BrainOption[]
  setConfirmBrain: (o: BrainOption | null) => void
  setBrainDropdownOpen: Dispatch<SetStateAction<boolean>>
}) {
  if (!effectiveContent) return null

  return (
    <div className="relative">
      <Tooltip label={brainsLoading && brainDropdownOpen ? 'Loading brains...' : 'Add to Brain'} side="top">
        <button
          ref={brainButtonRef}
          type="button"
          onClick={handleBrainDropdownToggle}
          className="btn-icon-bare"
        >
          {brainsLoading && brainDropdownOpen ? (
            <Loader2 className="icon-sm animate-spin" />
          ) : (
            <Brain className="icon-sm" />
          )}
        </button>
      </Tooltip>
      {brainDropdownOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="dropdown-menu-solid dropdown-list-scroll p-spacing-2 z-dropdown fixed w-60"
            style={
              isMobileToolbar
                ? { top: brainDropdownPos.top, right: brainDropdownPos.right }
                : { top: brainDropdownPos.top, left: brainDropdownPos.left }
            }
            data-dropdown="brain-ingest"
          >
            {brainsLoading ? (
              <div className="py-spacing-3 flex items-center justify-center">
                <Loader2 className="icon-sm text-muted-foreground animate-spin" />
              </div>
            ) : brainOptions.length === 0 ? (
              <div className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                No brains available
              </div>
            ) : (
              <div className="space-y-spacing-0">
                {brainOptions.map((option) => {
                  const { label: badgeLabel, className: badgeClass } = brainOptionBadge(option)
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setConfirmBrain(option)
                        setBrainDropdownOpen(false)
                      }}
                      className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle text-muted-foreground hover:text-foreground flex w-full items-center text-left"
                    >
                      <div className="icon-sm shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                      <span
                        className={`badge-glass badge-glass-sm shrink-0 leading-none ${badgeClass}`}
                      >
                        {badgeLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
