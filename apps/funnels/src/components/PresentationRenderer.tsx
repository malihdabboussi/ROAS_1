'use client'

import { useEffect, useMemo } from 'react'
import { useEsbuildRunner } from '@/hooks/use-esbuild-runner'
import { TAILWIND_BROWSER_SCRIPT_SRC } from '@/lib/tailwind-browser'
import { createTsxRunnerScope } from '@/lib/tsx-runner-scope'
import type { Presentation } from '@/lib/types'

type PresentationContent = Pick<
  Presentation,
  'id' | 'name' | 'generated_html' | 'file_url' | 'slides' | 'hide_branding' | 'bundle'
>

interface PresentationRendererProps {
  presentation: PresentationContent
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHtmlBundleSrcDoc(bundle: NonNullable<Presentation['bundle']>): string {
  const entry =
    bundle.files.find((file) => file.path === bundle.entry_file) ??
    bundle.files.find((file) => file.path === 'index.html')
  if (!entry) return '<!doctype html><html><body><main>No content available</main></body></html>'

  let html = entry.content
  for (const asset of bundle.assets) {
    if (!asset.url) continue
    html = html.replace(new RegExp(escapeRegExp(`./${asset.path}`), 'g'), asset.url)
    html = html.replace(new RegExp(escapeRegExp(asset.path), 'g'), asset.url)
  }

  for (const file of bundle.files) {
    if (file.path === entry.path) continue
    const pathPattern = `${escapeRegExp(file.path)}|${escapeRegExp(`./${file.path}`)}`
    if (file.mime_type === 'text/css' || file.path.endsWith('.css')) {
      html = html.replace(
        new RegExp(`<link([^>]+)href=["'](?:${pathPattern})["']([^>]*)>`, 'g'),
        `<style data-vibey-source="${file.path}">\n${file.content}\n</style>`,
      )
    } else if (
      file.mime_type === 'text/javascript' ||
      file.path.endsWith('.js') ||
      file.path.endsWith('.jsx')
    ) {
      html = html.replace(
        new RegExp(`<script([^>]+)src=["'](?:${pathPattern})["']([^>]*)><\\/script>`, 'g'),
        `<script data-vibey-source="${file.path}">\n${file.content}\n</script>`,
      )
    }
  }

  return html
}

/**
 * Renders a published presentation at {user-subdomain}.sites.roas.io/p/{slug}.
 *
 * Priority order matches PresentationPreview in the studio:
 * 1. generated_html (TSX) → Sandpack
 * 2. file_url (PDF/file)  → full-viewport iframe
 * 3. slides[0].type=tsx   → Sandpack
 */
export function PresentationRenderer({ presentation }: PresentationRendererProps) {
  const scope = useMemo(() => createTsxRunnerScope(), [])
  useEffect(() => {
    if (document.querySelector('script[data-vibey-tailwind-play-cdn]')) return
    const script = document.createElement('script')
    script.src = TAILWIND_BROWSER_SCRIPT_SRC
    script.async = true
    script.setAttribute('data-vibey-tailwind-play-cdn', 'true')
    document.head.appendChild(script)
  }, [])

  const tsxSlide = useMemo(() => {
    if (presentation.generated_html) return null
    return (presentation.slides as unknown as Record<string, unknown>[]).find(
      (s): s is Record<string, unknown> & { type: 'tsx'; content?: string; body?: string } =>
        s?.type === 'tsx',
    )
  }, [presentation.generated_html, presentation.slides])

  const tsxCode =
    presentation.generated_html ??
    (tsxSlide
      ? typeof tsxSlide.content === 'string'
        ? tsxSlide.content
        : typeof tsxSlide.body === 'string'
          ? tsxSlide.body
          : null
      : null)

  const { element } = useEsbuildRunner({ code: tsxCode ?? '', scope })

  if (presentation.bundle?.source_mode === 'html_bundle' && presentation.bundle.has_entry) {
    return (
      <iframe
        srcDoc={buildHtmlBundleSrcDoc(presentation.bundle)}
        style={{ width: '100%', height: '100vh', border: 'none' }}
        sandbox="allow-scripts"
        title={presentation.name ?? 'Presentation'}
      />
    )
  }

  // TSX mode
  if (tsxCode) {
    return <div style={{ width: '100%', height: '100vh', overflow: 'auto' }}>{element}</div>
  }

  // PDF / file mode
  if (presentation.file_url) {
    return (
      <iframe
        src={presentation.file_url}
        style={{ width: '100%', height: '100vh', border: 'none' }}
        title={presentation.name ?? 'Presentation'}
      />
    )
  }

  // Fallback
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        color: '#6b7280',
      }}
    >
      No content available
    </div>
  )
}
