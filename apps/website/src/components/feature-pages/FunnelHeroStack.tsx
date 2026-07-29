'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Globe, Lock, Zap } from 'lucide-react'
import { FunnelHeroPageOneWebGpu } from '@/components/feature-pages/FunnelHeroPageOneWebGpu'
import { FunnelHeroPageThreeCanvas } from '@/components/feature-pages/FunnelHeroPageThreeCanvas'
import { FunnelHeroPageTwoWebGl } from '@/components/feature-pages/FunnelHeroPageTwoWebGl'

export function FunnelHeroStack(props: { kicker: string; title: string; subtitle: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const peelDistance = 1000
  const peel1 = useTransform(scrollYProgress, [0, 0.32], [0, peelDistance])
  const peel2 = useTransform(scrollYProgress, [0, 0.36, 0.68], [0, 0, peelDistance])

  const layer1Opacity = useTransform(scrollYProgress, [0, 0.28, 0.38], [1, 1, 0])
  const layer2Opacity = useTransform(scrollYProgress, [0, 0.62, 0.76], [1, 1, 0])
  const layer1PointerEvents = useTransform(layer1Opacity, (o) => (o < 0.02 ? 'none' : 'auto'))
  const layer2PointerEvents = useTransform(layer2Opacity, (o) => (o < 0.02 ? 'none' : 'auto'))

  const scrollExplore = () => {
    window.scrollBy({
      top: window.innerHeight * 0.75,
      behavior: 'smooth',
    })
  }

  const pageOne = (
    <FunnelHeroPageOneWebGpu
      kicker={props.kicker}
      title={props.title}
      subtitle={props.subtitle}
      onScrollExplore={scrollExplore}
    />
  )

  const pageTwo = (
    <FunnelHeroPageTwoWebGl
      trustBadge={{
        text: 'Your brand, your domain',
        icons: [
          <Globe key="globe" size={14} />,
          <Lock key="lock" size={14} />,
          <Zap key="zap" size={14} />,
        ],
      }}
      headline={{ line1: 'One-click publish.', line2: 'Your custom domain.' }}
      subtitle="Go live on ROAS infrastructure or connect your own domain. SSL, DNS, and hosting handled automatically: just hit publish."
    />
  )

  const pageThree = (
    <FunnelHeroPageThreeCanvas
      scrollTriggerRootRef={containerRef}
      bigTitle="MEASURE"
      leftColumn={'SEO-ready pages.\nMeta tags & structured\ndata ship automatically.'}
      rightColumn={'Built-in analytics.\nConversions, visits &\nalerts in real time.'}
      footerLine="Industry-grade templates from conversation"
    />
  )

  const layerKeys = ['page-1-webgpu', 'page-2-webgl', 'page-3-canvas'] as const

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="pointer-events-none relative min-h-0 w-full lg:min-h-[270vh]"
      >
        <div className="w-full">
          <div className="relative min-h-0 lg:min-h-[270vh]">
            <div className="pointer-events-auto sticky top-0 z-0 flex min-h-[100dvh] w-full flex-col items-stretch">
              <div className="relative min-h-0 w-full flex-1">
                <div className="relative mx-auto h-[100dvh] min-h-0 w-full">
                  <div className="hidden lg:block">
                    <motion.div
                      key={layerKeys[0]}
                      className="absolute inset-0 w-full"
                      style={{
                        y: peel1,
                        opacity: layer1Opacity,
                        zIndex: 30,
                        pointerEvents: layer1PointerEvents,
                      }}
                    >
                      {pageOne}
                    </motion.div>
                    <motion.div
                      key={layerKeys[1]}
                      className="absolute inset-0 w-full"
                      style={{
                        y: peel2,
                        opacity: layer2Opacity,
                        zIndex: 20,
                        pointerEvents: layer2PointerEvents,
                      }}
                    >
                      {pageTwo}
                    </motion.div>
                    <div
                      key={layerKeys[2]}
                      className="absolute inset-0 w-full"
                      style={{ zIndex: 10 }}
                    >
                      {pageThree}
                    </div>
                  </div>

                  <div className="pointer-events-auto flex flex-col gap-0 lg:hidden">
                    <div className="relative h-[100dvh] min-h-0 w-full shrink-0 overflow-hidden">
                      {pageOne}
                    </div>
                    <div className="relative h-[100dvh] min-h-0 w-full shrink-0 overflow-hidden">
                      {pageTwo}
                    </div>
                    <div className="relative h-[100dvh] min-h-0 w-full shrink-0 overflow-hidden">
                      {pageThree}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
