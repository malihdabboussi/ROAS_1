import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAgencyLaunches } from '@/lib/agency-clients'
import { LaunchesPage } from './LaunchesPage'

const openArtifactInShell = vi.fn()

vi.mock('@/lib/agency-clients', () => ({ fetchAgencyLaunches: vi.fn() }))
vi.mock('@/lib/artifacts', () => ({
  openArtifactInShell: (...args: unknown[]) => openArtifactInShell(...args),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/shell/ShellBreadcrumb', () => ({
  ShellBreadcrumb: () => null,
}))

vi.mock('@/components/shell/ShellHeaderAction', () => ({
  ShellHeaderAction: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const launch = {
  id: '22222222-2222-2222-2222-222222222222:launch:2026-08-20',
  kind: 'launch',
  day_key: '2026-08-20',
  starts_at: null,
  name: 'Fall Launch',
  campaign_id: '22222222-2222-2222-2222-222222222222',
  campaign_name: 'Evergreen Leads',
  client_id: '11111111-1111-1111-1111-111111111111',
  client_name: 'Clogged Club',
  assignee_name: 'Sam',
  portal_path: '/campaigns/22222222-2222-2222-2222-222222222222',
  roas_space_id: null,
}

describe('LaunchesPage', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(cleanup)

  it('shows launches before the background Space mapping pass completes', async () => {
    const neverFinishes = new Promise<never>(() => undefined)
    vi.mocked(fetchAgencyLaunches)
      .mockResolvedValueOnce({ launches: [launch] } as never)
      .mockReturnValueOnce(neverFinishes)

    render(<LaunchesPage />)

    expect(await screen.findByText('Fall Launch')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'LAUNCHES' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Portal' })).toHaveAttribute(
      'href',
      '/launches?surface=portal&portal_path=/launches',
    )
    fireEvent.click(screen.getByRole('button', { name: /Fall Launch/i }))
    expect(openArtifactInShell).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTable: 'page_grader_launches',
        title: 'Fall Launch',
        type: 'custom_object',
      }),
    )
    expect(screen.queryByRole('status', { name: 'Loading launches...' })).not.toBeInTheDocument()
    await waitFor(() => {
      expect(fetchAgencyLaunches).toHaveBeenNthCalledWith(1, undefined, false)
      expect(fetchAgencyLaunches).toHaveBeenNthCalledWith(2, undefined, true)
    })
  })
})
