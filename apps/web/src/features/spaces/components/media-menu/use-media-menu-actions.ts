'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { updateAsset, type MediaAsset } from '@/lib/services/media-api'
import { openInNewTab as openAppInNewTab } from '@/lib/utils/open-in-new-tab'

export interface UseMediaMenuActionsArgs {
  asset: MediaAsset
  onChanged?: (next: MediaAsset) => void
  onOpenFull?: () => void
  onDeleted?: () => void
}

function buildMediaDetailUrl(asset: MediaAsset): string {
  if (typeof window === 'undefined') return `/spaces?media=${asset.id}`
  return `${window.location.origin}/spaces?media=${asset.id}`
}

function buildAssetShareUrl(asset: MediaAsset): string {
  return asset.public_url && asset.public_url.trim() ? asset.public_url : buildMediaDetailUrl(asset)
}

async function copyToClipboard(value: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`)
  }
}

export function useMediaMenuActions({
  asset,
  onChanged,
  onOpenFull,
  onDeleted,
}: UseMediaMenuActionsArgs) {
  const copyLink = useCallback(async () => {
    await copyToClipboard(buildAssetShareUrl(asset), 'Asset link')
  }, [asset])

  const copyId = useCallback(async () => {
    await copyToClipboard(asset.id, 'Asset ID')
  }, [asset.id])

  const openInNewTab = useCallback(() => {
    if (typeof window === 'undefined') return
    openAppInNewTab(buildAssetShareUrl(asset))
  }, [asset])

  const openFull = useCallback(() => {
    onOpenFull?.()
  }, [onOpenFull])

  const rename = useCallback(async () => {
    const next = window.prompt('Rename asset', asset.name)?.trim()
    if (!next || next === asset.name) return
    try {
      const updated = await updateAsset(asset.id, { name: next })
      toast.success('Asset renamed')
      onChanged?.(updated)
    } catch {
      toast.error('Failed to rename asset')
    }
  }, [asset.id, asset.name, onChanged])

  const download = useCallback(() => {
    if (typeof window === 'undefined' || !asset.public_url) return
    const a = document.createElement('a')
    a.href = asset.public_url
    a.download = asset.original_filename || asset.name || ''
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [asset.public_url, asset.original_filename, asset.name])

  const copyPrompt = useCallback(async () => {
    if (!asset.source_prompt) return
    await copyToClipboard(asset.source_prompt, 'Prompt')
  }, [asset.source_prompt])

  const deleteMedia = useCallback(() => {
    onDeleted?.()
  }, [onDeleted])

  return {
    copyLink,
    copyId,
    openInNewTab,
    openFull,
    rename,
    download,
    copyPrompt,
    deleteMedia,
    hasPrompt: Boolean(asset.source_prompt && asset.source_prompt.trim()),
    hasDownload: Boolean(asset.public_url),
  }
}
