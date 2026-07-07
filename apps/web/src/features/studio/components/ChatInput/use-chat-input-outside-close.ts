import { useEffect, type RefObject } from 'react'

export interface UseChatInputOutsideCloseOptions {
  plusMenuOpen: boolean
  modelDropdownOpen: boolean
  slashMenuOpen: boolean
  atMenuOpen: boolean
  contextPopoverOpen: boolean
  plusMenuRef: RefObject<HTMLElement | null>
  plusSubmenuRef: RefObject<HTMLElement | null>
  plusButtonRef: RefObject<HTMLElement | null>
  modelDropdownRef: RefObject<HTMLElement | null>
  subscriptionSubmenuRef: RefObject<HTMLElement | null>
  modelHoverCardRef: RefObject<HTMLElement | null>
  modelEditPanelRef: RefObject<HTMLElement | null>
  modelButtonRef: RefObject<HTMLElement | null>
  slashDropdownRef: RefObject<HTMLElement | null>
  atDropdownRef: RefObject<HTMLElement | null>
  textareaRef: RefObject<HTMLElement | null>
  contextPopoverPanelRef: RefObject<HTMLElement | null>
  contextPopoverTriggerRef: RefObject<HTMLElement | null>
  setPlusMenuOpen: (open: boolean) => void
  setPlusSubmenu: (submenu: null) => void
  setModelDropdownOpen: (open: boolean) => void
  setSlashMenuOpen: (open: boolean) => void
  setAtMenuOpen: (open: boolean) => void
  setContextPopoverOpen: (open: boolean) => void
}

function containsTarget(ref: RefObject<HTMLElement | null>, target: Node): boolean {
  return ref.current?.contains(target) === true
}

export function useChatInputOutsideClose({
  plusMenuOpen,
  modelDropdownOpen,
  slashMenuOpen,
  atMenuOpen,
  contextPopoverOpen,
  plusMenuRef,
  plusSubmenuRef,
  plusButtonRef,
  modelDropdownRef,
  subscriptionSubmenuRef,
  modelHoverCardRef,
  modelEditPanelRef,
  modelButtonRef,
  slashDropdownRef,
  atDropdownRef,
  textareaRef,
  contextPopoverPanelRef,
  contextPopoverTriggerRef,
  setPlusMenuOpen,
  setPlusSubmenu,
  setModelDropdownOpen,
  setSlashMenuOpen,
  setAtMenuOpen,
  setContextPopoverOpen,
}: UseChatInputOutsideCloseOptions) {
  useEffect(() => {
    if (!plusMenuOpen && !modelDropdownOpen && !slashMenuOpen && !atMenuOpen && !contextPopoverOpen)
      return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        plusMenuOpen &&
        !containsTarget(plusMenuRef, target) &&
        !containsTarget(plusSubmenuRef, target) &&
        !containsTarget(plusButtonRef, target)
      ) {
        setPlusMenuOpen(false)
        setPlusSubmenu(null)
      }
      if (
        modelDropdownOpen &&
        !containsTarget(modelDropdownRef, target) &&
        !containsTarget(subscriptionSubmenuRef, target) &&
        !containsTarget(modelHoverCardRef, target) &&
        !containsTarget(modelEditPanelRef, target) &&
        !containsTarget(modelButtonRef, target)
      )
        setModelDropdownOpen(false)
      if (
        slashMenuOpen &&
        !containsTarget(slashDropdownRef, target) &&
        !containsTarget(textareaRef, target)
      )
        setSlashMenuOpen(false)
      if (
        atMenuOpen &&
        !containsTarget(atDropdownRef, target) &&
        !containsTarget(textareaRef, target)
      )
        setAtMenuOpen(false)
      if (
        contextPopoverOpen &&
        !containsTarget(contextPopoverPanelRef, target) &&
        !containsTarget(contextPopoverTriggerRef, target)
      )
        setContextPopoverOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [
    atDropdownRef,
    atMenuOpen,
    contextPopoverOpen,
    contextPopoverPanelRef,
    contextPopoverTriggerRef,
    modelButtonRef,
    modelDropdownOpen,
    modelDropdownRef,
    modelEditPanelRef,
    modelHoverCardRef,
    plusButtonRef,
    plusMenuOpen,
    plusMenuRef,
    plusSubmenuRef,
    setAtMenuOpen,
    setContextPopoverOpen,
    setModelDropdownOpen,
    setPlusMenuOpen,
    setPlusSubmenu,
    setSlashMenuOpen,
    slashDropdownRef,
    slashMenuOpen,
    subscriptionSubmenuRef,
    textareaRef,
  ])
}
