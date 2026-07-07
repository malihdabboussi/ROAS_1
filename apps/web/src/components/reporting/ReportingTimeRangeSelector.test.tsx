import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { ReportingTimeRangeSelector } from './ReportingTimeRangeSelector'
import type { ReportingDateRangeInput } from '@/lib/reporting/resolve-reporting-dates'

function SelectorHarness({ onRender }: { onRender: () => void }) {
  onRender()
  const [config, setConfig] = useState<ReportingDateRangeInput>({ time_range: 'all' })

  return (
    <ReportingTimeRangeSelector
      variant="badge"
      config={config}
      onConfigPatch={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
    />
  )
}

describe('ReportingTimeRangeSelector', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('selects preset ranges from the mounted dropdown', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T12:00:00.000Z'))
    const onConfigPatch = vi.fn()

    render(
      <ReportingTimeRangeSelector
        variant="badge"
        config={{ time_range: 'all' }}
        onConfigPatch={onConfigPatch}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'All time' }))
    expect(screen.getByRole('button', { name: 'Last 24 hours' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'This quarter' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Last 24 hours' }))
    expect(onConfigPatch).toHaveBeenCalledWith({
      time_range: '24h',
      custom_start: undefined,
      custom_end: undefined,
    })
  })

  it('updates custom end dates without render churn', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T12:00:00.000Z'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onConfigPatch = vi.fn()
    let renderCount = 0

    try {
      render(
        <>
          <SelectorHarness onRender={() => (renderCount += 1)} />
          <ReportingTimeRangeSelector
            variant="chip"
            config={{ custom_start: '2026-06-01', custom_end: '2026-06-10' }}
            onConfigPatch={onConfigPatch}
          />
        </>,
      )

      fireEvent.click(screen.getByRole('button', { name: /Jun 1/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Jun 10' }))
      fireEvent.click(screen.getByRole('button', { name: '15' }))

      expect(onConfigPatch).toHaveBeenCalledWith({
        custom_end: '2026-06-15',
        time_range: undefined,
      })

      fireEvent.keyDown(document, { key: 'Escape' })
      fireEvent.click(screen.getByRole('button', { name: 'All time' }))
      fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }))

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
