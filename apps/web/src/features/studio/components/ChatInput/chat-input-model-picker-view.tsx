'use client'

import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { Tooltip } from '@/components/ui/tooltip'
import type {
  LlmModelOption,
  ModelReasoningEffort,
} from '@/features/studio/services/chat.service'
import { ComposerSubscriptionModelsSubmenu } from '@/components/chat/model-picker/ComposerSubscriptionModelsSubmenu'
import {
  MODEL_STRATEGIES,
  formatModelRowMeta,
  isModelEditable,
  type ModelHoverTarget,
} from './chat-input-model-settings'
import { ChatInputModelPickerPanels } from './chat-input-model-picker-panels'

export interface ChatInputModelPickerViewProps {
  activeComposerModel: string
  activeComposerModelLabel: string
  activeComposerDisplayMeta: string | null
  cortexMaxEnabled: boolean
  standardModels: LlmModelOption[]
  subscriptionModels: LlmModelOption[]
  selectedContextWindowTokens: number | null
  selectedReasoningEffort: ModelReasoningEffort | null
  fastModeEnabled: boolean
  modelDropdownOpen: boolean
  modelDropdownPos: { top: number; left: number }
  modelHoverTarget: ModelHoverTarget | null
  modelHoverPos: { top: number; left: number }
  modelEditId: string | null
  modelEditOption: LlmModelOption | undefined
  modelEditPos: { top: number; left: number }
  modelEditTooltip: { text: string; top: number; left: number } | null
  modelButtonRef: React.RefObject<HTMLButtonElement | null>
  modelDropdownRef: React.RefObject<HTMLDivElement | null>
  subscriptionSubmenuRef: React.RefObject<HTMLDivElement | null>
  modelHoverCardRef: React.RefObject<HTMLDivElement | null>
  modelEditPanelRef: React.RefObject<HTMLDivElement | null>
  portalTargetRef?: React.RefObject<HTMLElement | null>
  onToggleDropdown: () => void
  onCloseDropdown: () => void
  onSelectComposerModel: (modelId: string) => void
  onSetHoverTarget: (target: ModelHoverTarget | null) => void
  onPositionHoverCard: (rowEl: HTMLElement) => void
  onOpenModelEditPanel: (modelId: string) => void
  onOpenWorkspaceModels: () => void
  onCortexMaxChange: (checked: boolean) => void
  onSetFastModeEnabled: (checked: boolean) => void
  onSetReasoningEffort: (effort: ModelReasoningEffort | null) => void
  onSetContextWindowTokens: (tokens: number) => void
  onShowModelEditTooltip: (rowEl: HTMLElement, text: string) => void
  onClearModelEditTooltip: () => void
}

export function ChatInputModelPickerView({
  activeComposerModel,
  activeComposerModelLabel,
  activeComposerDisplayMeta,
  cortexMaxEnabled,
  standardModels,
  subscriptionModels,
  selectedContextWindowTokens,
  selectedReasoningEffort,
  fastModeEnabled,
  modelDropdownOpen,
  modelDropdownPos,
  modelHoverTarget,
  modelHoverPos,
  modelEditId,
  modelEditOption,
  modelEditPos,
  modelEditTooltip,
  modelButtonRef,
  modelDropdownRef,
  subscriptionSubmenuRef,
  modelHoverCardRef,
  modelEditPanelRef,
  portalTargetRef,
  onToggleDropdown,
  onCloseDropdown,
  onSelectComposerModel,
  onSetHoverTarget,
  onPositionHoverCard,
  onOpenModelEditPanel,
  onOpenWorkspaceModels,
  onCortexMaxChange,
  onSetFastModeEnabled,
  onSetReasoningEffort,
  onSetContextWindowTokens,
  onShowModelEditTooltip,
  onClearModelEditTooltip,
}: ChatInputModelPickerViewProps) {
  const portalTarget =
    portalTargetRef?.current ?? (typeof document === 'undefined' ? null : document.body)

  return (
    <div className="relative">
      <Tooltip label="Model strategy">
        <button
          ref={modelButtonRef}
          type="button"
          onClick={() => {
            onToggleDropdown()
          }}
          className="text-muted-foreground hover:text-foreground flex h-8 items-center gap-1 rounded-full px-2 transition-colors"
        >
          <span className="typo-caption text-foreground min-w-0 truncate font-medium">
            {activeComposerModelLabel}
          </span>
          {activeComposerDisplayMeta ? (
            <span className="typo-caption text-muted-foreground shrink-0">
              {activeComposerDisplayMeta}
            </span>
          ) : null}
          <ChevronDown className="h-3 w-3" />
        </button>
      </Tooltip>

      {modelDropdownOpen && portalTarget
        ? createPortal(
            <div
              ref={modelDropdownRef}
              className="dropdown-menu-solid scrollbar-hide z-dropdown py-spacing-1 fixed max-h-96 w-60 overflow-y-auto"
              style={{ top: modelDropdownPos.top, left: modelDropdownPos.left }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseLeave={() => {
                if (!modelEditId) onSetHoverTarget(null)
              }}
            >
              <div className="px-spacing-2 py-spacing-1">
                <div
                  onMouseEnter={(e) => {
                    onSetHoverTarget({ kind: 'cortex' })
                    onPositionHoverCard(e.currentTarget)
                  }}
                  className="rounded-spacing-1 body-4 px-spacing-2 py-spacing-1 text-foreground hover:bg-hover-subtle flex w-full items-center justify-between"
                >
                  <span>Cortex Max</span>
                  <Switch checked={cortexMaxEnabled} onCheckedChange={onCortexMaxChange} />
                </div>
                <div className="border-border my-spacing-1 border-t" />
                {MODEL_STRATEGIES.map((strategy) => {
                  const isSelected = activeComposerModel === strategy.id
                  return (
                    <button
                      key={strategy.id}
                      type="button"
                      onMouseEnter={(e) => {
                        onSetHoverTarget({ kind: 'strategy', id: strategy.id })
                        onPositionHoverCard(e.currentTarget)
                      }}
                      onClick={() => {
                        onSelectComposerModel(strategy.id)
                        onCloseDropdown()
                      }}
                      className={`rounded-spacing-1 px-spacing-2 py-spacing-1 body-4 gap-spacing-2 hover:bg-hover-subtle flex w-full items-center justify-between text-left transition-all ${strategy.textClass}`}
                    >
                      <span className="min-w-0 truncate font-medium">{strategy.label}</span>
                      {isSelected ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : null}
                    </button>
                  )
                })}
                {subscriptionModels.length > 0 ? (
                  <ComposerSubscriptionModelsSubmenu
                    models={subscriptionModels}
                    selectedModelId={activeComposerModel}
                    mainDropdownRef={modelDropdownRef}
                    submenuRef={subscriptionSubmenuRef}
                    contextWindowTokens={selectedContextWindowTokens}
                    reasoningEffort={selectedReasoningEffort}
                    fastMode={fastModeEnabled}
                    onOpenModelEditPanel={onOpenModelEditPanel}
                    onClearHoverCard={() => onSetHoverTarget(null)}
                    onSelect={(modelId) => {
                      onSelectComposerModel(modelId)
                      onCloseDropdown()
                    }}
                  />
                ) : null}
                <div className="border-border my-spacing-1 border-t" />
                {standardModels.map((option) => {
                  const isSelected = activeComposerModel === option.id
                  const editable = isModelEditable(option)
                  const rowMeta = formatModelRowMeta(option, {
                    isSelected,
                    contextWindowTokens: isSelected ? selectedContextWindowTokens : null,
                    reasoningEffort: isSelected ? selectedReasoningEffort : null,
                    fastMode: isSelected && fastModeEnabled,
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
                        onClick={() => {
                          onSelectComposerModel(option.id)
                          onCloseDropdown()
                        }}
                        className="px-spacing-2 py-spacing-1 gap-spacing-1 flex min-w-0 flex-1 items-center text-left"
                      >
                        <span className="text-foreground truncate">{option.label}</span>
                        {rowMeta ? (
                          <span className="body-4 text-muted-foreground shrink-0">{rowMeta}</span>
                        ) : null}
                      </button>
                      <span className="px-spacing-1 py-spacing-1 gap-spacing-1 flex shrink-0 items-center">
                        {editable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenModelEditPanel(option.id)
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
                <div className="border-border my-spacing-1 border-t" />
                <button
                  type="button"
                  onClick={() => {
                    onCloseDropdown()
                    onOpenWorkspaceModels()
                  }}
                  className="rounded-spacing-1 body-4 px-spacing-2 py-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center justify-between text-left transition-all"
                >
                  <span>Add Models</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>
            </div>,
            portalTarget,
          )
        : null}

      {portalTarget ? (
        <ChatInputModelPickerPanels
          portalTarget={portalTarget}
          modelDropdownOpen={modelDropdownOpen}
          modelHoverTarget={modelHoverTarget}
          modelHoverPos={modelHoverPos}
          modelEditId={modelEditId}
          modelEditOption={modelEditOption}
          modelEditPos={modelEditPos}
          modelEditTooltip={modelEditTooltip}
          activeComposerModel={activeComposerModel}
          selectedContextWindowTokens={selectedContextWindowTokens}
          selectedReasoningEffort={selectedReasoningEffort}
          fastModeEnabled={fastModeEnabled}
          modelHoverCardRef={modelHoverCardRef}
          modelEditPanelRef={modelEditPanelRef}
          onSelectComposerModel={onSelectComposerModel}
          onSetFastModeEnabled={onSetFastModeEnabled}
          onSetReasoningEffort={onSetReasoningEffort}
          onSetContextWindowTokens={onSetContextWindowTokens}
          onShowModelEditTooltip={onShowModelEditTooltip}
          onClearModelEditTooltip={onClearModelEditTooltip}
        />
      ) : null}
    </div>
  )
}
