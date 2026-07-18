import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CustomFieldDefinition } from '@/lib/properties/custom-fields'
import type { Segment } from '@/lib/properties/segments'
import { CustomFieldDeleteDialog } from './custom-fields/CustomFieldDeleteDialog'
import { SegmentDeleteDialog } from './segments/SegmentDeleteDialog'

describe('property delete dialogs', () => {
  it('describes the segment being deleted and names its close action', () => {
    const onOpenChange = vi.fn()
    render(
      <SegmentDeleteDialog
        open
        onOpenChange={onOpenChange}
        deletingSegment={{ name: 'High intent' } as Segment}
        isDeleting={false}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Delete Segment' })).toHaveAccessibleDescription(
      /High intent.*cannot be undone/,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('describes the custom field being deleted and names its close action', () => {
    render(
      <CustomFieldDeleteDialog
        open
        onOpenChange={vi.fn()}
        deletingField={{ name: 'Lead score' } as CustomFieldDefinition}
        isDeleting={false}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Delete Custom Field' })).toHaveAccessibleDescription(
      /Lead score/,
    )
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy()
  })
})
