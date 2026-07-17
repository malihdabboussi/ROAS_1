import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MissionDeliverable } from '@/lib/missions'
import { DeliverablePreviewActions } from './DeliverablePreviewActions'

const deliverable: MissionDeliverable = {
  id: 'deliverable-1',
  mission_id: 'mission-1',
  campaign_id: 'campaign-1',
  user_id: 'user-1',
  agent_key: 'vibey',
  type: 'doc',
  title: 'Strategy v2',
  content: '# Strategy',
  file_url: null,
  file_name: null,
  file_size: null,
  mime_type: null,
  metadata: { internalUrl: '/spaces/space-1/item-1' },
  entity_id: 'item-1',
  entity_table: 'space_items',
  source: 'mission',
  created_at: '2026-07-17T20:00:00.000Z',
}

describe('DeliverablePreviewActions', () => {
  afterEach(cleanup)

  it('groups destination, copy, export, expand, and close actions', () => {
    const onCopy = vi.fn().mockResolvedValue(undefined)
    const onExportMd = vi.fn()
    const onExportPdf = vi.fn().mockResolvedValue(undefined)
    const onToggleExpanded = vi.fn()
    const onClose = vi.fn()

    render(
      <DeliverablePreviewActions
        deliverable={deliverable}
        mode="text"
        copied={false}
        exporting={false}
        exportAvailable
        expanded={false}
        onCopy={onCopy}
        onExportMd={onExportMd}
        onExportPdf={onExportPdf}
        onEntityExport={vi.fn()}
        onToggleExpanded={onToggleExpanded}
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('link', { name: 'Open in Space' }).getAttribute('href')).toBe(
      '/spaces/space-1/item-1',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy document' }))
    expect(onCopy).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'More document actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Download as Markdown' }))
    expect(onExportMd).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'More document actions' }))
    fireEvent.click(screen.getByRole('button', { name: 'Print as PDF' }))
    expect(onExportPdf).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Expand document' }))
    expect(onToggleExpanded).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close document' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
