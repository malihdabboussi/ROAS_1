import { describe, expect, it } from 'vitest'
import { SPACE_TEMPLATE_CATALOG } from '../space-template-catalog'

const EXPECTED_TEMPLATE_SLUGS = [
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

    expect(automationsBySlug['sales-pipeline']).toEqual(['Fathom Call Follow-Ups'])
    expect(automationsBySlug['operations-hub']).toEqual(['Weekly Space Digest'])
    expect(automationsBySlug['marketing-campaign']).toEqual(['Weekly Space Digest'])
    expect(automationsBySlug['customer-onboarding']).toEqual(['Form Submission To Contact'])
    expect(automationsBySlug['hiring-pipeline']).toEqual(['Form Submission To Contact'])
  })
})
