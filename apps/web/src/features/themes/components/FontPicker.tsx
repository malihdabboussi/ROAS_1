'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

interface FontPickerProps {
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
}

const GOOGLE_FONTS = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Inter',
  'Roboto Condensed',
  'Source Sans Pro',
  'Oswald',
  'Raleway',
  'Nunito',
  'Nunito Sans',
  'Ubuntu',
  'Playfair Display',
  'Rubik',
  'Merriweather',
  'PT Sans',
  'Noto Sans',
  'Roboto Mono',
  'Work Sans',
  'Quicksand',
  'Mukta',
  'Fira Sans',
  'Barlow',
  'Mulish',
  'Manrope',
  'IBM Plex Sans',
  'Karla',
  'Titillium Web',
  'Heebo',
  'DM Sans',
  'Libre Franklin',
  'Josefin Sans',
  'Arimo',
  'Cabin',
  'Dosis',
  'Hind',
  'Anton',
  'Libre Baskerville',
  'Bitter',
  'Oxygen',
  'Source Serif Pro',
  'PT Serif',
  'Crimson Text',
  'Abel',
  'Exo 2',
  'Varela Round',
  'Comfortaa',
  'Fjalla One',
  'Bebas Neue',
  'Archivo',
  'Space Grotesk',
  'Lexend',
  'Plus Jakarta Sans',
  'Outfit',
  'Sora',
  'Red Hat Display',
  'Urbanist',
  'Figtree',
  'Bricolage Grotesque',
  'Geist',
  'Overpass',
  'Asap',
  'Assistant',
  'Cairo',
  'Catamaran',
  'Signika',
  'Maven Pro',
  'Yanone Kaffeesatz',
  'Questrial',
  'Acme',
  'Kanit',
  'Righteous',
  'Satisfy',
  'Permanent Marker',
  'Lobster',
  'Pacifico',
  'Dancing Script',
  'Caveat',
  'Great Vibes',
  'Sacramento',
  'Shadows Into Light',
  'Indie Flower',
  'Amatic SC',
  'Kaushan Script',
  'Gloria Hallelujah',
  'Architects Daughter',
  'Patrick Hand',
  'Courgette',
  'Cookie',
  'Yellowtail',
  'JetBrains Mono',
  'Fira Code',
  'Source Code Pro',
  'IBM Plex Mono',
  'Space Mono',
  'Inconsolata',
  'Cousine',
  'Anonymous Pro',
]

const loadedFonts = new Set<string>()

function loadGoogleFont(fontName: string) {
  if (loadedFonts.has(fontName)) return
  const link = document.createElement('link')
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`
  link.rel = 'stylesheet'
  document.head.appendChild(link)
  loadedFonts.add(fontName)
}

export function FontPicker({ value, onChange, placeholder = 'Inter (Default)' }: FontPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filteredFonts = useMemo(() => {
    if (!searchQuery.trim()) return GOOGLE_FONTS
    return GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [searchQuery])

  useEffect(() => {
    if (isOpen) filteredFonts.slice(0, 20).forEach(loadGoogleFont)
  }, [isOpen, filteredFonts])
  useEffect(() => {
    if (value) loadGoogleFont(value)
  }, [value])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && searchInputRef.current) searchInputRef.current.focus()
  }, [isOpen])

  const handleScroll = () => {
    if (!listRef.current) return
    const { scrollTop, clientHeight, scrollHeight } = listRef.current
    const pct = (scrollTop + clientHeight) / scrollHeight
    filteredFonts.slice(0, Math.ceil(pct * filteredFonts.length) + 10).forEach(loadGoogleFont)
  }

  const handleSelect = (fontName: string | null) => {
    onChange(fontName)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-spacing-3 body-2 rounded-spacing-2 surface-bg flex h-10 w-full cursor-pointer items-center justify-between border border-[var(--color-border)] text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
        style={{ fontFamily: value ? `"${value}", sans-serif` : undefined }}
      >
        <span className={value ? '' : 'text-[var(--color-muted-foreground)]'}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--color-muted-foreground)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mt-spacing-1 surface-card rounded-spacing-2 absolute left-0 right-0 top-full z-50 overflow-hidden border border-[var(--color-border)] shadow-lg">
          <div className="border-b border-[var(--color-border)]">
            <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center">
              <Search className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search fonts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="body-3 flex-1 bg-transparent placeholder:text-[var(--color-muted-foreground)] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[var(--color-muted-foreground)]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div
            ref={listRef}
            className="p-spacing-1 max-h-48 overflow-y-auto"
            onScroll={handleScroll}
          >
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 flex w-full items-center text-left transition-colors ${!value ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]'}`}
            >
              <span className="body-3 truncate">Inter (Default)</span>
            </button>
            {filteredFonts.map((fontName) => (
              <button
                key={fontName}
                type="button"
                onClick={() => handleSelect(fontName)}
                className={`gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 flex w-full items-center text-left transition-colors ${value === fontName ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]'}`}
                style={{ fontFamily: `"${fontName}", sans-serif` }}
              >
                <span className="body-3 truncate">{fontName}</span>
              </button>
            ))}
            {filteredFonts.length === 0 && searchQuery && (
              <p className="body-3 py-spacing-4 text-center text-[var(--color-muted-foreground)]">
                No matches
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface FontWeightPickerProps {
  value: string
  onChange: (value: string) => void
}
const FONT_WEIGHTS = [
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
]

export function FontWeightPicker({ value, onChange }: FontWeightPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selected = FONT_WEIGHTS.find((w) => w.value === value) || FONT_WEIGHTS[0]

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-spacing-3 body-3 rounded-spacing-2 surface-bg flex h-10 w-full cursor-pointer items-center justify-between border border-[var(--color-border)] text-left text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
        style={{ fontWeight: parseInt(value) }}
      >
        <span>{selected?.label}</span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--color-muted-foreground)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="mt-spacing-1 surface-card rounded-spacing-2 p-spacing-2 absolute left-0 right-0 top-full z-50 border border-[var(--color-border)] shadow-lg">
          {FONT_WEIGHTS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => {
                onChange(w.value)
                setIsOpen(false)
              }}
              className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 w-full text-left transition-colors ${value === w.value ? 'bg-[var(--color-primary)]/10 text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]'}`}
              style={{ fontWeight: parseInt(w.value) }}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
