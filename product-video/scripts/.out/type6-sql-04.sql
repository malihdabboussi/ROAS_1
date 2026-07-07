INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_30$references/type6-components/MarketingBrainGraphMockup.md$body_fp_30$, $body_c_30$# MarketingBrainGraphMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingBrainGraphMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingBrainGraphMockup.tsx`
- Import alias: `@/components/marketing/MarketingBrainGraphMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `-translate-x-1/2`
- `body-3`
- `button-glass-neutral`
- `icon-sm`
- `icon-xs`
- `isolate`
- `line-clamp-2`
- `origin-bottom-left`
- `sm:bottom-2`
- `sm:left-2`
- `sm:max-w-[44%]`
- `sm:right-2`
- `sm:scale-[0.65]`
- `sm:top-2`
- `sm:w-[10.5rem]`
- `studio-app-preview-root`

## Source

```tsx
'use client'

/**
 * Marketing Brain: 1:1 shell with apps/web — ForceGraph, LegendPanel, NavControls, top toolbar chrome (static).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, List, Search } from 'lucide-react'
import ForceGraph, { type ForceGraphHandle } from './brain-app/ForceGraph'
import LegendPanel from './brain-app/LegendPanel'
import { getMarketingBrainDemoGraph } from './brain-app/marketingBrainDemoGraph'
import NavControls from './brain-app/NavControls'
import type { BrainMemory } from './brain-app/types'
import { MarketingMemoryInsightMockup } from './MarketingMemoryInsightMockup'

const DEMO = getMarketingBrainDemoGraph()

export function MarketingBrainGraphMockup() {
  const graphRef = useRef<ForceGraphHandle>(null)
  const [selectedNode, setSelectedNode] = useState<BrainMemory | null>(null)
  const [searchQuery] = useState('')
  const [showLegend, setShowLegend] = useState(false)
  const [showInsight, setShowInsight] = useState(false)
  const insightTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (insightTimerRef.current != null) window.clearTimeout(insightTimerRef.current)
    }
  }, [])

  const filteredNodes = DEMO.nodes
  const filteredConnections = DEMO.connections

  const memoryCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const n of filteredNodes) {
      if ((n.node_type ?? 'memory') === 'memory') {
        const t = (n.memory_type as string) || 'fact'
        out[t] = (out[t] ?? 0) + 1
      }
      if (n.node_type === 'sk_entry') {
        const t = (n.entry_type as string) || 'concept'
        out[t] = (out[t] ?? 0) + 1
      }
    }
    return out
  }, [filteredNodes])

  const snapshotCounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const n of filteredNodes) {
      if (n.node_type === 'snapshot' && n.snapshot_type) {
        const t = n.snapshot_type as string
        out[t] = (out[t] ?? 0) + 1
      }
    }
    return out
  }, [filteredNodes])

  const counts = useMemo(() => {
    const exp = filteredNodes.filter(
      (n) => n.node_type === 'experience' || n.node_type === 'sk_source',
    ).length
    const skEntry = filteredNodes.filter((n) => n.node_type === 'sk_entry').length
    return { experiences: exp, skEntries: skEntry }
  }, [filteredNodes])

  return (
    <div className="mockup-frame flex h-full min-h-[360px] w-full flex-col overflow-hidden md:min-h-[420px]">
      <div className="studio-app-preview-root relative isolate min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 z-0 min-h-0">
          <ForceGraph
            ref={graphRef}
            className="h-full w-full"
            nodes={filteredNodes}
            connections={filteredConnections}
            selectedNodeId={selectedNode?.id ?? null}
            searchQuery={searchQuery}
            onNodeClick={setSelectedNode}
            animateEntrance
            entranceStartDelayMs={500}
            entranceBatchDelayMs={58}
            onEntranceComplete={() => setShowLegend(true)}
          />
        </div>

        <div className="pointer-events-none absolute left-4 right-4 top-4 z-50 hidden items-start justify-between gap-2 md:flex">
          <div className="md:gap-spacing-2 pointer-events-none flex items-center gap-1">
            <button
              type="button"
              disabled
              className="button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 pointer-events-auto flex cursor-default items-center rounded-lg font-medium opacity-95"
            >
              <span className="gap-spacing-2 text-foreground flex items-center">
                Your Brain
                <ChevronDown className="icon-xs text-muted-foreground" />
              </span>
            </button>
            <button
              type="button"
              disabled
              className="button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 pointer-events-auto flex cursor-default items-center rounded-lg font-medium opacity-95"
            >
              <span className="gap-spacing-2 text-foreground flex items-center">
                All
                <ChevronDown className="icon-xs text-muted-foreground" />
              </span>
            </button>
            <button
              type="button"
              disabled
              className="button-glass-neutral body-3 px-spacing-3 py-spacing-2 pointer-events-auto flex cursor-default items-center gap-2 rounded-lg font-medium opacity-95"
            >
              <Search className="icon-sm text-muted-foreground" />
              <span className="text-foreground">Search</span>
            </button>
            <button
              type="button"
              disabled
              className="button-glass-neutral body-3 px-spacing-3 py-spacing-2 pointer-events-auto flex cursor-default items-center gap-2 rounded-lg font-medium opacity-95"
            >
              <List className="icon-sm text-muted-foreground" />
              <span className="text-foreground">Memories</span>
            </button>
          </div>
        </div>

        {showInsight && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="pointer-events-none absolute right-1.5 top-1.5 z-50 w-[9rem] max-w-[40%] sm:right-2 sm:top-2 sm:w-[10.5rem] sm:max-w-[44%] md:right-4 md:top-4 md:w-80 md:max-w-[min(20rem,92%)]"
          >
            <MarketingMemoryInsightMockup />
          </motion.div>
        )}

        <NavControls
          onCenter={() => graphRef.current?.center()}
          onOrganize={() => graphRef.current?.organize()}
        />

        {selectedNode && (
          <div className="border-border bg-[var(--color-card)]/95 md:px-spacing-3 md:py-spacing-2 pointer-events-none absolute bottom-3 left-1/2 z-30 max-w-[min(88%,300px)] -translate-x-1/2 rounded-lg border px-2 py-1.5 shadow-lg backdrop-blur-sm md:bottom-4 md:max-w-[min(92%,360px)]">
            <p className="md:body-3 line-clamp-2 text-[10px] font-medium leading-snug text-[var(--color-foreground)] md:leading-normal">
              {selectedNode.content || selectedNode.name || 'Memory'}
            </p>
          </div>
        )}

        {showLegend && (
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 z-50 sm:bottom-2 sm:left-2 md:bottom-4 md:left-4">
            <div className="pointer-events-none origin-bottom-left scale-[0.48] sm:scale-[0.65] md:scale-100 max-md:[&_.body-3]:!text-[9px] max-md:[&_.body-3]:!leading-snug max-md:[&_.typo-caption]:!text-[8px] max-md:[&_.typo-caption]:!leading-snug">
              <div className="pointer-events-auto">
                <LegendPanel
                  embed
                  memoryCounts={memoryCounts}
                  snapshotCounts={snapshotCounts}
                  experienceCount={counts.experiences}
                  skEntryCount={counts.skEntries}
                  connections={filteredConnections}
                  isAgentBrain={false}
                  showSnapshots={false}
                  showSkKnowledge={false}
                  animate
                  fadeIn
                  numberRollDelay={0.55}
                  onFadeInComplete={() => {
                    if (insightTimerRef.current != null)
                      window.clearTimeout(insightTimerRef.current)
                    insightTimerRef.current = window.setTimeout(() => setShowInsight(true), 1500)
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

```
$body_c_30$, $body_ct_30$text/markdown$body_ct_30$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_31$references/type6-components/MarketingCapabilitiesShowcaseMockups.md$body_fp_31$, $body_c_31$# MarketingCapabilitiesGtmMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingCapabilitiesShowcaseMockups.tsx`
- Website source: `apps/website/src/components/marketing/MarketingCapabilitiesShowcaseMockups.tsx`
- Import alias: `@/components/marketing/MarketingCapabilitiesShowcaseMockups`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `!flex`
- `!flex-col`
- `!min-h-0`
- `!min-h-[440px]`
- `from-amber-500/40`
- `from-white/[0.08]`
- `object-cover`
- `shrink-0`
- `sm:!min-h-[440px]`
- `sm:block`
- `sm:gap-14`
- `sm:gap-2.5`
- `sm:gap-3`
- `sm:gap-5`
- `sm:h-20`
- `sm:mb-2`
- `sm:min-h-[420px]`
- `sm:mt-3`
- `sm:p-4`
- `sm:p-6`
- `sm:pr-14`
- `sm:text-[10px]`
- `sm:text-sm`
- `to-amber-400/90`
- `to-white/[0.02]`

## Source

```tsx
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

```
$body_c_31$, $body_ct_31$text/markdown$body_ct_31$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_32$references/type6-components/MarketingDailyDigestMockup.md$body_fp_32$, $body_c_32$# MarketingDailyDigestMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingDailyDigestMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingDailyDigestMockup.tsx`
- Import alias: `@/components/marketing/MarketingDailyDigestMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `!min-h-[460px]`
- `object-cover`
- `self-center`
- `self-start`
- `transition-all`
- `transition-colors`
- `truncate`

## Source

```tsx
'use client'

import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Mic,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  Target,
} from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'

const DIGEST_CONTENT = [
  { text: 'Good morning! Autopilot ran 12 operations while you slept.', type: 'system' },
  { text: '8 missions were completed successfully.', type: 'success' },
  { text: '2 missions are blocked and need your eyes.', type: 'warning' },
  { text: 'Operational pace is at 94% efficiency.', type: 'system' },
]

export function MarketingDailyDigestMockup(props?: { vibeyPortraitUrl?: string }) {
  const [visibleIdx, setVisibleIdx] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const vibeySrc = props?.vibeyPortraitUrl?.trim() || VIBEY_MARKETING_PORTRAIT_FALLBACK

  useEffect(() => {
    let isMounted = true
    const cycle = async () => {
      if (!isMounted) return
      setVisibleIdx(0)

      for (let i = 0; i < DIGEST_CONTENT.length; i++) {
        setIsTyping(true)
        await new Promise((r) => setTimeout(r, 1200))
        if (!isMounted) return
        setIsTyping(false)
        setVisibleIdx(i + 1)
        await new Promise((r) => setTimeout(r, 600))
      }

      await new Promise((r) => setTimeout(r, 5000))
      if (isMounted) cycle()
    }

    cycle()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <FeatureFloatingMockShell className="!min-h-[460px]">
      {/* Telegram App Interface Wrapper */}
      <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#0f0f0f]">
        {/* 1. Telegram Header (Contact Info) */}
        <div className="z-20 flex items-center gap-3 border-b border-white/5 bg-[#1c1c1c] px-4 py-3">
          <ChevronLeft size={20} className="cursor-pointer text-[#50a2e9]" />
          <div className="relative">
            <img
              src={vibeySrc}
              alt=""
              className="h-10 w-10 rounded-full border border-white/10 object-cover shadow-inner"
            />
            <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#1c1c1c] bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-bold leading-tight text-white">Vibey</h3>
            <p className="text-[11px] text-[#50a2e9]">bot</p>
          </div>
          <MoreVertical size={18} className="cursor-pointer text-white/40" />
        </div>

        {/* 2. Chat Area */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-repeat p-4 opacity-95">
          {/* Date Header */}
          <div className="self-center rounded-full border border-white/5 bg-black/30 px-3 py-1 shadow-sm backdrop-blur-md">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Today
            </span>
          </div>

          {/* Vibey Message Bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="relative max-w-[90%] self-start"
          >
            <div className="rounded-2xl rounded-tl-sm border border-white/5 bg-[#212121] p-4 shadow-xl">
              <div className="space-y-3.5">
                <AnimatePresence mode="popLayout">
                  {DIGEST_CONTENT.slice(0, visibleIdx).map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5"
                    >
                      <div className="mt-1">
                        {item.type === 'success' ? (
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        ) : item.type === 'warning' ? (
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                        )}
                      </div>
                      <p className="text-[13px] font-medium leading-snug text-white/90">
                        {item.text}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <div className="flex items-center gap-1 px-1 pt-1">
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                      className="h-1.5 w-1.5 rounded-full bg-[#50a2e9]"
                    />
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                      className="h-1.5 w-1.5 rounded-full bg-[#50a2e9]"
                    />
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                      className="h-1.5 w-1.5 rounded-full bg-[#50a2e9]"
                    />
                  </div>
                )}
              </div>

              {/* Message Meta (Time + Status) */}
              <div className="mt-3 flex items-center justify-end gap-1.5">
                <span className="text-[10px] font-medium text-white/20">08:00</span>
                <CheckCheck size={14} className="text-[#50a2e9]" />
              </div>
            </div>

            {/* Inline Keyboard (Real Telegram logic) */}
            <AnimatePresence>
              {visibleIdx === DIGEST_CONTENT.length && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 grid grid-cols-2 gap-1.5"
                >
                  <button className="rounded-lg border border-white/5 bg-[#212121]/80 px-3 py-2.5 text-[11px] font-bold text-[#50a2e9] shadow-lg backdrop-blur-md transition-colors hover:bg-[#2a2a2a]">
                    Review 2 Blocks
                  </button>
                  <button className="rounded-lg border border-white/5 bg-[#212121]/80 px-3 py-2.5 text-center text-[11px] font-bold text-[#50a2e9] shadow-lg backdrop-blur-md transition-colors hover:bg-[#2a2a2a]">
                    Scale Campaign
                  </button>
                  <button className="col-span-2 rounded-lg border border-white/5 bg-[#212121]/80 px-3 py-2.5 text-[11px] font-bold text-[#50a2e9] shadow-lg backdrop-blur-md transition-colors hover:bg-[#2a2a2a]">
                    Open Mission Control
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* 3. Telegram Bottom Bar (Message Input) */}
        <div className="z-20 flex items-center gap-3 bg-[#1c1c1c] p-3">
          <Smile size={22} className="cursor-pointer text-white/30" />
          <div className="flex flex-1 items-center justify-between rounded-full border border-white/5 bg-[#0f0f0f] px-4 py-2">
            <span className="text-[13px] text-white/30">Message</span>
            <Paperclip size={18} className="rotate-45 cursor-pointer text-white/30" />
          </div>
          <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#50a2e9] shadow-lg transition-all hover:brightness-110">
            <Mic size={20} className="text-white" />
          </div>
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}

```
$body_c_32$, $body_ct_32$text/markdown$body_ct_32$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_33$references/type6-components/MarketingDelegateStepsMockups.md$body_fp_33$, $body_c_33$# MarketingMissionDelegateStepBriefMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingDelegateStepsMockups.tsx`
- Website source: `apps/website/src/components/marketing/MarketingDelegateStepsMockups.tsx`
- Import alias: `@/components/marketing/MarketingDelegateStepsMockups`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `-translate-x-1/2`
- `body-3`
- `body-4`
- `button-glass-neutral`
- `card-glass`
- `chip-glass-green`
- `compare-hero-brain-grid`
- `indicator-dot-glass`
- `indicator-dot-glass-green`
- `object-cover`
- `shrink-0`
- `transition-colors`
- `typo-caption`

## Source

```tsx
'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { DeliverableVisualPreview } from '@/components/marketing/MarketingMissionDetailModalMockup'
import {
  MISSION_MARKETING_DEMO_BRIEF,
  MissionQuickCaptureChrome,
} from '@/components/marketing/MarketingMissionExecutionMockup'
import { VIBEY_MARKETING_PORTRAIT_FALLBACK } from '@/lib/agent-library-fallback'
import { cn } from '@/lib/utils'

/** Same strings as `apps/web/src/features/mission-control/config/messages.config.ts` (page header). */
const MISSION_CONTROL_PAGE_TITLE = 'MISSION CONTROL'
const MISSION_CONTROL_PAGE_SUBTITLE =
  'Run missions, watch delegation, and keep momentum moving.'

function sleep(ms: number) {
  return new Promise<void>((r) => {
    setTimeout(r, ms)
  })
}

/** Shared column: brain grid + auto-height shell, minimal vertical padding. */
function DelegateStepColumnShell(props: {
  children: ReactNode
  /** e.g. `overflow-visible` when a child uses a slight rotate so corners are not clipped. */
  shellClassName?: string
}) {
  return (
    <div
      className={cn(
        'compare-hero-card-shell compare-hero-card-shell--auto-height border-color-glass bg-color-panel-mid relative !min-h-0 flex h-full min-h-0 w-full flex-1 flex-col rounded-xl border backdrop-blur-xl',
        props.shellClassName ?? 'overflow-hidden',
      )}
    >
      <div className="compare-hero-brain-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col gap-2 px-3 py-2">{props.children}</div>
    </div>
  )
}

/** Mission Control quick capture + looping typewriter — same brief as Block 1 execution mockup. */
export function MarketingMissionDelegateStepBriefMockup() {
  const [briefText, setBriefText] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const text = MISSION_MARKETING_DEMO_BRIEF
      while (!cancelled) {
        setBriefText('')
        await sleep(450)
        for (let i = 0; i <= text.length; i++) {
          if (cancelled) return
          setBriefText(text.slice(0, i))
          await sleep(30)
        }
        await sleep(2400)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <DelegateStepColumnShell>
      <div className="shrink-0">
        <h4 className="typo-caption font-bold uppercase tracking-wider text-white">{MISSION_CONTROL_PAGE_TITLE}</h4>
        <p className="body-4 text-text-muted mt-0.5 leading-snug">{MISSION_CONTROL_PAGE_SUBTITLE}</p>
      </div>
      <div className="mt-auto min-h-0 w-full">
        <MissionQuickCaptureChrome briefText={briefText} phase="brief" compact />
      </div>
    </DelegateStepColumnShell>
  )
}

/** Timeline on shell background + nested plan-approval `card-glass` only (no outer card). */
export function MarketingMissionDelegateStepPlanMockup() {
  const vibeySrc = VIBEY_MARKETING_PORTRAIT_FALLBACK

  return (
    <DelegateStepColumnShell>
      <div className="flex min-h-0 w-full flex-1 flex-col justify-center">
        <div className="flex max-h-full min-h-0 w-full shrink-0 flex-col gap-3 overflow-y-auto">
        <div className="relative shrink-0 grid gap-2.5">
          <span
            className="absolute bottom-0 left-[5px] top-1 w-px -translate-x-1/2 bg-white/10"
            aria-hidden
          />
          <div className="relative flex pl-4">
            <div className="indicator-dot-glass absolute left-[5px] top-1 z-10 h-2 w-2 shrink-0 -translate-x-1/2 bg-white/20 opacity-40" />
            <span className="body-4 font-medium text-white/50">Mission initialized</span>
          </div>
          <div className="relative flex pl-4 opacity-55">
            <div className="indicator-dot-glass absolute left-[5px] top-1 z-10 h-2 w-2 shrink-0 -translate-x-1/2 bg-white/20" />
            <span className="body-4 font-medium text-white/65">Brief captured</span>
          </div>
          <div className="relative flex items-start justify-between gap-2 pl-4">
            <div className="indicator-dot-glass indicator-dot-glass-green absolute left-[5px] top-1 z-10 h-2.5 w-2.5 shrink-0 -translate-x-1/2" />
            <div className="min-w-0 flex-1">
              <span className="body-4 font-medium text-white">Vibey planned this mission</span>
              <span className="body-4 text-text-muted mt-0.5 block opacity-60">Just now</span>
            </div>
            <div className="border-color-glass h-7 w-7 shrink-0 overflow-hidden rounded-full border">
              <img src={vibeySrc} alt="" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>

        <div className="card-glass shrink-0 rounded-lg px-3 py-2">
          <p className="body-3 font-medium text-white">Plan ready for your approval</p>
          <p className="body-4 mt-0.5 text-amber-400">Includes 2 recommended hires</p>
          <div className="mt-spacing-2 gap-spacing-2 flex flex-wrap">
            <button
              type="button"
              tabIndex={-1}
              className="button-glass-neutral typo-caption cursor-default rounded-md px-2 py-1"
              aria-hidden
            >
              View Plan
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="chip-glass-green typo-caption cursor-default rounded-md px-2 py-1 font-medium"
              aria-hidden
            >
              Approve
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="typo-caption text-text-muted cursor-default rounded-md px-2 py-1 transition-colors"
              aria-hidden
            >
              Reject
            </button>
          </div>
        </div>
      </div>
      </div>
    </DelegateStepColumnShell>
  )
}

/** Section label + full-bleed social preview (hero asset), tilted — no title/chip strip inside the card. */
export function MarketingMissionDelegateStepDeliverableMockup() {
  return (
    <DelegateStepColumnShell shellClassName="overflow-visible">
      <div className="shrink-0">
        <span className="body-4 font-medium text-white">Deliverables</span>
      </div>
      <div className="mt-auto flex min-h-0 w-full flex-1 items-end justify-center overflow-visible pb-1">
        <div className="card-glass mission-delegate-social-tilt h-spacing-60 w-spacing-60 shrink-0 overflow-hidden rounded-spacing-3">
          <div className="bg-muted-20 relative h-full min-h-0 w-full overflow-hidden">
            <DeliverableVisualPreview type="social_post" />
          </div>
        </div>
      </div>
    </DelegateStepColumnShell>
  )
}

```
$body_c_33$, $body_ct_33$text/markdown$body_ct_33$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_34$references/type6-components/MarketingDynamicRouterMockup.md$body_fp_34$, $body_c_34$# MarketingDynamicRouterMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingDynamicRouterMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingDynamicRouterMockup.tsx`
- Import alias: `@/components/marketing/MarketingDynamicRouterMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `-bottom-1`
- `-mt-2`
- `-right-1`
- `-top-1`
- `animate-pulse`
- `animate-spin`
- `compare-hero-brain-grid`
- `compare-hero-card-shell`
- `glass-card`
- `group`
- `object-cover`
- `shrink-0`
- `truncate`

## Source

```tsx
'use client'

import React, { useId, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Target,
  Zap,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  RotateCcw
} from 'lucide-react'
import { 
  MARKETING_AGENT_LIBRARY_FALLBACK, 
  VIBEY_MARKETING_PORTRAIT_FALLBACK 
} from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

const DELEGATION_ROLES = ['copywriter', 'designer', 'analyst', 'pm_marketing'] as const

type AgentStatus = 'idle' | 'blocked' | 'retrying' | 'waiting_feedback' | 'done' | 'acting' | 'busy'

function resolveAgents(libraryAgents?: PublicAgentLibraryRow[]): PublicAgentLibraryRow[] {
  return DELEGATION_ROLES.map((key) => {
    const fromHero = libraryAgents?.find((a) => a.role_key === key)
    if (fromHero) return fromHero
    const row = MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === key)
    if (!row) throw new Error(`Dynamic router mockup: missing agent ${key}`)
    return row
  })
}

/** Animated "Currents" SVG - Supports multiple active flows */
function RouterConnectorLines({ activePaths }: { activePaths: number[] }) {
  const uid = useId()
  const g = (suffix: string) => `${uid.replace(/:/g, '')}-${suffix}`

  return (
    <svg
      className="text-color-dimmer pointer-events-none w-full shrink-0"
      viewBox="0 0 100 22"
      height="60"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id={g('purple-grad')} fx="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        
        {/* Mask paths for the electric current effect */}
        {[0, 1, 2, 3].map(i => (
          <mask key={i} id={g('mask-' + i)}>
            <path 
              d={i === 0 ? "M 50 0 v 5 q 0 2 -2 2 H 14.5 q -2 0 -2 2 v 13" :
                 i === 1 ? "M 50 0 v 5 q 0 2 -2 2 H 39.5 q -2 0 -2 2 v 13" :
                 i === 2 ? "M 50 0 v 5 q 0 2 2 2 H 60.5 q 2 0 2 2 v 13" :
                           "M 50 0 v 5 q 0 2 2 2 H 85.5 q 2 0 2 2 v 13"}
              strokeWidth="1" stroke="white" fill="none" 
            />
          </mask>
        ))}
      </defs>

      {/* Static connector lines */}
      <g stroke="currentColor" fill="none" strokeWidth="0.4" strokeDasharray="100 100" pathLength="100">
        <path id={g('p-0')} d="M 50 0 v 5 q 0 2 -2 2 H 14.5 q -2 0 -2 2 v 13" />
        <path id={g('p-1')} d="M 50 0 v 5 q 0 2 -2 2 H 39.5 q -2 0 -2 2 v 13" />
        <path id={g('p-2')} d="M 50 0 v 5 q 0 2 2 2 H 60.5 q 2 0 2 2 v 13" />
        <path id={g('p-3')} d="M 50 0 v 5 q 0 2 2 2 H 85.5 q 2 0 2 2 v 13" />
      </g>

      {/* Multiple Animated "Purple Currents" */}
      <AnimatePresence>
        {activePaths.map(idx => (
          <motion.g 
            key={idx}
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            mask={`url(#${g('mask-' + idx)})`}
          >
            <circle r="6" fill={`url(#${g('purple-grad')})`}>
              <animateMotion dur="2s" repeatCount="indefinite">
                <mpath href={`#${g('p-' + idx)}`} />
              </animateMotion>
            </circle>
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  )
}

export function MarketingDynamicRouterMockup(props?: {
  libraryAgents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
}) {
  const agents = resolveAgents(props?.libraryAgents)
  const vibeySrc = props?.vibeyPortraitUrl?.trim() || VIBEY_MARKETING_PORTRAIT_FALLBACK
  
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>(['blocked', 'waiting_feedback', 'idle', 'idle'])
  const [activePaths, setActivePaths] = useState<number[]>([])
  const [logs, setLogs] = useState<string[]>(['>> MONITORING_OPERATIONS...'])

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 5))
  }

  useEffect(() => {
    let isMounted = true
    const cycle = async () => {
      if (!isMounted) return
      
      // Step 0: Initial static state
      setAgentStatuses(['blocked', 'waiting_feedback', 'idle', 'idle'])
      setActivePaths([])
      await new Promise(r => setTimeout(r, 2000))

      if (!isMounted) return
      // Step 1: Self-healing Ivy (Blocked -> Retrying)
      addLog('>> RECOVERY_MODE: Resolving block for Ivy (Copywriter)')
      setActivePaths([0])
      await new Promise(r => setTimeout(r, 1000))
      setAgentStatuses(prev => { const n = [...prev]; n[0] = 'retrying'; return n })
      await new Promise(r => setTimeout(r, 2000))

      if (!isMounted) return
      // Step 2: Finalizing Lux (Waiting Feedback -> Done)
      addLog('>> FEEDBACK_SYNC: Received approval for Lux (Designer)')
      setActivePaths([1])
      await new Promise(r => setTimeout(r, 1000))
      setAgentStatuses(prev => { const n = [...prev]; n[1] = 'done'; return n })
      await new Promise(r => setTimeout(r, 2500))

      if (!isMounted) return
      // Step 3: New Delegation to Niko (Idle -> Acting)
      addLog('>> AUTONOMOUS_DELEGATION: Assigning Lead Data to Niko')
      setActivePaths([2])
      await new Promise(r => setTimeout(r, 1000))
      setAgentStatuses(prev => { const n = [...prev]; n[2] = 'acting'; return n })
      await new Promise(r => setTimeout(r, 3000))

      if (isMounted) cycle()
    }

    cycle()
    return () => { isMounted = false }
  }, [])

  return (
    <div className="compare-hero-card-shell border-color-glass bg-color-panel-mid relative aspect-auto min-h-[460px] w-full overflow-hidden rounded-2xl border backdrop-blur-xl">
      <div className="compare-hero-brain-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex h-full min-h-[460px] w-full flex-col overflow-hidden p-6">
      {/* ── CEO Hub ── */}
      <div className="relative z-20 flex justify-center pt-2">
        <div className="glass-card flex min-w-[180px] flex-col items-center gap-2 p-4 shadow-2xl">
          <div className="relative">
            <div className="border-emerald-500/30 h-14 w-14 overflow-hidden rounded-full border-2 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
              <img src={vibeySrc} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-4 border-[#0a0a0a]" />
          </div>
          <div className="text-center">
            <p className="text-[12px] font-bold text-white uppercase tracking-wider">Vibey</p>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Autonomous CEO</p>
          </div>
        </div>
      </div>

      {/* ── Router Lines ── */}
      <div className="relative -mt-2 z-10 px-4">
        <RouterConnectorLines activePaths={activePaths} />
      </div>

      {/* ── Agent Fleet ── */}
      <div className="grid grid-cols-4 gap-3 relative z-20">
        {agents.map((agent, i) => {
          const status = agentStatuses[i]
          const isTarget = activePaths.includes(i)
          
          return (
            <div key={agent.role_key} className="relative group">
              <motion.div 
                animate={isTarget ? { y: [0, -4, 0] } : {}}
                transition={{ repeat: isTarget ? Infinity : 0, duration: 2 }}
                className={`glass-card flex flex-col items-center gap-2 p-3 transition-all duration-500 ${
                  status === 'blocked' ? 'border-red-500/40 bg-red-500/5' :
                  status === 'retrying' ? 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.1)]' :
                  status === 'done' ? 'border-emerald-500/40 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.1)]' :
                  status === 'acting' ? 'border-purple-500/40 bg-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.1)]' :
                  'bg-white/[0.02] border-white/5 opacity-60'
                }`}
              >
                <div className="relative">
                  <img
                    src={agent.image_url}
                    alt=""
                    className={`h-10 w-10 rounded-full object-cover border-2 ${
                      status === 'blocked' ? 'border-red-500' :
                      status === 'retrying' ? 'border-amber-500' :
                      status === 'done' ? 'border-emerald-500' :
                      status === 'acting' ? 'border-purple-500' :
                      'border-white/10'
                    }`}
                  />
                  {status === 'blocked' && (
                    <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border-2 border-[#0a0a0a]">
                      <AlertCircle size={10} className="text-white" />
                    </div>
                  )}
                  {status === 'retrying' && (
                    <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-[#0a0a0a]">
                      <RotateCcw size={10} className="text-white animate-spin" />
                    </div>
                  )}
                  {status === 'waiting_feedback' && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-[#0a0a0a]">
                      <Clock size={10} className="text-white" />
                    </div>
                  )}
                  {status === 'done' && (
                    <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-[#0a0a0a]">
                      <CheckCircle2 size={10} className="text-white" />
                    </div>
                  )}
                </div>
                
                <div className="text-center min-w-0 w-full">
                  <p className="text-[10px] font-bold text-white truncate">{agent.default_name}</p>
                  <p className="text-[8px] font-bold text-white/30 uppercase truncate">{agent.role.split(' ')[agent.role.split(' ').length - 1]}</p>
                </div>

                {/* Status Indicator */}
                <div className="mt-1 flex items-center gap-1.5">
                  <div className={`h-1 w-1 rounded-full ${
                    status === 'blocked' ? 'bg-red-500 animate-pulse' :
                    status === 'retrying' ? 'bg-amber-500 animate-pulse' :
                    status === 'done' ? 'bg-emerald-500' :
                    status === 'acting' ? 'bg-purple-500 animate-pulse' :
                    status === 'waiting_feedback' ? 'bg-blue-500' :
                    'bg-white/10'
                  }`} />
                  <span className={`text-[8px] font-bold uppercase tracking-widest whitespace-nowrap ${
                    status === 'blocked' ? 'text-red-400' :
                    status === 'retrying' ? 'text-amber-400' :
                    status === 'done' ? 'text-emerald-400' :
                    status === 'acting' ? 'text-purple-400' :
                    status === 'waiting_feedback' ? 'text-blue-400' :
                    'text-white/20'
                  }`}>
                    {status.replace('_', ' ')}
                  </span>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* ── Logic Terminal (Bottom) ── */}
      <div className="mt-auto pt-6">
        <div className="bg-black/40 rounded-lg p-4 font-mono text-[10px] space-y-1.5 border border-white/5 shadow-inner relative overflow-hidden">
          <div className="flex items-center justify-between text-white/20 mb-1">
            <span>AUTOPILOT_ROUTING_ENGINE</span>
            <div className="flex gap-1">
              <div className="h-1 w-1 rounded-full bg-white/20" />
              <div className="h-1 w-1 rounded-full bg-white/20" />
            </div>
          </div>
          
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className={i === 0 ? 'text-emerald-400/80 font-bold' : 'text-white/40'}>
                {log}
              </div>
            ))}
            <div className="text-white/20 animate-pulse">&gt;&gt; MONITORING_OPERATIONS...</div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

```
$body_c_34$, $body_ct_34$text/markdown$body_ct_34$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_35$references/type6-components/MarketingHrLibraryMockup.md$body_fp_35$, $body_c_35$# MarketingHrLibraryMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingHrLibraryMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingHrLibraryMockup.tsx`
- Import alias: `@/components/marketing/MarketingHrLibraryMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `-left-2`
- `active:scale-95`
- `badge-glass`
- `badge-glass-green`
- `body-2`
- `body-3`
- `button-glass-primary`
- `glass-card`
- `group`
- `group-hover:-translate-y-0.5`
- `group-hover:translate-x-0.5`
- `indicator-dot-glass`
- `indicator-dot-glass-green`
- `italic`
- `line-clamp-2`
- `object-cover`
- `scrollbar-thin`
- `shrink-0`
- `sm:right-6`
- `transition-all`
- `transition-colors`
- `transition-transform`
- `truncate`

## Source

```tsx
'use client'

import { ExternalLink, Plus, AlertCircle, TrendingUp, UserPlus } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import { MarketingRoleEmblem } from '@/components/marketing/MarketingRoleEmblem'
import type { MarketingHrShowcasePayload } from '@/lib/marketing-hr-showcase-data'

export function MarketingHrLibraryMockup({ data }: { data: MarketingHrShowcasePayload }) {
  const { hr, insights, nextHire } = data

  return (
    <FeatureFloatingMockShell>
      <div className="relative min-h-[420px]">
        {/* HR Insights Card */}
        <div
          className="glass-card absolute right-5 top-6 z-10 flex w-[min(100%,340px)] max-w-[340px] max-h-[360px] flex-col gap-4 overflow-hidden p-5 sm:right-6"
          style={{ transform: 'rotate(1.5deg)' }}
        >
          <div className="flex shrink-0 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="border-color-glass h-12 w-12 shrink-0 overflow-hidden rounded-full border-2">
                <img src={hr.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="body-2 font-bold text-white">HR Insights</h3>
                <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                  Team Intelligence
                </p>
              </div>
            </div>
            <div className="indicator-dot-glass indicator-dot-glass-green h-2 w-2 rounded-full" />
          </div>

          <div className="bg-color-subtle flex min-h-0 flex-1 flex-col gap-4 overflow-hidden rounded-xl border border-white/5 p-4">
            <div className="space-y-3 overflow-y-auto pr-1 scrollbar-thin">
              {/* Team Gaps */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-amber-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">
                    High Priority Gaps
                  </p>
                </div>
                {insights.team_gaps.map((gap, i) => (
                  <div
                    key={i}
                    className="group border-color-glass bg-white/[0.02] flex flex-col gap-1 rounded-lg border px-3 py-2 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold leading-tight text-white">
                        {gap.gap}
                      </p>
                      <span
                        className={`text-[9px] shrink-0 font-bold uppercase tracking-tighter ${
                          gap.severity === 'critical'
                            ? 'text-red-400'
                            : gap.severity === 'high'
                              ? 'text-amber-400'
                              : 'text-amber-200'
                        }`}
                      >
                        {gap.severity}
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-text-muted line-clamp-2">
                      {gap.evidence}
                    </p>
                  </div>
                ))}
              </div>

              {/* Team Structure */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 pt-1">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">
                    Structure Analysis
                  </p>
                </div>
                <div className="border-color-glass bg-white/[0.02] flex flex-col gap-2 rounded-lg border px-3 py-2">
                  <p className="text-[10px] leading-relaxed text-text-muted">
                    {insights.team_structure.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {insights.team_structure.strengths.slice(0, 2).map((s, j) => (
                      <div key={j} className="badge-glass badge-glass-green text-[9px] font-medium">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="button-glass-primary body-3 group flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-bold transition-all"
          >
            Refresh Intel
            <ExternalLink className="h-3 w-3 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Next Hire Recommendation Card */}
        <div
          className="glass-card absolute bottom-6 left-4 z-30 flex w-[min(100%,310px)] max-w-[310px] flex-col gap-4 p-5 shadow-2xl"
          style={{ transform: 'rotate(-2deg)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-400/10 flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/20">
              <UserPlus size={16} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Recommended Hire
              </h3>
              <p className="text-[9px] text-text-muted font-medium">Based on campaign needs</p>
            </div>
          </div>

          <div className="bg-amber-400/[0.03] flex flex-col gap-3 rounded-xl border border-amber-400/10 p-4">
            <div className="flex items-center gap-3">
              <MarketingRoleEmblem roleKey={nextHire.roleKey} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="body-3 truncate font-bold text-white leading-tight">
                  {nextHire.displayName}
                </p>
                <p className="text-[10px] text-amber-400/80 font-medium truncate">
                  {nextHire.role}
                </p>
              </div>
              <button
                type="button"
                className="bg-amber-400 text-black flex h-7 w-7 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
                aria-label={`Add ${nextHire.displayName}`}
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
            <div className="relative">
              <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-amber-400/20 rounded-full" />
              <p className="text-[10px] leading-relaxed text-text-muted pl-2 italic">
                &ldquo;{nextHire.reason}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 opacity-50">
            <div className="h-1 w-1 rounded-full bg-white" />
            <div className="h-1 w-1 rounded-full bg-white/30" />
            <div className="h-1 w-1 rounded-full bg-white/30" />
          </div>
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}


```
$body_c_35$, $body_ct_35$text/markdown$body_ct_35$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_36$references/type6-components/MarketingMemoryInsightMockup.md$body_fp_36$, $body_c_36$# MarketingMemoryInsightMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingMemoryInsightMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingMemoryInsightMockup.tsx`
- Import alias: `@/components/marketing/MarketingMemoryInsightMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `capitalize`
- `card-glass`
- `shrink-0`
- `transition-all`
- `transition-colors`

## Source

```tsx
'use client'

import React from 'react'
import { Brain, Heart, X } from 'lucide-react'

export function MarketingMemoryInsightMockup() {
  const typeColor = 'var(--brain-insight-rgb)'
  const emotionColor = '#3B82F6' // Confidence

  return (
    <div
      className="card-glass pointer-events-auto w-full min-w-0 max-w-[20rem] overflow-hidden rounded-lg backdrop-blur-xl md:rounded-xl"
      style={{
        background: 'rgba(15, 15, 20, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Header */}
      <div className="md:px-spacing-4 md:py-spacing-3 flex items-center justify-between border-b border-white/5 px-2 py-1.5">
        <div className="flex items-center gap-1 md:gap-2">
          <Brain
            className="size-3 shrink-0 md:size-[14px]"
            style={{ color: `rgb(${typeColor})` }}
          />
          <span
            className="inline-flex items-center rounded px-1 py-px text-[7px] font-semibold tracking-wide md:px-2 md:py-0.5 md:text-[10px] md:tracking-wider"
            style={{
              backgroundColor: `rgba(${typeColor}, 0.15)`,
              color: `rgb(${typeColor})`,
              border: `1px solid rgba(${typeColor}, 0.3)`,
            }}
          >
            INSIGHT
          </span>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3 md:size-[14px]" />
        </button>
      </div>

      {/* Body */}
      <div className="md:p-spacing-4 space-y-2 p-2 md:space-y-4">
        <p className="text-[9px] font-medium leading-tight text-white md:text-[13px] md:leading-relaxed">
          Brand voice should shift toward "Outcome-Driven" for Q2 campaigns. Audience data shows 42%
          higher engagement when leading with specific ROI metrics over features.
        </p>

        {/* Significance & Confidence bars */}
        <div className="space-y-2 md:space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between md:mb-1.5">
              <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
                Significance
              </span>
              <span
                className="text-[8px] font-bold md:text-[10px]"
                style={{ color: `rgb(${typeColor})` }}
              >
                92%
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `92%`, backgroundColor: `rgb(${typeColor})` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between md:mb-1.5">
              <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
                Confidence
              </span>
              <span className="text-[8px] font-bold text-blue-400 md:text-[10px]">88%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `88%`, backgroundColor: '#60a5fa' }}
              />
            </div>
          </div>
        </div>

        {/* Emotional metadata (Dispenza Layer 2) */}
        <div className="space-y-2 border-t border-white/5 pt-1.5 md:space-y-3 md:pt-2">
          <div className="flex items-center gap-1 md:gap-2">
            <Heart className="size-2.5 shrink-0 md:size-3" style={{ color: emotionColor }} />
            <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
              Emotion
            </span>
            <span
              className="inline-flex items-center rounded px-1 py-px text-[7px] font-medium capitalize md:px-2 md:py-0.5 md:text-[10px]"
              style={{ backgroundColor: `${emotionColor}22`, color: emotionColor }}
            >
              confidence
            </span>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
              Valence
            </span>
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="absolute top-0 h-full rounded-full transition-all"
                style={{ left: '85%', width: '4px', backgroundColor: '#22c55e' }}
              />
              <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
            </div>
            <span className="text-muted-foreground w-6 text-right text-[8px] font-bold md:w-8 md:text-[10px]">
              +0.7
            </span>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between border-t border-white/5 pt-1.5 md:pt-2">
          <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
            Source
          </span>
          <span className="text-[9px] font-medium text-white md:text-[11px]">Call Summary</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[8px] font-semibold uppercase tracking-wider md:text-[10px] md:tracking-widest">
            Created
          </span>
          <span className="text-[9px] font-medium text-white md:text-[11px]">Mar 15, 2026</span>
        </div>
      </div>
    </div>
  )
}

```
$body_c_36$, $body_ct_36$text/markdown$body_ct_36$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
