'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Images, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { ImageGenerationModelIdWeb } from '@/lib/services/media-api'
import { cn } from '@/lib/utils/cn'
import { MediaGenerateCountMenu } from './MediaGenerateCountMenu'
import { MediaGenerateCreationsGrid } from './MediaGenerateCreationsGrid'
import { MediaGeneratePreviewStage } from './MediaGeneratePreviewStage'
import type { CoverAspectRatio } from './use-media-image-generation'
import { useMediaImageGeneration } from './use-media-image-generation'

export interface MediaGenerateModalProps {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
  campaignId?: string | null
  spaceId?: string | null
  title?: string
  extraTags?: string[]
}

export function MediaGenerateModal({
  open,
  onClose,
  onSelect,
  campaignId,
  spaceId,
  title = 'Generate cover',
  extraTags,
}: MediaGenerateModalProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [openDropdown, setOpenDropdown] = useState<'model' | 'ratio' | 'count' | null>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const ratioDropdownRef = useRef<HTMLDivElement>(null)
  const countDropdownRef = useRef<HTMLDivElement>(null)
  const countTriggerRef = useRef<HTMLButtonElement>(null)
  const countFloatingRef = useRef<HTMLDivElement>(null)
  const [countMenuPos, setCountMenuPos] = useState<{ top: number; left: number } | null>(null)
  const hook = useMediaImageGeneration({ open, campaignId, spaceId, extraTags })

  useLayoutEffect(() => {
    if (openDropdown !== 'count') {
      setCountMenuPos(null)
      return
    }
    const MENU_W = 192
    const GAP = 4
    const ROW = 44
    const PAD = 12
    const MENU_H = ROW * 4 + PAD

    const place = () => {
      const btn = countTriggerRef.current
      if (!btn) return
      const r = btn.getBoundingClientRect()
      let top = r.top - MENU_H - GAP
      if (top < 8) top = r.bottom + GAP
      if (top + MENU_H > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - MENU_H - 8)
      }
      let left = r.right - MENU_W
      left = Math.max(8, Math.min(left, window.innerWidth - MENU_W - 8))
      setCountMenuPos({ top, left })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [openDropdown])

  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  useEffect(() => {
    if (!openDropdown) return
    const handle = (e: MouseEvent) => {
      const t = e.target as Node
      if (modelDropdownRef.current?.contains(t)) return
      if (ratioDropdownRef.current?.contains(t)) return
      if (countDropdownRef.current?.contains(t)) return
      if (countFloatingRef.current?.contains(t)) return
      setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [openDropdown])

  const handleUseGenerated = useCallback(() => {
    const url = hook.generatedImageUrl ?? hook.previewImageUrl
    if (!url) return
    onSelect(url)
    onClose()
  }, [hook.generatedImageUrl, hook.previewImageUrl, onSelect, onClose])

  const triggerClass = cn(
    'surface-bg border-border body-2 text-foreground flex h-spacing-10 w-full items-center justify-between rounded-spacing-2 border px-spacing-3 text-left transition-colors',
    'hover:bg-hover-subtle/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
  )

  /** Left padding matches dropdown rows: menu `p-spacing-2` (8px) + item `px-spacing-2` (8px) = `pl-spacing-4`. */
  const modelTriggerClass = cn(
    'surface-bg border-border body-2 text-foreground flex h-spacing-10 w-full items-center justify-start gap-spacing-2 rounded-spacing-2 border pl-spacing-4 pr-spacing-3 text-left transition-colors',
    'hover:bg-hover-subtle/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
  )

  if (!portalTarget || !open) return null

  const countFloatingMenu =
    openDropdown === 'count' && countMenuPos ? (
      <div ref={countFloatingRef}>
        <MediaGenerateCountMenu
          imageCount={hook.imageCount}
          position={countMenuPos}
          onSelect={(count) => {
            hook.setImageCount(count)
            setOpenDropdown(null)
          }}
        />
      </div>
    ) : null

  return (
    <>
      {createPortal(
        <div
          className="z-modal-backdrop-above flex items-center justify-center p-4"
          onClick={() => onClose()}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal
            className="surface-card border-border z-modal-content relative flex max-h-[85vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <h2 className="title-h6">{title}</h2>
              <button
                type="button"
                onClick={() => onClose()}
                className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-2 p-spacing-2 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="flex flex-col gap-4">
                <MediaGeneratePreviewStage
                  previewImageUrl={hook.previewImageUrl}
                  isGenerating={hook.isGenerating}
                  progressMessage={hook.progressMessage}
                  progress={hook.progress}
                  currentBatchImages={hook.currentBatchImages}
                  selectedBatchIndex={hook.selectedBatchIndex}
                  onSelectBatchImage={hook.selectBatchImage}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <div className="w-full min-w-0 sm:min-w-[22rem] sm:flex-[2]">
                    <label className="body-3 text-muted-foreground mb-1 block">Model</label>
                    <div ref={modelDropdownRef} className="relative">
                      <button
                        type="button"
                        disabled={hook.isGenerating || hook.isLoadingModels}
                        onClick={() => setOpenDropdown((d) => (d === 'model' ? null : 'model'))}
                        className={cn(
                          modelTriggerClass,
                          (hook.isGenerating || hook.isLoadingModels) &&
                            'cursor-not-allowed opacity-50',
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate text-left">
                          {hook.selectedModelInfo?.name ?? 'Model'}
                        </span>
                        <ChevronDown
                          className="text-muted-foreground icon-sm shrink-0"
                          aria-hidden
                        />
                      </button>
                      {openDropdown === 'model' && (
                        <div
                          className="z-dropdown mt-spacing-1 absolute left-0 top-full w-max min-w-[min(calc(100vw-2rem),22rem)] sm:min-w-[22rem]"
                          data-dropdown
                        >
                          <div className="dropdown-menu-solid p-spacing-2">
                            <div className="space-y-spacing-0">
                              {hook.availableModels.map((m) => {
                                const isSelected = hook.selectedModel === m.id
                                return (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      hook.setSelectedModel(m.id as ImageGenerationModelIdWeb)
                                      setOpenDropdown(null)
                                    }}
                                    className={cn(
                                      'px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 gap-spacing-2 flex w-full items-center justify-between text-left transition-all',
                                      isSelected
                                        ? 'dropdown-sort-option-selected text-muted-foreground'
                                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground',
                                    )}
                                  >
                                    <div className="pr-spacing-2">
                                      <span className="whitespace-nowrap">
                                        <span className="text-foreground font-medium">
                                          {m.name}
                                        </span>
                                        <span className="typo-caption text-muted-foreground">
                                          {' '}
                                          — {m.description}
                                        </span>
                                      </span>
                                    </div>
                                    {isSelected && (
                                      <div className="dropdown-sort-check ml-spacing-2 shrink-0">
                                        <Check
                                          className="tint-green icon-sm relative z-30"
                                          strokeWidth={2.5}
                                          aria-hidden
                                        />
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <label className="body-3 text-muted-foreground mb-1 block">Ratio</label>
                    <div ref={ratioDropdownRef} className="relative">
                      <button
                        type="button"
                        disabled={hook.isGenerating}
                        onClick={() => setOpenDropdown((d) => (d === 'ratio' ? null : 'ratio'))}
                        className={cn(
                          triggerClass,
                          hook.isGenerating && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <span className="truncate">{hook.aspectRatio}</span>
                        <ChevronDown className="text-muted-foreground icon-sm shrink-0" />
                      </button>
                      {openDropdown === 'ratio' && (
                        <div
                          className="z-dropdown mt-spacing-1 absolute left-0 top-full min-w-full"
                          data-dropdown
                        >
                          <div className="dropdown-menu-solid p-spacing-2 min-w-48">
                            <div className="space-y-spacing-0">
                              {hook.supportedAspectRatios.map((r) => {
                                const isSelected = hook.aspectRatio === r
                                return (
                                  <button
                                    key={r}
                                    type="button"
                                    onClick={() => {
                                      hook.setAspectRatio(r as CoverAspectRatio)
                                      setOpenDropdown(null)
                                    }}
                                    className={cn(
                                      'px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all',
                                      isSelected
                                        ? 'dropdown-sort-option-selected text-muted-foreground'
                                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground',
                                    )}
                                  >
                                    <span className="font-medium">{r}</span>
                                    {isSelected && (
                                      <div className="dropdown-sort-check ml-spacing-2">
                                        <Check
                                          className="tint-green icon-sm relative z-30"
                                          strokeWidth={2.5}
                                          aria-hidden
                                        />
                                      </div>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-[4.5rem] flex-1">
                    <label className="body-3 text-muted-foreground mb-1 block">Count</label>
                    <div ref={countDropdownRef} className="relative">
                      <button
                        ref={countTriggerRef}
                        type="button"
                        disabled={hook.isGenerating}
                        onClick={() => setOpenDropdown((d) => (d === 'count' ? null : 'count'))}
                        className={cn(
                          triggerClass,
                          hook.isGenerating && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <span className="gap-spacing-2 flex items-center">
                          <Images className="text-muted-foreground icon-sm shrink-0" />
                          <span>{hook.imageCount}</span>
                        </span>
                        <ChevronDown className="text-muted-foreground icon-sm shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="body-3 text-muted-foreground mb-1 block">
                    Describe the cover
                  </label>
                  <textarea
                    value={hook.prompt}
                    onChange={(e) => hook.setPrompt(e.target.value)}
                    disabled={hook.isGenerating}
                    placeholder="Soft gradient, minimal, professional…"
                    rows={4}
                    className="input-glass border-border text-foreground placeholder:text-muted-foreground w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none disabled:opacity-50"
                  />
                </div>

                <button
                  type="button"
                  disabled={!hook.prompt.trim() || hook.isGenerating || hook.isLoadingModels}
                  onClick={() => void hook.handleGenerate()}
                  className="button-glass-accent flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
                >
                  {hook.isGenerating ? (
                    <>
                      <VibeyLoadingOrb state="processing" size="sm" className="gap-0 py-0" />
                      Generating…
                    </>
                  ) : (
                    'Generate'
                  )}
                </button>

                {(hook.generatedImageUrl || hook.previewImageUrl) && !hook.isGenerating && (
                  <button
                    type="button"
                    onClick={handleUseGenerated}
                    className="button-glass-accent w-full rounded-lg py-2.5 text-sm font-medium"
                  >
                    Use this image
                  </button>
                )}

                <MediaGenerateCreationsGrid
                  generatedImages={hook.generatedImages}
                  isLoadingCreations={hook.isLoadingCreations}
                  previewImageUrl={hook.previewImageUrl}
                  onPreviewImage={(url) => {
                    hook.setGeneratedImageUrl(url)
                    hook.setPreviewImageUrl(url)
                  }}
                  onDeleteGeneratedImage={(imageId, imageUrl) =>
                    void hook.handleDeleteGeneratedImage(imageId, imageUrl)
                  }
                />
              </div>
            </div>
          </div>
        </div>,
        portalTarget,
      )}
      {countFloatingMenu ? createPortal(countFloatingMenu, document.body) : null}
    </>
  )
}

export const DocCoverGenerateModal = MediaGenerateModal
