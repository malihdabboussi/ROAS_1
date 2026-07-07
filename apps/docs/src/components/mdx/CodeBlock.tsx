'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CodeBlockProps {
  title?: string
  children: React.ReactNode
}

export function CodeBlock({ title, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const el = document.querySelector('[data-code-block-content]')
    if (el) {
      navigator.clipboard.writeText(el.textContent || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="my-4 overflow-hidden rounded-lg" style={{ border: '1px solid var(--border)' }}>
      {title && (
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: 'var(--muted)', borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-muted-foreground text-[12px] font-medium">{title}</span>
          <CopyButton copied={copied} onCopy={handleCopy} />
        </div>
      )}
      <div className="relative" data-code-block-content>
        {!title && (
          <div className="absolute right-2 top-2 z-10">
            <CopyButton copied={copied} onCopy={handleCopy} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function CopyButton({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  return (
    <button
      onClick={onCopy}
      className="text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
      aria-label="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
