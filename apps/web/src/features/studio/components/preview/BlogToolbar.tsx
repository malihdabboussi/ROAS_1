'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, Settings } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'

export interface BlogToolbarPost {
  id: string
  title: string
  slug: string
}

interface BlogToolbarProps {
  posts: BlogToolbarPost[]
  currentPostId: string
  onPostChange: (postId: string) => void
  funnelId: string
  published: boolean
  publishDisabled: boolean
  onPublishedChange: (published: boolean) => void
  leadingChrome?: ReactNode
  trailingChrome?: ReactNode
}

const DROPDOWN_WIDTH = 280

export function BlogToolbar({
  posts,
  currentPostId,
  onPostChange,
  funnelId,
  published,
  publishDisabled,
  onPublishedChange,
  leadingChrome,
  trailingChrome,
}: BlogToolbarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return posts
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    )
  }, [posts, searchQuery])

  const current = posts.find((p) => p.id === currentPostId) ?? posts[0]
  const currentLabel = current
    ? current.title?.trim() || current.slug || 'Untitled post'
    : posts.length === 0
      ? 'No posts yet'
      : 'Select post'

  useEffect(() => {
    if (dropdownOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const left = Math.max(8, rect.left + rect.width / 2 - DROPDOWN_WIDTH / 2)
      setDropdownPos({ top: rect.bottom + 4, left })
    }
  }, [dropdownOpen])

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-blog-post-dropdown]') && !btnRef.current?.contains(target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {leadingChrome}
      <span className="body-3 text-foreground shrink-0 font-semibold">Blog CMS</span>
      <div className="min-w-0 flex-1" />
      <div className="relative flex shrink-0 justify-center">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="chip-glass-neutral body-3 text-foreground h-spacing-8 rounded-spacing-2 flex min-w-[160px] max-w-[min(100vw-2rem,320px)] cursor-pointer items-center justify-between gap-2 px-2.5"
        >
          <span className="min-w-0 truncate font-medium">{currentLabel}</span>
          <ChevronDown className="text-muted-foreground icon-sm shrink-0" />
        </button>
        {dropdownOpen &&
          createPortal(
            <div
              data-blog-post-dropdown
              className="surface-card border-border z-dropdown rounded-spacing-3 flex max-h-[min(60vh,400px)] flex-col overflow-hidden border shadow-lg"
              style={{
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: DROPDOWN_WIDTH,
                position: 'fixed',
              }}
            >
              <div className="border-border shrink-0 border-b p-2">
                <div className="relative">
                  <Search className="icon-left-center icon-sm text-muted-foreground pointer-events-none z-10" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search posts…"
                    className="input-glass input-leading preview-input body-3 text-foreground placeholder:text-muted-foreground h-spacing-8 pr-spacing-3 w-full rounded-lg py-0"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {posts.length === 0 ? (
                  <p className="text-muted-foreground body-3 px-spacing-3 py-spacing-4 text-center">
                    No posts yet
                  </p>
                ) : filteredPosts.length === 0 ? (
                  <p className="text-muted-foreground body-3 px-spacing-3 py-spacing-4 text-center">
                    No posts match
                  </p>
                ) : (
                  <div className="p-1">
                    {filteredPosts.map((post) => {
                      const isActive = post.id === currentPostId
                      const label = post.title?.trim() || post.slug || 'Untitled'
                      return (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => {
                            onPostChange(post.id)
                            setDropdownOpen(false)
                          }}
                          className={`body-3 flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-foreground'
                              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                          }`}
                        >
                          <span className="min-w-0 truncate font-medium">{label}</span>
                          <span className="typo-caption text-muted-foreground truncate font-mono">
                            /{post.slug || '—'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
      <div className="min-w-0 flex-1" />

      <div className="flex shrink-0 items-center gap-1">
        <span className="body-3 text-muted-foreground whitespace-nowrap">Published</span>
        <Switch
          checked={published}
          disabled={publishDisabled}
          onCheckedChange={onPublishedChange}
        />
        <button
          type="button"
          data-tooltip="Funnel settings"
          data-side="bottom-right"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent('navigate-settings-section', {
                detail: { section: 'funnel' as const, funnelId },
              }),
            )
          }
          className="tooltip chip-glass-neutral h-spacing-8 w-spacing-8 rounded-spacing-2 flex items-center justify-center"
        >
          <Settings className="icon-sm" />
        </button>
        {trailingChrome}
      </div>
    </div>
  )
}
