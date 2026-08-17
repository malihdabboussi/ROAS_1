import { describe, expect, it } from 'vitest'
import { SHELL_CREATE_MENU_GROUPS, SHELL_CREATE_QUICK_STARTS } from './shell-create-menu.config'
import { SHELL_EMPTY_CHAT_PLACEHOLDER } from './shell-empty-chat-prompts.config'

describe('shell empty chat prompts', () => {
  it('exports the empty-composer placeholder without a chip row', () => {
    expect(SHELL_EMPTY_CHAT_PLACEHOLDER).toMatch(/Ask, create, search/i)
    expect(SHELL_CREATE_QUICK_STARTS).toEqual(
      SHELL_CREATE_MENU_GROUPS.flatMap((group) => group.items.filter((item) => !item.comingSoon)),
    )
    expect(SHELL_CREATE_QUICK_STARTS.map((item) => item.id)).toContain('create-mission')
    expect(
      SHELL_CREATE_QUICK_STARTS.every(
        (quickStart) =>
          (quickStart.action === 'mission' ||
            (quickStart.prompt.trim().length > 0 &&
              quickStart.systemContext.includes('QUICK ACTION'))) &&
          quickStart.iconName.length > 0,
      ),
    ).toBe(true)
  })

  it('routes every active composer creation to the canonical tool context', () => {
    const byId = new Map(SHELL_CREATE_QUICK_STARTS.map((item) => [item.id, item.systemContext]))

    expect(byId.get('create-document')).toMatch(/create_docx/)
    expect(byId.get('create-presentation')).toMatch(/create_presentation/)
    expect(byId.get('create-image')).toMatch(/generate_image/)
    expect(byId.get('create-video')).toMatch(/generate_video/)
    expect(byId.get('create-website')).toMatch(/create_website/)
    expect(byId.get('create-social-post')).toMatch(/create_social_post/)
    expect(byId.get('create-ad-campaign')).toMatch(/create_ad_campaign/)
    expect(byId.has('deep-search')).toBe(false)
  })
})
