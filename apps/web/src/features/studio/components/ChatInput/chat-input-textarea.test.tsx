import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInputTextarea } from './chat-input-textarea'

afterEach(cleanup)

function defaultProps() {
  return {
    textareaRef: createRef<HTMLTextAreaElement>(),
    highlightBackdropRef: createRef<HTMLDivElement>(),
    value: '/brief',
    showHighlight: true,
    renderHighlightBackdrop: vi.fn((text: string) => <span>highlight {text}</span>),
    composerPadX: 'px-spacing-2',
    compact: false,
    placeholder: 'Message Pixel',
    disabled: false,
    onFocus: vi.fn(),
    onChange: vi.fn(),
    onKeyDown: vi.fn(),
    onPaste: vi.fn(),
    onSelect: vi.fn(),
    onScroll: vi.fn(),
  }
}

describe('ChatInputTextarea', () => {
  it('renders the textarea and highlighted backdrop when slash highlighting is active', () => {
    const props = defaultProps()
    const { container } = render(<ChatInputTextarea {...props} />)

    expect(screen.getByRole('textbox').getAttribute('data-chat-input')).toBe('true')
    expect(screen.getByPlaceholderText('Message Pixel')).toBeTruthy()
    expect(screen.getByText('highlight /brief')).toBeTruthy()
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy()
    expect(props.renderHighlightBackdrop).toHaveBeenCalledWith('/brief')
  })

  it('hides the highlighted backdrop when slash highlighting is inactive', () => {
    render(<ChatInputTextarea {...defaultProps()} showHighlight={false} />)

    expect(screen.queryByText('highlight /brief')).toBeNull()
  })

  it('delegates textarea events to the parent composer', () => {
    const props = defaultProps()
    render(<ChatInputTextarea {...props} />)
    const textarea = screen.getByRole('textbox')

    fireEvent.focus(textarea)
    fireEvent.change(textarea, { target: { value: '/publish' } })
    fireEvent.keyDown(textarea, { key: 'Enter' })
    fireEvent.paste(textarea)
    fireEvent.select(textarea)
    fireEvent.scroll(textarea)

    expect(props.onFocus).toHaveBeenCalled()
    expect(props.onChange).toHaveBeenCalledTimes(1)
    expect(props.onKeyDown).toHaveBeenCalledTimes(1)
    expect(props.onPaste).toHaveBeenCalledTimes(1)
    expect(props.onSelect).toHaveBeenCalledTimes(1)
    expect(props.onScroll).toHaveBeenCalledTimes(1)
  })
})
