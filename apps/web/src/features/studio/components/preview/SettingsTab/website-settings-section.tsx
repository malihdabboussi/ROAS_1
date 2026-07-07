'use client'

import { useState, type RefObject } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import type { Funnel } from '@/features/studio/services/artifact-preview.service'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import type { MediaAsset } from '@/lib/services/media-api'
import { WebsiteBrandImageCard } from './website-brand-image-card'
import { WebsiteNavStyleDropdown } from './website-nav-style-dropdown'
import type { WebsiteLayout, WebsiteNavItem } from './website-settings.types'

// ============================================================================
// Website Settings Section
// ============================================================================

function parseWebsiteLayout(raw: Record<string, unknown> | null | undefined): WebsiteLayout {
  if (!raw || typeof raw !== 'object') return {}
  return raw as WebsiteLayout
}

export function WebsiteSettingsSection({
  websites,
  activeIndex,
  setActiveIndex,
  editingId,
  draftName,
  setDraftName,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onSaveLayout,
  savingIds,
  containerRef,
  nameInputRef,
  campaignId,
  themeId,
}: {
  websites: Funnel[]
  activeIndex: number
  setActiveIndex: (i: number) => void
  editingId: string | null
  draftName: string
  setDraftName: (v: string) => void
  onStartEdit: (ws: Funnel) => void
  onCommitEdit: (ws: Funnel) => Promise<void>
  onCancelEdit: () => void
  onSaveLayout: (id: string, layout: Record<string, unknown>) => Promise<void>
  savingIds: Set<string>
  containerRef: RefObject<HTMLDivElement | null>
  nameInputRef: RefObject<HTMLInputElement | null>
  campaignId: string
  themeId: string | null
}) {
  const clampedIndex = Math.min(activeIndex, websites.length - 1)
  const ws = websites[clampedIndex]
  if (!ws) return null

  const isSaving = savingIds.has(ws.id)
  const layout = parseWebsiteLayout(ws.layout)

  const goPrev = () => setActiveIndex(Math.max(0, activeIndex - 1))
  const goNext = () => setActiveIndex(Math.min(websites.length - 1, activeIndex + 1))

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          goPrev()
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          goNext()
        }
      }}
      className="space-y-spacing-6 outline-none"
    >
      {/* Website Name + Navigation */}
      <div className="space-y-spacing-3">
        <div className="flex flex-col items-center text-center">
          {editingId === ws.id ? (
            <input
              ref={nameInputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onCommitEdit(ws)
                if (e.key === 'Escape') onCancelEdit()
                e.stopPropagation()
              }}
              onBlur={() => void onCommitEdit(ws)}
              className="title-h6 text-foreground ring-primary/50 focus:ring-primary rounded-md bg-transparent px-2 py-1 text-center outline-none ring-1"
            />
          ) : (
            <button
              type="button"
              onClick={() => onStartEdit(ws)}
              className="title-h6 text-foreground hover:text-foreground/90 transition-colors"
              title="Click to edit website name"
            >
              {ws.name ?? 'Website'}
            </button>
          )}
          {isSaving && <span className="body-3 text-muted-foreground">Saving...</span>}
        </div>

        {/* Dot Indicators + Arrows */}
        {websites.length > 1 && (
          <div className="gap-spacing-3 flex items-center justify-center">
            <button
              type="button"
              onClick={goPrev}
              disabled={clampedIndex === 0}
              className="p-spacing-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="icon-sm" />
            </button>
            <div className="gap-spacing-2 flex items-center">
              {websites.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${idx === clampedIndex ? 'step-circle-completed-purple scale-110' : 'step-circle-default hover:scale-110'}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={clampedIndex === websites.length - 1}
              className="p-spacing-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronRight className="icon-sm" />
            </button>
            <span className="body-4 text-muted-foreground">
              {clampedIndex + 1} / {websites.length}
            </span>
          </div>
        )}
      </div>

      <WebsiteLayoutFields
        key={ws.id}
        websiteId={ws.id}
        layout={layout}
        onSave={onSaveLayout}
        isSaving={isSaving}
        campaignId={campaignId}
        themeId={themeId}
      />
    </div>
  )
}

function WebsiteLayoutFields({
  websiteId,
  layout,
  onSave,
  isSaving,
  campaignId,
  themeId,
}: {
  websiteId: string
  layout: WebsiteLayout
  onSave: (id: string, layout: Record<string, unknown>) => Promise<void>
  isSaving: boolean
  campaignId: string
  themeId: string | null
}) {
  const [logoUrl, setLogoUrl] = useState(layout.navigation?.logo?.url ?? '')
  const [logoAlt, setLogoAlt] = useState(layout.navigation?.logo?.alt ?? '')
  const [faviconUrl, setFaviconUrl] = useState(layout.favicon_url ?? '')
  const [copyright, setCopyright] = useState(layout.footer?.copyright ?? '')
  const [navItems, setNavItems] = useState<WebsiteNavItem[]>(layout.navigation?.items ?? [])
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'logo' | 'favicon' | null>(null)

  const buildLayout = (): Record<string, unknown> => ({
    navigation: {
      logo: logoUrl ? { url: logoUrl, alt: logoAlt || 'Logo' } : undefined,
      items: navItems,
    },
    footer: {
      socials: [],
      copyright: copyright || undefined,
    },
    favicon_url: faviconUrl || undefined,
  })

  const handleSave = () => void onSave(websiteId, buildLayout())

  const applyAssetFromLibrary = (asset: MediaAsset) => {
    const url = asset.public_url?.trim() ?? ''
    if (!url) {
      toast.error(MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage)
      return
    }
    if (mediaPickerTarget === 'logo') setLogoUrl(url)
    if (mediaPickerTarget === 'favicon') setFaviconUrl(url)
    setMediaPickerOpen(false)
    setMediaPickerTarget(null)
  }

  return (
    <div className="space-y-spacing-6">
      {/* Logo & Favicon */}
      <div className="space-y-spacing-4">
        <span className="body-3 text-foreground font-medium">Logo & Favicon</span>
        <WebsiteBrandImageCard
          label="Logo"
          value={logoUrl}
          onChange={setLogoUrl}
          themeId={themeId}
          uploadCategory="website-logo"
          previewBoxClass="h-20 w-20 sm:h-24 sm:w-24"
          onOpenLibrary={() => {
            setMediaPickerTarget('logo')
            setMediaPickerOpen(true)
          }}
        />
        <div className="space-y-spacing-1">
          <label className="body-4 text-muted-foreground">Logo alt text</label>
          <input
            value={logoAlt}
            onChange={(e) => setLogoAlt(e.target.value)}
            className="input-glass body-3 h-spacing-10 px-spacing-3 rounded-spacing-2 w-full"
            placeholder="My Brand"
          />
        </div>
        <WebsiteBrandImageCard
          label="Favicon"
          value={faviconUrl}
          onChange={setFaviconUrl}
          themeId={themeId}
          uploadCategory="website-favicon"
          previewBoxClass="h-14 w-14 sm:h-16 sm:w-16"
          onOpenLibrary={() => {
            setMediaPickerTarget('favicon')
            setMediaPickerOpen(true)
          }}
        />
      </div>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => {
          setMediaPickerOpen(false)
          setMediaPickerTarget(null)
        }}
        campaignId={campaignId}
        onSelect={() => {}}
        onSelectAsset={(asset) => applyAssetFromLibrary(asset)}
      />

      {/* Navigation Items */}
      <div className="space-y-spacing-3">
        <div className="flex items-center justify-between">
          <span className="body-3 text-foreground font-medium">Navigation Items</span>
          <button
            type="button"
            onClick={() => setNavItems((prev) => [...prev, { label: '', path: '', style: 'link' }])}
            className="body-4 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            + Add item
          </button>
        </div>
        <div className="space-y-spacing-2">
          {navItems.length === 0 && (
            <p className="body-3 text-muted-foreground">No navigation items yet.</p>
          )}
          {navItems.map((item, idx) => (
            <div
              key={idx}
              className="gap-spacing-2 flex min-w-0 flex-wrap items-center sm:flex-nowrap"
            >
              <input
                value={item.label}
                onChange={(e) =>
                  setNavItems((prev) =>
                    prev.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)),
                  )
                }
                className="input-glass body-3 h-spacing-10 px-spacing-3 rounded-spacing-2 min-w-0 flex-1"
                placeholder="Label"
              />
              <input
                value={item.path}
                onChange={(e) =>
                  setNavItems((prev) =>
                    prev.map((it, i) => (i === idx ? { ...it, path: e.target.value } : it)),
                  )
                }
                className="input-glass body-3 h-spacing-10 px-spacing-3 rounded-spacing-2 min-w-0 flex-1"
                placeholder="/path"
              />
              <WebsiteNavStyleDropdown
                value={item.style ?? 'link'}
                onChange={(v) =>
                  setNavItems((prev) => prev.map((it, i) => (i === idx ? { ...it, style: v } : it)))
                }
              />
              <button
                type="button"
                onClick={() => setNavItems((prev) => prev.filter((_, i) => i !== idx))}
                className="body-3 text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                title="Remove"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="space-y-spacing-3">
        <span className="body-3 text-foreground font-medium">Footer Copyright</span>
        <input
          value={copyright}
          onChange={(e) => setCopyright(e.target.value)}
          className="input-glass body-3 h-spacing-10 px-spacing-3 rounded-spacing-2 w-full"
          placeholder="© 2026 My Brand. All rights reserved."
        />
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="chip-glass-green body-3 px-spacing-4 py-spacing-2 rounded-spacing-2 font-medium transition-all disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Website Settings'}
      </button>
    </div>
  )
}
