import { describe, expect, it } from 'vitest'
import { findShellCreateMenuItem, SHELL_CREATE_MENU_GROUPS } from './shell-create-menu.config'

describe('shell-create-menu config', () => {
  it('resolves items by id across groups', () => {
    expect(findShellCreateMenuItem('create-offer')?.prompt).toBe('Create an offer for ')
    expect(findShellCreateMenuItem('create-video')?.systemContext).toContain('generate_video')
    expect(findShellCreateMenuItem('missing-id')).toBeNull()
  })

  it('keeps every active item seedable with a prompt and a tool-targeting context', () => {
    for (const group of SHELL_CREATE_MENU_GROUPS) {
      for (const item of group.items) {
        if (item.comingSoon) continue
        expect(item.prompt.length, item.id).toBeGreaterThan(0)
        expect(item.systemContext, item.id).toMatch(/^QUICK ACTION — /)
      }
    }
  })

  it('has unique ids', () => {
    const ids = SHELL_CREATE_MENU_GROUPS.flatMap((group) => group.items.map((item) => item.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})
