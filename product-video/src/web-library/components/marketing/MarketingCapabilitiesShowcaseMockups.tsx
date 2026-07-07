'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AppMockupCampaignPreviewRotator,
  type CampaignPreviewGlass,
} from '@/components/AppMockupCampaignPreviewRotator'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const MEDIA_SHOWCASE_IMAGES = [
  '/images/marketing/ai-gen-creative-1.png',
  '/images/marketing/ai-gen-creative-2.png',
] as const

const MARQUEE_LOGOS = [
  {
    key: 'gemini',
    src: '/images/marketing/vendor-logos/gemini.svg',
    alt: 'Google Gemini',
    h: 'h-6',
  },
  { key: 'kling', src: '/images/marketing/vendor-logos/kling.png', alt: 'Kling AI', h: 'h-8' },
  { key: 'ffmpeg', src: '/images/marketing/vendor-logos/ffmpeg.png', alt: 'FFmpeg', h: 'h-8' },
  {
    key: 'elevenlabs',
    src: '/images/marketing/vendor-logos/elevenlabs-white.png',
    alt: 'ElevenLabs',
    h: 'h-5',
  },
  {
    key: 'deepgram',
    src: '/images/marketing/vendor-logos/deepgram.svg',
    alt: 'Deepgram',
    h: 'h-5',
  },
  { key: 'veo', src: '/images/marketing/vendor-logos/veo.svg', alt: 'Google Veo', h: 'h-7' },
  { key: 'openai', src: '/compare/openai.svg', alt: 'OpenAI', h: 'h-5' },
] as const

function MediaVendorLogoMarquee() {
  return (
    <div
      className="relative min-w-0 max-w-full overflow-hidden py-3"
      style={{
        maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
      }}
    >
      <div className="marquee-logos-track items-center">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-8 pr-8 sm:gap-14 sm:pr-14">
            {MARQUEE_LOGOS.map((item) => (
              <img
                key={`${copy}-${item.key}`}
                src={item.src}
                alt={item.alt}
                className={`w-auto shrink-0 object-contain ${item.h}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MediaAudioWaveform() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const BAR_W = 3
    const GAP = 2

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = wrap.clientWidth
      const h = wrap.clientHeight || 56
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const t0 = performance.now()
    const draw = (now: number) => {
      const t = (now - t0) * 0.001
      const w = wrap.clientWidth
      const h = wrap.clientHeight || 56
      if (w < 4) {
        raf = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)
      const bars = Math.floor(w / (BAR_W + GAP))
      const midY = h * 0.5

      for (let i = 0; i < bars; i++) {
        const x = i * (BAR_W + GAP) + 0.5
        const norm = i / bars
        const amp =
          Math.sin(norm * Math.PI * 3.2 + t * 1.8) * 0.32 +
          Math.sin(norm * Math.PI * 5.6 - t * 2.6) * 0.24 +
          Math.sin(norm * Math.PI * 1.4 + t * 3.1) * 0.18 +
          0.22
        const half = Math.max(2, amp * h * 0.42)
        const alpha = 0.5 + amp * 0.5

        const grad = ctx.createLinearGradient(x, midY - half, x, midY + half)
        grad.addColorStop(0, `rgba(52, 211, 153, ${alpha * 0.15})`)
        grad.addColorStop(0.35, `rgba(110, 231, 183, ${alpha})`)
        grad.addColorStop(0.5, `rgba(167, 243, 208, ${alpha})`)
        grad.addColorStop(0.65, `rgba(110, 231, 183, ${alpha})`)
        grad.addColorStop(1, `rgba(52, 211, 153, ${alpha * 0.15})`)

        ctx.beginPath()
        ctx.roundRect(x, midY - half, BAR_W, half * 2, BAR_W / 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={wrapRef} className="mt-2 h-14 w-full overflow-hidden rounded-lg bg-black/40">
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden />
    </div>
  )
}

const GTM_PREVIEW_GLASS: CampaignPreviewGlass = {
  cardGlass: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  chipGlassGreen: {
    background:
      'linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(16,185,129,0.22) 50%, rgba(52,211,153,0.12) 100%)',
    border: '1px solid rgba(52,211,153,0.35)',
    boxShadow: '0 2px 10px rgba(52,211,153,0.12)',
    color: 'rgb(52,211,153)',
  },
  chipGlassNeutral: {
    background:
      'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    color: 'rgba(255,255,255,0.6)',
  },
}

/** Block 1 — Marketing & GTM: reuses the Studio artifact preview rotator. */
export function MarketingCapabilitiesGtmMockup() {
  return (
    <FeatureFloatingMockShell className="!flex !min-h-[440px] !flex-col">
      <div className="relative z-[1] flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <AppMockupCampaignPreviewRotator glass={GTM_PREVIEW_GLASS} hideTree />
      </div>
    </FeatureFloatingMockShell>
  )
}

/** Block 2 — Media & production: video gen/edit, images, audio (matches capabilities copy). */
export function MarketingCapabilitiesMediaMockup() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1600)
    return () => clearInterval(t)
  }, [])

  return (
    <FeatureFloatingMockShell className="!min-h-0 sm:!min-h-[440px]">
      <div className="relative z-[1] flex min-h-0 min-w-0 max-w-full flex-col gap-2.5 overflow-hidden p-2.5 sm:min-h-[420px] sm:gap-5 sm:p-6">
        <MediaVendorLogoMarquee />

        <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:gap-3">
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-2.5 sm:p-4">
            <div className="mb-1.5 sm:mb-2">
              <span className="text-[10px] font-bold text-white">Video generation</span>
            </div>
            <p className="text-text-muted hidden text-[9px] leading-relaxed sm:block sm:text-[10px]">
              Text or image prompts → hi-fi renders. Ready for edit passes on the same machine.
            </p>
            <div className="mt-2 flex h-14 items-end gap-0.5 rounded-lg bg-black/40 px-2 pb-1 pt-2 sm:mt-3">
              {[40, 65, 52, 78, 61, 88, 72, 95, 68, 82].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-t bg-gradient-to-t from-amber-500/40 to-amber-400/90"
                  initial={false}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.35, delay: i * 0.03 }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-2.5 sm:p-4">
            <div className="mb-1.5 sm:mb-2">
              <span className="text-[10px] font-bold text-white">Video editing</span>
            </div>
            <p className="text-text-muted hidden text-[9px] leading-relaxed sm:block sm:text-[10px]">
              Trim, merge, extract audio, soundtracks, resize, transcode — real ffmpeg, not copy.
            </p>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-2 py-2 sm:mt-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-cyan-400/80"
                  animate={{ width: `${(tick % 5) * 20 + 20}%` }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
              </div>
              <span className="font-mono text-[8px] text-white/45">00:0{tick % 9}:12</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-2.5 sm:p-4">
            <div className="mb-1.5 sm:mb-2">
              <span className="text-[10px] font-bold text-white">Images</span>
            </div>
            <p className="text-text-muted mb-3 hidden text-[9px] leading-relaxed sm:block sm:text-[10px]">
              Gemini &amp; Imagen outputs sized for ads, social, and decks.
            </p>
            <div className="flex h-14 gap-1.5 sm:h-20 sm:gap-2.5">
              {MEDIA_SHOWCASE_IMAGES.map((src) => (
                <div
                  key={src}
                  className="relative flex-1 overflow-hidden rounded-lg ring-1 ring-white/15"
                >
                  <Image src={src} alt="" fill sizes="220px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-2.5 sm:p-4">
            <div className="mb-1.5 sm:mb-2">
              <span className="text-[10px] font-bold text-white">Audio</span>
            </div>
            <p className="text-text-muted mb-1 hidden text-[9px] leading-relaxed sm:block sm:text-[10px]">
              TTS from ElevenLabs, OpenAI, Edge; transcription with Deepgram.
            </p>
            <MediaAudioWaveform />
          </div>
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}

/** Block 3 — Business ops & beyond: blank canvas. */
export function MarketingCapabilitiesOpsMockup() {
  return (
    <FeatureFloatingMockShell className="!min-h-[440px]">
      <div className="relative z-[1] flex h-full min-h-[440px] items-start justify-start p-6">
        <h3 className="text-[13px] font-semibold tracking-wide text-white/50 sm:text-sm">
          Your Blank Canvas
        </h3>
      </div>
    </FeatureFloatingMockShell>
  )
}
