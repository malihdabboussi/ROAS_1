import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceItem } from '@/lib/spaces'
import { SpaceFieldIdCell } from './SpaceFieldIdCell'

const mocks = vi.hoisted(() => ({
  useClientCampaignGroups: vi.fn(),
}))

vi.mock('@/lib/agency-clients', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/agency-clients')>('@/lib/agency-clients')
  return {
    ...actual,
    useClientCampaignGroups: mocks.useClientCampaignGroups,
  }
})

function callItem(): SpaceItem {
  return {
    id: 'item-1',
    space_id: 'meetings-space',
    org_id: 'org-1',
    user_id: 'user-1',
    title: '1DS weekly growth review',
    status: 'logged',
    priority: null,
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

describe('SpaceFieldIdCell meeting workspace fields', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens the client picker and persists a manual General workspace mapping', () => {
    mocks.useClientCampaignGroups.mockReturnValue({
      groups: [
        {
          clientId: 'client-1',
          clientName: '1DS Collective',
          campaigns: [{ id: 'general', name: 'General', roasSpaceId: 'space-general' }],
        },
      ],
      failed: false,
    })
    const onItemPatch = vi.fn()

    render(
      <SpaceFieldIdCell
        field={{ id: 'campaign_name', name: 'Client Workspace', type: 'text' }}
        value={null}
        onChange={vi.fn()}
        spaceItem={callItem()}
        onItemPatch={onItemPatch}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Select client workspace' }))
    fireEvent.click(screen.getByRole('button', { name: /1DS Collective/ }))
    fireEvent.click(screen.getByRole('button', { name: 'General' }))

    expect(onItemPatch).toHaveBeenCalledWith({
      custom_data: {
        entry_type: 'call',
        client_campaign: {
          client_id: 'client-1',
          client_name: '1DS Collective',
          campaign_id: 'general',
          campaign_name: 'General',
          roas_space_id: 'space-general',
        },
        client_campaign_source: 'manual',
      },
    })
  })
})
