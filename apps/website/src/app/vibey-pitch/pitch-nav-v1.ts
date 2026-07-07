/** Section badge (top) + breadcrumb trail (bottom) for presenter orientation — index matches `SLIDES` order. */
export const PITCH_SLIDE_COUNT = 41

export type PitchNav = { badge: string; crumbs: string[]; sectionNum: number; sectionTotal: number }

const SECTIONS = [
  'Cover',
  'Opening',
  'The Solution',
  'Your Team',
  'Autopilot',
  'How to Use Vibey',
  'Core Power Features',
  'Business Story',
  'Closing',
] as const

type SectionName = (typeof SECTIONS)[number]

const NAV_RAW: { section: SectionName; crumbs: string[] }[] = [
  { section: 'Cover', crumbs: ['Welcome'] },
  { section: 'Opening', crumbs: ['Opening', 'Founders'] },
  { section: 'Opening', crumbs: ['Opening', 'The Problem'] },
  { section: 'Opening', crumbs: ['Opening', 'Why Now'] },
  { section: 'The Solution', crumbs: ['The Solution', 'Meet Vibey'] },
  { section: 'The Solution', crumbs: ['The Solution', 'Four Pillars'] },
  { section: 'The Solution', crumbs: ['The Solution', 'Brain'] },
  { section: 'The Solution', crumbs: ['The Solution', 'Cloud Computer'] },
  { section: 'The Solution', crumbs: ['The Solution', 'Skills'] },
  { section: 'The Solution', crumbs: ['The Solution', 'Integrations Layer'] },
  { section: 'The Solution', crumbs: ['The Solution', 'How It All Comes Together'] },
  { section: 'Your Team', crumbs: ['Your Team', 'Team → Org'] },
  { section: 'Your Team', crumbs: ['Your Team', 'HR & Library'] },
  { section: 'Your Team', crumbs: ['Your Team', 'Premade Skills'] },
  { section: 'Your Team', crumbs: ['Your Team', 'Custom Skills'] },
  { section: 'Your Team', crumbs: ['Your Team', 'Preloaded & Hireable'] },
  { section: 'Autopilot', crumbs: ['Autopilot'] },
  { section: 'How to Use Vibey', crumbs: ['How to Use Vibey', 'Overview'] },
  { section: 'How to Use Vibey', crumbs: ['How to Use Vibey', 'Studio'] },
  { section: 'How to Use Vibey', crumbs: ['How to Use Vibey', 'Missions'] },
  { section: 'How to Use Vibey', crumbs: ['How to Use Vibey', 'Communications'] },
  {
    section: 'Core Power Features',
    crumbs: ['Core Power Features', 'Integrations + Capabilities'],
  },
  { section: 'Core Power Features', crumbs: ['Core Power Features', '36+ Native Integrations'] },
  { section: 'Core Power Features', crumbs: ['Core Power Features', 'Marketing & Go-to-Market'] },
  { section: 'Core Power Features', crumbs: ['Core Power Features', 'Media Production'] },
  { section: 'Core Power Features', crumbs: ['Core Power Features', 'Business Operations'] },
  {
    section: 'Core Power Features',
    crumbs: ['Core Power Features', 'Surprising use cases', 'Setup'],
  },
  {
    section: 'Core Power Features',
    crumbs: ['Core Power Features', 'Surprising use cases', 'Three previews'],
  },
  { section: 'Core Power Features', crumbs: ['Core Power Features', 'Finance Use Case'] },
  { section: 'Core Power Features', crumbs: ['Core Power Features', 'Ads / ROAS Use Case'] },
  {
    section: 'Core Power Features',
    crumbs: ['Core Power Features', 'Use Case #3', 'Neel Dhingra webinar'],
  },
  { section: 'Business Story', crumbs: ['Business Story', 'The Model'] },
  { section: 'Business Story', crumbs: ['Business Story', 'Traction'] },
  { section: 'Business Story', crumbs: ['Business Story', 'Acquisition'] },
  { section: 'Business Story', crumbs: ['Business Story', 'Retention'] },
  { section: 'Business Story', crumbs: ['Business Story', 'Competition'] },
  { section: 'Business Story', crumbs: ['Business Story', 'Team Ops'] },
  { section: 'Closing', crumbs: ['Closing', 'Funding & Runway'] },
  { section: 'Closing', crumbs: ['Closing', 'The Ask'] },
  { section: 'Closing', crumbs: ['Closing', 'Vision'] },
  { section: 'Closing', crumbs: ['Closing', 'Next Step'] },
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
    return { badge: 'Vibey Pitch', crumbs: ['Vibey'], sectionNum: 0, sectionTotal: SECTION_TOTAL }
  }
  return NAV[slideIndex]!
}
