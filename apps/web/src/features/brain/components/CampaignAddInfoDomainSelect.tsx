'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { KNOWLEDGE_DOMAINS, type KnowledgeDomain } from '@/lib/campaigns'

type CampaignAddInfoDomainValue = KnowledgeDomain | 'auto'

interface CampaignAddInfoDomainSelectProps {
  onChange: (domain: CampaignAddInfoDomainValue) => void
  value: CampaignAddInfoDomainValue
}

export function CampaignAddInfoDomainSelect({
  onChange,
  value,
}: CampaignAddInfoDomainSelectProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[data-campaign-add-info-domain-dropdown]')
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div>
      <label className="body-4 text-muted-foreground mb-spacing-1 block">Domain</label>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg text-foreground flex w-full items-center justify-between border"
      >
        <span className="truncate">
          {value === 'auto'
            ? 'Auto (AI)'
            : (KNOWLEDGE_DOMAINS.find((domain) => domain.value === value)?.label ?? 'General')}
        </span>
        <ChevronDown className="icon-xs text-muted-foreground shrink-0" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="surface-card border-border rounded-spacing-2 p-spacing-2 z-dropdown fixed border shadow-lg"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
            }}
            data-campaign-add-info-domain-dropdown
          >
            <button
              type="button"
              onClick={() => {
                onChange('auto')
                setOpen(false)
              }}
              className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left ${value === 'auto' ? 'bg-primary/10 text-muted-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
            >
              <span className="font-medium">Auto (AI)</span>
              {value === 'auto' && <Check className="icon-sm text-muted-foreground" />}
            </button>
            {KNOWLEDGE_DOMAINS.map((domain) => {
              const isSelected = value === domain.value
              return (
                <button
                  key={domain.value}
                  type="button"
                  onClick={() => {
                    onChange(domain.value)
                    setOpen(false)
                  }}
                  className={`px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 flex w-full items-center justify-between text-left ${isSelected ? 'bg-primary/10 text-muted-foreground' : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'}`}
                >
                  <span className="font-medium">{domain.label}</span>
                  {isSelected && <Check className="icon-sm text-muted-foreground" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}
