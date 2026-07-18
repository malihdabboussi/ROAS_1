'use client'

import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { BrandVoice, DesignSettings, UserThemeColors } from '@/features/themes/types'
import { backendPost } from '@/lib/api/backend-client'
import { THEME_ERRORS } from '../config/theme-errors.config'
import { THEME_MESSAGES } from '../config/theme-messages.config'

export interface WebsiteBrandingImportData {
  colors: UserThemeColors
  fontHeading: string | null
  fontBody: string | null
  suggestedName: string
  logoUrl: string | null
  faviconUrl: string | null
  ogImageUrl: string | null
  brandVoice: BrandVoice | null
  designSettings: DesignSettings | null
}

interface ThemeBrandingImportDialogProps {
  open: boolean
  onClose: () => void
  onImport: (data: WebsiteBrandingImportData) => void
}

type ImportState = 'input' | 'extracting' | 'preview'

export function ThemeBrandingImportDialog({
  open,
  onClose,
  onImport,
}: ThemeBrandingImportDialogProps) {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<ImportState>('input')
  const [error, setError] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<
    (WebsiteBrandingImportData & { sourceUrl?: string }) | null
  >(null)

  const normalizeUrl = (raw: string): string => {
    const trimmed = raw.trim()
    if (!trimmed) return trimmed
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const handleExtract = async () => {
    if (!url.trim()) {
      setError(THEME_ERRORS.URL_REQUIRED.userMessage)
      return
    }
    const normalized = normalizeUrl(url)
    try {
      new URL(normalized)
    } catch {
      setError(THEME_ERRORS.URL_INVALID.userMessage)
      return
    }
    setUrl(normalized)
    setError(null)
    setState('extracting')
    try {
      const result = await backendPost<{
        success: boolean
        data?: WebsiteBrandingImportData & { sourceUrl?: string }
        error?: string
      }>('/themes/extract/website', { url: normalized })
      if (!result.success) {
        throw new Error(result.error || THEME_ERRORS.INTERNAL_ERROR.userMessage)
      }
      setExtractedData(result.data ?? null)
      setState('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : THEME_ERRORS.INTERNAL_ERROR.userMessage)
      setState('input')
    }
  }

  const handleApply = () => {
    if (extractedData) {
      onImport(extractedData)
      onClose()
      setUrl('')
      setState('input')
      setExtractedData(null)
    }
  }

  const handleCancel = () => {
    onClose()
    setUrl('')
    setState('input')
    setExtractedData(null)
    setError(null)
  }

  if (!open) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && handleCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-modal-overlay fixed inset-0 z-[100004]" />
        <DialogPrimitive.Content className="p-spacing-4 fixed inset-0 z-[100005] flex items-center justify-center overflow-hidden">
          <div className="surface-card border-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden border">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-icon-bare btn-close-absolute right-spacing-2 top-spacing-2 absolute"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <VisuallyHidden.Root>
              <DialogPrimitive.Title>
                {THEME_MESSAGES.IMPORT_WEBSITE_TITLE.message}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description>
                {THEME_MESSAGES.INPUT_HELPER_TEXT.message}
              </DialogPrimitive.Description>
            </VisuallyHidden.Root>
            <div className="px-spacing-6 py-spacing-4 flex-1 overflow-y-auto">
              {state === 'input' && (
                <div className="space-y-spacing-6">
                  <div>
                    <label
                      htmlFor="branding-import-url"
                      className="body-2 text-foreground mb-spacing-2 block font-medium"
                    >
                      {THEME_MESSAGES.INPUT_LABEL_URL.message}
                    </label>
                    <input
                      id="branding-import-url"
                      type="url"
                      placeholder={THEME_MESSAGES.INPUT_PLACEHOLDER_URL.message}
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                      className="input-glass w-full"
                      aria-describedby="branding-import-url-help"
                      autoFocus
                    />
                    <p
                      id="branding-import-url-help"
                      className="typo-caption text-muted-foreground mt-spacing-2"
                    >
                      {THEME_MESSAGES.INPUT_HELPER_TEXT.message}
                    </p>
                  </div>
                  {error && (
                    <div className="rounded-spacing-2 border-destructive/20 bg-destructive/10 p-spacing-4 border">
                      <p role="alert" className="body-3 text-destructive">
                        {error}
                      </p>
                    </div>
                  )}
                  <div className="gap-spacing-3 flex">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="button-glass-neutral px-spacing-4 py-spacing-2 rounded-spacing-2 body-3 flex-1 font-medium"
                    >
                      {THEME_MESSAGES.BUTTON_CANCEL.message}
                    </button>
                    <button
                      type="button"
                      onClick={handleExtract}
                      disabled={!url.trim()}
                      className="button-glass-accent px-spacing-4 py-spacing-2 rounded-spacing-2 body-3 flex-1 font-medium disabled:opacity-50"
                    >
                      {THEME_MESSAGES.BUTTON_EXTRACT.message}
                    </button>
                  </div>
                </div>
              )}
              {state === 'extracting' && (
                <div className="py-spacing-12 flex items-center justify-center">
                  <VibeyLoadingOrb
                    text="Pulling branding from website..."
                    state="processing"
                    size="md"
                  />
                </div>
              )}
              {state === 'preview' && extractedData && (
                <div className="space-y-spacing-6">
                  <div>
                    <h3 className="body-1 text-foreground mb-spacing-4 font-semibold">
                      {THEME_MESSAGES.PREVIEW_TITLE.message}
                    </h3>
                    <div className="space-y-spacing-4">
                      <div>
                        <p className="body-3 text-muted-foreground mb-spacing-2 font-medium">
                          {THEME_MESSAGES.PREVIEW_SECTION_PRIMARY.message}
                        </p>
                        <div className="gap-spacing-2 grid grid-cols-4">
                          {[
                            { key: 'primary', label: 'Primary' },
                            { key: 'secondaryAccent1', label: 'Accent 1' },
                            { key: 'secondaryAccent2', label: 'Accent 2' },
                            { key: 'heading', label: 'Heading' },
                          ].map(({ key, label }) => (
                            <div key={key} className="gap-spacing-1 flex flex-col items-center">
                              {/* By-design brand preview: extracted colors cannot use app tokens. */}
                              <div
                                className="border-border rounded-spacing-2 h-16 w-full border"
                                style={{
                                  background: (
                                    extractedData.colors as unknown as Record<string, string>
                                  )[key],
                                }}
                              />
                              <span className="typo-caption text-muted-foreground">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {(extractedData.fontHeading || extractedData.fontBody) && (
                        <div>
                          <p className="body-3 text-muted-foreground mb-spacing-2 font-medium">
                            {THEME_MESSAGES.PREVIEW_SECTION_FONTS.message}
                          </p>
                          <div className="rounded-spacing-2 bg-muted/50 p-spacing-4">
                            {extractedData.fontHeading && (
                              <p className="body-3 text-foreground">
                                <span className="font-medium">
                                  {THEME_MESSAGES.PREVIEW_FONT_HEADING.message}:
                                </span>{' '}
                                {extractedData.fontHeading}
                              </p>
                            )}
                            {extractedData.fontBody && (
                              <p className="body-3 text-foreground">
                                <span className="font-medium">
                                  {THEME_MESSAGES.PREVIEW_FONT_BODY.message}:
                                </span>{' '}
                                {extractedData.fontBody}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {extractedData.brandVoice && (
                        <div>
                          <p className="body-3 text-muted-foreground mb-spacing-2 font-medium">
                            Brand Voice
                          </p>
                          <div className="rounded-spacing-2 bg-muted/50 p-spacing-4 space-y-spacing-1">
                            {extractedData.brandVoice.tone && (
                              <p className="body-3 text-foreground">
                                <span className="font-medium">Tone:</span>{' '}
                                {extractedData.brandVoice.tone}
                              </p>
                            )}
                            {extractedData.brandVoice.style && (
                              <p className="body-3 text-foreground">
                                <span className="font-medium">Energy:</span>{' '}
                                {extractedData.brandVoice.style}
                              </p>
                            )}
                            {extractedData.brandVoice.personality && (
                              <p className="body-3 text-foreground">
                                <span className="font-medium">Audience:</span>{' '}
                                {extractedData.brandVoice.personality}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {extractedData.designSettings && (
                        <div>
                          <p className="body-3 text-muted-foreground mb-spacing-2 font-medium">
                            Design Settings
                          </p>
                          <div className="rounded-spacing-2 bg-muted/50 p-spacing-4 space-y-spacing-1">
                            <p className="body-3 text-foreground">
                              <span className="font-medium">Border radius:</span>{' '}
                              {extractedData.designSettings.slides.borderRadius}
                            </p>
                            <p className="body-3 text-foreground">
                              <span className="font-medium">Button shape:</span>{' '}
                              {extractedData.designSettings.buttons.shape}
                            </p>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="body-3 text-muted-foreground mb-spacing-2 font-medium">
                          {THEME_MESSAGES.PREVIEW_SUGGESTED_NAME.message}
                        </p>
                        <p className="body-2 text-foreground">{extractedData.suggestedName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="gap-spacing-3 flex">
                    <button
                      type="button"
                      onClick={() => {
                        setState('input')
                        setExtractedData(null)
                      }}
                      className="button-glass-neutral px-spacing-4 py-spacing-2 rounded-spacing-2 body-3 flex-1 font-medium"
                    >
                      {THEME_MESSAGES.BUTTON_TRY_ANOTHER.message}
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      className="button-glass-accent px-spacing-4 py-spacing-2 rounded-spacing-2 body-3 flex-1 font-medium"
                    >
                      {THEME_MESSAGES.BUTTON_APPLY_THEME.message}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
