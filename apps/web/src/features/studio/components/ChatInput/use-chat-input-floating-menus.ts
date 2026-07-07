import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import {
  createTextareaAtCaretVirtualElement,
  createTextareaSlashCaretVirtualElement,
} from '../../utils/textarea-caret-viewport'

const VIEWPORT_MARGIN = 8

const SLASH_FLOATING_MIDDLEWARE = [
  offset(8),
  flip({ fallbackPlacements: ['bottom-start'] }),
  shift({ padding: VIEWPORT_MARGIN }),
]

interface UseChatInputFloatingMenusOptions {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  composerShellRef: RefObject<HTMLElement | null>
  value: string
  slashMenuOpen: boolean
  slashItems: ReadonlyArray<{ id: string }>
  slashSkillsExpanded: boolean
  slashWorkflowsExpanded: boolean
  atMenuOpen: boolean
  atItems: readonly unknown[]
}

export function useChatInputFloatingMenus({
  textareaRef,
  composerShellRef,
  value,
  slashMenuOpen,
  slashItems,
  slashSkillsExpanded,
  slashWorkflowsExpanded,
  atMenuOpen,
  atItems,
}: UseChatInputFloatingMenusOptions) {
  const [atComposerShellRect, setAtComposerShellRect] = useState<{
    width: number
    left: number
  } | null>(null)
  const slashDropdownRef = useRef<HTMLDivElement>(null)
  const atDropdownRef = useRef<HTMLDivElement>(null)
  const prevSlashListKeyRef = useRef<string | null>(null)

  const slashCaretVirtualElement = useMemo(
    () => createTextareaSlashCaretVirtualElement(textareaRef),
    [textareaRef],
  )

  const atCaretVirtualElement = useMemo(
    () => createTextareaAtCaretVirtualElement(textareaRef),
    [textareaRef],
  )

  const {
    refs: { setReference: setSlashPositionReference, setFloating: setSlashFloatingEl },
    floatingStyles: slashFloatingStyles,
    update: updateSlashFloating,
  } = useFloating({
    open: slashMenuOpen,
    placement: 'top-start',
    middleware: SLASH_FLOATING_MIDDLEWARE,
    whileElementsMounted: autoUpdate,
  })

  const {
    refs: { setReference: setAtPositionReference, setFloating: setAtFloatingEl },
    floatingStyles: atFloatingStyles,
    update: updateAtFloating,
  } = useFloating({
    open: atMenuOpen,
    placement: 'top-start',
    middleware: SLASH_FLOATING_MIDDLEWARE,
    whileElementsMounted: autoUpdate,
  })

  const setSlashPositionReferenceRef = useRef(setSlashPositionReference)
  setSlashPositionReferenceRef.current = setSlashPositionReference
  const updateSlashFloatingRef = useRef(updateSlashFloating)
  updateSlashFloatingRef.current = updateSlashFloating
  const setAtPositionReferenceRef = useRef(setAtPositionReference)
  setAtPositionReferenceRef.current = setAtPositionReference
  const updateAtFloatingRef = useRef(updateAtFloating)
  updateAtFloatingRef.current = updateAtFloating

  const atFloatingContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      atDropdownRef.current = node
      setAtFloatingEl(node)
    },
    [setAtFloatingEl],
  )

  const slashFloatingContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      slashDropdownRef.current = node
      setSlashFloatingEl(node)
    },
    [setSlashFloatingEl],
  )

  useLayoutEffect(() => {
    if (!atMenuOpen) {
      setAtComposerShellRect(null)
      return
    }
    const element = composerShellRef.current
    if (!element || typeof window === 'undefined') return
    const measure = () => {
      const rect = element.getBoundingClientRect()
      setAtComposerShellRect({ width: rect.width, left: rect.left })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [atMenuOpen, composerShellRef])

  useEffect(() => {
    if (!slashMenuOpen) prevSlashListKeyRef.current = null
  }, [slashMenuOpen])

  useLayoutEffect(() => {
    if (slashMenuOpen) return
    setSlashPositionReferenceRef.current(null)
  }, [slashMenuOpen])

  useLayoutEffect(() => {
    if (!slashMenuOpen) return
    setSlashPositionReferenceRef.current(slashCaretVirtualElement)
    const listKey = `${slashItems.length}:${slashItems.map((item) => item.id).join('|')}:${slashSkillsExpanded}:${slashWorkflowsExpanded}`
    if (prevSlashListKeyRef.current !== listKey) {
      prevSlashListKeyRef.current = listKey
      const menuRoot = slashDropdownRef.current
      if (menuRoot) menuRoot.scrollTop = 0
    }
    updateSlashFloatingRef.current()
  }, [
    slashMenuOpen,
    value,
    slashItems,
    slashSkillsExpanded,
    slashWorkflowsExpanded,
    slashCaretVirtualElement,
  ])

  useLayoutEffect(() => {
    if (atMenuOpen) return
    setAtPositionReferenceRef.current(null)
  }, [atMenuOpen])

  useLayoutEffect(() => {
    if (!atMenuOpen) return
    setAtPositionReferenceRef.current(atCaretVirtualElement)
    updateAtFloatingRef.current()
  }, [atMenuOpen, value, atItems, atCaretVirtualElement])

  return {
    atComposerShellRect,
    slashDropdownRef,
    slashFloatingContainerRef,
    slashFloatingStyles,
    updateSlashFloating,
    atDropdownRef,
    atFloatingContainerRef,
    atFloatingStyles,
    updateAtFloating,
  }
}
