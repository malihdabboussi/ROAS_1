'use client'

import { useEffect, useRef, useState } from 'react'

export function useThemeEditorDialogImportDropdown() {
  const [showImportDropdown, setShowImportDropdown] = useState(false)
  const importDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showImportDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (importDropdownRef.current && !importDropdownRef.current.contains(e.target as Node)) {
        setShowImportDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showImportDropdown])

  return { showImportDropdown, setShowImportDropdown, importDropdownRef }
}
