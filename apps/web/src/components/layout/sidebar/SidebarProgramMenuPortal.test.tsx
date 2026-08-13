import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarProgramMenuPortal } from './SidebarProgramMenuPortal'

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom')
  return { ...actual, createPortal: (node: unknown) => node }
})

const program = {
  id: '00000000-0000-4000-8000-000000000001',
  org_id: '00000000-0000-4000-8000-000000000002',
  user_id: null,
  name: 'Clients',
  slug: 'clients',
  system_kind: 'clients' as const,
  icon: 'users',
  icon_color: null,
  sort_order: 0,
  config: {},
  visibility: 'workspace' as const,
  created_by: null,
  created_at: '2026-08-10T00:00:00.000Z',
  updated_at: '2026-08-10T00:00:00.000Z',
  deleted_at: null,
  is_favorite: false,
}

describe('SidebarProgramMenuPortal', () => {
  it('allows a system Program such as Clients to be favorited', () => {
    const onToggleFavorite = vi.fn()
    render(
      <SidebarProgramMenuPortal
        program={program}
        anchorRect={{ top: 0, right: 10, bottom: 10, left: 0 }}
        onClose={vi.fn()}
        onCreateCampaign={vi.fn()}
        onToggleFavorite={onToggleFavorite}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }))
    expect(onToggleFavorite).toHaveBeenCalledOnce()
  })
})
