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
  /** True while the mermaid fence is still streaming closed. */
  pending?: boolean
}

export const MERMAID_DIAGRAM_MESSAGES = {
  pending: 'Diagram',
  rendering: 'Rendering diagram…',
  failed: 'Could not render diagram',
  retry: 'Try again',
} as const

export function MermaidDiagram({ code, className, pending = false }: MermaidDiagramProps) {
  const uniqueId = useId().replace(/:/g, '-')
  const containerRef = useRef<HTMLDivElement>(null)
  const renderGenerationRef = useRef(0)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const render = useCallback(async () => {
    const trimmed = code.trim()
    if (pending || !trimmed) return

    const generation = ++renderGenerationRef.current
    setReady(false)
    setError(null)

    try {
      const m = await getMermaid()
      const valid = await parseMermaid(m, trimmed)
      if (generation !== renderGenerationRef.current) return
      if (valid === false) {
        setError('invalid')
        return
      }
      const diagramId = `mermaid-${uniqueId}-${Date.now()}`
      const { svg } = await renderMermaidDiagram(m, diagramId, trimmed)
      if (generation !== renderGenerationRef.current) return
      const commitSvg = () => {
        if (generation !== renderGenerationRef.current) return
        if (!containerRef.current) {
          setError(MERMAID_DIAGRAM_MESSAGES.failed)
          return
        }
        applyRenderedSvg(containerRef.current, svg)
        setReady(true)
      }
      if (containerRef.current) {
        commitSvg()
      } else {
        requestAnimationFrame(commitSvg)
      }
    } catch (err) {
      if (generation !== renderGenerationRef.current) return
      resetMermaidModuleForRetry()
      const msg = err instanceof Error ? err.message : MERMAID_DIAGRAM_MESSAGES.failed
      setError(msg)
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [code, pending, uniqueId])

  useEffect(() => {
    if (pending) {
      renderGenerationRef.current += 1
      setReady(false)
      setError(null)
      return
    }
    void render()
  }, [pending, render])

  if (pending || !code.trim()) {
    return (
      <div
        className={[
          'bg-secondary my-3 flex items-center justify-center gap-2.5 overflow-x-auto rounded-lg p-6',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="typo-caption text-muted-foreground">{MERMAID_DIAGRAM_MESSAGES.pending}</span>
      </div>
    )
  }

  const showLoading = !ready && !error

  return (
    <div
      className={[
        'bg-secondary my-3 flex justify-center overflow-x-auto overflow-y-visible rounded-lg p-4 pb-5',
        (showLoading || error) && 'min-h-[60px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {error ? (
        <div className="flex flex-col items-center justify-center gap-2">
          <p className="typo-caption text-muted-foreground">{MERMAID_DIAGRAM_MESSAGES.failed}</p>
          <button
            type="button"
            className="button-compact button-glass-neutral"
            onClick={() => void render()}
          >
            {MERMAID_DIAGRAM_MESSAGES.retry}
          </button>
        </div>
      ) : showLoading ? (
        <div className="flex items-center justify-center gap-2.5">
          <span className="mermaid-orb-pulse" />
          <span className="typo-caption text-muted-foreground">
            {MERMAID_DIAGRAM_MESSAGES.rendering}
          </span>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={error || showLoading ? 'hidden' : '[&_svg]:h-auto [&_svg]:max-w-full'}
      />
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
      if (valid === false) {
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
