import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { TreeItem } from './TreeItem'
import type { TreeNode } from './types'
import { useChatStore } from '@/features/studio/store/use-chat-store'

const adNode: TreeNode = {
  id: 'ad-1',
  label: 'Ad One',
  type: 'ad',
  icon: <span />,
  resourceId: 'ad-resource-1',
}

function TreeItemHarness({
  node = adNode,
  expandedIds = new Set<string>(),
  selectedId = null,
  onSelect = vi.fn(),
  onToggle = vi.fn(),
  onEditFolder = vi.fn(),
  onDeleteFolder = vi.fn(),
}: {
  node?: TreeNode
  expandedIds?: Set<string>
  selectedId?: string | null
  onSelect?: (node: TreeNode) => void
  onToggle?: (id: string) => void
  onEditFolder?: (node: TreeNode) => void
  onDeleteFolder?: (node: TreeNode) => void
}) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  return (
    <TreeItem
      node={node}
      level={0}
      selectedId={selectedId}
      onSelect={onSelect}
      expandedIds={expandedIds}
      onToggle={onToggle}
      onEditFolder={onEditFolder}
      onDeleteFolder={onDeleteFolder}
      menuOpenId={menuOpenId}
      onMenuOpenChange={setMenuOpenId}
      campaigns={[
        { id: 'campaign-1', name: 'Campaign One', icon: 'Megaphone' },
        { id: 'campaign-2', name: 'Campaign Two', icon: 'Megaphone' },
      ]}
      currentCampaignId="campaign-1"
      onMoveToCampaign={vi.fn()}
      adSets={[{ id: 'ad-set-1', name: 'Ad Set One', campaignName: 'Campaign One' }]}
      onCloneToAdSet={vi.fn()}
      onCreateVariations={vi.fn()}
      onOpenBulkCreator={vi.fn()}
    />
  )
}

describe('TreeItem', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 48,
      height: 32,
      left: 80,
      right: 160,
      top: 16,
      width: 80,
      x: 80,
      y: 16,
      toJSON: () => ({}),
    })
    useChatStore.getState().clearNewArtifactIds()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useChatStore.getState().clearNewArtifactIds()
  })

  it('selects leaf artifacts and clears the new-artifact indicator', () => {
    const onSelect = vi.fn()
    useChatStore.getState().addNewArtifactId('ad-1')

    render(<TreeItemHarness onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /ad one/i }))

    expect(onSelect).toHaveBeenCalledWith(adNode)
    expect(useChatStore.getState().newArtifactIds).not.toContain('ad-1')
  })

  it('opens the folder menu and delegates edit actions', () => {
    const onEditFolder = vi.fn()

    render(<TreeItemHarness onEditFolder={onEditFolder} />)

    fireEvent.mouseEnter(screen.getByText('Ad One').closest('.group')!)
    fireEvent.click(screen.getByTitle('More options'))
    fireEvent.click(screen.getByRole('button', { name: /edit name/i }))

    expect(onEditFolder).toHaveBeenCalledWith(adNode)
  })

  it('limits long social-platform child lists until Show all is selected', () => {
    const socialNode: TreeNode = {
      id: 'social-linkedin',
      label: 'LinkedIn',
      type: 'social-platform',
      icon: <span />,
      children: Array.from({ length: 6 }, (_, index) => ({
        id: `social-post-${index + 1}`,
        label: `Post ${index + 1}`,
        type: 'social-post' as const,
        icon: <span />,
        resourceId: `post-${index + 1}`,
      })),
    }

    render(<TreeItemHarness node={socialNode} expandedIds={new Set(['social-linkedin'])} />)

    expect(screen.getByText('Post 1')).toBeInTheDocument()
    expect(screen.queryByText('Post 6')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /show all \(6\)/i }))

    expect(screen.getByText('Post 6')).toBeInTheDocument()
  })

  it('settles across rerenders without render-loop console errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { rerender } = render(<TreeItemHarness />)

    rerender(<TreeItemHarness selectedId="ad-1" />)

    const consoleOutput = consoleError.mock.calls.flat().join(' ')
    expect(consoleOutput).not.toContain('Maximum update depth')
    expect(consoleOutput).not.toContain('Too many re-renders')
  })
})
