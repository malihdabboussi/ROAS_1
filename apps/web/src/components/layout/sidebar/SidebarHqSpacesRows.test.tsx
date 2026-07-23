import type { MouseEvent, ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SidebarCampaignRow } from './sidebar-types'
import { Section } from './SidebarHqSpacesRows'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string
    children: ReactNode
    onContextMenu?: (event: MouseEvent<HTMLAnchorElement>) => void
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/ui/IconPicker', () => ({
  getIconColor: () => ({ textColor: 'text-muted-foreground', glassClass: 'surface-card' }),
  IconPicker: ({ customTrigger }: { customTrigger?: ReactNode }) => (
    <button type="button">{customTrigger ?? 'Icon picker'}</button>
  ),
  LucideIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}))

const campaignRow: SidebarCampaignRow = {
  id: 'campaign-1',
  name: 'Acme SaaS Retainer',
  icon: 'folder-kanban',
  config: {},
  isFavorite: false,
  isHidden: false,
  isPinned: false,
  isSystemGeneral: false,
  isSystemPersonal: false,
  program_id: null,
  created_at: '2026-01-01',
}

const baseProps = {
  bucket: 'campaign-1',
  label: 'Acme SaaS Retainer',
  campaignId: 'campaign-1',
  sectionSpaces: [],
  campaignRow,
  isExpanded: false,
  isCreating: false,
  searchActive: false,
  onToggle: vi.fn(),
  onOpenCampaignMenu: vi.fn(),
  onOpenAddDropdown: vi.fn(),
  creatingName: '',
  setCreatingName: vi.fn(),
  onSubmitCreate: vi.fn(),
  onCancelCreate: vi.fn(),
  isSubmitting: false,
  favoriteIds: new Set<string>(),
  spaceRowProps: {
    pathname: '/spaces',
    activeSpaceId: null,
    renamingSpaceId: null,
    renameDraft: '',
    setRenameDraft: vi.fn(),
    onSubmitRename: vi.fn(),
    onCancelRename: vi.fn(),
    onOpenMenu: vi.fn(),
  },
}

describe('SidebarHqSpacesRows Section', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('links campaign name to the campaign page', () => {
    render(<Section {...baseProps} />)

    const link = screen.getByRole('link', { name: 'Acme SaaS Retainer' })
    expect(link.getAttribute('href')).toBe('/campaigns/campaign-1')
  })

  it('toggles expansion from the chevron without navigating', () => {
    const onToggle = vi.fn()
    render(<Section {...baseProps} onToggle={onToggle} />)

    fireEvent.click(screen.getByRole('button', { name: 'Expand Acme SaaS Retainer' }))

    expect(onToggle).toHaveBeenCalledWith('campaign-1')
  })
})
