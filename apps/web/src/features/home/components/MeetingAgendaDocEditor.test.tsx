import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingAgendaDocEditor } from './MeetingAgendaDocEditor'

vi.mock('@/components/deliverables/SpaceDocDeliverablePreview', () => ({
  SpaceDocDeliverablePreview: ({
    itemId,
    spaceId,
    title,
  }: {
    itemId: string
    spaceId: string
    title?: string | null
  }) => (
    <div
      data-testid="meeting-agenda-doc"
      data-item-id={itemId}
      data-space-id={spaceId}
      data-title={title ?? ''}
    />
  ),
}))

describe('MeetingAgendaDocEditor', () => {
  afterEach(cleanup)

  it('embeds the Space Doc editor without remounting on live row updates', () => {
    render(
      <MeetingAgendaDocEditor spaceId="space-1" itemId="agenda-doc-1" title="Agenda — Strategy" />,
    )

    const editor = screen.getByTestId('meeting-agenda-doc')
    expect(editor.getAttribute('data-item-id')).toBe('agenda-doc-1')
    expect(editor.getAttribute('data-space-id')).toBe('space-1')
    expect(editor.getAttribute('data-title')).toBe('Agenda — Strategy')
  })
})
