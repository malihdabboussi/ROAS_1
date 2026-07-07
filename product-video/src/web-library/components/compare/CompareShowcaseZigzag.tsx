'use client'

import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { CompareWaitlistButton } from '@/components/compare/CompareWaitlistButton'
import {
  FeatureMockupByKind,
  type FeatureMockupKind,
} from '@/components/feature-pages/FeatureMockups'
import type { CompareShowcase } from '@/lib/compare-content'

export function CompareShowcaseZigzag(props: CompareShowcase) {
  return (
    <section className="section-padding border-section relative border-t">
      <div className="site-container">
        <AnimateOnScroll>
          <header className="mx-auto mb-14 max-w-3xl text-center md:mb-16">
            <h2 className="h2 mb-4 tracking-tight text-white">{props.sectionTitle}</h2>
            <p className="text-text-muted body-2 leading-relaxed">{props.sectionSubtitle}</p>
          </header>
        </AnimateOnScroll>

        <div className="flex flex-col gap-20 lg:gap-28">
          {props.rows.map((row, i) => {
            const textOrder = i % 2 === 0 ? 'order-2 lg:order-1' : 'order-2 lg:order-2'
            const mediaOrder = i % 2 === 0 ? 'order-1 lg:order-2' : 'order-1 lg:order-1'
            return (
              <AnimateOnScroll key={row.title}>
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                  <div className={textOrder}>
                    <h3 className="h3 mb-4 text-white">{row.title}</h3>
                    <p className="text-text-muted body-2 mb-8 max-w-xl leading-relaxed">
                      {row.body}
                    </p>
                    {i === props.rows.length - 1 && (
                      <CompareWaitlistButton className="chip-glass-emerald body-3 rounded-full px-8 py-3 font-semibold">
                        Join Waitlist
                      </CompareWaitlistButton>
                    )}
                  </div>
                  <div className={mediaOrder}>
                    <div className="glass-card border-section overflow-hidden rounded-2xl border">
                      <FeatureMockupByKind kind={row.visual as FeatureMockupKind} />
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            )
          })}
        </div>
      </div>
    </section>
  )
}
