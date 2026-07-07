import { useEffect, useRef } from 'react'

type DismissOpts = {
  capture?: boolean
  shouldDismiss: (target: Node) => boolean
  onDismiss: () => void
}

/**
 * When `enabled`, listens for mousedown (optionally capture) and Escape.
 */
export function useDismissOnOutsideAndEscape(enabled: boolean, opts: DismissOpts) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    if (!enabled) return
    const capture = optsRef.current.capture ?? false
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (optsRef.current.shouldDismiss(t)) optsRef.current.onDismiss()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') optsRef.current.onDismiss()
    }
    document.addEventListener('mousedown', onMouseDown, capture)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown, capture)
      document.removeEventListener('keydown', onKey)
    }
  }, [enabled])
}
