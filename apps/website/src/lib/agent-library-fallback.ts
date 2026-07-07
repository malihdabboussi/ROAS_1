import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

/**
 * Mirrors `agent_employee_templates` seed (hireable roles only) when Supabase is unavailable at runtime/build.
 * Stays in sync with `supabase/migrations/20260312143000_agent_employee_templates.sql` for marketing previews.
 * Portraits generated via Gemini 3.1 Flash → Supabase Storage (10-year signed URLs).
 */
export const MARKETING_AGENT_LIBRARY_FALLBACK: PublicAgentLibraryRow[] = [
  {
    role_key: 'copywriter',
    default_name: 'Ivy',
    role: 'Senior Conversion Copywriter',
    level: 'employee',
    image_url: 'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-copywriter-1774956028978.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLWNvcHl3cml0ZXItMTc3NDk1NjAyODk3OC5qcGciLCJpYXQiOjE3NzQ5NTYwMzEsImV4cCI6MjA5MDMxNjAzMX0.2ujwOAOtpNzWpIvgcw3Dzrkf085rDXVTvff2S68VY8Y',
    skills: ['direct-response-copy', 'email-sequence-copy', 'social-intel', 'content-strategy', 'experimentation-system'],
    tagline: 'The Persuader',
    skill_details: [
      { skill_key: 'content-strategy', name: 'Content Strategy', description: 'Plan messaging pillars, editorial calendars, and content direction aligned with business goals and audience needs.' },
      { skill_key: 'direct-response-copy', name: 'Direct Response Copy', description: 'Write conversion-focused copy for landing pages, emails, ads, and sales materials using direct response principles.' },
      { skill_key: 'email-sequence-copy', name: 'Email Sequence Copy', description: 'Build persuasive email nurture and sales sequences with strategic flow, clear CTAs, and engagement hooks.' },
      { skill_key: 'experimentation-system', name: 'Experimentation System', description: 'Design and run structured experiments: A/B tests, creative tests, messaging tests: and scale only proven winners.' },
      { skill_key: 'social-intel', name: 'Social Media Intelligence', description: 'Extract high-performing patterns, copy angles, and creative insights from social media data and competitor content.' },
    ],
  },
  {
    role_key: 'designer',
    default_name: 'Lux',
    role: 'Creative Director & Visual Designer',
    level: 'employee',
    image_url: 'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-designer-1774956061525.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLWRlc2lnbmVyLTE3NzQ5NTYwNjE1MjUuanBnIiwiaWF0IjoxNzc0OTU2MDYyLCJleHAiOjIwOTAzMTYwNjJ9.QPGIfIzjTqzrntNk-Y4fvJbhvyeaANdd0finz75KE_w',
    skills: ['visual-design-systems', 'conversion-design', 'brand-consistency', 'social-intel', 'experimentation-system'],
    tagline: 'The Visual Mind',
    skill_details: [
      { skill_key: 'brand-consistency', name: 'Brand Consistency', description: 'Review content and assets for brand alignment, maintaining consistent voice, visual language, and messaging across all touchpoints.' },
      { skill_key: 'conversion-design', name: 'Conversion Design', description: 'Design high-performing layouts and visual assets optimized for click-through, engagement, and conversion.' },
      { skill_key: 'experimentation-system', name: 'Experimentation System', description: 'Design and run structured experiments: A/B tests, creative tests: and iterate from measured outcomes.' },
      { skill_key: 'social-intel', name: 'Social Media Intelligence', description: 'Extract high-performing visual patterns and creative insights from social media to inform design direction.' },
      { skill_key: 'visual-design-systems', name: 'Visual Design Systems', description: 'Create cohesive visual direction, hierarchy systems, and brand-consistent design assets across all campaign touchpoints.' },
    ],
  },
  {
    role_key: 'analyst',
    default_name: 'Niko',
    role: 'Growth & Performance Analyst',
    level: 'employee',
    image_url: 'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-analyst-1774956098277.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLWFuYWx5c3QtMTc3NDk1NjA5ODI3Ny5qcGciLCJpYXQiOjE3NzQ5NTYwOTksImV4cCI6MjA5MDMxNjA5OX0.znp5arS29L1StmOXwVDtKiJvN7w1SbIIzn4zN1mh8JA',
    skills: ['content-tracking', 'competitive-intel', 'social-intel', 'experimentation-system', 'executive-reporting'],
    tagline: 'The Truth-Teller',
    skill_details: [
      { skill_key: 'competitive-intel', name: 'Competitive Intelligence', description: 'Analyze competitors, market positioning, and industry trends to find strategic opportunities and threats.' },
      { skill_key: 'content-tracking', name: 'Content & Funnel Tracking', description: 'Track content performance, funnel conversion rates, and campaign pacing with actionable insights.' },
      { skill_key: 'executive-reporting', name: 'Executive Reporting', description: 'Transform operational data into concise, actionable reports for leadership decisions.' },
      { skill_key: 'experimentation-system', name: 'Experimentation System', description: 'Design and run structured experiments: A/B tests, creative tests, messaging tests: and scale only proven winners.' },
      { skill_key: 'social-intel', name: 'Social Media Intelligence', description: 'Extract high-performing patterns, copy angles, and creative insights from social media data and competitor content.' },
    ],
  },
  {
    role_key: 'developer',
    default_name: 'Rex',
    role: 'Senior Full-Stack Web Engineer',
    level: 'employee',
    image_url: 'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-developer-1774956124013.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLWRldmVsb3Blci0xNzc0OTU2MTI0MDEzLmpwZyIsImlhdCI6MTc3NDk1NjEyNSwiZXhwIjoyMDkwMzE2MTI1fQ.vd_WorfpvKmI_y7WiRsvjTHoiq-ayLacNs3SQtgBWXg',
    skills: ['web-development', 'frontend-architecture', 'api-integrations', 'test-automation', 'release-readiness'],
    tagline: 'The Builder',
    skill_details: [
      { skill_key: 'api-integrations', name: 'API Integrations', description: 'Build and maintain reliable integrations across external APIs and third-party systems.' },
      { skill_key: 'frontend-architecture', name: 'Frontend Architecture', description: 'Design scalable component systems, clean feature structures, and maintainable frontend architectures.' },
      { skill_key: 'release-readiness', name: 'Release Readiness', description: 'Gate releases with quality evidence, monitoring plans, and rollback procedures to ship changes safely.' },
      { skill_key: 'test-automation', name: 'Test Automation', description: 'Create and stabilize automated test suites for critical product paths and regression prevention.' },
      { skill_key: 'web-development', name: 'Web Development', description: 'Build production-quality Next.js websites with modern HTML/CSS, component architecture, and integration support.' },
    ],
  },
  {
    role_key: 'pm_marketing',
    default_name: 'Mara',
    role: 'Marketing Operations Lead',
    level: 'manager',
    image_url: 'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-pm_marketing-1774956148250.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLXBtX21hcmtldGluZy0xNzc0OTU2MTQ4MjUwLmpwZyIsImlhdCI6MTc3NDk1NjE0OSwiZXhwIjoyMDkwMzE2MTQ5fQ.NEkTGqT0muTmHvUkiC8rphOpROTml_ut8FRF4KH3FwE',
    skills: ['routing', 'delegation', 'briefing', 'marketing-strategy', 'content-tracking', 'experimentation-system', 'delivery-tracking'],
    tagline: 'The Campaign Commander',
    skill_details: [
      { skill_key: 'briefing', name: 'Mission Briefing', description: 'Write clear, execution-ready briefs with measurable acceptance criteria that workers can execute without asking questions.' },
      { skill_key: 'content-tracking', name: 'Content & Funnel Tracking', description: 'Track content performance, funnel conversion rates, and campaign pacing with actionable insights.' },
      { skill_key: 'delegation', name: 'Task Delegation', description: 'Translate user intent into executable mission briefs with clear ownership, deadlines, acceptance criteria, and quality gates.' },
      { skill_key: 'delivery-tracking', name: 'Delivery Tracking', description: 'Track project milestones, blockers, timelines, and ownership accountability across active initiatives.' },
      { skill_key: 'experimentation-system', name: 'Experimentation System', description: 'Design and run structured experiments: A/B tests, creative tests, messaging tests: and scale only proven winners.' },
      { skill_key: 'marketing-strategy', name: 'Marketing Strategy', description: 'Decide the next highest-leverage move based on current data, bottlenecks, and business goals.' },
      { skill_key: 'routing', name: 'Task Routing', description: 'Route incoming work to the right team member or process owner based on deliverable type and team capabilities.' },
    ],
  },
  {
    role_key: 'pm_product',
    default_name: 'Kai',
    role: 'Product Delivery Lead',
    level: 'manager',
    image_url: 'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-pm_product-1774956167917.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLXBtX3Byb2R1Y3QtMTc3NDk1NjE2NzkxNy5qcGciLCJpYXQiOjE3NzQ5NTYxNjksImV4cCI6MjA5MDMxNjE2OX0.IXLse7IPLkg89Vh8EF0GmzyIp8hTMffwFUtgERCmyEA',
    skills: ['routing', 'delegation', 'briefing', 'product-strategy', 'release-readiness', 'delivery-tracking', 'execution-planning'],
    tagline: 'The Ship Captain',
    skill_details: [
      { skill_key: 'briefing', name: 'Mission Briefing', description: 'Write clear, execution-ready briefs with measurable acceptance criteria that workers can execute without asking questions.' },
      { skill_key: 'delegation', name: 'Task Delegation', description: 'Translate user intent into executable mission briefs with clear ownership, deadlines, acceptance criteria, and quality gates.' },
      { skill_key: 'delivery-tracking', name: 'Delivery Tracking', description: 'Track project milestones, blockers, timelines, and ownership accountability across active initiatives.' },
      { skill_key: 'execution-planning', name: 'Execution Planning', description: 'Break product or project work into sprint-ready tasks with clear dependencies, owners, and timelines.' },
      { skill_key: 'product-strategy', name: 'Product Strategy', description: 'Decide the next highest-leverage move based on current data, bottlenecks, and business goals.' },
      { skill_key: 'release-readiness', name: 'Release Readiness', description: 'Gate releases with quality evidence, monitoring plans, and rollback procedures to ship changes safely.' },
      { skill_key: 'routing', name: 'Task Routing', description: 'Route incoming work to the right team member based on deliverable type and capabilities.' },
    ],
  },
  {
    role_key: 'pm_operations',
    default_name: 'Jett',
    role: 'Operations & Systems Lead',
    level: 'manager',
    image_url: 'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-pm_operations-1774956193569.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLXBtX29wZXJhdGlvbnMtMTc3NDk1NjE5MzU2OS5qcGciLCJpYXQiOjE3NzQ5NTYxOTQsImV4cCI6MjA5MDMxNjE5NH0.S2tJPSoTRe0fZwB0SzgcsZU008Vw-Ti4cH3h0LPDlgU',
    skills: ['routing', 'delegation', 'briefing', 'operations-strategy', 'team-operating-system', 'delivery-tracking', 'executive-reporting'],
    tagline: 'The System Architect',
    skill_details: [
      { skill_key: 'briefing', name: 'Mission Briefing', description: 'Write clear, execution-ready briefs with measurable acceptance criteria that workers can execute without asking questions.' },
      { skill_key: 'delegation', name: 'Task Delegation', description: 'Translate user intent into executable mission briefs with clear ownership, deadlines, acceptance criteria, and quality gates.' },
      { skill_key: 'delivery-tracking', name: 'Delivery Tracking', description: 'Track project milestones, blockers, timelines, and ownership accountability across active initiatives.' },
      { skill_key: 'executive-reporting', name: 'Executive Reporting', description: 'Transform operational data into concise, actionable reports for leadership decisions.' },
      { skill_key: 'operations-strategy', name: 'Operations Strategy', description: 'Decide the next highest-leverage move based on current data, bottlenecks, and business goals.' },
      { skill_key: 'routing', name: 'Task Routing', description: 'Route incoming work to the right team member or process owner based on deliverable type and team capabilities.' },
      { skill_key: 'team-operating-system', name: 'Team Operating System', description: 'Establish execution cadence, accountability loops, escalation routines, and operational rhythm for the team.' },
    ],
  },
  {
    role_key: 'automation_integrations_engineer',
    default_name: 'Zane',
    role: 'Automation & Integrations Architect',
    level: 'employee',
    image_url: 'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-automation_integrations_engineer-1774956222994.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLWF1dG9tYXRpb25faW50ZWdyYXRpb25zX2VuZ2luZWVyLTE3NzQ5NTYyMjI5OTQuanBnIiwiaWF0IjoxNzc0OTU2MjI0LCJleHAiOjIwOTAzMTYyMjR9.gsvowIsUQqZQ8-UTEqIydFOdMRYs7_1DJT9IuFEQO_g',
    skills: ['automation-architecture', 'api-integrations', 'delivery-tracking', 'release-readiness', 'experimentation-system'],
    tagline: 'The Systems Connector',
    skill_details: [
      { skill_key: 'api-integrations', name: 'API Integrations', description: 'Build and maintain reliable integrations across external APIs and third-party systems.' },
      { skill_key: 'automation-architecture', name: 'Automation Architecture', description: 'Design robust automation pipelines, workflow engines, and event-driven processing systems.' },
      { skill_key: 'delivery-tracking', name: 'Delivery Tracking', description: 'Track project milestones, blockers, timelines, and ownership accountability across active initiatives.' },
      { skill_key: 'experimentation-system', name: 'Experimentation System', description: 'Design and run structured experiments: A/B tests, creative tests, messaging tests: and scale only proven winners.' },
      { skill_key: 'release-readiness', name: 'Release Readiness', description: 'Gate releases with quality evidence, monitoring plans, and rollback procedures to ship changes safely.' },
    ],
  },
]

/** Matches `20260325193000_agent_employee_template_vibey.sql` when no custom portrait is in DB. */
export const VIBEY_MARKETING_PORTRAIT_FALLBACK =
  'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-developer-1774956124013.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLWRldmVsb3Blci0xNzc0OTU2MTI0MDEzLmpwZyIsImlhdCI6MTc3NDk1NjEyNSwiZXhwIjoyMDkwMzE2MTI1fQ.vd_WorfpvKmI_y7WiRsvjTHoiq-ayLacNs3SQtgBWXg'
