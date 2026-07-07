'use client'

import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function ProofCarousel(props: {
  title: string
  quotes: { quote: string; name: string; role: string }[]
}) {
  return (
    <section className="section-padding relative">
      <AnimateOnScroll>
        <div className="site-container">
          <h2 className="h2 mb-8 tracking-tight text-white">{props.title}</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {props.quotes.map((q) => (
              <blockquote
                key={q.name}
                className="glass-card border-section min-w-[280px] max-w-sm shrink-0 rounded-2xl border p-6 md:min-w-[320px]"
              >
                <p className="text-text-muted body-2 mb-4 leading-relaxed">
                  &ldquo;{q.quote}&rdquo;
                </p>
                <footer>
                  <p className="body-3 font-semibold text-white">{q.name}</p>
                  <p className="text-color-dim body-4">{q.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}
