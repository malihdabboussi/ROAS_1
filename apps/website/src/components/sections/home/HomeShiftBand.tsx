'use client'

export function HomeShiftBand() {
  return (
    <section className="border-section bg-color-panel relative border-y py-20 md:py-28">
      <div className="hero-dot-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="site-container relative z-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 text-center">
          <p className="text-color-dim body-4 font-semibold uppercase tracking-[0.25em]">
            The shift
          </p>
          <h2 className="h2 tracking-tight text-white">
            AI was supposed to remove the chaos. So far it has{' '}
            <span className="text-color-secondary">mostly added another tab.</span>
          </h2>
          <p className="body-2 text-color-secondary leading-relaxed">
            A chatbot in one window. A workflow tool in another. Three docs that contradict each
            other. Your team paying the tax of stitching it all together. The next wave is not a
            smarter chatbot — it is a company that runs as a hybrid of humans and agents in one
            place. ROAS is that place.
          </p>
        </div>
      </div>
    </section>
  )
}
