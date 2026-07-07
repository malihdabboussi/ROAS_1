import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRef } from 'react'
import { FolderMenuDropdown } from './FolderMenuDropdown'
import type { TreeNode } from './types'
import { useChatStore } from '@/features/studio/store/use-chat-store'

const baseNode: TreeNode = {
  id: 'ad-1',
  label: 'Launch ad',
  type: 'ad',
  icon: <span />,
  resourceId: 'ad-resource-1',
}

function Harness({
  node = baseNode,
  onClose = vi.fn(),
  onEdit = vi.fn(),
  onDuplicate = vi.fn(),
  onDelete = vi.fn(),
  onMoveToCampaign = vi.fn(),
  onCloneToAdSet = vi.fn(),
  onCreateVariations = vi.fn(),
  onOpenBulkCreator = vi.fn(),
}: {
  node?: TreeNode
  onClose?: () => void
  onEdit?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onMoveToCampaign?: (node: TreeNode, targetCampaignId: string) => void
  onCloneToAdSet?: (node: TreeNode, adSetId: string) => void
  onCreateVariations?: (node: TreeNode) => void
  onOpenBulkCreator?: (adSetId: string) => void
}) {
  const anchorRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button ref={anchorRef} type="button">
        Open menu
      </button>
      <FolderMenuDropdown
        node={node}
        anchorRef={anchorRef}
        onClose={onClose}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        campaigns={[
          { id: 'campaign-1', name: 'Campaign One', icon: 'Megaphone' },
          { id: 'campaign-2', name: 'Campaign Two', icon: 'Megaphone' },
        ]}
        currentCampaignId="campaign-1"
        onMoveToCampaign={onMoveToCampaign}
        adSets={[{ id: 'ad-set-2', name: 'Scale Set', campaignName: 'Campaign Two' }]}
        onCloneToAdSet={onCloneToAdSet}
        onCreateVariations={onCreateVariations}
        onOpenBulkCreator={onOpenBulkCreator}
        currentCampaignIdForAdd="campaign-1"
      />
    </>
  )
}

describe('FolderMenuDropdown', () => {
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
    useChatStore.getState().setPendingComposerText(null)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useChatStore.getState().setPendingComposerText(null)
  })

  it('keeps menu actions and move/clone submenu callbacks wired', async () => {
    const onEdit = vi.fn()
    const onDuplicate = vi.fn()
    const onDelete = vi.fn()
    const onMoveToCampaign = vi.fn()
    const onCloneToAdSet = vi.fn()
    const onCreateVariations = vi.fn()
    const onClose = vi.fn()

    render(
      <Harness
        onClose={onClose}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onMoveToCampaign={onMoveToCampaign}
        onCloneToAdSet={onCloneToAdSet}
        onCreateVariations={onCreateVariations}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /edit name/i }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /duplicate/i }))
    expect(onDuplicate).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /move to campaign/i }))
    fireEvent.click(await screen.findByRole('button', { name: /campaign two/i }))
    expect(onMoveToCampaign).toHaveBeenCalledWith(baseNode, 'campaign-2')

    fireEvent.click(screen.getByRole('button', { name: /clone to/i }))
    fireEvent.click(await screen.findByRole('button', { name: /scale set/i }))
    expect(onCloneToAdSet).toHaveBeenCalledWith(baseNode, 'ad-set-2')

    fireEvent.click(screen.getByRole('button', { name: /create variations/i }))
    expect(onCreateVariations).toHaveBeenCalledWith(baseNode)

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('prefills the composer and dispatches the add-artifact request for ad sets', async () => {
    const onClose = vi.fn()
    const eventHandler = vi.fn()
    window.addEventListener('studio-request-add-ads-artifact', eventHandler)
    const adSetNode: TreeNode = {
      id: 'ad-set-1',
      label: 'Prospecting Set',
      type: 'ad-set',
      icon: <span />,
      resourceId: 'ad-set-resource-1',
    }

    render(<Harness node={adSetNode} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /new creative/i }))

    await waitFor(() => {
      expect(useChatStore.getState().pendingComposerText).toBe(
        'Add a new ad creative to this ad set. Help me create it.',
      )
    })
    expect(eventHandler).toHaveBeenCalledTimes(1)
    expect((eventHandler.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      prompt: 'Add a new ad creative to this ad set. Help me create it.',
      type: 'new-creative',
      parentLabel: 'Prospecting Set',
      campaignId: undefined,
      adSetId: 'ad-set-resource-1',
    })
    expect(onClose).toHaveBeenCalledTimes(1)

    window.removeEventListener('studio-request-add-ads-artifact', eventHandler)
  })

  it('settles across rerenders without render-loop console errors', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { rerender } = render(<Harness />)

    rerender(<Harness />)

    const consoleOutput = consoleError.mock.calls.flat().join(' ')
    expect(consoleOutput).not.toContain('Maximum update depth')
    expect(consoleOutput).not.toContain('Too many re-renders')
  })
})
