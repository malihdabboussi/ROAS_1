import type { MouseEvent } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SIMPLE_MENU_WIDTH_DEFAULT, useShellMenuDock } from '@/components/shell/use-shell-menu-dock'
import { SidebarSimpleResizeHandle } from './SidebarSimpleResizeHandle'

vi.mock('@/components/layout/ResizableDivider', () => ({
  ResizableDivider: ({
    onMouseDown,
    ariaLabel,
  }: {
    onMouseDown: (event: MouseEvent) => void
    ariaLabel?: string
  }) => <button type="button" aria-label={ariaLabel} onMouseDown={onMouseDown} />,
}))

describe('SidebarSimpleResizeHandle', () => {
  beforeEach(() => {
    useShellMenuDock.setState({ simpleMenuWidth: SIMPLE_MENU_WIDTH_DEFAULT })
  })

  afterEach(cleanup)

  it('sits above the menu so Recents can be dragged wider', () => {
    const { container } = render(<SidebarSimpleResizeHandle />)
    expect(container.firstElementChild).toHaveClass('z-10')
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize menu' }), { clientX: 272 })
    const moveEvent = new Event('pointermove', { bubbles: true })
    Object.defineProperty(moveEvent, 'clientX', { value: 360 })
    fireEvent(document, moveEvent)
    fireEvent.pointerUp(document)
    expect(useShellMenuDock.getState().simpleMenuWidth).toBe(360)
  })
})
