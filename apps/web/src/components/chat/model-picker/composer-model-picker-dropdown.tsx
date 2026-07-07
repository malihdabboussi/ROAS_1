'use client'

import type { RefObject } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { MODEL_STRATEGIES } from '@/lib/agents/model-strategies'
import type { ModelReasoningEffort } from '@/lib/chat/chat-model-settings'
import {
  formatModelRowMeta,
  isModelEditable,
} from '@/lib/chat/composer-model-picker'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'
import { ComposerSubscriptionModelsSubmenu } from './ComposerSubscriptionModelsSubmenu'

interface ComposerModelPickerDropdownProps {
  dropdownRef: RefObject<HTMLDivElement | null>
  subscriptionSubmenuRef: RefObject<HTMLDivElement | null>
  dropdownPos: { top: number; left: number }
  zIndex: number
  draftModelId: string
  standardModels: LlmModelOption[]
  subscriptionModels: LlmModelOption[]
  contextWindowTokens: number | null
  reasoningEffort: ModelReasoningEffort | null
  fastMode: boolean
  onMouseLeave: () => void
  onClearHoverCard: () => void
  onHoverStrategy: (strategyId: string, rowEl: HTMLElement) => void
  onHoverModel: (modelId: string, rowEl: HTMLElement) => void
  onSelectStrategy: (strategyId: string) => void
  onSelectSubscriptionModel: (modelId: string) => void
  onSelectStandardModel: (option: LlmModelOption) => void
  onOpenModelEditPanel: (modelId: string) => void
  onOpenWorkspaceModels: () => void
}

export function ComposerModelPickerDropdown({
  dropdownRef,
  subscriptionSubmenuRef,
  dropdownPos,
  zIndex,
  draftModelId,
  standardModels,
  subscriptionModels,
  contextWindowTokens,
  reasoningEffort,
  fastMode,
  onMouseLeave,
  onClearHoverCard,
  onHoverStrategy,
  onHoverModel,
  onSelectStrategy,
  onSelectSubscriptionModel,
  onSelectStandardModel,
  onOpenModelEditPanel,
  onOpenWorkspaceModels,
}: ComposerModelPickerDropdownProps) {
  return (
    <div
      ref={dropdownRef}
      className="dropdown-menu-solid scrollbar-hide py-spacing-1 fixed max-h-[360px] w-[240px] overflow-y-auto"
      style={{ top: dropdownPos.top, left: dropdownPos.left, zIndex }}
      onMouseDown={(event) => event.stopPropagation()}
      onMouseLeave={onMouseLeave}
    >
      <div className="px-spacing-2 py-spacing-1">
        {MODEL_STRATEGIES.map((strategy) => {
          const isSelected = draftModelId === strategy.id
          return (
            <button
              key={strategy.id}
              type="button"
              onMouseEnter={(event) => onHoverStrategy(strategy.id, event.currentTarget)}
              onClick={() => onSelectStrategy(strategy.id)}
              className={`rounded-spacing-1 px-spacing-2 py-spacing-1 body-4 gap-spacing-2 hover:bg-hover-subtle flex w-full items-center justify-between text-left transition-all ${strategy.textClass}`}
            >
              <span className="min-w-0 truncate font-medium">{strategy.label}</span>
              {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          )
        })}
        {subscriptionModels.length > 0 ? (
          <ComposerSubscriptionModelsSubmenu
            models={subscriptionModels}
            selectedModelId={draftModelId}
            mainDropdownRef={dropdownRef}
            submenuRef={subscriptionSubmenuRef}
            zIndex={zIndex}
            contextWindowTokens={contextWindowTokens}
            reasoningEffort={reasoningEffort}
            fastMode={fastMode}
            onOpenModelEditPanel={onOpenModelEditPanel}
            onClearHoverCard={onClearHoverCard}
            onSelect={onSelectSubscriptionModel}
          />
        ) : null}
        <div className="border-border my-spacing-1 border-t" />
        {standardModels.map((option) => {
          const isSelected = draftModelId === option.id
          const editable = isModelEditable(option)
          const rowMeta = formatModelRowMeta(option, {
            isSelected,
            contextWindowTokens: isSelected ? contextWindowTokens : null,
            reasoningEffort: isSelected ? reasoningEffort : null,
            fastMode: isSelected && fastMode,
          })
          return (
            <div
              key={option.id}
              onMouseEnter={(event) => onHoverModel(option.id, event.currentTarget)}
              className={`group/model-row rounded-spacing-1 body-4 flex w-full items-center text-left transition-all ${
                isSelected ? 'bg-primary/10' : 'hover:bg-hover-subtle'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectStandardModel(option)}
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
                    onClick={(event) => {
                      event.stopPropagation()
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
          onMouseEnter={onClearHoverCard}
          onClick={onOpenWorkspaceModels}
          className="rounded-spacing-1 body-4 px-spacing-2 py-spacing-1 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center justify-between text-left transition-all"
        >
          <span>Add Models</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>
    </div>
  )
}
