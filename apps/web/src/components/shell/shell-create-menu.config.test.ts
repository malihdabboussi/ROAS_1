import { describe, expect, it } from 'vitest'
import {
  findShellCreateMenuItem,
  SHELL_CREATE_MENU_GROUPS,
  SHELL_CREATE_QUICK_STARTS,
} from './shell-create-menu.config'

describe('shell-create-menu config', () => {
  it('resolves items by id across groups', () => {
    expect(findShellCreateMenuItem('create-offer')?.prompt).toBe('Create an offer for ')
    expect(findShellCreateMenuItem('create-video')?.systemContext).toContain('generate_video')
    expect(findShellCreateMenuItem('missing-id')).toBeNull()
    expect(findShellCreateMenuItem('create-funnel')?.typePicker).toBe('funnel')
    expect(findShellCreateMenuItem('create-ad')?.typePicker).toBe('ad')
  })

  it('exposes Missions as a direct Create action', () => {
    expect(findShellCreateMenuItem('create-mission')).toMatchObject({
      label: 'Mission',
      action: 'mission',
    })
  })

  it('keeps every active item seedable with a prompt and a tool-targeting context', () => {
    for (const group of SHELL_CREATE_MENU_GROUPS) {
      for (const item of group.items) {
        if (item.comingSoon || item.action === 'mission') continue
        expect(item.prompt.length, item.id).toBeGreaterThan(0)
        expect(item.systemContext, item.id).toMatch(/^QUICK ACTION — /)
      }
    }
  })

  it.each([
    ['create-offer', 'create_offer'],
    ['create-avatar', 'create_avatar'],
    ['create-document', 'create_docx'],
    ['create-presentation', 'create_presentation'],
    ['create-funnel', 'create_funnel'],
    ['create-ad', 'create_ad'],
    ['create-sequence', 'create_sequence'],
    ['create-script', 'create_docx'],
    ['create-image', 'generate_image'],
    ['create-video', 'generate_video'],
    ['create-website', 'create_website'],
    ['create-social-post', 'create_social_post'],
    ['create-ad-campaign', 'create_ad_campaign'],
  ])('routes %s to its tested creation action %s', (id, action) => {
    expect(findShellCreateMenuItem(id)?.systemContext).toContain(action)
  })

  it('has unique ids', () => {
    const ids = SHELL_CREATE_MENU_GROUPS.flatMap((group) => group.items.map((item) => item.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses the exact active Create catalog for empty-chat quick starts', () => {
    expect(SHELL_CREATE_QUICK_STARTS).toEqual(
      SHELL_CREATE_MENU_GROUPS.flatMap((group) => group.items.filter((item) => !item.comingSoon)),
    )
  })
})
