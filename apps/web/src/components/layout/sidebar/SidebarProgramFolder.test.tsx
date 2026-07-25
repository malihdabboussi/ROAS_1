'use client'

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Program } from '@/lib/programs'
import { SidebarProgramFolder } from './SidebarProgramFolder'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/IconPicker', () => ({
  getIconColor: () => ({ textColor: 'text-muted-foreground', glassClass: 'badge-glass-purple' }),
  LucideIcon: () => <span aria-hidden data-testid="program-icon" />,
}))

vi.mock('@/lib/programs', () => ({
  resolveProgramIconColorId: () => 'purple',
}))

const program = {
  id: 'prog-clients',
  name: 'Clients',
  icon: 'folder-kanban',
  icon_color: 'default',
} as Program

describe('SidebarProgramFolder', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('links program name to program overview and toggles from icon/chevron', () => {
    const onToggle = vi.fn()
    const onCreateCampaign = vi.fn()
    render(
      <SidebarProgramFolder
        groupKey="prog-clients"
        label="Clients"
        program={program}
        campaignCount={3}
        isExpanded={false}
        onToggle={onToggle}
        onCreateCampaign={onCreateCampaign}
      >
        <div>child</div>
      </SidebarProgramFolder>,
    )

    expect(screen.getByRole('link', { name: 'Clients' }).getAttribute('href')).toBe(
      '/programs/prog-clients',
    )
    expect(screen.queryByText('child')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Expand Clients' }))
    expect(onToggle).toHaveBeenCalledWith('prog-clients')

    fireEvent.click(screen.getByRole('button', { name: 'New campaign in Clients' }))
    expect(onCreateCampaign).toHaveBeenCalledWith('prog-clients')
  })

  it('shows children when expanded and treats General as toggle-only', () => {
    const onToggle = vi.fn()
    render(
      <SidebarProgramFolder
        groupKey="__ungrouped__"
        label="General"
        program={null}
        campaignCount={1}
        isExpanded
        onToggle={onToggle}
      >
        <div>campaign-row</div>
      </SidebarProgramFolder>,
    )

    expect(screen.queryByRole('link', { name: 'General' })).toBeNull()
    expect(screen.getByText('campaign-row')).toBeTruthy()
    expect(screen.getByTestId('program-chevron')).toHaveClass('rotate-90', 'opacity-0')
    fireEvent.click(screen.getByRole('button', { name: 'General' }))
    expect(onToggle).toHaveBeenCalledWith('__ungrouped__')
  })
})
