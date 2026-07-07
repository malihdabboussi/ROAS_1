'use client'

import { useEffect, useRef, useState } from 'react'

const DEFAULT_POSITION = { top: 0, left: 0 }

export function useChannelComposerFloatingControls() {
  const [attachDropdownOpen, setAttachDropdownOpen] = useState(false)
  const [attachDropdownPos, setAttachDropdownPos] = useState(DEFAULT_POSITION)
  const attachDropdownRef = useRef<HTMLDivElement>(null)
  const attachButtonRef = useRef<HTMLButtonElement>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiPos, setEmojiPos] = useState(DEFAULT_POSITION)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const emojiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!attachDropdownOpen && !emojiOpen) return
    const handler = (event: MouseEvent) => {
      if (attachDropdownRef.current && !attachDropdownRef.current.contains(event.target as Node)) {
        setAttachDropdownOpen(false)
      }
      if (
        emojiRef.current &&
        !emojiRef.current.contains(event.target as Node) &&
        !emojiButtonRef.current?.contains(event.target as Node)
      ) {
        setEmojiOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [attachDropdownOpen, emojiOpen])

  const handleAttachClick = () => {
    const rect = attachButtonRef.current?.getBoundingClientRect()
    if (rect) setAttachDropdownPos({ top: rect.top - 8, left: rect.left })
    setAttachDropdownOpen((open) => !open)
  }

  const handleEmojiClick = () => {
    const rect = emojiButtonRef.current?.getBoundingClientRect()
    if (rect) setEmojiPos({ top: rect.top - 8, left: rect.left })
    setEmojiOpen((open) => !open)
  }

  return {
    attachDropdownOpen,
    setAttachDropdownOpen,
    attachDropdownPos,
    attachDropdownRef,
    attachButtonRef,
    handleAttachClick,
    emojiOpen,
    setEmojiOpen,
    emojiPos,
    emojiButtonRef,
    emojiRef,
    handleEmojiClick,
  }
}
