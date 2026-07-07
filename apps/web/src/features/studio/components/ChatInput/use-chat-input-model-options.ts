import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchLlmModels,
  type LlmModelOption,
} from '@/features/studio/services/chat.service'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'

export interface UseChatInputModelOptionsOptions {
  modelDropdownOpen: boolean
  loadModels?: () => Promise<LlmModelOption[]>
  onModelOptionsChange?: (models: LlmModelOption[]) => void
}

const CHAT_INPUT_MODELS_CACHE_KEY = 'chat-input-llm-models'

async function loadCachedLlmModels() {
  const models = await cachedFetch(CHAT_INPUT_MODELS_CACHE_KEY, fetchLlmModels, { ttlMs: 300_000 })
  if (models.length === 0) invalidateCachedFetch(CHAT_INPUT_MODELS_CACHE_KEY)
  return models
}

export function useChatInputModelOptions({
  modelDropdownOpen,
  loadModels = loadCachedLlmModels,
  onModelOptionsChange,
}: UseChatInputModelOptionsOptions) {
  const [modelOptions, setModelOptions] = useState<LlmModelOption[]>([])
  const appliedModelOptionsRef = useRef<LlmModelOption[]>([])
  const loadStatusRef = useRef<'idle' | 'loading' | 'loaded'>('idle')
  const mountedRef = useRef(true)
  const applyModelOptions = useCallback(
    (models: LlmModelOption[]) => {
      if (sameModelOptions(appliedModelOptionsRef.current, models)) return
      appliedModelOptionsRef.current = models
      setModelOptions(models)
      onModelOptionsChange?.(models)
    },
    [onModelOptionsChange],
  )

  const loadAndApplyModelOptions = useCallback(() => {
    if (loadStatusRef.current === 'loading' || loadStatusRef.current === 'loaded') return
    loadStatusRef.current = 'loading'
    void loadModels()
      .then((models) => {
        if (!mountedRef.current) return
        loadStatusRef.current = models.length > 0 ? 'loaded' : 'idle'
        applyModelOptions(models)
      })
      .catch(() => {
        if (!mountedRef.current) return
        loadStatusRef.current = 'idle'
        applyModelOptions([])
      })
  }, [applyModelOptions, loadModels])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    loadAndApplyModelOptions()
  }, [loadAndApplyModelOptions])

  useEffect(() => {
    if (!modelDropdownOpen) return
    loadAndApplyModelOptions()
  }, [loadAndApplyModelOptions, modelDropdownOpen])

  return { modelOptions }
}

function sameModelOptions(a: LlmModelOption[], b: LlmModelOption[]): boolean {
  if (a.length !== b.length) return false
  return a.every((option, index) => option.id === b[index]?.id)
}
