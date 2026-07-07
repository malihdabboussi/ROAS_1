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
import { updateFunnel } from '../../services/artifact-preview.service'
import { useFunnelFullModeStore } from '../../store/use-funnel-full-mode-store'
import { useFunnelTweaksChatStore } from '../../store/use-funnel-tweaks-chat-store'
import { PresentationThemePalettePicker } from './PresentationThemePalettePicker'

interface FunnelTweaksControlsProps {
  funnelId: string
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

export function FunnelTweaksControls({ funnelId }: FunnelTweaksControlsProps) {
  const setLiveThemeCss = useFunnelFullModeStore((s) => s.setLiveThemeCss)
  const tweaksContext = useFunnelTweaksChatStore((s) => s.tweaksContext)
  const setTweaksContext = useFunnelTweaksChatStore((s) => s.setTweaksContext)
  const [themes, setThemes] = useState<Theme[]>([])
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null)
  const [tweaks, setTweaks] = useState<PresentationTweaks>(() =>
    normalizePresentationTweaks(tweaksContext?.metadata?.tweaks),
  )
  const saveRequestIdRef = useRef(0)
  const funnelThemeId = tweaksContext?.themeId ?? null

  useEffect(() => {
    setTweaks(normalizePresentationTweaks(tweaksContext?.metadata?.tweaks))
  }, [funnelId, tweaksContext?.metadata])

  useEffect(() => {
    let cancelled = false
    void listThemes()
      .then((list) => {
        if (cancelled) return
        setThemes(list)
        setTweaks((prev) => {
          if (prev.themeId) return prev
          const fallback = funnelThemeId ?? list[0]?.id ?? null
          return { ...prev, themeId: fallback }
        })
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load themes')
      })
    return () => {
      cancelled = true
    }
  }, [funnelThemeId])

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
    const { css, fontsUrl } = buildPresentationTweakCss(tweaks, activeTheme)
    // #region agent log
    fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'bd981c' },
      body: JSON.stringify({
        sessionId: 'bd981c',
        hypothesisId: 'H4',
        location: 'FunnelTweaksControls.tsx:setLiveThemeCss',
        message: 'live theme css computed',
        data: {
          funnelId,
          themeId: tweaks.themeId,
          cssLen: css.length,
          hasFontsUrl: Boolean(fontsUrl),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    setLiveThemeCss(css, fontsUrl)
  }, [tweaks, activeTheme, setLiveThemeCss, themes.length, funnelId])

  const persist = useCallback(
    (next: PresentationTweaks) => {
      const requestId = saveRequestIdRef.current + 1
      saveRequestIdRef.current = requestId
      const baseMetadata = tweaksContext?.metadata ?? {}

      void updateFunnel(funnelId, {
        metadata: { ...baseMetadata, tweaks: next },
      })
        .then((updatedFunnel) => {
          if (requestId !== saveRequestIdRef.current) return
          setTweaksContext({
            themeId: updatedFunnel.theme_id ?? funnelThemeId,
            metadata: updatedFunnel.metadata ?? { tweaks: next },
          })
        })
        .catch(() => toast.error('Could not save tweaks'))
    },
    [funnelId, funnelThemeId, setTweaksContext, tweaksContext?.metadata],
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
        <p className="typo-section-label text-muted-foreground">Customize This Page</p>
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
        <span className="body-3 text-foreground font-medium">Page styling</span>
        <SegmentedControl
          value={tweaks.chrome}
          options={CHROME_OPTIONS.map((id) => ({ id, label: CHROME_LABELS[id] }))}
          onChange={(chrome) => update({ chrome })}
        />
      </section>

      <p className="typo-caption text-muted-foreground border-border pt-spacing-3 border-t">
        Theme defaults style the page. Customizations apply only to this funnel and never mutate the
        shared campaign theme.
      </p>
    </div>
  )
}
