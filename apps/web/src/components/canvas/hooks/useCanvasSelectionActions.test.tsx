import { useRef, useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { WhiteboardEdge, WhiteboardNode } from '../types/whiteboard.types'
import { useCanvasSelectionActions } from './useCanvasSelectionActions'

function node(id: string, x: number, y: number): WhiteboardNode {
  return {
    id,
    type: 'whiteboard',
    position: { x, y },
    data: {
      kind: 'note',
      title: id,
      text: '',
      onContentChange: vi.fn(),
      onSizeChange: vi.fn(),
    },
  }
}

describe('useCanvasSelectionActions', () => {
  it('aligns and distributes a multi-selection as one operation batch', () => {
    const commit = vi.fn()
    const initial = [node('a', 0, 10), node('b', 50, 40), node('c', 200, 100)]
    const { result } = renderHook(() => {
      const [nodes, setNodes] = useState(initial)
      const [, setEdges] = useState<WhiteboardEdge[]>([])
      const nodesRef = useRef(nodes)
      nodesRef.current = nodes
      return {
        nodes,
        actions: useCanvasSelectionActions({ nodesRef, setNodes, setEdges, commit }),
      }
    })

    act(() => result.current.actions.alignItems(['a', 'b', 'c'], 'horizontal'))
    expect(result.current.nodes.map((item) => item.position.y)).toEqual([50, 50, 50])
    expect(commit).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({ op: 'update_item', patch: { position_y: 50 } }),
    ]))

    act(() => result.current.actions.distributeItems(['a', 'b', 'c'], 'horizontal'))
    expect(result.current.nodes.map((item) => item.position.x)).toEqual([0, 100, 200])
    expect(commit).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({ op: 'update_item', patch: { position_x: 100 } }),
    ]))
  })
})
