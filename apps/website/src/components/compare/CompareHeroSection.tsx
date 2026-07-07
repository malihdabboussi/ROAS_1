'use client'

import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import type { CompareSlug } from '@/lib/compare-content'

function CompareHeroPartnerMark({ slug }: { slug: CompareSlug }) {
  if (slug === 'vs-manus') {
    return (
      <span className="text-color-primary font-sans text-sm font-bold tracking-tight">Manus</span>
    )
  }
  return (
    <span className="text-color-primary text-center font-sans text-[10px] font-bold leading-tight tracking-tight">
      Click
      <br />
      Funnels
    </span>
  )
}

function CompareHeroPartnerLogo({ slug, themLabel }: { slug: CompareSlug; themLabel: string }) {
  if (slug === 'vs-chatgpt') {
    return (
      <img
        src="/compare/openai.svg"
        alt={themLabel}
        width={48}
        height={48}
        className="h-12 w-12 object-contain"
      />
    )
  }
  return <CompareHeroPartnerMark slug={slug} />
}

function CompareHeroVisual({ slug, themLabel }: { slug: CompareSlug; themLabel: string }) {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:ml-auto">
      <div className="compare-hero-card-shell border-color-glass bg-color-panel-mid relative w-full overflow-hidden rounded-2xl border backdrop-blur-xl">
        <div className="compare-hero-brain-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex h-full items-center justify-center gap-5 px-8 py-10 sm:gap-8 sm:py-12">
          <div className="chip-glass-neutral flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center rounded-2xl sm:h-[5.25rem] sm:w-[5.25rem]">
            <img
              src="/Logos/logov2/icon-white.png"
              alt="Vibey"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
          </div>
          <div className="chip-glass-neutral flex h-[4.75rem] w-[4.75rem] shrink-0 items-center justify-center rounded-2xl sm:h-[5.25rem] sm:w-[5.25rem]">
            <CompareHeroPartnerLogo slug={slug} themLabel={themLabel} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function CompareHeroSection(props: {
  slug: CompareSlug
  kicker: string
  title: string
  subtitle: string
  bullets: string[]
  themLabel: string
}) {
  return (
    <section className="relative pb-10 pt-10 md:pb-14 md:pt-16">
      <div className="site-container grid gap-10 lg:grid-cols-2 lg:items-center">
        <AnimateOnScroll>
          <div className="lg:pr-4">
            <span className="typo-caption text-secondary mb-4 block font-semibold tracking-wide">
              {props.kicker}
            </span>
            <h1 className="h1 mb-4 tracking-tight text-white">{props.title}</h1>
            <p className="text-text-muted body-1 mb-8 max-w-xl leading-relaxed">{props.subtitle}</p>
            <ul className="text-text-muted body-3 mb-8 max-w-xl space-y-2">
              {props.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-emerald-accent shrink-0">•</span>
                  {b}
                </li>
              ))}
            </ul>
            <a
              href="https://app.vibey.im/register"
              className="chip-glass-emerald body-3 inline-flex items-center justify-center rounded-xl px-8 py-3 font-semibold"
            >
              Get Early Access
            </a>
          </div>
        </AnimateOnScroll>
        <AnimateOnScroll delay={80}>
          <CompareHeroVisual slug={props.slug} themLabel={props.themLabel} />
        </AnimateOnScroll>
      </div>
    </section>
  )
}
