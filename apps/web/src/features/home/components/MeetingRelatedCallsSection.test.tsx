import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingRelatedCallsSection } from './MeetingRelatedCallsSection'

vi.mock('@/components/work-views/AllMeetingsNativeList', () => ({
  AllMeetingsNativeList: ({ items }: { items: Array<{ id: string; title: string }> }) => (
    <div>
      {items.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  ),
}))

describe('MeetingRelatedCallsSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders related calls through the All Meetings list', () => {
    render(
      <MeetingRelatedCallsSection
        spaceId="space-1"
        onReload={async () => undefined}
        calls={[
          {
            meeting_item_id: 'call-2',
            title: 'Cydcor weekly last week',
            call_date: '2026-08-11T17:00:00.000Z',
            call_status: 'completed',
            recording_url: 'https://fathom.video/calls/2',
            score: 100,
            item: {
              id: 'call-2',
              title: 'Cydcor weekly last week',
              custom_data: { entry_type: 'call' },
            },
          },
        ]}
      />,
    )
    expect(screen.getByText('Related calls')).toBeInTheDocument()
    expect(screen.getByText('Cydcor weekly last week')).toBeInTheDocument()
  })
})
