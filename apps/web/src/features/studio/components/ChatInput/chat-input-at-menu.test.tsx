import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AtMentionItem, StudioAtMenuTabId } from './chat-input-at-mentions'
import {
  StudioAtMentionLeading,
  StudioAtMentionTrailingType,
  StudioAtMoreRowLeadingSpacer,
  StudioComposerAtTabStrip,
} from './chat-input-at-menu'

afterEach(cleanup)

function item(overrides: Partial<AtMentionItem> = {}): AtMentionItem {
  return {
    id: 'item-1',
    label: 'Item 1',
    section: 'media',
    type: 'image/png',
    thumbnailUrl: 'https://cdn.test/image.png',
    ...overrides,
  }
}

describe('chat input at-menu presentation helpers', () => {
  it('renders tab buttons and delegates tab changes', () => {
    const onTabChange = vi.fn()
    const tabs: Array<{ id: StudioAtMenuTabId; label: string }> = [
      { id: 'tasks', label: 'Tasks' },
      { id: 'media', label: 'Media' },
    ]

    render(<StudioComposerAtTabStrip tabs={tabs} activeTab="tasks" onTabChange={onTabChange} />)

    expect(screen.getByRole('button', { name: 'Tasks' }).className).toContain('text-primary')
    fireEvent.click(screen.getByRole('button', { name: 'Media' }))
    expect(onTabChange).toHaveBeenCalledWith('media')
  })

  it('renders media thumbnails with token utility classes', () => {
    const { container } = render(<StudioAtMentionLeading item={item()} />)

    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('https://cdn.test/image.png')
    expect(img?.parentElement?.className).toContain('bg-muted-20')
    expect(img?.parentElement?.className.includes(`bg-${'[var('}`)).toBe(false)
  })

  it('renders task status dots and hides task trailing type labels', () => {
    const task = item({
      section: 'space-task',
      type: 'todo',
      thumbnailUrl: undefined,
      spaceTaskStatusColor: 'cyan',
    })
    const { container } = render(
      <>
        <StudioAtMentionLeading item={task} />
        <StudioAtMentionTrailingType item={task} />
      </>,
    )

    expect(container.querySelector('.bg-cyan-500')).not.toBeNull()
    expect(container.textContent).toBe('')
  })

  it('keeps more-row leading spacers stable', () => {
    const { container, rerender } = render(
      <StudioAtMoreRowLeadingSpacer variant="thumbnail-slot" />,
    )

    expect(container.firstElementChild?.className).toContain('h-4 w-4')

    rerender(<StudioAtMoreRowLeadingSpacer variant="status-dot-slot" />)
    expect(container.firstElementChild?.className).toContain('h-2.5 w-2.5')
  })
})
