'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { DriveFileBrowserModal } from '@/components/media/DriveFileBrowserModal'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import {
  createDriveFolderMapping,
  deleteDriveFolderMapping,
  listDriveFolderMappings,
  syncDriveFolderMappingNow,
  updateDriveFolderMapping,
  type DriveFolderMapping,
} from '@/lib/services/drive-mappings-api'
import { getGoogleDriveStatus } from '@/lib/services/google-drive-api'
import { fixedFloatingPortalStyle } from '@/lib/ui'
import { DriveFoldersDropdown } from './drive-folders-panel/DriveFoldersDropdown'
import {
  DRIVE_FOLDERS_MENU_WIDTH_PX,
  GOOGLE_DRIVE_TOOLBAR_LOGO,
} from './drive-folders-panel/drive-folders-panel-utils'

type DriveFoldersPanelProps = {
  spaceId: string
  onMappingsChanged?: () => void
  onSyncingStateChange?: (syncing: boolean) => void
  className?: string
}

export function DriveFoldersPanel({
  spaceId,
  onMappingsChanged,
  onSyncingStateChange,
  className,
}: DriveFoldersPanelProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [mappings, setMappings] = useState<DriveFolderMapping[]>([])
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const wasSyncingRef = useRef(false)

  const anySyncing = useMemo(
    () => mappings.some((mapping) => mapping.sync_status === 'syncing'),
    [mappings],
  )

  const withBusy = useCallback(async (id: string, work: () => Promise<void>) => {
    setBusyIds((prev) => new Set(prev).add(id))
    try {
      await work()
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  // Callback props live in refs so `load` only depends on spaceId — parent
  // toolbars re-render with fresh inline handlers and must not refire the
  // status/mappings pair (perf-optimize pattern 5: load-signature guards).
  const onMappingsChangedRef = useRef(onMappingsChanged)
  const onSyncingStateChangeRef = useRef(onSyncingStateChange)
  useEffect(() => {
    onMappingsChangedRef.current = onMappingsChanged
    onSyncingStateChangeRef.current = onSyncingStateChange
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [status, list] = await Promise.all([
        // Connection status is near-static — reuse for 5 min across mounts
        // and sync-poll ticks. Mappings use ttl 0 (dedupe only) so every
        // settled call refetches fresh after mutations (pattern 1).
        cachedFetch('google-drive:status', () => getGoogleDriveStatus(), { ttlMs: 300_000 }),
        cachedFetch(`drive-mappings:${spaceId}`, () => listDriveFolderMappings(spaceId)),
      ])
      setConnected(status.connected)
      setMappings(list)
      onSyncingStateChangeRef.current?.(list.some((mapping) => mapping.sync_status === 'syncing'))
      const nowSyncing = list.some((mapping) => mapping.sync_status === 'syncing')
      if (wasSyncingRef.current && !nowSyncing) {
        onMappingsChangedRef.current?.()
      }
      wasSyncingRef.current = nowSyncing
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Drive folders'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    void load()
  }, [load])

  useLayoutEffect(() => {
    if (!open) {
      setDropdownPos(null)
      return
    }
    const syncPos = () => {
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r || typeof window === 'undefined') return
      let left = r.left
      left = Math.max(8, Math.min(left, window.innerWidth - DRIVE_FOLDERS_MENU_WIDTH_PX - 8))
      setDropdownPos({ top: r.bottom + 4, left })
    }
    syncPos()
    window.addEventListener('resize', syncPos)
    window.addEventListener('scroll', syncPos, true)
    return () => {
      window.removeEventListener('resize', syncPos)
      window.removeEventListener('scroll', syncPos, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
    }
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutside, true)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onOutside, true)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  useEffect(() => {
    if (!anySyncing) return
    const timer = setInterval(() => {
      void load()
    }, 5_000)
    return () => clearInterval(timer)
  }, [anySyncing, load])

  const onPickFolder = useCallback(
    (folder: {
      id: string
      name: string
      source?: 'my_drive' | 'shared_with_me' | 'shared_drives'
      driveId?: string
    }) => {
      void (async () => {
        try {
          await createDriveFolderMapping(spaceId, {
            drive_folder_id: folder.id,
            drive_folder_name: folder.name,
            source: folder.source ?? 'my_drive',
            ...(folder.driveId ? { drive_id: folder.driveId } : {}),
          })
          toast.success('Drive folder added — syncing files…')
          setPickerOpen(false)
          await load()
          onMappingsChangedRef.current?.()
          setOpen(true)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to map Drive folder'
          toast.error(message)
        }
      })()
    },
    [spaceId, load],
  )

  const mappedCount = mappings.length

  return (
    <div ref={panelRef} className={`relative ${className ?? ''}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Drive folders"
        aria-expanded={open}
        className="rounded-spacing-2 hover:bg-hover-subtle hover:text-foreground inline-flex h-spacing-7 shrink-0 items-center gap-1 px-spacing-1 text-muted-foreground transition-colors"
      >
        <img
          src={GOOGLE_DRIVE_TOOLBAR_LOGO}
          alt=""
          className="h-5 w-5 shrink-0 select-none"
          draggable={false}
        />
        {mappedCount > 0 ? (
          <span className="badge-glass badge-glass-blue rounded-spacing-1 px-spacing-1 typo-caption inline-flex min-h-5 min-w-5 items-center justify-center font-semibold leading-none tabular-nums">
            {mappedCount}
          </span>
        ) : null}
        {anySyncing ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" /> : null}
      </button>

      {open && dropdownPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={dropdownRef}
              className="dropdown-menu-solid z-dropdown p-spacing-2 fixed w-80 rounded-xl shadow-lg"
              style={fixedFloatingPortalStyle(dropdownPos)}
            >
              <DriveFoldersDropdown
                loading={loading}
                connected={connected}
                mappings={mappings}
                busyIds={busyIds}
                anySyncing={anySyncing}
                onAddFolder={() => {
                  setOpen(false)
                  setPickerOpen(true)
                }}
                onSyncNow={(mapping) =>
                  void withBusy(mapping.id, async () => {
                    await syncDriveFolderMappingNow(spaceId, mapping.id)
                    await load()
                  })
                }
                onToggleEnabled={(mapping) =>
                  void withBusy(mapping.id, async () => {
                    await updateDriveFolderMapping(spaceId, mapping.id, {
                      enabled: !mapping.enabled,
                    })
                    await load()
                  })
                }
                onDeleteMapping={(mapping) =>
                  void withBusy(mapping.id, async () => {
                    const ok = window.confirm(
                      `Remove Drive mapping "${mapping.drive_folder_name}" and delete synced docs?`,
                    )
                    if (!ok) return
                    await deleteDriveFolderMapping(spaceId, mapping.id, true)
                    await load()
                    onMappingsChangedRef.current?.()
                  })
                }
              />
            </div>,
            document.body,
          )
        : null}

      <DriveFileBrowserModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        pickFoldersOnly
        onSelectDriveFile={(file) => {
          onPickFolder({
            id: file.id,
            name: file.name,
            source: file.source,
            driveId: file.driveId,
          })
        }}
      />
    </div>
  )
}
