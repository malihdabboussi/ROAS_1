'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import type { SkDomain, SkSourceType } from '../services/sk.service'

const SOURCE_TYPES: Array<{ value: SkSourceType; label: string }> = [
  { value: 'book', label: 'Book' },
  { value: 'article', label: 'Article' },
  { value: 'course', label: 'Course' },
  { value: 'manual', label: 'Manual' },
  { value: 'notes', label: 'Notes' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'website', label: 'Website' },
]

const DOMAINS: Array<{ value: SkDomain; label: string }> = [
  { value: 'general', label: 'General' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'creative', label: 'Creative' },
]

interface TrainingPanelMetadataFieldsProps {
  sourceType: SkSourceType
  onSourceTypeChange: (sourceType: SkSourceType) => void
  domain: SkDomain
  onDomainChange: (domain: SkDomain) => void
}

export function TrainingPanelMetadataFields({
  sourceType,
  onSourceTypeChange,
  domain,
  onDomainChange,
}: TrainingPanelMetadataFieldsProps) {
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false)
  const typeBtnRef = useRef<HTMLButtonElement>(null)
  const domainBtnRef = useRef<HTMLButtonElement>(null)
  const [typeDropdownPos, setTypeDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const [domainDropdownPos, setDomainDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  const selectedSourceLabel = useMemo(
    () => SOURCE_TYPES.find((t) => t.value === sourceType)?.label ?? 'Notes',
    [sourceType],
  )
  const selectedDomainLabel = useMemo(
    () => DOMAINS.find((d) => d.value === domain)?.label ?? 'General',
    [domain],
  )

  useLayoutEffect(() => {
    if (!typeDropdownOpen || !typeBtnRef.current) return
    const rect = typeBtnRef.current.getBoundingClientRect()
    setTypeDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [typeDropdownOpen])

  useLayoutEffect(() => {
    if (!domainDropdownOpen || !domainBtnRef.current) return
    const rect = domainBtnRef.current.getBoundingClientRect()
    setDomainDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [domainDropdownOpen])

  useEffect(() => {
    if (!typeDropdownOpen && !domainDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        typeDropdownOpen &&
        typeBtnRef.current &&
        !typeBtnRef.current.contains(target) &&
        !(e.target as HTMLElement).closest('[data-type-dropdown]')
      ) {
        setTypeDropdownOpen(false)
      }
      if (
        domainDropdownOpen &&
        domainBtnRef.current &&
        !domainBtnRef.current.contains(target) &&
        !(e.target as HTMLElement).closest('[data-domain-dropdown]')
      ) {
        setDomainDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [typeDropdownOpen, domainDropdownOpen])

  return (
    <div className="gap-spacing-2 flex">
      <div className="flex-1">
        <label className="body-4 text-muted-foreground mb-spacing-1 block">Type</label>
        <button
          ref={typeBtnRef}
          type="button"
          onClick={() => {
            setTypeDropdownOpen((p) => !p)
            setDomainDropdownOpen(false)
          }}
          className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg text-foreground flex w-full items-center justify-between border"
        >
          <span className="truncate">{selectedSourceLabel}</span>
          <ChevronDown className="icon-xs text-muted-foreground shrink-0" />
        </button>
        {typeDropdownOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="surface-card border-border rounded-spacing-2 p-spacing-2 z-dropdown fixed border shadow-lg"
              style={{
                top: typeDropdownPos.top,
                left: typeDropdownPos.left,
                width: typeDropdownPos.width,
              }}
              data-type-dropdown
            >
              {SOURCE_TYPES.map((t) => {
                const isSelected = sourceType === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      onSourceTypeChange(t.value)
                      setTypeDropdownOpen(false)
                    }}
                    className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left ${isSelected ? 'bg-primary/10 text-muted-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
                  >
                    <span className="font-medium">{t.label}</span>
                    {isSelected && <Check className="icon-sm text-muted-foreground" />}
                  </button>
                )
              })}
            </div>,
            document.body,
          )}
      </div>
      <div className="flex-1">
        <label className="body-4 text-muted-foreground mb-spacing-1 block">Domain</label>
        <button
          ref={domainBtnRef}
          type="button"
          onClick={() => {
            setDomainDropdownOpen((p) => !p)
            setTypeDropdownOpen(false)
          }}
          className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg text-foreground flex w-full items-center justify-between border"
        >
          <span className="truncate">{selectedDomainLabel}</span>
          <ChevronDown className="icon-xs text-muted-foreground shrink-0" />
        </button>
        {domainDropdownOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="surface-card border-border rounded-spacing-2 p-spacing-2 z-dropdown fixed border shadow-lg"
              style={{
                top: domainDropdownPos.top,
                left: domainDropdownPos.left,
                width: domainDropdownPos.width,
              }}
              data-domain-dropdown
            >
              {DOMAINS.map((d) => {
                const isSelected = domain === d.value
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      onDomainChange(d.value)
                      setDomainDropdownOpen(false)
                    }}
                    className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left ${isSelected ? 'bg-primary/10 text-muted-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
                  >
                    <span className="font-medium">{d.label}</span>
                    {isSelected && <Check className="icon-sm text-muted-foreground" />}
                  </button>
                )
              })}
            </div>,
            document.body,
          )}
      </div>
    </div>
  )
}
