import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DocEditorTitleHeaderLayout } from './DocEditorTitleHeaderLayout'

describe('DocEditorTitleHeaderLayout', () => {
  afterEach(cleanup)

  it('places the actions above a full-width title row', () => {
    render(
      <DocEditorTitleHeaderLayout
        actions={<span>Document actions</span>}
        title={
          <input aria-label="Document title" value="WEB#2 — Post-Call Strategy Map" readOnly />
        }
      />,
    )

    const actions = screen.getByText('Document actions')
    const title = screen.getByRole('textbox', { name: 'Document title' })

    expect(actions.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(title.parentElement?.className).toContain('w-full')
    expect(title.parentElement?.getAttribute('style')).toBeNull()
  })
})
