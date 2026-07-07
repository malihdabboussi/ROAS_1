import type { CSSProperties } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SlashItem } from './chat-input-slash-menu'
import { ChatInputSlashMenuPortal } from './chat-input-slash-menu-portal'
import type { SlashMenuLayout } from './chat-input-slash-menu-view'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

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
  return {
    skillItems: [skill],
    workflowItems: [],
    skillVisible: [skill],
    workflowVisible: [],
    visibleFlat: [skill],
    skillMoreCount: 0,
    workflowMoreCount: 0,
    showSkillMore: false,
    showWorkflowMore: false,
    ...overrides,
  }
}

function defaultProps(portalTarget: HTMLElement) {
  return {
    open: true,
    floatingRef: vi.fn(),
    floatingStyles: { position: 'absolute', left: 12, top: 24 } as CSSProperties,
    portalTarget,
    layout: layout(),
    slashItemsCount: 1,
    slashHighlight: 0,
    onSelect: vi.fn(),
    onHighlight: vi.fn(),
    onShowMoreSkills: vi.fn(),
    onShowMoreWorkflows: vi.fn(),
  }
}

describe('ChatInputSlashMenuPortal', () => {
  it('does not render while closed', () => {
    const portalTarget = document.createElement('div')
    document.body.appendChild(portalTarget)

    render(<ChatInputSlashMenuPortal {...defaultProps(portalTarget)} open={false} />)

    expect(portalTarget.textContent).toBe('')
  })

  it('renders the menu shell into the provided portal target', () => {
    const portalTarget = document.createElement('div')
    document.body.appendChild(portalTarget)

    render(<ChatInputSlashMenuPortal {...defaultProps(portalTarget)} />)

    const menuRoot = portalTarget.querySelector('.dropdown-menu-solid') as HTMLElement | null
    expect(menuRoot).toBeTruthy()
    expect(menuRoot?.className).toContain('dropdown-menu-solid')
    expect(menuRoot?.style.left).toBe('12px')
    expect(menuRoot?.style.top).toBe('24px')
    expect(screen.getByText('/brief')).toBeTruthy()
  })

  it('delegates menu selection and keeps mouse events inside the portal', () => {
    const portalTarget = document.createElement('div')
    document.body.appendChild(portalTarget)
    const onSelect = vi.fn()
    const onContainerMouseDown = vi.fn()

    render(
      <div onMouseDown={onContainerMouseDown}>
        <ChatInputSlashMenuPortal
          {...defaultProps(portalTarget)}
          onSelect={onSelect}
        />
      </div>,
    )

    fireEvent.mouseDown(portalTarget.querySelector('.dropdown-menu-solid')!)
    expect(onContainerMouseDown).not.toHaveBeenCalled()

    fireEvent.mouseDown(screen.getByRole('button', { name: /brief/i }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'skill-1' }))
  })
})
