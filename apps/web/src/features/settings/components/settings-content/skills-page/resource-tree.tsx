'use client'

import type { Dispatch, MouseEvent, SetStateAction } from 'react'
import { ChevronRight, Folder } from 'lucide-react'
import { SpaceListDndShell } from '@/features/spaces/components/SpaceListDndRow'
import { skillFolderDndId, skillResourceDndId } from './skill-resource-tree-dnd-apply'
import { SkillTreeRow } from './skill-tree-row'
import type { SkillTreeMenuTarget, SkillTreeRowMenuState } from './skill-tree-row-menu.types'
import type { ResourceTreeNode } from './skills-page.types'

function isSameMenuTarget(a: SkillTreeMenuTarget, b: SkillTreeMenuTarget): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'skill-md' && b.kind === 'skill-md') return true
  if (a.kind === 'file' && b.kind === 'file') return a.resourceId === b.resourceId
  if (a.kind === 'folder' && b.kind === 'folder') return a.path === b.path
  return false
}

function isRowMenuOpen(
  rowMenu: SkillTreeRowMenuState | undefined,
  target: SkillTreeMenuTarget,
): boolean {
  if (!rowMenu) return false
  return isSameMenuTarget(rowMenu.target, target)
}

export function ResourceTree({
  nodes,
  expandedFolders,
  setExpandedFolders,
  detailResourceId,
  setDetailResourceId,
  listActiveId = null,
  dndEnabled = false,
  rowMenu,
  onOpenRowMenuAtPointer,
  onOpenRowMenuFromButton,
}: {
  nodes: ResourceTreeNode[]
  expandedFolders: Set<string>
  setExpandedFolders: Dispatch<SetStateAction<Set<string>>>
  detailResourceId: string | null
  setDetailResourceId: (id: string) => void
  listActiveId?: string | null
  dndEnabled?: boolean
  rowMenu?: SkillTreeRowMenuState
  onOpenRowMenuAtPointer: (target: SkillTreeMenuTarget, e: MouseEvent<HTMLDivElement>) => void
  onOpenRowMenuFromButton: (target: SkillTreeMenuTarget, e: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {nodes.map((node) => {
        const isFolder = !node.resourceId && node.children.length > 0
        if (isFolder) {
          const expanded = expandedFolders.has(node.path)
          const folderTarget: SkillTreeMenuTarget = {
            kind: 'folder',
            path: node.path,
            expanded,
          }
          const toggleFolder = () =>
            setExpandedFolders((prev) => {
              const next = new Set(prev)
              if (next.has(node.path)) next.delete(node.path)
              else next.add(node.path)
              return next
            })

          const folderRow = (
            <SkillTreeRow
              selected={false}
              menuOpen={isRowMenuOpen(rowMenu, folderTarget)}
              onSelect={toggleFolder}
              onContextMenu={(e) => onOpenRowMenuAtPointer(folderTarget, e)}
              onOpenMenu={(e) => onOpenRowMenuFromButton(folderTarget, e)}
              title={node.path}
              leading={
                <>
                  <ChevronRight
                    className={`icon-xs shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  />
                  <Folder className="icon-xs shrink-0" />
                </>
              }
            >
              {node.name}
            </SkillTreeRow>
          )

          return (
            <div key={node.path}>
              {dndEnabled ? (
                <SpaceListDndShell
                  itemId={skillFolderDndId(node.path)}
                  listActiveId={listActiveId}
                  allowInto
                >
                  {() => folderRow}
                </SpaceListDndShell>
              ) : (
                folderRow
              )}
              {expanded ? (
                <div className="pl-spacing-3">
                  <ResourceTree
                    nodes={node.children}
                    expandedFolders={expandedFolders}
                    setExpandedFolders={setExpandedFolders}
                    detailResourceId={detailResourceId}
                    setDetailResourceId={setDetailResourceId}
                    listActiveId={listActiveId}
                    dndEnabled={dndEnabled}
                    rowMenu={rowMenu}
                    onOpenRowMenuAtPointer={onOpenRowMenuAtPointer}
                    onOpenRowMenuFromButton={onOpenRowMenuFromButton}
                  />
                </div>
              ) : null}
            </div>
          )
        }

        const selected = detailResourceId === node.resourceId
        const fileTarget: SkillTreeMenuTarget = {
          kind: 'file',
          resourceId: node.resourceId!,
          path: node.path,
        }
        const fileRow = (
          <SkillTreeRow
            selected={selected}
            menuOpen={isRowMenuOpen(rowMenu, fileTarget)}
            onSelect={() => setDetailResourceId(node.resourceId!)}
            onContextMenu={(e) => onOpenRowMenuAtPointer(fileTarget, e)}
            onOpenMenu={(e) => onOpenRowMenuFromButton(fileTarget, e)}
            title={node.path}
          >
            {node.name}
          </SkillTreeRow>
        )

        return dndEnabled ? (
          <SpaceListDndShell
            key={node.resourceId}
            itemId={skillResourceDndId(node.resourceId!)}
            listActiveId={listActiveId}
            allowInto={false}
          >
            {() => fileRow}
          </SpaceListDndShell>
        ) : (
          <div key={node.resourceId}>{fileRow}</div>
        )
      })}
    </div>
  )
}
