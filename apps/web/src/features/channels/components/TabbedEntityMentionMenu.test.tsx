import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { EntitySearchResult } from '../services/entity-search.service'
import { TabbedEntityMentionMenu } from './TabbedEntityMentionMenu'

const items: EntitySearchResult[] = [
  {
    kind: 'person',
    id: 'internal-1',
    label: 'Internal Ian',
    subtitle: 'Internal',
    iconUrl: null,
    url: null,
    personKind: 'managed_person',
    relationshipKind: 'internal',
  },
  {
    kind: 'person',
    id: 'external-1',
    label: 'External Erin',
    subtitle: 'External',
    iconUrl: null,
    url: null,
    personKind: 'managed_person',
    relationshipKind: 'external',
  },
  {
    kind: 'person',
    id: 'portal-1',
    label: 'Portal Priya',
    subtitle: 'Portal user',
    iconUrl: null,
    url: null,
    personKind: 'portal_user',
  },
]

describe('TabbedEntityMentionMenu', () => {
  it('separates agents and filters people by internal, external, and portal users', () => {
    const onTabChange = vi.fn()
    render(
      <TabbedEntityMentionMenu
        activeTab="people"
        onTabChange={onTabChange}
        items={items}
        selectedIndex={0}
        queryLen={0}
        loading={false}
        hasMore={false}
        onLoadMore={vi.fn()}
        onSelect={vi.fn()}
        onHover={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Agents' })).toBeTruthy()
    expect(screen.getByText('Internal Ian')).toBeTruthy()
    expect(screen.getByText('External Erin')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'External' }))
    expect(screen.getByText('External Erin')).toBeTruthy()
    expect(screen.queryByText('Internal Ian')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Portal users' }))
    expect(screen.getByText('Portal Priya')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Agents' }))
    expect(onTabChange).toHaveBeenCalledWith('agents')
  })
})
