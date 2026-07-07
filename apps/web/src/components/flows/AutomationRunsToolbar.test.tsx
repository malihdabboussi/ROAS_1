import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  AutomationRunsToolbar,
  type RunHistoryGroupBy,
  type RunHistoryGroupSort,
  type RunHistoryStatusFilter,
} from './AutomationRunsToolbar'

interface MockReportingTimeRangeSelectorProps {
  onConfigPatch: (patch: { time_range?: string }) => void
}

vi.mock('@/components/reporting', () => ({
  ReportingTimeRangeSelector: ({ onConfigPatch }: MockReportingTimeRangeSelectorProps) => (
    <button type="button" aria-label="All time" onClick={() => onConfigPatch({ time_range: '7d' })}>
      All time
    </button>
  ),
}))

function ToolbarHarness({ onRender }: { onRender: () => void }) {
  onRender()
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [groupBy, setGroupBy] = useState<RunHistoryGroupBy>('none')
  const [groupSort, setGroupSort] = useState<RunHistoryGroupSort>('asc')
  const [statusFilter, setStatusFilter] = useState<RunHistoryStatusFilter>('all')
  const [timeRange, setTimeRange] = useState('all')

  return (
    <AutomationRunsToolbar
      search={search}
      onSearchChange={setSearch}
      searchOpen={searchOpen}
      onSearchOpenChange={setSearchOpen}
      groupBy={groupBy}
      onGroupByChange={setGroupBy}
      groupSort={groupSort}
      onGroupSortChange={setGroupSort}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      dateConfig={{ time_range: timeRange as never }}
      onDateConfigPatch={(patch) => setTimeRange((patch.time_range as string) ?? timeRange)}
    />
  )
}

describe('AutomationRunsToolbar', () => {
  it('changes grouping and sort without render churn', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let renderCount = 0

    try {
      render(<ToolbarHarness onRender={() => (renderCount += 1)} />)

      fireEvent.click(screen.getByLabelText('Group run history'))
      fireEvent.click(screen.getByRole('button', { name: 'None' }))
      fireEvent.click(screen.getByRole('button', { name: 'Flow' }))
      expect(screen.getByLabelText('Group run history').textContent).toContain('Flow')

      fireEvent.click(screen.getByLabelText('Group run history'))
      fireEvent.click(screen.getByRole('button', { name: 'A-Z' }))
      fireEvent.click(screen.getByRole('button', { name: 'Descending' }))

      fireEvent.click(screen.getByLabelText('All time'))

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(renderCount).toBeLessThan(20)
    } finally {
      consoleError.mockRestore()
    }
  })
})
