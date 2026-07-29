'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Redo2, Undo2 } from 'lucide-react'
import { PresentationDesignEmptyMockup } from '@/components/artifacts'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { applyPresentationDirectEdit } from '@/features/studio/lib/presentation-direct-edit'
import {
  usePresentationDesignChatStore,
  type PresentationDesignSaveOptions,
} from '@/features/studio/store/use-presentation-design-chat-store'
import { usePresentationFullModeStore } from '@/features/studio/store/use-presentation-full-mode-store'
import type { PresentationBundle, PresentationElementTrace } from '@/features/studio/types'
import { FontPicker, FontWeightPicker } from '@/features/themes/components/FontPicker'
import {
  buildLiveStylePatch,
  cssColorToHexOrDefault,
  formatFontFamilyValue,
  parseEm,
  parseFontFamilyName,
  parseLineHeightRatio,
  parsePx,
  PRESENTATION_FONT_SIZE_OPTIONS,
} from '@/lib/artifacts'
import { cn } from '@/lib/utils/cn'

function DesignSelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="gap-spacing-2 flex flex-col">
      <span className="body-3 text-foreground font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-spacing-9 rounded-spacing-2 border-border bg-background px-spacing-3 body-3 text-foreground focus:ring-ring w-full border outline-none focus:ring-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function DesignSliderRow({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue: string
  onChange: (value: number) => void
}) {
  return (
    <div className="gap-spacing-2 flex flex-col">
      <div className="flex items-center justify-between">
        <span className="body-3 text-foreground font-medium">{label}</span>
        <span className="body-4 text-muted-foreground tabular-nums">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="slider-opacity w-full"
      />
    </div>
  )
}

interface PresentationDesignControlsProps {
  bundle: PresentationBundle | null
  selectedTrace: PresentationElementTrace | null
  onSaveFile: (path: string, content: string, options?: PresentationDesignSaveOptions) => void
}

function PresentationDesignControls({
  bundle,
  selectedTrace,
  onSaveFile,
}: PresentationDesignControlsProps) {
  const setLiveStyles = usePresentationFullModeStore((s) => s.setLiveStyles)
  const [fontFamily, setFontFamily] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState(16)
  const [fontWeight, setFontWeight] = useState('400')
  const [lineHeight, setLineHeight] = useState(120)
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [textColor, setTextColor] = useState('#000000')
  const [textColorMixed, setTextColorMixed] = useState(false)
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [backgroundColorMixed, setBackgroundColorMixed] = useState(false)
  const [padding, setPadding] = useState(0)
  const [margin, setMargin] = useState(0)
  const [borderRadius, setBorderRadius] = useState(0)
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const styleValuesRef = useRef<Record<string, string>>({})
  /** Per-property value at the last persisted save — the undo baseline. */
  const committedValuesRef = useRef<Record<string, string>>({})

  // Dry-run: applyPresentationDirectEdit is pure, so we can check up front
  // whether edits to this element can be mapped to a unique source location.
  const canDirectEdit = useMemo(() => {
    if (!bundle || !selectedTrace) return true
    return applyPresentationDirectEdit(bundle, selectedTrace, {
      type: 'style',
      property: 'color',
      value: 'currentColor',
    }).success
  }, [bundle, selectedTrace])

  useEffect(() => {
    const style = selectedTrace?.computed_style
    const nextFontFamily = parseFontFamilyName(style?.font_family)
    const nextFontSize = parsePx(style?.font_size, 16) || 16
    const nextFontWeight =
      style?.font_weight && /^\d+$/.test(style.font_weight) ? style.font_weight : '400'
    const nextLineHeight = Math.round(
      parseLineHeightRatio(style?.line_height, style?.font_size) * 100,
    )
    const nextLetterSpacing = Math.round(parseEm(style?.letter_spacing, 0) * 100)
    const nextTextColorMixed = style?.color_mixed === true
    const nextBackgroundColorMixed = style?.background_color_mixed === true
    const nextTextColor = nextTextColorMixed
      ? '#000000'
      : cssColorToHexOrDefault(style?.color, '#000000')
    const nextBackgroundColor = nextBackgroundColorMixed
      ? '#ffffff'
      : cssColorToHexOrDefault(style?.background_color, '#ffffff')
    const nextPadding = parsePx(style?.padding, 0)
    const nextMargin = parsePx(style?.margin, 0)
    const nextBorderRadius = parsePx(style?.border_radius, 0)
    const nextWidth = parsePx(style?.width, 0)
    const nextHeight = parsePx(style?.height, 0)

    setFontFamily(nextFontFamily)
    setFontSize(nextFontSize)
    setFontWeight(nextFontWeight)
    setLineHeight(nextLineHeight)
    setLetterSpacing(nextLetterSpacing)
    setTextColorMixed(nextTextColorMixed)
    setBackgroundColorMixed(nextBackgroundColorMixed)
    setTextColor(nextTextColor)
    setBackgroundColor(nextBackgroundColor)
    setPadding(nextPadding)
    setMargin(nextMargin)
    setBorderRadius(nextBorderRadius)
    setWidth(nextWidth)
    setHeight(nextHeight)
    styleValuesRef.current = {
      'font-family': formatFontFamilyValue(nextFontFamily),
      'font-size': `${nextFontSize}px`,
      'font-weight': nextFontWeight,
      'line-height': String(nextLineHeight / 100),
      'letter-spacing': `${nextLetterSpacing / 100}em`,
      ...(nextTextColorMixed ? {} : { color: nextTextColor }),
      ...(nextBackgroundColorMixed ? {} : { 'background-color': nextBackgroundColor }),
      padding: `${nextPadding}px`,
      margin: `${nextMargin}px`,
      'border-radius': `${nextBorderRadius}px`,
      width: `${nextWidth}px`,
      height: `${nextHeight}px`,
    }
    committedValuesRef.current = { ...styleValuesRef.current }
    setError(null)
    setLiveStyles(null)
  }, [selectedTrace, setLiveStyles])

  const syncLivePreview = (styles: Record<string, string | null | undefined>) => {
    const patch = buildLiveStylePatch(styles)
    if (Object.keys(patch).length === 0) {
      setLiveStyles(null)
      return
    }
    setLiveStyles(patch)
  }

  const revertLivePreview = (property: string, committedValue: string | undefined) => {
    if (!committedValue || !bundle) return
    styleValuesRef.current[property] = committedValue
    window.dispatchEvent(
      new CustomEvent('presentation-editor:apply-live-styles', {
        detail: {
          presentationId: bundle.presentation.id,
          domPath: selectedTrace?.dom_path ?? null,
          styles: buildLiveStylePatch({ [property]: committedValue }),
        },
      }),
    )
  }

  const queueSave = (property: string, value: string, liveValue: string) => {
    const existing = saveTimersRef.current[property]
    if (existing) clearTimeout(existing)
    saveTimersRef.current[property] = setTimeout(() => {
      if (!bundle) return
      // Undo baseline = the last persisted value, not the previous slider tick.
      const committedValue = committedValuesRef.current[property]
      const result = applyPresentationDirectEdit(bundle, selectedTrace, {
        type: 'style',
        property,
        value,
      })
      if (!result.success) {
        setError(result.error)
        // Keep the slide consistent with what is actually saved.
        revertLivePreview(property, committedValue)
        return
      }
      setError(null)
      committedValuesRef.current[property] = liveValue
      onSaveFile(result.path, result.content, {
        domPath: selectedTrace?.dom_path ?? null,
        undoStyles: buildLiveStylePatch({ [property]: committedValue }),
        redoStyles: buildLiveStylePatch({ [property]: liveValue }),
      })
    }, 450)
  }

  const updateStyle = (property: string, value: string, liveValue?: string) => {
    const nextLiveValue = liveValue ?? value
    styleValuesRef.current[property] = nextLiveValue
    syncLivePreview({ [property]: nextLiveValue })
    queueSave(property, value, nextLiveValue)
  }

  useEffect(() => {
    return () => {
      Object.values(saveTimersRef.current).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const fontSizeOptions = PRESENTATION_FONT_SIZE_OPTIONS.map((size) => ({
    value: String(size),
    label: `${size}px`,
  }))

  if (!selectedTrace) {
    return (
      <div className="gap-spacing-6 flex flex-1 flex-col items-center justify-center text-center">
        <PresentationDesignEmptyMockup />
        <p className="body-3 text-muted-foreground max-w-xs">
          Click an element on the slide to edit typography, colors, spacing, and size.
        </p>
      </div>
    )
  }

  return (
    <div className="gap-spacing-4 flex flex-col">
      <div className="surface-card border-border rounded-spacing-3 p-spacing-3 border">
        <p className="typo-caption text-muted-foreground">Selected element</p>
        <p className="body-3 text-foreground mt-spacing-1 truncate">
          {selectedTrace.tag_chain.at(-1) ?? selectedTrace.dom_path}
        </p>
        {selectedTrace.text_snapshot ? (
          <p className="typo-caption text-muted-foreground mt-spacing-1 line-clamp-2">
            {selectedTrace.text_snapshot}
          </p>
        ) : null}
      </div>

      {!canDirectEdit ? (
        <div className="rounded-spacing-2 border-border bg-hover-subtle px-spacing-3 py-spacing-2 border">
          <p className="body-3 text-muted-foreground">
            This element can&apos;t be matched to a unique spot in the slide source, so direct edits
            wouldn&apos;t save. Ask Pixel to change it instead.
          </p>
        </div>
      ) : null}

      <fieldset
        disabled={!canDirectEdit}
        className={cn(
          'gap-spacing-4 flex min-w-0 flex-col border-0 p-0',
          !canDirectEdit && 'pointer-events-none opacity-50',
        )}
      >
        <div className="gap-spacing-3 flex flex-col">
          <p className="typo-section-label text-muted-foreground">Typography</p>
          <label className="gap-spacing-2 flex flex-col">
            <span className="body-3 text-foreground font-medium">Font family</span>
            <FontPicker
              value={fontFamily}
              onChange={(next) => {
                setFontFamily(next)
                updateStyle('font-family', formatFontFamilyValue(next))
              }}
            />
          </label>
          <DesignSelectRow
            label="Font size"
            value={String(fontSize)}
            onChange={(next) => {
              const px = Number(next)
              setFontSize(px)
              updateStyle('font-size', `${px}px`)
            }}
            options={fontSizeOptions}
          />
          <label className="gap-spacing-2 flex flex-col">
            <span className="body-3 text-foreground font-medium">Font weight</span>
            <FontWeightPicker
              value={fontWeight}
              onChange={(next) => {
                setFontWeight(next)
                updateStyle('font-weight', next)
              }}
            />
          </label>
          <DesignSliderRow
            label="Line height"
            value={lineHeight}
            min={80}
            max={200}
            step={1}
            displayValue={(lineHeight / 100).toFixed(2)}
            onChange={(next) => {
              setLineHeight(next)
              updateStyle('line-height', String(next / 100))
            }}
          />
          <DesignSliderRow
            label="Letter spacing"
            value={letterSpacing}
            min={-50}
            max={200}
            step={1}
            displayValue={`${(letterSpacing / 100).toFixed(2)}em`}
            onChange={(next) => {
              setLetterSpacing(next)
              updateStyle('letter-spacing', `${next / 100}em`)
            }}
          />
        </div>

        <div className="gap-spacing-3 flex flex-col">
          <p className="typo-section-label text-muted-foreground">Colors</p>
          <ColorPicker
            label="Text color"
            value={textColor}
            isMixed={textColorMixed}
            onChange={(next) => {
              setTextColorMixed(false)
              setTextColor(next)
              updateStyle('color', next)
            }}
          />
          <ColorPicker
            label="Background"
            value={backgroundColor}
            isMixed={backgroundColorMixed}
            onChange={(next) => {
              setBackgroundColorMixed(false)
              setBackgroundColor(next)
              updateStyle('background-color', next)
            }}
          />
        </div>

        <div className="gap-spacing-3 flex flex-col">
          <p className="typo-section-label text-muted-foreground">Spacing</p>
          <DesignSliderRow
            label="Padding"
            value={padding}
            min={0}
            max={120}
            step={1}
            displayValue={`${padding}px`}
            onChange={(next) => {
              setPadding(next)
              updateStyle('padding', `${next}px`)
            }}
          />
          <DesignSliderRow
            label="Margin"
            value={margin}
            min={0}
            max={120}
            step={1}
            displayValue={`${margin}px`}
            onChange={(next) => {
              setMargin(next)
              updateStyle('margin', `${next}px`)
            }}
          />
          <DesignSliderRow
            label="Corner radius"
            value={borderRadius}
            min={0}
            max={120}
            step={1}
            displayValue={`${borderRadius}px`}
            onChange={(next) => {
              setBorderRadius(next)
              updateStyle('border-radius', `${next}px`)
            }}
          />
        </div>

        <div className="gap-spacing-3 flex flex-col">
          <p className="typo-section-label text-muted-foreground">Size</p>
          <DesignSliderRow
            label="Width"
            value={width}
            min={0}
            max={1200}
            step={1}
            displayValue={`${width}px`}
            onChange={(next) => {
              setWidth(next)
              updateStyle('width', `${next}px`)
            }}
          />
          <DesignSliderRow
            label="Height"
            value={height}
            min={0}
            max={1200}
            step={1}
            displayValue={`${height}px`}
            onChange={(next) => {
              setHeight(next)
              updateStyle('height', `${next}px`)
            }}
          />
        </div>
      </fieldset>

      {error ? (
        <div className="rounded-spacing-2 border-destructive bg-destructive/10 px-spacing-3 py-spacing-2 border">
          <p className="body-3 text-destructive">{error}</p>
        </div>
      ) : null}
    </div>
  )
}

interface PresentationDesignChatViewProps {
  presentationName: string
  bundle: PresentationBundle | null
  selectedTrace: PresentationElementTrace | null
  onSaveFile: (path: string, content: string, options?: PresentationDesignSaveOptions) => void
  onBack: () => void
}

export function PresentationDesignChatView({
  presentationName,
  bundle,
  selectedTrace,
  onSaveFile,
  onBack,
}: PresentationDesignChatViewProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const undoStackLength = usePresentationDesignChatStore((s) => s.undoStack.length)
  const redoStackLength = usePresentationDesignChatStore((s) => s.redoStack.length)
  const undoDesignEdit = usePresentationDesignChatStore((s) => s.undo)
  const redoDesignEdit = usePresentationDesignChatStore((s) => s.redo)
  const canUndo = undoStackLength > 0
  const canRedo = redoStackLength > 0

  // Cmd/Ctrl+Z (+Shift = redo) while the Design panel is open — from the app
  // window directly, and forwarded by the bridge when focus is in the slide iframe.
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      return Boolean(
        el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable),
      )
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      if (event.shiftKey) redoDesignEdit()
      else undoDesignEdit()
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; direction?: string } | null
      if (data?.type !== 'presentation:history') return
      if (data.direction === 'redo') redoDesignEdit()
      else undoDesignEdit()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('message', onMessage)
    }
  }, [redoDesignEdit, undoDesignEdit])

  const historyButtonClass =
    'text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 hover:bg-hover-subtle flex shrink-0 items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40'

  return (
    <div className="surface-bg flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="border-border pt-spacing-2 pb-spacing-1 relative shrink-0 border-b px-3 md:px-4">
        <div className="gap-spacing-2 mx-auto flex w-full max-w-3xl items-center">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 hover:bg-hover-subtle flex shrink-0 items-center justify-center transition-colors"
            aria-label="Back to conversation"
            title="Back to conversation"
          >
            <ArrowLeft className="icon-sm" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="body-2 text-foreground font-semibold">Design</p>
            <p className="body-4 text-muted-foreground truncate">{presentationName}</p>
          </div>
          <div className="gap-spacing-1 flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => undoDesignEdit()}
              disabled={!canUndo}
              className={historyButtonClass}
              aria-label="Undo design edit"
              title="Undo"
            >
              <Undo2 className="icon-sm" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => redoDesignEdit()}
              disabled={!canRedo}
              className={historyButtonClass}
              aria-label="Redo design edit"
              title="Redo"
            >
              <Redo2 className="icon-sm" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 md:px-4">
        <div
          className={cn(
            'mx-auto w-full max-w-3xl',
            selectedTrace ? 'py-spacing-4' : 'flex min-h-full flex-col',
          )}
        >
          <PresentationDesignControls
            bundle={bundle}
            selectedTrace={selectedTrace}
            onSaveFile={onSaveFile}
          />
        </div>
      </div>

      <div className="border-border py-spacing-3 shrink-0 border-t px-3 md:px-4">
        <p className="typo-caption text-muted-foreground mx-auto w-full max-w-3xl text-center">
          Edits apply live on the slide and save automatically.
        </p>
      </div>
    </div>
  )
}
