import { describe, expect, it } from 'vitest'
import { countTemplatesForNavFilter, filterAutomationTemplates } from '../automation-template-nav'
import type { AutomationTemplatePreset } from '../automation-templates'

const samplePresets: AutomationTemplatePreset[] = [
  {
    id: 'featured-one',
    featured: true,
    isNew: true,
    workflows: ['sales_cs'],
    integration: 'fathom',
    triggerGroup: 'tasks',
    title: 'Featured',
    description: 'A',
    badge: 'Ready',
  },
  {
    id: 'email-draft',
    workflows: ['inbound_comms'],
    integration: 'email',
    triggerGroup: 'schedule',
    title: 'Email',
    description: 'B',
    badge: 'Draft',
  },
]

describe('automation-template-nav', () => {
  it('filters featured templates', () => {
    expect(filterAutomationTemplates('featured', samplePresets)).toHaveLength(1)
    expect(filterAutomationTemplates('featured', samplePresets)[0]?.id).toBe('featured-one')
  })

  it('counts templates per nav filter', () => {
    expect(countTemplatesForNavFilter('email', samplePresets)).toBe(1)
    expect(countTemplatesForNavFilter('all', samplePresets)).toBe(2)
  })

  it('filters google_drive integration templates', () => {
    const drivePresets: AutomationTemplatePreset[] = [
      {
        id: 'google-drive-new-file-review',
        workflows: ['team_ops'],
        integration: 'google_drive',
        title: 'Drive',
        description: 'D',
        badge: 'Needs account',
      },
      {
        id: 'email-draft',
        workflows: ['inbound_comms'],
        integration: 'email',
        title: 'Email',
        description: 'B',
        badge: 'Draft',
      },
    ]
    expect(filterAutomationTemplates('google_drive', drivePresets)).toHaveLength(1)
    expect(filterAutomationTemplates('google_drive', drivePresets)[0]?.id).toBe(
      'google-drive-new-file-review',
    )
  })
})
