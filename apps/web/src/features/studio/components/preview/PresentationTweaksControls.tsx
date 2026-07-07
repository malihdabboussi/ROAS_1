'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FontPicker } from '@/features/themes/components/FontPicker'
import { listThemes } from '@/features/themes/services/themes.service'
import type { Theme } from '@/features/themes/types'
import { cn } from '@/lib/utils/cn'
import {
  buildPresentationTweakCss,
  CHROME_PRESETS,
  normalizePresentationTweaks,
  TYPEFACE_PAIRINGS,
  type PresentationChromeOverride,
  type PresentationTweaks,
  type PresentationTypefacePairing,
} from '../../lib/presentation-theme-tweaks'
import { updatePresentation } from '../../services/artifact-preview.service'
import { usePresentationFullModeStore } from '../../store/use-presentation-full-mode-store'
import { usePresentationTweaksChatStore } from '../../store/use-presentation-tweaks-chat-store'
import type { PresentationBundle } from '../../types'
import { PresentationThemePalettePicker } from './PresentationThemePalettePicker'

interface PresentationTweaksControlsProps {
  presentationId: string
  bundle: PresentationBundle | null
}

const PAIRING_OPTIONS: Array<{ id: PresentationTypefacePairing; label: string }> = [
  { id: 'theme', label: 'Theme' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'classical', label: 'Classical' },
  { id: 'modern', label: 'Modern' },
  { id: 'custom', label: 'Custom' },
]

const CHROME_OPTIONS: PresentationChromeOverride[] = ['theme', 'quiet', 'composed', 'maximal']

const CHROME_LABELS: Record<PresentationChromeOverride, string> = {
  theme: 'Theme',
  quiet: CHROME_PRESETS.quiet.label,
  composed: CHROME_PRESETS.composed.label,
  maximal: CHROME_PRESETS.maximal.label,
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (next: T) => void
}) {
  return (
    <div className="bg-hover-subtle rounded-spacing-2 p-spacing-1 gap-spacing-1 flex">
      {options.map((option) => {
        const selected = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'body-3 rounded-spacing-2 py-spacing-1 flex-1 font-medium transition-colors',
              selected
                ? 'surface-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-pressed={selected}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function PresentationTweaksControls({
  presentationId,
  bundle,
}: PresentationTweaksControlsProps) {
  const setLiveThemeCss = usePresentationFullModeStore((s) => s.setLiveThemeCss)
  const setTweaksBundle = usePresentationTweaksChatStore((s) => s.setBundle)
  const [themes, setThemes] = useState<Theme[]>([])
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null)
  const [tweaks, setTweaks] = useState<PresentationTweaks>(() =>
    normalizePresentationTweaks(
      (bundle?.presentation.metadata as Record<string, unknown> | null | undefined)?.tweaks,
    ),
  )
  const saveRequestIdRef = useRef(0)
  const presentationThemeId = bundle?.presentation.theme_id ?? null

  useEffect(() => {
    setTweaks(
      normalizePresentationTweaks(
        (bundle?.presentation.metadata as Record<string, unknown> | null | undefined)?.tweaks,
      ),
    )
  }, [bundle?.presentation.metadata, presentationId])

  useEffect(() => {
    let cancelled = false
    void listThemes()
      .then((list) => {
        if (cancelled) return
        setThemes(list)
        setTweaks((prev) => {
          if (prev.themeId) return prev
          const fallback = presentationThemeId ?? list[0]?.id ?? null
          return { ...prev, themeId: fallback }
        })
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load themes')
      })
    return () => {
      cancelled = true
    }
  }, [presentationThemeId])

  useEffect(() => {
    if (!tweaks.themeId) {
      setActiveTheme(null)
      return
    }
    const listed = themes.find((theme) => theme.id === tweaks.themeId)
    if (listed) {
      setActiveTheme(listed)
      return
    }
    setActiveTheme(null)
  }, [tweaks.themeId, themes])

  useEffect(() => {
    if (tweaks.themeId && activeTheme?.id !== tweaks.themeId) {
      return
    }
    const { css, fontsUrl } = buildPresentationTweakCss(tweaks, activeTheme, {
      applySlideChrome: false,
    })
    setLiveThemeCss(css, fontsUrl)
  }, [tweaks, activeTheme, setLiveThemeCss, themes.length])

  const persist = useCallback(
    (next: PresentationTweaks) => {
      const requestId = saveRequestIdRef.current + 1
      saveRequestIdRef.current = requestId

      void updatePresentation(presentationId, {
        metadata: { tweaks: next },
      })
        .then((updatedPresentation) => {
          if (requestId !== saveRequestIdRef.current || !bundle) return
          const updatedMetadata =
            updatedPresentation.metadata &&
            typeof updatedPresentation.metadata === 'object' &&
            !Array.isArray(updatedPresentation.metadata)
              ? updatedPresentation.metadata
              : {
                  ...((bundle.presentation.metadata as Record<string, unknown> | null) ?? {}),
                  tweaks: next,
                }
          setTweaksBundle({
            ...bundle,
            presentation: {
              ...bundle.presentation,
              ...updatedPresentation,
              metadata: updatedMetadata,
            },
          })
        })
        .catch(() => toast.error('Could not save tweaks'))
    },
    [bundle, presentationId, setTweaksBundle],
  )

  const update = (patch: Partial<PresentationTweaks>) => {
    setTweaks((prev) => {
      const next = { ...prev, ...patch }
      persist(next)
      return next
    })
  }

  const themeHasFonts = Boolean(activeTheme?.font_heading || activeTheme?.font_body)
  const themeHasDesign = Boolean(activeTheme?.design_settings)
  const resolvedHeadingFont =
    tweaks.pairing === 'theme'
      ? (activeTheme?.font_heading ?? 'Default heading')
      : tweaks.pairing === 'custom'
        ? (tweaks.fontHeading ?? 'Custom heading')
        : TYPEFACE_PAIRINGS[tweaks.pairing].heading
  const resolvedBodyFont =
    tweaks.pairing === 'theme'
      ? (activeTheme?.font_body ?? 'Default body')
      : tweaks.pairing === 'custom'
        ? (tweaks.fontBody ?? 'Custom body')
        : TYPEFACE_PAIRINGS[tweaks.pairing].body

  return (
    <div className="gap-spacing-5 flex flex-col">
      <section className="gap-spacing-2 flex flex-col">
        <p className="typo-section-label text-muted-foreground">Theme Source</p>
        <label className="gap-spacing-2 flex flex-col">
          <span className="body-3 text-foreground font-medium">Brand theme</span>
          <PresentationThemePalettePicker
            themes={themes}
            value={tweaks.themeId}
            onChange={(theme) => {
              const hasThemeFonts = Boolean(theme.font_heading || theme.font_body)
              update({
                themeId: theme.id,
                ...(hasThemeFonts
                  ? {
                      pairing: 'custom' as const,
                      fontHeading: theme.font_heading,
                      fontBody: theme.font_body,
                    }
                  : {}),
              })
            }}
          />
        </label>
        {activeTheme ? (
          <p className="typo-caption text-muted-foreground">
            Includes colors, {themeHasFonts ? 'custom fonts' : 'default fonts'}
            {themeHasDesign ? ', and shape + depth' : ', and default shape'}.
          </p>
        ) : null}
      </section>

      <section className="gap-spacing-2 flex flex-col">
        <p className="typo-section-label text-muted-foreground">Customize This Deck</p>
        <span className="body-3 text-foreground font-medium">Typography</span>
        <SegmentedControl
          value={tweaks.pairing}
          options={PAIRING_OPTIONS}
          onChange={(pairing) =>
            update(
              pairing === 'theme'
                ? { pairing, fontHeading: null, fontBody: null }
                : pairing === 'custom'
                  ? { pairing }
                  : {
                      pairing,
                      fontHeading: TYPEFACE_PAIRINGS[pairing].heading,
                      fontBody: TYPEFACE_PAIRINGS[pairing].body,
                    },
            )
          }
        />
        <p className="typo-caption text-muted-foreground">
          Current: {resolvedHeadingFont} / {resolvedBodyFont}
        </p>
        <div className="gap-spacing-2 mt-spacing-1 flex flex-col">
          <label className="gap-spacing-1 flex flex-col">
            <span className="typo-caption text-muted-foreground">Heading font</span>
            <FontPicker
              value={
                tweaks.pairing === 'custom'
                  ? tweaks.fontHeading
                  : tweaks.pairing === 'theme'
                    ? (activeTheme?.font_heading ?? null)
                    : TYPEFACE_PAIRINGS[tweaks.pairing].heading
              }
              onChange={(font) => update({ pairing: 'custom', fontHeading: font })}
            />
          </label>
          <label className="gap-spacing-1 flex flex-col">
            <span className="typo-caption text-muted-foreground">Body font</span>
            <FontPicker
              value={
                tweaks.pairing === 'custom'
                  ? tweaks.fontBody
                  : tweaks.pairing === 'theme'
                    ? (activeTheme?.font_body ?? null)
                    : TYPEFACE_PAIRINGS[tweaks.pairing].body
              }
              onChange={(font) => update({ pairing: 'custom', fontBody: font })}
            />
          </label>
        </div>
      </section>

      <section className="gap-spacing-2 flex flex-col">
        <p className="typo-section-label text-muted-foreground">Shape</p>
        <span className="body-3 text-foreground font-medium">Deck styling</span>
        <SegmentedControl
          value={tweaks.chrome}
          options={CHROME_OPTIONS.map((id) => ({ id, label: CHROME_LABELS[id] }))}
          onChange={(chrome) => update({ chrome })}
        />
      </section>

      <p className="typo-caption text-muted-foreground border-border pt-spacing-3 border-t">
        Theme defaults style the deck. Customizations apply only to this presentation and never
        mutate the shared campaign theme.
      </p>
    </div>
  )
}
