import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import type { Presentation } from '../../../types'
import { updateFunnel, updatePresentation, type Funnel } from '../../../services/artifact-preview.service'

interface UseSettingsTabEntityControlsOptions {
  funnels: Funnel[]
  setFunnels: Dispatch<SetStateAction<Funnel[]>>
  presentations: Presentation[]
  setPresentations: Dispatch<SetStateAction<Presentation[]>>
}

export function useSettingsTabEntityControls({
  funnels: _funnels,
  setFunnels,
  presentations,
  setPresentations,
}: UseSettingsTabEntityControlsOptions) {
  const [savingFunnelIds, setSavingFunnelIds] = useState<Set<string>>(new Set())
  const [activeFunnelIndex, setActiveFunnelIndex] = useState(0)
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null)
  const [draftFunnelName, setDraftFunnelName] = useState('')
  const funnelContainerRef = useRef<HTMLDivElement>(null)
  const funnelNameInputRef = useRef<HTMLInputElement>(null)

  const [savingPresentationIds, setSavingPresentationIds] = useState<Set<string>>(new Set())
  const [activePresentationIndex, setActivePresentationIndex] = useState(0)
  const [editingPresentationId, setEditingPresentationId] = useState<string | null>(null)
  const [draftPresentationName, setDraftPresentationName] = useState('')
  const presentationContainerRef = useRef<HTMLDivElement>(null)
  const presentationNameInputRef = useRef<HTMLInputElement>(null)

  const [activeWebsiteIndex, setActiveWebsiteIndex] = useState(0)
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null)
  const [draftWebsiteName, setDraftWebsiteName] = useState('')
  const [savingWebsiteIds, setSavingWebsiteIds] = useState<Set<string>>(new Set())
  const websiteContainerRef = useRef<HTMLDivElement>(null)
  const websiteNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editingFunnelId) return
    const timeoutId = setTimeout(() => {
      funnelNameInputRef.current?.focus()
      funnelNameInputRef.current?.select()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [editingFunnelId])

  useEffect(() => {
    if (!editingPresentationId) return
    const timeoutId = setTimeout(() => {
      presentationNameInputRef.current?.focus()
      presentationNameInputRef.current?.select()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [editingPresentationId])

  const handleStartEditFunnelName = useCallback((funnel: Funnel) => {
    setEditingFunnelId(funnel.id)
    setDraftFunnelName(funnel.name ?? '')
  }, [])

  const handleCancelEditFunnelName = useCallback(() => {
    setEditingFunnelId(null)
    setDraftFunnelName('')
  }, [])

  const handleCommitEditFunnelName = useCallback(
    async (funnel: Funnel) => {
      const nextName = draftFunnelName.trim() || funnel.name || 'New Funnel'
      const previousName = funnel.name
      setEditingFunnelId(null)
      setDraftFunnelName('')
      if (nextName === previousName) return
      setFunnels((prev) => prev.map((item) => (item.id === funnel.id ? { ...item, name: nextName } : item)))
      try {
        setSavingFunnelIds((prev) => new Set(prev).add(funnel.id))
        const updated = await updateFunnel(funnel.id, { name: nextName })
        setFunnels((prev) =>
          prev.map((item) => (item.id === funnel.id ? { ...item, name: updated.name } : item)),
        )
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_SETTINGS)
        setFunnels((prev) =>
          prev.map((item) =>
            item.id === funnel.id ? { ...item, name: previousName ?? item.name } : item,
          ),
        )
      } finally {
        setSavingFunnelIds((prev) => {
          const next = new Set(prev)
          next.delete(funnel.id)
          return next
        })
      }
    },
    [draftFunnelName, setFunnels],
  )

  const handleStartEditPresentationName = useCallback((presentation: Presentation) => {
    setEditingPresentationId(presentation.id)
    setDraftPresentationName(presentation.name ?? '')
  }, [])

  const handleCancelEditPresentationName = useCallback(() => {
    setEditingPresentationId(null)
    setDraftPresentationName('')
  }, [])

  const handleCommitEditPresentationName = useCallback(
    async (presentation: Presentation) => {
      const nextName = draftPresentationName.trim() || presentation.name || 'New Presentation'
      const previousName = presentation.name
      setEditingPresentationId(null)
      setDraftPresentationName('')
      if (nextName === previousName) return
      setPresentations((prev) =>
        prev.map((item) => (item.id === presentation.id ? { ...item, name: nextName } : item)),
      )
      try {
        setSavingPresentationIds((prev) => new Set(prev).add(presentation.id))
        const updated = await updatePresentation(presentation.id, { name: nextName })
        setPresentations((prev) =>
          prev.map((item) => (item.id === presentation.id ? { ...item, name: updated.name } : item)),
        )
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_SETTINGS)
        setPresentations((prev) =>
          prev.map((item) =>
            item.id === presentation.id ? { ...item, name: previousName ?? item.name } : item,
          ),
        )
      } finally {
        setSavingPresentationIds((prev) => {
          const next = new Set(prev)
          next.delete(presentation.id)
          return next
        })
      }
    },
    [draftPresentationName, setPresentations],
  )

  const handleStartEditWebsiteName = useCallback((website: Funnel) => {
    setEditingWebsiteId(website.id)
    setDraftWebsiteName(website.name ?? '')
  }, [])

  const handleCancelEditWebsiteName = useCallback(() => {
    setEditingWebsiteId(null)
    setDraftWebsiteName('')
  }, [])

  const handleCommitEditWebsiteName = useCallback(
    async (website: Funnel) => {
      const nextName = draftWebsiteName.trim() || website.name || 'New Website'
      const previousName = website.name
      setEditingWebsiteId(null)
      setDraftWebsiteName('')
      if (nextName === previousName) return
      setFunnels((prev) => prev.map((item) => (item.id === website.id ? { ...item, name: nextName } : item)))
      try {
        setSavingWebsiteIds((prev) => new Set(prev).add(website.id))
        await updateFunnel(website.id, { name: nextName })
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_SETTINGS)
        setFunnels((prev) =>
          prev.map((item) =>
            item.id === website.id ? { ...item, name: previousName ?? item.name } : item,
          ),
        )
      } finally {
        setSavingWebsiteIds((prev) => {
          const next = new Set(prev)
          next.delete(website.id)
          return next
        })
      }
    },
    [draftWebsiteName, setFunnels],
  )

  const handleSaveWebsiteLayout = useCallback(
    async (websiteId: string, layout: Record<string, unknown>) => {
      try {
        setSavingWebsiteIds((prev) => new Set(prev).add(websiteId))
        await updateFunnel(websiteId, { layout })
        setFunnels((prev) => prev.map((item) => (item.id === websiteId ? { ...item, layout } : item)))
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_SETTINGS)
      } finally {
        setSavingWebsiteIds((prev) => {
          const next = new Set(prev)
          next.delete(websiteId)
          return next
        })
      }
    },
    [setFunnels],
  )

  const handleTogglePresentationBranding = useCallback(
    async (presentationId: string, hideBranding: boolean) => {
      const presentation = presentations.find((item) => item.id === presentationId)
      if (!presentation) return
      setPresentations((prev) =>
        prev.map((item) =>
          item.id === presentationId ? { ...item, hide_branding: hideBranding } : item,
        ),
      )
      try {
        setSavingPresentationIds((prev) => new Set(prev).add(presentationId))
        await updatePresentation(presentationId, { hide_branding: hideBranding })
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_SETTINGS)
        setPresentations((prev) =>
          prev.map((item) =>
            item.id === presentationId
              ? { ...item, hide_branding: presentation.hide_branding }
              : item,
          ),
        )
      } finally {
        setSavingPresentationIds((prev) => {
          const next = new Set(prev)
          next.delete(presentationId)
          return next
        })
      }
    },
    [presentations, setPresentations],
  )

  return {
    savingFunnelIds,
    activeFunnelIndex,
    setActiveFunnelIndex,
    editingFunnelId,
    draftFunnelName,
    setDraftFunnelName,
    funnelContainerRef,
    funnelNameInputRef,
    handleStartEditFunnelName,
    handleCancelEditFunnelName,
    handleCommitEditFunnelName,
    savingPresentationIds,
    activePresentationIndex,
    setActivePresentationIndex,
    editingPresentationId,
    draftPresentationName,
    setDraftPresentationName,
    presentationContainerRef,
    presentationNameInputRef,
    handleStartEditPresentationName,
    handleCancelEditPresentationName,
    handleCommitEditPresentationName,
    handleTogglePresentationBranding,
    activeWebsiteIndex,
    setActiveWebsiteIndex,
    editingWebsiteId,
    draftWebsiteName,
    setDraftWebsiteName,
    savingWebsiteIds,
    websiteContainerRef,
    websiteNameInputRef,
    handleStartEditWebsiteName,
    handleCancelEditWebsiteName,
    handleCommitEditWebsiteName,
    handleSaveWebsiteLayout,
  }
}
