import { describe, expect, it } from 'vitest'
import { formatActionSkillLinks, getActionSkillLinks } from './agent-action-skill-links'

describe('agent action skill links', () => {
  it('maps presentation actions to presentation-builder', () => {
    expect(getActionSkillLinks('create_presentation')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'create_presentation',
          skillKey: 'presentation-builder',
        }),
      ]),
    )
    expect(formatActionSkillLinks('patch_presentation_file').join('\n')).toContain(
      'skills/presentation-builder/SKILL.md',
    )
  })

  it('maps core artifact actions to their workflow skills', () => {
    expect(getActionSkillLinks('create_funnel')[0]?.skillKey).toBe('funnel-builder')
    expect(getActionSkillLinks('create_form')[0]?.skillKey).toBe('vibey-api')
    expect(getActionSkillLinks('attach_form_asset')[0]?.skillKey).toBe('vibey-api')
    expect(getActionSkillLinks('create_sequence')[0]?.skillKey).toBe('email-sequence-builder')
    expect(getActionSkillLinks('create_ad')[0]?.skillKey).toBe('ad-builder')
    expect(getActionSkillLinks('create_project')[0]?.skillKey).toBe('project-builder')
    expect(getActionSkillLinks('create_theme')[0]?.skillKey).toBe('theme-builder')
    expect(getActionSkillLinks('create_avatar')[0]?.skillKey).toBe('avatar-builder')
  })

  it('can return multiple links for cross-workflow actions', () => {
    const links = getActionSkillLinks('publish_social_post').map((link) => link.skillKey)

    expect(links).toContain('social-content-builder')
    expect(links).toContain('social-publisher')
  })

  it('returns no link for unmapped actions', () => {
    expect(getActionSkillLinks('describe_action')).toEqual([])
    expect(formatActionSkillLinks('describe_action')).toEqual([])
  })
})
