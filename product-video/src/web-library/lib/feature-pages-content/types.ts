import type { FeatureMockupKind } from '@/components/feature-pages/FeatureMockups'
import type { ShowcaseBlock } from '@/components/feature-pages/FeatureShowcase'
import type { FeatureSlug } from './slugs'

export type FeaturePageDefinition = {
  slug: FeatureSlug
  metaTitle: string
  metaDescription: string
  mockupKind: FeatureMockupKind
  heroBadges?: string[]
  hero: {
    kicker: string
    title: string
    subtitle: string
    primaryCta: { href: string; label: string }
    secondaryCta?: { href: string; label: string }
  }
  comparison?: {
    title: string
    subtitle?: string
    columns: string[]
    rows: { label: string; cells: string[] }[]
  }
  showcase: {
    title: string
    subtitle?: string
    blocks: ShowcaseBlock[]
    ctaHref?: string
    ctaLabel?: string
  }
  valuePropGrid?: {
    title: string
    subtitle?: string
    items: { title: string; description: string }[]
  }
  steps?: {
    title: string
    items: { title: string; description: string; mockupKind?: FeatureMockupKind }[]
  }
  proof?: { title: string; quotes: { quote: string; name: string; role: string }[] }
  faq: { title: string; items: { q: string; a: string }[] }
  standaloneVideo?: { title: string; subtitle?: string; videoSrc: string }
  finalCta: { title: string; subtitle: string; ctaHref: string; ctaLabel: string }
}
