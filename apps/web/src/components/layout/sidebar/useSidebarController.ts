'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { cachedProjects, useCachedProjects } from '@/features/projects/hooks/use-cached-projects'
import { createProject, ensureSandboxRunning } from '@/features/projects/services/projects.service'
import type { ProjectRepo } from '@/features/projects/types'
import { cachedSpaces, useCachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import { createSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import '@/features/studio/types/vibey-pending-artifact-open'
import { useCampaignMode } from '@/features/studio/contexts/CampaignModeContext'
import {
  deleteConversation,
  renameConversation,
  selectConversation,
} from '@/features/studio/services/chat.service'
import { useChatStore, useStoreHydrated } from '@/features/studio/store/use-chat-store'
import {
  subscribeOpenStudioSearch,
  type StudioSearchModalSelection,
} from '@/features/studio/utils/open-studio-search-result'
import { useUserRole } from '@/hooks/use-user-role'
import { billingApi } from '@/lib/billing/billing-api'
import { SIDEBAR_TOAST_ERRORS } from '../config/sidebar-toast-errors.config'
import {
  readExpandedProgramIds,
  readExpandedSpaceCampaignIds,
  writeExpandedProgramIds,
  writeExpandedSpaceCampaignIds,
} from './sidebar-expand-persistence'
import type { HubMenuSectionId } from './sidebar-hq-hub-menu.types'
import { defaultHubMenuExpandedSections, toggleHubMenuSection } from './sidebar-hq-hub-menu.utils'
import type { ConversationTypeFilter, SidebarProps } from './sidebar-types'
import { useSidebarCampaignsCore } from './useSidebarCampaignsCore'

function isAppTeamRoute(pathname: string) {
  return pathname === '/team' || pathname.startsWith('/team/')
}

export function useSidebarController({ userName, email, avatarUrl }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const {
    activeCampaignId,
    sidebarMode,
    setActiveCampaign,
    setSidebarMode,
    minimizePanel,
    expandPanel,
  } = useCampaignMode()
  const { role, loading: roleLoading } = useUserRole()
  const hasManageAccess = true
  const isAdmin = role === 'admin'
  const storeHydrated = useStoreHydrated()
  const [mounted, setMounted] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const isMobileCheck = () => window.matchMedia('(max-width: 767px)').matches
    const handleToggle = () => {
      if (isMobileCheck()) setMobileDrawerOpen((p) => !p)
    }
    const handleClose = () => setMobileDrawerOpen(false)
    window.addEventListener('toggle-mobile-sidebar', handleToggle)
    window.addEventListener('close-mobile-sidebar', handleClose)
    return () => {
      window.removeEventListener('toggle-mobile-sidebar', handleToggle)
      window.removeEventListener('close-mobile-sidebar', handleClose)
    }
  }, [])

  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [pathname])

  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    if (mobileDrawerOpen) setCollapsed(false)
  }, [mobileDrawerOpen])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => {
      if (!mq.matches) setMobileDrawerOpen(false)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const desiredMode: 'studio' | 'hq' = pathname.startsWith('/studio') ? 'studio' : 'hq'
    if (sidebarMode !== desiredMode) setSidebarMode(desiredMode)
  }, [pathname, sidebarMode, setSidebarMode])

  const [studioSearchOpen, setStudioSearchOpen] = useState(false)
  const [conversationTypeFilter] = useState<ConversationTypeFilter>('all')

  const [isFreePlan, setIsFreePlan] = useState(false)
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Set<string>>(new Set())
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)

  const {
    campaigns,
    campaignsLoading,
    sortedCampaigns,
    generalCampaign,
    personalCampaign,
    manageCampaigns,
    hiddenCampaigns,
    isCreatingCampaign,
    setIsCreatingCampaign,
    newCampaignName,
    setNewCampaignName,
    newCampaignIcon,
    setNewCampaignIcon,
    showNewCampaignModal,
    setShowNewCampaignModal,
    editingCampaign,
    setEditingCampaign,
    deletingCampaign,
    setDeletingCampaign,
    campaignMenuId,
    setCampaignMenuId,
    campaignMenuTriggerRef,
    campaignMenuAnchorRect,
    requestCreateCampaign,
    handleCreateCampaignInline,
    handlePinCampaign,
    patchCampaignConfig,
    toggleFavoriteCampaign,
    toggleHiddenCampaign,
    archiveCampaignById,
    handleDeleteCampaign,
    handleNewCampaignModalCreate,
  } = useSidebarCampaignsCore({
    activeCampaignId,
    setActiveCampaign,
  })

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [moveSubmenuOpenId, setMoveSubmenuOpenId] = useState<string | null>(null)
  const convMenuTriggerRef = useRef<HTMLElement | null>(null)
  const [convMenuPosition, setConvMenuPosition] = useState({ top: 0, left: 0 })

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [campaignsFlyout, setCampaignsFlyout] = useState(false)
  const campaignsFlyoutRef = useRef<HTMLDivElement>(null)
  const [agentsFlyout, setAgentsFlyout] = useState(false)
  const agentsFlyoutRef = useRef<HTMLDivElement>(null)

  const [activeManagePanel, setActiveManagePanel] = useState<
    'projects' | 'spaces' | 'team2' | 'brain' | 'more' | null
  >(null)
  const [isPanelClosing, setIsPanelClosing] = useState(false)
  const [hubMenuOpen, setHubMenuOpen] = useState(false)
  const [hubMenuClosing, setHubMenuClosing] = useState(false)
  const [hubMenuExpandedSections, setHubMenuExpandedSections] = useState<Set<HubMenuSectionId>>(
    new Set(),
  )
  const [expandedSpaceCampaignIds, setExpandedSpaceCampaignIds] = useState<Set<string>>(
    () => readExpandedSpaceCampaignIds() ?? new Set(),
  )
  const [expandedProgramIds, setExpandedProgramIds] = useState<Set<string>>(
    () => readExpandedProgramIds() ?? new Set(),
  )
  const skipCampaignExpandPersist = useRef(true)
  const skipProgramExpandPersist = useRef(true)

  useEffect(() => {
    if (skipCampaignExpandPersist.current) {
      skipCampaignExpandPersist.current = false
      return
    }
    writeExpandedSpaceCampaignIds(expandedSpaceCampaignIds)
  }, [expandedSpaceCampaignIds])

  useEffect(() => {
    if (skipProgramExpandPersist.current) {
      skipProgramExpandPersist.current = false
      return
    }
    writeExpandedProgramIds(expandedProgramIds)
  }, [expandedProgramIds])

  // Hover flyouts must not survive programmatic navigation (chat deep-links, task open, etc.).
  useEffect(() => {
    setActiveManagePanel(null)
    setIsPanelClosing(false)
    setCampaignsFlyout(false)
    setAgentsFlyout(false)
  }, [pathname])

  // Prefetch in HQ mode so Campaigns hover flyouts are not empty while the
  // first spaces page is still in flight after mouseenter.
  const hubSpacesDataEnabled =
    sidebarMode === 'hq' ||
    activeManagePanel === 'spaces' ||
    (hubMenuOpen && hubMenuExpandedSections.has('spaces'))
  const hubProjectsDataEnabled =
    activeManagePanel === 'projects' || activeManagePanel === 'more' || hubMenuOpen

  const { data: sidebarProjectsData } = useCachedProjects(hubProjectsDataEnabled)
  const sidebarProjects = sidebarProjectsData ?? []
  const setSidebarProjects = useCallback((next: SetStateAction<ProjectRepo[]>) => {
    cachedProjects.mutate((prev) =>
      typeof next === 'function'
        ? (next as (value: ProjectRepo[]) => ProjectRepo[])(prev ?? [])
        : next,
    )
  }, [])

  const [isCreatingList, setIsCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [isSubmittingList, setIsSubmittingList] = useState(false)
  const {
    data: sidebarListsData,
    loading: sidebarListsLoading,
    reload: reloadSidebarLists,
    hasMore: sidebarListsHasMore,
    loadingMore: sidebarListsLoadingMore,
    loadMore: loadMoreSidebarLists,
  } = useCachedSpaces(hubSpacesDataEnabled)
  const sidebarLists = sidebarListsData ?? []

  const conversations = useChatStore((s) => s.conversations)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const unreadConversationIds = useChatStore((s) => s.unreadConversationIds)
  const removeConversation = useChatStore((s) => s.removeConversation)
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId)
  const updateConversation = useChatStore((s) => s.updateConversation)

  const displayName = userName ?? email?.split('@')[0] ?? 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  useEffect(() => {
    billingApi
      .getStatusCached()
      .then((s) => {
        const slug = s.plan?.slug ?? 'free'
        setIsFreePlan(slug === 'free')
      })
      .catch(() => setIsFreePlan(false))
  }, [])

  useEffect(() => {
    if (activeManagePanel !== 'projects' && activeManagePanel !== 'more') {
      setIsCreatingProject(false)
      setNewProjectName('')
    }
    if (activeManagePanel !== 'spaces') {
      setIsCreatingList(false)
      setNewListName('')
    }
  }, [activeManagePanel])

  useEffect(() => {
    if (!isPanelClosing) return
    const t = setTimeout(() => {
      setActiveManagePanel(null)
      setIsPanelClosing(false)
    }, 300)
    return () => clearTimeout(t)
  }, [isPanelClosing])

  useEffect(() => {
    if (!hubMenuClosing) return
    const t = setTimeout(() => {
      setHubMenuOpen(false)
      setHubMenuClosing(false)
    }, 300)
    return () => clearTimeout(t)
  }, [hubMenuClosing])

  useEffect(() => {
    if (hubMenuOpen) return
    setHubMenuExpandedSections(new Set())
  }, [hubMenuOpen])

  const closeHubMenu = useCallback(() => {
    if (!hubMenuOpen || hubMenuClosing) return
    setHubMenuClosing(true)
  }, [hubMenuClosing, hubMenuOpen])

  const forceCloseHubMenu = useCallback(() => {
    setHubMenuOpen(false)
    setHubMenuClosing(false)
  }, [])

  const openHubMenu = useCallback(() => {
    setHubMenuOpen(true)
    setHubMenuClosing(false)
    setActiveManagePanel(null)
    setIsPanelClosing(false)
    setHubMenuExpandedSections(defaultHubMenuExpandedSections(pathname))
  }, [pathname])

  const toggleHubMenu = useCallback(() => {
    if (hubMenuOpen) {
      closeHubMenu()
      return
    }
    openHubMenu()
  }, [closeHubMenu, hubMenuOpen, openHubMenu])

  const toggleHubMenuSectionById = useCallback((sectionId: HubMenuSectionId) => {
    setHubMenuExpandedSections((current) => toggleHubMenuSection(current, sectionId))
  }, [])

  const syncHubMenuExpandedToRoute = useCallback(() => {
    setHubMenuExpandedSections(defaultHubMenuExpandedSections(pathname))
  }, [pathname])

  const filteredConversations = useMemo(() => {
    const getUpdatedAt = (value: string | null | undefined): number => {
      const ts = Date.parse(value ?? '')
      return Number.isNaN(ts) ? 0 : ts
    }
    return conversations
      .filter((conv) => {
        if (!conv.title) return false
        if (conversationTypeFilter === 'non-campaign' && conv.campaign_id) return false
        if (conversationTypeFilter === 'favorites') {
          if (!(conv.metadata as Record<string, unknown>)?.isFavorite) return false
        }
        if (conversationTypeFilter === 'current-campaign') {
          if (!activeCampaignId || conv.campaign_id !== activeCampaignId) return false
        }
        return true
      })
      .sort((a, b) => getUpdatedAt(b.updated_at) - getUpdatedAt(a.updated_at))
  }, [conversations, conversationTypeFilter, activeCampaignId])

  useEffect(() => {
    return subscribeOpenStudioSearch(() => setStudioSearchOpen(true))
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node
      if (t instanceof Element && t.closest('[data-flyout-campaigns]')) return
      if (campaignsFlyoutRef.current && !campaignsFlyoutRef.current.contains(t)) {
        setCampaignsFlyout(false)
      }
    }
    if (campaignsFlyout) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [campaignsFlyout])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node
      if (t instanceof Element && t.closest('[data-flyout-agents]')) return
      if (agentsFlyoutRef.current && !agentsFlyoutRef.current.contains(t)) {
        setAgentsFlyout(false)
      }
    }
    if (agentsFlyout) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
    return undefined
  }, [agentsFlyout])

  useEffect(() => {
    if (
      !activeConversationId ||
      activeConversationId.startsWith('pending-') ||
      !storeHydrated ||
      campaigns.length === 0
    )
      return
    const conv = conversations.find((c) => c.id === activeConversationId)
    if (!conv) return
    const campaignId = conv.campaign_id ?? (generalCampaign ? generalCampaign.id : null)
    if (!campaignId) return
    const row = campaigns.find((c) => c.id === campaignId)
    if (!row) return
    setActiveCampaign(row.id, row.name, row.icon)
    setExpandedCampaignIds(new Set([campaignId]))
  }, [
    activeConversationId,
    conversations,
    generalCampaign,
    campaigns,
    setActiveCampaign,
    storeHydrated,
  ])

  function isActive(href: string): boolean {
    if (pathname === href) return true
    if (href === '/') return false
    return pathname.startsWith(`${href}/`)
  }

  const handleCreateList = useCallback(
    async (campaignId?: string | null) => {
      const title = newListName.trim()
      if (!title || isSubmittingList) return
      setIsSubmittingList(true)
      try {
        const list = await createSpace({ title, campaign_id: campaignId ?? undefined })
        cachedSpaces.mutate((prev) => [list, ...(prev ?? [])])
        useSpacesStore.setState((s) => ({ spaces: [list, ...s.spaces] }))
        setNewListName('')
        setIsCreatingList(false)
        useSpacesStore.getState().setActiveSpace(list.id)
        router.push('/spaces')
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : SIDEBAR_TOAST_ERRORS.SAVE_CAMPAIGN_FAILED.userMessage,
        )
      } finally {
        setIsSubmittingList(false)
      }
    },
    [newListName, isSubmittingList, router],
  )

  const handleCreateListFull = useCallback(
    async (payload: {
      title: string
      description?: string
      visibility: 'private' | 'team'
      default_share_level?: 'admin' | 'edit' | 'view'
      campaign_id?: string | null
      schema?: { icon: string; icon_color?: string }
    }) => {
      const list = await createSpace({
        title: payload.title,
        description: payload.description,
        visibility: payload.visibility,
        default_share_level: payload.default_share_level,
        campaign_id: payload.campaign_id ?? undefined,
        schema: payload.schema,
      })
      cachedSpaces.mutate((prev) => [list, ...(prev ?? [])])
      useSpacesStore.setState((s) => ({ spaces: [list, ...s.spaces] }))
      useSpacesStore.getState().setActiveSpace(list.id)
      router.push('/spaces')
      return list
    },
    [router],
  )

  const handleCreateProject = useCallback(async () => {
    const name = newProjectName.trim()
    if (!name || isSubmittingProject) return
    setIsSubmittingProject(true)
    try {
      const project = await createProject({ name })
      void ensureSandboxRunning(project.id)
      cachedProjects.mutate((prev) => [project, ...(prev ?? [])])
      setNewProjectName('')
      setIsCreatingProject(false)
      router.push(`/projects/${project.id}`)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : SIDEBAR_TOAST_ERRORS.SAVE_CAMPAIGN_FAILED.userMessage,
      )
    } finally {
      setIsSubmittingProject(false)
    }
  }, [newProjectName, isSubmittingProject, router])

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null)
    useChatStore.getState().setWantsNewConversation(true)
    setActiveCampaign(null)
    setMobileDrawerOpen(false)
    if (!isAppTeamRoute(pathname)) router.push('/team')
  }, [pathname, router, setActiveConversationId, setActiveCampaign])

  const handleSelectCampaign = useCallback(
    (row: { id: string; name: string; icon?: string | null }) => {
      setActiveCampaign(row.id, row.name, row.icon)
      minimizePanel()
      setActiveConversationId(null)
      useChatStore.getState().setWantsNewConversation(true)
      setExpandedCampaignIds(new Set([row.id]))
      setCampaignsFlyout(false)
      setMobileDrawerOpen(false)
      if (!isAppTeamRoute(pathname)) router.push('/team')
    },
    [setActiveCampaign, minimizePanel, setActiveConversationId, pathname, router],
  )

  const handleSelectConversation = useCallback(
    async (conversationId: string) => {
      const conv = conversations.find((c) => c.id === conversationId)
      if (conv?.campaign_id) {
        const row = campaigns.find((c) => c.id === conv.campaign_id)
        if (row) setActiveCampaign(row.id, row.name, row.icon)
        setExpandedCampaignIds(new Set([conv.campaign_id]))
      } else {
        if (generalCampaign) {
          setActiveCampaign(generalCampaign.id, generalCampaign.name, generalCampaign.icon)
          setExpandedCampaignIds(new Set([generalCampaign.id]))
        } else {
          setActiveCampaign(null)
          setExpandedCampaignIds(new Set())
        }
      }
      await selectConversation(conversationId)
      setMenuOpenId(null)
      setAgentsFlyout(false)
      setMobileDrawerOpen(false)
      if (!isAppTeamRoute(pathname)) router.push(`/team?c=${conversationId}`)
    },
    [conversations, campaigns, generalCampaign, setActiveCampaign, pathname, router],
  )

  const handleStudioSearchSelect = useCallback(
    (sel: StudioSearchModalSelection) => {
      if (sel.type === 'conversation') {
        void handleSelectConversation(sel.id)
        return
      }
      if (sel.type === 'campaign') {
        handleSelectCampaign({
          id: sel.id,
          name: sel.name,
          icon: sel.icon ?? 'folder-kanban',
        })
        return
      }
      if (sel.type === 'url') {
        router.push(sel.url)
        return
      }
      if (sel.type === 'artifact') {
        setActiveCampaign(sel.campaignId, sel.campaignName, sel.campaignIcon ?? 'folder-kanban')
        expandPanel('artifacts')
        window.__vibey_pending_artifact_open = sel.pending
        window.dispatchEvent(new CustomEvent('workflow:open-artifact'))
        setExpandedCampaignIds(new Set([sel.campaignId]))
        setMobileDrawerOpen(false)
        setAgentsFlyout(false)
        setMenuOpenId(null)
        useChatStore.getState().setActiveConversationId(null)
        if (!isAppTeamRoute(pathname)) {
          router.push('/team')
        } else if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.delete('c')
          const qs = url.searchParams.toString()
          window.history.replaceState(null, '', qs ? `${url.pathname}?${qs}` : url.pathname)
        }
      }
    },
    [
      handleSelectConversation,
      handleSelectCampaign,
      setActiveCampaign,
      expandPanel,
      pathname,
      router,
    ],
  )

  const handleStartRename = useCallback((convId: string, title: string) => {
    setRenamingId(convId)
    setRenameValue(title)
    setMenuOpenId(null)
  }, [])

  const handleSubmitRename = useCallback(
    async (convId: string) => {
      const trimmed = renameValue.trim()
      if (!trimmed) {
        setRenamingId(null)
        return
      }
      if (convId.startsWith('pending-')) {
        setRenamingId(null)
        setRenameValue('')
        return
      }
      await renameConversation(convId, trimmed)
      updateConversation(convId, { title: trimmed })
      setRenamingId(null)
      setRenameValue('')
    },
    [renameValue, updateConversation],
  )

  const handleToggleFavorite = useCallback(
    (convId: string) => {
      const conv = conversations.find((c) => c.id === convId)
      if (!conv) return
      const isFav = !!(conv.metadata as Record<string, unknown>)?.isFavorite
      const newMeta = { ...(conv.metadata ?? {}), isFavorite: !isFav }
      updateConversation(convId, { metadata: newMeta })
      setMenuOpenId(null)
    },
    [conversations, updateConversation],
  )

  const handleMoveToCampaign = useCallback(
    (convId: string, campaignId: string | null) => {
      updateConversation(convId, { campaign_id: campaignId })
      setMenuOpenId(null)
      setMoveSubmenuOpenId(null)
    },
    [updateConversation],
  )

  const handleDeleteConversation = useCallback(
    async (convId: string) => {
      await deleteConversation(convId)
      removeConversation(convId)
      setMenuOpenId(null)
    },
    [removeConversation],
  )

  useEffect(() => {
    if (menuOpenId && convMenuTriggerRef.current) {
      const rect = convMenuTriggerRef.current.getBoundingClientRect()
      setConvMenuPosition({ top: rect.top, left: rect.right + 8 })
    }
  }, [menuOpenId])

  const hubExpanded = hubMenuOpen || hubMenuClosing

  const desktopWidth =
    sidebarMode === 'hq'
      ? hubExpanded
        ? 'md:w-[272px]'
        : 'md:w-[72px]'
      : collapsed
        ? 'md:w-[72px]'
        : 'md:w-[264px]'

  return {
    pathname,
    router,
    activeCampaignId,
    sidebarMode,
    setActiveCampaign,
    setSidebarMode,
    minimizePanel,
    expandPanel,
    role,
    roleLoading,
    hasManageAccess,
    isAdmin,
    storeHydrated,
    mounted,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    collapsed,
    setCollapsed,
    studioSearchOpen,
    setStudioSearchOpen,
    campaigns,
    campaignsLoading,
    isFreePlan,
    expandedCampaignIds,
    setExpandedCampaignIds,
    isCreatingProject,
    setIsCreatingProject,
    isSubmittingProject,
    newProjectName,
    setNewProjectName,
    isCreatingCampaign,
    setIsCreatingCampaign,
    newCampaignName,
    setNewCampaignName,
    newCampaignIcon,
    setNewCampaignIcon,
    showNewCampaignModal,
    setShowNewCampaignModal,
    editingCampaign,
    setEditingCampaign,
    sidebarProjects,
    setSidebarProjects,
    sidebarLists,
    sidebarListsLoading,
    reloadSidebarLists,
    sidebarListsHasMore,
    sidebarListsLoadingMore,
    loadMoreSidebarLists,
    isCreatingList,
    setIsCreatingList,
    newListName,
    setNewListName,
    isSubmittingList,
    handleCreateList,
    handleCreateListFull,
    deletingCampaign,
    setDeletingCampaign,
    campaignMenuId,
    setCampaignMenuId,
    campaignMenuTriggerRef,
    campaignMenuAnchorRect,
    menuOpenId,
    setMenuOpenId,
    moveSubmenuOpenId,
    setMoveSubmenuOpenId,
    convMenuTriggerRef,
    convMenuPosition,
    renamingId,
    setRenamingId,
    renameValue,
    setRenameValue,
    campaignsFlyout,
    setCampaignsFlyout,
    campaignsFlyoutRef,
    agentsFlyout,
    setAgentsFlyout,
    agentsFlyoutRef,
    activeManagePanel,
    setActiveManagePanel,
    isPanelClosing,
    setIsPanelClosing,
    hubMenuOpen,
    hubMenuClosing,
    hubMenuExpandedSections,
    openHubMenu,
    forceCloseHubMenu,
    toggleHubMenu,
    closeHubMenu,
    toggleHubMenuSectionById,
    syncHubMenuExpandedToRoute,
    expandedSpaceCampaignIds,
    setExpandedSpaceCampaignIds,
    expandedProgramIds,
    setExpandedProgramIds,
    conversations,
    activeConversationId,
    unreadConversationIds,
    setActiveConversationId,
    displayName,
    email,
    avatarUrl,
    initials,
    sortedCampaigns,
    generalCampaign,
    personalCampaign,
    manageCampaigns,
    hiddenCampaigns,
    filteredConversations,
    desktopWidth,
    isActive,
    handleCreateProject,
    handleNewChat,
    handleSelectCampaign,
    handlePinCampaign,
    patchCampaignConfig,
    toggleFavoriteCampaign,
    toggleHiddenCampaign,
    archiveCampaignById,
    handleDeleteCampaign,
    handleSelectConversation,
    handleStudioSearchSelect,
    handleStartRename,
    handleSubmitRename,
    handleToggleFavorite,
    handleMoveToCampaign,
    handleDeleteConversation,
    requestCreateCampaign,
    handleCreateCampaignInline,
    handleNewCampaignModalCreate,
  }
}

export type SidebarControllerReturn = ReturnType<typeof useSidebarController>
