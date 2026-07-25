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
    expect(SHELL_EMPTY_CHAT_CAPABILITIES.some((c) => c.id === 'image')).toBe(true)
  })

  it('seeds composer from capability chips', () => {
    const onSelect = vi.fn()
    render(<ShellEmptyChatCapabilityScroller onSelect={onSelect} />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Image' })[0]!)
    expect(onSelect).toHaveBeenCalledWith('Generate an image of ')
  })

  it('seeds composer from action pills', () => {
    const onSelect = vi.fn()
    render(<ShellEmptyChatActionPills onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Research' }))
    expect(onSelect).toHaveBeenCalledWith('Research ')
  })
})
