import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROGRAMS_INDEX_MESSAGES } from '../_config/programs-index-messages.config'
import { ProgramsIndex } from './ProgramsIndex'

const mocks = vi.hoisted(() => ({
  fetchPrograms: vi.fn(),
}))

vi.mock('@/lib/programs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/programs')>()
  return {
    ...actual,
    fetchPrograms: mocks.fetchPrograms,
  }
})

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('@/components/shell/ShellBreadcrumb', () => ({
  ShellBreadcrumb: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe('ProgramsIndex', () => {
  beforeEach(() => {
    mocks.fetchPrograms.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('lists programs as overview links', async () => {
    mocks.fetchPrograms.mockResolvedValue([
      { id: 'prog-clients', name: 'Clients', system_kind: 'clients', campaign_count: 3 },
      { id: 'prog-ops', name: 'ROAS Ops', system_kind: 'roas_ops', campaign_count: 1 },
    ])

    render(<ProgramsIndex />)

    expect(
      await screen.findByRole('heading', { name: PROGRAMS_INDEX_MESSAGES.title }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Client Spaces/ })).toHaveAttribute(
      'href',
      '/programs/prog-clients',
    )
    expect(screen.getByRole('link', { name: /ROAS Ops/ })).toHaveAttribute(
      'href',
      '/programs/prog-ops',
    )
  })
})
