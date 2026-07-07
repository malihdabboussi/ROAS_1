'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { resolveThemeColors } from '@/features/themes/lib/theme-css-inject'
import type { Theme } from '@/features/themes/types'
import { cn } from '@/lib/utils/cn'

function themeSwatchColors(theme: Theme): [string, string, string] {
  const colors = resolveThemeColors(theme.colors)
  return [colors.pageBackground, colors.primary, colors.heading]
}

function themeSummary(theme: Theme): string {
  const hasFonts = Boolean(theme.font_heading || theme.font_body)
  const hasDesign = Boolean(theme.design_settings)
  if (hasFonts && hasDesign) return 'Colors, fonts, shape'
  if (hasFonts) return 'Colors + fonts'
  if (hasDesign) return 'Colors + shape'
  return 'Colors only'
}

function themeShapeLabel(theme: Theme): string | null {
  const settings = theme.design_settings
  if (!settings) return null
  return `${settings.blocks.borderRadius} blocks · ${settings.buttons.shape} buttons`
}

interface PresentationThemePalettePickerProps {
  themes: Theme[]
  value: string | null
  onChange: (theme: Theme) => void
}

export function PresentationThemePalettePicker({
  themes,
  value,
  onChange,
}: PresentationThemePalettePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selected = themes.find((theme) => theme.id === value) ?? null

  const filteredThemes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return themes
    return themes.filter((theme) => theme.name.toLowerCase().includes(query))
  }, [searchQuery, themes])

  useEffect(() => {
    if (!isOpen) return
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) searchInputRef.current?.focus()
  }, [isOpen])

  const handleSelect = (theme: Theme) => {
    onChange(theme)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="px-spacing-3 rounded-spacing-2 surface-bg h-spacing-10 gap-spacing-2 border-border hover:bg-hover-subtle flex w-full cursor-pointer items-center justify-between border text-left transition-colors"
      >
        <span className="gap-spacing-2 flex min-w-0 flex-1 items-center">
          {selected ? (
            <>
              <span className="gap-spacing-1 flex shrink-0">
                {themeSwatchColors(selected).map((color, index) => (
                  <span
                    key={`${selected.id}-${index}`}
                    className="rounded-spacing-1 h-spacing-4 w-spacing-4 border-border border"
                    style={{ background: color }}
                  />
                ))}
              </span>
              <span className="body-3 text-foreground truncate font-medium">{selected.name}</span>
            </>
          ) : (
            <span className="body-3 text-muted-foreground">Choose a theme</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'icon-sm text-muted-foreground shrink-0 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen ? (
        <div className="mt-spacing-1 surface-card rounded-spacing-2 z-dropdown border-border absolute left-0 right-0 top-full overflow-hidden border shadow-lg">
          <div className="border-border border-b">
            <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center">
              <Search className="icon-sm text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search themes..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="body-3 text-foreground placeholder:text-muted-foreground flex-1 bg-transparent focus:outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground"
                  aria-label="Clear search"
                >
                  <X className="icon-xs" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="p-spacing-1 max-h-52 overflow-y-auto">
            {filteredThemes.length === 0 ? (
              <p className="body-3 text-muted-foreground py-spacing-4 text-center">
                No themes found
              </p>
            ) : (
              filteredThemes.map((theme) => {
                const isSelected = theme.id === value
                const [bg, primary, heading] = themeSwatchColors(theme)
                const shapeLabel = themeShapeLabel(theme)
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelect(theme)}
                    className={cn(
                      'gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-2 flex w-full items-center text-left transition-colors',
                      isSelected
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
                    )}
                  >
                    <span className="gap-spacing-1 flex shrink-0">
                      <span
                        className="rounded-spacing-1 h-spacing-4 w-spacing-4 border-border border"
                        style={{ background: bg }}
                      />
                      <span
                        className="rounded-spacing-1 h-spacing-4 w-spacing-4 border-border border"
                        style={{ background: primary }}
                      />
                      <span
                        className="rounded-spacing-1 h-spacing-4 w-spacing-4 border-border border"
                        style={{ background: heading }}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="body-3 block truncate font-medium">{theme.name}</span>
                      <span className="typo-caption text-muted-foreground block truncate">
                        {themeSummary(theme)}
                        {shapeLabel ? ` · ${shapeLabel}` : ''}
                      </span>
                    </span>
                    {isSelected ? <Check className="icon-xs text-foreground shrink-0" /> : null}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
