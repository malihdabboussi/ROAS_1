'use client'

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { createPortal } from 'react-dom'
import { Braces, Download, FileCode, FileText } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useTriggerIsVisible } from '../use-trigger-is-visible'

const MENU_WIDTH = 160
const MENU_MARGIN = 8

export function SkillDetailExportDropdown({
  detailExportMenuOpen,
  setDetailExportMenuOpen,
  detailResourceId,
  detailExportingPdf,
  handleSkillDetailPdf,
  handleSkillDetailMarkdown,
  handleSkillDetailJson,
  menuZOverlayClass = 'z-[60]',
  menuZDropdownClass = 'z-dropdown',
  exportTriggerClassName = 'btn-icon-glass btn-icon-glass-sm',
  exportIconClassName = 'icon-sm',
}: {
  detailExportMenuOpen: boolean
  setDetailExportMenuOpen: Dispatch<SetStateAction<boolean>>
  detailResourceId: string | null
  detailExportingPdf: boolean
  handleSkillDetailPdf: () => void | Promise<void>
  handleSkillDetailMarkdown: () => void
  handleSkillDetailJson: () => void
  menuZOverlayClass?: string
  menuZDropdownClass?: string
  /** Mobile skill header: match `chip-glass-neutral h-spacing-8` back / tree controls */
  exportTriggerClassName?: string
  exportIconClassName?: string
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isTriggerVisible = useTriggerIsVisible(buttonRef)
  const menuOpen = detailExportMenuOpen && isTriggerVisible
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useLayoutEffect(() => {
    if (!menuOpen) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      let left = rect.right - MENU_WIDTH
      if (left + MENU_WIDTH + MENU_MARGIN > window.innerWidth) {
        left = window.innerWidth - MENU_WIDTH - MENU_MARGIN
      }
      if (left < MENU_MARGIN) left = MENU_MARGIN
      setPosition({ top: rect.bottom + 4, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailExportMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen, setDetailExportMenuOpen])

  return (
    <div className="relative flex items-center">
      <Tooltip
        label="Export"
        side="bottom"
        triggerClassName="inline-flex items-center justify-center"
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setDetailExportMenuOpen((o) => !o)}
          className={exportTriggerClassName}
          aria-label="Export"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <Download className={exportIconClassName} />
        </button>
      </Tooltip>
      {mounted && menuOpen && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div
                className={`fixed inset-0 ${menuZOverlayClass}`}
                onClick={() => setDetailExportMenuOpen(false)}
              />
              <div
                ref={menuRef}
                role="menu"
                className={`dropdown-glass fixed ${menuZDropdownClass} min-w-[160px] py-1`}
                style={{
                  top: position?.top ?? 0,
                  left: position?.left ?? 0,
                  visibility: position ? 'visible' : 'hidden',
                }}
              >
                {detailResourceId ? null : (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleSkillDetailPdf()}
                    disabled={detailExportingPdf}
                    className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors disabled:opacity-50"
                  >
                    <FileText className="text-muted-foreground icon-sm shrink-0" />
                    <span>{detailExportingPdf ? 'Exporting…' : 'PDF'}</span>
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSkillDetailMarkdown}
                  className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
                >
                  <FileCode className="text-muted-foreground icon-sm shrink-0" />
                  <span>Markdown</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSkillDetailJson}
                  className="body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
                >
                  <Braces className="text-muted-foreground icon-sm shrink-0" />
                  <span>JSON</span>
                </button>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}
