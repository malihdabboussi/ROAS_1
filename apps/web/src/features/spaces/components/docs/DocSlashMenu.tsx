'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'
import clsx from 'clsx'
import {
  DOC_SLASH_SECTION_LABELS,
  DOC_SLASH_SECTION_ORDER,
  type DocSlashItem,
  type DocSlashSection,
} from './doc-slash-commands'

export interface DocSlashMenuHandle {
  onKeyDown: (e: KeyboardEvent) => boolean
}

interface DocSlashMenuProps {
  items: DocSlashItem[]
  query: string
  command: (item: DocSlashItem) => void
  clientRect: (() => DOMRect | null) | null
}

const DocSlashMenuInner = forwardRef<DocSlashMenuHandle, DocSlashMenuProps>(
  function DocSlashMenuInner({ items, query, command, clientRect }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)
    const selectedBtnRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    useEffect(() => {
      selectedBtnRef.current?.scrollIntoView({ block: 'nearest' })
    }, [selectedIndex])

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index]
        if (item) command(item)
      },
      [items, command],
    )

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: (e: KeyboardEvent): boolean => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex((i) => (i + 1) % items.length)
            return true
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex((i) => (i - 1 + items.length) % items.length)
            return true
          }
          if (e.key === 'Enter') {
            e.preventDefault()
            selectItem(selectedIndex)
            return true
          }
          return false
        },
      }),
      [items.length, selectedIndex, selectItem],
    )

    const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

    useLayoutEffect(() => {
      if (!clientRect) return
      const rect = clientRect()
      if (!rect) return
      const menuEl = menuRef.current
      const menuH = menuEl?.offsetHeight ?? 320
      const menuW = menuEl?.offsetWidth ?? 340
      const viewH = window.innerHeight
      const viewW = window.innerWidth

      let top = rect.bottom + 4
      let left = rect.left

      if (top + menuH > viewH - 12) {
        top = rect.top - menuH - 4
      }
      if (left + menuW > viewW - 12) {
        left = viewW - menuW - 12
      }
      if (left < 12) left = 12

      setPos({ top, left })
    }, [clientRect, items])

    const sections: { section: DocSlashSection; sectionItems: DocSlashItem[] }[] = []
    let flatIdx = 0
    const itemFlatIndices = new Map<string, number>()

    for (const sec of DOC_SLASH_SECTION_ORDER) {
      const sectionItems = items.filter((i) => i.section === sec)
      if (sectionItems.length > 0) {
        sections.push({ section: sec, sectionItems })
        for (const item of sectionItems) {
          itemFlatIndices.set(item.id, flatIdx)
          flatIdx += 1
        }
      }
    }

    if (items.length === 0) {
      return createPortal(
        <div
          ref={menuRef}
          data-doc-slash-menu=""
          className="border-border bg-card fixed z-[100] min-w-[200px] rounded-xl border p-3 shadow-xl"
          style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' as const }}
        >
          <p className="text-muted-foreground text-xs">No results</p>
        </div>,
        document.body,
      )
    }

    return createPortal(
      <div
        ref={menuRef}
        data-doc-slash-menu=""
        className="border-border bg-card fixed z-[100] max-h-[min(400px,60vh)] min-w-[340px] overflow-y-auto rounded-xl border shadow-xl"
        style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' as const }}
      >
        {sections.map(({ section, sectionItems }) => (
          <div key={section} className="p-1">
            <div className="flex items-center justify-between px-2 pb-0.5 pt-1.5">
              <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                {DOC_SLASH_SECTION_LABELS[section]}
              </span>
              {section === sections[0]?.section && (
                <span className="text-muted-foreground/60 text-[10px]">PRESS ESC TO EXIT</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-0.5">
              {sectionItems.map((item) => {
                const idx = itemFlatIndices.get(item.id) ?? -1
                const isSelected = idx === selectedIndex
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    ref={isSelected ? selectedBtnRef : undefined}
                    type="button"
                    onClick={() => selectItem(idx)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={clsx(
                      'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors',
                      isSelected
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                    )}
                  >
                    <span className="border-border flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {query && (
          <div className="border-border border-t px-3 py-1.5">
            <span className="text-muted-foreground text-[11px]">/{query}</span>
          </div>
        )}
      </div>,
      document.body,
    )
  },
)

let menuContainer: HTMLDivElement | null = null
let menuRoot: ReturnType<typeof import('react-dom/client').createRoot> | null = null
let componentRef: DocSlashMenuHandle | null = null

async function ensureRoot() {
  if (!menuContainer) {
    menuContainer = document.createElement('div')
    menuContainer.setAttribute('data-doc-slash-menu', '')
    document.body.appendChild(menuContainer)
  }
  if (!menuRoot) {
    const { createRoot } = await import('react-dom/client')
    menuRoot = createRoot(menuContainer)
  }
}

function renderMenu(
  items: DocSlashItem[],
  query: string,
  command: (item: DocSlashItem) => void,
  clientRect: (() => DOMRect | null) | null,
) {
  if (!menuRoot) return
  menuRoot.render(
    <DocSlashMenuInner
      ref={(handle) => {
        componentRef = handle
      }}
      items={items}
      query={query}
      command={command}
      clientRect={clientRect}
    />,
  )
}

export function renderDocSlashMenu() {
  return {
    onStart: (props: SuggestionProps<DocSlashItem>) => {
      void ensureRoot().then(() => {
        renderMenu(
          props.items,
          props.query,
          props.command as (item: DocSlashItem) => void,
          props.clientRect ?? null,
        )
      })
    },

    onUpdate: (props: SuggestionProps<DocSlashItem>) => {
      renderMenu(
        props.items,
        props.query,
        props.command as (item: DocSlashItem) => void,
        props.clientRect ?? null,
      )
    },

    onKeyDown: (props: SuggestionKeyDownProps): boolean => {
      if (props.event.key === 'Escape') {
        return true
      }
      return componentRef?.onKeyDown(props.event) ?? false
    },

    onExit: () => {
      componentRef = null
      if (menuRoot) {
        menuRoot.unmount()
        menuRoot = null
      }
      if (menuContainer) {
        menuContainer.remove()
        menuContainer = null
      }
    },
  }
}
