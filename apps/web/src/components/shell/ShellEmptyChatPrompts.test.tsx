import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SHELL_EMPTY_CHAT_ACTIONS,
  SHELL_EMPTY_CHAT_CAPABILITIES,
  SHELL_EMPTY_CHAT_PLACEHOLDER,
} from './shell-empty-chat-prompts.config'
import { ShellEmptyChatActionPills } from './ShellEmptyChatActionPills'
import { ShellEmptyChatCapabilityScroller } from './ShellEmptyChatCapabilityScroller'

describe('shell empty chat prompts', () => {
  afterEach(() => {
    cleanup()
  })

  it('exports ClickUp-inspired placeholder and catalogs', () => {
    expect(SHELL_EMPTY_CHAT_PLACEHOLDER).toMatch(/Ask, create, search/i)
    expect(SHELL_EMPTY_CHAT_ACTIONS.map((a) => a.id)).toEqual([
      'find',
      'research',
      'create',
      'edit',
      'analyze',
      'prioritize',
      'schedule',
    ])
    expect(SHELL_EMPTY_CHAT_CAPABILITIES.map((capability) => capability.id)).toEqual([
      'deep-search',
      'task',
      'image',
      'slides',
      'report',
      'doc',
      'daily-brief',
      'delegate',
    ])
    expect(
      [...SHELL_EMPTY_CHAT_ACTIONS, ...SHELL_EMPTY_CHAT_CAPABILITIES].every(
        (quickStart) =>
          quickStart.prompt.trim().length > 0 &&
          quickStart.systemContext.includes('QUICK ACTION') &&
          quickStart.iconName.length > 0,
      ),
    ).toBe(true)
  })

  it('selects every capability with its executable routing context', () => {
    const onSelect = vi.fn()
    render(<ShellEmptyChatCapabilityScroller onSelect={onSelect} />)

    for (const capability of SHELL_EMPTY_CHAT_CAPABILITIES) {
      fireEvent.click(screen.getByRole('button', { name: capability.label }))
      expect(onSelect).toHaveBeenLastCalledWith(capability)
    }
  })

  it('renders each capability once without a clipped duplicate track', () => {
    render(<ShellEmptyChatCapabilityScroller onSelect={vi.fn()} />)

    for (const capability of SHELL_EMPTY_CHAT_CAPABILITIES) {
      expect(screen.getAllByRole('button', { name: capability.label })).toHaveLength(1)
    }
  })

  it('selects every action pill with its executable routing context', () => {
    const onSelect = vi.fn()
    render(<ShellEmptyChatActionPills onSelect={onSelect} />)

    for (const action of SHELL_EMPTY_CHAT_ACTIONS) {
      fireEvent.click(screen.getByRole('button', { name: action.label }))
      expect(onSelect).toHaveBeenLastCalledWith(action)
    }
  })

  it('routes artifact, scheduling, search, and delegation starters to real tools', () => {
    const byId = new Map(
      [...SHELL_EMPTY_CHAT_ACTIONS, ...SHELL_EMPTY_CHAT_CAPABILITIES].map((item) => [
        item.id,
        item.systemContext,
      ]),
    )

    expect(byId.get('deep-search')).toMatch(/search_space_context/)
    expect(byId.get('research')).toMatch(/web_search/)
    expect(byId.get('task')).toMatch(/create_task/)
    expect(byId.get('image')).toMatch(/generate_image/)
    expect(byId.get('slides')).toMatch(/create_presentation/)
    expect(byId.get('doc')).toMatch(/create_docx/)
    expect(byId.get('schedule')).toMatch(/create_calendar_event/)
    expect(byId.get('daily-brief')).toMatch(/get_person_briefing/)
    expect(byId.get('delegate')).toMatch(/delegate_to_agent/)
    expect(byId.has('standup')).toBe(false)
  })
})
