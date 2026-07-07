'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseTeamConversationsSidebarFrameOptions {
  expanded: boolean
  mobilePageLayout: boolean
}

export function useTeamConversationsSidebarFrame({
  expanded,
  mobilePageLayout,
}: UseTeamConversationsSidebarFrameOptions) {
  const [convoMenuHot, setConvoMenuHot] = useState(false)
  const convoMenuLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardGlassRef = useRef<HTMLDivElement | null>(null)

  const clearConvoMenuLeaveTimer = useCallback(() => {
    if (convoMenuLeaveTimerRef.current) {
      clearTimeout(convoMenuLeaveTimerRef.current)
      convoMenuLeaveTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const el = cardGlassRef.current
    if (!el || mobilePageLayout) return
    const onFocusIn = () => {
      setConvoMenuHot(true)
    }
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null
      if (next && el.contains(next)) return
      setConvoMenuHot(false)
    }
    el.addEventListener('focusin', onFocusIn)
    el.addEventListener('focusout', onFocusOut)
    return () => {
      el.removeEventListener('focusin', onFocusIn)
      el.removeEventListener('focusout', onFocusOut)
    }
  }, [mobilePageLayout, expanded])

  useEffect(() => {
    return () => clearConvoMenuLeaveTimer()
  }, [clearConvoMenuLeaveTimer])

  const handlePointerEnter = useCallback(() => {
    if (mobilePageLayout) return
    clearConvoMenuLeaveTimer()
    setConvoMenuHot(true)
  }, [clearConvoMenuLeaveTimer, mobilePageLayout])

  const handlePointerLeave = useCallback(() => {
    if (mobilePageLayout) return
    clearConvoMenuLeaveTimer()
    convoMenuLeaveTimerRef.current = setTimeout(() => {
      if (cardGlassRef.current?.contains(document.activeElement)) {
        convoMenuLeaveTimerRef.current = null
        return
      }
      setConvoMenuHot(false)
      convoMenuLeaveTimerRef.current = null
    }, 200)
  }, [clearConvoMenuLeaveTimer, mobilePageLayout])

  return {
    cardGlassRef,
    convoMenuHot,
    handlePointerEnter,
    handlePointerLeave,
  }
}
