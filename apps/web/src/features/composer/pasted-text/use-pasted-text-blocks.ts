'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { getLargePasteTextFromClipboard } from './clipboard-paste'
import { mergeComposerContent } from './merge-composer-content'
import {
  clearPastedBlocksStorage,
  loadPastedBlocksFromStorage,
  savePastedBlocksToStorage,
} from './pasted-text-storage'
import { PASTED_TEXT_MAX_BLOCKS } from './pasted-text.constants'
import type { PastedTextBlock, PastedTextPersistence } from './pasted-text.types'

function persistenceKey(persistence: PastedTextPersistence): string {
  return persistence.mode === 'zustand' ? persistence.contextKey : persistence.draftKey
}

function loadBlocks(persistence: PastedTextPersistence): PastedTextBlock[] {
  if (persistence.mode === 'zustand') {
    return useChatStore.getState().composerPastedBlocksByContext[persistence.contextKey] ?? []
  }
  return loadPastedBlocksFromStorage(persistence.draftKey)
}

function persistBlocks(persistence: PastedTextPersistence, blocks: PastedTextBlock[]): void {
  if (persistence.mode === 'zustand') {
    const store = useChatStore.getState()
    if (blocks.length === 0) {
      store.clearComposerPastedBlocks(persistence.contextKey)
    } else {
      store.setComposerPastedBlocks(persistence.contextKey, blocks)
    }
    return
  }
  savePastedBlocksToStorage(persistence.draftKey, blocks)
}

export function usePastedTextBlocks(options: {
  persistence: PastedTextPersistence
  enabled?: boolean
}) {
  const { persistence, enabled = true } = options
  const key = persistenceKey(persistence)
  const [blocks, setBlocks] = useState<PastedTextBlock[]>(() =>
    enabled ? loadBlocks(persistence) : [],
  )
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks
  const mountRef = useRef(true)

  useEffect(() => {
    if (!enabled) {
      setBlocks([])
      setEditingBlockId(null)
      return
    }
    if (mountRef.current) {
      mountRef.current = false
      return
    }
    setBlocks(loadBlocks(persistence))
    setEditingBlockId(null)
  }, [key, enabled])

  useEffect(() => {
    if (!enabled) return
    const timer = setTimeout(() => {
      persistBlocks(persistence, blocksRef.current)
    }, 500)
    return () => clearTimeout(timer)
  }, [blocks, key, enabled])

  useEffect(() => {
    if (!enabled) return
    return () => {
      persistBlocks(persistence, blocksRef.current)
    }
  }, [key, enabled])

  const addBlock = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return false
    setBlocks((prev) => {
      if (prev.length >= PASTED_TEXT_MAX_BLOCKS) {
        toast.error(`You can paste up to ${PASTED_TEXT_MAX_BLOCKS} blocks at a time.`)
        return prev
      }
      return [...prev, { id: crypto.randomUUID(), text: trimmed }]
    })
    return true
  }, [])

  const tryAddFromClipboard = useCallback(
    (clipboardData: DataTransfer | null | undefined): boolean => {
      if (!enabled) return false
      const text = getLargePasteTextFromClipboard(clipboardData)
      if (!text) return false
      return addBlock(text)
    },
    [addBlock, enabled],
  )

  const updateBlock = useCallback((id: string, text: string) => {
    const trimmed = text.trim()
    if (!trimmed) {
      setBlocks((prev) => prev.filter((b) => b.id !== id))
      setEditingBlockId((current) => (current === id ? null : current))
      return
    }
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, text: trimmed } : b)))
    setEditingBlockId(null)
  }, [])

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id))
    setEditingBlockId((current) => (current === id ? null : current))
  }, [])

  const clearAll = useCallback(() => {
    setBlocks([])
    setEditingBlockId(null)
    if (persistence.mode === 'zustand') {
      useChatStore.getState().clearComposerPastedBlocks(key)
    } else {
      clearPastedBlocksStorage(key)
    }
  }, [persistence.mode, key])

  const mergeForSend = useCallback(
    (promptText: string) => mergeComposerContent(blocks, promptText),
    [blocks],
  )

  const hasBlocks = blocks.length > 0
  const editingBlock = editingBlockId ? (blocks.find((b) => b.id === editingBlockId) ?? null) : null

  return {
    blocks,
    hasBlocks,
    editingBlock,
    editingBlockId,
    setEditingBlockId,
    addBlock,
    tryAddFromClipboard,
    updateBlock,
    removeBlock,
    clearAll,
    mergeForSend,
  }
}
