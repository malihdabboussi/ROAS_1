-- Spaces Component Kit: DB-backed, token-driven component library for Viktor
-- Components use CSS variables (var(--color-primary), etc.) from branding_themes
-- Synced to sandbox via AgentSyncService → .vibey-kit/ folder

-- 1. Parent skill row
INSERT INTO agent_skills (user_id, agent_key, skill_key, name, description, markdown_content, is_enabled)
VALUES (
  NULL,
  'viktor',
  'spaces-component-kit',
  'Spaces Component Kit',
  'Pre-built, token-driven UI components for Spaces projects. Use the CLI to add sections, widgets, and page templates instead of writing from scratch.',
  $skill$# Spaces Component Kit

> Use this skill whenever you build a Spaces project. NEVER write section components (heroes, features, pricing, testimonials, stats, FAQ, CTA, footer, navigation, team, logo clouds) or dashboard widgets (KPI cards, charts, tables) from scratch. Always use the kit.

## How it works

The sandbox has a hidden `.vibey-kit/` folder with pre-built, theme-aware components. You install them into the project with a CLI. The user owns the copy and can customize it.

## Commands

```bash
# See everything available
node .vibey-kit/cli.js list

# Filter by category
node .vibey-kit/cli.js list sections
node .vibey-kit/cli.js list widgets

# Add components (copies to /project/components/)
node .vibey-kit/cli.js add hero-1 features-1 pricing-1 footer-1

# Get info about a component
node .vibey-kit/cli.js info hero-1
```

## After adding a component

1. Import it in your page: `import Hero1 from '@/components/sections/Hero1'`
2. Use it with props: `<Hero1 headline="Your headline" ctaText="Get started" ctaHref="/signup" />`
3. Customize props to match the user's request
4. You CAN edit the copied file if the user wants custom changes

## Rules

- **ALWAYS check the kit first** before writing any UI section
- **NEVER hardcode colors** — use CSS variables: `var(--color-primary)`, `var(--color-foreground)`, `var(--color-muted-foreground)`, `var(--color-border)`, `var(--color-card-background)`, `var(--color-primary-foreground)`
- **NEVER hardcode fonts** — use `var(--font-heading)`, `var(--font-body)`
- The theme.css file in the project sets all these variables from the user's brand theme
- Components that use Framer Motion need `'use client'` directive
- Charts need `recharts` package — the CLI adds it to package.json automatically

## Available sections

| ID | Name | Category |
|----|------|----------|
| hero-1 | Centered Hero with Gradient | Hero |
| hero-2 | Media Hero with Email Capture | Hero |
| features-1 | Icon Grid Features | Features |
| features-2 | Alternating Rows Features | Features |
| pricing-1 | Three-Tier Pricing | Pricing |
| testimonials-1 | Card Grid Testimonials | Testimonials |
| stats-1 | Spring Counter Row | Stats |
| stats-2 | Dark Band with Glow | Stats |
| stats-3 | Bordered Grid Cards | Stats |
| stats-4 | Parallax Background Stats | Stats |
| stats-5 | Inline Proof Strip | Stats |
| cta-1 | Dark Contrast Banner CTA | CTA |
| faq-1 | Smooth Accordion FAQ | FAQ |
| footer-1 | Multi-Column Footer | Footer |
| nav-1 | Sticky Header Navigation | Navigation |
| team-1 | Avatar Grid Team | Team |
| logo-cloud-1 | Logo Trust Strip | Utility |
| contact-form-1 | Simple Contact Form | Contact |

## Available widgets

| ID | Name | Deps |
|----|------|------|
| kpi-card | KPI Metric Card | — |
| bar-chart | Bar Chart | recharts |
| line-chart | Line Chart | recharts |
| data-table | Data Table | — |
| progress-bar | Progress Bar | — |
| badge | Status Badge | — |

## Example: building a landing page

```
User: "Build me a landing page for my SaaS"

You:
1. node .vibey-kit/cli.js add nav-1 hero-1 features-1 stats-1 testimonials-1 pricing-1 faq-1 cta-1 footer-1
2. Write app/page.tsx importing all components
3. Configure props with user's copy/branding
```
$skill$,
  true
)
ON CONFLICT (agent_key, skill_key) WHERE (user_id IS NULL AND org_id IS NULL)
DO UPDATE SET markdown_content = EXCLUDED.markdown_content, description = EXCLUDED.description, name = EXCLUDED.name;

-- 2. CLI script
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'viktor', 'spaces-component-kit', 'cli.js', $cli$#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const KIT = path.dirname(__filename);
const PROJECT = path.resolve(KIT, '..');
const registry = JSON.parse(fs.readFileSync(path.join(KIT, 'registry.json'), 'utf8'));

const cmd = process.argv[2];
const args = process.argv.slice(3);

function allItems() {
  const items = [];
  for (const [cat, list] of Object.entries(registry.sections)) {
    for (const c of list) items.push({ ...c, category: cat, type: 'section' });
  }
  for (const [id, c] of Object.entries(registry.widgets)) {
    items.push({ ...c, id, category: 'widget', type: 'widget' });
  }
  return items;
}

function list(filter) {
  const items = allItems();
  const filtered = filter ? items.filter(i => i.type === filter || i.category === filter) : items;
  console.log('\nAvailable components:\n');
  let lastCat = '';
  for (const i of filtered) {
    if (i.category !== lastCat) { console.log(`  ${i.category.toUpperCase()}`); lastCat = i.category; }
    const deps = i.deps && i.deps.length ? ` (needs: ${i.deps.join(', ')})` : '';
    console.log(`    ${i.id.padEnd(22)} ${i.name}${deps}`);
  }
  console.log(`\n  Total: ${filtered.length} components\n`);
}

function add(ids) {
  if (!ids.length) { console.log('Usage: node .vibey-kit/cli.js add <id> [<id> ...]'); process.exit(1); }
  const items = allItems();
  const depsToAdd = new Set();
  for (const id of ids) {
    const item = items.find(i => i.id === id);
    if (!item) { console.error(`Unknown component: ${id}`); continue; }
    const src = path.join(KIT, item.file);
    if (!fs.existsSync(src)) { console.error(`Source missing: ${item.file}`); continue; }
    const destDir = item.type === 'widget'
      ? path.join(PROJECT, 'components', 'widgets')
      : path.join(PROJECT, 'components', 'sections');
    fs.mkdirSync(destDir, { recursive: true });
    const destFile = path.join(destDir, path.basename(item.file));
    fs.copyFileSync(src, destFile);
    console.log(`  Added ${id} → components/${item.type === 'widget' ? 'widgets' : 'sections'}/${path.basename(item.file)}`);
    if (item.deps) item.deps.forEach(d => depsToAdd.add(d));
  }
  if (depsToAdd.size) {
    const pkgPath = path.join(PROJECT, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const missing = [...depsToAdd].filter(d => !allDeps[d]);
      if (missing.length) {
        console.log(`\n  Run: pnpm add ${missing.join(' ')}`);
      }
    }
  }
}

function info(id) {
  const item = allItems().find(i => i.id === id);
  if (!item) { console.error(`Unknown: ${id}`); process.exit(1); }
  console.log(`\n  ${item.name} (${item.id})`);
  console.log(`  Type: ${item.type} | Category: ${item.category}`);
  if (item.deps && item.deps.length) console.log(`  Dependencies: ${item.deps.join(', ')}`);
  console.log(`  File: ${item.file}`);
  const importName = path.basename(item.file, '.tsx');
  const importPath = item.type === 'widget' ? `@/components/widgets/${importName}` : `@/components/sections/${importName}`;
  console.log(`\n  Usage:`);
  console.log(`    import ${importName} from '${importPath}'`);
  console.log(`    <${importName} />\n`);
}

if (cmd === 'list') list(args[0]);
else if (cmd === 'add') add(args);
else if (cmd === 'info') info(args[0]);
else { console.log('Usage: node .vibey-kit/cli.js <list|add|info> [args]'); }
$cli$)
ON CONFLICT DO NOTHING;

-- 3. Registry JSON
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'viktor', 'spaces-component-kit', 'registry.json', $reg${
  "sections": {
    "hero": [
      { "id": "hero-1", "name": "Centered Hero with Gradient", "file": "sections/Hero1.tsx", "deps": ["framer-motion"] },
      { "id": "hero-2", "name": "Media Hero with Email Capture", "file": "sections/Hero2.tsx", "deps": ["framer-motion"] }
    ],
    "features": [
      { "id": "features-1", "name": "Icon Grid Features", "file": "sections/Features1.tsx", "deps": ["framer-motion", "lucide-react"] },
      { "id": "features-2", "name": "Alternating Rows Features", "file": "sections/Features2.tsx", "deps": ["framer-motion", "lucide-react"] }
    ],
    "pricing": [
      { "id": "pricing-1", "name": "Three-Tier Pricing", "file": "sections/Pricing1.tsx", "deps": ["framer-motion", "lucide-react"] }
    ],
    "testimonials": [
      { "id": "testimonials-1", "name": "Card Grid Testimonials", "file": "sections/Testimonials1.tsx", "deps": ["framer-motion"] }
    ],
    "stats": [
      { "id": "stats-1", "name": "Spring Counter Row", "file": "sections/Stats1.tsx", "deps": ["framer-motion"] },
      { "id": "stats-2", "name": "Dark Band with Glow", "file": "sections/Stats2.tsx", "deps": ["framer-motion"] },
      { "id": "stats-3", "name": "Bordered Grid Cards", "file": "sections/Stats3.tsx", "deps": ["framer-motion", "lucide-react"] },
      { "id": "stats-4", "name": "Parallax Background Stats", "file": "sections/Stats4.tsx", "deps": ["framer-motion"] },
      { "id": "stats-5", "name": "Inline Proof Strip", "file": "sections/Stats5.tsx", "deps": ["framer-motion"] }
    ],
    "cta": [
      { "id": "cta-1", "name": "Dark Contrast Banner CTA", "file": "sections/CTA1.tsx", "deps": ["framer-motion"] }
    ],
    "faq": [
      { "id": "faq-1", "name": "Smooth Accordion FAQ", "file": "sections/FAQ1.tsx", "deps": ["framer-motion", "lucide-react"] }
    ],
    "footer": [
      { "id": "footer-1", "name": "Multi-Column Footer", "file": "sections/Footer1.tsx", "deps": [] }
    ],
    "navigation": [
      { "id": "nav-1", "name": "Sticky Header Navigation", "file": "sections/Navigation1.tsx", "deps": ["lucide-react"] }
    ],
    "team": [
      { "id": "team-1", "name": "Avatar Grid Team", "file": "sections/Team1.tsx", "deps": ["framer-motion"] }
    ],
    "utility": [
      { "id": "logo-cloud-1", "name": "Logo Trust Strip", "file": "sections/LogoCloud1.tsx", "deps": ["framer-motion"] },
      { "id": "contact-form-1", "name": "Simple Contact Form", "file": "sections/ContactForm1.tsx", "deps": ["framer-motion"] }
    ]
  },
  "widgets": {
    "kpi-card": { "name": "KPI Metric Card", "file": "widgets/KPICard.tsx", "deps": ["lucide-react"] },
    "bar-chart": { "name": "Bar Chart", "file": "widgets/BarChart.tsx", "deps": ["recharts"] },
    "line-chart": { "name": "Line Chart", "file": "widgets/LineChart.tsx", "deps": ["recharts"] },
    "data-table": { "name": "Data Table", "file": "widgets/DataTable.tsx", "deps": [] },
    "progress-bar": { "name": "Progress Bar", "file": "widgets/ProgressBar.tsx", "deps": [] },
    "badge": { "name": "Status Badge", "file": "widgets/Badge.tsx", "deps": [] }
  }
}$reg$)
ON CONFLICT DO NOTHING;

-- 4. Section components (each as a resource row)

-- Hero1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Hero1.tsx', $comp$'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'

interface Hero1Props {
  headline?: string
  subheadline?: string
  ctaText?: string
  ctaHref?: string
  secondaryText?: string
  secondaryHref?: string
}

export default function Hero1({
  headline = 'Build something extraordinary',
  subheadline = 'A modern platform that helps you ship faster, collaborate better, and scale with confidence.',
  ctaText = 'Get started',
  ctaHref = '#',
  secondaryText = 'Learn more',
  secondaryHref = '#features',
}: Hero1Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  return (
    <section ref={ref} className="relative min-h-[80vh] flex items-center justify-center overflow-hidden px-4 py-20 md:py-32">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 50% 0%, var(--color-primary) 0%, transparent 70%)' }} />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>
          {headline}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.15 }} className="mx-auto mt-6 max-w-xl text-lg md:text-xl" style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-body, inherit)' }}>
          {subheadline}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.3 }} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href={ctaHref} className="inline-flex items-center rounded-lg px-6 py-3 text-base font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>{ctaText}</Link>
          <Link href={secondaryHref} className="inline-flex items-center rounded-lg border px-6 py-3 text-base font-medium transition-colors hover:opacity-80" style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>{secondaryText}</Link>
        </motion.div>
      </div>
    </section>
  )
}$comp$)
ON CONFLICT DO NOTHING;

-- Hero2
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Hero2.tsx', $comp$'use client'

import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'

interface Hero2Props {
  headline?: string
  subheadline?: string
  ctaText?: string
  ctaHref?: string
  emailPlaceholder?: string
  imageSrc?: string
  imageAlt?: string
}

export default function Hero2({
  headline = 'The modern way to grow your business',
  subheadline = 'Join thousands of teams using our platform to streamline their workflow and drive results.',
  ctaText = 'Start free trial',
  ctaHref = '#',
  emailPlaceholder = 'Enter your email',
  imageSrc,
  imageAlt = 'Product screenshot',
}: Hero2Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const [email, setEmail] = useState('')
  return (
    <section ref={ref} className="w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{headline}</motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.12 }} className="mx-auto mt-5 max-w-2xl text-lg" style={{ color: 'var(--color-muted-foreground)' }}>{subheadline}</motion.p>
        <motion.form initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.24 }} onSubmit={(e) => e.preventDefault()} className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={emailPlaceholder} className="flex-1 rounded-lg border px-4 py-3 text-sm outline-none" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-input)', color: 'var(--color-foreground)' }} />
          <Link href={ctaHref} className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>{ctaText}</Link>
        </motion.form>
      </div>
      {imageSrc && (
        <motion.div initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.35 }} className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-xl border shadow-2xl" style={{ borderColor: 'var(--color-border)' }}>
          <img src={imageSrc} alt={imageAlt} className="w-full" />
        </motion.div>
      )}
    </section>
  )
}$comp$)
ON CONFLICT DO NOTHING;

-- Features1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Features1.tsx', $comp$'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Zap, Shield, BarChart3, Globe, type LucideIcon } from 'lucide-react'

interface Feature { icon: LucideIcon; title: string; description: string }

const defaultFeatures: Feature[] = [
  { icon: Zap, title: 'Lightning fast', description: 'Built for speed with optimized performance at every layer.' },
  { icon: Shield, title: 'Secure by default', description: 'Enterprise-grade security with encryption at rest and in transit.' },
  { icon: BarChart3, title: 'Analytics built in', description: 'Track every metric that matters with real-time dashboards.' },
  { icon: Globe, title: 'Global scale', description: 'Deploy to the edge and serve users from the nearest data center.' },
]

export default function Features1({ title = 'Everything you need', subtitle = 'A complete toolkit to build, launch, and grow.', features = defaultFeatures }: { title?: string; subtitle?: string; features?: Feature[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  return (
    <section ref={ref} className="w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <motion.h2 initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-3xl font-bold md:text-4xl" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{title}</motion.h2>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }} className="mx-auto mt-4 max-w-2xl text-lg" style={{ color: 'var(--color-muted-foreground)' }}>{subtitle}</motion.p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 + i * 0.08 }} className="rounded-xl border p-6 transition-shadow hover:shadow-lg" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card-background, transparent)' }}>
                <div className="inline-flex rounded-lg p-2.5" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}><Icon className="h-6 w-6" style={{ color: 'var(--color-primary)' }} /></div>
                <h3 className="mt-4 text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>{f.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}$comp$)
ON CONFLICT DO NOTHING;

-- Features2
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Features2.tsx', $comp$'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface FeatureRow { tag: string; title: string; description: string; href?: string; imageSrc?: string }

const defaultFeatures: FeatureRow[] = [
  { tag: 'Workflow', title: 'Automate the boring parts', description: 'Set up triggers, approvals, and notifications that run while you sleep.', href: '#' },
  { tag: 'Collaboration', title: 'Work together in real time', description: 'Shared workspaces, live cursors, and threaded comments keep everyone in sync.', href: '#' },
  { tag: 'Insights', title: 'Decisions backed by data', description: 'Unified dashboards pull from every source so you never fly blind.', href: '#' },
]

export default function Features2({ sectionTitle = 'How it works', features = defaultFeatures }: { sectionTitle?: string; features?: FeatureRow[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })
  return (
    <section ref={ref} className="w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.h2 initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-3xl font-bold md:text-4xl" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{sectionTitle}</motion.h2>
        <div className="mt-12 flex flex-col gap-16">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.12 }} className="grid grid-cols-1 items-center gap-8 md:grid-cols-2" style={{ direction: i % 2 ? 'rtl' : 'ltr' }}>
              <div style={{ direction: 'ltr' }}>
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-primary)' }}>{f.tag}</span>
                <h3 className="mt-2 text-2xl font-bold md:text-3xl" style={{ color: 'var(--color-foreground)' }}>{f.title}</h3>
                <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>{f.description}</p>
                {f.href && <Link href={f.href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>Learn more <ArrowRight className="h-4 w-4" /></Link>}
              </div>
              <div className="aspect-video rounded-xl border" style={{ direction: 'ltr', borderColor: 'var(--color-border)', backgroundColor: 'color-mix(in srgb, var(--color-muted-foreground) 6%, transparent)' }}>
                {f.imageSrc && <img src={f.imageSrc} alt={f.title} className="h-full w-full rounded-xl object-cover" />}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}$comp$)
ON CONFLICT DO NOTHING;

-- Pricing1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Pricing1.tsx', $comp$'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check } from 'lucide-react'
import Link from 'next/link'

interface PricingTier { name: string; price: string; period?: string; description: string; features: string[]; ctaText: string; ctaHref: string; highlighted?: boolean }

const defaultTiers: PricingTier[] = [
  { name: 'Starter', price: '$0', period: '/mo', description: 'Perfect for trying things out.', features: ['Up to 3 projects', '1 GB storage', 'Community support'], ctaText: 'Start free', ctaHref: '#' },
  { name: 'Pro', price: '$29', period: '/mo', description: 'For growing teams.', features: ['Unlimited projects', '100 GB storage', 'Priority support', 'Analytics dashboard', 'Custom domains'], ctaText: 'Get started', ctaHref: '#', highlighted: true },
  { name: 'Enterprise', price: 'Custom', description: 'For organizations at scale.', features: ['Everything in Pro', 'SSO & SAML', 'Dedicated support', 'SLA guarantee', 'Custom integrations'], ctaText: 'Contact sales', ctaHref: '#' },
]

export default function Pricing1({ title = 'Simple, transparent pricing', subtitle = 'No hidden fees. Upgrade or downgrade at any time.', tiers = defaultTiers }: { title?: string; subtitle?: string; tiers?: PricingTier[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })
  return (
    <section ref={ref} className="w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl text-center">
        <motion.h2 initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-3xl font-bold md:text-4xl" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{title}</motion.h2>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.08 }} className="mx-auto mt-4 max-w-xl text-lg" style={{ color: 'var(--color-muted-foreground)' }}>{subtitle}</motion.p>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {tiers.map((tier, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 + i * 0.1 }} className="relative flex flex-col rounded-2xl border p-8 text-left" style={{ borderColor: tier.highlighted ? 'var(--color-primary)' : 'var(--color-border)', backgroundColor: tier.highlighted ? 'color-mix(in srgb, var(--color-primary) 4%, transparent)' : 'transparent' }}>
              {tier.highlighted && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Most popular</span>}
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>{tier.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold" style={{ color: 'var(--color-foreground)' }}>{tier.price}</span>
                {tier.period && <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{tier.period}</span>}
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{tier.description}</p>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {tier.features.map((f, fi) => <li key={fi} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-foreground)' }}><Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} />{f}</li>)}
              </ul>
              <Link href={tier.ctaHref} className="mt-8 block rounded-lg py-2.5 text-center text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: tier.highlighted ? 'var(--color-primary)' : 'transparent', color: tier.highlighted ? 'var(--color-primary-foreground)' : 'var(--color-foreground)', border: tier.highlighted ? 'none' : '1px solid var(--color-border)' }}>{tier.ctaText}</Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}$comp$)
ON CONFLICT DO NOTHING;

-- Testimonials1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content)
VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Testimonials1.tsx', $comp$'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface Testimonial { quote: string; name: string; role: string; avatarUrl?: string }

const defaultTestimonials: Testimonial[] = [
  { quote: 'This completely transformed how we work. Deployment went from hours to minutes.', name: 'Sarah Chen', role: 'CTO, Acme Corp' },
  { quote: 'The best investment we made this year. Our team productivity doubled in the first month.', name: 'Marcus Rivera', role: 'VP Engineering, NovaTech' },
  { quote: 'Incredible support and a product that genuinely delivers on its promises.', name: 'Emily Nakamura', role: 'Founder, Bright Studio' },
]

export default function Testimonials1({ title = 'Trusted by industry leaders', testimonials = defaultTestimonials }: { title?: string; testimonials?: Testimonial[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })
  return (
    <section ref={ref} className="w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.h2 initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-center text-3xl font-bold md:text-4xl" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{title}</motion.h2>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.blockquote key={i} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 + i * 0.1 }} className="flex flex-col rounded-xl border p-6" style={{ borderColor: 'var(--color-border)' }}>
              <p className="flex-1 text-base leading-relaxed" style={{ color: 'var(--color-foreground)' }}>&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                {t.avatarUrl ? <img src={t.avatarUrl} alt={t.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary)' }}>{t.name.split(' ').map(n => n[0]).join('')}</div>}
                <div><div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{t.name}</div><div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{t.role}</div></div>
              </div>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}$comp$)
ON CONFLICT DO NOTHING;

-- Stats1-5
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Stats1.tsx', $comp$'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'

interface StatItem { value: number; suffix: string; label: string; decimals?: number }

function SpringStat({ item, active }: { item: StatItem; active: boolean }) {
  const spring = useSpring(0, { stiffness: 90, damping: 28, mass: 0.8 })
  useEffect(() => { if (active) spring.set(item.value) }, [active, item.value, spring])
  const text = useTransform(spring, (v) => (item.decimals ?? 0) ? v.toFixed(item.decimals ?? 0) : Math.round(v).toString())
  return (
    <div className="min-w-[140px] text-center">
      <div className="text-4xl font-semibold tracking-tight md:text-5xl" style={{ color: 'var(--color-foreground)' }}>
        <motion.span>{text}</motion.span><span style={{ color: 'var(--color-primary)' }}>{item.suffix}</span>
      </div>
      <p className="mt-2 text-sm md:text-base" style={{ color: 'var(--color-muted-foreground)' }}>{item.label}</p>
    </div>
  )
}

const defaultItems: StatItem[] = [
  { value: 1200, suffix: '+', label: 'Active teams' },
  { value: 48, suffix: '%', label: 'Faster delivery' },
  { value: 3.2, suffix: 'M', label: 'API calls / day', decimals: 1 },
  { value: 99.9, suffix: '%', label: 'Uptime SLA', decimals: 1 },
]

export default function Stats1({ items = defaultItems }: { items?: StatItem[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  return (
    <section ref={ref} className="w-full py-12 md:py-16">
      <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-10 px-4 md:gap-14">
        {items.map((item, i) => <SpringStat key={i} item={item} active={inView} />)}
      </div>
    </section>
  )
}$comp$) ON CONFLICT DO NOTHING;

INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Stats2.tsx', $comp$'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'

interface GlowStatItem { target: number; suffix: string; label: string }

function GlowStat({ stat, active }: { stat: GlowStatItem; active: boolean }) {
  const spring = useSpring(0, { stiffness: 70, damping: 22 })
  useEffect(() => { if (active) spring.set(stat.target) }, [active, stat.target, spring])
  const display = useTransform(spring, (v) => Math.round(v).toString())
  return (
    <div className="text-center">
      <motion.div className="text-4xl font-bold tabular-nums md:text-5xl" style={{ color: 'var(--color-background)', textShadow: '0 0 28px color-mix(in srgb, var(--color-primary) 33%, transparent), 0 0 2px var(--color-primary)' }}>
        <motion.span>{display}</motion.span><span style={{ color: 'var(--color-primary)' }}>{stat.suffix}</span>
      </motion.div>
      <div className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{stat.label}</div>
    </div>
  )
}

const defaultStats: GlowStatItem[] = [
  { target: 500, suffix: '+', label: 'Enterprise customers' },
  { target: 40, suffix: '%', label: 'Avg. cost reduction' },
  { target: 24, suffix: '/7', label: 'Support coverage' },
]

export default function Stats2({ stats = defaultStats }: { stats?: GlowStatItem[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })
  return (
    <section ref={ref} className="w-full py-10 md:py-12" style={{ backgroundColor: 'var(--color-card-background, #0a0a0a)' }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-12 px-4 md:gap-20">
        {stats.map((s, i) => <GlowStat key={i} stat={s} active={inView} />)}
      </div>
    </section>
  )
}$comp$) ON CONFLICT DO NOTHING;

INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Stats3.tsx', $comp$'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'
import { Users, TrendingUp, Shield, Zap, type LucideIcon } from 'lucide-react'

interface GridCard { icon: LucideIcon; value: number; suffix: string; title: string; body: string; decimals?: number; tinted?: boolean }

function GridStatCard({ card, active }: { card: GridCard; active: boolean }) {
  const Icon = card.icon
  const spring = useSpring(0, { stiffness: 80, damping: 26 })
  useEffect(() => { if (active) spring.set(card.value) }, [active, card.value, spring])
  const num = useTransform(spring, (v) => (card.decimals ?? 0) ? v.toFixed(card.decimals ?? 0) : Math.round(v).toString())
  return (
    <motion.div whileHover={{ y: -4 }} className="rounded-xl border p-6 transition-shadow duration-300 hover:shadow-lg" style={{ borderColor: 'var(--color-border)', backgroundColor: card.tinted ? 'color-mix(in srgb, var(--color-muted-foreground) 8%, transparent)' : 'transparent' }}>
      <Icon className="h-8 w-8" strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
      <div className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl" style={{ color: 'var(--color-foreground)' }}><motion.span>{num}</motion.span><span style={{ color: 'var(--color-primary)' }}>{card.suffix}</span></div>
      <div className="mt-1 text-base font-medium" style={{ color: 'var(--color-foreground)' }}>{card.title}</div>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>{card.body}</p>
    </motion.div>
  )
}

const defaultCards: GridCard[] = [
  { icon: Users, value: 8500, suffix: '+', title: 'Teams onboarded', body: 'Across 62 countries.' },
  { icon: TrendingUp, value: 32, suffix: '%', title: 'Revenue lift', body: 'Median YoY for cohort A.', tinted: true },
  { icon: Shield, value: 99.99, suffix: '%', title: 'Platform uptime', body: 'Measured rolling 90 days.', decimals: 2 },
  { icon: Zap, value: 4, suffix: 'x', title: 'Faster releases', body: 'Vs. prior toolchain.', tinted: true },
]

export default function Stats3({ cards = defaultCards }: { cards?: GridCard[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.25 })
  return (
    <section ref={ref} className="w-full py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => <GridStatCard key={i} card={c} active={inView} />)}
      </div>
    </section>
  )
}$comp$) ON CONFLICT DO NOTHING;

INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Stats4.tsx', $comp$'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useScroll, useSpring, useTransform } from 'framer-motion'

interface ParallaxRow { ghost: string; value: string; suffix: string; label: string }

function ParallaxStatRow({ row, index, active, scrollYProgress }: { row: ParallaxRow; index: number; active: boolean; scrollYProgress: any }) {
  const spring = useSpring(0, { stiffness: 60, damping: 24 })
  useEffect(() => { const n = parseFloat(row.value.replace(/[^0-9.]/g, '')) || 0; if (active) spring.set(n) }, [active, row.value, spring])
  const display = useTransform(spring, (v) => row.value.startsWith('$') ? '$' + Math.round(v) : Math.round(v).toString())
  const ghostX = useTransform(scrollYProgress, [0, 1], [index * -28, index * 28])
  return (
    <div className="relative min-h-[120px] md:min-h-[140px]">
      <motion.div className="select-none text-[7rem] font-black leading-none md:text-[9rem]" style={{ color: 'var(--color-foreground)', opacity: 0.12, x: ghostX }} aria-hidden>{row.ghost}</motion.div>
      <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4">
        <div className="flex flex-wrap items-baseline gap-1 text-4xl font-bold md:text-5xl" style={{ color: 'var(--color-foreground)' }}><motion.span>{display}</motion.span><span style={{ color: 'var(--color-primary)' }}>{row.suffix}</span></div>
        <p className="mt-2 max-w-md text-base md:text-lg" style={{ color: 'var(--color-muted-foreground)' }}>{row.label}</p>
      </div>
    </div>
  )
}

const defaultRows: ParallaxRow[] = [
  { ghost: '12', value: '12', suffix: ' yrs', label: 'Shipping product' },
  { ghost: '98', value: '98', suffix: '%', label: 'Customer satisfaction' },
  { ghost: '50', value: '$50', suffix: 'M+', label: 'Revenue influenced' },
]

export default function Stats4({ rows = defaultRows }: { rows?: ParallaxRow[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  return (
    <section ref={ref} className="relative w-full overflow-hidden py-20 md:py-28" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-muted-foreground) 10%, transparent) 0%, var(--color-background) 50%, color-mix(in srgb, var(--color-primary) 5%, transparent) 100%)' }}>
      <div className="relative mx-auto flex max-w-4xl flex-col gap-16 px-4">
        {rows.map((row, i) => <ParallaxStatRow key={i} row={row} index={i} active={inView} scrollYProgress={scrollYProgress} />)}
      </div>
    </section>
  )
}$comp$) ON CONFLICT DO NOTHING;

INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Stats5.tsx', $comp$'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useSpring, useTransform } from 'framer-motion'

interface ProofPart { num: number; suffix: string; text: string; prefix?: string }

function InlineStat({ part, active }: { part: ProofPart; active: boolean }) {
  const spring = useSpring(0, { stiffness: 100, damping: 32 })
  useEffect(() => { if (active) spring.set(part.num) }, [active, part.num, spring])
  const display = useTransform(spring, (v) => Math.round(v).toString())
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5 px-4 text-sm md:text-base">
      <span className="font-semibold tabular-nums" style={{ color: 'var(--color-foreground)' }}>{part.prefix}<motion.span>{display}</motion.span><span style={{ color: 'var(--color-primary)' }}>{part.suffix}</span></span>
      <span>{part.text}</span>
    </div>
  )
}

const defaultParts: ProofPart[] = [
  { num: 500, suffix: '+', text: 'clients' },
  { num: 12, suffix: '', text: 'years' },
  { num: 98, suffix: '%', text: 'satisfaction' },
  { num: 50, suffix: 'M+', text: 'revenue', prefix: '$' },
]

export default function Stats5({ parts = defaultParts }: { parts?: ProofPart[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  return (
    <section ref={ref} className="w-full py-6 md:py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-stretch justify-center gap-4 px-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-0" style={{ color: 'var(--color-muted-foreground)' }}>
        {parts.map((p, i) => (
          <div key={i} className="flex items-center gap-4 sm:gap-0">
            {i > 0 && <span className="hidden h-5 w-px shrink-0 sm:block" style={{ backgroundColor: 'var(--color-border)' }} aria-hidden />}
            <InlineStat part={p} active={inView} />
          </div>
        ))}
      </div>
    </section>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- CTA1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/CTA1.tsx', $comp$'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'

export default function CTA1({ headline = 'Ready to get started?', subheadline = 'Join thousands of teams already shipping faster.', ctaText = 'Start for free', ctaHref = '#' }: { headline?: string; subheadline?: string; ctaText?: string; ctaHref?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  return (
    <section ref={ref} className="relative w-full overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--color-card-background, #0a0a0a)' }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-50" style={{ background: 'linear-gradient(90deg, transparent, var(--color-border), transparent)' }} />
      <div className="pointer-events-none absolute -left-32 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)' }} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold md:text-4xl" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{headline}</h2>
        <p className="mx-auto mt-4 max-w-lg text-lg" style={{ color: 'var(--color-muted-foreground)' }}>{subheadline}</p>
        <Link href={ctaHref} className="mt-8 inline-flex items-center rounded-lg px-8 py-3 text-base font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>{ctaText}</Link>
      </motion.div>
    </section>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- FAQ1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/FAQ1.tsx', $comp$'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface FAQItem { question: string; answer: string }

const defaultItems: FAQItem[] = [
  { question: 'How does the free trial work?', answer: 'You get full access for 14 days. No credit card required. At the end of your trial, choose a plan that fits.' },
  { question: 'Can I cancel anytime?', answer: 'Absolutely. Cancel from your dashboard with one click. No fees, no questions.' },
  { question: 'Do you offer team pricing?', answer: 'Yes — our Pro plan includes up to 10 seats. Need more? Contact us for a custom quote.' },
  { question: 'What kind of support do you provide?', answer: 'All plans include email support. Pro and Enterprise get priority support with guaranteed response times.' },
]

export default function FAQ1({ title = 'Frequently asked questions', items = defaultItems }: { title?: string; items?: FAQItem[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  return (
    <section ref={ref} className="w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <motion.h2 initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-center text-3xl font-bold md:text-4xl" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{title}</motion.h2>
        <div className="mt-10 flex flex-col divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {items.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.06 }}>
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="flex w-full items-center justify-between py-5 text-left">
                <span className="text-base font-medium" style={{ color: 'var(--color-foreground)' }}>{item.question}</span>
                <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200" style={{ color: 'var(--color-muted-foreground)', transform: openIndex === i ? 'rotate(180deg)' : 'rotate(0deg)' }} />
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden"><p className="pb-5 text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>{item.answer}</p></motion.div>}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- Footer1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Footer1.tsx', $comp$import Link from 'next/link'

interface FooterColumn { title: string; links: { label: string; href: string }[] }

const defaultColumns: FooterColumn[] = [
  { title: 'Product', links: [{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '#pricing' }, { label: 'Changelog', href: '#' }] },
  { title: 'Company', links: [{ label: 'About', href: '#' }, { label: 'Blog', href: '#' }, { label: 'Careers', href: '#' }] },
  { title: 'Support', links: [{ label: 'Help Center', href: '#' }, { label: 'Contact', href: '#' }, { label: 'Status', href: '#' }] },
]

export default function Footer1({ brand = 'Acme', columns = defaultColumns, copyright }: { brand?: string; columns?: FooterColumn[]; copyright?: string }) {
  const year = new Date().getFullYear()
  return (
    <footer className="w-full border-t px-4 py-12 md:py-16" style={{ borderColor: 'var(--color-border)' }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-10 md:flex-row md:justify-between">
        <div><span className="text-lg font-bold" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{brand}</span></div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:gap-12">
          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{col.title}</h4>
              <ul className="mt-3 flex flex-col gap-2">{col.links.map((link, li) => <li key={li}><Link href={link.href} className="text-sm transition-colors hover:opacity-80" style={{ color: 'var(--color-muted-foreground)' }}>{link.label}</Link></li>)}</ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{copyright ?? `\u00A9 ${year} ${brand}. All rights reserved.`}</p>
      </div>
    </footer>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- Navigation1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Navigation1.tsx', $comp$'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

interface NavLink { label: string; href: string }

const defaultLinks: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'FAQ', href: '#faq' },
]

export default function Navigation1({ brand = 'Acme', links = defaultLinks, ctaText = 'Get started', ctaHref = '#' }: { brand?: string; links?: NavLink[]; ctaText?: string; ctaHref?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md" style={{ borderColor: 'var(--color-border)', backgroundColor: 'color-mix(in srgb, var(--color-background) 85%, transparent)' }}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{brand}</Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link, i) => <Link key={i} href={link.href} className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: 'var(--color-muted-foreground)' }}>{link.label}</Link>)}
          <Link href={ctaHref} className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>{ctaText}</Link>
        </div>
        <button onClick={() => setOpen(!open)} className="md:hidden" style={{ color: 'var(--color-foreground)' }}>{open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
      </nav>
      {open && (
        <div className="flex flex-col gap-3 border-t px-4 pb-4 pt-3 md:hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
          {links.map((link, i) => <Link key={i} href={link.href} onClick={() => setOpen(false)} className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{link.label}</Link>)}
          <Link href={ctaHref} onClick={() => setOpen(false)} className="mt-2 rounded-lg py-2.5 text-center text-sm font-semibold" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>{ctaText}</Link>
        </div>
      )}
    </header>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- Team1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/Team1.tsx', $comp$'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface TeamMember { name: string; role: string; imageUrl?: string }

const defaultMembers: TeamMember[] = [
  { name: 'Alex Morgan', role: 'CEO & Co-founder' },
  { name: 'Jordan Lee', role: 'CTO' },
  { name: 'Sam Patel', role: 'Head of Design' },
  { name: 'Chris Nakamura', role: 'Head of Engineering' },
]

export default function Team1({ title = 'Meet the team', subtitle = 'The people behind the product.', members = defaultMembers }: { title?: string; subtitle?: string; members?: TeamMember[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })
  return (
    <section ref={ref} className="w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl text-center">
        <motion.h2 initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-3xl font-bold md:text-4xl" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{title}</motion.h2>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.08 }} className="mx-auto mt-4 max-w-xl text-lg" style={{ color: 'var(--color-muted-foreground)' }}>{subtitle}</motion.p>
        <div className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {members.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 + i * 0.08 }} className="flex flex-col items-center">
              {m.imageUrl ? <img src={m.imageUrl} alt={m.name} className="h-24 w-24 rounded-full object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}>{m.name.split(' ').map(n => n[0]).join('')}</div>}
              <h3 className="mt-4 text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>{m.name}</h3>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{m.role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- LogoCloud1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/LogoCloud1.tsx', $comp$'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface Logo { name: string; imageUrl?: string }

const defaultLogos: Logo[] = [{ name: 'Vercel' }, { name: 'Stripe' }, { name: 'Notion' }, { name: 'Linear' }, { name: 'Figma' }]

export default function LogoCloud1({ label = 'Trusted by leading teams', logos = defaultLogos }: { label?: string; logos?: Logo[] }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  return (
    <section ref={ref} className="w-full px-4 py-10 md:py-14">
      <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} className="text-center text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-muted-foreground)' }}>{label}</motion.p>
      <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {logos.map((logo, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={inView ? { opacity: 0.6 } : {}} transition={{ delay: i * 0.06 }} whileHover={{ opacity: 1 }} className="text-base font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
            {logo.imageUrl ? <img src={logo.imageUrl} alt={logo.name} className="h-8 object-contain" /> : logo.name}
          </motion.div>
        ))}
      </div>
    </section>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- ContactForm1
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'sections/ContactForm1.tsx', $comp$'use client'

import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

export default function ContactForm1({ title = 'Get in touch', subtitle = "We'd love to hear from you.", onSubmit }: { title?: string; subtitle?: string; onSubmit?: (data: { name: string; email: string; message: string }) => void }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const s = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-input)', color: 'var(--color-foreground)' }
  return (
    <section ref={ref} className="w-full px-4 py-16 md:py-24">
      <div className="mx-auto max-w-xl">
        <motion.h2 initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} className="text-center text-3xl font-bold md:text-4xl" style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-heading, inherit)' }}>{title}</motion.h2>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.08 }} className="mx-auto mt-4 text-center text-lg" style={{ color: 'var(--color-muted-foreground)' }}>{subtitle}</motion.p>
        <motion.form initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.16 }} onSubmit={(e) => { e.preventDefault(); onSubmit?.(form) }} className="mt-10 flex flex-col gap-4">
          <input type="text" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border px-4 py-3 text-sm outline-none" style={s} />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border px-4 py-3 text-sm outline-none" style={s} />
          <textarea placeholder="Your message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="resize-none rounded-lg border px-4 py-3 text-sm outline-none" style={s} />
          <button type="submit" className="rounded-lg py-3 text-sm font-semibold transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Send message</button>
        </motion.form>
      </div>
    </section>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- 5. Widget components

-- KPICard
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'widgets/KPICard.tsx', $comp$'use client'

import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react'

interface KPICardProps { label: string; value: string | number; change?: number; icon?: LucideIcon }

export default function KPICard({ label, value, change, icon: Icon }: KPICardProps) {
  const isPositive = (change ?? 0) >= 0
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card-background, transparent)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)' }}>{label}</span>
        {Icon && <Icon className="h-4 w-4" style={{ color: 'var(--color-muted-foreground)' }} />}
      </div>
      <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{value}</div>
      {change !== undefined && (
        <div className="mt-1 flex items-center gap-1 text-xs font-medium" style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? '+' : ''}{change}%
        </div>
      )}
    </div>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- BarChart
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'widgets/BarChart.tsx', $comp$'use client'

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface BarChartProps { data: Array<Record<string, string | number>>; xKey?: string; yKey?: string; title?: string }

export default function BarChart({ data, xKey = 'name', yKey = 'value', title }: BarChartProps) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card-background, transparent)' }}>
      {title && <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{title}</h3>}
      <ResponsiveContainer width="100%" height={260}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey={xKey} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--color-card-background, #fff)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }} />
          <Bar dataKey={yKey} fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- LineChart
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'widgets/LineChart.tsx', $comp$'use client'

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface LineChartProps { data: Array<Record<string, string | number>>; xKey?: string; yKey?: string; title?: string }

export default function LineChart({ data, xKey = 'name', yKey = 'value', title }: LineChartProps) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card-background, transparent)' }}>
      {title && <h3 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{title}</h3>}
      <ResponsiveContainer width="100%" height={260}>
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey={xKey} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
          <Tooltip contentStyle={{ backgroundColor: 'var(--color-card-background, #fff)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }} />
          <Line type="monotone" dataKey={yKey} stroke="var(--color-primary)" strokeWidth={2} dot={{ fill: 'var(--color-primary)', r: 3 }} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- DataTable
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'widgets/DataTable.tsx', $comp$interface Column { key: string; label: string; align?: 'left' | 'center' | 'right' }
interface DataTableProps { columns: Column[]; rows: Array<Record<string, string | number>>; title?: string }

export default function DataTable({ columns, rows, title }: DataTableProps) {
  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card-background, transparent)' }}>
      {title && <div className="border-b px-5 py-3" style={{ borderColor: 'var(--color-border)' }}><h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{title}</h3></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>{columns.map((col) => <th key={col.key} className="px-4 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-muted-foreground)', textAlign: col.align ?? 'left' }}>{col.label}</th>)}</tr></thead>
          <tbody>{rows.map((row, ri) => <tr key={ri} className="border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>{columns.map((col) => <td key={col.key} className="px-4 py-3" style={{ color: 'var(--color-foreground)', textAlign: col.align ?? 'left' }}>{row[col.key]}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- ProgressBar
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'widgets/ProgressBar.tsx', $comp$interface ProgressBarProps { label?: string; value: number; max?: number; showPercent?: boolean }

export default function ProgressBar({ label, value, max = 100, showPercent = true }: ProgressBarProps) {
  const pct = Math.min(Math.round((value / max) * 100), 100)
  return (
    <div>
      {(label || showPercent) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          {label && <span style={{ color: 'var(--color-foreground)' }}>{label}</span>}
          {showPercent && <span className="tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>{pct}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', backgroundColor: 'var(--color-primary)' }} />
      </div>
    </div>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- Badge
INSERT INTO agent_skill_resources (user_id, agent_key, skill_key, file_path, content) VALUES (NULL, 'viktor', 'spaces-component-kit', 'widgets/Badge.tsx', $comp$interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' }

const variantMap = {
  default: { bg: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', fg: 'var(--color-primary)' },
  success: { bg: 'color-mix(in srgb, var(--color-success) 12%, transparent)', fg: 'var(--color-success)' },
  warning: { bg: 'color-mix(in srgb, var(--color-warning) 12%, transparent)', fg: 'var(--color-warning)' },
  danger: { bg: 'color-mix(in srgb, var(--color-danger) 12%, transparent)', fg: 'var(--color-danger)' },
}

export default function Badge({ children, variant = 'default' }: BadgeProps) {
  const v = variantMap[variant]
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ backgroundColor: v.bg, color: v.fg }}>
      {children}
    </span>
  )
}$comp$) ON CONFLICT DO NOTHING;

-- 6. Add theme_id to project_repos
ALTER TABLE project_repos ADD COLUMN IF NOT EXISTS theme_id uuid REFERENCES branding_themes(id) ON DELETE SET NULL;
