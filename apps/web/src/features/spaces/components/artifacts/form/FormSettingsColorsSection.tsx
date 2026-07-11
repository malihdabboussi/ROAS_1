import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Plus } from 'lucide-react'
import { ColorPickerPanelStandalone } from '@/components/ui/ColorPicker'
import type { FormSettings } from '@/lib/forms'
import {
  glassSwatchStyle,
  PRESET_HEX,
  swatchVisualStyle,
  TAG_COLORS,
} from '@/lib/ui/field-color-presets'
import { cn } from '@/lib/utils/cn'
import { FieldRow, PanelSection } from './FormSettingsPanelPrimitives'

type FormColorKey = 'background' | 'surface' | 'text' | 'input' | 'button'
type FormColorStyleKey = Exclude<FormColorKey, 'text'>
type FormColorStyle = 'glass' | 'solid'

export function FormSettingsColorsSection({
  settings,
  update,
}: {
  settings: FormSettings
  update: (patch: Partial<FormSettings>) => void
}) {
  return (
    <PanelSection title="Colors">
      <FieldRow label="Theme">
        <div className="gap-spacing-2 grid grid-cols-2">
          {(['light', 'dark'] as const).map((theme) => {
            const active = (settings.theme ?? 'light') === theme
            return (
              <button
                key={theme}
                type="button"
                onClick={() => update({ theme })}
                className={cn(
                  'button-default',
                  active ? 'button-glass-purple' : 'button-glass-neutral',
                )}
              >
                {theme === 'light' ? 'Light' : 'Dark'}
              </button>
            )
          })}
        </div>
      </FieldRow>

      <FieldRow label="Page background">
        <ColorSwatchGrid
          theme={settings.theme ?? 'light'}
          value={readColor(settings.colors, 'background')}
          styleOverride={readColorStyle(settings.colors, 'background')}
          onStyleChange={(next) =>
            update({ colors: patchColorStyle(settings.colors, 'background', next) })
          }
          onChange={(next) => update({ colors: { ...(settings.colors ?? {}), background: next } })}
        />
      </FieldRow>

      <FieldRow label="Form background">
        <ColorSwatchGrid
          theme={settings.theme ?? 'light'}
          value={readColor(settings.colors, 'surface')}
          styleOverride={readColorStyle(settings.colors, 'surface')}
          onStyleChange={(next) =>
            update({ colors: patchColorStyle(settings.colors, 'surface', next) })
          }
          onChange={(next) => update({ colors: { ...(settings.colors ?? {}), surface: next } })}
        />
      </FieldRow>

      <FieldRow label="Form text">
        <ColorSwatchGrid
          theme={settings.theme ?? 'light'}
          value={readColor(settings.colors, 'text')}
          onChange={(next) => update({ colors: { ...(settings.colors ?? {}), text: next } })}
        />
      </FieldRow>

      <FieldRow label="Input fields">
        <ColorSwatchGrid
          theme={settings.theme ?? 'light'}
          value={readColor(settings.colors, 'input')}
          styleOverride={readColorStyle(settings.colors, 'input')}
          onStyleChange={(next) =>
            update({ colors: patchColorStyle(settings.colors, 'input', next) })
          }
          onChange={(next) => update({ colors: { ...(settings.colors ?? {}), input: next } })}
        />
      </FieldRow>

      <FieldRow label="Buttons">
        <ColorSwatchGrid
          theme={settings.theme ?? 'light'}
          value={readColor(settings.colors, 'button')}
          styleOverride={readColorStyle(settings.colors, 'button')}
          onStyleChange={(next) =>
            update({ colors: patchColorStyle(settings.colors, 'button', next) })
          }
          onChange={(next) => update({ colors: { ...(settings.colors ?? {}), button: next } })}
        />
      </FieldRow>
    </PanelSection>
  )
}

function readColor(colors: FormSettings['colors'], key: FormColorKey): string | null {
  if (!colors || typeof colors !== 'object') return null
  const raw = (colors as Record<string, unknown>)[key]
  return typeof raw === 'string' && raw.trim() ? raw : null
}

function readColorStyle(
  colors: FormSettings['colors'],
  key: FormColorStyleKey,
): FormColorStyle | null {
  if (!colors || typeof colors !== 'object') return null
  const styles = (colors as Record<string, unknown>).styles
  if (!styles || typeof styles !== 'object') return null
  const value = (styles as Record<string, unknown>)[key]
  return value === 'glass' || value === 'solid' ? value : null
}

function patchColorStyle(
  colors: FormSettings['colors'] | undefined,
  key: FormColorStyleKey,
  next: FormColorStyle | null,
): Record<string, unknown> {
  const base = (colors ?? {}) as Record<string, unknown>
  const stylesRaw = base.styles
  const styles =
    stylesRaw && typeof stylesRaw === 'object' ? { ...(stylesRaw as Record<string, unknown>) } : {}
  if (next == null) {
    delete styles[key]
  } else {
    styles[key] = next
  }
  return { ...base, styles }
}

// Form color picker swatches are user-selected color data, not theme chrome.
const FORM_EXTRA_PRESETS: { id: string; label: string; hex: string }[] = [
  { id: '#000000', label: 'Black', hex: '#000000' },
  { id: '#ffffff', label: 'White', hex: '#ffffff' },
]

function isCustomColor(value: string | null): boolean {
  if (!value) return false
  if (value.startsWith('linear-gradient')) return true
  if (value.startsWith('#')) {
    const hex = value.toLowerCase()
    if (FORM_EXTRA_PRESETS.some((p) => p.hex.toLowerCase() === hex)) return false
    return !Object.values(PRESET_HEX).some((preset) => preset.toLowerCase() === hex)
  }
  return false
}

function ColorSwatchGrid({
  value,
  onChange,
  theme,
  styleOverride,
  onStyleChange,
}: {
  value: string | null
  onChange: (next: string | null) => void
  theme: 'light' | 'dark'
  /** When set, overrides the theme-derived glass/solid choice for this slot. */
  styleOverride?: FormColorStyle | null
  /** When provided, renders a small Glass / Solid toggle above the swatches. */
  onStyleChange?: (next: FormColorStyle | null) => void
}) {
  const themeDefault: FormColorStyle = theme === 'dark' ? 'glass' : 'solid'
  const variant: FormColorStyle = styleOverride ?? themeDefault
  const plusBtnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null)
  const customValue = isCustomColor(value) ? value : null
  const customSelected = Boolean(customValue && value === customValue)

  useEffect(() => {
    if (!pickerOpen) return
    const place = () => {
      const el = plusBtnRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const panelWidth = 320
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - panelWidth - 8)
      setPickerPos({ top: rect.bottom + 6, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [pickerOpen])

  useEffect(() => {
    if (!pickerOpen) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (panelRef.current?.contains(target)) return
      if (plusBtnRef.current?.contains(target)) return
      setPickerOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pickerOpen])

  return (
    <div className="space-y-spacing-2">
      {onStyleChange ? (
        <div className="flex justify-end">
          <div className="border-border typo-caption gap-spacing-1 p-spacing-0-5 flex items-center rounded-full border font-medium uppercase">
            {(['glass', 'solid'] as const).map((opt) => {
              const active = variant === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onStyleChange(opt === themeDefault ? null : opt)}
                  className={cn(
                    'px-spacing-2 p-spacing-0-5 rounded-full transition-colors',
                    active
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-pressed={active}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="gap-spacing-1 grid grid-cols-9">
        {TAG_COLORS.map((color) => {
          const hex = PRESET_HEX[color.id] ?? '#6366f1'
          const selected = value === color.id
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(selected ? null : color.id)}
              title={color.label}
              aria-label={color.label}
              aria-pressed={selected}
              className={cn(
                'h-spacing-7 group relative flex aspect-square items-center justify-center overflow-hidden rounded-full transition-transform hover:scale-110',
                selected && 'ring-foreground ring-offset-background ring-1 ring-offset-1',
              )}
              style={
                variant === 'glass'
                  ? glassSwatchStyle(hex)
                  : { backgroundColor: hex, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }
              }
            >
              {selected ? (
                <Check
                  className={cn('icon-sm', variant === 'glass' ? 'text-foreground' : 'text-white')}
                />
              ) : null}
            </button>
          )
        })}

        {FORM_EXTRA_PRESETS.map((color) => {
          const selected = value === color.id
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(selected ? null : color.id)}
              title={color.label}
              aria-label={color.label}
              aria-pressed={selected}
              className={cn(
                'h-spacing-7 group relative flex aspect-square items-center justify-center overflow-hidden rounded-full transition-transform hover:scale-110',
                selected && 'ring-foreground ring-offset-background ring-1 ring-offset-1',
              )}
              style={{
                backgroundColor: color.hex,
                boxShadow:
                  color.hex === '#ffffff'
                    ? 'inset 0 0 0 1px rgba(0,0,0,0.15)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              {selected ? (
                <Check
                  className={cn('icon-sm', color.hex === '#ffffff' ? 'text-black' : 'text-white')}
                />
              ) : null}
            </button>
          )
        })}

        {customValue ? (
          <button
            key="custom-current"
            type="button"
            onClick={() => onChange(customSelected ? null : customValue)}
            title="Custom color"
            aria-label="Custom color"
            aria-pressed={customSelected}
            className={cn(
              'h-spacing-7 group relative flex aspect-square items-center justify-center overflow-hidden rounded-full transition-transform hover:scale-110',
              customSelected && 'ring-foreground ring-offset-background ring-1 ring-offset-1',
            )}
            style={swatchVisualStyle(customValue)}
          >
            {customSelected ? <Check className="icon-sm text-white" /> : null}
          </button>
        ) : null}

        <button
          key="add-custom"
          ref={plusBtnRef}
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          title="Custom color"
          aria-label="Add custom color"
          aria-pressed={pickerOpen}
          className={cn(
            'border-border text-muted-foreground hover:border-foreground hover:text-foreground h-spacing-7 flex aspect-square items-center justify-center rounded-full border border-dashed transition-colors',
            pickerOpen && 'border-foreground text-foreground',
          )}
        >
          <Plus className="icon-sm" />
        </button>

        {pickerOpen && pickerPos && typeof document !== 'undefined'
          ? createPortal(
              <div
                ref={panelRef}
                data-form-color-picker
                className="z-dropdown fixed"
                style={{ top: pickerPos.top, left: pickerPos.left }}
              >
                <ColorPickerPanelStandalone
                  value={customValue ?? '#6366f1'}
                  onChange={(next) => onChange(next)}
                  allowGradient
                />
              </div>,
              document.body,
            )
          : null}
      </div>
    </div>
  )
}
