import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { updateSpace } from '../services/spaces.service'
import { useSpacesStore } from '../store/use-spaces-store'
import type { Space } from '../types'

export function useSpaceSwitcherState(
  activeSpace: Space | null,
  moreMenuRef: React.RefObject<HTMLDivElement | null>,
) {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const switcherTriggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeSpace) return
    setTitleDraft(activeSpace.title ?? '')
  }, [activeSpace?.id, activeSpace?.title])

  useLayoutEffect(() => {
    if (!switcherOpen || !switcherTriggerRef.current) return
    const rect = switcherTriggerRef.current.getBoundingClientRect()
    setDropdownPos({ top: rect.bottom + 6, left: rect.left })
  }, [switcherOpen])

  useEffect(() => {
    if (!switcherOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (
        !dropdownRef.current?.contains(t) &&
        !switcherTriggerRef.current?.contains(t) &&
        !moreMenuRef.current?.contains(t)
      ) {
        const trimmed = titleDraft.trim()
        if (trimmed && trimmed !== activeSpace?.title) {
          useSpacesStore.setState((s) => ({
            spaces: s.spaces.map((sp) =>
              sp.id === activeSpace?.id ? { ...sp, title: trimmed } : sp,
            ),
          }))
          void updateSpace(activeSpace!.id, { title: trimmed })
        }
        setSwitcherOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const trimmed = titleDraft.trim()
        if (trimmed && trimmed !== activeSpace?.title) {
          useSpacesStore.setState((s) => ({
            spaces: s.spaces.map((sp) =>
              sp.id === activeSpace?.id ? { ...sp, title: trimmed } : sp,
            ),
          }))
          void updateSpace(activeSpace!.id, { title: trimmed })
        }
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [switcherOpen, titleDraft, activeSpace?.title, activeSpace?.id, moreMenuRef])

  return {
    switcherOpen,
    setSwitcherOpen,
    dropdownPos,
    titleDraft,
    setTitleDraft,
    switcherTriggerRef,
    dropdownRef,
  }
}
