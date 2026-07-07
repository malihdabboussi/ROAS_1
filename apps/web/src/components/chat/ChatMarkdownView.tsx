'use client'

import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { cn } from '@/lib/utils/cn'
import { CHAT_MARKDOWN_CLASSNAME } from '@/lib/utils/chat-markdown.utils'
import { ChatMarkdownCodeBlockChrome } from './ChatMarkdownCodeBlockChrome'

function scheduleMermaidHydrate(root: HTMLElement) {
  let cancelled = false
  let retryTimer: ReturnType<typeof window.setTimeout> | null = null
  let attempt = 0
  const maxAttempts = 60

  const hydrate = async () => {
    if (cancelled) return
    try {
      const { hasMermaidPlaceholders, hydrateMermaidPlaceholders } = await import(
        '@/components/ui/mermaid-diagram'
      )
      if (cancelled || !hasMermaidPlaceholders(root)) return
      await hydrateMermaidPlaceholders(root)
      if (cancelled) return
      if (hasMermaidPlaceholders(root) && attempt < maxAttempts) {
        attempt += 1
        retryTimer = window.setTimeout(() => void hydrate(), 500)
      }
    } catch {
      if (!cancelled && attempt < maxAttempts) {
        attempt += 1
        retryTimer = window.setTimeout(() => void hydrate(), 500)
      }
    }
  }

  void import('@/components/ui/mermaid-diagram')
    .then(({ preloadMermaid }) => preloadMermaid())
    .catch(() => undefined)

  void hydrate()

  const raf = requestAnimationFrame(() => {
    requestAnimationFrame(() => void hydrate())
  })
  const initialRetry = window.setTimeout(() => void hydrate(), 120)

  return () => {
    cancelled = true
    cancelAnimationFrame(raf)
    clearTimeout(initialRetry)
    if (retryTimer != null) clearTimeout(retryTimer)
  }
}

export function ChatMarkdownView({
  html,
  className,
  containerRef: externalRef,
  hydrateMermaid = true,
}: {
  html: string
  className?: string
  containerRef?: RefObject<HTMLDivElement | null>
  /** When false, skip mermaid hydration (e.g. while streaming). */
  hydrateMermaid?: boolean
}) {
  const internalRef = useRef<HTMLDivElement>(null)
  const containerRef = externalRef ?? internalRef
  const [codeBlocks, setCodeBlocks] = useState<HTMLElement[]>([])

  useLayoutEffect(() => {
    const root = containerRef.current
    if (!root) {
      setCodeBlocks([])
      return
    }

    const blocks = Array.from(root.querySelectorAll<HTMLElement>('.chat-markdown-code-block'))
    setCodeBlocks((prev) => {
      if (prev.length === blocks.length && prev.every((el, index) => el === blocks[index])) {
        return prev
      }
      return blocks
    })

    if (!hydrateMermaid) return
    return scheduleMermaidHydrate(root)
  }, [html, containerRef, hydrateMermaid])

  return (
    <>
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: html }}
        className={cn(CHAT_MARKDOWN_CLASSNAME, className)}
      />
      {codeBlocks.map((blockEl, index) => (
        <ChatMarkdownCodeBlockChrome
          key={`${index}-${blockEl.querySelector('code')?.textContent?.length ?? 0}`}
          blockEl={blockEl}
        />
      ))}
    </>
  )
}
