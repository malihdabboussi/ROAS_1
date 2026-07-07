'use client'

import type { Dispatch, SetStateAction } from 'react'
import { ChevronRight, Folder, X } from 'lucide-react'
import type { ResourceTreeNode } from './skills-page.types'

export function DraftResourceTree({
  nodes,
  expandedFolders,
  setExpandedFolders,
  selectedResourceId,
  setSelectedResourceId,
  onDeleteResource,
}: {
  nodes: ResourceTreeNode[]
  expandedFolders: Set<string>
  setExpandedFolders: Dispatch<SetStateAction<Set<string>>>
  selectedResourceId: string | null
  setSelectedResourceId: (id: string) => void
  onDeleteResource: (id: string) => void
}) {
  return (
    <>
      {nodes.map((node) => {
        const isFolder = !node.resourceId && node.children.length > 0
        if (isFolder) {
          const expanded = expandedFolders.has(node.path)
          return (
            <div key={node.path}>
              <button
                type="button"
                onClick={() =>
                  setExpandedFolders((prev) => {
                    const next = new Set(prev)
                    if (next.has(node.path)) next.delete(node.path)
                    else next.add(node.path)
                    return next
                  })
                }
                className="body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 gap-spacing-1 text-muted-foreground flex w-full items-center text-left hover:bg-white/5"
              >
                <ChevronRight
                  className={`icon-xs shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
                <Folder className="icon-xs shrink-0" />
                <span className="truncate">{node.name}</span>
              </button>
              {expanded ? (
                <div className="pl-spacing-3">
                  <DraftResourceTree
                    nodes={node.children}
                    expandedFolders={expandedFolders}
                    setExpandedFolders={setExpandedFolders}
                    selectedResourceId={selectedResourceId}
                    setSelectedResourceId={setSelectedResourceId}
                    onDeleteResource={onDeleteResource}
                  />
                </div>
              ) : null}
            </div>
          )
        }
        return (
          <div key={node.resourceId} className="group flex items-center">
            <button
              type="button"
              onClick={() => setSelectedResourceId(node.resourceId!)}
              className={`body-3 rounded-spacing-2 px-spacing-2 py-spacing-1 min-w-0 flex-1 truncate text-left ${
                selectedResourceId === node.resourceId ? 'chip-glass-blue' : 'hover:bg-white/5'
              }`}
              title={node.path}
            >
              {node.name}
            </button>
            <button
              type="button"
              onClick={() => onDeleteResource(node.resourceId!)}
              className="text-muted-foreground hover:text-destructive ml-spacing-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Remove ${node.name}`}
            >
              <X className="icon-xs" />
            </button>
          </div>
        )
      })}
    </>
  )
}
