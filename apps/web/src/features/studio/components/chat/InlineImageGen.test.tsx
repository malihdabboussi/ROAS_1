import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GeneratedImage } from './InlineImageGen'

describe('GeneratedImage', () => {
  afterEach(cleanup)

  it('fits the complete image without a prompt caption card', () => {
    render(<GeneratedImage url="https://example.com/dog.png" prompt="Dog" />)

    const image = screen.getByAltText('Dog')
    fireEvent.load(image)

    expect(image).toHaveClass('object-contain')
    expect(image).not.toHaveClass('object-cover')
    expect(screen.queryByText('Dog')).not.toBeInTheDocument()
  })
})
