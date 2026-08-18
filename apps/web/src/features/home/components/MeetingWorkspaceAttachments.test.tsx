import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingWorkspaceAttachments } from './MeetingWorkspaceAttachments'

const openDocumentInShell = vi.hoisted(() => vi.fn())

vi.mock('@/lib/artifacts', () => ({
  openDocumentInShell,
}))

describe('MeetingWorkspaceAttachments', () => {
  afterEach(() => {
    cleanup()
    openDocumentInShell.mockClear()
  })

  it('opens attachments in the shell viewer', () => {
    render(
      <MeetingWorkspaceAttachments
        spaceId="space-1"
        loading={false}
        deliverables={[
          {
            id: 'doc-1',
            title: 'Transcript — Leadership',
            source: 'fathom',
            custom_data: {},
          },
        ]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Transcript — Leadership' }))
    expect(openDocumentInShell).toHaveBeenCalledWith({
      documentId: 'doc-1',
      spaceItemId: 'doc-1',
      spaceId: 'space-1',
      title: 'Transcript — Leadership',
    })
  })

  it('renders attachment rows without a second heading when embedded', () => {
    render(
      <MeetingWorkspaceAttachments
        spaceId="space-1"
        loading={false}
        embedded
        deliverables={[
          {
            id: 'doc-1',
            title: 'Transcript — Leadership',
            source: 'fathom',
            custom_data: {},
          },
        ]}
      />,
    )

    expect(screen.queryByText('Attachments')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transcript — Leadership' })).toBeInTheDocument()
  })
})
