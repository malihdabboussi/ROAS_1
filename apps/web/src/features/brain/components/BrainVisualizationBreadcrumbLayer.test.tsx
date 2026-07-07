import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrainVisualizationBreadcrumbLayer } from './BrainVisualizationBreadcrumbLayer'

const mocks = vi.hoisted(() => ({
  breadcrumb: vi.fn(),
}))

vi.mock('./BrainScopeBreadcrumb', () => ({
  BrainScopeBreadcrumb: (props: Record<string, unknown>) => {
    mocks.breadcrumb(props)
    return (
      <div data-testid={props.compact ? 'mobile-breadcrumb' : 'desktop-breadcrumb'}>
        {(props.scope as { label?: string } | undefined)?.label}
      </div>
    )
  },
}))

const scope = {
  id: 'customer',
  label: 'Customer Brain',
  agentId: null,
  brainId: 'brain-customer',
  scopeType: 'customer' as const,
}

describe('BrainVisualizationBreadcrumbLayer', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders compact mobile and desktop breadcrumbs with the same scope contract', () => {
    const onNavigateHome = vi.fn()

    render(
      <BrainVisualizationBreadcrumbLayer
        isOrg
        loading={false}
        onNavigateHome={onNavigateHome}
        scope={scope}
        scopeOptions={[scope]}
      />,
    )

    expect(screen.getByTestId('mobile-breadcrumb').textContent).toBe('Customer Brain')
    expect(screen.getByTestId('desktop-breadcrumb').textContent).toBe('Customer Brain')
    expect(mocks.breadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        compact: true,
        isOrg: true,
        loading: false,
        onNavigateHome,
        scope,
        scopeOptions: [scope],
      }),
    )
    expect(mocks.breadcrumb.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        isOrg: true,
        loading: false,
        onNavigateHome,
        scope,
        scopeOptions: [scope],
      }),
    )
    expect(mocks.breadcrumb.mock.calls[1]?.[0].compact).toBeUndefined()
  })

  it('dispatches the existing mobile sidebar toggle event', () => {
    const listener = vi.fn()
    window.addEventListener('toggle-mobile-sidebar', listener)

    try {
      render(
        <BrainVisualizationBreadcrumbLayer
          isOrg={false}
          loading={false}
          onNavigateHome={vi.fn()}
          scope={scope}
          scopeOptions={[scope]}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

      expect(listener).toHaveBeenCalledTimes(1)
    } finally {
      window.removeEventListener('toggle-mobile-sidebar', listener)
    }
  })
})
