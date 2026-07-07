'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'

let mermaidReady: Promise<typeof import('mermaid').default> | null = null

function applyNodeGlassStyles(root: ParentNode) {
  const allShapes = root.querySelectorAll<SVGElement>('rect, polygon, circle')
  allShapes.forEach((shape) => {
    shape.style.setProperty('fill', '#1a1a1f', 'important')
    shape.style.setProperty('stroke', '#2a2a30', 'important')
  })
  return allShapes
}

const MERMAID_INIT_TIMEOUT_MS = 15_000
const MERMAID_PARSE_TIMEOUT_MS = 8_000
const MERMAID_RENDER_TIMEOUT_MS = 12_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), ms)
    }),
  ])
}

function getMermaid() {
  if (mermaidReady) return mermaidReady
  mermaidReady = withTimeout(import('mermaid'), MERMAID_INIT_TIMEOUT_MS, 'Mermaid module load')
    .then((mod) => {
      const m = mod.default
      const themeConfig = {
        startOnLoad: false,
        theme: 'base',
        htmlLabels: false,
        securityLevel: 'strict',
        themeCSS: `
.node rect, .node polygon, .node circle { fill: #1a1a1f !important; stroke: #2a2a30 !important; }
`,
        themeVariables: {
          darkMode: true,
          background: 'transparent',
          primaryColor: '#1a1a1f',
          primaryTextColor: '#e5e7eb',
          primaryBorderColor: '#2a2a30',
          lineColor: '#6b7280',
          secondaryColor: '#141418',
          tertiaryColor: '#111114',
          mainBkg: '#1a1a1f',
          inlinePrimaryColor: '#1a1a1f',
          inlineSecondaryColor: '#141418',
          nodeTextColor: '#e5e7eb',
          nodeBorder: '#2a2a30',
          clusterBkg: '#141418',
          clusterBorder: '#2a2a30',
          titleColor: '#e5e7eb',
          edgeLabelBackground: '#111114',
          fontFamily: 'inherit',
          fontSize: '14px',
        },
        flowchart: { curve: 'basis' },
        sequence: { mirrorActors: false },
      }
      m.initialize(themeConfig as Parameters<typeof m.initialize>[0])
      m.parseError = () => {}
      return m
    })
    .catch((error) => {
      mermaidReady = null
      throw error
    })
  return mermaidReady
}

export function resetMermaidModuleForRetry() {
  mermaidReady = null
}

export function preloadMermaid() {
  void getMermaid().catch(() => undefined)
}

function markPlaceholderFailed(el: HTMLElement, message = 'Could not render diagram') {
  el.innerHTML = `<span class="text-xs text-[var(--color-muted-foreground)]">${message}</span>`
  el.classList.remove('mermaid-placeholder')
  el.classList.add('mermaid-render-failed')
}

async function parseMermaid(m: Awaited<ReturnType<typeof getMermaid>>, code: string) {
  return withTimeout(m.parse(code, { suppressErrors: true }), MERMAID_PARSE_TIMEOUT_MS, 'Mermaid parse')
}

function renderMermaidDiagram(
  m: Awaited<ReturnType<typeof getMermaid>>,
  diagramId: string,
  code: string,
) {
  return withTimeout(m.render(diagramId, code), MERMAID_RENDER_TIMEOUT_MS, 'Mermaid render')
}

function applyRenderedSvg(container: HTMLElement, svg: string) {
  container.innerHTML = svg
  const svgEl = container.querySelector('svg')
  if (svgEl) {
    const vb = svgEl.getAttribute('viewBox')
    if (vb) {
      const [x, y, w, h] = vb.split(' ').map(Number)
      svgEl.setAttribute('viewBox', `${x} ${y} ${w} ${(h ?? 0) + 8}`)
    }
  }
  const nodes = applyNodeGlassStyles(container)
  nodes.forEach((node) => {
    node.setAttribute('rx', '8')
    node.setAttribute('ry', '8')
  })
}

interface MermaidDiagramProps {
  code: string
  className?: string
}

export function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const uniqueId = useId().replace(/:/g, '-')
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendering, setRendering] = useState(true)

  const render = useCallback(async () => {
    const trimmed = code.trim()
    if (!trimmed || !containerRef.current) return

    setRendering(true)
    setError(null)

    try {
      const m = await getMermaid()
      const valid = await parseMermaid(m, trimmed)
      if (!valid) {
        setError('invalid')
        setRendering(false)
        return
      }
      const diagramId = `mermaid-${uniqueId}-${Date.now()}`
      const { svg } = await renderMermaidDiagram(m, diagramId, trimmed)
      if (containerRef.current) {
        applyRenderedSvg(containerRef.current, svg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to render diagram'
      setError(msg)
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    } finally {
      setRendering(false)
    }
  }, [code, uniqueId])

  useEffect(() => {
    void render()
  }, [render])

  if (error) {
    return null
  }

  return (
    <div
      className={[
        'bg-[var(--color-secondary)]/50 my-3 flex justify-center overflow-x-auto overflow-y-visible rounded-lg p-4 pb-5',
        rendering && 'min-h-[60px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div ref={containerRef} className="[&_svg]:h-auto [&_svg]:max-w-full" />
    </div>
  )
}

async function runMermaidHydratePass(container: HTMLElement) {
  const placeholders = container.querySelectorAll<HTMLElement>('.mermaid-placeholder')
  if (placeholders.length === 0) return

  const m = await getMermaid()

  for (const el of placeholders) {
    const code = el.dataset.mermaidCode
    if (!code) continue
    const decoded = decodeURIComponent(code)

    try {
      const valid = await parseMermaid(m, decoded)
      if (!valid) {
        markPlaceholderFailed(el)
        continue
      }
      const diagramId = `mermaid-hydrate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const { svg } = await renderMermaidDiagram(m, diagramId, decoded)
      applyRenderedSvg(el, svg)
      el.classList.remove('mermaid-placeholder')
      el.classList.add('mermaid-rendered')
    } catch {
      resetMermaidModuleForRetry()
      markPlaceholderFailed(el)
    }
  }
}

const hydrateChainByContainer = new WeakMap<HTMLElement, Promise<void>>()

/**
 * Hydrate mermaid placeholder divs rendered by the marked pipeline.
 * Call after dangerouslySetInnerHTML commits.
 * Chains per-container so React Strict Mode / double effects do not run m.render in parallel.
 */
export async function hydrateMermaidPlaceholders(container: HTMLElement) {
  const prev = hydrateChainByContainer.get(container) ?? Promise.resolve()
  const next = prev
    .then(() => runMermaidHydratePass(container))
    .finally(() => {
      if (hydrateChainByContainer.get(container) === next) {
        hydrateChainByContainer.delete(container)
      }
    })
  hydrateChainByContainer.set(container, next)
  await next
}

/** True when the container still has pending mermaid placeholders. */
export function hasMermaidPlaceholders(container: HTMLElement): boolean {
  return container.querySelector('.mermaid-placeholder') !== null
}
