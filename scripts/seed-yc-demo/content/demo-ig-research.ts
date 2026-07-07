/**
 * Demo IG Research views — tracked competitor / inspiration accounts per client space.
 */
export interface DemoIgResearchSpaceDef {
  spaceSlug: string
  viewName: string
  handles: string[]
}

export const DEMO_IG_RESEARCH_SPACES: DemoIgResearchSpaceDef[] = [
  {
    spaceSlug: 'saltline-workspace',
    viewName: 'IG Research',
    handles: [
      'diasporaco',
      'burlapandbarrel',
      'fishwife',
      'alisoneroman',
      'hedleyandbennett',
      'bonappetit',
    ],
  },
  {
    spaceSlug: 'almanac-workspace',
    viewName: 'IG Research',
    handles: ['theparisreview', 'masterclass', 'jessicaknoll', 'slowfactory', 'skillshare'],
  },
  {
    spaceSlug: 'plinthworks-launch',
    viewName: 'IG Research',
    handles: ['incident.io', 'linear', 'vercel', 'railway', 'pagerduty', 'datadoghq'],
  },
  {
    spaceSlug: 'cloverkin-workspace',
    viewName: 'IG Research',
    handles: ['onemedical', 'parsleyhealth', 'ro.co'],
  },
]

export const IG_RESEARCH_VIEW_ID = 'ig-research'
