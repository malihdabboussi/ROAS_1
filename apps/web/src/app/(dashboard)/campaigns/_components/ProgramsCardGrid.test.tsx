import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Program } from '@/lib/programs'
import { campaignCountLabel, ProgramsCardGrid } from './ProgramsCardGrid'

function program(partial: Partial<Program> & { id: string; name: string }): Program {
  return {
    org_id: 'org-1',
    user_id: null,
    slug: partial.name.toLowerCase(),
    system_kind: null,
    icon: null,
    icon_color: null,
    sort_order: 0,
    config: {},
    visibility: 'workspace',
    created_by: 'user-1',
    created_at: '2026-08-12',
    updated_at: '2026-08-12',
    deleted_at: null,
    ...partial,
  }
}

describe('ProgramsCardGrid', () => {
  it('renders each Program as a destination card with its campaign count', () => {
    render(
      <ProgramsCardGrid
        programs={[
          program({ id: 'clients', name: 'Clients', campaign_count: 27 }),
          program({ id: 'ops', name: 'ROAS Ops', campaign_count: 0 }),
        ]}
      />,
    )

    expect(screen.getByRole('link', { name: 'Open Clients' })).toHaveAttribute(
      'href',
      '/programs/clients',
    )
    expect(screen.getByText('27 campaigns')).toBeInTheDocument()
    expect(screen.getByText('0 campaigns')).toBeInTheDocument()
  })

  it('uses singular grammar for one campaign', () => {
    expect(campaignCountLabel(1)).toBe('1 campaign')
  })
})
