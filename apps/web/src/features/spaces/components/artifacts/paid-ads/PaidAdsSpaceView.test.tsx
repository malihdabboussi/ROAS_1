import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ViewDef } from '@/features/spaces/types/space-schema'
import { PaidAdsSpaceView } from './PaidAdsSpaceView'

const paidAdsDataMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/artifacts/paid-ads/AdsPerformanceViewAdapter', () => ({
  AdsPerformanceView: ({ campaignId }: { campaignId: string }) => (
    <div data-testid="paid-ads-reporting" data-campaign-id={campaignId} />
  ),
}))

vi.mock('./PaidAdsMetaSetupBar', () => ({
  PaidAdsMetaSetupBar: () => <div data-testid="meta-setup" />,
}))

vi.mock('./PaidAdsAdSetsPane', () => ({ PaidAdsAdSetsPane: () => null }))
vi.mock('./PaidAdsCreativesPane', () => ({ PaidAdsCreativesPane: () => null }))
vi.mock('./PaidAdsStructurePane', () => ({ PaidAdsStructurePane: () => null }))
vi.mock('@/lib/artifacts/paid-ads-api', () => ({ createAdsBulk: vi.fn() }))

vi.mock('./use-paid-ads-data', () => ({
  usePaidAdsData: paidAdsDataMock,
}))

vi.mock('../use-artifact-detail-query', () => ({
  useArtifactDetailQuery: () => ({ setArtifactQuery: vi.fn() }),
}))

function makeView(): ViewDef {
  return {
    id: 'paid-ads',
    type: 'ads',
    name: 'Paid Ads',
  }
}

describe('PaidAdsSpaceView', () => {
  afterEach(() => {
    cleanup()
    paidAdsDataMock.mockReset()
  })

  it('defaults to Meta analysis without loading launch data', () => {
    render(
      <PaidAdsSpaceView
        campaignId="campaign-1"
        spaceId="space-1"
        activeView={makeView()}
        selection={null}
        onSelectionChange={vi.fn()}
        includeCampaignArtifacts={false}
      />,
    )

    expect(screen.getByTestId('meta-setup')).toBeVisible()
    expect(screen.getByTestId('paid-ads-reporting')).toHaveAttribute(
      'data-campaign-id',
      'campaign-1',
    )
    expect(paidAdsDataMock).not.toHaveBeenCalled()
  })
})
