'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MEDIA_TOAST_ERRORS } from '@/lib/config/media-toast-errors.config'
import { useCloudAttach } from '@/lib/hooks/use-cloud-attach'
import { useWorkspaceSettingsModal } from '@/lib/settings'
import { fetchSkSources, type SkSource } from '../../services/sk.service'
import {
  getFathomStatus,
  getFirefliesStatus,
} from '../../services/user-brain-import.service'
import {
  TRAINING_INTEGRATION_KEYS,
  TRAINING_SOURCE_RAIL_INTEGRATIONS,
} from './TrainingSourceRail'
import type { SourceKey } from './types'

export function useTrainingModalIntegrations({
  open,
  brainId,
  activeSource,
  onActiveSourceChange,
}: {
  open: boolean
  brainId: string | null
  activeSource: SourceKey
  onActiveSourceChange: (source: SourceKey) => void
}) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [skSources, setSkSources] = useState<SkSource[]>([])
  const [fathomConnected, setFathomConnected] = useState(false)
  const [firefliesConnected, setFirefliesConnected] = useState(false)
  const [integrationsStatusReady, setIntegrationsStatusReady] = useState(false)

  const { driveConnected, dropboxConnected, refreshConnectionStatus } = useCloudAttach({
    behavior: 'connect_if_disconnected',
    onDriveStatusErrorToast: MEDIA_TOAST_ERRORS.DRIVE_STATUS_CHECK_FAILED.userMessage,
    onDropboxStatusErrorToast: MEDIA_TOAST_ERRORS.DROPBOX_STATUS_CHECK_FAILED.userMessage,
  })

  const openIntegrationsLibraryFromTraining = useCallback(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', 'library')
      window.history.replaceState({}, '', url.toString())
    }
    openWorkspaceSettings('integrations')
  }, [openWorkspaceSettings])

  const refreshSources = useCallback(async () => {
    if (!brainId) return
    try {
      const list = await fetchSkSources(brainId)
      setSkSources(list)
    } catch {
      setSkSources([])
    }
  }, [brainId])

  useEffect(() => {
    if (!open || !brainId) {
      setIntegrationsStatusReady(false)
      return
    }
    let cancelled = false
    setIntegrationsStatusReady(false)
    void refreshSources()
    void (async () => {
      await refreshConnectionStatus()
      if (cancelled) return
      try {
        const [fathom, fireflies] = await Promise.all([getFathomStatus(), getFirefliesStatus()])
        if (!cancelled) {
          setFathomConnected(fathom.connected)
          setFirefliesConnected(fireflies.connected)
        }
      } catch {
        if (!cancelled) {
          setFathomConnected(false)
          setFirefliesConnected(false)
        }
      }
      if (!cancelled) setIntegrationsStatusReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [open, brainId, refreshSources, refreshConnectionStatus])

  const connectedIntegrationRailItems = useMemo(() => {
    return TRAINING_SOURCE_RAIL_INTEGRATIONS.filter((item) => {
      switch (item.key) {
        case 'drive':
          return driveConnected
        case 'dropbox':
          return dropboxConnected
        case 'fathom':
          return fathomConnected
        case 'fireflies':
          return firefliesConnected
        default:
          return false
      }
    })
  }, [driveConnected, dropboxConnected, fathomConnected, firefliesConnected])

  useEffect(() => {
    if (!integrationsStatusReady || !open) return
    const allowed = new Set(connectedIntegrationRailItems.map((item) => item.key))
    if (TRAINING_INTEGRATION_KEYS.some((key) => key === activeSource) && !allowed.has(activeSource)) {
      onActiveSourceChange('add')
    }
  }, [
    integrationsStatusReady,
    open,
    activeSource,
    connectedIntegrationRailItems,
    onActiveSourceChange,
  ])

  return {
    skSources,
    fathomConnected,
    firefliesConnected,
    integrationsStatusReady,
    connectedIntegrationRailItems,
    openIntegrationsLibraryFromTraining,
  }
}
