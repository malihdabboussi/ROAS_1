import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceItem } from '@/lib/spaces'
import { MeetingLocationCell } from './MeetingLocationCell'

vi.mock('@/lib/work-items', async () => {
  const actual = await vi.importActual<typeof import('@/lib/work-items')>('@/lib/work-items')
  return {
    ...actual,
    useSpaceMappingIndex: () =>
      new Map([
        [
          'space-1',
          {
            spaceTitle: 'Ad Production',
            campaignName: 'General',
            pathLabel: 'ROAS · General · Ad Production',
          },
        ],
      ]),
  }
})

const WORKSPACE_FIELD = { id: 'campaign_name', name: 'Client Workspace', type: 'text' as const }
const SPACE_FIELD = { id: 'space_title', name: 'Campaign Space', type: 'text' as const }

function callItem(): SpaceItem {
  return {
    id: 'item-1',
    space_id: 'meetings-space',
    org_id: 'org-1',
    user_id: 'user-1',
    title: 'Cydcor weekly',
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
    custom_data: {
      entry_type: 'call',
      client_campaign: {
        client_id: 'cydcor',
        client_name: 'Cydcor',
        campaign_id: 'launch',
        campaign_name: 'Launch',
        roas_space_id: 'space-1',
      },
    },
    is_private: false,
    share_link_enabled: false,
    share_token: null,
    created_at: '2026-08-18T00:00:00.000Z',
    updated_at: '2026-08-18T00:00:00.000Z',
  }
}

describe('MeetingLocationCell', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows Client Workspace like All Tasks', () => {
    render(
      <MeetingLocationCell
        field={WORKSPACE_FIELD}
        value={null}
        onChange={vi.fn()}
        spaceItem={callItem()}
      />,
    )
    expect(screen.getByRole('link', { name: 'General' })).toHaveAttribute('href', '/clients/cydcor')
  })

  it('shows Campaign Space like All Tasks', () => {
    render(
      <MeetingLocationCell
        field={SPACE_FIELD}
        value={null}
        onChange={vi.fn()}
        spaceItem={callItem()}
      />,
    )
    expect(screen.getByRole('link', { name: 'Ad Production' })).toHaveAttribute(
      'href',
      '/spaces?space=space-1',
    )
  })

  it('shows an em dash when the call is unmapped', () => {
    const item = callItem()
    item.custom_data = { entry_type: 'call' }
    render(
      <MeetingLocationCell
        field={WORKSPACE_FIELD}
        value={null}
        onChange={vi.fn()}
        spaceItem={item}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
