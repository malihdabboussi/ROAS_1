'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'

interface AccordionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="my-4 rounded-lg" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-[14px] font-medium transition-colors"
        style={{ color: 'var(--foreground)' }}
      >
        {title}
        <ChevronDown
          className={clsx(
            'text-muted-foreground h-4 w-4 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div
          className="px-4 pb-3 pt-3 text-[14px] [&>p]:mb-2"
          style={{ color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
