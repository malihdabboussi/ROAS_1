import { renderHook, waitFor } from '@testing-library/react'
import { StrictMode, createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LlmModelOption } from '@/features/studio/services/chat.service'
import { useChatInputModelOptions } from './use-chat-input-model-options'

function modelOption(id: string): LlmModelOption {
  return {
    id,
    provider: 'test',
    modelName: id,
    label: id,
    contextWindow: 100_000,
    maxOutputTokens: null,
    supportsImages: false,
    inputModalities: ['text'],
    outputModalities: ['text'],
    supportedParameters: [],
    contextOptions: [],
    reasoningLevels: [],
    speedModes: [],
    pricing: {},
    pricingTiers: [],
  }
}

describe('useChatInputModelOptions', () => {
  it('loads model options on mount before the dropdown opens', async () => {
    const loadModels = vi.fn(async () => [modelOption('model-a')])

    const { result } = renderHook(() =>
      useChatInputModelOptions({ modelDropdownOpen: false, loadModels }),
    )

    await waitFor(() => {
      expect(result.current.modelOptions.map((option) => option.id)).toEqual(['model-a'])
    })
    expect(loadModels).toHaveBeenCalledTimes(1)
  })

  it('does not start another load when the dropdown opens after eager loading succeeds', async () => {
    const loadModels = vi.fn().mockResolvedValueOnce([modelOption('eager-model')])

    const { result, rerender } = renderHook(
      ({ open }) => useChatInputModelOptions({ modelDropdownOpen: open, loadModels }),
      { initialProps: { open: false } },
    )

    await waitFor(() => {
      expect(result.current.modelOptions.map((option) => option.id)).toEqual(['eager-model'])
    })
    rerender({ open: true })

    expect(loadModels).toHaveBeenCalledTimes(1)
  })

  it('retries loading when the dropdown opens after the eager load fails', async () => {
    const loadModels = vi
      .fn()
      .mockRejectedValueOnce(new Error('load failed'))
      .mockResolvedValueOnce([modelOption('retry-model')])

    const { result, rerender } = renderHook(
      ({ open }) => useChatInputModelOptions({ modelDropdownOpen: open, loadModels }),
      { initialProps: { open: false } },
    )

    await waitFor(() => {
      expect(loadModels).toHaveBeenCalledTimes(1)
    })
    rerender({ open: true })

    await waitFor(() => {
      expect(result.current.modelOptions.map((option) => option.id)).toEqual(['retry-model'])
    })
    expect(loadModels).toHaveBeenCalledTimes(2)
  })

  it('retries loading when the eager load returns an empty list', async () => {
    const loadModels = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([modelOption('retry-after-empty')])

    const { result, rerender } = renderHook(
      ({ open }) => useChatInputModelOptions({ modelDropdownOpen: open, loadModels }),
      { initialProps: { open: false } },
    )

    await waitFor(() => {
      expect(loadModels).toHaveBeenCalledTimes(1)
    })
    rerender({ open: true })

    await waitFor(() => {
      expect(result.current.modelOptions.map((option) => option.id)).toEqual([
        'retry-after-empty',
      ])
    })
    expect(loadModels).toHaveBeenCalledTimes(2)
  })

  it('mirrors loaded model options to an external callback', async () => {
    const models = [modelOption('callback-model')]
    const loadModels = vi.fn(async () => models)
    const onModelOptionsChange = vi.fn()

    renderHook(() =>
      useChatInputModelOptions({
        modelDropdownOpen: true,
        loadModels,
        onModelOptionsChange,
      }),
    )

    await waitFor(() => {
      expect(onModelOptionsChange).toHaveBeenCalledWith(models)
    })
    expect(loadModels).toHaveBeenCalledTimes(1)
  })

  it('does not notify the parent again when the dropdown opens after eager loading', async () => {
    const loadModels = vi.fn().mockResolvedValueOnce([modelOption('stable-model')])
    const onModelOptionsChange = vi.fn()

    const { rerender } = renderHook(
      ({ open }) =>
        useChatInputModelOptions({
          modelDropdownOpen: open,
          loadModels,
          onModelOptionsChange,
        }),
      { initialProps: { open: true } },
    )

    await waitFor(() => {
      expect(onModelOptionsChange).toHaveBeenCalledTimes(1)
    })
    rerender({ open: false })
    rerender({ open: true })

    expect(loadModels).toHaveBeenCalledTimes(1)
    expect(onModelOptionsChange).toHaveBeenCalledTimes(1)
  })

  it('applies loaded models after StrictMode effect cleanup reruns', async () => {
    const models = [modelOption('strict-model')]
    const loadModels = vi.fn(async () => models)
    const onModelOptionsChange = vi.fn()
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children)

    const { result } = renderHook(
      () =>
        useChatInputModelOptions({
          modelDropdownOpen: false,
          loadModels,
          onModelOptionsChange,
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.modelOptions.map((option) => option.id)).toEqual(['strict-model'])
    })
    expect(onModelOptionsChange).toHaveBeenCalledWith(models)
  })

  it('falls back to an empty list when loading fails', async () => {
    const loadModels = vi.fn(async () => {
      throw new Error('load failed')
    })

    const { result } = renderHook(() =>
      useChatInputModelOptions({ modelDropdownOpen: true, loadModels }),
    )

    await waitFor(() => {
      expect(result.current.modelOptions).toEqual([])
    })
    expect(loadModels).toHaveBeenCalledTimes(1)
  })
})
