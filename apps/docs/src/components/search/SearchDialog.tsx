'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ArrowRight, FileText, Search } from 'lucide-react'
import type { SearchEntry } from '@/lib/types'

interface SearchDialogProps {
  entries: SearchEntry[]
}

export function SearchDialog({ entries }: SearchDialogProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const results =
    query.length > 1
      ? entries
          .filter((entry) => {
            const q = query.toLowerCase()
            return (
              entry.title.toLowerCase().includes(q) ||
              entry.description.toLowerCase().includes(q) ||
              entry.content.toLowerCase().includes(q)
            )
          })
          .slice(0, 8)
      : []

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const navigate = useCallback(
    (slug: string) => {
      setOpen(false)
      router.push(`/${slug}`)
    },
    [router],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[activeIndex]) {
      navigate(results[activeIndex].slug)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground hidden w-[280px] items-center justify-between rounded-lg px-3 py-2 text-[14px] transition-all md:flex lg:w-[340px]"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span>Search docs...</span>
        </span>
        <kbd
          className="text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]"
          style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          ⌘K
        </kbd>
      </button>
    )
  }

  return (
    <>
      <div className="search-dialog-backdrop fixed inset-0 z-50" onClick={() => setOpen(false)} />
      <div className="fixed inset-x-0 top-[15%] z-50 mx-auto w-full max-w-lg px-4">
        <div
          className="overflow-hidden rounded-xl shadow-2xl"
          style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <Search className="text-muted-foreground h-4 w-4 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What are you looking for?"
              className="flex-1 bg-transparent text-[14px] outline-none"
              style={{ color: 'var(--foreground)' }}
            />
            <kbd
              className="text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              ESC
            </kbd>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {query.length > 1 && results.length === 0 && (
              <div className="text-muted-foreground py-8 text-center text-[14px]">
                Nothing matched - try different words
              </div>
            )}

            {results.length > 0 && (
              <ul className="p-2">
                {results.map((result, i) => (
                  <li key={result.slug}>
                    <button
                      onClick={() => navigate(result.slug)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={clsx(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors',
                        activeIndex === i ? 'nav-item-active' : 'text-muted-foreground',
                      )}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div
                          className="truncate font-medium"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {result.title}
                        </div>
                        {result.description && (
                          <div className="text-muted-foreground truncate text-[12px]">
                            {result.description}
                          </div>
                        )}
                      </div>
                      {activeIndex === i && <ArrowRight className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {query.length <= 1 && (
              <div className="text-muted-foreground py-8 text-center text-[14px]">
                Start typing to search the docs
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
