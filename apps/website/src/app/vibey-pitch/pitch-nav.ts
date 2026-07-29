/** Slide metadata aligned to `PitchDeck.tsx` v2b order. */
export const PITCH_SLIDE_COUNT = 19

export type PitchNav = { badge: string; crumbs: string[]; sectionNum: number; sectionTotal: number }

const SECTIONS = [
  'Cover',
  'Opening',
  'The Solution',
  'Proof',
  'Founders',
  'Your Workforce',
  'Use Cases',
  'Business Story',
  'Closing',
] as const

type SectionName = (typeof SECTIONS)[number]

const NAV_RAW: { section: SectionName; crumbs: string[] }[] = [
  { section: 'Cover', crumbs: ['Welcome'] },
  { section: 'Opening', crumbs: ['Opening', 'The Problem'] },
  { section: 'Opening', crumbs: ['Opening', 'Problem — Tool Sprawl'] },
  { section: 'The Solution', crumbs: ['The Solution', 'Structured Memory'] },
  { section: 'Proof', crumbs: ['Proof', 'Traction'] },
  { section: 'Founders', crumbs: ['Founders', 'Why Us'] },
  { section: 'The Solution', crumbs: ['The Solution', 'Architecture Pyramid'] },
  { section: 'Your Workforce', crumbs: ['Your Workforce', 'Team → Org'] },
  { section: 'Your Workforce', crumbs: ['Your Workforce', 'Day 1 Onboarding'] },
  { section: 'Your Workforce', crumbs: ['Your Workforce', 'Spaces'] }, // 10
  { section: 'Use Cases', crumbs: ['Use Cases', 'Adley'] }, // 11
  { section: 'Use Cases', crumbs: ['Use Cases', 'Brian'] }, // 12
  { section: 'Use Cases', crumbs: ['Use Cases', 'ROAS'] }, // 13
  { section: 'Use Cases', crumbs: ['Use Cases', 'Neel Dhingra'] }, // 14
  { section: 'Business Story', crumbs: ['Business Story', 'Competition'] }, // 15
  { section: 'Business Story', crumbs: ['Business Story', 'The Model'] }, // 16
  { section: 'Business Story', crumbs: ['Business Story', 'Scale'] }, // 17
  { section: 'Business Story', crumbs: ['Business Story', 'Team'] }, // 18
  { section: 'Closing', crumbs: ['Closing', 'Next Step'] }, // 19
]

const SECTION_TOTAL = SECTIONS.length

const NAV: PitchNav[] = NAV_RAW.map((r) => {
  const idx = SECTIONS.indexOf(r.section)
  return {
    badge: r.section,
    crumbs: r.crumbs,
    sectionNum: idx + 1,
    sectionTotal: SECTION_TOTAL,
  }
})

export function getPitchNav(slideIndex: number): PitchNav {
  if (slideIndex < 0 || slideIndex >= NAV.length) {
    return { badge: 'ROAS Pitch', crumbs: ['ROAS'], sectionNum: 0, sectionTotal: SECTION_TOTAL }
  }
  return NAV[slideIndex]!
}
