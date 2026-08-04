import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SHELL_EMPTY_CHAT_PLACEHOLDER,
  SHELL_EMPTY_CHAT_QUICK_STARTS,
} from './shell-empty-chat-prompts.config'
import { ShellEmptyChatQuickStartPills } from './ShellEmptyChatQuickStartPills'

describe('shell empty chat prompts', () => {
  afterEach(() => {
    cleanup()
  })

  it('exports one curated quick-start catalog above the composer', () => {
    expect(SHELL_EMPTY_CHAT_PLACEHOLDER).toMatch(/Ask, create, search/i)
    expect(SHELL_EMPTY_CHAT_QUICK_STARTS.map((item) => item.id)).toEqual([
      'deep-search',
      'task',
      'image',
      'slides',
      'doc',
      'daily-brief',
      'delegate',
    ])
    expect(SHELL_EMPTY_CHAT_QUICK_STARTS).toHaveLength(7)
    expect(
      SHELL_EMPTY_CHAT_QUICK_STARTS.every(
        (quickStart) =>
          quickStart.prompt.trim().length > 0 &&
          quickStart.systemContext.includes('QUICK ACTION') &&
          quickStart.iconName.length > 0,
      ),
    ).toBe(true)
  })

  it('selects every quick start with its executable routing context', () => {
    const onSelect = vi.fn()
    render(<ShellEmptyChatQuickStartPills onSelect={onSelect} />)

    for (const quickStart of SHELL_EMPTY_CHAT_QUICK_STARTS) {
      fireEvent.click(screen.getByRole('button', { name: quickStart.label }))
      expect(onSelect).toHaveBeenLastCalledWith(quickStart)
    }
  })

  it('renders each quick start once in a single row group', () => {
    render(<ShellEmptyChatQuickStartPills onSelect={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Quick starts' })).toBeInTheDocument()
    for (const quickStart of SHELL_EMPTY_CHAT_QUICK_STARTS) {
      expect(screen.getAllByRole('button', { name: quickStart.label })).toHaveLength(1)
    }
  })

  it('routes search, artifacts, briefing, and delegation starters to real tools', () => {
    const byId = new Map(SHELL_EMPTY_CHAT_QUICK_STARTS.map((item) => [item.id, item.systemContext]))

    expect(byId.get('deep-search')).toMatch(/search_space_context/)
    expect(byId.get('task')).toMatch(/create_task/)
    expect(byId.get('image')).toMatch(/generate_image/)
    expect(byId.get('slides')).toMatch(/create_presentation/)
    expect(byId.get('doc')).toMatch(/create_docx/)
    expect(byId.get('daily-brief')).toMatch(/get_person_briefing/)
    expect(byId.get('delegate')).toMatch(/delegate_to_agent/)
    expect(byId.has('standup')).toBe(false)
    expect(byId.has('report')).toBe(false)
    expect(byId.has('find')).toBe(false)
  })
})
