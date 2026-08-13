'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  persistConversationModelPrefs,
  type ChatModelSettings,
  type LlmModelOption,
  type ModelReasoningEffort,
} from '@/features/studio/services/chat.service'
import { resolveModelDisplayLabel } from '../../lib/subscription-model-options'
import {
  applyComposerModelSettings,
  buildModelSettings,
  findContextOption,
  formatModelRowMeta,
  isModelStrategyId,
  MODEL_STRATEGIES,
  serializeComposerModelPrefs,
  type ComposerModelPrefs,
} from './chat-input-model-settings'

let sessionComposerModelPrefs: ComposerModelPrefs | null = null

export function resetChatInputModelPrefsForTests() {
  sessionComposerModelPrefs = null
}

interface UseChatInputModelPrefsOptions {
  conversationId: string | null
  defaultModel: string | null
  defaultModelSettings: ChatModelSettings | null
  campaignModelStrategy: string | null
  modelOptions: LlmModelOption[]
  persistConversationPrefs?: (
    conversationId: string,
    model: string,
    settings: ChatModelSettings | null,
  ) => Promise<unknown>
  persistDelayMs?: number
}

export function useChatInputModelPrefs({
  conversationId,
  defaultModel,
  defaultModelSettings,
  campaignModelStrategy,
  modelOptions,
  persistConversationPrefs = persistConversationModelPrefs,
  persistDelayMs = 600,
}: UseChatInputModelPrefsOptions) {
  const initialSessionPrefs = sessionComposerModelPrefs
  const [selectedComposerModel, setSelectedComposerModel] = useState<string | null>(
    () => defaultModel ?? initialSessionPrefs?.model ?? null,
  )
  const userSelectedComposerModelRef = useRef(false)
  const hydratedComposerConversationRef = useRef<string | null>(conversationId)
  const hydratedDefaultsRef = useRef(
    serializeComposerModelPrefs(defaultModel, defaultModelSettings),
  )
  const selectComposerModel = useCallback((modelId: string) => {
    userSelectedComposerModelRef.current = true
    setSelectedComposerModel(modelId)
  }, [])
  const [selectedContextWindowTokens, setSelectedContextWindowTokens] = useState<number | null>(
    () =>
      defaultModelSettings?.context_window_tokens ??
      initialSessionPrefs?.contextWindowTokens ??
      null,
  )
  const [selectedReasoningEffort, setSelectedReasoningEffort] =
    useState<ModelReasoningEffort | null>(
      () => defaultModelSettings?.reasoning_effort ?? initialSessionPrefs?.reasoningEffort ?? null,
    )
  const [fastModeEnabled, setFastModeEnabled] = useState(
    () => defaultModelSettings?.speed_mode === 'fast' || initialSessionPrefs?.fastMode === true,
  )
  const [cortexMaxEnabled, setCortexMaxEnabled] = useState(
    () => defaultModelSettings?.cortex_max ?? initialSessionPrefs?.cortexMax ?? true,
  )

  useEffect(() => {
    const conversationChanged = hydratedComposerConversationRef.current !== conversationId
    const defaultsSnapshot = serializeComposerModelPrefs(defaultModel, defaultModelSettings)
    const defaultsChanged = hydratedDefaultsRef.current !== defaultsSnapshot
    if (!conversationChanged && !defaultsChanged) return

    hydratedDefaultsRef.current = defaultsSnapshot
    if (conversationChanged) {
      hydratedComposerConversationRef.current = conversationId
      userSelectedComposerModelRef.current = false
    }

    const canHydrateFromDefault =
      conversationChanged ||
      !userSelectedComposerModelRef.current ||
      selectedComposerModel === defaultModel
    if (!canHydrateFromDefault) return

    if (defaultModel) {
      const defaultContextWindow = defaultModelSettings?.context_window_tokens ?? null
      const defaultReasoningEffort = defaultModelSettings?.reasoning_effort ?? null
      const defaultFastMode = defaultModelSettings?.speed_mode === 'fast'
      const defaultCortexMax = defaultModelSettings?.cortex_max ?? true
      if (
        selectedComposerModel === defaultModel &&
        selectedContextWindowTokens === defaultContextWindow &&
        selectedReasoningEffort === defaultReasoningEffort &&
        fastModeEnabled === defaultFastMode &&
        cortexMaxEnabled === defaultCortexMax
      ) {
        return
      }
      setSelectedComposerModel(defaultModel)
      applyComposerModelSettings(
        defaultModelSettings,
        setSelectedContextWindowTokens,
        setSelectedReasoningEffort,
        setFastModeEnabled,
        setCortexMaxEnabled,
      )
      return
    }

    if (conversationChanged && sessionComposerModelPrefs?.model) {
      if (
        selectedComposerModel === sessionComposerModelPrefs.model &&
        selectedContextWindowTokens === sessionComposerModelPrefs.contextWindowTokens &&
        selectedReasoningEffort === sessionComposerModelPrefs.reasoningEffort &&
        fastModeEnabled === sessionComposerModelPrefs.fastMode &&
        cortexMaxEnabled === sessionComposerModelPrefs.cortexMax
      ) {
        return
      }
      setSelectedComposerModel(sessionComposerModelPrefs.model)
      setSelectedContextWindowTokens(sessionComposerModelPrefs.contextWindowTokens)
      setSelectedReasoningEffort(sessionComposerModelPrefs.reasoningEffort)
      setFastModeEnabled(sessionComposerModelPrefs.fastMode)
      setCortexMaxEnabled(sessionComposerModelPrefs.cortexMax)
      return
    }

    if (!conversationChanged) return
    if (
      selectedComposerModel === null &&
      selectedContextWindowTokens === null &&
      selectedReasoningEffort === null &&
      !fastModeEnabled &&
      cortexMaxEnabled
    ) {
      return
    }
    setSelectedComposerModel(null)
    applyComposerModelSettings(
      null,
      setSelectedContextWindowTokens,
      setSelectedReasoningEffort,
      setFastModeEnabled,
      setCortexMaxEnabled,
    )
  }, [
    conversationId,
    cortexMaxEnabled,
    defaultModel,
    defaultModelSettings,
    fastModeEnabled,
    selectedComposerModel,
    selectedContextWindowTokens,
    selectedReasoningEffort,
  ])

  const inheritedModel =
    typeof defaultModel === 'string' && defaultModel.trim().length > 0
      ? defaultModel
      : typeof campaignModelStrategy === 'string' && campaignModelStrategy.trim().length > 0
        ? campaignModelStrategy
        : 'auto'
  const activeComposerModel = selectedComposerModel ?? inheritedModel
  const activeModelOption = isModelStrategyId(activeComposerModel)
    ? undefined
    : modelOptions.find((option) => option.id === activeComposerModel)
  const activeComposerModelLabel = isModelStrategyId(activeComposerModel)
    ? (MODEL_STRATEGIES.find((strategy) => strategy.id === activeComposerModel)?.label ?? 'Auto')
    : resolveModelDisplayLabel(activeComposerModel, modelOptions)
  const activeComposerDisplayMeta =
    !isModelStrategyId(activeComposerModel) && activeModelOption
      ? formatModelRowMeta(activeModelOption, {
          isSelected: true,
          contextWindowTokens: selectedContextWindowTokens,
          reasoningEffort: selectedReasoningEffort,
          fastMode: fastModeEnabled,
        })
      : null
  const activeModelSettings = useMemo(
    () =>
      buildModelSettings({
        model: activeComposerModel,
        selectedOption: activeModelOption,
        contextWindowTokens: selectedContextWindowTokens,
        reasoningEffort: selectedReasoningEffort,
        fastMode: fastModeEnabled,
        cortexMax: cortexMaxEnabled,
      }),
    [
      activeComposerModel,
      activeModelOption,
      selectedContextWindowTokens,
      selectedReasoningEffort,
      fastModeEnabled,
      cortexMaxEnabled,
    ],
  )
  const selectedContextOption = findContextOption(activeModelOption, selectedContextWindowTokens)

  useEffect(() => {
    sessionComposerModelPrefs = {
      model: activeComposerModel,
      contextWindowTokens: selectedContextWindowTokens,
      reasoningEffort: selectedReasoningEffort,
      fastMode: fastModeEnabled,
      cortexMax: cortexMaxEnabled,
    }
  }, [
    activeComposerModel,
    selectedContextWindowTokens,
    selectedReasoningEffort,
    fastModeEnabled,
    cortexMaxEnabled,
  ])

  const lastPersistedModelPrefsRef = useRef<string | null>(null)
  const currentModelPrefsSnapshot = serializeComposerModelPrefs(
    activeComposerModel,
    activeModelSettings,
  )
  const storedModelPrefsSnapshot = serializeComposerModelPrefs(
    defaultModel ?? null,
    defaultModelSettings ?? null,
  )
  const persistModelPrefsArgsRef = useRef<{
    model: string
    settings: ChatModelSettings | null
  }>({ model: activeComposerModel, settings: activeModelSettings })
  persistModelPrefsArgsRef.current = { model: activeComposerModel, settings: activeModelSettings }
  useEffect(() => {
    if (!conversationId) return
    if (!selectedComposerModel) return
    if (currentModelPrefsSnapshot === storedModelPrefsSnapshot) return
    const persistKey = `${conversationId}:${currentModelPrefsSnapshot}`
    if (lastPersistedModelPrefsRef.current === persistKey) return
    const timer = setTimeout(() => {
      lastPersistedModelPrefsRef.current = persistKey
      const { model, settings } = persistModelPrefsArgsRef.current
      persistConversationPrefs(conversationId, model, settings).catch((err) =>
        console.error('Failed to save conversation model preferences:', err),
      )
    }, persistDelayMs)
    return () => clearTimeout(timer)
  }, [
    conversationId,
    currentModelPrefsSnapshot,
    persistConversationPrefs,
    persistDelayMs,
    selectedComposerModel,
    storedModelPrefsSnapshot,
  ])

  const activeModelOptionId = activeModelOption?.id ?? null
  const modelOptionsRef = useRef(modelOptions)
  modelOptionsRef.current = modelOptions

  useEffect(() => {
    const option =
      activeModelOptionId !== null
        ? modelOptionsRef.current.find((row) => row.id === activeModelOptionId)
        : undefined
    if (!option) {
      if (
        selectedContextWindowTokens === null &&
        selectedReasoningEffort === null &&
        !fastModeEnabled
      ) {
        return
      }
      setSelectedContextWindowTokens(null)
      setSelectedReasoningEffort(null)
      setFastModeEnabled(false)
      return
    }
    const nextContextWindow =
      selectedContextWindowTokens &&
      option.contextOptions.some((entry) => entry.tokens === selectedContextWindowTokens)
        ? selectedContextWindowTokens
        : (option.contextOptions[0]?.tokens ?? null)
    const nextReasoningEffort =
      selectedReasoningEffort && option.reasoningLevels.includes(selectedReasoningEffort)
        ? selectedReasoningEffort
        : (option.reasoningLevels[0] ?? 'none')
    const nextFastMode = fastModeEnabled && option.speedModes.includes('fast')
    if (
      selectedContextWindowTokens === nextContextWindow &&
      selectedReasoningEffort === nextReasoningEffort &&
      fastModeEnabled === nextFastMode
    ) {
      return
    }
    setSelectedContextWindowTokens(nextContextWindow)
    setSelectedReasoningEffort(nextReasoningEffort)
    setFastModeEnabled(nextFastMode)
  }, [
    activeModelOptionId,
    conversationId,
    fastModeEnabled,
    selectedContextWindowTokens,
    selectedReasoningEffort,
  ])

  return {
    selectedComposerModel,
    selectComposerModel,
    selectedContextWindowTokens,
    setSelectedContextWindowTokens,
    selectedReasoningEffort,
    setSelectedReasoningEffort,
    fastModeEnabled,
    setFastModeEnabled,
    cortexMaxEnabled,
    setCortexMaxEnabled,
    inheritedModel,
    activeComposerModel,
    activeModelOption,
    activeComposerModelLabel,
    activeComposerDisplayMeta,
    activeModelSettings,
    selectedContextOption,
  }
}
