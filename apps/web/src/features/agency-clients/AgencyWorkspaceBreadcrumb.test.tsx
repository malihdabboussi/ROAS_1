import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgencyWorkspaceBreadcrumb } from './AgencyWorkspaceBreadcrumb'

const mocks = vi.hoisted(() => ({
  setPageBreadcrumb: vi.fn(),
  setPageHeaderAction: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: Object.assign(
    (
      selector: (state: {
        setPageBreadcrumb: typeof mocks.setPageBreadcrumb
        setPageHeaderAction: typeof mocks.setPageHeaderAction
      }) => unknown,
    ) =>
      selector({
        setPageBreadcrumb: mocks.setPageBreadcrumb,
        setPageHeaderAction: mocks.setPageHeaderAction,
      }),
    {
      getState: () => ({
        setPageBreadcrumb: mocks.setPageBreadcrumb,
        setPageHeaderAction: mocks.setPageHeaderAction,
        pageBreadcrumbOwner: null,
        pageHeaderActionOwner: null,
      }),
    },
  ),
}))

describe('AgencyWorkspaceBreadcrumb', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('registers Clients / selected client as the shell breadcrumb', () => {
    render(
      <AgencyWorkspaceBreadcrumb
        items={[{ href: '/clients', label: 'Clients' }, { label: 'Clogged Club' }]}
      />,
    )

    expect(mocks.setPageBreadcrumb).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Object),
      'Clients / Clogged Club',
    )
    const trail = mocks.setPageBreadcrumb.mock.calls[0]?.[0] as React.ReactNode
    render(<>{trail}</>)
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('href', '/clients')
    expect(screen.getByText('Clogged Club')).toBeInTheDocument()
  })

  it('registers a header action into the shell top bar', () => {
    render(
      <AgencyWorkspaceBreadcrumb
        items={[{ label: 'Clients' }]}
        action={
          <a href="/clients?surface=portal" className="button-compact button-glass-purple">
            Portal
          </a>
        }
      />,
    )

    expect(mocks.setPageHeaderAction).toHaveBeenCalledWith(expect.anything(), expect.any(Object))
    const action = mocks.setPageHeaderAction.mock.calls[0]?.[0] as React.ReactNode
    render(<>{action}</>)
    expect(screen.getByRole('link', { name: 'Portal' })).toHaveAttribute(
      'href',
      '/clients?surface=portal',
    )
  })
})
