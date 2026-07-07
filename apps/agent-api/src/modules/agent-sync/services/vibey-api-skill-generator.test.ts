import { describe, expect, it } from 'vitest'
import { generateScopedVibeyApiSkill } from './vibey-api-skill-generator'

describe('vibey-api skill generator', () => {
  it('teaches document retrieval before Brain for provided file data', () => {
    const { skillMd, referenceFiles } = generateScopedVibeyApiSkill(
      new Set([
        'list_documents',
        'get_document',
        'read_space_document',
        'search_space_context',
        'search_brain_context',
      ]),
      'operations',
    )
    const output = [skillMd, ...Object.values(referenceFiles)].join('\n')

    expect(skillMd).toContain('Document retrieval before Brain')
    expect(skillMd).toContain('active Space evidence first')
    expect(skillMd).toContain('I already gave you the April follow-up call data')
    expect(skillMd).toContain('`search_space_context`, `list_documents`, `get_document`')
    expect(output).toContain('search or read Space/document sources before Brain')
  })

  it('frames presentation creation as fixed-stage HTML bundles', () => {
    const { skillMd } = generateScopedVibeyApiSkill(
      new Set(['create_presentation', 'read_presentation_file']),
      'marketing',
    )

    expect(skillMd).toContain('Presentations are fixed-stage HTML bundles')
    expect(skillMd).toContain('Presentation craft vs contract')
    expect(skillMd).toContain('data-vibey-theme-native')
    expect(skillMd).not.toContain('Theme-native presentation source')
  })

  it('puts the new presentation bundle contract before legacy slide actions', () => {
    const { referenceFiles } = generateScopedVibeyApiSkill(
      new Set([
        'add_presentation_slide',
        'create_presentation',
        'patch_presentation',
        'patch_presentation_file',
        'read_presentation_file',
        'update_presentation_slide',
        'write_presentation_file',
      ]),
      'marketing',
    )
    const reference = referenceFiles['references/presentations.md']

    expect(reference).toContain('## Section Contract')
    expect(reference).toContain('New presentations use `create_presentation`')
    expect(reference).toContain('Never use them for new decks')
    expect(reference.indexOf('\n## create_presentation\n')).toBeLessThan(
      reference.indexOf('\n## add_presentation_slide\n'),
    )
    expect(reference.indexOf('\n## patch_presentation_file\n')).toBeLessThan(
      reference.indexOf('\n## patch_presentation\n'),
    )
    expect(reference).not.toContain('Pass the full <section>')
  })

  it('teaches Flow webhook trigger payload, fields, and metadata variables', () => {
    const { skillMd } = generateScopedVibeyApiSkill(
      new Set(['get_flow_build_context', 'search_flow_capabilities', 'publish_flow']),
      'operations',
    )

    expect(skillMd).toContain('Webhook Flow triggers')
    expect(skillMd).toContain('trigger.webhook_received')
    expect(skillMd).toContain('webhook_endpoint_id')
    expect(skillMd).toContain('{{trigger.fields.customer_email}}')
    expect(skillMd).toContain('{{trigger.webhook.event_id}}')
  })
})
