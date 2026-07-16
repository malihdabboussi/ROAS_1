'use client'

import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import type {
  LlmModelOption,
  ModelReasoningEffort,
} from '@/features/studio/services/chat.service'
import {
  MODEL_STRATEGIES,
  formatModelDefaultReasoning,
  formatReasoningLabel,
  type ModelHoverTarget,
} from './chat-input-model-settings'

interface ChatInputModelPickerPanelsProps {
  portalTarget: HTMLElement
  modelDropdownOpen: boolean
  modelHoverTarget: ModelHoverTarget | null
  modelHoverPos: { top: number; left: number }
  modelEditId: string | null
  modelEditOption: LlmModelOption | undefined
  modelEditPos: { top: number; left: number }
  modelEditTooltip: { text: string; top: number; left: number } | null
  activeComposerModel: string
  selectedContextWindowTokens: number | null
  selectedReasoningEffort: ModelReasoningEffort | null
  fastModeEnabled: boolean
  modelHoverCardRef: React.RefObject<HTMLDivElement | null>
  modelEditPanelRef: React.RefObject<HTMLDivElement | null>
  onSelectComposerModel: (modelId: string) => void
  onSetFastModeEnabled: (checked: boolean) => void
  onSetReasoningEffort: (effort: ModelReasoningEffort | null) => void
  onSetContextWindowTokens: (tokens: number) => void
  onShowModelEditTooltip: (rowEl: HTMLElement, text: string) => void
  onClearModelEditTooltip: () => void
}

export function ChatInputModelPickerPanels({
  portalTarget,
  modelDropdownOpen,
  modelHoverTarget,
  modelHoverPos,
  modelEditId,
  modelEditOption,
  modelEditPos,
  modelEditTooltip,
  activeComposerModel,
  selectedContextWindowTokens,
  selectedReasoningEffort,
  fastModeEnabled,
  modelHoverCardRef,
  modelEditPanelRef,
  onSelectComposerModel,
  onSetFastModeEnabled,
  onSetReasoningEffort,
  onSetContextWindowTokens,
  onShowModelEditTooltip,
  onClearModelEditTooltip,
}: ChatInputModelPickerPanelsProps) {
  const modelHoverStrategy =
    modelHoverTarget?.kind === 'strategy'
      ? MODEL_STRATEGIES.find((strategy) => strategy.id === modelHoverTarget.id)
      : undefined

  return (
    <>
      {modelDropdownOpen && modelHoverTarget && !modelEditId
        ? createPortal(
            <div
              ref={modelHoverCardRef}
              className="dropdown-menu-solid z-dropdown px-spacing-3 py-spacing-2 pointer-events-none fixed w-72"
              style={{ top: modelHoverPos.top, left: modelHoverPos.left }}
            >
              {modelHoverStrategy ? (
                <div className="gap-spacing-2 flex flex-col">
                  <p className={`body-3 font-semibold ${modelHoverStrategy.textClass}`}>
                    {modelHoverStrategy.label}
                  </p>
                  <p className="body-4 text-muted-foreground">{modelHoverStrategy.description}</p>
                  <p className="body-4 text-muted-foreground">
                    ROAS chooses the model for this message using the current task, context, and
                    cost profile.
                  </p>
                </div>
              ) : null}
              {modelHoverTarget?.kind === 'cortex' ? (
                <div className="gap-spacing-2 flex flex-col">
                  <p className="body-3 text-foreground font-semibold">Cortex Max</p>
                  <p className="body-4 text-muted-foreground">
                    Gives ROAS full access to your Brain memory while it works, for richer and more
                    personal answers.
                  </p>
                  <p className="body-4 text-muted-foreground">
                    Turn off for lighter, faster replies that skip deep memory context.
                  </p>
                </div>
              ) : null}
            </div>,
            portalTarget,
          )
        : null}

      {modelDropdownOpen && modelEditOption
        ? createPortal(
            <div
              ref={modelEditPanelRef}
              className="dropdown-menu-solid scrollbar-hide z-dropdown py-spacing-2 fixed max-h-96 w-60 overflow-y-auto"
              style={{ top: modelEditPos.top, left: modelEditPos.left }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="gap-spacing-2 px-spacing-2 flex flex-col">
                <p className="body-3 text-foreground px-spacing-1 font-semibold">
                  {modelEditOption.label}
                </p>
                {modelEditOption.speedModes.includes('fast') ? (
                  <div
                    onMouseEnter={(e) =>
                      onShowModelEditTooltip(
                        e.currentTarget,
                        '2x more expensive, but significantly faster speeds.',
                      )
                    }
                    onMouseLeave={onClearModelEditTooltip}
                    className="rounded-spacing-1 body-4 px-spacing-2 py-spacing-1 text-foreground hover:bg-hover-subtle flex items-center justify-between"
                  >
                    <span>Fast mode</span>
                    <Switch
                      checked={activeComposerModel === modelEditOption.id && fastModeEnabled}
                      onCheckedChange={(checked) => {
                        onSelectComposerModel(modelEditOption.id)
                        onSetFastModeEnabled(checked)
                      }}
                    />
                  </div>
                ) : null}
                {modelEditOption.reasoningLevels.includes('none') &&
                modelEditOption.reasoningLevels.some((level) => level !== 'none') ? (
                  <div
                    onMouseEnter={(e) =>
                      onShowModelEditTooltip(
                        e.currentTarget,
                        'Turn extended thinking on or off for this model.',
                      )
                    }
                    onMouseLeave={onClearModelEditTooltip}
                    className="rounded-spacing-1 body-4 px-spacing-2 py-spacing-1 text-foreground hover:bg-hover-subtle flex items-center justify-between"
                  >
                    <span>Thinking</span>
                    <Switch
                      checked={
                        activeComposerModel === modelEditOption.id &&
                        selectedReasoningEffort !== null &&
                        selectedReasoningEffort !== 'none'
                      }
                      onCheckedChange={(checked) => {
                        onSelectComposerModel(modelEditOption.id)
                        onSetReasoningEffort(
                          checked
                            ? (formatModelDefaultReasoning(modelEditOption) ?? 'medium')
                            : 'none',
                        )
                      }}
                    />
                  </div>
                ) : null}
                {modelEditOption.contextOptions.length > 1 ? (
                  <div className="gap-spacing-1 flex flex-col">
                    <p className="body-4 text-muted-foreground px-spacing-1">Context</p>
                    {modelEditOption.contextOptions.map((contextOption) => {
                      const isSelectedContext =
                        activeComposerModel === modelEditOption.id &&
                        selectedContextWindowTokens === contextOption.tokens
                      return (
                        <button
                          key={contextOption.tokens}
                          type="button"
                          onClick={() => {
                            onSelectComposerModel(modelEditOption.id)
                            onSetContextWindowTokens(contextOption.tokens)
                          }}
                          onMouseEnter={(e) =>
                            onShowModelEditTooltip(
                              e.currentTarget,
                              'Context size the model has available.',
                            )
                          }
                          onMouseLeave={onClearModelEditTooltip}
                          className={`rounded-spacing-1 body-4 px-spacing-2 py-spacing-1 text-foreground hover:bg-hover-subtle flex items-center justify-between text-left ${
                            isSelectedContext ? 'bg-primary/10' : ''
                          }`}
                        >
                          <span>{contextOption.label}</span>
                          <span className="gap-spacing-1 flex items-center">
                            {contextOption.pricingProfile === 'extended' ? (
                              <span className="text-warning">More cost</span>
                            ) : null}
                            {isSelectedContext ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
                {modelEditOption.reasoningLevels.filter((level) => level !== 'none').length > 0 ? (
                  <div className="gap-spacing-1 flex flex-col">
                    <p className="body-4 text-muted-foreground px-spacing-1">Reasoning</p>
                    {modelEditOption.reasoningLevels
                      .filter((level) => level !== 'none')
                      .map((level) => {
                        const isSelectedReasoning =
                          activeComposerModel === modelEditOption.id &&
                          selectedReasoningEffort === level
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => {
                              onSelectComposerModel(modelEditOption.id)
                              onSetReasoningEffort(level)
                            }}
                            onMouseEnter={(e) =>
                              onShowModelEditTooltip(
                                e.currentTarget,
                                'Effort the model uses to generate its response.',
                              )
                            }
                            onMouseLeave={onClearModelEditTooltip}
                            className={`rounded-spacing-1 body-4 px-spacing-2 py-spacing-1 text-foreground hover:bg-hover-subtle flex items-center justify-between text-left ${
                              isSelectedReasoning ? 'bg-primary/10' : ''
                            }`}
                          >
                            <span>{formatReasoningLabel(level)}</span>
                            <span className="gap-spacing-1 flex items-center">
                              {level === 'high' || level === 'xhigh' || level === 'max' ? (
                                <span className="text-warning">More cost</span>
                              ) : null}
                              {isSelectedReasoning ? (
                                <Check className="h-3.5 w-3.5 shrink-0" />
                              ) : null}
                            </span>
                          </button>
                        )
                      })}
                  </div>
                ) : null}
              </div>
            </div>,
            portalTarget,
          )
        : null}

      {modelDropdownOpen && modelEditId && modelEditTooltip
        ? createPortal(
            <div
              className="dropdown-menu-solid z-dropdown px-spacing-3 py-spacing-2 pointer-events-none fixed w-56"
              style={{ top: modelEditTooltip.top, left: modelEditTooltip.left }}
            >
              <p className="body-4 text-muted-foreground">{modelEditTooltip.text}</p>
            </div>,
            portalTarget,
          )
        : null}
    </>
  )
}
