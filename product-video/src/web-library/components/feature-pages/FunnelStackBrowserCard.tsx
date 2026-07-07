import type { ReactNode } from 'react'
import { Globe, LayoutTemplate } from 'lucide-react'

export type FunnelStackCardContent = {
  url: string
  funnelLabel: string
  pill: string
  headline: string
  headlineLine2?: string
  subcopy: string
  ctaLabel: string
  variant: 'draft' | 'live' | 'analytics'
}

function LandingChrome({
  content,
  children,
}: {
  content: FunnelStackCardContent
  children: ReactNode
}) {
  return (
    <div className="mockup-frame flex h-[min(78vh,720px)] w-full flex-col overflow-hidden rounded-xl lg:h-[min(82vh,760px)] lg:rounded-2xl">
      <div className="mockup-chrome shrink-0">
        <div className="mockup-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="mockup-url truncate">{content.url}</div>
      </div>

      <div className="mockup-toolbar shrink-0">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <LayoutTemplate size={14} className="shrink-0 text-color-muted" />
          <span className="truncate text-[12px] font-medium text-white">{content.funnelLabel}</span>
          {content.variant === 'draft' && (
            <span className="border-color-glass shrink-0 rounded-md border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-color-muted">
              Draft
            </span>
          )}
          {(content.variant === 'live' || content.variant === 'analytics') && (
            <span className="mockup-badge-emerald shrink-0 px-2 py-0.5">
              <span className="mockup-dot-active" />
              <span className="text-color-emerald text-[10px]">Live</span>
            </span>
          )}
        </div>
        {(content.variant === 'live' || content.variant === 'analytics') && (
          <div className="mockup-btn-publish shrink-0 px-3 py-1">
            <Globe size={12} className="text-color-emerald" />
            <span className="text-color-emerald text-[11px] font-medium">Publish</span>
          </div>
        )}
      </div>

      <div className="bg-color-deep-darker flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}

export function FunnelStackBrowserCard({
  content,
  embeddedHero,
}: {
  content: FunnelStackCardContent
  embeddedHero?: { kicker: string; title: string; subtitle: string }
}) {
  return (
    <LandingChrome content={content}>
      <div className="mockup-preview-gradient flex min-h-0 flex-1 flex-col px-5 pb-5 pt-7 text-center sm:px-8 sm:pb-6 sm:pt-9">
        {embeddedHero ? (
          <>
            {embeddedHero.kicker ? (
              <span className="typo-caption text-secondary mb-2 block font-semibold uppercase tracking-widest sm:mb-3">
                {embeddedHero.kicker}
              </span>
            ) : null}
            <h4 className="mb-2 text-base font-bold uppercase leading-tight tracking-tight text-white sm:mb-3 sm:text-lg md:text-xl">
              {embeddedHero.title}
            </h4>
            <p className="text-color-muted mx-auto mb-5 max-w-md text-[11px] leading-relaxed sm:mb-6 sm:text-[12px]">
              {embeddedHero.subtitle}
            </p>
          </>
        ) : (
          <>
            <div className="mockup-pill-emerald mb-3 inline-block self-center px-3 py-0.5 text-[10px] sm:text-[11px]">
              {content.pill}
            </div>
            <h4 className="mb-2 text-lg font-bold leading-tight tracking-tight text-white sm:text-xl">
              {content.headline}
              {content.headlineLine2 ? (
                <>
                  <br />
                  {content.headlineLine2}
                </>
              ) : null}
            </h4>
            <p className="text-color-muted mx-auto mb-5 max-w-sm text-[11px] leading-relaxed sm:mb-6 sm:text-[12px]">
              {content.subcopy}
            </p>
          </>
        )}
        <div className="mockup-btn-emerald mb-6 inline-block self-center px-6 py-2.5 text-[11px] sm:mb-8 sm:px-8 sm:py-3 sm:text-[12px]">
          {content.ctaLabel}
        </div>

        {content.variant === 'draft' && (
          <div className="border-color-glass-dim mt-auto border-t px-2 py-4 sm:py-5">
            <p className="text-color-dimmer mb-3 text-[9px] font-medium uppercase tracking-widest sm:text-[10px]">
              Sections ready to ship
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {['Hero', 'Social proof', 'FAQ', 'Footer CTA'].map((label) => (
                <span
                  key={label}
                  className="border-color-glass rounded-lg border bg-white/5 px-2.5 py-1 text-[9px] text-color-muted sm:text-[10px]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {content.variant === 'live' && (
          <div className="border-color-glass-dim mt-auto border-t px-4 py-4 text-center sm:px-6 sm:py-5">
            <p className="text-color-dimmer mb-3 text-[9px] font-medium uppercase tracking-widest sm:text-[10px]">
              Trusted by founders at
            </p>
            <div className="flex items-center justify-center gap-6 opacity-40 grayscale sm:gap-8">
              {['YC', 'Techstars', '500'].map((name) => (
                <span key={name} className="text-[11px] font-bold tracking-tight text-white sm:text-[12px]">
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {content.variant === 'analytics' && (
          <div className="border-color-glass-dim mt-auto space-y-4 border-t px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
              {[
                { k: 'Views', v: '12.4k' },
                { k: 'Leads', v: '842' },
                { k: 'CVR', v: '4.2%' },
              ].map(({ k, v }) => (
                <div key={k} className="text-center">
                  <p className="text-sm font-semibold text-white sm:text-base">{v}</p>
                  <p className="text-color-dimmer text-[9px] uppercase tracking-wider sm:text-[10px]">{k}</p>
                </div>
              ))}
            </div>
            <div className="border-color-glass rounded-lg border bg-white/5 px-3 py-2.5 text-left sm:px-4">
              <p className="text-color-dimmer mb-1 text-[9px] font-medium uppercase tracking-wider">Latest signups</p>
              <p className="text-color-muted text-[10px] leading-relaxed sm:text-[11px]">
                alex@company.com · 2m ago · <span className="text-color-emerald">Confirmed</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </LandingChrome>
  )
}

export const FUNNEL_HERO_STACK_CARDS: FunnelStackCardContent[] = [
  {
    variant: 'live',
    url: 'your-funnel.govibey.com',
    funnelLabel: 'Lead Gen Funnel',
    pill: 'Live in workspace',
    headline: 'Stop Losing Leads.',
    headlineLine2: 'Start Automating Sales.',
    subcopy:
      'The same page your visitors see-forms and opt-ins wired to your workspace the moment you publish.',
    ctaLabel: 'Get the Free Playbook',
  },
  {
    variant: 'analytics',
    url: 'your-funnel.govibey.com',
    funnelLabel: 'Lead Gen Funnel',
    pill: 'Ship & measure',
    headline: 'Built to rank.',
    headlineLine2: 'Built to convert.',
    subcopy:
      'Semantic structure for search, built-in performance metrics, and alerts when someone converts-so every revision compounds.',
    ctaLabel: 'See live funnel',
  },
]
