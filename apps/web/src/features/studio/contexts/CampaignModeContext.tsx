'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { getOrgScopedKey } from '@/lib/utils/org-storage'
import { fetchCampaignSocialPosts } from '../services/artifact-preview.service'
import type { BulkCreatorSession, CampaignModeState, TabType } from '../types/studio.types'

interface CampaignModeContextValue extends CampaignModeState {
  setActiveCampaign: (id: string | null, name?: string | null, icon?: string | null) => void
  setActivePreviewTab: (tab: TabType) => void
  togglePanelMinimized: () => void
  expandPanel: (tab?: TabType) => void
  minimizePanel: () => void
  setSidebarMode: (mode: 'studio' | 'hq') => void
  setBulkCreatorAdSetId: (id: string | null) => void
  setBulkCreatorSession: (session: BulkCreatorSession | null) => void
}

const CampaignModeContext = createContext<CampaignModeContextValue | null>(null)

export function CampaignModeProvider({
  children,
  initialSidebarMode,
}: {
  children: ReactNode
  initialSidebarMode?: 'studio' | 'hq'
}) {
  const bulkCreatorStorageKey = getOrgScopedKey('vibey-bulk-creator')
  const campaignModeStorageKey = getOrgScopedKey('vibey-campaign-mode')

  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [activeCampaignName, setActiveCampaignName] = useState<string | null>(null)
  const [activeCampaignIcon, setActiveCampaignIcon] = useState<string | null>(null)
  const [isPanelMinimized, setIsPanelMinimized] = useState(false)
  const [sidebarMode, setSidebarMode] = useState<'studio' | 'hq'>(() => {
    if (initialSidebarMode) return initialSidebarMode
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/studio'))
      return 'hq'
    return 'studio'
  })
  const [activePreviewTab, setActivePreviewTab] = useState<TabType>('artifacts')
  const [hasSocialContent, setHasSocialContent] = useState(false)
  const [bulkCreatorAdSetId, setBulkCreatorAdSetId] = useState<string | null>(null)
  const [bulkCreatorSession, _setBulkCreatorSession] = useState<BulkCreatorSession | null>(() => {
    try {
      const raw = sessionStorage.getItem(bulkCreatorStorageKey)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const setBulkCreatorSession = useCallback(
    (session: BulkCreatorSession | null) => {
      _setBulkCreatorSession(session)
      try {
        if (session) sessionStorage.setItem(bulkCreatorStorageKey, JSON.stringify(session))
        else sessionStorage.removeItem(bulkCreatorStorageKey)
      } catch {
        /* empty */
      }
    },
    [bulkCreatorStorageKey],
  )
  const socialChannelRef = useRef<ReturnType<
    ReturnType<typeof createBrowserClient>['channel']
  > | null>(null)

  const isPanelExpanded = !isPanelMinimized && activeCampaignId !== null

  useEffect(() => {
    if (!activeCampaignId) {
      setHasSocialContent(false)
      return
    }
    fetchCampaignSocialPosts(activeCampaignId)
      .then((posts) => setHasSocialContent(posts.length > 0))
      .catch(() => setHasSocialContent(false))

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const ch = supabase
      .channel(`social-check:${activeCampaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'social_posts',
          filter: `campaign_id=eq.${activeCampaignId}`,
        },
        () => setHasSocialContent(true),
      )
      .subscribe()
    socialChannelRef.current = ch

    return () => {
      void supabase.removeChannel(ch)
      socialChannelRef.current = null
    }
  }, [activeCampaignId])

  // Hydrate campaign state from localStorage before paint (prevents panel pop-in flash)
  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(campaignModeStorageKey)
      if (raw) {
        const persisted = JSON.parse(raw)
        if (persisted.id) {
          setActiveCampaignId(persisted.id)
          setActiveCampaignName(persisted.name ?? null)
          setActiveCampaignIcon(persisted.icon ?? null)
          setIsPanelMinimized(persisted.minimized ?? false)
        }
      }
    } catch {
      /* empty */
    }
  }, [])

  const setActiveCampaign = useCallback(
    (id: string | null, name?: string | null, icon?: string | null) => {
      setActiveCampaignId(id)
      setActiveCampaignName(name ?? null)
      setActiveCampaignIcon(icon ?? null)
      // Do NOT auto-expand panel — only expandPanel (user click) or artifact events should open it
      // Persist to localStorage for instant hydration on reload
      try {
        if (id) {
          const raw = localStorage.getItem(campaignModeStorageKey)
          const existing = raw ? JSON.parse(raw) : {}
          localStorage.setItem(
            campaignModeStorageKey,
            JSON.stringify({
              id,
              name: name ?? null,
              icon: icon ?? null,
              minimized: existing.minimized ?? true,
            }),
          )
        } else {
          localStorage.removeItem(campaignModeStorageKey)
        }
      } catch {
        /* empty */
      }
    },
    [campaignModeStorageKey],
  )

  const togglePanelMinimized = useCallback(() => {
    setIsPanelMinimized((prev) => {
      const next = !prev
      try {
        const raw = localStorage.getItem(campaignModeStorageKey)
        if (raw) {
          const persisted = JSON.parse(raw)
          localStorage.setItem(
            campaignModeStorageKey,
            JSON.stringify({ ...persisted, minimized: next }),
          )
        }
      } catch {
        /* empty */
      }
      return next
    })
  }, [campaignModeStorageKey])

  const expandPanel = useCallback(
    (tab?: TabType) => {
      setIsPanelMinimized(false)
      if (tab) setActivePreviewTab(tab)
      try {
        const raw = localStorage.getItem(campaignModeStorageKey)
        if (raw) {
          const persisted = JSON.parse(raw)
          localStorage.setItem(
            campaignModeStorageKey,
            JSON.stringify({ ...persisted, minimized: false }),
          )
        }
      } catch {
        /* empty */
      }
    },
    [campaignModeStorageKey],
  )

  const minimizePanel = useCallback(() => {
    setIsPanelMinimized(true)
    try {
      const raw = localStorage.getItem(campaignModeStorageKey)
      if (raw) {
        const persisted = JSON.parse(raw)
        localStorage.setItem(
          campaignModeStorageKey,
          JSON.stringify({ ...persisted, minimized: true }),
        )
      }
    } catch {
      /* empty */
    }
  }, [campaignModeStorageKey])

  return (
    <CampaignModeContext.Provider
      value={{
        activeCampaignId,
        activeCampaignName,
        activeCampaignIcon,
        isPanelMinimized,
        isPanelExpanded,
        sidebarMode,
        activePreviewTab,
        hasSocialContent,
        bulkCreatorAdSetId,
        bulkCreatorSession,
        setActiveCampaign,
        setActivePreviewTab,
        togglePanelMinimized,
        expandPanel,
        minimizePanel,
        setSidebarMode,
        setBulkCreatorAdSetId,
        setBulkCreatorSession,
      }}
    >
      {children}
    </CampaignModeContext.Provider>
  )
}

export function useCampaignMode() {
  const context = useContext(CampaignModeContext)
  if (!context) {
    throw new Error('useCampaignMode must be used within CampaignModeProvider')
  }
  return context
}

/** Same as useCampaignMode but null outside CampaignModeProvider (e.g. channel DocumentCard). */
export function useCampaignModeOptional() {
  return useContext(CampaignModeContext)
}
