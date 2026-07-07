'use client'

import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function StandaloneVideoShowcase(props: {
  title: string
  subtitle?: string
  videoSrc: string
}) {
  return (
    <section className="section-padding relative">
      <div className="site-container">
        <div className="text-center mb-12 md:mb-16">
          <AnimateOnScroll>
            <h2 className="h2 mb-4 tracking-tight text-white">{props.title}</h2>
            {props.subtitle && (
              <p className="text-text-muted body-1 mx-auto max-w-2xl leading-relaxed">
                {props.subtitle}
              </p>
            )}
          </AnimateOnScroll>
        </div>

        <div>
          <AnimateOnScroll>
            <div className="glass-card border-section overflow-hidden rounded-2xl border shadow-2xl">
              <video
                src={props.videoSrc}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto aspect-video object-cover"
              />
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  )
}
