'use client'

import { useCallback, useEffect, useState } from 'react'
import { clsx } from 'clsx'
import type { TocItem } from '@/lib/types'

interface TableOfContentsProps {
  items: TocItem[]
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (items.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -80% 0px' },
    )

    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [items])

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return

    const headerOffset = 80
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset

    window.scrollTo({ top, behavior: 'smooth' })
    window.history.replaceState(null, '', `#${id}`)
  }, [])

  if (items.length === 0) return null

  return (
    <aside className="hidden w-56 shrink-0 xl:block">
      <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-6">
        <p className="text-muted-foreground mb-3 text-[11px] font-semibold uppercase tracking-wider">
          On this page
        </p>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={clsx(
                  'block py-1 text-[14px] transition-colors',
                  item.level === 3 && 'pl-3',
                  item.level === 4 && 'pl-6',
                  activeId === item.id
                    ? 'toc-active'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
