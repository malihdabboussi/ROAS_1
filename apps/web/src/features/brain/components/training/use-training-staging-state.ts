'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { MediaAsset } from '@/lib/services/media-api'
import { BRAIN_TOAST_ERRORS } from '../../config/brain-toast-errors.config'
import type { SkDomain, SkSource, SkSourceType } from '../../services/sk.service'
import {
  detectBrainUploadKind,
  isSupportedNativeAudioFormat,
  isSupportedNativeVideoFormat,
} from '../../utils/upload-validation'
import {
  buildDraftPreview,
  detectLinkType,
  makeSignature,
  refreshStagedWarnings,
  smartDefaults,
  uid,
} from './training-staging-helpers'
import type { StagedDraft, StagedItem, StagedPayload } from './types'

export function useTrainingStagingState({
  open,
  activeBrainIds,
  skSources,
}: {
  open: boolean
  activeBrainIds: string[]
  skSources: SkSource[]
}) {
  const [staged, setStaged] = useState<StagedItem[]>([])
  const [selectedStagedIds, setSelectedStagedIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [bulkSourceType, setBulkSourceType] = useState<SkSourceType | ''>('')
  const [bulkDomain, setBulkDomain] = useState<SkDomain | ''>('')
  const [bulkOpenMenu, setBulkOpenMenu] = useState<'type' | 'domain' | null>(null)

  useEffect(() => {
    setStaged((prev) => refreshStagedWarnings(prev, skSources))
  }, [skSources, staged.length])

  useEffect(() => {
    if (open) return
    setStaged([])
    setSelectedStagedIds(new Set())
    setBulkSourceType('')
    setBulkDomain('')
  }, [open])

  const pushDraft = useCallback(
    (draft: StagedDraft): { added: boolean; id: string; mergedTargets?: number } => {
      const sig = makeSignature(draft.payload)
      let added = false
      let resultId = ''
      let mergedTargets = 0
      const stagingTargets = activeBrainIds
      setStaged((prev) => {
        const existing = prev.find((s) => s.signature === sig)
        if (existing) {
          resultId = existing.id
          if (stagingTargets.length === 0) return prev
          const merged = Array.from(
            new Set([...(existing.targetBrainIds ?? []), ...stagingTargets]),
          )
          mergedTargets = merged.length - (existing.targetBrainIds?.length ?? 0)
          if (mergedTargets <= 0) return prev
          return prev.map((s) => (s.id === existing.id ? { ...s, targetBrainIds: merged } : s))
        }
        const def = smartDefaults(draft.payload)
        const next: StagedItem = {
          id: uid(),
          source: draft.source,
          payload: draft.payload,
          preview: draft.preview,
          metadata: {
            sourceType: draft.metadata?.sourceType ?? def.sourceType,
            domain: draft.metadata?.domain ?? def.domain,
            titleOverride: draft.metadata?.titleOverride,
          },
          signature: sig,
          targetBrainIds: stagingTargets,
          warnings: {},
        }
        resultId = next.id
        added = true
        return [...prev, next]
      })
      return { added, id: resultId, mergedTargets }
    },
    [activeBrainIds],
  )

  const setItemTargets = useCallback((id: string, brainIds: string[]) => {
    setStaged((prev) =>
      prev.map((s) => (s.id === id ? { ...s, targetBrainIds: Array.from(new Set(brainIds)) } : s)),
    )
  }, [])

  const removeStaged = useCallback((id: string) => {
    setStaged((prev) => prev.filter((s) => s.id !== id))
    setSelectedStagedIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const updateMetadata = useCallback((id: string, patch: Partial<StagedItem['metadata']>) => {
    setStaged((prev) =>
      prev.map((s) => (s.id === id ? { ...s, metadata: { ...s.metadata, ...patch } } : s)),
    )
  }, [])

  const toggleSelectStaged = useCallback((id: string) => {
    setSelectedStagedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllStaged = useCallback(
    (select: boolean) => {
      setSelectedStagedIds(select ? new Set(staged.map((s) => s.id)) : new Set())
    },
    [staged],
  )

  const applyBulk = useCallback(() => {
    if (selectedStagedIds.size === 0) return
    if (!bulkSourceType && !bulkDomain) return
    setStaged((prev) =>
      prev.map((s) =>
        selectedStagedIds.has(s.id)
          ? {
              ...s,
              metadata: {
                ...s.metadata,
                ...(bulkSourceType ? { sourceType: bulkSourceType } : {}),
                ...(bulkDomain ? { domain: bulkDomain } : {}),
              },
            }
          : s,
      ),
    )
    setBulkSourceType('')
    setBulkDomain('')
  }, [bulkSourceType, bulkDomain, selectedStagedIds])

  const stageFile = useCallback(
    (file: File) => {
      const mediaKind = detectBrainUploadKind(file)
      if (mediaKind === 'unsupported') {
        toast.error(BRAIN_TOAST_ERRORS.FILE_TYPE_UNSUPPORTED.userMessage)
        return
      }
      if (mediaKind === 'audio' && !isSupportedNativeAudioFormat(file)) {
        toast.error(BRAIN_TOAST_ERRORS.AUDIO_FORMAT_UNSUPPORTED.userMessage)
        return
      }
      if (mediaKind === 'video' && !isSupportedNativeVideoFormat(file)) {
        toast.error(BRAIN_TOAST_ERRORS.VIDEO_FORMAT_UNSUPPORTED.userMessage)
        return
      }
      const payload: StagedPayload = { kind: 'file', file, mediaKind }
      const result = pushDraft({
        source: 'files',
        payload,
        preview: buildDraftPreview(payload),
      })
      if (!result.added) {
        toast.info(`"${file.name}" already in staging.`)
      }
    },
    [pushDraft],
  )

  const stageLink = useCallback(
    (rawUrl: string) => {
      const url = rawUrl.trim()
      if (!url) return false
      const detection = detectLinkType(url)
      const payload: StagedPayload = { kind: 'link', url, detection }
      const result = pushDraft({
        source: 'paste',
        payload,
        preview: buildDraftPreview(payload),
      })
      return result.added
    },
    [pushDraft],
  )

  const stageText = useCallback(
    (title: string, body: string) => {
      const payload: StagedPayload = { kind: 'text', title, body }
      const result = pushDraft({
        source: 'paste',
        payload,
        preview: buildDraftPreview(payload),
      })
      return result.added
    },
    [pushDraft],
  )

  const stageMediaAssets = useCallback(
    (assets: MediaAsset[]) => {
      assets.forEach((asset) => {
        const payload: StagedPayload = { kind: 'media-asset', asset }
        pushDraft({
          source: 'media-library',
          payload,
          preview: buildDraftPreview(payload),
        })
      })
    },
    [pushDraft],
  )

  useEffect(() => {
    if (!open) return
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            event.preventDefault()
            stageFile(file)
            return
          }
        }
      }
      const text = event.clipboardData?.getData('text')
      if (!text) return
      const urls = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /^https?:\/\//i.test(line))
      if (urls.length > 0) {
        event.preventDefault()
        let added = 0
        urls.forEach((url) => {
          if (stageLink(url)) added += 1
        })
        if (added > 0) toast.success(`${added} link${added === 1 ? '' : 's'} staged.`)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, stageFile, stageLink])

  return {
    staged,
    setStaged,
    selectedStagedIds,
    setSelectedStagedIds,
    submitting,
    setSubmitting,
    bulkSourceType,
    bulkDomain,
    bulkOpenMenu,
    setBulkSourceType,
    setBulkDomain,
    setBulkOpenMenu,
    pushDraft,
    setItemTargets,
    removeStaged,
    updateMetadata,
    toggleSelectStaged,
    selectAllStaged,
    applyBulk,
    stageFile,
    stageLink,
    stageText,
    stageMediaAssets,
  }
}
