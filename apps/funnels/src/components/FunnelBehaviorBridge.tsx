'use client'

import { useEffect, useMemo } from 'react'
import { reportFunnelsClientError } from '@/lib/observability/client-error-reporter'

export interface FunnelPageMapEntry {
  id: string
  index: number
  type: string | null
  slug: string | null
  name: string
  path?: string | null
}

interface FunnelBehaviorBridgeProps {
  funnelId: string
  pageId: string
  funnelSlug?: string
  pageMap?: FunnelPageMapEntry[]
}

/**
 * Build the URL for a given page within a funnel.
 * - index 0 → /{funnelSlug} (root opt-in)
 * - index 1+ with type thank-you/confirmation → /{funnelSlug}/thank-you
 * - index 1+ with other type → /{funnelSlug}/{page-type}
 */
export function buildFunnelPageUrl(funnelSlug: string, page: FunnelPageMapEntry): string {
  if (page.path) {
    return page.path === '/' ? `/${funnelSlug}` : `/${funnelSlug}${page.path}`
  }

  if (page.index === 0) return `/${funnelSlug}`
  if (page.type === 'thank-you' || page.type === 'confirmation') return `/${funnelSlug}/thank-you`
  if (page.type) return `/${funnelSlug}/${page.type}`
  if (page.slug) return `/${funnelSlug}/${page.slug}`
  return `/${funnelSlug}`
}

/**
 * Document-level funnel runtime shared by the TSX renderer and the HTML
 * bundle renderer: lead capture on form[data-vibey-capture] and page
 * navigation on [data-vibey-link] / data-next-page.
 */
export function FunnelBehaviorBridge({
  funnelId,
  pageId,
  funnelSlug,
  pageMap,
}: FunnelBehaviorBridgeProps) {
  const nav = useMemo(() => {
    if (!funnelSlug || !pageMap || pageMap.length === 0) return null
    const map: Record<number, string> = {}
    let currentIndex = 0
    for (const page of pageMap) {
      map[page.index] = buildFunnelPageUrl(funnelSlug, page)
      if (page.id === pageId) currentIndex = page.index
    }
    return { map, currentIndex }
  }, [funnelSlug, pageMap, pageId])

  useEffect(() => {
    const getNextUrl = (target: string | null): string | null => {
      if (!target) return nav?.map[nav.currentIndex + 1] ?? null
      if (target.startsWith('/') || target.startsWith('http')) return target
      if (!nav) return null
      const idx = Number.parseInt(target, 10)
      if (Number.isNaN(idx)) return nav.map[nav.currentIndex + 1] ?? null
      return nav.map[idx] ?? null
    }

    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement | null
      if (!form || !form.hasAttribute('data-vibey-capture')) return
      e.preventDefault()
      const formData = new FormData(form)
      const fields: Record<string, string> = {}
      formData.forEach((value, key) => {
        fields[key] = String(value)
      })
      const utmObj: Record<string, string> = {}
      const sp = new URLSearchParams(window.location.search)
      for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_adset']) {
        const v = sp.get(k)
        if (v) utmObj[k] = v
      }
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: (fields.email ?? '').trim().toLowerCase(),
          name: fields.name ?? '',
          fields,
          funnelId,
          pageId,
          ...(Object.keys(utmObj).length > 0 ? { utm: utmObj } : {}),
        }),
        keepalive: true,
      })
        .then(() => {
          const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq
          if (typeof fbq === 'function') {
            fbq('track', 'Lead')
          }
        })
        .catch((err) => {
          void reportFunnelsClientError({
            feature: 'funnels_lead_capture',
            error_code: 'FUNNELS_LEAD_CAPTURE_CLIENT_FAILED',
            message: err instanceof Error ? err.message : String(err),
            error: err,
            context: { funnel_id: funnelId, page_id: pageId, funnel_slug: funnelSlug ?? null },
          })
        })

      const nextTarget = form.getAttribute('data-next-page')
      const url = getNextUrl(nextTarget)
      if (url) {
        setTimeout(() => {
          window.location.href = url
        }, 300)
      }
    }

    const onClick = (e: Event) => {
      let el = e.target as HTMLElement | null
      while (el && el !== document.body) {
        const target = el.getAttribute?.('data-vibey-link')
        if (target !== null) {
          e.preventDefault()
          const url = getNextUrl(target)
          if (url) window.location.href = url
          return
        }
        el = el.parentElement
      }
    }

    document.addEventListener('submit', onSubmit, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('submit', onSubmit, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [funnelId, nav, pageId])

  return null
}
