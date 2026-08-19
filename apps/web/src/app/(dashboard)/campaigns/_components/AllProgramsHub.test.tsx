import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fetchPrograms } from '@/lib/programs'
import { AllProgramsHub } from './AllProgramsHub'

vi.mock('@/lib/programs', async () => {
  const actual = await vi.importActual<typeof import('@/lib/programs')>('@/lib/programs')
  return { ...actual, fetchPrograms: vi.fn() }
})

vi.mock('@/components/vibey/vibey-loading-orb', () => ({
  VibeyLoadingOrb: ({ text }: { text: string }) => <div>{text}</div>,
}))

const fetchProgramsMock = vi.mocked(fetchPrograms)

describe('AllProgramsHub', () => {
  it('defaults to the All Programs card screen', async () => {
    fetchProgramsMock.mockResolvedValue([
      {
        id: 'clients',
        org_id: 'org-1',
        user_id: null,
        name: 'Clients',
        slug: 'clients',
        system_kind: 'clients',
        icon: null,
        icon_color: null,
        sort_order: 0,
        config: {},
        visibility: 'workspace',
        created_by: 'user-1',
        created_at: '2026-08-12',
        updated_at: '2026-08-12',
        deleted_at: null,
        campaign_count: 27,
      },
    ])

    render(<AllProgramsHub />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'ALL PROGRAMS' })).toBeVisible())
    expect(screen.getByRole('link', { name: 'Open Clients' })).toBeVisible()
  })
})
