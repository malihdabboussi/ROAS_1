'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import { driveFallbackOpenHref } from '@/components/spaces/DriveDocViewer'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { CANVA_MESSAGES } from '@/lib/canva'
import { connectComposioIntegration } from '@/lib/integrations/connect-composio-integration'
import { connectGoogleDrive, getGoogleDriveStatus } from '@/lib/services/google-drive-api'
import { openMediaAssetInCanva } from '@/lib/services/media-api'
import { googleDocHref } from '@/lib/spaces/space-doc-export'
import { fetchSpaceItemById } from '@/lib/spaces/spaces-api'
import type { ShellOpenInTarget } from './shell-open-in.types'

type ShellOpenInContextValue = {
  targets: ShellOpenInTarget[]
  driveConnected: boolean | null
  connectDrive: () => Promise<void>
  setFocusItemId: (itemId: string | null) => void
  setFocusMedia: (
    media: { id: string; url: string | null; canvaSupported?: boolean } | null,
  ) => void
}

const ShellOpenInContext = createContext<ShellOpenInContextValue | null>(null)

export function useShellOpenIn(): ShellOpenInContextValue {
  const ctx = useContext(ShellOpenInContext)
  if (!ctx) {
    return {
      targets: [],
      driveConnected: null,
      connectDrive: async () => {},
      setFocusItemId: () => {},
      setFocusMedia: () => {},
    }
  }
  return ctx
}

export function ShellOpenInProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const itemParam = searchParams.get('item')
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null)
  const [focusItemId, setFocusItemId] = useState<string | null>(null)
  const [focusMedia, setFocusMedia] = useState<{
    id: string
    url: string | null
    canvaSupported?: boolean
  } | null>(null)
  const [targets, setTargets] = useState<ShellOpenInTarget[]>([])

  useEffect(() => {
    void getGoogleDriveStatus()
      .then((s) => setDriveConnected(Boolean(s.connected)))
      .catch(() => setDriveConnected(false))
  }, [pathname, activeSpaceId])

  useEffect(() => {
    setFocusItemId(itemParam)
    setFocusMedia(null)
  }, [pathname, activeSpaceId, itemParam])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next: ShellOpenInTarget[] = []

      if (focusMedia?.url) {
        next.push({ id: 'asset-url', label: 'Open asset', href: focusMedia.url })
      }
      if (focusMedia?.canvaSupported && focusMedia.id) {
        const mediaId = focusMedia.id
        next.push({
          id: 'canva',
          label: 'Open in Canva',
          onSelect: async () => {
            const pendingTab = window.open('about:blank', '_blank')
            if (pendingTab) pendingTab.opener = null
            try {
              let handoff = await openMediaAssetInCanva(mediaId)
              if (!handoff.success && handoff.code === 'NOT_CONNECTED') {
                const connection = await connectComposioIntegration('canva')
                if (connection.status === 'oauth_opened') {
                  pendingTab?.close()
                  toast.message(CANVA_MESSAGES.CONNECTING)
                  return
                }
                handoff = await openMediaAssetInCanva(mediaId)
              }
              if (!handoff.success) {
                pendingTab?.close()
                toast.error(CANVA_MESSAGES.IMPORT_FAILED)
                return
              }
              toast.success(CANVA_MESSAGES.OPENING)
              if (pendingTab) pendingTab.location.replace(handoff.edit_url)
              else if (!window.open(handoff.edit_url, '_blank', 'noopener,noreferrer')) {
                window.location.assign(handoff.edit_url)
              }
            } catch {
              pendingTab?.close()
              toast.error(CANVA_MESSAGES.IMPORT_FAILED)
            }
          },
        })
      }

      if (focusItemId) {
        try {
          const item = await fetchSpaceItemById(focusItemId)
          const custom = (item.custom_data ?? {}) as Record<string, unknown>
          const driveFileId =
            typeof custom._drive_file_id === 'string' ? custom._drive_file_id : null
          const driveView =
            typeof custom._drive_web_view_link === 'string' ? custom._drive_web_view_link : null
          const mime = typeof custom._drive_mime_type === 'string' ? custom._drive_mime_type : null
          if (driveFileId) {
            next.push({
              id: 'drive',
              label: 'Open in Drive',
              href: driveFallbackOpenHref(driveFileId, driveView, mime),
            })
          }
          const docsHref = googleDocHref(custom)
          if (docsHref) {
            next.push({ id: 'google-docs', label: 'Open in Google Docs', href: docsHref })
          }
        } catch {
          /* ignore */
        }
      }

      if (!cancelled) setTargets(next)
    })()
    return () => {
      cancelled = true
    }
  }, [focusItemId, focusMedia])

  const connectDrive = useCallback(async () => {
    const redirectTo =
      typeof window !== 'undefined' ? window.location.href : '/settings?tab=integrations'
    const res = await connectGoogleDrive(redirectTo)
    if (res?.authorizeUrl) window.location.href = res.authorizeUrl
  }, [])

  const value = useMemo(
    () => ({
      targets,
      driveConnected,
      connectDrive,
      setFocusItemId,
      setFocusMedia,
    }),
    [targets, driveConnected, connectDrive],
  )

  return <ShellOpenInContext.Provider value={value}>{children}</ShellOpenInContext.Provider>
}
