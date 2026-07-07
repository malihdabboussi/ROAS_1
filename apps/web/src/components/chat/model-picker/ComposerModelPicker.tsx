'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { isModelStrategyId, MODEL_STRATEGIES } from '@/lib/agents/model-strategies'
import type { ModelReasoningEffort } from '@/lib/chat/chat-model-settings'
import {
  buildModelSettings,
  formatModelRowMeta,
  resolveModelPickerState,
} from '@/lib/chat/composer-model-picker'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'
import {
  partitionModelOptions,
  resolveModelDisplayLabel,
} from '@/lib/chat/subscription-model-options'
import { useWorkspaceSettingsModal } from '@/lib/settings/workspace-settings-modal-context'
import { ComposerModelPickerDropdown } from './composer-model-picker-dropdown'
import { ComposerModelPickerPanels } from './composer-model-picker-panels'
import type {
  ComposerModelEditTooltip,
  ComposerModelHoverTarget,
  ComposerModelPickerProps,
} from './composer-model-picker.types'
import { useComposerModelPickerPositioning } from './use-composer-model-picker-positioning'

export type { ComposerModelPickerValue } from './composer-model-picker.types'

export function ComposerModelPicker({
  modelOptions,
  value,
  onChange,
  disabled = false,
  saving = false,
  triggerClassName,
  renderTrigger,
}: ComposerModelPickerProps) {
  const [open, setOpen] = useState(false)
  const [draftModelId, setDraftModelId] = useState(value.modelId)
  const [draftSettings, setDraftSettings] = useState(value.modelSettings)
  const [contextWindowTokens, setContextWindowTokens] = useState<number | null>(null)
  const [reasoningEffort, setReasoningEffort] = useState<ModelReasoningEffort | null>(null)
  const [fastMode, setFastMode] = useState(false)
  const [modelEditId, setModelEditId] = useState<string | null>(null)
  const [modelHoverTarget, setModelHoverTarget] = useState<ComposerModelHoverTarget | null>(null)
  const [modelEditTooltip, setModelEditTooltip] = useState<ComposerModelEditTooltip | null>(null)
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()

  const closeFloatingSurfaces = useCallback(() => {
    setOpen(false)
    setModelEditId(null)
    setModelHoverTarget(null)
    setModelEditTooltip(null)
  }, [])

  const {
    buttonRef,
    dropdownRef,
    editPanelRef,
    hoverCardRef,
    tooltipRef,
    subscriptionSubmenuRef,
    dropdownPos,
    modelHoverPos,
    modelEditPos,
    positionModelHoverCard,
    positionModelEditPanel,
    showModelEditTooltip,
    zIndexes,
  } = useComposerModelPickerPositioning({
    open,
    modelEditId,
    onOutsideClose: closeFloatingSurfaces,
    setModelEditTooltip,
  })

  const displayModelId = open ? draftModelId : value.modelId
  const displaySettings = open ? draftSettings : value.modelSettings
  const displayState = resolveModelPickerState(displayModelId, displaySettings, modelOptions)
  const activeOption = isModelStrategyId(displayModelId)
    ? undefined
    : modelOptions.find((option) => option.id === displayModelId)
  const { standardModels, subscriptionModels } = useMemo(
    () => partitionModelOptions(modelOptions),
    [modelOptions],
  )
  const activeLabel = isModelStrategyId(displayModelId)
    ? (MODEL_STRATEGIES.find((strategy) => strategy.id === displayModelId)?.label ?? 'Auto')
    : resolveModelDisplayLabel(displayModelId, modelOptions)
  const activeMeta =
    !isModelStrategyId(displayModelId) && activeOption
      ? formatModelRowMeta(activeOption, {
          isSelected: true,
          contextWindowTokens: open ? contextWindowTokens : displayState.contextWindowTokens,
          reasoningEffort: open ? reasoningEffort : displayState.reasoningEffort,
          fastMode: open ? fastMode : displayState.fastMode,
        })
      : null
  const modelEditOption = modelEditId
    ? modelOptions.find((option) => option.id === modelEditId)
    : undefined
  const modelHoverStrategy =
    modelHoverTarget?.kind === 'strategy'
      ? MODEL_STRATEGIES.find((strategy) => strategy.id === modelHoverTarget.id)
      : undefined
  const modelHoverOption =
    modelHoverTarget?.kind === 'model'
      ? modelOptions.find((option) => option.id === modelHoverTarget.id)
      : undefined

  const syncDraftFromValue = useCallback(() => {
    setDraftModelId(value.modelId)
    setDraftSettings(value.modelSettings)
    const resolved = resolveModelPickerState(value.modelId, value.modelSettings, modelOptions)
    setContextWindowTokens(resolved.contextWindowTokens)
    setReasoningEffort(resolved.reasoningEffort)
    setFastMode(resolved.fastMode)
  }, [modelOptions, value.modelId, value.modelSettings])

  useEffect(() => {
    if (!open) syncDraftFromValue()
  }, [open, syncDraftFromValue])

  useEffect(() => {
    if (!activeOption) {
      setContextWindowTokens(null)
      setReasoningEffort(null)
      setFastMode(false)
      return
    }
    setContextWindowTokens((prev) =>
      prev && activeOption.contextOptions.some((option) => option.tokens === prev)
        ? prev
        : (activeOption.contextOptions[0]?.tokens ?? null),
    )
    setReasoningEffort((prev) =>
      prev && activeOption.reasoningLevels.includes(prev)
        ? prev
        : (activeOption.reasoningLevels[0] ?? 'none'),
    )
    setFastMode((prev) => prev && activeOption.speedModes.includes('fast'))
  }, [activeOption])

  const commitSelection = useCallback(
    async (
      nextModelId: string,
      nextState?: {
        contextWindowTokens: number | null
        reasoningEffort: ModelReasoningEffort | null
        fastMode: boolean
      },
    ) => {
      const option = modelOptions.find((row) => row.id === nextModelId)
      const resolved =
        nextState ?? resolveModelPickerState(nextModelId, draftSettings, modelOptions)
      const modelSettings = buildModelSettings({
        modelId: nextModelId,
        selectedOption: option,
        contextWindowTokens: resolved.contextWindowTokens,
        reasoningEffort: resolved.reasoningEffort,
        fastMode: resolved.fastMode,
      })
      await onChange({
        modelId: nextModelId,
        modelSettings: isModelStrategyId(nextModelId) ? null : modelSettings,
      })
    },
    [draftSettings, modelOptions, onChange],
  )

  const openModelEditPanel = useCallback(
    (modelId: string) => {
      setDraftModelId(modelId)
      setModelEditId(modelId)
      setModelHoverTarget(null)
      setModelEditTooltip(null)
      positionModelEditPanel()
    },
    [positionModelEditPanel],
  )

  const selectStrategy = useCallback(
    (strategyId: string) => {
      closeFloatingSurfaces()
      void commitSelection(strategyId)
    },
    [closeFloatingSurfaces, commitSelection],
  )

  const selectSubscriptionModel = useCallback(
    (modelId: string) => {
      const option = modelOptions.find((row) => row.id === modelId)
      if (!option) return
      setDraftModelId(modelId)
      const nextState = resolveModelPickerState(modelId, null, modelOptions)
      setContextWindowTokens(nextState.contextWindowTokens)
      setReasoningEffort(nextState.reasoningEffort)
      setFastMode(nextState.fastMode)
      closeFloatingSurfaces()
      void commitSelection(modelId, nextState)
    },
    [closeFloatingSurfaces, commitSelection, modelOptions],
  )

  const selectStandardModel = useCallback(
    (option: LlmModelOption) => {
      setDraftModelId(option.id)
      const nextState = resolveModelPickerState(option.id, null, modelOptions)
      setContextWindowTokens(nextState.contextWindowTokens)
      setReasoningEffort(nextState.reasoningEffort)
      setFastMode(nextState.fastMode)
      closeFloatingSurfaces()
      void commitSelection(option.id, nextState)
    },
    [closeFloatingSurfaces, commitSelection, modelOptions],
  )

  const updateFastMode = useCallback(
    (checked: boolean) => {
      if (!modelEditOption) return
      setDraftModelId(modelEditOption.id)
      setFastMode(checked)
      void commitSelection(modelEditOption.id, {
        contextWindowTokens,
        reasoningEffort,
        fastMode: checked,
      })
    },
    [commitSelection, contextWindowTokens, modelEditOption, reasoningEffort],
  )

  const updateContextWindowTokens = useCallback(
    (tokens: number) => {
      if (!modelEditOption) return
      setDraftModelId(modelEditOption.id)
      setContextWindowTokens(tokens)
      void commitSelection(modelEditOption.id, {
        contextWindowTokens: tokens,
        reasoningEffort,
        fastMode,
      })
    },
    [commitSelection, fastMode, modelEditOption, reasoningEffort],
  )

  const updateReasoningEffort = useCallback(
    (level: ModelReasoningEffort) => {
      if (!modelEditOption) return
      setDraftModelId(modelEditOption.id)
      setReasoningEffort(level)
      void commitSelection(modelEditOption.id, {
        contextWindowTokens,
        reasoningEffort: level,
        fastMode,
      })
    },
    [commitSelection, contextWindowTokens, fastMode, modelEditOption],
  )

  const openWorkspaceModels = useCallback(() => {
    setOpen(false)
    openWorkspaceSettings('models')
  }, [openWorkspaceSettings])

  const hoverStrategy = useCallback(
    (strategyId: string, rowEl: HTMLElement) => {
      setModelHoverTarget({ kind: 'strategy', id: strategyId })
      positionModelHoverCard(rowEl)
    },
    [positionModelHoverCard],
  )

  const hoverModel = useCallback(
    (modelId: string, rowEl: HTMLElement) => {
      setModelHoverTarget({ kind: 'model', id: modelId })
      positionModelHoverCard(rowEl)
    },
    [positionModelHoverCard],
  )

  const trigger = useMemo(() => {
    if (renderTrigger) {
      return renderTrigger({ label: activeLabel, meta: activeMeta, open, saving })
    }
    return (
      <>
        <span className="typo-caption text-foreground min-w-0 truncate font-medium">
          {activeLabel}
        </span>
        {activeMeta ? (
          <span className="body-4 text-muted-foreground shrink-0">{activeMeta}</span>
        ) : null}
        <ChevronDown className="icon-xs text-muted-foreground shrink-0" aria-hidden />
      </>
    )
  }, [activeLabel, activeMeta, open, renderTrigger, saving])

  if (disabled) {
    return (
      <span className="body-4 text-muted-foreground min-w-0 truncate">
        {activeLabel}
        {activeMeta ? ` ${activeMeta}` : ''}
      </span>
    )
  }

  return (
    <div data-agent-model-dropdown className="relative inline-flex min-w-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={saving}
        disabled={saving}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((current) => !current)
          setModelEditId(null)
          setModelHoverTarget(null)
          setModelEditTooltip(null)
        }}
        className={
          triggerClassName ??
          'gap-spacing-1 hover:bg-hover-subtle inline-flex min-w-0 items-center rounded-full transition-colors disabled:opacity-60'
        }
      >
        {trigger}
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <>
              <ComposerModelPickerDropdown
                dropdownRef={dropdownRef}
                subscriptionSubmenuRef={subscriptionSubmenuRef}
                dropdownPos={dropdownPos}
                zIndex={zIndexes.dropdown}
                draftModelId={draftModelId}
                standardModels={standardModels}
                subscriptionModels={subscriptionModels}
                contextWindowTokens={contextWindowTokens}
                reasoningEffort={reasoningEffort}
                fastMode={fastMode}
                onMouseLeave={() => {
                  if (!modelEditId) setModelHoverTarget(null)
                }}
                onClearHoverCard={() => setModelHoverTarget(null)}
                onHoverStrategy={hoverStrategy}
                onHoverModel={hoverModel}
                onSelectStrategy={selectStrategy}
                onSelectSubscriptionModel={selectSubscriptionModel}
                onSelectStandardModel={selectStandardModel}
                onOpenModelEditPanel={openModelEditPanel}
                onOpenWorkspaceModels={openWorkspaceModels}
              />
              <ComposerModelPickerPanels
                hoverCardRef={hoverCardRef}
                editPanelRef={editPanelRef}
                tooltipRef={tooltipRef}
                modelHoverTarget={modelHoverTarget}
                modelHoverStrategy={modelHoverStrategy}
                modelHoverOption={modelHoverOption}
                modelHoverPos={modelHoverPos}
                modelEditId={modelEditId}
                modelEditOption={modelEditOption}
                modelEditPos={modelEditPos}
                modelEditTooltip={modelEditTooltip}
                draftModelId={draftModelId}
                contextWindowTokens={contextWindowTokens}
                reasoningEffort={reasoningEffort}
                fastMode={fastMode}
                hoverCardZIndex={zIndexes.hoverCard}
                editPanelZIndex={zIndexes.editPanel}
                tooltipZIndex={zIndexes.tooltip}
                onShowModelEditTooltip={showModelEditTooltip}
                onClearModelEditTooltip={() => setModelEditTooltip(null)}
                onFastModeChange={updateFastMode}
                onContextWindowTokensChange={updateContextWindowTokens}
                onReasoningEffortChange={updateReasoningEffort}
              />
            </>,
            document.body,
          )
        : null}
    </div>
  )
}
