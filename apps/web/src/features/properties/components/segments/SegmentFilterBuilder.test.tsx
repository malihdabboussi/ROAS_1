import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import type { SegmentFilters } from '@/lib/properties/segments'
import { SegmentFilterBuilder } from './SegmentFilterBuilder'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
  backendPost: vi.fn(),
}))

const mockedBackendGet = vi.mocked(backendGet)
const mockedBackendPost = vi.mocked(backendPost)

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function SegmentFilterBuilderHarness({
  onRender,
  onLeadCountChange,
}: {
  onRender: () => void
  onLeadCountChange: (count: number | null) => void
}) {
  onRender()
  const [filters, setFilters] = useState<SegmentFilters>({})

  return (
    <SegmentFilterBuilder
      filters={filters}
      onChange={setFilters}
      onLeadCountChange={onLeadCountChange}
      showPreview
    />
  )
}

describe('SegmentFilterBuilder', () => {
  beforeEach(() => {
    mockedBackendGet.mockImplementation(async (path) => {
      if (path === '/api/funnels') {
        return { funnels: [{ id: 'funnel-1', title: 'Growth Funnel' }] }
      }
      if (path === '/api/campaigns') {
        return { campaigns: [{ id: 'campaign-1', name: 'Launch Campaign' }] }
      }
      if (path === '/api/segments/filter-options') {
        return { tags: ['vip'], countries: ['United States'] }
      }
      throw new Error(`Unexpected backendGet path: ${path}`)
    })
    mockedBackendPost.mockResolvedValue({ success: true, count: 42 })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('updates loaded filters and reporting range without render churn', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T12:00:00.000Z'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onLeadCountChange = vi.fn()
    let renderCount = 0

    try {
      render(
        <SegmentFilterBuilderHarness
          onRender={() => (renderCount += 1)}
          onLeadCountChange={onLeadCountChange}
        />,
      )

      await flushAsyncWork()

      fireEvent.click(screen.getByRole('button', { name: /Funnels/ }))
      fireEvent.click(screen.getByRole('button', { name: /Growth Funnel/ }))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      expect(mockedBackendPost).toHaveBeenLastCalledWith('/api/segments/preview', {
        filters: { funnels: ['funnel-1'] },
      })
      expect(onLeadCountChange).toHaveBeenLastCalledWith(42)

      fireEvent.click(screen.getByRole('button', { name: /Date Range/ }))
      fireEvent.click(screen.getByRole('button', { name: 'All time' }))
      fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }))
      fireEvent.keyDown(document, { key: 'Escape' })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(600)
      })

      expect(mockedBackendPost).toHaveBeenLastCalledWith('/api/segments/preview', {
        filters: {
          funnels: ['funnel-1'],
          date_range: { from: '2026-06-16', to: undefined },
        },
      })

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(renderCount).toBeLessThan(35)
    } finally {
      consoleError.mockRestore()
    }
  })
})
