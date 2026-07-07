'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronRight } from 'lucide-react'
import type { ModelReasoningEffort } from '@/lib/chat/chat-model-settings'
import {
  formatModelRowMeta,
  isModelEditable,
} from '@/lib/chat/composer-model-picker'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'
import {
  formatSubscriptionModelDisplayLabel,
  SUBSCRIPTION_MODELS_MENU_LABEL,
} from '@/lib/chat/subscription-model-options'

const VIEWPORT_MARGIN = 8
const SUBMENU_WIDTH = 240
const SUBMENU_HEIGHT_CAP = 360
const SUBMENU_HOVER_CLOSE_MS = 150

interface ComposerSubscriptionModelsSubmenuProps {
  models: LlmModelOption[]
  selectedModelId: string
  onSelect: (modelId: string) => void
  mainDropdownRef: React.RefObject<HTMLDivElement | null>
  submenuRef?: React.RefObject<HTMLDivElement | null>
  zIndex?: number
  contextWindowTokens?: number | null
  reasoningEffort?: ModelReasoningEffort | null
  fastMode?: boolean
  onOpenModelEditPanel?: (modelId: string) => void
  onClearHoverCard?: () => void
}

export function ComposerSubscriptionModelsSubmenu({
  models,
  selectedModelId,
  onSelect,
  mainDropdownRef,
  submenuRef: externalSubmenuRef,
  zIndex = 100000,
  contextWindowTokens = null,
  reasoningEffort = null,
  fastMode = false,
  onOpenModelEditPanel,
  onClearHoverCard,
}: ComposerSubscriptionModelsSubmenuProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const internalSubmenuRef = useRef<HTMLDivElement>(null)
  const submenuRef = externalSubmenuRef ?? internalSubmenuRef
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const selectedSubscriptionModel = models.some((model) => model.id === selectedModelId)

  const clearCloseTimeout = useCallback(() => {
    if (!closeTimeoutRef.current) return
    clearTimeout(closeTimeoutRef.current)
    closeTimeoutRef.current = null
  }, [])

  const scheduleClose = useCallback(() => {
    clearCloseTimeout()
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false)
      closeTimeoutRef.current = null
    }, SUBMENU_HOVER_CLOSE_MS)
  }, [clearCloseTimeout])

  const positionSubmenu = useCallback(() => {
    if (!rowRef.current || !mainDropdownRef.current) return
    const rowRect = rowRef.current.getBoundingClientRect()
    const mainRect = mainDropdownRef.current.getBoundingClientRect()
    const gap = 4
    const rightEdge = mainRect.right + gap
    const fitsRight = rightEdge + SUBMENU_WIDTH + VIEWPORT_MARGIN <= window.innerWidth
    const left = fitsRight
      ? rightEdge
      : Math.max(VIEWPORT_MARGIN, mainRect.left - SUBMENU_WIDTH - gap)
    const maxTop = window.innerHeight - SUBMENU_HEIGHT_CAP - VIEWPORT_MARGIN
    const top = Math.min(Math.max(VIEWPORT_MARGIN, rowRect.top), maxTop)
    setPos({ top, left })
  }, [mainDropdownRef])

  useLayoutEffect(() => {
    if (!open) return
    positionSubmenu()
  }, [open, positionSubmenu])

  useEffect(() => {
    if (!open) return
    const reposition = () => positionSubmenu()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, positionSubmenu])

  useEffect(() => () => clearCloseTimeout(), [clearCloseTimeout])

  if (models.length === 0) return null

  return (
    <div
      ref={rowRef}
      className="relative"
      onMouseEnter={() => {
        onClearHoverCard?.()
        clearCloseTimeout()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="rounded-spacing-1 body-4 px-spacing-2 py-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center justify-between text-left transition-all"
      >
        <span>{SUBSCRIPTION_MODELS_MENU_LABEL}</span>
        {selectedSubscriptionModel ? (
          <Check className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={submenuRef}
              data-model-dropdown-portal
              className="dropdown-menu-solid scrollbar-hide py-spacing-1 fixed max-h-[360px] w-[240px] overflow-y-auto"
              style={{ top: pos.top, left: pos.left, zIndex: zIndex + 1 }}
              onMouseDown={(event) => event.stopPropagation()}
              onMouseEnter={() => {
                onClearHoverCard?.()
                clearCloseTimeout()
              }}
              onMouseLeave={scheduleClose}
            >
              <div className="px-spacing-2 py-spacing-1">
                {models.map((option) => {
                  const isSelected = selectedModelId === option.id
                  const editable = onOpenModelEditPanel ? isModelEditable(option) : false
                  const rowMeta = formatModelRowMeta(option, {
                    isSelected,
                    contextWindowTokens: isSelected ? contextWindowTokens : null,
                    reasoningEffort: isSelected ? reasoningEffort : null,
                    fastMode: isSelected && fastMode,
                  })
                  return (
                    <div
                      key={option.id}
                      className={`group/model-row rounded-spacing-1 body-4 flex w-full items-center text-left transition-all ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-hover-subtle'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(option.id)}
                        className="px-spacing-2 py-spacing-1 gap-spacing-1 flex min-w-0 flex-1 items-center text-left"
                      >
                        <span className="text-foreground truncate">
                          {formatSubscriptionModelDisplayLabel(option)}
                        </span>
                        {rowMeta ? (
                          <span className="body-4 text-muted-foreground shrink-0">{rowMeta}</span>
                        ) : null}
                      </button>
                      <span className="px-spacing-1 py-spacing-1 gap-spacing-1 flex shrink-0 items-center">
                        {editable ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              onOpenModelEditPanel?.(option.id)
                            }}
                            className="body-4 text-muted-foreground hover:text-foreground hidden group-hover/model-row:inline"
                          >
                            Edit
                          </button>
                        ) : null}
                        {isSelected ? (
                          <Check className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <span className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
