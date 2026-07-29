import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediaImageMarkupCanvas } from './MediaImageMarkupCanvas'

describe('MediaImageMarkupCanvas', () => {
  afterEach(cleanup)

  it('adds a pin, captures its feedback, and applies the marked edit', () => {
    const onApply = vi.fn()
    render(
      <MediaImageMarkupCanvas
        src="https://example.com/ad.png"
        alt="Static ad"
        active
        applying={false}
        onApply={onApply}
      />,
    )

    const canvas = screen.getByRole('application', { name: 'Image markup canvas' })
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 1000,
      width: 1000,
      height: 1000,
      toJSON: () => ({}),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Pin tool' }))
    fireEvent(canvas, new MouseEvent('pointerdown', { bubbles: true, clientX: 250, clientY: 400 }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Feedback for annotation 1' }), {
      target: { value: 'Remove this icon' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save mark 1' }))
    expect(screen.getByRole('button', { name: 'Edit feedback for annotation 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Regenerate with marked edits' }))

    expect(onApply).toHaveBeenCalledWith([
      expect.objectContaining({
        kind: 'pin',
        points: [{ x: 0.25, y: 0.4 }],
        feedback: 'Remove this icon',
      }),
    ])
  })

  it('captures a freehand mark and supports undo', () => {
    render(
      <MediaImageMarkupCanvas
        src="https://example.com/ad.png"
        alt="Static ad"
        active
        applying={false}
        onApply={vi.fn()}
      />,
    )

    const canvas = screen.getByRole('application', { name: 'Image markup canvas' })
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    })

    fireEvent(canvas, new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 20 }))
    fireEvent(canvas, new MouseEvent('pointermove', { bubbles: true, clientX: 70, clientY: 80 }))
    fireEvent(canvas, new MouseEvent('pointerup', { bubbles: true, clientX: 70, clientY: 80 }))

    expect(screen.getByRole('textbox', { name: 'Feedback for annotation 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Undo last annotation' }))
    expect(screen.queryByRole('textbox', { name: 'Feedback for annotation 1' })).toBeNull()
  })

  it('deletes one mark without clearing the other marks', () => {
    render(
      <MediaImageMarkupCanvas
        src="https://example.com/ad.png"
        alt="Static ad"
        active
        applying={false}
        onApply={vi.fn()}
      />,
    )
    const canvas = screen.getByRole('application', { name: 'Image markup canvas' })
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    })
    fireEvent.click(screen.getByRole('button', { name: 'Pin tool' }))
    fireEvent(canvas, new MouseEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20 }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Feedback for annotation 1' }), {
      target: { value: 'First edit' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save mark 1' }))
    fireEvent(canvas, new MouseEvent('pointerdown', { bubbles: true, clientX: 80, clientY: 80 }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete mark 2' }))

    expect(screen.getByRole('button', { name: 'Edit feedback for annotation 1' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit feedback for annotation 2' })).toBeNull()
  })

  it('moves the feedback card away from the marked content', () => {
    const { container } = render(
      <MediaImageMarkupCanvas
        src="https://example.com/ad.png"
        alt="Static ad"
        active
        applying={false}
        onApply={vi.fn()}
      />,
    )
    const root = container.firstElementChild as HTMLDivElement
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      toJSON: () => ({}),
    })
    const canvas = screen.getByRole('application', { name: 'Image markup canvas' })
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(root.getBoundingClientRect())
    fireEvent.click(screen.getByRole('button', { name: 'Pin tool' }))
    fireEvent(canvas, new MouseEvent('pointerdown', { bubbles: true, clientX: 75, clientY: 25 }))

    const dragHandle = screen.getByText('Feedback for mark 1').parentElement!
    fireEvent(
      dragHandle,
      new MouseEvent('pointerdown', { bubbles: true, clientX: 75, clientY: 25 }),
    )
    fireEvent(
      dragHandle,
      new MouseEvent('pointermove', { bubbles: true, clientX: 25, clientY: 75 }),
    )
    fireEvent(
      dragHandle,
      new MouseEvent('pointerup', { bubbles: true, clientX: 25, clientY: 75 }),
    )

    expect(dragHandle.parentElement?.className).toContain('left-spacing-4 bottom-spacing-4')
  })
})
