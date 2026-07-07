'use client'

import { useCallback, useRef } from 'react'

export function FileBrowserColumnResizeHandle({
  onMouseDown,
}: {
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-hidden
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onMouseDown(e)
      }}
      className="hover:bg-primary/15 absolute right-0 top-0 z-10 h-full w-3 -translate-y-px cursor-col-resize select-none"
    />
  )
}

function proportionalWidths<K extends string>(
  keys: K[],
  snap: Record<K, number>,
  targetSum: number,
  mins: Record<K, number>,
): Record<K, number> {
  const out = {} as Record<K, number>
  if (keys.length === 0) return out
  const first = keys[0] as K

  if (keys.length === 1) {
    out[first] = Math.max(mins[first], Math.round(targetSum))
    return out
  }

  const snapSum = keys.reduce((s, k) => s + snap[k], 0)

  if (snapSum < 1e-6) {
    const base = Math.floor(targetSum / keys.length)
    let rem = targetSum - base * keys.length
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i] as K
      const v = base + (i < rem ? 1 : 0)
      out[k] = Math.max(mins[k], v)
    }
  } else {
    const scale = targetSum / snapSum
    for (const k of keys) {
      out[k] = Math.max(mins[k], Math.round(snap[k] * scale))
    }
  }

  let sum = keys.reduce((s, k) => s + out[k], 0)
  let diff = targetSum - sum
  let guard = 0
  while (diff !== 0 && guard++ < 5000) {
    if (diff > 0) {
      const k = keys.reduce((best, kk) => (out[kk] >= out[best] ? kk : best), first)
      out[k]++
      diff--
    } else {
      const candidates = keys.filter((kk) => out[kk] > mins[kk])
      if (candidates.length === 0) break
      const k = candidates.reduce(
        (best, kk) => (out[kk] > out[best] ? kk : best),
        candidates[0] as K,
      )
      out[k]--
      diff++
    }
  }

  return out
}

/** Drag the right edge of `leftKey`: that column and all columns to its right change; rights scale proportionally from drag-start snapshot. */
export function useProportionalColumnResize<K extends string>(
  orderedKeys: readonly K[],
  minWidths: Record<K, number>,
) {
  const dragRef = useRef<{
    startX: number
    leftKey: K
    rightKeys: K[]
    snap: Record<K, number>
  } | null>(null)

  return useCallback(
    (
      e: React.MouseEvent,
      leftKey: K,
      widths: Record<K, number>,
      setWidths: React.Dispatch<React.SetStateAction<Record<K, number>>>,
    ) => {
      const leftIndex = orderedKeys.indexOf(leftKey)
      if (leftIndex < 0) return
      const rightKeys = orderedKeys.slice(leftIndex + 1) as K[]
      if (rightKeys.length === 0) return

      dragRef.current = {
        startX: e.clientX,
        leftKey,
        rightKeys,
        snap: { ...widths },
      }

      const onMove = (ev: MouseEvent) => {
        const d = dragRef.current
        if (!d) return

        const dx = ev.clientX - d.startX
        const minL = minWidths[d.leftKey]
        const sumRightStart = d.rightKeys.reduce((s, k) => s + d.snap[k], 0)
        const minSumRight = d.rightKeys.reduce((s, k) => s + minWidths[k], 0)

        let newLeft = Math.round(d.snap[d.leftKey] + dx)
        const maxL = d.snap[d.leftKey] + sumRightStart - minSumRight
        newLeft = Math.max(minL, Math.min(maxL, newLeft))

        const targetSumRight = sumRightStart - (newLeft - d.snap[d.leftKey])
        const rights = proportionalWidths(d.rightKeys, d.snap, targetSumRight, minWidths)

        setWidths((prev) => ({
          ...prev,
          [d.leftKey]: newLeft,
          ...rights,
        }))
      }

      const onUp = () => {
        dragRef.current = null
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.removeProperty('cursor')
        document.body.style.removeProperty('user-select')
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [orderedKeys, minWidths],
  )
}
