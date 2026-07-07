import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SlashItem } from './chat-input-slash-menu'
import { SlashCommandMenuView, type SlashMenuLayout } from './chat-input-slash-menu-view'

afterEach(cleanup)

function slashItem(overrides: Partial<SlashItem>): SlashItem {
  return {
    id: 'item-1',
    key: 'brief',
    name: 'Brief',
    description: 'Create a brief',
    type: 'skill',
    ...overrides,
  }
}

function layout(overrides: Partial<SlashMenuLayout> = {}): SlashMenuLayout {
  const skill = slashItem({ id: 'skill-1', key: 'brief', type: 'skill' })
  const workflow = slashItem({
    id: 'workflow-1',
    key: 'publish',
    description: 'Publish a campaign',
    type: 'workflow',
  })
  return {
    skillItems: [skill],
    workflowItems: [workflow],
    skillVisible: [skill],
    workflowVisible: [workflow],
    visibleFlat: [skill, workflow],
    skillMoreCount: 0,
    workflowMoreCount: 2,
    showSkillMore: false,
    showWorkflowMore: true,
    ...overrides,
  }
}

describe('SlashCommandMenuView', () => {
  it('renders empty state when no commands match', () => {
    render(
      <SlashCommandMenuView
        layout={layout({ skillItems: [], workflowItems: [], skillVisible: [], workflowVisible: [], visibleFlat: [] })}
        slashItemsCount={0}
        slashHighlight={-1}
        onSelect={vi.fn()}
        onHighlight={vi.fn()}
        onShowMoreSkills={vi.fn()}
        onShowMoreWorkflows={vi.fn()}
      />,
    )

    expect(screen.getByText('No commands found')).toBeTruthy()
  })

  it('renders skill and workflow sections with command rows', () => {
    render(
      <SlashCommandMenuView
        layout={layout()}
        slashItemsCount={2}
        slashHighlight={0}
        onSelect={vi.fn()}
        onHighlight={vi.fn()}
        onShowMoreSkills={vi.fn()}
        onShowMoreWorkflows={vi.fn()}
      />,
    )

    expect(screen.getByText('Skills')).toBeTruthy()
    expect(screen.getByText('Workflows')).toBeTruthy()
    expect(screen.getByText('/brief')).toBeTruthy()
    expect(screen.getByText('Publish a campaign')).toBeTruthy()
    expect(screen.getByRole('button', { name: /brief/i }).className).toContain('bg-hover-subtle')
  })

  it('delegates row highlight and selection', () => {
    const onSelect = vi.fn()
    const onHighlight = vi.fn()
    render(
      <SlashCommandMenuView
        layout={layout()}
        slashItemsCount={2}
        slashHighlight={-1}
        onSelect={onSelect}
        onHighlight={onHighlight}
        onShowMoreSkills={vi.fn()}
        onShowMoreWorkflows={vi.fn()}
      />,
    )

    fireEvent.mouseEnter(screen.getByRole('button', { name: /publish/i }))
    expect(onHighlight).toHaveBeenCalledWith(1)

    fireEvent.mouseDown(screen.getByRole('button', { name: /brief/i }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'skill-1' }))
  })

  it('delegates show-more actions by section', () => {
    const onShowMoreWorkflows = vi.fn()
    render(
      <SlashCommandMenuView
        layout={layout()}
        slashItemsCount={2}
        slashHighlight={-1}
        onSelect={vi.fn()}
        onHighlight={vi.fn()}
        onShowMoreSkills={vi.fn()}
        onShowMoreWorkflows={onShowMoreWorkflows}
      />,
    )

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Show 2 more' }))
    expect(onShowMoreWorkflows).toHaveBeenCalledTimes(1)
  })
})
