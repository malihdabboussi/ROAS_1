import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHELL_CREATE_MENU_GROUPS, SHELL_CREATE_QUICK_STARTS } from './shell-create-menu.config'
import { SHELL_EMPTY_CHAT_PLACEHOLDER } from './shell-empty-chat-prompts.config'
import { ShellEmptyChatQuickStartPills } from './ShellEmptyChatQuickStartPills'

vi.mock('@/components/global-chat/components/QuickMissionsHubHost', () => ({
  QuickMissionsHubHost: ({ open }: { open?: boolean }) => (
    <div data-testid="quick-missions-host-open">{String(open)}</div>
  ),
}))

describe('shell empty chat prompts', () => {
  afterEach(() => {
    cleanup()
  })

  it('exports one curated quick-start catalog above the composer', () => {
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

  it('launches Mission directly and sends composer quick starts to the consumer', () => {
    const onSelect = vi.fn()
    render(<ShellEmptyChatQuickStartPills onSelect={onSelect} />)

    for (const quickStart of SHELL_CREATE_QUICK_STARTS) {
      fireEvent.click(screen.getByRole('button', { name: quickStart.label }))
      if (quickStart.action === 'mission') {
        expect(screen.getByTestId('quick-missions-host-open')).toHaveTextContent('true')
        expect(screen.getByRole('button', { name: quickStart.label })).toHaveAttribute(
          'aria-expanded',
          'true',
        )
        expect(onSelect).not.toHaveBeenCalled()
      } else {
        expect(onSelect).toHaveBeenLastCalledWith(quickStart)
      }
    }
  })

  it('renders each quick start once in a single row group', () => {
    render(<ShellEmptyChatQuickStartPills onSelect={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Quick starts' })).toHaveClass('justify-start')
    for (const quickStart of SHELL_CREATE_QUICK_STARTS) {
      expect(screen.getAllByRole('button', { name: quickStart.label })).toHaveLength(1)
    }
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
