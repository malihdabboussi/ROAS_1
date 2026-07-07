'use client'

import { ArrowRight } from 'lucide-react'

export function HomeFinalCTA() {
  return (
    <section className="bg-color-deep relative overflow-hidden py-24 md:py-32">
      <div className="hero-dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="hero-beam-glow pointer-events-none" aria-hidden />

      <div className="site-container relative z-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <h2 className="h1 uppercase tracking-tight text-white">
            RUN THE COMPANY WITH
            <br />
            <span className="gradient-text">HUMANS AND AGENTS.</span>
          </h2>
          <p className="body-2 text-color-secondary leading-relaxed">
            Connect your knowledge. Hire your first agents. Put your team inside one workspace
            where the work actually moves.
          </p>
          <a
            href="https://app.vibey.im/register"
            className="chip-glass-emerald body-2 mt-2 inline-flex items-center gap-2 rounded-xl px-8 py-4 font-semibold"
          >
            Get Early Access
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}
