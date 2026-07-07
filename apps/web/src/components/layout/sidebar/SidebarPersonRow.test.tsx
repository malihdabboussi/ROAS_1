import { Profiler, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrgMember, OrgPerson } from '@/lib/org'
import { SidebarPersonRow } from './SidebarPersonRow'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  openAccountSettings: vi.fn(),
  removeMember: vi.fn(),
  changeMemberRole: vi.fn(),
  reloadPeople: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  openInNewTab: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string
    children: ReactNode
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
    [key: string]: unknown
  }) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

vi.mock('@/features/settings/contexts/AccountSettingsModalContext', () => ({
  useAccountSettingsModal: () => ({ openAccountSettings: mocks.openAccountSettings }),
}))

vi.mock('@/lib/settings/account-settings-modal-context', () => ({
  useAccountSettingsModal: () => ({ openAccountSettings: mocks.openAccountSettings }),
}))

vi.mock('@/features/org/services/org.service', () => ({
  orgService: {
    changeMemberRole: mocks.changeMemberRole,
    removeMember: mocks.removeMember,
  },
}))

vi.mock('@/lib/org', () => ({
  orgService: {
    changeMemberRole: mocks.changeMemberRole,
    removeMember: mocks.removeMember,
  },
  peopleCache: {
    reload: mocks.reloadPeople,
  },
}))

vi.mock('@/features/team-2/hooks/use-org-people', () => ({
  peopleCache: {
    reload: mocks.reloadPeople,
  },
}))

vi.mock('@/lib/utils/open-in-new-tab', () => ({
  openInNewTab: mocks.openInNewTab,
}))

function personFixture(overrides: Partial<OrgPerson> = {}): OrgPerson {
  return {
    user_id: 'user-2',
    display_name: 'Mira',
    avatar_url: null,
    status_emoji: null,
    status_text: null,
    org_role: 'admin',
    last_dm_at: null,
    ...overrides,
  }
}

function memberFixture(overrides: Partial<OrgMember> = {}): OrgMember {
  return {
    id: 'member-2',
    user_id: 'user-2',
    role: 'admin',
    status: 'active',
    accepted_at: null,
    created_at: '2026-06-24T00:00:00.000Z',
    profiles: null,
    ...overrides,
  }
}

function renderPersonRow(overrides: Partial<React.ComponentProps<typeof SidebarPersonRow>> = {}) {
  const member = memberFixture()
  const props: React.ComponentProps<typeof SidebarPersonRow> = {
    person: personFixture(),
    isActive: false,
    unreadCount: 3,
    activeOrgId: 'org-1',
    currentUserId: 'user-current',
    canManageMembers: true,
    getMemberByUserId: vi.fn((userId) => (userId === member.user_id ? member : null)),
    onMembersChanged: vi.fn(),
    onOpenMessage: vi.fn(),
    ...overrides,
  }

  const view = render(<SidebarPersonRow {...props} />)
  return { ...view, props }
}

describe('SidebarPersonRow', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        pathname: '/team',
        search: '?dm=user-2',
      },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => undefined) },
      configurable: true,
    })
    mocks.removeMember.mockResolvedValue({ success: true })
    mocks.changeMemberRole.mockResolvedValue({ success: true })
    mocks.reloadPeople.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the person DM link and opens the current message route from the menu', async () => {
    const { props } = renderPersonRow()

    expect(screen.getByRole('link', { name: /mira/i }).getAttribute('href')).toBe(
      '/team?dm=user-2',
    )
    expect(screen.queryByText('3')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /person actions/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /open message/i }))

    expect(props.onOpenMessage).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith('/team?dm=user-2')
  })

  it('keeps remove-member confirmation behavior and settles without repeated render churn', async () => {
    let commits = 0
    const onMembersChanged = vi.fn()

    render(
      <Profiler id="sidebar-person-row" onRender={() => (commits += 1)}>
        <SidebarPersonRow
          person={personFixture()}
          isActive={false}
          unreadCount={0}
          activeOrgId="org-1"
          currentUserId="user-current"
          canManageMembers
          getMemberByUserId={() => memberFixture()}
          onMembersChanged={onMembersChanged}
        />
      </Profiler>,
    )

    fireEvent.click(screen.getByRole('button', { name: /person actions/i }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /remove from organization/i }))

    expect(await screen.findByRole('heading', { name: /remove from organization/i })).not.toBeNull()
    fireEvent.change(screen.getByPlaceholderText('Mira'), { target: { value: 'Mira' } })
    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }))

    await waitFor(() => {
      expect(mocks.removeMember).toHaveBeenCalledWith('org-1', 'member-2')
    })
    expect(mocks.reloadPeople).toHaveBeenCalledTimes(1)
    expect(onMembersChanged).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith('/team')
    expect(commits).toBeLessThan(10)
  })
})
