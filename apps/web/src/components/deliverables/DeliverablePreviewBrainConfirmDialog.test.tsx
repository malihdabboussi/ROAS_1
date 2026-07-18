import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeliverablePreviewBrainConfirmDialog } from './DeliverablePreviewBrainConfirmDialog'

describe('DeliverablePreviewBrainConfirmDialog', () => {
  it('describes the selected Brain in the confirmation dialog', () => {
    render(
      <DeliverablePreviewBrainConfirmDialog
        confirmBrain={{ id: 'brain-1', label: 'Campaign Brain', type: 'campaign' }}
        setConfirmBrain={vi.fn()}
        brainIngesting={false}
        onConfirmIngest={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Ingest into Brain' })).toHaveAccessibleDescription(
      'Are you sure you want to ingest this deliverable into Campaign Brain?',
    )
  })
})
