'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { AlertCircle, Redo2, Undo2 } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { CANVAS_VIEW_MESSAGES } from './canvas-view.messages.config'
import { CanvasPixelPanel } from './components/CanvasPixelPanel'
import { CanvasResourcePicker } from './components/CanvasResourcePicker'
import { WhiteboardNode } from './components/WhiteboardNode'
import { WhiteboardSelectionToolbar } from './components/WhiteboardSelectionToolbar'
import { WhiteboardToolbar } from './components/WhiteboardToolbar'
import { useCampaignWhiteboard } from './hooks/useCampaignWhiteboard'
import type { WhiteboardTool } from './types/whiteboard.types'

const nodeTypes = { whiteboard: WhiteboardNode }

function WhiteboardCanvasInner({ campaignId }: { campaignId: string }) {
  const whiteboard = useCampaignWhiteboard(campaignId)
  const [activeTool, setActiveTool] = useState<WhiteboardTool>('select')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pixelOpen, setPixelOpen] = useState(false)
  const [pixelComposerSeed, setPixelComposerSeed] = useState<{
    text: string
    nonce: string
  } | null>(null)
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const selectedNodes = useMemo(
    () => whiteboard.nodes.filter((node) => selectedIds.includes(node.id)),
    [selectedIds, whiteboard.nodes],
  )

  const selectTool = useCallback(
    (tool: WhiteboardTool) => {
      if (['note', 'text', 'shape', 'card', 'frame'].includes(tool)) {
        whiteboard.addNode(tool as 'note' | 'text' | 'shape' | 'card' | 'frame')
        setActiveTool('select')
        return
      }
      setActiveTool(tool)
    },
    [whiteboard],
  )

  useEffect(() => {
    const onPlaceholderAction = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          campaignId?: string
          action?: string
          title?: string
          stageKey?: string | null
          placeholder?: { asset_type?: string; brief?: string; suggested_action?: string }
        }>
      ).detail
      if (detail?.campaignId !== campaignId || detail.action === 'dismiss') return
      const request = [
        detail.action === 'attach'
          ? 'Attach an existing asset to'
          : detail.action === 'assign'
            ? 'Create and assign work for'
            : 'Create',
        `the Canvas placeholder “${detail.title ?? detail.placeholder?.asset_type ?? 'campaign asset'}”.`,
        detail.stageKey ? `Campaign stage: ${detail.stageKey}.` : '',
        detail.placeholder?.brief ?? '',
        detail.placeholder?.suggested_action
          ? `Use ${detail.placeholder.suggested_action} when appropriate, then replace this placeholder with the created asset and mark it ready.`
          : 'After completing it, replace this placeholder with the created asset and mark it ready.',
      ]
        .filter(Boolean)
        .join(' ')
      setResourcesOpen(false)
      setPixelOpen(true)
      setPixelComposerSeed({ text: request, nonce: crypto.randomUUID() })
    }
    window.addEventListener('canvas:placeholder-action', onPlaceholderAction)
    return () => window.removeEventListener('canvas:placeholder-action', onPlaceholderAction)
  }, [campaignId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, [contenteditable="true"]')) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        whiteboard.duplicateItems(selectedIds)
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        void (event.shiftKey ? whiteboard.redo() : whiteboard.undo())
        return
      }
      const shortcuts: Partial<Record<string, WhiteboardTool>> = {
        v: 'select',
        h: 'hand',
        n: 'note',
        t: 'text',
        f: 'frame',
        c: 'connector',
      }
      const tool = shortcuts[event.key.toLowerCase()]
      if (tool) selectTool(tool)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectTool, selectedIds, whiteboard])

  if (whiteboard.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text={CANVAS_VIEW_MESSAGES.loading} state="processing" size="lg" />
      </div>
    )
  }

  return (
    <div className="react-flow-container-optimized relative h-full min-h-0 flex-1">
      <WhiteboardToolbar
        activeTool={activeTool}
        onToolChange={selectTool}
        onOpenPixel={() => {
          setResourcesOpen(false)
          setPixelOpen(true)
        }}
        onOpenResources={() => {
          setPixelOpen(false)
          setResourcesOpen(true)
        }}
      />
      <WhiteboardSelectionToolbar
        selectedIds={selectedIds}
        allLocked={selectedNodes.length > 0 && selectedNodes.every((node) => node.data.locked)}
        onDuplicate={whiteboard.duplicateItems}
        onDelete={whiteboard.deleteItems}
        onSetLocked={whiteboard.setItemsLocked}
        onAlign={whiteboard.alignItems}
        onDistribute={whiteboard.distributeItems}
      />
      <div className="surface-card border-border bottom-spacing-3 left-spacing-3 rounded-spacing-2 px-spacing-3 py-spacing-2 absolute z-20 border shadow-sm">
        <div className="gap-spacing-2 flex items-center">
          <button
            type="button"
            className="button-ghost gap-spacing-1 flex items-center"
            onClick={() => void whiteboard.undo()}
            disabled={!whiteboard.canUndo}
            title="Undo last change"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </button>
          <button
            type="button"
            className="button-ghost gap-spacing-1 flex items-center"
            onClick={() => void whiteboard.redo()}
            disabled={!whiteboard.canRedo}
            title="Redo last change"
          >
            <Redo2 className="h-4 w-4" />
            Redo
          </button>
          <span className="body-4 text-muted-foreground" aria-live="polite">
            {whiteboard.saveState === 'saving' ? 'Saving changes...' : 'All changes saved'}
          </span>
        </div>
      </div>
      {whiteboard.error && (
        <div className="surface-card border-border right-spacing-3 top-spacing-3 gap-spacing-2 rounded-spacing-2 px-spacing-3 py-spacing-2 absolute z-10 flex items-center border shadow-lg">
          <AlertCircle className="text-destructive h-4 w-4" />
          <span className="body-3 text-muted-foreground">{whiteboard.error}</span>
        </div>
      )}
      {pixelOpen && (
        <CanvasPixelPanel
          boardId={whiteboard.boardId}
          campaignId={campaignId}
          revision={whiteboard.revision}
          viewport={whiteboard.viewport}
          selectedIds={selectedIds}
          composerSeed={pixelComposerSeed}
          onClose={() => setPixelOpen(false)}
        />
      )}
      {resourcesOpen && (
        <CanvasResourcePicker
          campaignId={campaignId}
          onClose={() => setResourcesOpen(false)}
          onSelect={(resource) => {
            whiteboard.addResourceNode(resource)
            setResourcesOpen(false)
          }}
        />
      )}
      {whiteboard.nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="surface-card border-border rounded-spacing-3 p-spacing-6 border text-center shadow-sm">
            <p className="title-h6 text-foreground">Map this campaign visually</p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Ask Pixel to map a funnel, or add campaign resources and arrange them yourself.
            </p>
            <div className="mt-spacing-3 gap-spacing-2 pointer-events-auto flex justify-center">
              <button
                type="button"
                className="button-glass-primary"
                onClick={() => {
                  setResourcesOpen(false)
                  setPixelOpen(true)
                }}
              >
                Build with Pixel
              </button>
              <button
                type="button"
                className="button-glass-neutral"
                onClick={() => {
                  setPixelOpen(false)
                  setResourcesOpen(true)
                }}
              >
                Add existing assets
              </button>
            </div>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={whiteboard.nodes}
        edges={whiteboard.edges}
        nodeTypes={nodeTypes}
        onNodesChange={whiteboard.onNodesChange}
        onEdgesChange={whiteboard.onEdgesChange}
        onConnect={whiteboard.connectItems}
        onSelectionChange={({ nodes }) => setSelectedIds(nodes.map((node) => node.id))}
        onMoveEnd={whiteboard.saveViewport}
        deleteKeyCode={['Backspace', 'Delete']}
        panOnDrag={activeTool === 'hand' ? [0, 1, 2] : [1, 2]}
        panOnScroll
        selectionOnDrag={activeTool === 'select'}
        nodesDraggable={activeTool === 'select'}
        nodesConnectable={activeTool === 'connector' || activeTool === 'select'}
        minZoom={0.1}
        maxZoom={2.5}
      >
        {/* Third-party canvas config reads the canonical theme token directly. */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--color-border)"
        />
        <Controls className="card-glass border-border rounded-spacing-2 border" />
        <MiniMap pannable zoomable className="card-glass border-border rounded-spacing-2 border" />
      </ReactFlow>
    </div>
  )
}

export function WhiteboardCanvas({ campaignId }: { campaignId: string }) {
  return (
    <ReactFlowProvider>
      <WhiteboardCanvasInner campaignId={campaignId} />
    </ReactFlowProvider>
  )
}
