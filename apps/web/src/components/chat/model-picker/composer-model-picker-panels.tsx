'use client'

import type { RefObject } from 'react'
import { Check } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import type { ModelReasoningEffort } from '@/lib/chat/chat-model-settings'
import {
  formatModelDefaultReasoning,
  formatModelInfoLine,
  formatModelReasoningSummary,
  formatReasoningLabel,
  isModelEditable,
} from '@/lib/chat/composer-model-picker'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'
import {
  formatSubscriptionModelDisplayLabel,
  isSubscriptionModel,
} from '@/lib/chat/subscription-model-options'
import type { ComposerModelHoverTarget } from './composer-model-picker.types'

interface ComposerModelPickerPanelsProps {
  hoverCardRef: RefObject<HTMLDivElement | null>
  editPanelRef: RefObject<HTMLDivElement | null>
  tooltipRef: RefObject<HTMLDivElement | null>
  modelHoverTarget: ComposerModelHoverTarget | null
  modelHoverStrategy:
    | {
        label: string
        description: string
        textClass: string
      }
    | undefined
  modelHoverOption: LlmModelOption | undefined
  modelHoverPos: { top: number; left: number }
  modelEditId: string | null
  modelEditOption: LlmModelOption | undefined
  modelEditPos: { top: number; left: number }
  modelEditTooltip: { text: string; top: number; left: number } | null
  draftModelId: string
  contextWindowTokens: number | null
  reasoningEffort: ModelReasoningEffort | null
  fastMode: boolean
  hoverCardZIndex: number
  editPanelZIndex: number
  tooltipZIndex: number
  onShowModelEditTooltip: (rowEl: HTMLElement, text: string) => void
  onClearModelEditTooltip: () => void
  onFastModeChange: (checked: boolean) => void
  onContextWindowTokensChange: (tokens: number) => void
  onReasoningEffortChange: (level: ModelReasoningEffort) => void
}

export function ComposerModelPickerPanels({
  hoverCardRef,
  editPanelRef,
  tooltipRef,
  modelHoverTarget,
  modelHoverStrategy,
  modelHoverOption,
  modelHoverPos,
  modelEditId,
  modelEditOption,
  modelEditPos,
  modelEditTooltip,
  draftModelId,
  contextWindowTokens,
  reasoningEffort,
  fastMode,
  hoverCardZIndex,
  editPanelZIndex,
  tooltipZIndex,
  onShowModelEditTooltip,
  onClearModelEditTooltip,
  onFastModeChange,
  onContextWindowTokensChange,
  onReasoningEffortChange,
}: ComposerModelPickerPanelsProps) {
  return (
    <>
      {modelHoverTarget && !modelEditId ? (
        <div
          ref={hoverCardRef}
          className="dropdown-menu-solid px-spacing-3 py-spacing-2 pointer-events-none fixed w-[280px]"
          style={{ top: modelHoverPos.top, left: modelHoverPos.left, zIndex: hoverCardZIndex }}
        >
          {modelHoverStrategy ? (
            <div className="gap-spacing-2 flex flex-col">
              <p className={`body-3 font-semibold ${modelHoverStrategy.textClass}`}>
                {modelHoverStrategy.label}
              </p>
              <p className="body-4 text-muted-foreground">{modelHoverStrategy.description}</p>
              <p className="body-4 text-muted-foreground">
                Vibey chooses the model for this message using the current task, context, and cost
                profile.
              </p>
            </div>
          ) : null}
          {modelHoverOption ? (
            <div className="gap-spacing-2 flex flex-col">
              <p className="body-3 text-foreground font-semibold">
                {isSubscriptionModel(modelHoverOption)
                  ? formatSubscriptionModelDisplayLabel(modelHoverOption)
                  : modelHoverOption.label}
              </p>
              <p className="body-4 text-muted-foreground">
                {formatModelInfoLine(modelHoverOption)}
              </p>
              {formatModelReasoningSummary(modelHoverOption) ? (
                <p className="body-4 text-muted-foreground">
                  {formatModelReasoningSummary(modelHoverOption)}
                </p>
              ) : null}
              {isModelEditable(modelHoverOption) ? (
                <p className="body-4 text-muted-foreground">
                  Use Edit to adjust context size, reasoning effort, and fast mode.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {modelEditOption && modelEditId ? (
        <div
          ref={editPanelRef}
          className="dropdown-menu-solid scrollbar-hide py-spacing-2 fixed max-h-[360px] w-[240px] overflow-y-auto"
          style={{ top: modelEditPos.top, left: modelEditPos.left, zIndex: editPanelZIndex }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="gap-spacing-2 px-spacing-2 flex flex-col">
            <p className="body-3 text-foreground px-spacing-1 font-semibold">
              {modelEditOption.label}
            </p>
            {modelEditOption.speedModes.includes('fast') ? (
              <div
                onMouseEnter={(event) =>
                  onShowModelEditTooltip(
                    event.currentTarget,
                    '2x more expensive, but significantly faster speeds.',
                  )
                }
                onMouseLeave={onClearModelEditTooltip}
                className="rounded-spacing-1 body-4 px-spacing-2 py-spacing-1 text-foreground hover:bg-hover-subtle flex items-center justify-between"
              >
                <span>Fast mode</span>
                <Switch
                  checked={draftModelId === modelEditOption.id && fastMode}
                  onCheckedChange={onFastModeChange}
                />
              </div>
            ) : null}
            {modelEditOption.reasoningLevels.includes('none') &&
            modelEditOption.reasoningLevels.some((level) => level !== 'none') ? (
              <div
                onMouseEnter={(event) =>
                  onShowModelEditTooltip(
                    event.currentTarget,
                    'Turn extended thinking on or off for this model.',
                  )
                }
                onMouseLeave={onClearModelEditTooltip}
                className="rounded-spacing-1 body-4 px-spacing-2 py-spacing-1 text-foreground hover:bg-hover-subtle flex items-center justify-between"
              >
                <span>Thinking</span>
                <Switch
                  checked={
                    draftModelId === modelEditOption.id &&
                    reasoningEffort !== null &&
                    reasoningEffort !== 'none'
                  }
                  onCheckedChange={(checked) =>
                    onReasoningEffortChange(
                      checked
                        ? (formatModelDefaultReasoning(modelEditOption) ?? 'medium')
                        : 'none',
                    )
                  }
                />
              </div>
            ) : null}
            {modelEditOption.contextOptions.length > 1 ? (
              <div className="gap-spacing-1 flex flex-col">
                <p className="body-4 text-muted-foreground px-spacing-1">Context</p>
                {modelEditOption.contextOptions.map((contextOption) => {
                  const isSelectedContext =
                    draftModelId === modelEditOption.id &&
                    contextWindowTokens === contextOption.tokens
                  return (
                    <button
                      key={contextOption.tokens}
                      type="button"
                      onClick={() => onContextWindowTokensChange(contextOption.tokens)}
                      onMouseEnter={(event) =>
                        onShowModelEditTooltip(
                          event.currentTarget,
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
                      draftModelId === modelEditOption.id && reasoningEffort === level
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => onReasoningEffortChange(level)}
                        onMouseEnter={(event) =>
                          onShowModelEditTooltip(
                            event.currentTarget,
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
                          {isSelectedReasoning ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                        </span>
                      </button>
                    )
                  })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {modelEditId && modelEditTooltip ? (
        <div
          ref={tooltipRef}
          className="dropdown-menu-solid px-spacing-3 py-spacing-2 pointer-events-none fixed w-[220px]"
          style={{
            top: modelEditTooltip.top,
            left: modelEditTooltip.left,
            zIndex: tooltipZIndex,
          }}
        >
          <p className="body-4 text-muted-foreground">{modelEditTooltip.text}</p>
        </div>
      ) : null}
    </>
  )
}
