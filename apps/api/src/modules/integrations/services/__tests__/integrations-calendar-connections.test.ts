import { describe, expect, it } from 'vitest'
import {
  filterCalendarRowsOwnedByUser,
  listConnectedCalendarAccounts,
  pickBestCalendarConnectionRow,
} from '../integrations-calendar-connections'

describe('integrations-calendar-connections', () => {
  it('lists all connected Google accounts and marks a synthetic default when none set', () => {
    const accounts = listConnectedCalendarAccounts(
      [
        {
          id: 'ui-1',
          status: 'connected',
          connection_label: 'work@roas.io',
          is_default: false,
          metadata: { composio_connected_account_id: 'ca-1' },
        },
        {
          id: 'ui-2',
          status: 'connected',
          connection_label: 'personal@gmail.com',
          is_default: false,
          metadata: { composio_connected_account_id: 'ca-2' },
        },
      ],
      'google_calendar',
    )
    expect(accounts).toHaveLength(2)
    expect(accounts.filter((account) => account.isDefault)).toHaveLength(1)
    expect(accounts.map((account) => account.composioAccountId).sort()).toEqual(['ca-1', 'ca-2'])
  })

  it('prefers is_default personal connection for sends', () => {
    const row = pickBestCalendarConnectionRow(
      [
        {
          id: 'ui-1',
          user_id: 'user-1',
          status: 'connected',
          scope_mode: 'personal',
          is_default: false,
          metadata: { composio_connected_account_id: 'ca-personal' },
        },
        {
          id: 'ui-2',
          user_id: 'user-1',
          status: 'connected',
          scope_mode: 'personal',
          is_default: true,
          metadata: { composio_connected_account_id: 'ca-work' },
        },
      ],
      'user-1',
      null,
    )
    expect(row?.id).toBe('ui-2')
  })

  it('keeps Mine limited to calendar connections owned by the caller', () => {
    const rows = filterCalendarRowsOwnedByUser(
      [
        { id: 'mine-personal', user_id: 'user-1', scope_mode: 'personal' },
        { id: 'mine-shared', user_id: 'user-1', scope_mode: 'org_shared' },
        { id: 'teammate-shared', user_id: 'user-2', scope_mode: 'org_shared' },
      ],
      'user-1',
    )

    expect(rows.map((row) => row.id)).toEqual(['mine-personal', 'mine-shared'])
  })
})
