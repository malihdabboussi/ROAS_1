import { describe, expect, it } from 'vitest'
import { SPACE_TEMPLATE_CATALOG } from '../space-template-catalog'

const EXPECTED_TEMPLATE_SLUGS = [
  'ceo-hq',
  'meetings',
  'personal-workspace',
  'client-account-workspace',
  'product-launch',
  'sales-pipeline',
  'company-wiki',
  'operations-hub',
  'content-calendar',
  'marketing-campaign',
  'customer-onboarding',
  'hiring-pipeline',
  'research-insights',
  'engineering-bug-tracker',
]

describe('SPACE_TEMPLATE_CATALOG', () => {
  it('preserves the seeded template order and unique slug set', () => {
    expect(SPACE_TEMPLATE_CATALOG.map((template) => template.slug)).toEqual(
      EXPECTED_TEMPLATE_SLUGS,
    )
    expect(new Set(SPACE_TEMPLATE_CATALOG.map((template) => template.slug)).size).toBe(
      SPACE_TEMPLATE_CATALOG.length,
    )
  })

  it('keeps every template shaped for migration seeding', () => {
    for (const template of SPACE_TEMPLATE_CATALOG) {
      expect(template.title).toBeTruthy()
      expect(template.description).toBeTruthy()
      expect(template.schema).toMatchObject({ version: 1, icon: template.icon })
      expect(Array.isArray(template.schema.fields)).toBe(true)
      expect(Array.isArray(template.schema.views)).toBe(true)
      expect(template.items[0]).toMatchObject({ kind: 'doc' })
      expect(template.items[0]?.title).toContain('Welcome')
      expect(template.items.map((item) => item.sort_order)).toEqual(
        template.items.map((_, index) => index),
      )
    }
  })

  it('preserves the automation attachments for seeded templates', () => {
    const automationsBySlug = Object.fromEntries(
      SPACE_TEMPLATE_CATALOG.map((template) => [
        template.slug,
        template.automations.map((automation) => automation.name),
      ]),
    )

    expect(automationsBySlug['ceo-hq']).toEqual(['Morning CEO Brief', 'End of Day Close'])
    expect(automationsBySlug['meetings']).toEqual(['Fathom Meeting Log'])
    expect(automationsBySlug['sales-pipeline']).toEqual(['Fathom Call Follow-Ups'])
    expect(automationsBySlug['operations-hub']).toEqual(['Weekly Space Digest'])
    expect(automationsBySlug['marketing-campaign']).toEqual(['Weekly Space Digest'])
    expect(automationsBySlug['customer-onboarding']).toEqual(['Form Submission To Contact'])
    expect(automationsBySlug['hiring-pipeline']).toEqual(['Form Submission To Contact'])
  })

  it('keeps CEO HQ draft-only and Meetings Fathom wiring opinionated', () => {
    const ceoHq = SPACE_TEMPLATE_CATALOG.find((template) => template.slug === 'ceo-hq')
    const meetings = SPACE_TEMPLATE_CATALOG.find((template) => template.slug === 'meetings')

    expect(ceoHq?.schema).toMatchObject({
      views: expect.arrayContaining([
        expect.objectContaining({ id: 'today', type: 'list' }),
        expect.objectContaining({ id: 'priorities', type: 'kanban' }),
        expect.objectContaining({ id: 'drafts', type: 'emails' }),
      ]),
    })
    expect(JSON.stringify(ceoHq?.automations)).toMatch(/Never send|Always draft/i)

    expect(meetings?.schema).toMatchObject({
      views: expect.arrayContaining([
        expect.objectContaining({
          id: 'all-meetings',
          type: 'list',
          field_value_filters: { entry_type: 'call' },
          visible_fields: expect.arrayContaining(['status', 'attendees', 'recording_url']),
        }),
        expect.objectContaining({
          id: 'follow-ups',
          type: 'kanban',
          field_value_filters: { entry_type: 'follow_up' },
        }),
        expect.objectContaining({
          id: 'action-items',
          type: 'list',
          field_value_filters: { entry_type: 'follow_up' },
          visible_fields: expect.arrayContaining(['source_call']),
        }),
        expect.objectContaining({ id: 'meeting-logs', type: 'docs' }),
      ]),
    })
    expect(meetings?.schema.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'status',
          options: expect.arrayContaining([expect.objectContaining({ id: 'processing' })]),
        }),
        expect.objectContaining({
          id: 'entry_type',
          options: expect.arrayContaining([
            expect.objectContaining({ id: 'call' }),
            expect.objectContaining({ id: 'follow_up' }),
          ]),
        }),
      ]),
    )
    expect(meetings?.automations[0]?.trigger).toMatchObject({
      type: 'external_fathom_recording_ready',
    })
    const actionTypes = (meetings?.automations[0]?.actions ?? []).map((action) => action.type)
    expect(actionTypes).not.toContain('create_task')
    expect(actionTypes).toContain('change_status')
    expect(actionTypes).toContain('send_to_agent')
    expect(actionTypes).toContain('agent_suggest_tasks')
    expect(meetings?.schema.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'status',
          options: expect.arrayContaining([
            expect.objectContaining({ id: 'logged', label: 'To action' }),
            expect.objectContaining({ id: 'needs_follow_up', label: 'Following up' }),
          ]),
        }),
      ]),
    )
    expect(meetings?.schema.views).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'all-meetings',
          column_widths: expect.objectContaining({ attendees: 360 }),
          date_display_formats: expect.objectContaining({ call_date: 'date_time' }),
          visible_fields: expect.arrayContaining(['call_date']),
        }),
      ]),
    )
    expect(meetings?.schema.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'call_date', name: 'Call Date' }),
        expect.objectContaining({ id: 'due_date', name: 'Due Date' }),
      ]),
    )
  })
})
