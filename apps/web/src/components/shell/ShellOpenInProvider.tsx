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
import { driveFallbackOpenHref } from '@/components/spaces/DriveDocViewer'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
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
        try {
          const handoff = await openMediaAssetInCanva(focusMedia.id)
          if (handoff.success && handoff.edit_url) {
            next.push({ id: 'canva', label: 'Open in Canva', href: handoff.edit_url })
          }
        } catch {
          /* ignore */
        }
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
