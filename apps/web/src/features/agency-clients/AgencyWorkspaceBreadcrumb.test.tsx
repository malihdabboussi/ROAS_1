import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgencyWorkspaceBreadcrumb } from './AgencyWorkspaceBreadcrumb'

const mocks = vi.hoisted(() => ({
  setPageBreadcrumb: vi.fn(),
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
    (selector: (state: { setPageBreadcrumb: typeof mocks.setPageBreadcrumb }) => unknown) =>
      selector({ setPageBreadcrumb: mocks.setPageBreadcrumb }),
    {
      getState: () => ({
        setPageBreadcrumb: mocks.setPageBreadcrumb,
        pageBreadcrumbOwner: null,
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
})
