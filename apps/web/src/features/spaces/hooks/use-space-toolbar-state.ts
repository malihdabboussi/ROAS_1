import { useCallback, useEffect, useRef, useState } from 'react'
import type { ContactCommunicationTab } from '../components/contacts/ContactCommunicationPanel'
import type { ContactDetailLayoutSizes } from '../components/contacts/ContactsView'
import type { ReportingToolbarApi } from '../components/reporting/shared/reporting-toolbar.types'
import {
  VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD,
  VIBEY_SPACE_FLOATING_CONTROL,
} from '@/lib/ui/floating-control-attrs'
import type { CrmSort } from '../services/contacts-view.service'
import { useSpacesStore } from '../store/use-spaces-store'
import { useDismissOnOutsideAndEscape } from './use-dismiss-on-outside-and-escape'

export function useSpaceToolbarState(activeViewId: string | undefined) {
  const [schemaEditorOpen, setSchemaEditorOpen] = useState(false)
  const [customizeSubjectViewId, setCustomizeSubjectViewId] = useState<string | null>(null)
  const [panelInitialView, setPanelInitialView] = useState<
    'main' | 'fields' | 'people' | 'ig_format'
  >('main')
  const customizeDropdownAnchorRef = useRef<HTMLElement | null>(null)

  const closeCustomizePanel = () => {
    setSchemaEditorOpen(false)
    customizeDropdownAnchorRef.current = null
    setCustomizeSubjectViewId(null)
  }

  const openCustomizeFromToolbar = (
    initial: 'main' | 'fields' | 'people' | 'ig_format' = 'main',
  ) => {
    customizeDropdownAnchorRef.current = null
    setCustomizeSubjectViewId(null)
    setPanelInitialView(initial)
    setSchemaEditorOpen(true)
  }

  const [statusEditorOpen, setStatusEditorOpen] = useState(false)
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false)
  const [automationsOpen, setAutomationsOpen] = useState(false)
  const [spaceToolbarSearchOpen, setSpaceToolbarSearchOpen] = useState(false)
  const [spaceToolbarSearch, setSpaceToolbarSearch] = useState('')
  const [assigneeFilterOpen, setAssigneeFilterOpen] = useState(false)

  type SpaceItemLocal = import('../types').SpaceItem
  const [selectedItem, setSelectedItem] = useState<SpaceItemLocal | null>(null)
  const [taskHistory, setTaskHistory] = useState<SpaceItemLocal[]>([])
  const [docEditorItem, setDocEditorItem] = useState<SpaceItemLocal | null>(null)

  /** Open a new task while remembering the previous one for the back arrow. */
  const pushTaskAndOpen = useCallback((next: SpaceItemLocal) => {
    setSelectedItem((prev) => {
      if (prev && prev.id !== next.id) {
        setTaskHistory((stack) => [...stack, prev])
      }
      return next
    })
  }, [])

  /** Pop the last task from history and re-open it. Returns true if a task was popped. */
  const popTask = useCallback(() => {
    let popped = false
    setTaskHistory((stack) => {
      if (stack.length === 0) return stack
      const next = [...stack]
      const last = next.pop()!
      setSelectedItem(last)
      popped = true
      return next
    })
    return popped
  }, [])

  /**
   * Open the task-detail modal from list/board/calendar/etc.
   * Root tasks reset the drill-in stack.
   * Subtasks seed the stack with their parent so back / breadcrumb can return (max one parent level today).
   */
  const openSpaceItemModal = useCallback((item: SpaceItemLocal) => {
    if (!item.parent_item_id) {
      setTaskHistory([])
      setSelectedItem(item)
      return
    }
    const parent = useSpacesStore.getState().items.find((i) => i.id === item.parent_item_id)
    if (parent) {
      setTaskHistory([parent])
      setSelectedItem(item)
    } else {
      setTaskHistory([])
      setSelectedItem(item)
    }
  }, [])

  // Closing the modal entirely clears the back stack.
  useEffect(() => {
    if (!selectedItem) setTaskHistory([])
  }, [selectedItem])

  const [spaceShareOpen, setSpaceShareOpen] = useState(false)
  const [spaceShareDualNavigator, setSpaceShareDualNavigator] = useState(false)

  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const moreMenuBtnRef = useRef<HTMLButtonElement>(null)
  const [moreMenuPos, setMoreMenuPos] = useState<{ top: number; left: number } | null>(null)

  const [groupByOpen, setGroupByOpen] = useState(false)
  const [docsDisplayMenuOpen, setDocsDisplayMenuOpen] = useState(false)
  const docsDisplayBtnRef = useRef<HTMLButtonElement>(null)
  const docsDisplayMenuRef = useRef<HTMLDivElement>(null)
  const [igDisplayMenuOpen, setIgDisplayMenuOpen] = useState(false)
  const igDisplayBtnRef = useRef<HTMLButtonElement>(null)
  const igDisplayMenuRef = useRef<HTMLDivElement>(null)
  const [igSortMenuOpen, setIgSortMenuOpen] = useState(false)
  const igSortBtnRef = useRef<HTMLButtonElement>(null)
  const [igOutlierMenuOpen, setIgOutlierMenuOpen] = useState(false)
  const igOutlierBtnRef = useRef<HTMLButtonElement>(null)
  const [subtasksMenuOpen, setSubtasksMenuOpen] = useState(false)
  const groupByBtnRef = useRef<HTMLSpanElement>(null)
  const subtasksBtnRef = useRef<HTMLButtonElement>(null)
  const contactsDetailToolbarLeftRef = useRef<HTMLDivElement>(null)
  const [contactsDetailToolbarLeftPx, setContactsDetailToolbarLeftPx] = useState(0)
  const [contactDetailOpen, setContactDetailOpen] = useState(false)
  const [artifactDetailOpen, setArtifactDetailOpen] = useState(false)
  const [contactCommsLoaded, setContactCommsLoaded] = useState(false)
  const [contactCommunicationTab, setContactCommunicationTab] =
    useState<ContactCommunicationTab>('all')
  const [contactDetailColumnLayout, setContactDetailColumnLayout] =
    useState<ContactDetailLayoutSizes | null>(null)

  const [financePlusOpen, setFinancePlusOpen] = useState(false)
  const financePlusRootRef = useRef<HTMLDivElement>(null)
  const [docsPlusOpen, setDocsPlusOpen] = useState(false)
  const docsPlusRootRef = useRef<HTMLDivElement>(null)
  const [docsSourceFilterOpen, setDocsSourceFilterOpen] = useState(false)
  const docsSourceFilterBtnRef = useRef<HTMLButtonElement>(null)
  const docsSourceFilterWrapRef = useRef<HTMLDivElement>(null)
  const docsSourceFilterDropdownRef = useRef<HTMLDivElement | null>(null)
  const [docsListSourceMenuOpen, setDocsListSourceMenuOpen] = useState(false)
  const docsListSourceWrapRef = useRef<HTMLDivElement>(null)
  const [reportingToolbarApi, setReportingToolbarApi] = useState<ReportingToolbarApi | null>(null)
  const [financeToolbarSearch, setFinanceToolbarSearch] = useState('')
  const [financeSearchOpen, setFinanceSearchOpen] = useState(false)
  const [contactsSearch, setContactsSearch] = useState('')
  const [contactsSearchOpen, setContactsSearchOpen] = useState(false)
  const [contactsSort, setContactsSort] = useState<CrmSort>('created_at.desc')
  const [contactsSortOpen, setContactsSortOpen] = useState(false)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactsAddOpen, setContactsAddOpen] = useState(false)
  const contactsAddRootRef = useRef<HTMLDivElement>(null)
  const [contactsManualOpen, setContactsManualOpen] = useState(false)
  const [contactsCsvOpen, setContactsCsvOpen] = useState(false)
  const [contactsGhlOpen, setContactsGhlOpen] = useState(false)
  const [contactsAcOpen, setContactsAcOpen] = useState(false)
  const [contactsSegmentPanelOpen, setContactsSegmentPanelOpen] = useState(false)
  const [activeContactsSegmentId, setActiveContactsSegmentId] = useState<string | null>(null)
  const [activeContactsSegmentName, setActiveContactsSegmentName] = useState<string | null>(null)
  const [expandedSwitcherIds, setExpandedSwitcherIds] = useState<Set<string>>(new Set())

  const igToolbarMenuOpen = igDisplayMenuOpen || igSortMenuOpen || igOutlierMenuOpen
  const docsToolbarMenuOpen = docsDisplayMenuOpen

  useEffect(() => {
    setFinancePlusOpen(false)
    setDocsPlusOpen(false)
    setSubtasksMenuOpen(false)
    setContactsAddOpen(false)
    setArtifactDetailOpen(false)
    setDocsListSourceMenuOpen(false)
  }, [activeViewId])

  useDismissOnOutsideAndEscape(financePlusOpen, {
    shouldDismiss: (t) => !financePlusRootRef.current?.contains(t),
    onDismiss: () => setFinancePlusOpen(false),
  })

  useDismissOnOutsideAndEscape(docsPlusOpen, {
    shouldDismiss: (t) => !docsPlusRootRef.current?.contains(t),
    onDismiss: () => setDocsPlusOpen(false),
  })

  useDismissOnOutsideAndEscape(moreMenuOpen, {
    shouldDismiss: (t) => {
      if (moreMenuRef.current?.contains(t)) return false
      if (moreMenuBtnRef.current?.contains(t)) return false
      if (t instanceof Element && t.closest(`[${VIBEY_SPACE_CUSTOMIZE_PORTAL_GUARD}]`)) return false
      return true
    },
    onDismiss: () => setMoreMenuOpen(false),
  })

  useDismissOnOutsideAndEscape(docsToolbarMenuOpen, {
    capture: true,
    shouldDismiss: (t) => {
      const inFloating =
        t instanceof Element && Boolean(t.closest(`[${VIBEY_SPACE_FLOATING_CONTROL}]`))
      const inside =
        inFloating ||
        (docsDisplayMenuRef.current?.contains(t) ?? false) ||
        (docsDisplayBtnRef.current?.contains(t) ?? false)
      return !inside
    },
    onDismiss: () => setDocsDisplayMenuOpen(false),
  })

  useDismissOnOutsideAndEscape(docsSourceFilterOpen, {
    capture: true,
    shouldDismiss: (t) =>
      !(
        docsSourceFilterWrapRef.current?.contains(t) ||
        docsSourceFilterDropdownRef.current?.contains(t)
      ),
    onDismiss: () => setDocsSourceFilterOpen(false),
  })

  useDismissOnOutsideAndEscape(docsListSourceMenuOpen, {
    capture: true,
    shouldDismiss: (t) => !docsListSourceWrapRef.current?.contains(t),
    onDismiss: () => setDocsListSourceMenuOpen(false),
  })

  useDismissOnOutsideAndEscape(igToolbarMenuOpen, {
    capture: true,
    shouldDismiss: (t) => {
      const inFloating =
        t instanceof Element && Boolean(t.closest(`[${VIBEY_SPACE_FLOATING_CONTROL}]`))
      const inside =
        inFloating ||
        (igDisplayMenuRef.current?.contains(t) ?? false) ||
        (igDisplayBtnRef.current?.contains(t) ?? false) ||
        (igSortBtnRef.current?.contains(t) ?? false) ||
        (igOutlierBtnRef.current?.contains(t) ?? false)
      return !inside
    },
    onDismiss: () => {
      setIgDisplayMenuOpen(false)
      setIgSortMenuOpen(false)
      setIgOutlierMenuOpen(false)
    },
  })

  useEffect(() => {
    setSpaceToolbarSearch('')
    setSpaceToolbarSearchOpen(false)
    setAssigneeFilterOpen(false)
  }, [activeViewId])

  const resetContactCommunicationTab = useCallback(() => {
    setContactCommunicationTab('all')
    setContactCommsLoaded(false)
  }, [])

  const handleCommunicationLoaded = useCallback(() => {
    setContactCommsLoaded(true)
  }, [])

  const handleContactDetailLayout = useCallback((layout: ContactDetailLayoutSizes | null) => {
    setContactDetailColumnLayout(layout)
  }, [])

  return {
    schemaEditorOpen,
    setSchemaEditorOpen,
    customizeSubjectViewId,
    setCustomizeSubjectViewId,
    panelInitialView,
    setPanelInitialView,
    customizeDropdownAnchorRef,
    closeCustomizePanel,
    openCustomizeFromToolbar,
    statusEditorOpen,
    setStatusEditorOpen,
    categoryEditorOpen,
    setCategoryEditorOpen,
    automationsOpen,
    setAutomationsOpen,
    spaceToolbarSearchOpen,
    setSpaceToolbarSearchOpen,
    spaceToolbarSearch,
    setSpaceToolbarSearch,
    assigneeFilterOpen,
    setAssigneeFilterOpen,
    selectedItem,
    setSelectedItem,
    taskHistory,
    pushTaskAndOpen,
    popTask,
    openSpaceItemModal,
    docEditorItem,
    setDocEditorItem,
    spaceShareOpen,
    setSpaceShareOpen,
    spaceShareDualNavigator,
    setSpaceShareDualNavigator,
    moreMenuOpen,
    setMoreMenuOpen,
    moreMenuBtnRef,
    moreMenuRef,
    moreMenuPos,
    setMoreMenuPos,
    groupByOpen,
    setGroupByOpen,
    docsDisplayMenuOpen,
    setDocsDisplayMenuOpen,
    docsDisplayBtnRef,
    docsDisplayMenuRef,
    igDisplayMenuOpen,
    setIgDisplayMenuOpen,
    igDisplayBtnRef,
    igDisplayMenuRef,
    igSortMenuOpen,
    setIgSortMenuOpen,
    igSortBtnRef,
    igOutlierMenuOpen,
    setIgOutlierMenuOpen,
    igOutlierBtnRef,
    subtasksMenuOpen,
    setSubtasksMenuOpen,
    groupByBtnRef,
    subtasksBtnRef,
    contactsDetailToolbarLeftRef,
    contactsDetailToolbarLeftPx,
    setContactsDetailToolbarLeftPx,
    contactDetailOpen,
    setContactDetailOpen,
    artifactDetailOpen,
    setArtifactDetailOpen,
    contactCommsLoaded,
    setContactCommsLoaded,
    contactCommunicationTab,
    setContactCommunicationTab,
    contactDetailColumnLayout,
    setContactDetailColumnLayout,
    financePlusOpen,
    setFinancePlusOpen,
    financePlusRootRef,
    docsPlusOpen,
    setDocsPlusOpen,
    docsPlusRootRef,
    docsSourceFilterOpen,
    setDocsSourceFilterOpen,
    docsSourceFilterBtnRef,
    docsSourceFilterWrapRef,
    docsSourceFilterDropdownRef,
    docsListSourceMenuOpen,
    setDocsListSourceMenuOpen,
    docsListSourceWrapRef,
    reportingToolbarApi,
    setReportingToolbarApi,
    financeToolbarSearch,
    setFinanceToolbarSearch,
    financeSearchOpen,
    setFinanceSearchOpen,
    contactsSearch,
    setContactsSearch,
    contactsSearchOpen,
    setContactsSearchOpen,
    contactsSort,
    setContactsSort,
    contactsSortOpen,
    setContactsSortOpen,
    contactsLoading,
    setContactsLoading,
    contactsAddOpen,
    setContactsAddOpen,
    contactsAddRootRef,
    contactsManualOpen,
    setContactsManualOpen,
    contactsCsvOpen,
    setContactsCsvOpen,
    contactsGhlOpen,
    setContactsGhlOpen,
    contactsAcOpen,
    setContactsAcOpen,
    contactsSegmentPanelOpen,
    setContactsSegmentPanelOpen,
    activeContactsSegmentId,
    setActiveContactsSegmentId,
    activeContactsSegmentName,
    setActiveContactsSegmentName,
    expandedSwitcherIds,
    setExpandedSwitcherIds,
    igToolbarMenuOpen,
    docsToolbarMenuOpen,
    resetContactCommunicationTab,
    handleCommunicationLoaded,
    handleContactDetailLayout,
  }
}
