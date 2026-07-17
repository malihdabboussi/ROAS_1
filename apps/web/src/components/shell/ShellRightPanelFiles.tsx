'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, FolderOpen, ImageIcon } from 'lucide-react'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { getGoogleDriveStatus } from '@/lib/services/google-drive-api'
import { listAssets } from '@/lib/services/media-api'
import { fetchSpaceItems } from '@/lib/spaces/spaces-api'
import { cn } from '@/lib/utils/cn'

type FileRow = {
  id: string
  title: string
  kind: 'doc' | 'media' | 'drive'
  href?: string | null
}

export function ShellRightPanelFiles() {
  const activeSpaceId = useSpacesStore((s) => s.activeSpaceId)
  const [rows, setRows] = useState<FileRow[]>([])
  const [loading, setLoading] = useState(false)
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null)
  const [browseOpen, setBrowseOpen] = useState(false)

  const spaceId = activeSpaceId

  useEffect(() => {
    void getGoogleDriveStatus()
      .then((s) => setDriveConnected(Boolean(s.connected)))
      .catch(() => setDriveConnected(false))
  }, [])

  useEffect(() => {
    if (!spaceId) {
      setRows([])
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const [items, assetsResult] = await Promise.all([
          fetchSpaceItems(spaceId, { item_kind: 'doc', limit: 80 }).catch(() => []),
          listAssets({ space_id: spaceId, limit: 40 }).catch(() => ({ assets: [], total: 0 })),
        ])
        if (cancelled) return
        const docs: FileRow[] = items.map((item) => {
          const custom = (item.custom_data ?? {}) as Record<string, unknown>
          const driveLink =
            typeof custom._drive_web_view_link === 'string' ? custom._drive_web_view_link : null
          return {
            id: item.id,
            title: item.title?.trim() || 'Untitled doc',
            kind: custom._doc_source === 'drive' ? ('drive' as const) : ('doc' as const),
            href: driveLink,
          }
        })
        const media: FileRow[] = (assetsResult.assets ?? []).map((asset) => ({
          id: asset.id,
          title: asset.name?.trim() || 'Media',
          kind: 'media' as const,
          href: asset.public_url ?? null,
        }))
        setRows([...docs, ...media])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [spaceId])

  const emptyHint = useMemo(() => {
    if (!spaceId) return 'Open a space to see its files.'
    if (loading) return 'Loading files…'
    if (rows.length === 0) return 'No docs or media in this space yet.'
    return null
  }, [spaceId, loading, rows.length])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="body-4 text-muted-foreground uppercase tracking-wide">Space files</p>
        {driveConnected ? (
          <button
            type="button"
            onClick={() => setBrowseOpen(true)}
            className="body-4 text-primary flex items-center gap-1"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Browse Drive
          </button>
        ) : null}
      </div>

      {driveConnected === false ? (
        <p className="body-3 text-muted-foreground">
          Connect Google Drive to browse and open Drive files.
        </p>
      ) : null}

      {emptyHint ? <p className="body-3 text-muted-foreground">{emptyHint}</p> : null}

      <ul className="space-y-1">
        {rows.map((row) => {
          const Icon = row.kind === 'media' ? ImageIcon : FileText
          const content = (
            <>
              <Icon className="icon-sm text-muted-foreground shrink-0" />
              <span className="truncate">{row.title}</span>
            </>
          )
          return (
            <li key={`${row.kind}-${row.id}`}>
              {row.href ? (
                <a
                  href={row.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'body-3 text-foreground hover:bg-hover-subtle flex items-center gap-2 rounded-lg px-2 py-2',
                  )}
                >
                  {content}
                </a>
              ) : (
                <div className="body-3 text-foreground flex items-center gap-2 rounded-lg px-2 py-2">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {browseOpen ? (
        <DriveFileBrowserModal open={browseOpen} onClose={() => setBrowseOpen(false)} />
      ) : null}
    </div>
  )
}
