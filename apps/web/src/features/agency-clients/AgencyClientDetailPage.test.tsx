import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAgencyClient, updateAgencyWorkspaceEntity } from '@/lib/agency-clients'
import { AgencyClientDetailPage } from './AgencyClientDetailPage'

vi.mock('@/lib/agency-clients', () => ({
  fetchAgencyClient: vi.fn(),
  updateAgencyWorkspaceEntity: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

const workspace = {
  client: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Clogged Club',
    display_name: 'Clogged Club',
    status: 'active',
    pipeline_stage: 'active',
    overview: 'Current account overview',
    mapping: { campaign_id: 'roas-campaign-1' },
  },
  campaigns: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      client_id: '11111111-1111-1111-1111-111111111111',
      name: 'Evergreen leads',
      status: 'active',
      platform_status: 'active',
      start_date: null,
      end_date: null,
      event_date: '2026-08-20',
      budget_amount: 5000,
      budget_type: 'monthly',
      currency: '$',
      next_action: 'Review creative',
      roas_space_id: 'space-1',
    },
  ],
  tasks: [],
  requests: [],
  mapping: { campaign_id: 'roas-campaign-1' },
  campaign_spaces: [
    {
      page_grader_campaign_id: '22222222-2222-2222-2222-222222222222',
      space_id: 'space-1',
      space_title: 'Evergreen leads',
    },
  ],
}

describe('AgencyClientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchAgencyClient).mockResolvedValue(workspace as never)
    vi.mocked(updateAgencyWorkspaceEntity).mockResolvedValue({ success: true } as never)
  })

  afterEach(cleanup)

  it('shows the client workspace before the background Brain mapping pass completes', async () => {
    const neverFinishes = new Promise<never>(() => undefined)
    vi.mocked(fetchAgencyClient)
      .mockResolvedValueOnce({ ...workspace, mapping: null, campaign_spaces: [] } as never)
      .mockReturnValueOnce(neverFinishes)

    render(<AgencyClientDetailPage clientId="11111111-1111-1111-1111-111111111111" />)

    expect(await screen.findByText('CLOGGED CLUB')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchAgencyClient).toHaveBeenNthCalledWith(
        1,
        '11111111-1111-1111-1111-111111111111',
        false,
      )
      expect(fetchAgencyClient).toHaveBeenNthCalledWith(
        2,
        '11111111-1111-1111-1111-111111111111',
        true,
      )
    })
  })

  it('writes client edits through Page Grader and refreshes the ROAS workspace', async () => {
    render(<AgencyClientDetailPage clientId="11111111-1111-1111-1111-111111111111" />)
    await screen.findByText('CLOGGED CLUB')

    fireEvent.click(screen.getByRole('button', { name: 'Edit client' }))
    fireEvent.change(screen.getByLabelText('Client name'), {
      target: { value: 'Clogged Club Australia' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateAgencyWorkspaceEntity).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        expect.objectContaining({
          kind: 'client',
          patch: expect.objectContaining({ friendly_name: 'Clogged Club Australia' }),
        }),
      )
    })
    expect(fetchAgencyClient).toHaveBeenCalledTimes(3)
  })

  it('writes campaign edits and refreshes the canonical campaign Space mapping', async () => {
    render(<AgencyClientDetailPage clientId="11111111-1111-1111-1111-111111111111" />)
    await screen.findByText('CLOGGED CLUB')
    fireEvent.click(screen.getByRole('button', { name: 'Campaigns 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit campaign Evergreen leads' }))

    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '6500' } })
    fireEvent.change(screen.getByLabelText('Next action'), {
      target: { value: 'Launch new creative batch' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateAgencyWorkspaceEntity).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        expect.objectContaining({
          kind: 'campaign',
          entity_id: '22222222-2222-2222-2222-222222222222',
          patch: expect.objectContaining({
            budget_amount: 6500,
            next_action: 'Launch new creative batch',
          }),
        }),
      )
    })
    expect(fetchAgencyClient).toHaveBeenCalledTimes(3)
  })

  it('keeps Page Grader request statuses in their native vocabulary', async () => {
    vi.mocked(fetchAgencyClient).mockResolvedValue({
      ...workspace,
      requests: [
        {
          id: '33333333-3333-3333-3333-333333333333',
          title: 'Approve new creatives',
          status: 'in_progress',
        },
      ],
    } as never)

    render(<AgencyClientDetailPage clientId="11111111-1111-1111-1111-111111111111" />)
    await screen.findByText('CLOGGED CLUB')
    fireEvent.click(screen.getByRole('button', { name: 'Requests 1' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Update request status' }), {
      target: { value: 'completed' },
    })

    await waitFor(() => {
      expect(updateAgencyWorkspaceEntity).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        {
          kind: 'request',
          entity_id: '33333333-3333-3333-3333-333333333333',
          patch: { status: 'completed' },
        },
      )
    })
  })
})
