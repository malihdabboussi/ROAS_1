'use client'

import Link from 'next/link'
import { ArrowDown, ArrowRight } from 'lucide-react'
import { MarketingMemoryStackMockup } from '@/components/marketing/MarketingMemoryStackMockup'

export function HomeHeroNew() {
  return (
    <section className="bg-color-deep relative flex min-h-[88vh] flex-col overflow-x-clip overflow-y-visible pt-28 md:pt-36">
      <div className="hero-dot-grid pointer-events-none absolute inset-0 z-0" />
      <div className="hero-beam-glow pointer-events-none" aria-hidden />

      <div className="site-container relative z-10 flex flex-1 flex-col items-center justify-center gap-12 pb-16 md:gap-16 md:pb-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 text-center">
          <Link
            href="/blog/vibey-beta"
            className="pill-announcement mx-auto flex w-fit items-center gap-3"
          >
            <span className="badge-glass badge-glass-secondary rounded-full font-semibold">
              Beta
            </span>
            <span className="body-3 font-medium text-white">Introducing ROAS</span>
            <ArrowRight size={14} className="text-color-muted" />
          </Link>

          <h1 className="h1 uppercase tracking-tight text-white">
            <span className="block">RUN YOUR COMPANY</span>
            <span className="block">
              WITH <span className="gradient-text">HUMANS AND AGENTS</span>
            </span>
          </h1>

          <p className="body-1 text-color-secondary max-w-2xl leading-relaxed">
            AI tools gave you a chatbot. You wanted a company. ROAS is the hybrid operating layer
            where your team and your AI agents share the same knowledge, the same workspace, and
            the same work.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://app.vibey.im/login"
              className="chip-glass-emerald body-3 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold"
            >
              Get Early Access
              <ArrowRight size={14} />
            </a>
            <a
              href="#three-pieces"
              className="chip-glass-neutral body-3 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white"
            >
              See how it works
              <ArrowDown size={14} />
            </a>
          </div>
        </div>

        <div className="relative w-full">
          <MarketingMemoryStackMockup />
        </div>
      </div>
    </section>
  )
}
