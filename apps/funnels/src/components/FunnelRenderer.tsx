'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEsbuildRunner } from '@/hooks/use-esbuild-runner'
import { subscribeTailwindRuntimeReady } from '@/lib/tailwind-browser'
import { createTsxRunnerScope, preloadHeavyLibs } from '@/lib/tsx-runner-scope'
import { FunnelBehaviorBridge, type FunnelPageMapEntry } from './FunnelBehaviorBridge'

type PageMapEntry = FunnelPageMapEntry

interface FunnelRendererProps {
  code: string
  css?: string | null
  funnelId: string
  pageId: string
  funnelSlug?: string
  pageMap?: PageMapEntry[]
  funnelType?: string | null
  layout?: WebsiteLayout | null
  blogPosts?: unknown[]
  blogPost?: unknown | null
  blogPagination?: unknown | null
  relatedBlogPosts?: unknown[]
}

interface WebsiteNavItem {
  label: string
  path: string
  style?: 'link' | 'button'
  children?: Array<{ label: string; path: string }>
}

interface WebsiteLayout {
  navigation?: {
    logo?: { url: string; alt: string }
    items?: WebsiteNavItem[]
    position?: 'sticky' | 'fixed' | 'static'
    style?: 'transparent' | 'solid' | 'blur'
  }
  footer?: {
    columns?: Array<{
      title: string
      links: Array<{ label: string; path: string }>
    }>
    copyright?: string
    socials?: Array<{ platform: string; url: string }>
  }
  navigation_tsx?: string
  footer_tsx?: string
}

function normalizeDataVibeyLinkPath(path: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/')) return path
  return `/${path}`
}

function navStyleClass(layout: WebsiteLayout | null | undefined): string {
  const style = layout?.navigation?.style ?? 'solid'
  if (style === 'transparent') return 'bg-transparent'
  if (style === 'blur') return 'bg-white/80 border-b border-black/5'
  return 'bg-white border-b border-black/5'
}

function navPositionClass(layout: WebsiteLayout | null | undefined): string {
  const position = layout?.navigation?.position ?? 'sticky'
  if (position === 'fixed') return 'fixed top-0 left-0 right-0 z-50'
  if (position === 'static') return 'relative'
  return 'sticky top-0 z-40'
}

function LayoutTsxRunner({
  code,
  extraScope,
}: {
  code: string
  extraScope: Record<string, unknown>
}) {
  const scope = useMemo(() => createTsxRunnerScope(extraScope), [extraScope])
  const { element } = useEsbuildRunner({ code, scope })
  return element ?? null
}

/**
 * Renders TSX funnel page code using Sandpack.
 * Injects a navigation runtime that handles inter-page linking and lead capture.
 */
export function FunnelRenderer({
  code,
  css,
  funnelId,
  pageId,
  funnelSlug,
  pageMap,
  funnelType,
  layout,
  blogPosts,
  blogPost,
  blogPagination,
  relatedBlogPosts,
}: FunnelRendererProps) {
  const [heavyLibsReady, setHeavyLibsReady] = useState(false)

  useEffect(() => {
    preloadHeavyLibs()
      .then(() => setHeavyLibsReady(true))
      .catch(() => setHeavyLibsReady(true))
  }, [])

  const scope = useMemo(
    () =>
      createTsxRunnerScope({
        blogPosts: blogPosts ?? [],
        blogPost: blogPost ?? null,
        blogPagination: blogPagination ?? null,
        relatedBlogPosts: relatedBlogPosts ?? [],
      }),
    [blogPagination, blogPost, blogPosts, relatedBlogPosts, heavyLibsReady],
  )
  const runnerCode = useMemo(() => code, [code])
  const { element } = useEsbuildRunner({ code: runnerCode, scope })
  const [isTailwindReady, setIsTailwindReady] = useState(false)

  useEffect(() => {
    return subscribeTailwindRuntimeReady(() => setIsTailwindReady(true))
  }, [])
  const isWebsite = funnelType === 'website' && Boolean(layout)
  const navItems = layout?.navigation?.items ?? []
  const footerColumns = layout?.footer?.columns ?? []
  const socials = layout?.footer?.socials ?? []

  const currentPath = useMemo(() => {
    if (!pageMap || !pageId) return '/'
    const page = pageMap.find((p) => p.id === pageId)
    return page?.path ?? '/'
  }, [pageMap, pageId])

  const navScope = useMemo(
    () => ({
      navItems,
      logo: layout?.navigation?.logo ?? null,
      currentPath,
    }),
    [navItems, layout?.navigation?.logo, currentPath],
  )

  const footerScope = useMemo(
    () => ({
      footerColumns,
      socials,
      copyright: layout?.footer?.copyright ?? '',
    }),
    [footerColumns, socials, layout?.footer?.copyright],
  )

  const hasCustomNav =
    isWebsite && typeof layout?.navigation_tsx === 'string' && layout.navigation_tsx.length > 0
  const hasCustomFooter =
    isWebsite && typeof layout?.footer_tsx === 'string' && layout.footer_tsx.length > 0

  if (!isTailwindReady) {
    return (
      <div className="funnel-loading">
        <div className="funnel-loading-spinner" aria-label="Loading funnel" />
      </div>
    )
  }

  return (
    <div className="vibey-preview-runtime" style={{ overflow: 'auto' }}>
      <FunnelBehaviorBridge
        funnelId={funnelId}
        pageId={pageId}
        funnelSlug={funnelSlug}
        pageMap={pageMap}
      />
      {css ? <style>{css}</style> : null}
      {isWebsite ? (
        <>
          {hasCustomNav ? (
            <LayoutTsxRunner code={layout!.navigation_tsx!} extraScope={navScope} />
          ) : (
            <header className={`${navPositionClass(layout)} ${navStyleClass(layout)}`}>
              <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4">
                {layout?.navigation?.logo?.url ? (
                  <img
                    src={layout.navigation.logo.url}
                    alt={layout.navigation.logo.alt || 'Logo'}
                    className="h-10 w-auto max-w-[220px]"
                    loading="eager"
                  />
                ) : (
                  <div className="text-sm font-semibold uppercase tracking-wide">Website</div>
                )}

                <nav className="flex items-center gap-2 md:gap-3">
                  {navItems.map((item) => (
                    <button
                      key={`${item.label}-${item.path}`}
                      type="button"
                      data-vibey-link={normalizeDataVibeyLinkPath(item.path)}
                      className={
                        item.style === 'button'
                          ? 'rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90'
                          : 'rounded-md px-3 py-2 text-sm font-medium text-black/80 hover:bg-black/5'
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              </div>
            </header>
          )}

          <main>{element}</main>

          {hasCustomFooter ? (
            <LayoutTsxRunner code={layout!.footer_tsx!} extraScope={footerScope} />
          ) : (
            <footer className="border-t border-black/10 bg-white">
              <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 md:grid-cols-3">
                {footerColumns.map((column) => (
                  <section key={column.title}>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/80">
                      {column.title}
                    </h3>
                    <ul className="space-y-2">
                      {(column.links ?? []).map((link) => (
                        <li key={`${column.title}-${link.label}-${link.path}`}>
                          <a
                            href={normalizeDataVibeyLinkPath(link.path)}
                            className="text-sm text-black/70 hover:text-black"
                          >
                            {link.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              {(layout?.footer?.copyright || socials.length > 0) && (
                <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 pb-8">
                  <p className="text-xs text-black/60">{layout?.footer?.copyright ?? ''}</p>
                  <div className="flex items-center gap-3">
                    {socials.map((social) => (
                      <a
                        key={`${social.platform}-${social.url}`}
                        href={social.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs uppercase tracking-wide text-black/60 hover:text-black"
                      >
                        {social.platform}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </footer>
          )}
        </>
      ) : (
        element
      )}
    </div>
  )
}
