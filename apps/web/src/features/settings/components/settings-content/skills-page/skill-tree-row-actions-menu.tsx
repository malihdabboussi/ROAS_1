'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Braces,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  FilePlus,
  FileText,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react'
import type { MissionAgentSkillResource } from '@/features/mission-control/types'
import type { SkillTreeMenuTarget } from './skill-tree-row-menu.types'

const itemCls =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50'
const itemIcon = 'icon-sm shrink-0'
const destructiveCls =
  'gap-spacing-2 body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left text-destructive transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:text-destructive'

export function SkillTreeRowActionsMenu({
  target,
  pointer,
  writeLocked,
  detailExportingPdf,
  getResourceById,
  onClose,
  onCopyPath,
  onExportSkillMdMarkdown,
  onExportSkillMdPdf,
  onExportSkillMdJson,
  onRenameFile,
  onDownloadFile,
  onOpenFile,
  onDeleteFile,
  onAddFileInFolder,
  onUploadToFolder,
  onToggleFolder,
}: {
  target: SkillTreeMenuTarget
  pointer: { x: number; y: number }
  writeLocked: boolean
  detailExportingPdf: boolean
  getResourceById: (resourceId: string) => MissionAgentSkillResource | undefined
  onClose: () => void
  onCopyPath: (path: string) => void | Promise<void>
  onExportSkillMdMarkdown: () => void
  onExportSkillMdPdf: () => void | Promise<void>
  onExportSkillMdJson: () => void
  onRenameFile: (resourceId: string, currentPath: string) => void | Promise<void>
  onDownloadFile: (resourceId: string) => void
  onOpenFile: (url: string) => void
  onDeleteFile: (resourceId: string) => void | Promise<void>
  onAddFileInFolder: (folderPath: string) => void
  onUploadToFolder: (folderPath: string) => void
  onToggleFolder: (folderPath: string, expanded: boolean) => void
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = dropdownRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pad = 8
    const vw = window.innerWidth
    const vh = window.innerHeight
    let top = pointer.y
    let left = pointer.x
    if (left + rect.width > vw - pad) left = Math.max(pad, vw - rect.width - pad)
    if (top + rect.height > vh - pad) top = Math.max(pad, vh - rect.height - pad)
    if (top < pad) top = pad
    el.style.top = `${top}px`
    el.style.left = `${left}px`
  }, [pointer, target, writeLocked, detailExportingPdf])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const node = e.target as HTMLElement
      if (
        node.closest('[data-skill-tree-row-menu]') ||
        node.closest('[data-skill-tree-row-menu-trigger]')
      ) {
        return
      }
      onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const close = () => onClose()
  const wrap = (fn: () => void | Promise<void>) => async () => {
    try {
      await fn()
    } finally {
      close()
    }
  }

  const fileResource = target.kind === 'file' ? getResourceById(target.resourceId) : undefined
  const fileStorageUrl = fileResource?.storage_url?.trim() || null

  return createPortal(
    <div
      data-skill-tree-row-menu
      ref={dropdownRef}
      role="menu"
      className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-1 fixed min-w-48 border shadow-lg"
      style={{ top: pointer.y, left: pointer.x }}
    >
      {target.kind === 'skill-md' ? (
        <div className="flex flex-col">
          <button
            type="button"
            role="menuitem"
            onClick={wrap(() => onCopyPath('SKILL.md'))}
            className={itemCls}
          >
            <Copy className={itemIcon} />
            <span>Copy path</span>
          </button>
          <div className="border-border border-t" />
          <button
            type="button"
            role="menuitem"
            onClick={wrap(onExportSkillMdMarkdown)}
            className={itemCls}
          >
            <FileCode className={itemIcon} />
            <span>Export Markdown</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={wrap(onExportSkillMdPdf)}
            disabled={detailExportingPdf}
            className={itemCls}
          >
            <FileText className={itemIcon} />
            <span>{detailExportingPdf ? 'Exporting…' : 'Export PDF'}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={wrap(onExportSkillMdJson)}
            className={itemCls}
          >
            <Braces className={itemIcon} />
            <span>Export JSON</span>
          </button>
        </div>
      ) : null}

      {target.kind === 'file' ? (
        <div className="flex flex-col">
          {!writeLocked ? (
            <button
              type="button"
              role="menuitem"
              onClick={wrap(() => onRenameFile(target.resourceId, target.path))}
              className={itemCls}
            >
              <Pencil className={itemIcon} />
              <span>Rename</span>
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={wrap(() => onCopyPath(target.path))}
            className={itemCls}
          >
            <Copy className={itemIcon} />
            <span>Copy path</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={wrap(() => onDownloadFile(target.resourceId))}
            className={itemCls}
          >
            <Download className={itemIcon} />
            <span>Download</span>
          </button>
          {fileStorageUrl ? (
            <button
              type="button"
              role="menuitem"
              onClick={wrap(() => onOpenFile(fileStorageUrl))}
              className={itemCls}
            >
              <ExternalLink className={itemIcon} />
              <span>Open file</span>
            </button>
          ) : null}
          {!writeLocked ? (
            <>
              <div className="border-border border-t" />
              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  const resourceId = target.resourceId
                  close()
                  await onDeleteFile(resourceId)
                }}
                className={destructiveCls}
              >
                <Trash2 className={itemIcon} />
                <span>Delete</span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {target.kind === 'folder' ? (
        <div className="flex flex-col">
          {!writeLocked ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={wrap(() => onAddFileInFolder(target.path))}
                className={itemCls}
              >
                <FilePlus className={itemIcon} />
                <span>Add file</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={wrap(() => onUploadToFolder(target.path))}
                className={itemCls}
              >
                <Upload className={itemIcon} />
                <span>Upload file</span>
              </button>
              <div className="border-border border-t" />
            </>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={wrap(() => onToggleFolder(target.path, target.expanded))}
            className={itemCls}
          >
            {target.expanded ? (
              <ChevronDown className={itemIcon} />
            ) : (
              <ChevronRight className={itemIcon} />
            )}
            <span>{target.expanded ? 'Collapse' : 'Expand'}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={wrap(() => onCopyPath(target.path))}
            className={itemCls}
          >
            <Copy className={itemIcon} />
            <span>Copy path</span>
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
