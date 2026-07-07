import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SpaceToolbarContext } from '../types'
import { ContactsToolbar } from './ContactsToolbar'

type ToolbarActions = ReturnType<typeof createToolbarActions>

function createToolbarActions() {
  return {
    contactsViewRef: {
      current: {
        refresh: vi.fn(),
        back: vi.fn(),
      },
    },
    setContactsSearch: vi.fn(),
    setContactsSearchOpen: vi.fn(),
    setContactsSort: vi.fn(),
    setContactsSortOpen: vi.fn(),
    setContactsSegmentPanelOpen: vi.fn(),
    setActiveContactsSegmentId: vi.fn(),
    setActiveContactsSegmentName: vi.fn(),
    setContactCommunicationTab: vi.fn(),
    handleViewPatch: vi.fn(async () => {}),
    openCustomizeFromToolbar: vi.fn(),
    closeCustomizePanel: vi.fn(),
    setContactsAddOpen: vi.fn(),
    setContactsManualOpen: vi.fn(),
    setContactsCsvOpen: vi.fn(),
    setContactsGhlOpen: vi.fn(),
    setContactsAcOpen: vi.fn(),
  }
}

function makeToolbarContext(
  actions: ToolbarActions,
  overrides: Partial<SpaceToolbarContext> = {},
): SpaceToolbarContext {
  return {
    activeView: {
      id: 'contacts-view',
      type: 'contacts',
      name: 'Contacts',
      contacts_config: {},
    },
    activeSpace: {
      id: 'space-1',
      campaign_id: null,
    },
    contactDetailOpen: false,
    contactDetailColumnLayout: null,
    contactsDetailToolbarLeftRef: createRef<HTMLDivElement>(),
    contactsDetailToolbarLeftPx: 0,
    contactCommsLoaded: false,
    contactCommunicationTab: 'all',
    setContactCommunicationTab: actions.setContactCommunicationTab,
    contactsViewRef: actions.contactsViewRef,
    showAddColumnsToolbar: false,
    showGroupByInToolbar: false,
    contactsSearch: '',
    setContactsSearch: actions.setContactsSearch,
    contactsSearchOpen: false,
    setContactsSearchOpen: actions.setContactsSearchOpen,
    contactsSort: 'created_at.desc',
    setContactsSort: actions.setContactsSort,
    contactsSortOpen: false,
    setContactsSortOpen: actions.setContactsSortOpen,
    contactsLoading: false,
    contactsAddOpen: false,
    setContactsAddOpen: actions.setContactsAddOpen,
    contactsAddRootRef: createRef<HTMLDivElement>(),
    setContactsManualOpen: actions.setContactsManualOpen,
    setContactsCsvOpen: actions.setContactsCsvOpen,
    setContactsGhlOpen: actions.setContactsGhlOpen,
    setContactsAcOpen: actions.setContactsAcOpen,
    contactsSegmentPanelOpen: false,
    setContactsSegmentPanelOpen: actions.setContactsSegmentPanelOpen,
    activeContactsSegmentName: 'VIP segment',
    setActiveContactsSegmentId: actions.setActiveContactsSegmentId,
    setActiveContactsSegmentName: actions.setActiveContactsSegmentName,
    handleViewPatch: actions.handleViewPatch,
    schemaEditorOpen: false,
    closeCustomizePanel: actions.closeCustomizePanel,
    openCustomizeFromToolbar: actions.openCustomizeFromToolbar,
    docsIsTreeLayout: true,
    hasDraft: false,
    handleSaveViewDraft: vi.fn(),
    handleEnableAutosaveAndFlush: vi.fn(),
    handleSaveAsNewView: vi.fn(),
    handleRevertViewDraft: vi.fn(),
    groupByOpen: false,
    setGroupByOpen: vi.fn(),
    groupByBtnRef: createRef<HTMLSpanElement>(),
    docsDriveBrowseActive: false,
    isAllArtifactsView: false,
    isMediaView: false,
    isSocialResearchView: false,
    isMissionsView: false,
    isContactsView: true,
    socialPlatform: null,
    groupableFields: [],
    activeSchema: { fields: [], views: [] },
    activeViewId: 'contacts-view',
    activeSpaceId: 'space-1',
    ...overrides,
  } as unknown as SpaceToolbarContext
}

function getToolbarButton(index: number): HTMLElement {
  const button = screen.getAllByRole('button')[index]
  if (!button) throw new Error(`Expected toolbar button at index ${index}`)
  return button
}

describe('ContactsToolbar', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders list-mode controls, dispatches toolbar actions, and settles on rerender', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actions = createToolbarActions()
    const { rerender } = render(<ContactsToolbar ctx={makeToolbarContext(actions)} />)

    fireEvent.click(getToolbarButton(0))
    expect(actions.setContactsSearchOpen).toHaveBeenCalledWith(true)

    fireEvent.click(getToolbarButton(1))
    expect(actions.setContactsSortOpen).toHaveBeenCalledTimes(1)

    fireEvent.click(getToolbarButton(2))
    expect(actions.contactsViewRef.current.refresh).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('VIP segment').closest('button')!)
    expect(actions.setActiveContactsSegmentId).toHaveBeenCalledWith(null)
    expect(actions.setActiveContactsSegmentName).toHaveBeenCalledWith(null)

    fireEvent.click(screen.getByRole('button', { name: 'Segments' }))
    expect(actions.setContactsSegmentPanelOpen).toHaveBeenCalledWith(true)
    expect(actions.setContactsSortOpen).toHaveBeenCalledWith(false)

    rerender(
      <ContactsToolbar
        ctx={makeToolbarContext(actions, {
          contactsSearchOpen: true,
          contactsSearch: 'old query',
        })}
      />,
    )

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'new query' } })
    expect(actions.setContactsSearch).toHaveBeenCalledWith('new query')

    fireEvent.keyDown(searchInput, { key: 'Escape' })
    expect(actions.setContactsSearch).toHaveBeenCalledWith('')
    expect(actions.setContactsSearchOpen).toHaveBeenCalledWith(false)

    rerender(
      <ContactsToolbar
        ctx={makeToolbarContext(actions, {
          contactsSortOpen: true,
          activeContactsSegmentName: null,
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Email A/i }))
    expect(actions.setContactsSort).toHaveBeenCalledWith('email.asc')
    expect(actions.setContactsSortOpen).toHaveBeenCalledWith(false)
    expect(actions.handleViewPatch).toHaveBeenCalledWith({
      contacts_config: {
        sort_by: 'email',
        sort_dir: 'asc',
      },
    })

    rerender(
      <ContactsToolbar
        ctx={makeToolbarContext(actions, {
          contactsSortOpen: true,
          contactsSearch: 'stable',
        })}
      />,
    )
    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).match(/maximum update depth|too many re-renders/i)),
      ),
    ).toBe(false)
  })

  it('renders detail-mode navigation and communication tabs without changing state ownership', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actions = createToolbarActions()
    const { rerender } = render(
      <ContactsToolbar
        ctx={makeToolbarContext(actions, {
          contactDetailOpen: true,
          contactCommsLoaded: true,
          contactCommunicationTab: 'all',
          activeContactsSegmentName: null,
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(actions.contactsViewRef.current.back).toHaveBeenCalledTimes(1)

    const emailsTab = screen.getByRole('tab', { name: 'Emails' })
    fireEvent.mouseDown(emailsTab, { button: 0, ctrlKey: false })
    fireEvent.mouseUp(emailsTab, { button: 0, ctrlKey: false })
    fireEvent.click(emailsTab)
    expect(actions.setContactCommunicationTab).toHaveBeenCalledWith('emails')

    rerender(
      <ContactsToolbar
        ctx={makeToolbarContext(actions, {
          contactDetailOpen: true,
          contactCommsLoaded: true,
          contactCommunicationTab: 'agent',
          contactDetailColumnLayout: {
            infoWidthPx: 300,
            activityWidthPx: 360,
            commsWidthPx: 420,
          },
          contactsDetailToolbarLeftPx: 120,
          activeContactsSegmentName: null,
        })}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Agent Chats' })).toHaveAttribute(
      'data-state',
      'active',
    )
    expect(
      consoleError.mock.calls.some((call) =>
        call.some((part) => String(part).match(/maximum update depth|too many re-renders/i)),
      ),
    ).toBe(false)
  })
})
