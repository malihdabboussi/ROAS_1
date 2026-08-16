import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatCodeArtifactCopyMenu } from './ChatCodeArtifactCopyMenu'

describe('ChatCodeArtifactCopyMenu', () => {
  afterEach(cleanup)

  it('copies from the primary action and downloads from the dropdown', () => {
    const onCopy = vi.fn()
    const onDownload = vi.fn()
    render(
      <ChatCodeArtifactCopyMenu
        onCopy={onCopy}
        onDownload={onDownload}
        downloadLabel="Download as HTML"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    expect(onCopy).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'More copy actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Download as HTML' }))
    expect(onDownload).toHaveBeenCalledTimes(1)
  })
})
