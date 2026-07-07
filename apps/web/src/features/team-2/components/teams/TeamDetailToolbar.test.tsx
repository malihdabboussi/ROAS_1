import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TeamDetailToolbar, type TeamDetailToolbarProps } from './TeamDetailToolbar'

type ToolbarCampaign = TeamDetailToolbarProps['campaigns'][number]
type ToolbarSpace = TeamDetailToolbarProps['spaceOptions'][number]

function campaign(overrides: Partial<ToolbarCampaign>): ToolbarCampaign {
  return {
    id: 'campaign-1',
    user_id: 'user-1',
    name: 'Campaign',
    campaign_type: 'standard',
    status: 'active',
    config: {},
    metrics: {},
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function space(overrides: Partial<ToolbarSpace>): ToolbarSpace {
  return {
    id: 'space-1',
    title: 'Space',
    schema: {
      icon: 'layout-grid',
      icon_color: 'default',
    },
    ...overrides,
  }
}

function ToolbarHarness({ onRender }: { onRender: () => void }) {
  onRender()
  const [campaignFilterIds, setCampaignFilterIds] = useState<string[]>([])
  const [spaceFilterIds, setSpaceFilterIds] = useState<string[]>([])
  const [timeRange, setTimeRange] = useState<TeamDetailToolbarProps['rangeConfig']>({
    time_range: 'all',
  })
  const [addMembersOpen, setAddMembersOpen] = useState(false)

  return (
    <TeamDetailToolbar
      rangeConfig={timeRange}
      onRangePatch={(patch) => setTimeRange((prev) => ({ ...prev, ...patch }))}
      campaigns={[
        campaign({ id: 'campaign-b', name: 'Beta Campaign' }),
        campaign({ id: 'campaign-a', name: 'Alpha Campaign' }),
      ]}
      campaignFilterIds={campaignFilterIds}
      onCampaignFilterIdsChange={setCampaignFilterIds}
      spaceOptions={[
        space({ id: 'space-b', title: 'Zeta Space' }),
        space({ id: 'space-a', title: 'Alpha Space' }),
      ]}
      spaceFilterIds={spaceFilterIds}
      onSpaceFilterIdsChange={setSpaceFilterIds}
      addMembersToolbarOpen={addMembersOpen}
      onToggleAddMembersToolbar={() => setAddMembersOpen((open) => !open)}
      addMembersToolbarRef={createRef<HTMLButtonElement>()}
    />
  )
}

describe('TeamDetailToolbar', () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('updates filters and date range without render churn', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T12:00:00.000Z'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let renderCount = 0

    try {
      render(<ToolbarHarness onRender={() => (renderCount += 1)} />)

      fireEvent.click(screen.getByRole('button', { name: 'Campaigns' }))
      fireEvent.click(screen.getByRole('menuitem', { name: /Alpha Campaign/ }))
      expect(
        screen.getByRole('menuitem', { name: /Alpha Campaign/ }).getAttribute('aria-checked'),
      ).toBe('true')

      fireEvent.click(screen.getByRole('button', { name: 'Spaces' }))
      fireEvent.click(screen.getByRole('menuitem', { name: /Alpha Space/ }))
      expect(screen.getByRole('menuitem', { name: /Alpha Space/ }).getAttribute('aria-checked')).toBe(
        'true',
      )

      fireEvent.click(screen.getByRole('button', { name: 'All time' }))
      fireEvent.click(screen.getByRole('button', { name: 'Last 24 hours' }))
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.getByRole('button', { name: 'Last 24 hours' })).toBeTruthy()

      fireEvent.click(screen.getByRole('button', { name: 'Add members' }))
      expect(screen.getByRole('button', { name: 'Add members' }).getAttribute('aria-expanded')).toBe(
        'true',
      )

      const maximumDepthErrors = consoleError.mock.calls.filter((call) =>
        call.some((part) => String(part).includes('Maximum update depth')),
      )
      expect(maximumDepthErrors).toHaveLength(0)
      expect(renderCount).toBeLessThan(30)
    } finally {
      consoleError.mockRestore()
    }
  })
})
