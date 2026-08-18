import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingAgendaDocEditor } from './MeetingAgendaDocEditor'

const mocks = vi.hoisted(() => ({
  removeChannel: vi.fn(),
  subscribe: vi.fn(),
  on: vi.fn(),
  channel: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}))

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
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('embeds the Space Doc editor and subscribes to live updates', () => {
    mocks.on.mockReturnValue({ subscribe: mocks.subscribe })
    mocks.channel.mockReturnValue({ on: mocks.on })

    render(
      <MeetingAgendaDocEditor spaceId="space-1" itemId="agenda-doc-1" title="Agenda — Strategy" />,
    )

    const editor = screen.getByTestId('meeting-agenda-doc')
    expect(editor.getAttribute('data-item-id')).toBe('agenda-doc-1')
    expect(editor.getAttribute('data-space-id')).toBe('space-1')
    expect(mocks.channel).toHaveBeenCalledWith('meeting-agenda-doc:agenda-doc-1')
    expect(mocks.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        table: 'space_items',
        filter: 'id=eq.agenda-doc-1',
      }),
      expect.any(Function),
    )
  })
})
