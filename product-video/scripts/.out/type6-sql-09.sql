INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_56$references/type6-components/SocialPostPreview.md$body_fp_56$, $body_c_56$# SocialPostPreview

> Artifact preview (ad / funnel / email); use as slide body.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/capabilities-carousel-previews/SocialPostPreview.tsx`
- Website source: `apps/website/src/components/marketing/capabilities-carousel-previews/SocialPostPreview.tsx`
- Import alias: `@/components/marketing/capabilities-carousel-previews/SocialPostPreview`

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


## Source

```tsx
/**
 * Beautifully constructed Social Post preview natively matching the 100% viewport.
 * Does not contain the word "funnel" so the user doesn't confuse it with the landing page.
 */
export function SocialPostPreview() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#0D0D0D',
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 85% 55% at 18% 12%, rgba(225,48,108,0.35) 0%, transparent 52%), radial-gradient(ellipse 70% 45% at 92% 88%, rgba(99,102,241,0.22) 0%, transparent 48%), radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 60%), linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#0D0D0D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>V</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F5F5' }}>vibey.im</div>
              <div style={{ fontSize: 10, color: '#888' }}>Sponsored</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{ width: 4, height: 4, borderRadius: '50%', background: '#888' }}
              />
            ))}
          </div>
        </div>

        <div
          style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: 20,
            }}
          >
            <span style={{ color: '#E1306C' }}>3 SECRETS</span> TO SCALING
            <br />
            B2B REVENUE IN 2026
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { num: '01', text: 'Stop selling features. Sell the end state.' },
              { num: '02', text: 'Automate your outbound follow-ups.' },
              { num: '03', text: 'Turn happy customers into your best ads.' },
            ].map((item) => (
              <div key={item.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ color: '#E1306C', fontWeight: 800, fontSize: 14, paddingTop: 2 }}>
                  {item.num}
                </div>
                <div
                  style={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
          <div style={{ width: 24, height: 4, borderRadius: 2, background: '#E1306C' }} />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                alignSelf: 'center',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

```
$body_c_56$, $body_ct_56$text/markdown$body_ct_56$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_57$references/type6-components/StandaloneVideoShowcase.md$body_fp_57$, $body_c_57$# StandaloneVideoShowcase

> Multi-block layout alternating copy + visual; map to a full carousel.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/StandaloneVideoShowcase.tsx`
- Website source: `apps/website/src/components/feature-pages/StandaloneVideoShowcase.tsx`
- Import alias: `@/components/feature-pages/StandaloneVideoShowcase`

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

- `body-1`
- `glass-card`
- `object-cover`
- `section-padding`
- `site-container`

## Source

```tsx
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

```
$body_c_57$, $body_ct_57$text/markdown$body_ct_57$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_58$references/type6-components/StudioSkillChatPreview.md$body_fp_58$, $body_c_58$# StudioSkillChatPreview

> Artifact preview (ad / funnel / email); use as slide body.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/capabilities-carousel-previews/StudioSkillChatPreview.tsx`
- Website source: `apps/website/src/components/marketing/capabilities-carousel-previews/StudioSkillChatPreview.tsx`
- Import alias: `@/components/marketing/capabilities-carousel-previews/StudioSkillChatPreview`

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

- `!bg-white/[0.03]`
- `body-1`
- `body-2`
- `button-glass-neutral`
- `card-glass`
- `card-glass-user`
- `chip-glass-blue`
- `input-glass`
- `shrink-0`
- `typo-caption`

## Source

```tsx
import { ChevronDown, Mic, Paperclip, Settings2 } from 'lucide-react'

/** Studio chat + skill artifact; mirrors apps/web ChatInterface + MessageBubble (full-width user card; assistant `mx-2` text column, no avatar). */
export function StudioSkillChatPreview() {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#161616]"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <div className="relative flex h-full min-h-0 w-full flex-col px-4 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4">
        <div className="mb-4 flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
          <div className="w-full min-w-0">
            <div className="card-glass card-glass-user px-spacing-4 py-2">
              <p className="body-2 font-normal text-white">
                Create a skill that automatically scores our new inbound leads from Typeform based
                on their revenue and company size, and routes high-intent ones to the sales channel
                in Slack.
              </p>
            </div>
          </div>

          <div className="mx-2 flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
            <div className="body-1 text-chat px-spacing-2 flex flex-col">
              <p className="body-2 font-normal leading-relaxed text-white/90">
                I&apos;ve drafted the <strong className="font-bold">Lead Score & Routing</strong>{' '}
                skill for you. It will evaluate incoming Typeform leads and automatically notify the
                team when a lead fits your ICP criteria.
              </p>
            </div>
            <div className="w-full max-w-[300px] rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20">
                  <span className="text-xs font-bold text-emerald-400">{'{ }'}</span>
                </div>
                <span className="text-sm font-semibold text-white">Lead Score & Routing</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-[11px] text-white/50">Skill created</span>
                <span className="text-[11px] font-semibold text-emerald-400">Ready to test →</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-auto shrink-0">
          <div className="input-glass flex flex-col rounded-2xl border border-white/10 !bg-white/[0.03] shadow-2xl">
            <div className="px-3 pb-1 pt-2.5 md:px-4 md:pt-3">
              <p className="body-2 font-normal text-white/30">Message Vibe...</p>
            </div>

            <div className="mt-2 flex items-center justify-between px-2 py-2 md:px-3">
              <div className="flex items-center gap-1.5">
                <div className="chip-glass-blue flex h-8 items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 text-[11px] font-medium text-blue-400">
                  <span className="typo-caption font-medium">Auto</span>
                  <ChevronDown size={12} className="opacity-60" />
                </div>
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
                  <Paperclip size={14} />
                </div>
                <div className="flex h-8 items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/20 px-2.5 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                  <Settings2 size={14} />
                  <span className="typo-caption font-bold">3</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40">
                  <Mic size={14} />
                </div>
                <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/20">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

```
$body_c_58$, $body_ct_58$text/markdown$body_ct_58$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_59$references/type6-components/ThreeSteps.md$body_fp_59$, $body_c_59$# ThreeSteps

> Product component; reuse verbatim in the slide TSX for 1:1 website fidelity.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/ThreeSteps.tsx`
- Website source: `apps/website/src/components/feature-pages/ThreeSteps.tsx`
- Import alias: `@/components/feature-pages/ThreeSteps`

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

- `body-3`
- `section-padding`
- `site-container`

## Source

```tsx
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import {
  FeatureMockupByKind,
  type FeatureMockupKind,
} from '@/components/feature-pages/FeatureMockups'

/** Fixed frame height: three columns share one row height; content uses `mt-auto` to bottom-align cards. */
const STEPS_MOCKUP_FRAME_H = 'h-[300px] max-h-[300px]'

export function ThreeSteps(props: {
  title: string
  steps: { title: string; description: string; mockupKind?: FeatureMockupKind }[]
}) {
  const hasMockups = props.steps.some((s) => s.mockupKind)

  return (
    <section className="section-padding relative">
      <AnimateOnScroll>
        <div className="site-container">
          <div>
            <h2 className="h2 mb-10 tracking-tight text-white">{props.title}</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {props.steps.map((step, i) => (
                <div key={step.title} className="flex flex-col gap-4">
                  <div className="md:hidden">
                    <h3 className="h4 mb-1 text-white">
                      {i + 1}. {step.title}
                    </h3>
                    <p className="text-text-muted body-3 leading-relaxed">{step.description}</p>
                  </div>
                  {hasMockups && step.mockupKind && (
                    <div
                      className={`glass-card border-section flex flex-col overflow-visible rounded-2xl border ${STEPS_MOCKUP_FRAME_H}`}
                    >
                      <div className="flex min-h-0 flex-1 flex-col overflow-visible">
                        <FeatureMockupByKind kind={step.mockupKind} compact />
                      </div>
                    </div>
                  )}
                  <div className="hidden md:block">
                    <h3 className="h4 mb-1 text-white">
                      {i + 1}. {step.title}
                    </h3>
                    <p className="text-text-muted body-3 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}

```
$body_c_59$, $body_ct_59$text/markdown$body_ct_59$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_60$references/type6-components/ValuePropGrid.md$body_fp_60$, $body_c_60$# ValuePropGrid

> Multi-cell grid (capabilities / value props); use for list slides.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/ValuePropGrid.tsx`
- Website source: `apps/website/src/components/feature-pages/ValuePropGrid.tsx`
- Import alias: `@/components/feature-pages/ValuePropGrid`

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

- `body-2`
- `body-3`
- `glass-card`
- `glass-card-hover`
- `lg:grid-cols-3`
- `section-padding`
- `site-container`
- `sm:grid-cols-2`
- `transition-all`

## Source

```tsx
import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function ValuePropGrid(props: {
  title: string
  subtitle?: string
  items: { title: string; description: string }[]
}) {
  return (
    <section className="section-padding relative">
      <AnimateOnScroll>
        <div className="site-container">
          <div>
            <h2 className="h2 mb-2 tracking-tight text-white">{props.title}</h2>
            {props.subtitle && (
              <p className="text-text-muted body-2 mb-8 max-w-2xl">{props.subtitle}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {props.items.map((item) => (
                <div
                  key={item.title}
                  className="glass-card glass-card-hover border-section rounded-2xl border p-6 transition-all"
                >
                  <h3 className="h4 mb-2 text-white">{item.title}</h3>
                  <p className="text-text-muted body-3 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}

```
$body_c_60$, $body_ct_60$text/markdown$body_ct_60$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
