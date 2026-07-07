'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { ColorPicker } from '@/components/ui/ColorPicker'

type HeadingVariant = 'headingH2' | 'headingH3' | 'headingH4'
type BodyVariant = 'bodyLg' | 'bodySm'

const HEADING_VARIANT_OPTIONS: { id: HeadingVariant; label: string }[] = [
  { id: 'headingH2', label: 'H2' },
  { id: 'headingH3', label: 'H3' },
  { id: 'headingH4', label: 'H4' },
]
const BODY_VARIANT_OPTIONS: { id: BodyVariant; label: string }[] = [
  { id: 'bodyLg', label: 'Large' },
  { id: 'bodySm', label: 'Small' },
]

function TextColorRow({
  color,
  variant,
  variantOptions,
  usedVariants,
  onColorChange,
  onVariantChange,
  onRemove,
}: {
  color: string
  variant: string
  variantOptions: { id: string; label: string }[]
  usedVariants: string[]
  onColorChange: (c: string) => void
  onVariantChange: (v: string) => void
  onRemove: () => void
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const currentOption = variantOptions.find((o) => o.id === variant)
  const availableOptions = variantOptions.filter(
    (o) => o.id === variant || !usedVariants.includes(o.id),
  )

  useEffect(() => {
    if (!isDropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setIsDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isDropdownOpen])

  return (
    <div className="gap-spacing-2 flex min-w-0 items-center">
      <label className="rounded-spacing-1 relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden border border-[var(--color-border)]">
        <div className="absolute inset-0" style={{ backgroundColor: color }} />
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <input
        type="text"
        value={color}
        onChange={(e) => {
          if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) onColorChange(e.target.value)
        }}
        className="input-glass body-3 px-spacing-2 h-8 min-w-0 flex-1 font-mono uppercase"
        placeholder="#000000"
      />
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="input-glass gap-spacing-1 px-spacing-2 body-3 flex h-8 min-w-[72px] items-center justify-between"
        >
          <span>{currentOption?.label || variant}</span>
          <ChevronDown
            className={`h-3 w-3 text-[var(--color-muted-foreground)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isDropdownOpen && (
          <div className="mt-spacing-1 surface-card rounded-spacing-2 p-spacing-1 absolute right-0 top-full z-50 min-w-[80px] border border-[var(--color-border)] shadow-lg">
            {availableOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onVariantChange(o.id)
                  setIsDropdownOpen(false)
                }}
                className={`px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 w-full text-left transition-colors ${o.id === variant ? 'bg-[var(--color-primary)]/10 font-medium' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-spacing-1 flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-muted-foreground)] transition-colors hover:bg-red-500/10 hover:text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface TextColorPickerProps {
  type: 'heading' | 'body'
  mainColor: string
  variants: Record<string, string | undefined>
  onMainColorChange: (color: string) => void
  onVariantChange: (key: string, color: string | undefined) => void
}

export function TextColorPicker({
  type,
  mainColor,
  variants,
  onMainColorChange,
  onVariantChange,
}: TextColorPickerProps) {
  const variantOptions = type === 'heading' ? HEADING_VARIANT_OPTIONS : BODY_VARIANT_OPTIONS
  const [addedVariants, setAddedVariants] = useState<string[]>(() =>
    variantOptions.filter((o) => variants[o.id]).map((o) => o.id),
  )

  const getNextAvailable = (): string | null => {
    for (const o of variantOptions) {
      if (!addedVariants.includes(o.id)) return o.id
    }
    return null
  }

  const handleAdd = () => {
    const next = getNextAvailable()
    if (next) {
      setAddedVariants([...addedVariants, next])
      onVariantChange(next, mainColor)
    }
  }
  const handleRemove = (id: string) => {
    setAddedVariants(addedVariants.filter((v) => v !== id))
    onVariantChange(id, undefined)
  }
  const handleSwitch = (old: string, next: string) => {
    const color = variants[old] || mainColor
    setAddedVariants(addedVariants.map((v) => (v === old ? next : v)))
    onVariantChange(old, undefined)
    onVariantChange(next, color)
  }

  return (
    <div className="space-y-spacing-3 min-w-0">
      <div className="gap-spacing-2 flex items-center justify-between">
        <label className="body-3 font-medium text-[var(--color-muted-foreground)]">
          {type === 'heading' ? 'Heading color' : 'Body text color'}
        </label>
        {addedVariants.length < variantOptions.length && (
          <button
            type="button"
            onClick={handleAdd}
            className="button-glass-accent gap-spacing-1 px-spacing-2 typo-caption flex items-center rounded-md py-1 font-medium"
          >
            <Plus className="h-3 w-3" />
            <span>Add</span>
          </button>
        )}
      </div>
      <ColorPicker
        label=""
        description={
          type === 'heading' ? 'Main headlines and titles' : 'Paragraphs and descriptions'
        }
        value={mainColor}
        onChange={onMainColorChange}
      />
      {addedVariants.length > 0 && (
        <div className="space-y-spacing-2 pt-spacing-2 border-t border-[var(--color-border)]">
          {addedVariants.map((id) => (
            <TextColorRow
              key={id}
              color={variants[id] || mainColor}
              variant={id}
              variantOptions={variantOptions}
              usedVariants={addedVariants}
              onColorChange={(c) => onVariantChange(id, c)}
              onVariantChange={(nv) => handleSwitch(id, nv)}
              onRemove={() => handleRemove(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
