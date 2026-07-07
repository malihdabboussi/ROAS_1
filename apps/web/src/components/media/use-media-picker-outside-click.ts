import { useEffect, type RefObject } from 'react'

export function useMediaPickerOutsideClick(options: {
  menuAssetId: string | null
  uploadMenuOpen: boolean
  scopeDropdownOpen: boolean
  menuRef: RefObject<HTMLDivElement | null>
  uploadBtnRef: RefObject<HTMLButtonElement | null>
  onCloseMenu: () => void
  onCloseUploadMenu: () => void
  onCloseScopeDropdown: () => void
}) {
  const {
    menuAssetId,
    uploadMenuOpen,
    scopeDropdownOpen,
    menuRef,
    uploadBtnRef,
    onCloseMenu,
    onCloseUploadMenu,
    onCloseScopeDropdown,
  } = options

  useEffect(() => {
    if (!menuAssetId && !uploadMenuOpen && !scopeDropdownOpen) return
    const handle = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (menuAssetId && !menuRef.current?.contains(target)) onCloseMenu()
      if (uploadMenuOpen && !uploadBtnRef.current?.parentElement?.contains(target))
        onCloseUploadMenu()
      if (scopeDropdownOpen && !target.closest('[data-scope-dropdown]')) onCloseScopeDropdown()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [
    menuAssetId,
    uploadMenuOpen,
    scopeDropdownOpen,
    menuRef,
    uploadBtnRef,
    onCloseMenu,
    onCloseUploadMenu,
    onCloseScopeDropdown,
  ])
}
