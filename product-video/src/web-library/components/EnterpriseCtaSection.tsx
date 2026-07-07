'use client'

import { ArrowRight } from 'lucide-react'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { useEnterpriseContactModal } from '@/components/EnterpriseContactModalProvider'

export function EnterpriseCtaSection() {
  const { openEnterpriseContact } = useEnterpriseContactModal()

  return (
    <section className="pb-20">
      <AnimateOnScroll>
        <div className="site-container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="h3 mb-2 tracking-tight text-white">Pricing</h2>
            <p className="text-text-muted body-2 mb-6">
              Enterprise plans bundle seats, workspaces, and success coverage. We&apos;ll scope
              yours after a short discovery call.
            </p>
            <button
              type="button"
              onClick={openEnterpriseContact}
              className="chip-glass-emerald body-3 inline-flex items-center gap-2 rounded-xl px-8 py-3 font-semibold"
            >
              Contact Us
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}
