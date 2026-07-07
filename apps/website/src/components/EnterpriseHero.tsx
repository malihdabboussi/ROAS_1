'use client'

import Link from 'next/link'
import { useEnterpriseContactModal } from '@/components/EnterpriseContactModalProvider'
import type { FeatureMockupKind } from '@/components/feature-pages/FeatureMockups'
import { FeatureMockupByKind } from '@/components/feature-pages/FeatureMockups'

export function EnterpriseHero() {
  const { openEnterpriseContact } = useEnterpriseContactModal()

  return (
    <section className="relative pt-10 md:pt-16">
      <div className="site-container relative z-10 mx-auto w-full max-w-6xl px-6 text-center">
        <span className="typo-caption text-secondary mb-4 block font-semibold uppercase tracking-widest">
          Enterprise
        </span>
        <h1 className="h1 mb-4 tracking-tight text-white">HQ FOR MULTI-TEAM GTM</h1>
        <p className="text-text-muted body-1 mx-auto mb-8 max-w-2xl leading-relaxed">
          Spin up workspaces per brand, region, or business unit while leadership keeps visibility
          on campaigns, spend, and learnings.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={openEnterpriseContact}
            className="chip-glass-emerald body-3 inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold"
          >
            Contact Us
          </button>
          <Link
            href="/features/integrations"
            className="chip-glass-neutral body-3 inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold"
          >
            Integrations
          </Link>
        </div>
      </div>

      <div className="site-container relative mx-auto mt-10 w-full pb-16 md:pb-20">
        <div className="feature-hero-mockup-glow" aria-hidden />
        <div className="relative z-10 mx-auto w-full">
          <FeatureMockupByKind kind={'enterprise-hq' as FeatureMockupKind} />
        </div>
      </div>
    </section>
  )
}
