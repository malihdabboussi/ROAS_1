INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_23$references/type6-components/IntegrationsHeroMockup.md$body_fp_23$, $body_c_23$# IntegrationsHeroMockup

> Hero / above-the-fold block; use as a cover slide or section opener.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/IntegrationsHeroMockup.tsx`
- Website source: `apps/website/src/components/feature-pages/IntegrationsHeroMockup.tsx`
- Import alias: `@/components/feature-pages/IntegrationsHeroMockup`

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

- `-bottom-10`
- `-inset-6`
- `-translate-x-1/2`
- `-translate-y-1/2`
- `blur-2xl`
- `duration-500`
- `duration-700`
- `filter`
- `from-black/80`
- `from-transparent`
- `from-white/[0.05]`
- `group`
- `group-hover:border-white/60`
- `group-hover:opacity-100`
- `group-hover:opacity-30`
- `group-hover:scale-125`
- `group-hover:translate-y-0`
- `invert`
- `lg:h-14`
- `lg:w-14`
- `object-contain`
- `sm:h-12`
- `sm:p-3`
- `sm:w-12`
- `to-black/20`
- `to-transparent`
- `to-white/[0.02]`
- `transition-all`
- `via-transparent`
- `via-white/10`
- `via-white/20`

## Source

```tsx
'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Real integration data from the library with official paths
const INTEGRATIONS = [
  // --- QUADRANT 0: Marketing & Social (Top Left) ---
  { id: 'linkedin', name: 'LinkedIn', logo: '/Integrations/LinkedIn.png', quadrant: 0 },
  { id: 'instagram', name: 'Instagram', logo: '/Integrations/Instagram.png', quadrant: 0 },
  { id: 'facebook', name: 'Facebook', logo: '/Integrations/Facebook.png', quadrant: 0 },
  { id: 'youtube', name: 'YouTube', logo: '/Integrations/YouTube.png', quadrant: 0 },
  { id: 'twitter', name: 'Twitter', logo: '/Integrations/Twitter.png', quadrant: 0 },
  { id: 'tiktok', name: 'TikTok', logo: '/Integrations/TikTok.png', quadrant: 0 },
  { id: 'reddit', name: 'Reddit', logo: '/Integrations/Reddit.png', quadrant: 0 },
  { id: 'meta', name: 'Meta Ads', logo: '/Integrations/Meta.png', quadrant: 0 },
  { id: 'google_ads', name: 'Google Ads', logo: '/Integrations/GoogleAds.png', quadrant: 0 },
  { id: 'google_analytics', name: 'Analytics', logo: '/Integrations/GoogleAnalytics.png', quadrant: 0 },
  { id: 'google_search_console', name: 'Search Console', logo: '/Integrations/GoogleSearchConsole.png', quadrant: 0 },

  // --- QUADRANT 1: Sales & CRM (Top Right) ---
  { id: 'hubspot', name: 'HubSpot', logo: '/Integrations/HubSpot.png', quadrant: 1 },
  { id: 'salesforce', name: 'Salesforce', logo: '/Integrations/Salesforce.png', quadrant: 1 },
  { id: 'stripe', name: 'Stripe', logo: '/Integrations/Stripe.png', quadrant: 1, logoScale: 1.3 },
  { id: 'paypal', name: 'PayPal', logo: '/Integrations/PayPal.png', quadrant: 1 },
  { id: 'whop', name: 'Whop', logo: '/Integrations/Whop.png', quadrant: 1 },
  { id: 'fanbasis', name: 'FanBasis', logo: '/Integrations/FanBasis.png', quadrant: 1 },
  { id: 'gohighlevel', name: 'GoHighLevel', logo: '/Integrations/GHL.png', quadrant: 1 },
  { id: 'airtable', name: 'Airtable', logo: '/Integrations/Airtable.png', quadrant: 1 },

  // --- QUADRANT 2: Communication & Support (Bottom Left) ---
  { id: 'gmail', name: 'Gmail', logo: '/Integrations/Gmail.png', quadrant: 2 },
  { id: 'slack', name: 'Slack', logo: '/Integrations/Slack.png', quadrant: 2 },
  { id: 'mailchimp', name: 'Mailchimp', logo: '/Integrations/Mailchimp.png', quadrant: 2 },
  { id: 'kit', name: 'Kit', logo: '/Integrations/Kit.png', quadrant: 2 },
  { id: 'active_campaign', name: 'ActiveCampaign', logo: '/Integrations/ActiveCampaign.png', quadrant: 2 },
  { id: 'zoom', name: 'Zoom', logo: '/Integrations/Zoom.png', quadrant: 2 },
  { id: 'fathom', name: 'Fathom', logo: '/Integrations/Fathom.png', quadrant: 2 },
  { id: 'fireflies', name: 'Fireflies', logo: '/Integrations/Fireflies.png', quadrant: 2 },

  // --- QUADRANT 3: Productivity & Ops (Bottom Right) ---
  { id: 'google_drive', name: 'Drive', logo: '/Integrations/GoogleDrive.png', quadrant: 3 },
  { id: 'dropbox', name: 'Dropbox', logo: '/Integrations/Dropbox.png', quadrant: 3 },
  { id: 'google_sheets', name: 'Sheets', logo: '/Integrations/GoogleSheets.png', quadrant: 3 },
  { id: 'google_docs', name: 'Docs', logo: '/Integrations/GoogleDocs.png', quadrant: 3 },
  { id: 'google_calendar', name: 'Calendar', logo: '/Integrations/GoogleCalendar.png', quadrant: 3 },
  { id: 'calendly', name: 'Calendly', logo: '/Integrations/Calendly.png', quadrant: 3 },
  { id: 'clickup', name: 'ClickUp', logo: '/Integrations/ClickUp.png', quadrant: 3 },
  { id: 'notion', name: 'Notion', logo: '/Integrations/Notion.png', quadrant: 3 },
  { id: 'canva', name: 'Canva', logo: '/Integrations/Canva.png', quadrant: 3 },
  { id: 'github', name: 'GitHub', logo: '/Integrations/GitHub.png', quadrant: 3 },
  { id: 'vercel', name: 'Vercel', logo: '/Integrations/Vercel.png', quadrant: 3 },
]

const QUADRANTS = [
  { title: 'Marketing', id: 0 },
  { title: 'Sales & CRM', id: 1 },
  { title: 'Communication', id: 2 },
  { title: 'Operations', id: 3 },
]

export function IntegrationsHeroMockup() {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())

  // Generate structured but jittered positions to ensure logical placement and no clipping
  const positions = useMemo(() => {
    const results: Array<{ id: string; x: number; y: number; scale: number; rotate: number }> = []
    
    QUADRANTS.forEach(quad => {
      const quadIntegrations = INTEGRATIONS.filter(i => i.quadrant === quad.id)
      
      // Board is 100x100. Each quadrant is 50x50.
      // Define a "safe zone" within each quadrant to avoid clipping and the center cross.
      const margin = 10 // 10% from any edge or axis
      const safeWidth = 50 - (margin * 2)
      const safeHeight = 50 - (margin * 2)
      
      const baseLeft = quad.id % 2 === 0 ? margin : 50 + margin
      const baseTop = quad.id < 2 ? margin : 50 + margin
      
      // Use a 4x4 grid within the safe zone (16 possible slots)
      // This ensures logos are evenly distributed but still staggered
      const slots = Array.from({ length: 16 }, (_, i) => i)
        // Shuffle slots for randomness
        .sort(() => Math.random() - 0.5)
      
      quadIntegrations.forEach((int, idx) => {
        const slotIdx = slots[idx]
        const row = Math.floor(slotIdx / 4)
        const col = slotIdx % 4
        
        // Width/Height of each slot in the safe area
        const slotW = safeWidth / 4
        const slotH = safeHeight / 4
        
        // Center of the slot with very minor jitter
        const jitterX = (Math.random() - 0.5) * (slotW * 0.4)
        const jitterY = (Math.random() - 0.5) * (slotH * 0.4)
        
        const x = baseLeft + (col * slotW) + (slotW / 2) + jitterX
        const y = baseTop + (row * slotH) + (slotH / 2) + jitterY
        
        results.push({ 
          id: int.id, 
          x, 
          y, 
          scale: 0.9 + Math.random() * 0.2, 
          rotate: (Math.random() - 0.5) * 15 
        })
      })
    })
    
    return results
  }, [])

  useEffect(() => {
    const shuffledIds = [...INTEGRATIONS].sort(() => Math.random() - 0.5).map(i => i.id)
    let index = 0
    const interval = setInterval(() => {
      if (index < shuffledIds.length) {
        const nextBatch = shuffledIds.slice(index, index + 3)
        setVisibleIds(prev => {
          const next = new Set(prev)
          nextBatch.forEach(id => next.add(id))
          return next
        })
        index += 3
      } else {
        clearInterval(interval)
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-full h-full bg-[#030303] overflow-hidden">
      {/* Background Radial (Autopilot Style) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.08),transparent_70%)]" />
      
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-full w-full overflow-hidden border-0 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-3xl shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
        >
          {/* Grid Texture */}
          <div className="absolute inset-0 bg-[url()] opacity-[0.02] invert pointer-events-none" />
          
          {/* The Cross / Center Axis */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-1/2" />
            
            {/* Labels */}
            <div className="absolute top-8 left-8 px-5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 ring-1 ring-white/5">Marketing</div>
            <div className="absolute top-8 right-8 px-5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 text-right ring-1 ring-white/5">Sales & CRM</div>
            <div className="absolute bottom-8 left-8 px-5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 ring-1 ring-white/5">Communication</div>
            <div className="absolute bottom-8 right-8 px-5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-3xl text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 text-right ring-1 ring-white/5">Operations</div>
          </div>

          {/* Non-overlapping scattered logos */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence>
              {INTEGRATIONS.map((integration) => {
                const isVisible = visibleIds.has(integration.id)
                const pos = positions.find(p => p.id === integration.id)!
                if (!isVisible) return null

                return (
                  <motion.div
                    key={integration.id}
                    initial={{ opacity: 0, scale: 0.1, filter: 'blur(15px)', rotate: pos.rotate - 30 }}
                    animate={{ opacity: 1, scale: pos.scale, filter: 'blur(0px)', rotate: pos.rotate }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      position: 'absolute',
                      top: `${pos.y}%`,
                      left: `${pos.x}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="group z-0 hover:z-50"
                  >
                    <div className="absolute -inset-6 rounded-full bg-emerald-500/10 opacity-0 group-hover:opacity-30 blur-2xl transition-all duration-700" />
                    
                    {/* Smaller production-grade circles */}
                    <div className="relative h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 rounded-full bg-white border border-white/20 flex items-center justify-center overflow-hidden p-2.5 sm:p-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:scale-125 group-hover:border-white/60 ring-1 ring-black/5">
                      <img 
                        src={integration.logo} 
                        alt={integration.name} 
                        className="w-full h-full object-contain filter" 
                        style={{ transform: integration.logoScale ? `scale(${integration.logoScale})` : 'scale(1)' }}
                      />
                    </div>

                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0 pointer-events-none z-30">
                      <div className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-3xl border border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.8)]">
                        <span className="text-[9px] font-bold text-white uppercase tracking-[0.1em]">{integration.name}</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Screen Overlays */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] opacity-[0.05]" />
        </motion.div>
      </div>
    </div>
  )
}

```
$body_c_23$, $body_ct_23$text/markdown$body_ct_23$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_24$references/type6-components/IntegrationStrip.md$body_fp_24$, $body_c_24$# IntegrationStrip

> Horizontal integration logo strip; use as a social-proof sliver.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/IntegrationStrip.tsx`
- Website source: `apps/website/src/components/feature-pages/IntegrationStrip.tsx`
- Import alias: `@/components/feature-pages/IntegrationStrip`

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

- `body-4`
- `chip-glass-neutral`
- `section-padding`
- `site-container`

## Source

```tsx
import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function IntegrationStrip(props: { title: string; names: string[] }) {
  return (
    <section className="section-padding relative">
      <AnimateOnScroll>
        <div className="site-container">
          <div className="mx-auto max-w-5xl">
            <h2 className="h2 mb-6 tracking-tight text-white">{props.title}</h2>
            <div className="flex flex-wrap gap-2">
              {props.names.map((name) => (
                <span
                  key={name}
                  className="chip-glass-neutral body-4 rounded-full px-4 py-2 font-medium text-white"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}

```
$body_c_24$, $body_ct_24$text/markdown$body_ct_24$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_25$references/type6-components/IntegrationToolDispatcherMockup.md$body_fp_25$, $body_c_25$# IntegrationToolDispatcherMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/IntegrationToolDispatcherMockup.tsx`
- Website source: `apps/website/src/components/marketing/IntegrationToolDispatcherMockup.tsx`
- Import alias: `@/components/marketing/IntegrationToolDispatcherMockup`

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

- `!min-h-[380px]`
- `-translate-x-1/2`
- `-translate-y-1/2`
- `-z-10`
- `animate-pulse`
- `blur-[120px]`
- `blur-[140px]`
- `duration-1000`
- `group-hover:text-white/40`
- `object-contain`
- `object-cover`
- `shrink-0`
- `sm:!min-h-[500px]`
- `sm:scale-[0.8]`
- `transition-all`
- `transition-opacity`
- `truncate`

## Source

```tsx
'use client'

import React, { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CheckCircle2, Zap } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'

const ACTION_CARDS = [
  {
    id: 'meta',
    name: 'Meta Ads',
    logo: '/Integrations/Meta.png',
    color: 'blue',
    action: 'Publishing Creative',
    result: 'Live in Manager',
    x: -145,
    y: -130,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    logo: '/Integrations/Stripe.png',
    color: 'emerald',
    action: 'Processing Invoice',
    result: 'Payment Received',
    x: 145,
    y: -115,
    logoScale: 1.3,
  },
  {
    id: 'slack',
    name: 'Slack',
    logo: '/Integrations/Slack.png',
    color: 'purple',
    action: 'Alerting Team',
    result: 'Lead Notified',
    x: -145,
    y: 130,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    logo: '/Integrations/HubSpot.png',
    color: 'orange',
    action: 'Syncing CRM',
    result: 'Contact Updated',
    x: 145,
    y: 120,
  },
]

export function IntegrationToolDispatcherMockup() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [pulseKey, setPulseKey] = useState(0)
  const uid = useId()
  const g = (suffix: string) => `${uid.replace(/:/g, '')}-${suffix}`

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseKey((prev) => prev + 1)
      setActiveIdx((prev) => (prev === null ? 0 : (prev + 1) % ACTION_CARDS.length))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <FeatureFloatingMockShell className="flex !min-h-[380px] items-center justify-center overflow-hidden sm:!min-h-[500px]">
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <radialGradient id={g('electric-grad')}>
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>

      <div className="relative flex h-full w-full max-w-[600px] scale-[0.6] items-center justify-center sm:scale-[0.8] md:scale-100">
        {/* Background Grids & Orbits */}
        <div className="absolute h-[450px] w-[450px] rounded-full border border-white/[0.02]" />
        <div className="absolute h-[350px] w-[350px] rounded-full border border-white/[0.05] bg-white/[0.01]" />

        {/* Central Command Pulse Node */}
        <div className="relative z-50">
          {/* Radiating Shockwaves */}
          <AnimatePresence mode="wait">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`${pulseKey}-${i}`}
                initial={{ scale: 0.8, opacity: 0.5, border: '1px solid rgba(168, 85, 247, 0.5)' }}
                animate={{ scale: 4, opacity: 0, border: '1px solid rgba(168, 85, 247, 0)' }}
                transition={{ duration: 2.5, ease: 'easeOut', delay: i * 0.4 }}
                className="pointer-events-none absolute inset-0 rounded-full"
              />
            ))}
          </AnimatePresence>

          {/* Central Rex Portrait */}
          <motion.div
            className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-purple-500/30 bg-black shadow-[0_0_50px_rgba(168,85,247,0.2)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src={VIBEY_MARKETING_PORTRAIT_FALLBACK}
              alt="Rex"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-purple-500/10 mix-blend-overlay" />

            {/* Status Ping */}
            <div className="absolute bottom-2 right-2 h-4 w-4 animate-pulse rounded-full border-2 border-black bg-purple-500" />
          </motion.div>
        </div>

        {/* 4 Corners Action Cards */}
        {ACTION_CARDS.map((card, idx) => {
          const isActive = activeIdx === idx

          return (
            <div
              key={card.id}
              className="absolute z-40"
              style={{ transform: `translate(${card.x}px, ${card.y}px)` }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  opacity: isActive ? 1 : 0.6,
                  y: isActive ? (card.y > 0 ? 10 : -10) : 0,
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`glass-card relative w-[180px] !bg-black/40 border-${isActive ? 'white/30' : 'white/10'} group cursor-pointer overflow-hidden p-4 shadow-2xl backdrop-blur-2xl transition-colors hover:!border-white/40`}
              >
                {/* Activation Progress Bar (Visible when active) */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2.5, ease: 'linear' }}
                      className="absolute left-0 top-0 h-[2px] bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,1)]"
                    />
                  )}
                </AnimatePresence>

                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white p-2 shadow-lg transition-all duration-500 group-hover:border-white/40`}
                  >
                    <img
                      src={card.logo}
                      alt={card.name}
                      className="h-full w-full object-contain"
                      style={{
                        transform: card.logoScale ? `scale(${card.logoScale})` : 'scale(1)',
                      }}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[11px] font-bold text-white/90">
                      {card.name}
                    </span>
                    <span className="mt-0.5 text-[8px] font-medium uppercase leading-none tracking-widest text-white/40">
                      Integration
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="mb-1 text-[7px] font-bold uppercase leading-none tracking-wider text-white/30">
                        Status
                      </span>
                      <span
                        className={`text-[9px] font-semibold ${isActive ? 'text-purple-400' : 'text-white/60'} truncate leading-tight`}
                      >
                        {isActive ? card.action : card.result}
                      </span>
                    </div>
                    {isActive ? (
                      <Zap size={10} className="shrink-0 animate-pulse text-purple-400" />
                    ) : (
                      <CheckCircle2 size={10} className="shrink-0 text-white/20" />
                    )}
                  </div>
                </div>

                {/* Subtle Action Arrow */}
                <ArrowUpRight
                  size={12}
                  className="absolute right-3 top-3 text-white/10 transition-opacity group-hover:text-white/40"
                />
              </motion.div>

              {/* Connecting Electric Pulse Line */}
              <svg
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible"
                width="1"
                height="1"
                style={{ zIndex: -1 }}
              >
                <path
                  id={g(`path-${card.id}`)}
                  d={`M ${-card.x} ${-card.y} L 0 0`}
                  fill="none"
                  stroke={isActive ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.05)'}
                  strokeWidth={isActive ? '1.5' : '0.5'}
                  strokeDasharray={isActive ? 'none' : '4 4'}
                  className="transition-all duration-1000"
                />
                {isActive && (
                  <circle r="6" fill={`url(#${g('electric-grad')})`}>
                    <animateMotion dur="1.5s" repeatCount="indefinite">
                      <mpath href={`#${g(`path-${card.id}`)}`} />
                    </animateMotion>
                  </circle>
                )}
              </svg>
            </div>
          )
        })}
      </div>

      {/* Background Deep Glows */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[140px]" />
      <div className="absolute bottom-0 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[120px]" />

      {/* Screen Polish Scanlines */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] opacity-[0.05]" />
    </FeatureFloatingMockShell>
  )
}

```
$body_c_25$, $body_ct_25$text/markdown$body_ct_25$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_26$references/type6-components/LegendPanel.md$body_fp_26$, $body_c_26$# LegendPanel

> Product component; reuse verbatim in the slide TSX for 1:1 website fidelity.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/brain-app/LegendPanel.tsx`
- Website source: `apps/website/src/components/marketing/brain-app/LegendPanel.tsx`
- Import alias: `@/components/marketing/brain-app/LegendPanel`

## Props

```ts
interface LegendPanelProps {
  memoryCounts?: Record<string, number>
  snapshotCounts?: Record<string, number>
  experienceCount?: number
  skEntryCount?: number
  connections?: BrainConnection[]
  isAgentBrain?: boolean
  /** `overlay`: bottom-right on canvas. `sidebar`: fixed column right of graph (wheel zoom targets graph only). */
  variant?: 'overlay' | 'sidebar'
  showSnapshots?: boolean
  showSkKnowledge?: boolean
  animate?: boolean
  /** Fade root in on mount (marketing sequence). */
  fadeIn?: boolean
  /** Delay before count-up animation starts (s). */
  numberRollDelay?: number
  /** When `fadeIn` is true, called after the opacity intro finishes. */
  onFadeInComplete?: () => void
  /**
   * When true with `variant="overlay"`, root is not absolutely positioned.
   * Parent should place the panel (e.g. `absolute bottom-2 left-2` + scale).
   */
  embed?: boolean
}
```

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

- `body-3`
- `capitalize`
- `icon-xs`
- `transition-colors`
- `typo-caption`

## Source

```tsx
'use client'

/**
 * Ported from apps/web LegendPanel — user Brain legend only (no campaign / agent Knowledge tab / API).
 */
import { useEffect, useRef, useState } from 'react'
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  ENTRY_TYPE_COLORS,
  ENTRY_TYPE_LABELS,
  MEMORY_TYPE_COLORS,
  MEMORY_TYPE_LABELS,
  RELATIONSHIP_COLORS,
  SNAPSHOT_TYPE_COLORS,
} from './types'
import type { BrainConnection } from './types'

interface LegendPanelProps {
  memoryCounts?: Record<string, number>
  snapshotCounts?: Record<string, number>
  experienceCount?: number
  skEntryCount?: number
  connections?: BrainConnection[]
  isAgentBrain?: boolean
  /** `overlay`: bottom-right on canvas. `sidebar`: fixed column right of graph (wheel zoom targets graph only). */
  variant?: 'overlay' | 'sidebar'
  showSnapshots?: boolean
  showSkKnowledge?: boolean
  animate?: boolean
  /** Fade root in on mount (marketing sequence). */
  fadeIn?: boolean
  /** Delay before count-up animation starts (s). */
  numberRollDelay?: number
  /** When `fadeIn` is true, called after the opacity intro finishes. */
  onFadeInComplete?: () => void
  /**
   * When true with `variant="overlay"`, root is not absolutely positioned.
   * Parent should place the panel (e.g. `absolute bottom-2 left-2` + scale).
   */
  embed?: boolean
}

function RollingNumber({
  value,
  animate: shouldAnimate,
  delay: rollDelay = 0.5,
}: {
  value: number
  animate?: boolean
  delay?: number
}) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))

  useEffect(() => {
    if (shouldAnimate) {
      const controls = animate(count, value, {
        duration: 2,
        ease: [0.16, 1, 0.3, 1],
        delay: rollDelay,
      })
      return controls.stop
    } else {
      count.set(value)
    }
  }, [value, shouldAnimate, count, rollDelay])

  return <motion.span>{rounded}</motion.span>
}

export default function LegendPanel({
  memoryCounts,
  snapshotCounts,
  experienceCount,
  skEntryCount,
  connections,
  isAgentBrain,
  variant = 'overlay',
  showSnapshots = true,
  showSkKnowledge = true,
  animate: shouldAnimate = false,
  fadeIn = false,
  numberRollDelay = 0.5,
  onFadeInComplete,
  embed = false,
}: LegendPanelProps) {
  const fadeInDoneRef = useRef(false)
  const connectionCounts = (connections ?? []).reduce<Record<string, number>>((acc, c) => {
    const key = c.relationship_type ?? 'related_to'
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  const [collapsed, setCollapsed] = useState(false)

  const rootClass =
    variant === 'sidebar'
      ? 'surface-card border-border flex h-full min-h-0 w-[200px] flex-shrink-0 flex-col border-l z-40'
      : embed
        ? 'pointer-events-auto z-50 flex flex-col items-start relative'
        : 'left-4 bottom-4 pointer-events-auto absolute z-50 flex flex-col items-start'

  const panelClass =
    variant === 'sidebar'
      ? 'surface-card flex min-h-0 flex-1 flex-col overflow-hidden border-0'
      : 'surface-card border-border w-[180px] overflow-hidden rounded-lg border'

  const legendBodySections = (
    <div className="px-spacing-3 py-spacing-3 space-y-3">
      {!isAgentBrain && (
        <div className="space-y-1">
          <p className="typo-caption text-muted-foreground uppercase tracking-wider">Memories</p>
          {Object.entries(MEMORY_TYPE_COLORS)
            .filter(([key]) => key !== 'snapshot')
            .map(([key, varName]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{
                    background: `rgba(var(${varName}), 0.35)`,
                    border: `1px solid rgba(var(${varName}), 0.55)`,
                    boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
                  }}
                />
                <span className="body-3 text-muted-foreground">
                  {MEMORY_TYPE_LABELS[key] ?? key}
                </span>
                {memoryCounts?.[key] != null && (
                  <span className="typo-caption text-muted-foreground ml-auto">
                    <RollingNumber
                      value={memoryCounts[key]}
                      animate={shouldAnimate}
                      delay={numberRollDelay}
                    />
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

      {!isAgentBrain && showSnapshots && (
        <div className="space-y-1">
          <p className="typo-caption text-muted-foreground uppercase tracking-wider">Snapshots</p>
          {Object.entries(SNAPSHOT_TYPE_COLORS).map(([key, varName]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 flex-shrink-0"
                style={{
                  background: `rgba(var(${varName}), 0.35)`,
                  border: `1px solid rgba(var(${varName}), 0.55)`,
                  boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
                  transform: 'rotate(45deg)',
                }}
              />
              <span className="body-3 text-muted-foreground">{key}</span>
              {snapshotCounts?.[key] != null && (
                <span className="typo-caption text-muted-foreground ml-auto">
                  <RollingNumber
                    value={snapshotCounts[key]}
                    animate={shouldAnimate}
                    delay={numberRollDelay}
                  />
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <p className="typo-caption text-muted-foreground uppercase tracking-wider">
          Experiences / Sources
        </p>
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 flex-shrink-0"
            style={{
              background: 'rgba(var(--brain-document-rgb), 0.3)',
              border: '1px solid rgba(var(--brain-document-rgb), 0.5)',
              boxShadow: '0 0 6px rgba(var(--brain-document-rgb), 0.2)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          />
          <span className="body-3 text-muted-foreground">Experience / Source</span>
          {experienceCount != null && (
            <span className="typo-caption text-muted-foreground ml-auto">
              <RollingNumber
                value={experienceCount}
                animate={shouldAnimate}
                delay={numberRollDelay}
              />
            </span>
          )}
        </div>
      </div>

      {showSkKnowledge && (skEntryCount ?? 0) > 0 && (
        <div className="space-y-1">
          <p className="typo-caption text-muted-foreground uppercase tracking-wider">
            SK Knowledge
          </p>
          {Object.entries(ENTRY_TYPE_COLORS)
            .filter(([key]) => (memoryCounts?.[key] ?? 0) > 0)
            .map(([key, varName]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{
                    background: `rgba(var(${varName}), 0.35)`,
                    border: `1px solid rgba(var(${varName}), 0.55)`,
                    boxShadow: `0 0 6px rgba(var(${varName}), 0.3)`,
                  }}
                />
                <span className="body-3 text-muted-foreground">
                  {ENTRY_TYPE_LABELS[key] ?? key}
                </span>
                {memoryCounts?.[key] != null && (
                  <span className="typo-caption text-muted-foreground ml-auto">
                    <RollingNumber
                      value={memoryCounts[key]}
                      animate={shouldAnimate}
                      delay={numberRollDelay}
                    />
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

      <div className="space-y-1">
        <p className="typo-caption text-muted-foreground uppercase tracking-wider">Connections</p>
        {Object.entries(RELATIONSHIP_COLORS).map(([key, varName]) => (
          <div key={key} className="flex items-center gap-2">
            <div className="flex w-3 flex-shrink-0 items-center">
              <div
                className="h-px w-full"
                style={{
                  background: `rgba(var(${varName}), 0.8)`,
                  boxShadow: `0 0 4px rgba(var(${varName}), 0.5)`,
                }}
              />
            </div>
            <span className="body-3 text-muted-foreground capitalize">
              {key.replace(/_/g, ' ')}
            </span>
            {connectionCounts[key] != null && (
              <span className="typo-caption text-muted-foreground ml-auto">
                <RollingNumber
                  value={connectionCounts[key]}
                  animate={shouldAnimate}
                  delay={numberRollDelay}
                />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  const inner = (
    <div className={panelClass}>
      <div className="px-spacing-3 pt-spacing-3 pb-spacing-1 flex items-center justify-between">
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between transition-colors"
          >
            <span className="body-3 font-medium">Legend</span>
            <ChevronUp className="icon-xs" />
          </button>
        ) : (
          <>
            <span className="body-3 text-foreground font-medium">Legend</span>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse"
            >
              <ChevronDown className="icon-xs" />
            </button>
          </>
        )}
      </div>

      {variant === 'overlay' && !collapsed ? (
        <div className="overflow-hidden">
          <div style={{ scrollbarWidth: 'thin' }}>{legendBodySections}</div>
        </div>
      ) : variant === 'sidebar' ? (
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="legend-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="min-h-0 flex-1 overflow-hidden"
            >
              <div className="max-h-full overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {legendBodySections}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      ) : null}
    </div>
  )

  if (fadeIn) {
    return (
      <motion.div
        className={rootClass}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        onAnimationComplete={() => {
          if (fadeInDoneRef.current) return
          fadeInDoneRef.current = true
          onFadeInComplete?.()
        }}
      >
        {inner}
      </motion.div>
    )
  }

  return <div className={rootClass}>{inner}</div>
}

```
$body_c_26$, $body_ct_26$text/markdown$body_ct_26$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_27$references/type6-components/LibraryAgentProfileCard.md$body_fp_27$, $body_c_27$# LibraryAgentProfileCard

> Single card module; use inline within a larger slide.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/LibraryAgentProfileCard.tsx`
- Website source: `apps/website/src/components/marketing/LibraryAgentProfileCard.tsx`
- Import alias: `@/components/marketing/LibraryAgentProfileCard`

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

- `agent-profile-card-glass`
- `agent-profile-shell`
- `agent-profile-tabs-row`
- `badge-glass`
- `badge-glass-green`
- `badge-glass-muted`
- `badge-glass-sm`
- `body-3`
- `body-4`
- `chip-glass-blue`
- `chip-glass-neutral`
- `fill-current`
- `line-clamp-2`
- `normal-case`
- `object-cover`
- `object-top`
- `shrink-0`
- `surface-card`
- `truncate`

## Source

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import {
  getLibraryAgentDemoPerformance,
  LIBRARY_AGENT_PERFORMANCE_METRICS,
} from '@/lib/library-agent-demo-performance'

const TAB_IDS = ['info', 'skills', 'comms', 'context'] as const
type TabId = (typeof TAB_IDS)[number]

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'info', label: 'Info' },
  { id: 'skills', label: 'Skills' },
  { id: 'comms', label: 'Comms' },
  { id: 'context', label: 'Context' },
]


const DEMO_CAMPAIGNS = ['Sefy Tofan', 'Healing Waves', 'Vibey']

export function LibraryAgentProfileCard({ row, fixedTab }: { row: PublicAgentLibraryRow; fixedTab?: TabId }) {
  const [userTab, setUserTab] = useState<TabId | null>(null)
  const tab = userTab ?? fixedTab ?? 'info'
  const nameUpper = row.default_name.toUpperCase()
  const skillDetails = row.skill_details ?? []
  const demoPerf = getLibraryAgentDemoPerformance(row.role_key)

  return (
    <div className="agent-profile-shell flex w-full min-w-0 flex-col overflow-hidden rounded-spacing-3" style={{ height: 580 }}>
      <div className="agent-profile-card-glass relative flex h-full flex-col overflow-hidden border-0">
        <div className="shrink-0">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt=""
              className="h-56 w-full object-cover object-top"
            />
          ) : (
            <div className="flex h-56 w-full items-center justify-center bg-white/[0.03]" />
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
          <div className="shrink-0 px-2 pb-1 pt-1">
            <div className="agent-profile-tabs-row flex flex-wrap gap-0.5 p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setUserTab(t.id)}
                  className={
                    tab === t.id
                      ? 'agent-profile-tab agent-profile-tab-active body-3 flex min-h-9 flex-1 items-center justify-center rounded-md px-2 py-1 font-medium text-white'
                      : 'agent-profile-tab body-3 text-text-muted flex min-h-9 flex-1 items-center justify-center rounded-md border border-transparent px-2 py-1 font-medium'
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-3"
            style={{ scrollbarWidth: 'none' }}
          >
            {tab === 'info' && (
              <div className="gap-spacing-3 flex flex-col px-3">
                <div className="gap-spacing-2 flex items-start justify-between">
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-text-primary min-w-0 text-base font-bold uppercase leading-tight">
                        {nameUpper}{' '}
                        <span className="body-3 text-text-muted font-normal normal-case">
                          ({row.role})
                        </span>
                      </h2>
                    </div>
                  </div>
                  <span className="badge-glass badge-glass-muted body-4 shrink-0 rounded-full px-2 py-0.5">
                    Idle
                  </span>
                </div>

                <div className="space-y-2 text-left">
                  <p className="body-4 text-text-muted/60 uppercase tracking-wide">Performance</p>
                  <div className="gap-spacing-3 rounded-spacing-2 flex items-center border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className={`text-3xl font-bold leading-none ${demoPerf.overallColor}`}>
                      {demoPerf.overall.toFixed(1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="body-4 text-text-muted">Overall score</p>
                      <p className="body-4 text-text-muted/50">
                        {demoPerf.missionsScored} mission{demoPerf.missionsScored !== 1 ? 's' : ''}{' '}
                        scored
                      </p>
                    </div>
                  </div>
                  {LIBRARY_AGENT_PERFORMANCE_METRICS.map(({ key, label }) => {
                    const val = demoPerf.stats[key] ?? 0
                    return (
                      <div key={key} className="gap-spacing-2 flex items-center">
                        <span className="body-4 text-text-muted w-16 shrink-0">{label}</span>
                        <div className="progress-bar-track flex-1">
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${(val / 10) * 100}%` }}
                          />
                        </div>
                        <span className="body-4 text-text-muted w-6 text-right">{val.toFixed(1)}</span>
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-2 text-left">
                  <div className="gap-spacing-2 flex items-center">
                    <p className="body-4 text-text-muted/60 shrink-0 uppercase tracking-wide">
                      Campaigns
                    </p>
                    <button
                      type="button"
                      className="surface-card border-subtle rounded-spacing-2 body-3 text-text-primary hover-subtle flex min-w-0 flex-1 items-center justify-between px-3 py-2 text-left opacity-90"
                      disabled
                    >
                      <span className="text-text-muted truncate">Assign to campaign...</span>
                      <ChevronDown className="text-text-muted h-4 w-4 shrink-0" />
                    </button>
                  </div>
                  <div className="gap-spacing-2 flex flex-wrap">
                    {DEMO_CAMPAIGNS.map((label) => (
                      <span
                        key={label}
                        className="badge-glass badge-glass-muted body-4 inline-flex items-center gap-2 px-3 py-1"
                      >
                        {label}
                        <X className="h-3 w-3 shrink-0 text-text-muted opacity-50" aria-hidden />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'skills' && (
              <div className="space-y-2 px-3 text-left">
                {skillDetails.length === 0 ? (
                  <p className="body-4 text-text-muted">No skills listed for this template.</p>
                ) : (
                  skillDetails.map((skill) => (
                    <div
                      key={skill.skill_key}
                      className="rounded-spacing-2 border border-white/10 bg-white/[0.03] p-3"
                    >
                      <p className="body-3 text-text-primary font-semibold">{skill.name}</p>
                      <p className="body-4 text-text-muted mt-1 line-clamp-2">{skill.description}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === 'comms' && (
              <div className="space-y-3 px-3 text-left">
                <div>
                  <p className="body-4 text-text-muted/70 mb-1">Model</p>
                  <span className="chip-glass-blue body-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium">
                    Auto (Fast + Smart)
                    <ChevronDown className="h-3 w-3" />
                  </span>
                  <p className="body-4 text-text-muted/60 mt-2">
                    This model is used for this agent&apos;s Team chat and mission execution.
                  </p>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">Channels</p>
                  <button
                    type="button"
                    disabled
                    className="rounded-spacing-2 mb-2 w-full border border-dashed border-white/20 bg-white/[0.02] px-3 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-white" aria-hidden><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                      <div>
                        <p className="body-3 text-text-primary font-medium">Connect Telegram</p>
                        <p className="body-4 text-text-muted">Let this agent chat on Telegram</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled
                    className="rounded-spacing-2 w-full border border-dashed border-white/20 bg-white/[0.02] px-3 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-white" aria-hidden><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.27 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.833 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" /></svg>
                      <div>
                        <p className="body-3 text-text-primary font-medium">Connect Slack</p>
                        <p className="body-4 text-text-muted">Let this agent chat in Slack channels</p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">Default Channel</p>
                  <p className="body-4 text-text-muted/50 mb-2">
                    Where {row.default_name} sends proactive updates
                  </p>
                  <div className="flex gap-2">
                    <span className="chip-glass-blue body-3 rounded-spacing-2 px-3 py-2 font-medium">Team Chat</span>
                    <span className="chip-glass-neutral body-3 rounded-spacing-2 px-3 py-2 font-medium">Telegram</span>
                    <span className="chip-glass-neutral body-3 rounded-spacing-2 px-3 py-2 font-medium">Slack</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">Daily Digest</p>
                  <div className="rounded-spacing-2 flex items-center justify-between border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div>
                      <span className="body-3 text-text-primary">Enable daily digest</span>
                      <p className="body-4 text-text-muted/60">
                        {row.default_name} sends a daily summary of all awareness points
                      </p>
                    </div>
                    <div className="h-6 w-11 shrink-0 rounded-full bg-emerald-500/30" aria-hidden>
                      <div className="ml-[22px] mt-[2px] h-5 w-5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'context' && (
              <div className="space-y-3 px-3 text-left">
                <div>
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">
                    Share your brain
                  </p>
                  <div className="rounded-spacing-2 flex items-center justify-between gap-3 border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="min-w-0">
                      <span className="body-3 text-text-primary">Share your brain</span>
                      <p className="body-4 text-text-muted/60">
                        Let {row.default_name} read from your personal knowledge base
                      </p>
                    </div>
                    <div className="h-6 w-11 shrink-0 rounded-full bg-emerald-500/30" aria-hidden>
                      <div className="ml-[22px] mt-[2px] h-5 w-5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">
                    Campaign access
                  </p>
                  <div className="rounded-spacing-2 flex items-center justify-between gap-3 border border-white/10 bg-white/[0.03] px-3 py-2">
                    <div className="min-w-0">
                      <span className="body-3 text-text-primary">Campaign context</span>
                      <p className="body-4 text-text-muted/60">
                        Access offers, funnels, avatars &amp; profile
                      </p>
                    </div>
                    <div className="h-6 w-11 shrink-0 rounded-full bg-emerald-500/30" aria-hidden>
                      <div className="ml-[22px] mt-[2px] h-5 w-5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="body-4 text-text-muted/60 mb-2 uppercase tracking-wide">
                    Agent Brain
                  </p>
                  <p className="body-3 text-text-muted">
                    Give {row.default_name} a dedicated knowledge brain to store and recall
                    specific context across conversations.
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="body-4 text-text-muted">
                      {row.default_name} has their own knowledge brain.
                    </p>
                    <span className="badge-glass badge-glass-green badge-glass-sm">Active</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

```
$body_c_27$, $body_ct_27$text/markdown$body_ct_27$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_28$references/type6-components/MarketingAtlasVoiceMockup.md$body_fp_28$, $body_c_28$# MarketingAtlasVoiceMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingAtlasVoiceMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingAtlasVoiceMockup.tsx`
- Import alias: `@/components/marketing/MarketingAtlasVoiceMockup`

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

- `!min-h-[380px]`
- `sm:!min-h-[480px]`
- `sm:h-[360px]`
- `sm:w-[360px]`

## Source

```tsx
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, Volume2 } from 'lucide-react'
import * as THREE from 'three'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

// --- Static orb (no mouse tracking) ---

const VIBE = { r: 217 / 255, g: 252 / 255, b: 103 / 255 }
const VIBE_HI = { r: 235 / 255, g: 1, b: 0.65 }
const VIBE_LO = { r: 165 / 255, g: 210 / 255, b: 70 / 255 }
const CORE_COUNT = 14000

function buildTargets(): Float32Array {
  const out = new Float32Array(CORE_COUNT * 3)
  for (let i = 0; i < CORE_COUNT; i++) {
    const u = Math.random(),
      v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const r = Math.pow(Math.random(), 2.2) * 0.44
    const ix = i * 3
    out[ix] = r * Math.sin(phi) * Math.cos(theta)
    out[ix + 1] = r * Math.sin(phi) * Math.sin(theta)
    out[ix + 2] = r * Math.cos(phi)
  }
  return out
}

function AtlasOrbScene({ isTalking }: { isTalking: boolean }) {
  const groupRef = useRef<THREE.Group>(null!)
  const vTmp = useRef(new THREE.Vector3())
  const vVel = useRef(new THREE.Vector3())
  const vTgt = useRef(new THREE.Vector3())
  const vCur = useRef(new THREE.Vector3())
  const targets = useMemo(() => buildTargets(), [])

  const geo = useMemo(() => {
    const colors = new Float32Array(CORE_COUNT * 3)
    for (let i = 0; i < CORE_COUNT; i++) {
      const ix = i * 3,
        t = Math.random(),
        br = 0.85 + Math.random() * 0.35
      colors[ix] = (t < 0.33 ? VIBE_LO.r : t < 0.66 ? VIBE.r : VIBE_HI.r) * br
      colors[ix + 1] = (t < 0.33 ? VIBE_LO.g : t < 0.66 ? VIBE.g : VIBE_HI.g) * br
      colors[ix + 2] = (t < 0.33 ? VIBE_LO.b : t < 0.66 ? VIBE.b : VIBE_HI.b) * br
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(targets), 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [targets])

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    // Global breathe — all particles share this base
    const breathe = 1 + Math.sin(time * 2.1) * 0.12 + Math.sin(time * 0.8) * 0.05

    const attr = geo.getAttribute('position') as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const vel = (geo.userData.vel ??= new Float32Array(CORE_COUNT * 3)) as Float32Array

    for (let i = 0; i < CORE_COUNT; i++) {
      const ix = i * 3
      const tx = targets[ix]!,
        ty = targets[ix + 1]!,
        tz = targets[ix + 2]!

      // Per-particle talking: unique phase per particle creates organic turbulence.
      // Three frequencies at different spatial harmonics so no two particles move together.
      let extra = 0
      if (isTalking) {
        const p = i * 0.023
        extra =
          Math.sin(time * 11.3 + p) * 0.1 +
          Math.sin(time * 7.1 + p * 2.1) * 0.06 +
          Math.sin(time * 21.7 + p * 0.37) * 0.04
      }

      const scale = breathe + extra
      vTgt.current.set(tx * scale, ty * scale, tz * scale)
      vCur.current.set(arr[ix]!, arr[ix + 1]!, arr[ix + 2]!)
      vVel.current.set(vel[ix]!, vel[ix + 1]!, vel[ix + 2]!)
      vVel.current.add(vTmp.current.subVectors(vTgt.current, vCur.current).multiplyScalar(0.0048))
      vVel.current.multiplyScalar(0.91)
      arr[ix] = vCur.current.x + vVel.current.x
      arr[ix + 1] = vCur.current.y + vVel.current.y
      arr[ix + 2] = vCur.current.z + vVel.current.z
      vel[ix] = vVel.current.x
      vel[ix + 1] = vVel.current.y
      vel[ix + 2] = vVel.current.z
    }
    attr.needsUpdate = true

    // Slow steady rotation — no mouse tracking
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.03
  })

  return (
    <group ref={groupRef} scale={1.5}>
      <points>
        <primitive object={geo} attach="geometry" />
        <pointsMaterial
          size={0.006}
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}

// --- Conversation ---

const TRANSCRIPT = [
  { role: 'user', text: 'What is our current stance on discounts?' },
  {
    role: 'atlas',
    text: "Based on 3 meeting recordings and your 'Q2 Strategy' doc, we never discount — we only add value stacks.",
  },
]

export function MarketingAtlasVoiceMockup() {
  const [canvasReady, setCanvasReady] = useState(false)
  const [visibleIndex, setVisibleIndex] = useState(-1)
  const [isTalking, setIsTalking] = useState(false)

  useEffect(() => {
    let cancelled = false
    const runCycle = async () => {
      if (cancelled) return
      setVisibleIndex(-1)
      setIsTalking(false)
      await new Promise((r) => setTimeout(r, 1200))
      if (cancelled) return
      setVisibleIndex(0)
      await new Promise((r) => setTimeout(r, 2200))
      if (cancelled) return
      setIsTalking(true)
      setVisibleIndex(1)
      await new Promise((r) => setTimeout(r, 4500))
      if (cancelled) return
      setIsTalking(false)
      await new Promise((r) => setTimeout(r, 3000))
      if (!cancelled) runCycle()
    }
    runCycle()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <FeatureFloatingMockShell className="flex !min-h-[380px] flex-col items-center justify-center sm:!min-h-[480px]">
      {/* Header badge */}
      <div className="absolute left-0 right-0 top-6 flex justify-center">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full transition-colors duration-500 ${isTalking ? 'animate-pulse bg-emerald-400' : 'bg-white/20'}`}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
            Atlas Voice Interface
          </span>
        </div>
      </div>

      {/* Orb — bigger, no mouse interaction */}
      <div className="h-[260px] w-[260px] sm:h-[360px] sm:w-[360px] md:h-[420px] md:w-[420px]">
        <Canvas
          camera={{ position: [0, 0, 5.2], fov: 42 }}
          frameloop="always"
          dpr={[1, 2]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
            alpha: true,
            preserveDrawingBuffer: true,
          }}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onCreated={(s) => {
            s.gl.setClearColor(0x000000, 0)
            s.scene.background = null
            setTimeout(() => setCanvasReady(true), 80)
          }}
        >
          <AtlasOrbScene isTalking={isTalking} />
          {canvasReady && (
            <EffectComposer multisampling={0}>
              <Bloom
                intensity={0.42}
                luminanceThreshold={0.15}
                luminanceSmoothing={0.9}
                mipmapBlur
                radius={0.35}
              />
            </EffectComposer>
          )}
        </Canvas>
      </div>

      {/* Transcript */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center px-8">
        <AnimatePresence mode="wait">
          {visibleIndex >= 0 && (
            <motion.div
              key={visibleIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="max-w-[380px] text-center"
            >
              <div className="mb-2 flex items-center justify-center gap-2">
                {TRANSCRIPT[visibleIndex]!.role === 'user' ? (
                  <Mic size={11} className="text-white/30" />
                ) : (
                  <Volume2 size={11} className="text-emerald-400" />
                )}
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/25">
                  {TRANSCRIPT[visibleIndex]!.role === 'user' ? 'You' : 'Atlas'}
                </span>
              </div>
              <p
                className={`text-[14px] font-medium leading-relaxed ${TRANSCRIPT[visibleIndex]!.role === 'user' ? 'text-white/80' : 'text-emerald-100'}`}
              >
                {TRANSCRIPT[visibleIndex]!.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FeatureFloatingMockShell>
  )
}

```
$body_c_28$, $body_ct_28$text/markdown$body_ct_28$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_29$references/type6-components/MarketingBrainGraphBlogBanner.md$body_fp_29$, $body_c_29$# MarketingBrainGraphBlogBanner

> Force graph / relationship viz; good for brain/memory slides.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingBrainGraphBlogBanner.tsx`
- Website source: `apps/website/src/components/marketing/MarketingBrainGraphBlogBanner.tsx`
- Import alias: `@/components/marketing/MarketingBrainGraphBlogBanner`

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
- `line-clamp-2`

## Source

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import ForceGraph, { type ForceGraphHandle } from './brain-app/ForceGraph'
import { getMarketingBrainDemoGraph } from './brain-app/marketingBrainDemoGraph'
import type { BrainMemory } from './brain-app/types'

const DEMO = getMarketingBrainDemoGraph()

/** Plain brain graph for blog banner — no legend, no insight card, no toolbar chrome. */
export function MarketingBrainGraphBlogBanner() {
  const graphRef = useRef<ForceGraphHandle>(null)
  const [selectedNode, setSelectedNode] = useState<BrainMemory | null>(null)

  useEffect(() => {
    // After the canvas has measured its container, re-center the graph so
    // positions saved from the full-size feature page don't misalign the view.
    const t = window.setTimeout(() => {
      graphRef.current?.center()
    }, 600)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="relative h-full w-full">
      <ForceGraph
        ref={graphRef}
        className="h-full w-full"
        nodes={DEMO.nodes}
        connections={DEMO.connections}
        selectedNodeId={selectedNode?.id ?? null}
        searchQuery=""
        onNodeClick={setSelectedNode}
        animateEntrance
        entranceStartDelayMs={300}
        entranceBatchDelayMs={48}
      />
      {selectedNode && (
        <div className="border-border bg-[var(--color-card)]/95 pointer-events-none absolute bottom-3 left-1/2 z-30 max-w-[min(88%,300px)] -translate-x-1/2 rounded-lg border px-2 py-1.5 shadow-lg backdrop-blur-sm">
          <p className="line-clamp-2 text-[10px] font-medium leading-snug text-[var(--color-foreground)]">
            {selectedNode.content || selectedNode.name || 'Memory'}
          </p>
        </div>
      )}
    </div>
  )
}

```
$body_c_29$, $body_ct_29$text/markdown$body_ct_29$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
