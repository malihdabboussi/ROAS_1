import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceItem } from '@/lib/spaces'
import { ClientCampaignCell } from './ClientCampaignCell'

const mocks = vi.hoisted(() => ({
  useClientCampaignGroups: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/agency-clients', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/agency-clients')>('@/lib/agency-clients')
  return {
    ...actual,
    useClientCampaignGroups: mocks.useClientCampaignGroups,
  }
})

vi.mock('sonner', () => ({
  toast: {
    error: mocks.toastError,
  },
}))

const GROUPS = [
  {
    clientId: 'client-1',
    clientName: '1DS Collective',
    campaigns: [{ id: 'camp-a', name: 'Launch', roasSpaceId: 'space-1' }],
  },
]

const FIELD = { id: 'client_campaign', name: 'Client / Campaign', type: 'text' as const }

function callItem(title = 'ROAS team debrief'): SpaceItem {
  return {
    id: 'item-1',
    space_id: 'meetings-space',
    org_id: 'org-1',
    user_id: 'user-1',
    title,
    status: 'logged',
    priority: 'medium',
    assignee_type: 'unassigned',
    assignee_id: null,
    assignees: [],
    start_date: null,
    due_date: null,
    recurrence: null,
    description: null,
    parent_item_id: null,
    recurrence_parent_id: null,
    notes: null,
    doc_body: null,
    source: 'fathom',
    linked_mission_id: null,
    form_id: null,
    task_execution_status: null,
    sort_order: 0,
    custom_data: { entry_type: 'call' },
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    created_at: '2026-08-18T00:00:00.000Z',
    updated_at: '2026-08-18T00:00:00.000Z',
  }
}

describe('ClientCampaignCell', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('maps a meeting to a client campaign without moving it', () => {
    mocks.useClientCampaignGroups.mockReturnValue({ groups: GROUPS, failed: false })
    const onChange = vi.fn()

    render(
      <ClientCampaignCell
        field={FIELD}
        value={null}
        onChange={onChange}
        spaceItem={callItem()}
        onOpenDetail={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Map client and campaign' }))
    fireEvent.click(screen.getByRole('button', { name: /1DS Collective/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }))

    expect(onChange).toHaveBeenCalledWith({
      client_id: 'client-1',
      client_name: '1DS Collective',
      campaign_id: 'camp-a',
      campaign_name: 'Launch',
      roas_space_id: 'space-1',
    })
  })

  it('opens the meeting agenda from the Agenda link', () => {
    mocks.useClientCampaignGroups.mockReturnValue({ groups: GROUPS, failed: false })
    const onOpenDetail = vi.fn()
    const item = callItem()

    render(
      <ClientCampaignCell
        field={FIELD}
        value={null}
        onChange={vi.fn()}
        spaceItem={item}
        onOpenDetail={onOpenDetail}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open agenda for ROAS team debrief' }))
    expect(onOpenDetail).toHaveBeenCalledWith(item)
  })

  it('links the mapped client and campaign space', () => {
    mocks.useClientCampaignGroups.mockReturnValue({ groups: GROUPS, failed: false })

    render(
      <ClientCampaignCell
        field={FIELD}
        value={{
          client_id: 'client-1',
          client_name: '1DS Collective',
          campaign_id: 'camp-a',
          campaign_name: 'Launch',
          roas_space_id: 'space-1',
        }}
        onChange={vi.fn()}
        spaceItem={callItem()}
        onOpenDetail={vi.fn()}
      />,
    )

    expect(screen.getByRole('link', { name: '1DS Collective' })).toHaveAttribute(
      'href',
      '/clients/client-1',
    )
    expect(screen.getByRole('link', { name: 'Launch' })).toHaveAttribute(
      'href',
      '/spaces?space=space-1',
    )
  })

  it('renders a workspace-specific trigger while preserving the same mapping picker', () => {
    mocks.useClientCampaignGroups.mockReturnValue({ groups: GROUPS, failed: false })
    const onChange = vi.fn()

    render(
      <ClientCampaignCell
        field={{ id: 'campaign_name', name: 'Client Workspace', type: 'text' }}
        value={null}
        onChange={onChange}
        displayMode="client"
        spaceItem={callItem()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Select client workspace' }))
    fireEvent.click(screen.getByRole('button', { name: /1DS Collective/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ client_name: '1DS Collective', campaign_name: 'Launch' }),
    )
  })
})
