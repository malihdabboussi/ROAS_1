import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArtifactsState, TreeNode } from '../tree/types'
import { useArtifactsController } from './useArtifactsController'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setActivePreviewTab: vi.fn(),
  setBulkCreatorAdSetId: vi.fn(),
  expandPanel: vi.fn(),
  setPendingComposerText: vi.fn(),
  fetchFunnelWithPages: vi.fn(),
  loadArtifacts: vi.fn(),
  setArtifacts: vi.fn(),
  setExpandedIds: vi.fn(),
  handleSelect: vi.fn(),
  setSelectedId: vi.fn(),
  setSelectedResource: vi.fn(),
  selectBlogPostById: vi.fn(),
  useArtifactsData: vi.fn(),
  useArtifactSelection: vi.fn(),
  useArtifactMutations: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('@/features/studio/contexts/CampaignModeContext', () => ({
  useCampaignMode: () => ({
    activeCampaignName: 'Launch Campaign',
    setBulkCreatorAdSetId: mocks.setBulkCreatorAdSetId,
    setActivePreviewTab: mocks.setActivePreviewTab,
    expandPanel: mocks.expandPanel,
  }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (
    selector: (state: { setPendingComposerText: typeof mocks.setPendingComposerText }) => unknown,
  ) => selector({ setPendingComposerText: mocks.setPendingComposerText }),
}))

vi.mock('@/lib/artifacts', () => ({
  fetchFunnelWithPages: mocks.fetchFunnelWithPages,
}))

vi.mock('./useArtifactsData', () => ({
  useArtifactsData: mocks.useArtifactsData,
}))

vi.mock('./useArtifactSelection', () => ({
  useArtifactSelection: mocks.useArtifactSelection,
}))

vi.mock('./useArtifactMutations', () => ({
  useArtifactMutations: mocks.useArtifactMutations,
}))

function makeArtifacts(): ArtifactsState {
  return {
    funnels: [
      {
        id: 'funnel-1',
        name: 'Launch funnel',
        pages: [],
      },
    ],
    offers: [],
    ads: [],
    sequences: [],
    presentations: [],
    avatars: [],
    adCampaigns: [
      {
        id: 'adcamp-1',
        name: 'Meta campaign',
        ad_sets: [
          {
            id: 'adset-2',
            name: 'Second set',
            ads: [],
          },
          {
            id: 'adset-1',
            name: 'First set',
            ads: [],
          },
        ],
      },
    ],
    socialPosts: [],
    blogPosts: [{ id: 'blog-1', funnel_id: 'funnel-1', title: 'Blog post', slug: 'blog-post' }],
  } as unknown as ArtifactsState
}

function makeTreeData(): TreeNode[] {
  return [
    {
      id: 'funnel-funnel-1',
      label: 'Launch funnel',
      type: 'funnel',
      resourceId: 'funnel-1',
      icon: null,
    },
  ]
}

function makeData(overrides: Partial<ReturnType<typeof buildData>> = {}) {
  return { ...buildData(), ...overrides }
}

function buildData() {
  const artifacts = makeArtifacts()
  return {
    artifacts,
    artifactsRef: { current: artifacts },
    setArtifacts: mocks.setArtifacts,
    treeData: makeTreeData(),
    loading: false,
    fetchError: null,
    expandedIds: new Set<string>(),
    setExpandedIds: mocks.setExpandedIds,
    activeThemeId: null,
    themePreviewCss: '',
    campaignOptions: [],
    loadArtifacts: mocks.loadArtifacts,
    toggleExpand: vi.fn(),
    isAllExpanded: false,
    handleToggleExpandAll: vi.fn(),
    filterSet: null,
    setFilterSet: vi.fn(),
    sourceFilter: 'all' as const,
    setSourceFilter: vi.fn(),
    filterDropdownOpen: false,
    setFilterDropdownOpen: vi.fn(),
    filterBtnRef: { current: null },
    isFiltering: false,
    filteredTreeData: makeTreeData(),
    totalItems: 1,
    filteredTotalItems: 1,
    findNewestArtifactNode: vi.fn(),
    artifactCategories: [],
  }
}

function makeSelection(overrides: Partial<ReturnType<typeof buildSelection>> = {}) {
  return { ...buildSelection(), ...overrides }
}

function buildSelection() {
  return {
    selectedId: 'page-page-1',
    setSelectedId: mocks.setSelectedId,
    selectedResource: {
      type: 'page',
      id: 'page-1',
      funnelId: 'funnel-1',
      pageId: 'page-1',
      name: 'Landing page',
    },
    setSelectedResource: mocks.setSelectedResource,
    selectedFunnel: { id: 'funnel-1', name: 'Launch funnel' },
    selectedPresentation: null,
    pageContent: null,
    pageLoading: false,
    pageError: null,
    currentPageId: 'page-1',
    handleSelect: mocks.handleSelect,
    selectBlogPostById: mocks.selectBlogPostById,
    handleFunnelStatusChange: vi.fn(),
    handlePresentationStatusChange: vi.fn(),
    refreshSelectedPresentation: vi.fn(),
    refreshCurrentFunnelPage: vi.fn(),
    handleAdUpdated: vi.fn(),
    handleFunnelPageChange: vi.fn(),
  }
}

function makeMutations() {
  return {
    addLoading: null,
    pendingAdd: null,
    editingFolderId: null,
    menuOpenId: null,
    setMenuOpenId: vi.fn(),
    deleteModalNode: null,
    setDeleteModalNode: vi.fn(),
    isDeleting: false,
    deleteError: null,
    sequenceDeleteMode: 'keep_unsent' as const,
    setSequenceDeleteMode: vi.fn(),
    campaignDeleteMode: 'keep_ads' as const,
    setCampaignDeleteMode: vi.fn(),
    adSetDeleteMode: 'keep_ads' as const,
    setAdSetDeleteMode: vi.fn(),
    draggingType: null,
    setDraggingType: vi.fn(),
    handleStartAdd: vi.fn(),
    handleCancelAdd: vi.fn(),
    handleConfirmAdd: vi.fn(),
    handleReorderPages: vi.fn(),
    handleReorderEmails: vi.fn(),
    handleMovePageToFunnel: vi.fn(),
    handleMoveSequenceEmailToSequence: vi.fn(),
    handleEditFolder: vi.fn(),
    handleConfirmEdit: vi.fn(),
    handleCancelEdit: vi.fn(),
    handleMoveToCampaign: vi.fn(),
    handleDeleteFolder: vi.fn(),
    handleDuplicateFolder: vi.fn(),
    handleCloneToAdSet: vi.fn(),
    handleConfirmDelete: vi.fn(),
    bulkSelectMode: false,
    bulkSelectedIds: new Set<string>(),
    bulkSelectedCount: 0,
    toggleBulkSelectMode: vi.fn(),
    toggleBulkSelectNode: vi.fn(),
    handleBulkDelete: vi.fn(),
    handleBulkDuplicate: vi.fn(),
    handleBulkMoveToCampaign: vi.fn(),
    handleConfirmBulkDelete: vi.fn(),
    showBulkDeleteModal: false,
    setShowBulkDeleteModal: vi.fn(),
    isBulkDeleting: false,
    bulkDeleteError: null,
    exitBulkSelect: vi.fn(),
  }
}

function expectNoRenderLoop(consoleErrorSpy: ReturnType<typeof vi.spyOn>) {
  const messages = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
  expect(messages.join('\n')).not.toMatch(/Maximum update depth|Too many re-renders/i)
}

describe('useArtifactsController', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    delete window.__vibey_pending_artifact_open
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.loadArtifacts.mockResolvedValue(makeArtifacts())
    mocks.fetchFunnelWithPages.mockResolvedValue({
      id: 'funnel-1',
      pages: [
        { id: 'page-2', sort_order: 2, name: 'Second page' },
        { id: 'page-1', sort_order: 1, name: 'First page' },
      ],
    })
    mocks.useArtifactsData.mockReturnValue(makeData())
    mocks.useArtifactSelection.mockReturnValue(makeSelection())
    mocks.useArtifactMutations.mockReturnValue(makeMutations())
  })

  afterEach(() => {
    cleanup()
    delete window.__vibey_pending_artifact_open
    consoleErrorSpy.mockRestore()
  })

  it('restores pending and saved artifact opens, emits active selection, handles artifact events, and avoids render churn', async () => {
    window.__vibey_pending_artifact_open = {
      kind: 'page',
      funnelId: 'funnel-1',
      pageId: 'page-2',
      name: 'Second page',
    }
    const activeSelectionEvents: unknown[] = []
    const activeSelectionHandler = (event: Event) => {
      activeSelectionEvents.push((event as CustomEvent).detail)
    }
    window.addEventListener('vibey-active-artifact-changed', activeSelectionHandler)

    let renderCount = 0
    const { result, unmount } = renderHook(() => {
      renderCount += 1
      return useArtifactsController('campaign-1')
    })

    await waitFor(() => {
      expect(mocks.handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'page-page-2',
          type: 'page',
          funnelId: 'funnel-1',
          pageId: 'page-2',
        }),
      )
    })

    expect(window.__vibey_pending_artifact_open).toBeUndefined()
    expect(sessionStorage.getItem('vibey-artifact-selection:campaign-1')).toBe('page-page-1')
    expect(activeSelectionEvents).toContainEqual({
      type: 'funnel_page',
      id: 'page-1',
      label: 'Landing page',
      campaign_id: 'campaign-1',
      parent: { type: 'funnel', id: 'funnel-1' },
    })

    await waitFor(() => {
      expect(result.current.funnelPages.map((page) => page.id)).toEqual(['page-1', 'page-2'])
    })
    expect(mocks.fetchFunnelWithPages).toHaveBeenCalledWith('funnel-1')
    expect(result.current.adSetOptions).toEqual([
      { id: 'adset-2', name: 'Second set', campaignName: 'Meta campaign' },
      { id: 'adset-1', name: 'First set', campaignName: 'Meta campaign' },
    ])

    act(() => {
      result.current.handleCreateVariations({
        id: 'ad-ad-1',
        label: 'Hero ad',
        type: 'ad',
        resourceId: 'ad-1',
        icon: null,
      })
    })
    expect(mocks.setPendingComposerText).toHaveBeenCalledWith(expect.stringContaining('Hero ad'))

    act(() => {
      result.current.handleOpenBulkCreator('adset-1')
    })
    expect(mocks.setActivePreviewTab).toHaveBeenCalledWith('artifacts')
    expect(mocks.setBulkCreatorAdSetId).toHaveBeenCalledWith('adset-1')
    expect(mocks.setSelectedId).toHaveBeenCalledWith('ads')
    expect(mocks.setSelectedResource).toHaveBeenCalledWith({
      type: 'category-settings',
      id: 'ads',
      section: 'ads',
      name: 'Ads Settings',
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent('vibey-open-artifact', {
          detail: {
            artifactType: 'visual-doc',
            artifactId: 'doc-1',
            spaceId: 'space-1',
            name: 'Visual doc',
          },
        }),
      )
    })
    expect(mocks.push).toHaveBeenCalledWith('/spaces?space=space-1&item=doc-1&doc_tab=visual')

    act(() => {
      window.dispatchEvent(
        new CustomEvent('vibey-open-artifact', {
          detail: { artifactType: 'ad', artifactId: 'ad-1', name: 'Hero ad' },
        }),
      )
    })

    await waitFor(() => {
      expect(mocks.loadArtifacts).toHaveBeenCalledWith(true)
      expect(mocks.handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ad-ad-1',
          type: 'ad',
          resourceId: 'ad-1',
          label: 'Hero ad',
        }),
      )
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent('vibey-open-artifact', {
          detail: { artifactType: 'website', artifactId: 'website-1', name: 'Brand Website' },
        }),
      )
    })

    await waitFor(() => {
      expect(mocks.handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'funnel-website-1',
          type: 'funnel',
          resourceId: 'website-1',
          label: 'Brand Website',
        }),
      )
    })

    expect(renderCount).toBeLessThan(25)
    expectNoRenderLoop(consoleErrorSpy)

    unmount()
    window.removeEventListener('vibey-active-artifact-changed', activeSelectionHandler)
  })
})
