'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ColorPicker } from '@/components/ui/ColorPicker'
import {
  applyFunnelDirectEdit,
  buildLiveStylePatch,
  cssColorToHexOrDefault,
  formatFontFamilyValue,
  parseEm,
  parseFontFamilyName,
  parseLineHeightRatio,
  parsePx,
  PRESENTATION_FONT_SIZE_OPTIONS,
  type FunnelDirectEditPatch,
  type FunnelElementTrace,
  type FunnelPageBundle,
} from '@/lib/artifacts'
import { FunnelDesignContentControls } from './FunnelDesignContentControls'
import { FunnelDesignSelectRow, FunnelDesignSliderRow } from './FunnelDesignControlRows'
import { PresentationDesignEmptyMockup } from './PresentationDesignEmptyMockup'

interface FunnelDesignSaveOptions {
  funnelPageId?: string | null
  domPath?: string | null
  undoStyles?: Record<string, string> | null
  redoStyles?: Record<string, string> | null
}

interface FunnelDesignControlsProps {
  bundle: FunnelPageBundle | null
  selectedTrace: FunnelElementTrace | null
  onSaveFile: (path: string, content: string, options?: FunnelDesignSaveOptions) => void
  onLiveStylesChange: (styles: Record<string, string> | null) => void
  onSelectedTraceChange: (trace: FunnelElementTrace | null) => void
}

function dispatchLiveContent(
  trace: FunnelElementTrace,
  content: { text?: string; attributes?: Record<string, string> },
) {
  window.dispatchEvent(
    new CustomEvent('funnel-editor:apply-live-content', {
      detail: {
        funnelId: trace.funnel_id,
        domPath: trace.dom_path,
        ...content,
      },
    }),
  )
}

function updateWorkingBundle(
  bundle: FunnelPageBundle,
  path: string,
  content: string,
): FunnelPageBundle {
  return {
    ...bundle,
    files: bundle.files.map((file) => (file.path === path ? { ...file, content } : file)),
    shared_files: bundle.shared_files.map((file) =>
      file.path === path ? { ...file, content } : file,
    ),
  }
}

export function FunnelDesignControls({
  bundle,
  selectedTrace,
  onSaveFile,
  onLiveStylesChange,
  onSelectedTraceChange,
}: FunnelDesignControlsProps) {
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
  const [textValue, setTextValue] = useState('')
  const [altValue, setAltValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const styleValuesRef = useRef<Record<string, string>>({})
  const workingBundleRef = useRef(bundle)
  const workingTraceRef = useRef(selectedTrace)

  const selectedTag = selectedTrace?.tag_chain.at(-1)?.toLowerCase() ?? null
  const canEditText = Boolean(
    selectedTrace?.text_snapshot &&
    selectedTrace.source_hint?.includes(selectedTrace.text_snapshot) &&
    selectedTag !== 'img',
  )

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

    setFontFamily(nextFontFamily)
    setFontSize(nextFontSize)
    setFontWeight(nextFontWeight)
    setLineHeight(nextLineHeight)
    setLetterSpacing(nextLetterSpacing)
    setTextColorMixed(nextTextColorMixed)
    setBackgroundColorMixed(nextBackgroundColorMixed)
    setTextColor(nextTextColor)
    setBackgroundColor(nextBackgroundColor)
    setPadding(parsePx(style?.padding, 0))
    setMargin(parsePx(style?.margin, 0))
    setBorderRadius(parsePx(style?.border_radius, 0))
    setWidth(parsePx(style?.width, 0))
    setHeight(parsePx(style?.height, 0))
    setTextValue(selectedTrace?.text_snapshot ?? '')
    setAltValue(selectedTrace?.attributes?.alt ?? '')
    styleValuesRef.current = {
      'font-family': formatFontFamilyValue(nextFontFamily),
      'font-size': `${nextFontSize}px`,
      'font-weight': nextFontWeight,
      'line-height': String(nextLineHeight / 100),
      'letter-spacing': `${nextLetterSpacing / 100}em`,
    }
    setError(null)
    workingBundleRef.current = bundle
    workingTraceRef.current = selectedTrace
    onLiveStylesChange(null)
  }, [bundle, onLiveStylesChange, selectedTrace])

  const persistPatch = (patch: FunnelDirectEditPatch): boolean => {
    const activeBundle = workingBundleRef.current
    const activeTrace = workingTraceRef.current
    if (!activeBundle || !activeTrace) return false
    const result = applyFunnelDirectEdit(activeBundle, activeTrace, patch)
    if (!result.success) {
      setError(result.error)
      return false
    }
    setError(null)
    workingBundleRef.current = updateWorkingBundle(activeBundle, result.path, result.content)
    onSaveFile(result.path, result.content, { funnelPageId: result.funnelPageId })
    const nextTrace = {
      ...activeTrace,
      ...(patch.type === 'text' ? { text_snapshot: patch.value } : {}),
      ...(patch.type === 'attribute'
        ? {
            attributes: {
              src: activeTrace.attributes?.src ?? null,
              alt: activeTrace.attributes?.alt ?? null,
              href: activeTrace.attributes?.href ?? null,
              [patch.name]: patch.value,
            },
          }
        : {}),
      source_hint: result.sourceHint,
    }
    workingTraceRef.current = nextTrace
    onSelectedTraceChange(nextTrace)
    return true
  }

  const queueStyleSave = (
    property: string,
    value: string,
    nextLiveValue: string,
    previousLiveValue: string | undefined,
  ) => {
    const existing = saveTimersRef.current[property]
    if (existing) clearTimeout(existing)
    saveTimersRef.current[property] = setTimeout(() => {
      const activeBundle = workingBundleRef.current
      const activeTrace = workingTraceRef.current
      if (!activeBundle || !activeTrace) return
      const result = applyFunnelDirectEdit(activeBundle, activeTrace, {
        type: 'style',
        property,
        value,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      setError(null)
      workingBundleRef.current = updateWorkingBundle(activeBundle, result.path, result.content)
      onSaveFile(result.path, result.content, {
        funnelPageId: result.funnelPageId,
        domPath: activeTrace.dom_path,
        undoStyles: buildLiveStylePatch({ [property]: previousLiveValue }),
        redoStyles: buildLiveStylePatch({ [property]: nextLiveValue }),
      })
      const nextTrace = { ...activeTrace, source_hint: result.sourceHint }
      workingTraceRef.current = nextTrace
      onSelectedTraceChange(nextTrace)
    }, 450)
  }

  const updateStyle = (property: string, value: string, liveValue = value) => {
    const previousLiveValue = styleValuesRef.current[property]
    styleValuesRef.current[property] = liveValue
    onLiveStylesChange(buildLiveStylePatch({ [property]: liveValue }))
    queueStyleSave(property, value, liveValue, previousLiveValue)
  }

  useEffect(
    () => () => Object.values(saveTimersRef.current).forEach((timer) => clearTimeout(timer)),
    [],
  )

  const fontSizeOptions = useMemo(
    () =>
      PRESENTATION_FONT_SIZE_OPTIONS.map((size) => ({
        value: String(size),
        label: `${size}px`,
      })),
    [],
  )

  if (!selectedTrace) {
    return (
      <div className="gap-spacing-6 flex flex-1 flex-col items-center justify-center text-center">
        <PresentationDesignEmptyMockup />
        <p className="body-3 text-muted-foreground max-w-xs">
          Click anything on the page to edit its content and design.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="gap-spacing-4 flex flex-col">
        <div className="surface-card border-border rounded-spacing-3 p-spacing-3 border">
          <p className="typo-caption text-muted-foreground">Selected element</p>
          <p className="body-3 text-foreground mt-spacing-1 truncate">
            {selectedTag ?? selectedTrace.dom_path}
          </p>
        </div>

        <FunnelDesignContentControls
          selectedTrace={selectedTrace}
          selectedTag={selectedTag}
          canEditText={canEditText}
          textValue={textValue}
          altValue={altValue}
          onTextValueChange={setTextValue}
          onAltValueChange={setAltValue}
          onLiveContent={(content) => dispatchLiveContent(selectedTrace, content)}
          onPersistPatch={persistPatch}
        />

        <div className="gap-spacing-3 flex flex-col">
          <p className="typo-section-label text-muted-foreground">Typography</p>
          <FunnelDesignSelectRow
            label="Font family"
            value={fontFamily ?? ''}
            onChange={(next) => {
              const value = next || null
              setFontFamily(value)
              updateStyle('font-family', formatFontFamilyValue(value))
            }}
            options={[
              { value: '', label: 'Theme default' },
              { value: 'Inter', label: 'Inter' },
              { value: 'Manrope', label: 'Manrope' },
              { value: 'DM Sans', label: 'DM Sans' },
              { value: 'Space Grotesk', label: 'Space Grotesk' },
              { value: 'Playfair Display', label: 'Playfair Display' },
              { value: 'Libre Baskerville', label: 'Libre Baskerville' },
            ]}
          />
          <FunnelDesignSelectRow
            label="Font size"
            value={String(fontSize)}
            onChange={(next) => {
              const px = Number(next)
              setFontSize(px)
              updateStyle('font-size', `${px}px`)
            }}
            options={fontSizeOptions}
          />
          <FunnelDesignSelectRow
            label="Font weight"
            value={fontWeight}
            onChange={(next) => {
              setFontWeight(next)
              updateStyle('font-weight', next)
            }}
            options={[
              { value: '400', label: 'Regular' },
              { value: '500', label: 'Medium' },
              { value: '600', label: 'Semibold' },
              { value: '700', label: 'Bold' },
            ]}
          />
          <FunnelDesignSliderRow
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
          <FunnelDesignSliderRow
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
          <p className="typo-section-label text-muted-foreground">Layout</p>
          {[
            ['Padding', padding, setPadding, 'padding', 120],
            ['Margin', margin, setMargin, 'margin', 120],
            ['Corner radius', borderRadius, setBorderRadius, 'border-radius', 120],
            ['Width', width, setWidth, 'width', 1200],
            ['Height', height, setHeight, 'height', 1200],
          ].map(([label, value, setter, property, max]) => (
            <FunnelDesignSliderRow
              key={String(property)}
              label={String(label)}
              value={value as number}
              min={0}
              max={max as number}
              step={1}
              displayValue={`${value}px`}
              onChange={(next) => {
                ;(setter as (value: number) => void)(next)
                updateStyle(String(property), `${next}px`)
              }}
            />
          ))}
        </div>

        {error ? (
          <div className="rounded-spacing-2 border-destructive bg-destructive/10 px-spacing-3 py-spacing-2 border">
            <p className="body-3 text-destructive">{error}</p>
          </div>
        ) : null}
      </div>
    </>
  )
}
