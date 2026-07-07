'use client'

import { RxDoubleArrowLeft, RxDoubleArrowRight } from 'react-icons/rx'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type FormPagesRailPage = 'start' | 'end'

/** Matches `globals.css` --spacing-60 / `w-spacing-60` (expanded rail). */
const PAGES_RAIL_EXPANDED_PX = 240
/** Matches `globals.css` --spacing-14 / `w-spacing-14` (collapsed rail). */
const PAGES_RAIL_COLLAPSED_PX = 56

const railWidthTransition = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.4, 0, 0.2, 1] as const,
}

const innerPresenceTransition = {
  duration: 0.18,
  ease: [0.4, 0, 0.2, 1] as const,
}

export function FormPagesRail({
  activePage,
  onSelectPage,
  collapsed,
  onCollapsedChange,
}: {
  activePage: FormPagesRailPage
  onSelectPage: (page: FormPagesRailPage) => void
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}) {
  return (
    <motion.aside
      initial={false}
      animate={{
        width: collapsed ? PAGES_RAIL_COLLAPSED_PX : PAGES_RAIL_EXPANDED_PX,
      }}
      transition={railWidthTransition}
      className="border-border bg-background rounded-spacing-4 flex min-h-0 shrink-0 flex-col overflow-hidden border"
      style={{ minWidth: 0 }}
      aria-label="Pages"
    >
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <AnimatePresence mode="sync" initial={false}>
          {collapsed ? (
            <motion.div
              key="collapsed"
              className="gap-spacing-2 py-spacing-3 absolute inset-0 flex min-h-0 min-w-0 flex-col items-center overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={innerPresenceTransition}
            >
              <button
                type="button"
                onClick={() => onCollapsedChange(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
                aria-label="Expand pages sidebar"
                title="Expand pages sidebar"
              >
                <RxDoubleArrowRight className="icon-sm" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onSelectPage('start')}
                className={cn(
                  'h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors',
                  activePage === 'start'
                    ? 'nav-glass-selected-purple text-foreground'
                    : 'text-muted-foreground hover:bg-hover-subtle',
                )}
                aria-label="Start Page"
                title="Start Page"
              >
                <FileText className="icon-sm" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onSelectPage('end')}
                className={cn(
                  'h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors',
                  activePage === 'end'
                    ? 'nav-glass-selected-purple text-foreground'
                    : 'text-muted-foreground hover:bg-hover-subtle',
                )}
                aria-label="End Page"
                title="End Page"
              >
                <CheckCircle2 className="icon-sm" aria-hidden />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              className="absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={innerPresenceTransition}
            >
              <div className="border-border bg-muted group/pages-header gap-spacing-2 px-spacing-4 py-spacing-3 flex shrink-0 items-center justify-between border-b">
                <p
                  className={cn(
                    'body-3 text-foreground min-w-0 flex-1 truncate font-semibold transition-transform duration-500 ease-in-out',
                    'group-hover/pages-header:translate-x-1',
                  )}
                >
                  Pages
                </p>
                <div
                  className={cn(
                    'flex shrink-0 items-center transition-[opacity,transform] duration-200 ease-out',
                    'pointer-events-none translate-x-2 opacity-0',
                    'group-hover/pages-header:pointer-events-auto group-hover/pages-header:translate-x-0 group-hover/pages-header:opacity-100',
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onCollapsedChange(true)}
                    className="text-muted-foreground hover:text-foreground h-spacing-6 w-spacing-6 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
                    aria-label="Collapse pages sidebar"
                    title="Collapse pages sidebar"
                  >
                    <RxDoubleArrowLeft className="icon-sm" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="p-spacing-2 min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-spacing-1">
                  <button
                    type="button"
                    onClick={() => onSelectPage('start')}
                    className={cn(
                      'body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 w-full text-left transition-colors',
                      activePage === 'start'
                        ? 'nav-glass-selected-purple text-foreground'
                        : 'text-muted-foreground hover:bg-hover-subtle',
                    )}
                  >
                    Start Page
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPage('end')}
                    className={cn(
                      'body-3 rounded-spacing-2 px-spacing-3 py-spacing-2 w-full text-left transition-colors',
                      activePage === 'end'
                        ? 'nav-glass-selected-purple text-foreground'
                        : 'text-muted-foreground hover:bg-hover-subtle',
                    )}
                  >
                    End Page
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}
