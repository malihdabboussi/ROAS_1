'use client'

import { useCallback, useRef, useState } from 'react'
import { Building2, ChevronDown, Layers, User } from 'lucide-react'

export type AdminBillingScope = 'all' | 'personal' | 'organization'

const OPTIONS: { value: AdminBillingScope; label: string; icon: typeof User }[] = [
  { value: 'all', label: 'All accounts', icon: Layers },
  { value: 'personal', label: 'Personal', icon: User },
  { value: 'organization', label: 'Organization', icon: Building2 },
]

interface BillingScopeSelectProps {
  value: AdminBillingScope
  onChange: (value: AdminBillingScope) => void
}

export function BillingScopeSelect({ value, onChange }: BillingScopeSelectProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const active = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0]!

  const handleSelect = useCallback(
    (v: AdminBillingScope) => {
      setOpen(false)
      onChange(v)
    },
    [onChange],
  )

  const Icon = active.icon

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-border bg-card text-foreground body-3 gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 inline-flex items-center border transition-colors hover:bg-white/5"
      >
        <Icon className="h-3.5 w-3.5 opacity-60" />
        {active.label}
        <ChevronDown className="h-3.5 w-3.5 opacity-40" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="border-border bg-card absolute right-0 z-50 mt-1 min-w-[200px] overflow-hidden rounded-lg border shadow-lg">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`body-3 flex w-full items-center gap-2 px-3.5 py-2 text-left transition-colors hover:bg-white/5 ${
                  value === opt.value ? 'text-foreground bg-white/5' : 'text-muted-foreground'
                }`}
              >
                <opt.icon className="h-3.5 w-3.5 opacity-60" />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
