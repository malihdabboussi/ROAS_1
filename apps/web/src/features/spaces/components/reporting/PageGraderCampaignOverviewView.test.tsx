import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAgencyCampaignOverview } from '@/lib/agency-clients'
import { PageGraderCampaignOverviewView } from './PageGraderCampaignOverviewView'

vi.mock('@/lib/agency-clients', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/agency-clients')>('@/lib/agency-clients')
  return { ...actual, fetchAgencyCampaignOverview: vi.fn() }
})

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text: string }) => <span>{text}</span>,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PageGraderCampaignOverviewView', () => {
  it('shows campaign requests before mapped performance and opens the native task surface', async () => {
    vi.mocked(fetchAgencyCampaignOverview).mockResolvedValue({
      campaign: {
        id: 'campaign-1',
        client_id: 'client-1',
        name: 'August Webinar',
        status: 'building',
        platform_status: 'building',
        campaign_type: 'webinar',
      },
      tasks: [
        {
          id: 'work-1',
          client_id: 'client-1',
          campaign_id: 'campaign-1',
          task_description: 'Build registration page',
          status: 'in_progress',
          priority: 'high',
          roas_space_item_id: 'native-task-1',
        },
      ],
      performance: {
        spend: 1250,
        leads: 100,
        conversions: 12,
        cost_per_lead: 12.5,
        cpm: 22,
      },
      top_ads: [
        {
          ad_id: 'ad-1',
          ad_name: 'Founder story',
          campaign_name: 'August Webinar',
          spend: 400,
          conversions: 8,
          cost_per_conversion: 50,
          ctr: 2.4,
        },
      ],
      linked_meta_campaign_ids: ['meta-1'],
      snapshot_at: '2026-08-24T12:00:00.000Z',
      top_ads_error: null,
      provenance: { source: 'page_grader', generated_at: '2026-08-24T12:00:00.000Z' },
    } as never)
    const onOpenTask = vi.fn()

    render(
      <PageGraderCampaignOverviewView
        clientId="client-1"
        pageGraderCampaignId="campaign-1"
        spaceItems={[]}
        spaceId="space-1"
        onOpenTask={onOpenTask}
      />,
    )

    await waitFor(() => expect(screen.getByText('Build registration page')).toBeInTheDocument())
    expect(screen.getByText('Campaign requests')).toBeInTheDocument()
    expect(screen.getByText('Performance snapshot')).toBeInTheDocument()
    expect(screen.getByText('Best-performing ads')).toBeInTheDocument()
    expect(screen.getByText('Founder story')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Build registration page'))
    expect(onOpenTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'native-task-1', title: 'Build registration page' }),
    )
  })
})
