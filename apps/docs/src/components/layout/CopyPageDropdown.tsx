'use client'

import { useEffect, useRef, useState } from 'react'

interface CopyPageDropdownProps {
  slug: string
  rawMarkdown: string
}

export function CopyPageDropdown({ slug, rawMarkdown }: CopyPageDropdownProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawMarkdown)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      setOpen(false)
    }, 1200)
  }

  const handleViewMarkdown = () => {
    window.open(`/api/raw/${slug}`, '_blank')
    setOpen(false)
  }

  const handleOpenInVibey = () => {
    const docsUrl = `https://docs.vibey.im/${slug}`
    const prompt = encodeURIComponent(`Read from ${docsUrl} so I can ask questions about it`)
    window.open(`https://app.vibey.im/team?agent=vibey&prompt=${prompt}`, '_blank')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="copy-page-trigger"
        aria-label="Copy page options"
      >
        <CopyIcon />
        <span>Copy page</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="copy-page-dropdown">
          <button onClick={handleCopy} className="copy-page-item">
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span>{copied ? 'Copied!' : 'Copy page'}</span>
          </button>
          <button onClick={handleViewMarkdown} className="copy-page-item">
            <MarkdownIcon />
            <span>View as Markdown</span>
            <ExternalIcon />
          </button>
          <div className="copy-page-divider" />
          <button onClick={handleOpenInVibey} className="copy-page-item copy-page-item-vibey">
            <VibeyIcon />
            <span>Open in Vibey</span>
            <ExternalIcon />
          </button>
        </div>
      )}
    </div>
  )
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function MarkdownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.5, marginLeft: 'auto' }}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function VibeyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
