export type StaticAdFamily = 'person' | 'receipt' | 'graphic'

export type StaticAdFormat = {
  id: string
  name: string
  family: StaticAdFamily
  description: string
  needsPerson: boolean
  needsBackgroundImage: boolean
}

export const STATIC_AD_FORMATS: readonly StaticAdFormat[] = [
  {
    id: 'hero_framing',
    name: 'Hero framing',
    family: 'person',
    description: 'Founder or expert photo with a strong headline and CTA.',
    needsPerson: true,
    needsBackgroundImage: false,
  },
  {
    id: 'identity_callout',
    name: 'Identity callout',
    family: 'person',
    description: 'Calls out exactly who the offer is for around a person.',
    needsPerson: true,
    needsBackgroundImage: false,
  },
  {
    id: 'case_study',
    name: 'Case study',
    family: 'person',
    description: 'Real result, proof, contrast, and CTA with a person.',
    needsPerson: true,
    needsBackgroundImage: false,
  },
  {
    id: 'workshop_event',
    name: 'Workshop or event',
    family: 'person',
    description: 'Event-led creative featuring the host or speaker.',
    needsPerson: true,
    needsBackgroundImage: false,
  },
  {
    id: 'tweet_receipt',
    name: 'Tweet receipt',
    family: 'receipt',
    description: 'Social-proof post treatment with a real or approved quote.',
    needsPerson: false,
    needsBackgroundImage: true,
  },
  {
    id: 'chat_receipt',
    name: 'Chat receipt',
    family: 'receipt',
    description: 'Message-style proof using verified words and identities.',
    needsPerson: false,
    needsBackgroundImage: false,
  },
  {
    id: 'press_authority',
    name: 'Press authority',
    family: 'receipt',
    description: 'Editorial authority framing with a product or person image.',
    needsPerson: false,
    needsBackgroundImage: true,
  },
  {
    id: 'fake_news',
    name: 'News-style hook',
    family: 'graphic',
    description: 'Clearly branded news-style framing, not deceptive reporting.',
    needsPerson: false,
    needsBackgroundImage: true,
  },
  {
    id: 'myth_vs_system',
    name: 'Myth vs. system',
    family: 'graphic',
    description: 'Side-by-side contrast between the old and new approach.',
    needsPerson: false,
    needsBackgroundImage: false,
  },
  {
    id: 'offer_stack',
    name: 'Offer stack',
    family: 'graphic',
    description: 'Price, inclusions, trust, guarantee, and CTA in one graphic.',
    needsPerson: false,
    needsBackgroundImage: true,
  },
] as const

export const STATIC_AD_FAMILY_LABELS: Record<StaticAdFamily, string> = {
  person: 'Person-led',
  receipt: 'Proof and authority',
  graphic: 'Graphic',
}
