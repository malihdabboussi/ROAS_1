'use client'

import { lazy, Suspense, useMemo, type ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const MermaidDiagram = lazy(() =>
  import('@/components/ui/mermaid-diagram').then((m) => ({ default: m.MermaidDiagram })),
)

function getMdComponents(opts: { compact?: boolean; muted?: boolean }) {
  const { compact, muted } = opts
  const bodyText = muted
    ? 'text-[var(--color-muted-foreground)]'
    : 'text-[var(--color-foreground)]/90'
  const blockMb = compact ? 'mb-2 last:mb-0' : 'mb-3'
  const strongCls = muted
    ? 'font-semibold text-[var(--color-muted-foreground)]'
    : 'font-semibold text-[var(--color-foreground)]'
  return {
    ...mdComponentsBase,
    p: (p: ComponentPropsWithoutRef<'p'>) => (
      <p
        {...p}
        className={`${bodyText} ${blockMb} leading-relaxed${compact ? 'first:mt-0' : ''}`}
      />
    ),
    strong: (p: ComponentPropsWithoutRef<'strong'>) => <strong {...p} className={strongCls} />,
    ul: (p: ComponentPropsWithoutRef<'ul'>) => (
      <ul {...p} className={`${bodyText} ${blockMb} ml-5 list-disc space-y-1`} />
    ),
    ol: (p: ComponentPropsWithoutRef<'ol'>) => (
      <ol {...p} className={`${bodyText} ${blockMb} ml-5 list-decimal space-y-1`} />
    ),
    em: (p: ComponentPropsWithoutRef<'em'>) => (
      <em {...p} className={muted ? 'italic text-[var(--color-muted-foreground)]' : 'italic'} />
    ),
  }
}

const mdComponentsBase = {
  h1: (p: ComponentPropsWithoutRef<'h1'>) => (
    <h1 {...p} className="mb-4 mt-6 text-xl font-bold text-[var(--color-foreground)] first:mt-0" />
  ),
  h2: (p: ComponentPropsWithoutRef<'h2'>) => (
    <h2
      {...p}
      className="mb-3 mt-5 text-lg font-semibold text-[var(--color-foreground)] first:mt-0"
    />
  ),
  h3: (p: ComponentPropsWithoutRef<'h3'>) => (
    <h3 {...p} className="mb-2 mt-4 text-base font-semibold text-[var(--color-foreground)]" />
  ),
  h4: (p: ComponentPropsWithoutRef<'h4'>) => (
    <h4 {...p} className="mb-2 mt-3 text-sm font-semibold text-[var(--color-foreground)]" />
  ),
  li: (p: ComponentPropsWithoutRef<'li'>) => <li {...p} className="leading-relaxed" />,
  a: (p: ComponentPropsWithoutRef<'a'>) => (
    <a
      {...p}
      className="text-[var(--color-primary)] underline hover:no-underline"
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
  blockquote: (p: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      {...p}
      className="border-[var(--color-primary)]/30 my-3 border-l-2 pl-4 italic text-[var(--color-muted-foreground)]"
    />
  ),
  code: ({ children, className, ...rest }: ComponentPropsWithoutRef<'code'>) => {
    if (className?.includes('language-mermaid')) {
      const code = String(children).replace(/\n$/, '')
      return (
        <Suspense
          fallback={
            <div className="bg-[var(--color-secondary)]/50 my-3 flex justify-center rounded-lg p-4">
              <span className="text-xs text-[var(--color-muted-foreground)]">Loading diagram…</span>
            </div>
          }
        >
          <MermaidDiagram code={code} />
        </Suspense>
      )
    }
    const isBlock = className?.includes('language-')
    if (isBlock)
      return (
        <code
          {...rest}
          className={`block overflow-x-auto rounded-lg bg-[var(--color-secondary)] p-4 text-xs leading-relaxed text-[var(--color-foreground)] ${className ?? ''}`}
        >
          {children}
        </code>
      )
    return (
      <code
        {...rest}
        className="rounded bg-[var(--color-secondary)] px-1.5 py-0.5 text-xs text-[var(--color-foreground)]"
      >
        {children}
      </code>
    )
  },
  pre: (p: ComponentPropsWithoutRef<'pre'>) => (
    <pre {...p} className="mb-3 overflow-x-auto rounded-lg bg-[var(--color-secondary)] p-4" />
  ),
  hr: () => <hr className="border-[var(--color-foreground)]/10 my-4 border-t" />,
  table: (p: ComponentPropsWithoutRef<'table'>) => (
    <div className="mb-3 overflow-x-auto">
      <table {...p} className="w-full text-sm" />
    </div>
  ),
  thead: (p: ComponentPropsWithoutRef<'thead'>) => (
    <thead {...p} className="border-border border-b" />
  ),
  th: (p: ComponentPropsWithoutRef<'th'>) => (
    <th
      {...p}
      className="border-border border-b px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--color-muted-foreground)]"
    />
  ),
  td: (p: ComponentPropsWithoutRef<'td'>) => (
    <td {...p} className="border-border text-[var(--color-foreground)]/90 border-b px-3 py-2" />
  ),
}

const mdComponents = getMdComponents({})

interface MarkdownRendererProps {
  children: string
  className?: string
  /** Tight blocks and spacing for inline / list contexts (e.g. notifications). */
  compact?: boolean
  /** Muted body color; strong/em follow muted tone */
  muted?: boolean
}

export function MarkdownRenderer({ children, className, compact, muted }: MarkdownRendererProps) {
  const source = useMemo(() => children.replace(/\u2014/g, ','), [children])
  const components = useMemo(
    () => (compact || muted ? getMdComponents({ compact, muted }) : mdComponents),
    [compact, muted],
  )
  return (
    <div className={className ?? 'body-3 max-w-none'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  )
}
