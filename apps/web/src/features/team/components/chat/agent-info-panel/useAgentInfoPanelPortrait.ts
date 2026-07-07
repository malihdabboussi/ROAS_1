import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { updateAgentImage } from '@/features/mission-control/services/missions.service'
import type { MissionAgent } from '@/features/mission-control/types'
import type { Campaign } from '@/features/studio/types'
import { backendUpload } from '@/lib/api/backend-client'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'

export function useAgentInfoPanelPortrait(args: {
  selected: MissionAgent | null
  setAgents: React.Dispatch<React.SetStateAction<MissionAgent[]>>
  assignedCampaigns: Campaign[]
  nonGeneralCampaigns: Campaign[]
  generatingAvatarIds: Set<string>
  handleGeneratePortrait: () => Promise<void>
}) {
  const {
    selected,
    setAgents,
    assignedCampaigns,
    nonGeneralCampaigns,
    generatingAvatarIds,
    handleGeneratePortrait,
  } = args

  const previousImageRef = useRef<string | null>(null)
  const imageAddMenuRef = useRef<HTMLDivElement>(null)
  const portraitFileInputRef = useRef<HTMLInputElement>(null)
  const emptyPortraitDragDepth = useRef(0)

  const [imageAddMenuOpen, setImageAddMenuOpen] = useState(false)
  const [showLibraryPicker, setShowLibraryPicker] = useState(false)
  const [isDraggingPortraitFile, setIsDraggingPortraitFile] = useState(false)

  const {
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
  } = useCloudAttach({
    behavior: 'connect_if_disconnected',
    onBeforeOpen: () => setImageAddMenuOpen(false),
    onDriveStatusErrorToast: MEDIA_TOAST_ERRORS.DRIVE_STATUS_CHECK_FAILED.userMessage,
    onDropboxStatusErrorToast: MEDIA_TOAST_ERRORS.DROPBOX_STATUS_CHECK_FAILED.userMessage,
  })

  const mediaPickerCampaignId = assignedCampaigns[0]?.id ?? nonGeneralCampaigns[0]?.id ?? undefined

  const applyAgentPortraitUrl = useCallback(
    async (url: string) => {
      if (!selected || !url.trim()) return
      previousImageRef.current = selected.image_url ?? null
      setAgents((agents) =>
        agents.map((a) => (a.id === selected.id ? { ...a, image_url: url.trim() } : a)),
      )
      setImageAddMenuOpen(false)
      setShowLibraryPicker(false)
      await updateAgentImage(selected.agent_key, url.trim()).catch(() => null)
    },
    [selected, setAgents],
  )

  const uploadPortraitFile = useCallback(
    async (file: File) => {
      if (!selected) return
      if (!file.type.startsWith('image/')) {
        toast.error('Please choose an image file')
        return
      }
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      formData.append('category', 'agent-avatar')
      if (mediaPickerCampaignId) formData.append('campaign_id', mediaPickerCampaignId)
      try {
        const res = await backendUpload<{
          success?: boolean
          asset?: { public_url?: string; id?: string }
          url?: string
        }>('/api/media/upload', formData)
        const url = res.asset?.public_url ?? res.url
        if (url) await applyAgentPortraitUrl(url)
        else toast.error(MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage)
      } catch {
        toast.error(MEDIA_TOAST_ERRORS.ADD_TO_LIBRARY_FAILED.userMessage)
      }
    },
    [selected, mediaPickerCampaignId, applyAgentPortraitUrl],
  )

  const selectedConfig = (selected?.config ?? {}) as Record<string, unknown>
  const selectedAvatarMode = selectedConfig.avatar_mode === 'portrait' ? 'portrait' : 'animation'
  const showSelectedVibeyAnimation =
    selected?.agent_key === 'vibey' && selectedAvatarMode === 'animation' && !selected.image_url

  const canSetPortraitImage =
    !!selected && !generatingAvatarIds.has(selected.id) && !showSelectedVibeyAnimation

  const showEmptyPortraitDropZone = canSetPortraitImage && !selected?.image_url

  useEffect(() => {
    if (!imageAddMenuOpen) return
    const close = (e: MouseEvent) => {
      const el = imageAddMenuRef.current
      if (el && !el.contains(e.target as Node)) setImageAddMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [imageAddMenuOpen])

  useEffect(() => {
    emptyPortraitDragDepth.current = 0
    setIsDraggingPortraitFile(false)
  }, [selected?.id])

  return {
    previousImageRef,
    imageAddMenuRef,
    portraitFileInputRef,
    emptyPortraitDragDepth,
    imageAddMenuOpen,
    setImageAddMenuOpen,
    showLibraryPicker,
    setShowLibraryPicker,
    isDraggingPortraitFile,
    setIsDraggingPortraitFile,
    showDrivePicker,
    setShowDrivePicker,
    showDropboxPicker,
    setShowDropboxPicker,
    openDrive,
    openDropbox,
    mediaPickerCampaignId,
    applyAgentPortraitUrl,
    uploadPortraitFile,
    canSetPortraitImage,
    showEmptyPortraitDropZone,
    showSelectedVibeyAnimation,
    handleGeneratePortrait,
  }
}
