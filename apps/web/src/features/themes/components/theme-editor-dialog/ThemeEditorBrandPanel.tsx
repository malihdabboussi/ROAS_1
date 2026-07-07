'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { BrandValues, BrandVoice } from '../../types'

export interface ThemeEditorBrandPanelProps {
  brandVoice: BrandVoice | null
  setBrandVoice: Dispatch<SetStateAction<BrandVoice | null>>
  brandValues: BrandValues | null
  setBrandValues: Dispatch<SetStateAction<BrandValues | null>>
}

export function ThemeEditorBrandPanel({
  brandVoice,
  setBrandVoice,
  brandValues,
  setBrandValues,
}: ThemeEditorBrandPanelProps) {
  return (
    <div className="space-y-spacing-6 max-w-xl">
      <div>
        <h3 className="body-1 mb-spacing-2 font-semibold text-[var(--color-foreground)]">
          Brand Voice
        </h3>
        <p className="typo-caption mb-spacing-4 text-[var(--color-muted-foreground)]">
          Define how your brand communicates.
        </p>
        <div className="space-y-spacing-4">
          <div>
            <label className="body-3 mb-spacing-2 block font-medium text-[var(--color-muted-foreground)]">
              Tone
            </label>
            <input
              value={brandVoice?.tone || ''}
              onChange={(e) =>
                setBrandVoice((prev) => ({
                  tone: e.target.value,
                  style: prev?.style || '',
                  personality: prev?.personality || '',
                }))
              }
              placeholder="e.g., Professional, Casual, Bold"
              className="input-glass body-2 w-full"
            />
          </div>
          <div>
            <label className="body-3 mb-spacing-2 block font-medium text-[var(--color-muted-foreground)]">
              Style
            </label>
            <input
              value={brandVoice?.style || ''}
              onChange={(e) =>
                setBrandVoice((prev) => ({
                  tone: prev?.tone || '',
                  style: e.target.value,
                  personality: prev?.personality || '',
                }))
              }
              placeholder="e.g., Direct and confident"
              className="input-glass body-2 w-full"
            />
          </div>
          <div>
            <label className="body-3 mb-spacing-2 block font-medium text-[var(--color-muted-foreground)]">
              Personality
            </label>
            <textarea
              value={brandVoice?.personality || ''}
              onChange={(e) =>
                setBrandVoice((prev) => ({
                  tone: prev?.tone || '',
                  style: prev?.style || '',
                  personality: e.target.value,
                }))
              }
              placeholder="Describe your brand's personality..."
              rows={3}
              className="input-glass body-2 w-full resize-none"
            />
          </div>
        </div>
      </div>
      <div>
        <h3 className="body-1 mb-spacing-2 font-semibold text-[var(--color-foreground)]">
          Brand Values
        </h3>
        <p className="typo-caption mb-spacing-4 text-[var(--color-muted-foreground)]">
          Core values that define your brand.
        </p>
        <div className="space-y-spacing-4">
          <div>
            <label className="body-3 mb-spacing-2 block font-medium text-[var(--color-muted-foreground)]">
              Primary Value
            </label>
            <input
              value={brandValues?.primary || ''}
              onChange={(e) =>
                setBrandValues((prev) => ({
                  primary: e.target.value,
                  secondary: prev?.secondary || [],
                  tagline: prev?.tagline ?? null,
                }))
              }
              placeholder="e.g., Innovation, Trust"
              className="input-glass body-2 w-full"
            />
          </div>
          <div>
            <label className="body-3 mb-spacing-2 block font-medium text-[var(--color-muted-foreground)]">
              Secondary Values
            </label>
            <div className="space-y-spacing-2">
              {(brandValues?.secondary || []).map((val, i) => (
                <div key={i} className="gap-spacing-2 flex items-center">
                  <input
                    value={val}
                    onChange={(e) => {
                      const s = [...(brandValues?.secondary || [])]
                      s[i] = e.target.value
                      setBrandValues((prev) => ({
                        primary: prev?.primary || '',
                        secondary: s,
                        tagline: prev?.tagline ?? null,
                      }))
                    }}
                    placeholder={`Value ${i + 1}`}
                    className="input-glass body-2 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const s = [...(brandValues?.secondary || [])]
                      s.splice(i, 1)
                      setBrandValues((prev) => ({
                        primary: prev?.primary || '',
                        secondary: s,
                        tagline: prev?.tagline ?? null,
                      }))
                    }}
                    className="rounded-spacing-1 flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-muted-foreground)] hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(brandValues?.secondary?.length || 0) < 4 && (
                <button
                  type="button"
                  onClick={() =>
                    setBrandValues((prev) => ({
                      primary: prev?.primary || '',
                      secondary: [...(prev?.secondary || []), ''],
                      tagline: prev?.tagline ?? null,
                    }))
                  }
                  className="gap-spacing-2 px-spacing-3 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-center border border-dashed border-[var(--color-border)] font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]"
                >
                  <Plus className="h-4 w-4" />
                  Add Secondary Value
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="body-3 mb-spacing-2 block font-medium text-[var(--color-muted-foreground)]">
              Tagline
            </label>
            <input
              value={brandValues?.tagline || ''}
              onChange={(e) =>
                setBrandValues((prev) => ({
                  primary: prev?.primary || '',
                  secondary: prev?.secondary || [],
                  tagline: e.target.value || null,
                }))
              }
              placeholder="e.g., Just Do It"
              className="input-glass body-2 w-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
