import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SavedTopicSearchSummary } from '../../services/social-research.service'
import type { SocialTrackedAccount } from '../../types/space-schema'
import { ResearchSidebar, type ResearchSidebarPeopleEntry } from './ResearchSidebar'

const account: SocialTrackedAccount = {
  handle: 'neelhome',
}

const peopleAccounts: ResearchSidebarPeopleEntry[] = [
  {
    platform: 'instagram',
    account,
    accountKey: 'instagram:neelhome',
  },
]

const savedSearch: SavedTopicSearchSummary = {
  id: 'search-1',
  platform: 'instagram',
  title: 'Creator hooks',
  query: 'creator hooks',
  filters: {},
  result_count: 4,
  created_at: '2026-06-23T00:00:00.000Z',
  last_run_at: '2026-06-23T00:00:00.000Z',
}

function renderSidebar(overrides: Partial<Parameters<typeof ResearchSidebar>[0]> = {}) {
  const props: Parameters<typeof ResearchSidebar>[0] = {
    favoriteFolders: [],
    favoritesActiveFolderId: null,
    onSelectFavoriteFolder: vi.fn(),
    onCreateFavoriteFolder: vi.fn(),
    onRenameFavoriteFolder: vi.fn(),
    onDeleteFavoriteFolder: vi.fn(),
    peopleAccounts,
    peopleActiveKey: null,
    peopleNewActive: false,
    topicSearchAvailable: true,
    savedSearches: [savedSearch],
    topicActiveId: null,
    topicNewActive: false,
    topicLoadingId: null,
    peopleAllActive: false,
    topicAllActive: false,
    onSelectAllPeople: vi.fn(),
    onSelectAllTopics: vi.fn(),
    onNewAccount: vi.fn(),
    onSelectAccount: vi.fn(),
    onNewSearch: vi.fn(),
    onSelectSearch: vi.fn(),
    onRenameSearch: vi.fn(),
    onDeleteSearch: vi.fn(),
    ...overrides,
  }

  render(<ResearchSidebar {...props} />)
  return props
}

describe('ResearchSidebar', () => {
  afterEach(cleanup)

  it('uses the People title as view-all without collapsing the section', () => {
    const onSelectAllPeople = vi.fn()
    renderSidebar({ onSelectAllPeople })

    fireEvent.click(screen.getByRole('button', { name: 'People' }))

    expect(onSelectAllPeople).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'New account' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /@neelhome IG/ })).toBeTruthy()
  })

  it('keeps section collapse on the chevron control', () => {
    renderSidebar()

    fireEvent.click(screen.getByRole('button', { name: 'Collapse People' }))

    expect(screen.queryByRole('button', { name: 'New account' })).toBeNull()
    expect(screen.queryByRole('button', { name: /@neelhome IG/ })).toBeNull()
  })

  it('uses the Topic search title as view-all without opening the new-search draft', () => {
    const onSelectAllTopics = vi.fn()
    const onNewSearch = vi.fn()
    renderSidebar({ onSelectAllTopics, onNewSearch })

    fireEvent.click(screen.getByRole('button', { name: 'Topic search' }))

    expect(onSelectAllTopics).toHaveBeenCalledTimes(1)
    expect(onNewSearch).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'New search' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Creator hooks/ })).toBeTruthy()
  })
})
