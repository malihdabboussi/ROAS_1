'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Bot,
  Brain,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  Share2,
  User,
  Users,
} from 'lucide-react'
import type { BrainScopeNavOption } from '@/features/brain/hooks/use-brain-scope-nav-options'
import { brainScopeHref } from '@/features/brain/lib/brain-scope-nav'
import {
  brainScopeSectionIdForScope,
  buildBrainScopeNavSectionGroups,
} from '@/features/brain/lib/brain-scope-nav-sections.util'
import { dispatchBrainTrainModal } from '@/features/brain/lib/brain-training-modal.events'
import { cn } from '@/lib/utils/cn'

const SECTION_LABEL_CLASS =
  'text-[10px] font-medium tracking-wider text-[var(--color-muted-foreground)]'

function scopeOptionIcon(option: BrainScopeNavOption): ReactNode {
  const imageUrl = option.imageUrl?.trim()
  if (imageUrl) {
    return <img src={imageUrl} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
  }
  switch (option.scopeType) {
    case 'user':
    case 'person':
      return <User className="icon-xs text-muted-foreground shrink-0" />
    case 'shared':
      return <Share2 className="icon-xs text-muted-foreground shrink-0" />
    case 'company':
      return <Building2 className="icon-xs text-muted-foreground shrink-0" />
    case 'customer':
      return <Users className="icon-xs text-muted-foreground shrink-0" />
    case 'agent':
      return <Bot className="icon-xs text-muted-foreground shrink-0" />
    case 'campaign':
    case 'campaign_knowledge':
      return <Brain className="icon-xs text-muted-foreground shrink-0" />
  }
}

export function BrainScopeBreadcrumbDropdown({
  scopeOptions,
  selectedScope,
  loading = false,
  isOrg,
  triggerLabel,
  compact = false,
  onNavigateHome,
}: {
  scopeOptions: BrainScopeNavOption[]
  selectedScope: BrainScopeNavOption | undefined
  loading?: boolean
  isOrg: boolean
  triggerLabel: string
  compact?: boolean
  onNavigateHome: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(() => new Set())
  const rootRef = useRef<HTMLDivElement>(null)

  const sectionGroups = useMemo(
    () => buildBrainScopeNavSectionGroups(scopeOptions, isOrg),
    [isOrg, scopeOptions],
  )

  const selectedSectionId = brainScopeSectionIdForScope(selectedScope)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setExpandedSectionIds((prev) => {
      const next = new Set(prev)
      if (selectedSectionId) next.add(selectedSectionId)
      for (const { section, items } of sectionGroups) {
        if (items.length > 1) next.add(section.id)
      }
      return next
    })
  }, [open, sectionGroups, selectedSectionId])

  const toggleSection = (sectionId: string) => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const navigateToScope = (scopeId: string) => {
    router.push(brainScopeHref(scopeId))
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'gap-spacing-1 flex min-w-0 items-center font-medium text-[var(--foreground)] transition-colors hover:text-[var(--foreground)]',
          compact ? 'max-w-[120px]' : 'max-w-[240px]',
        )}
        title={triggerLabel}
      >
        <span className="min-w-0 truncate">{loading ? 'Brain' : triggerLabel}</span>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-3 w-3 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="dropdown-menu-solid z-dropdown rounded-spacing-2 py-spacing-2 absolute left-0 top-full mt-1 max-h-80 min-w-64 overflow-y-auto"
        >
          <button
            type="button"
            onClick={() => {
              onNavigateHome()
              setOpen(false)
            }}
            className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center text-left transition-colors"
          >
            <LayoutGrid className="icon-xs shrink-0" />
            <span className="min-w-0 flex-1 truncate">Manage Brains</span>
          </button>
          <button
            type="button"
            onClick={() => {
              dispatchBrainTrainModal(selectedScope?.id ? { scopeId: selectedScope.id } : undefined)
              setOpen(false)
            }}
            className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 px-spacing-3 py-spacing-1 flex w-full items-center border-b border-[var(--color-border)] text-left transition-colors"
          >
            <GraduationCap className="icon-xs shrink-0" />
            <span className="min-w-0 flex-1 truncate">Train Brain</span>
          </button>

          {sectionGroups.length === 0 ? (
            <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 text-center">
              No brains yet
            </p>
          ) : null}

          {sectionGroups.map(({ section, items }) => {
            const expanded = expandedSectionIds.has(section.id)
            const singleItem = items.length === 1
            const selectedInSection = items.some((item) => item.id === selectedScope?.id)

            if (singleItem) {
              const option = items[0]!
              const selected = option.id === selectedScope?.id
              return (
                <div key={section.id} className="px-spacing-1 pt-spacing-1">
                  <div className={cn(SECTION_LABEL_CLASS, 'px-spacing-2 py-spacing-1')}>
                    {section.title}
                  </div>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => navigateToScope(option.id)}
                    className={cn(
                      'body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors',
                      selected && 'nav-glass-selected-purple',
                    )}
                  >
                    {scopeOptionIcon(option)}
                    <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                    {selected ? <Check className="icon-xs text-primary shrink-0" /> : null}
                  </button>
                </div>
              )
            }

            return (
              <div key={section.id} className="px-spacing-1 pt-spacing-1">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => toggleSection(section.id)}
                  className="hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      'icon-xs text-muted-foreground shrink-0 transition-transform duration-150',
                      expanded && 'rotate-90',
                    )}
                  />
                  <span
                    className={cn(
                      SECTION_LABEL_CLASS,
                      'min-w-0 flex-1 truncate text-left',
                      selectedInSection && !expanded && 'text-foreground',
                    )}
                  >
                    {section.title}
                  </span>
                  <span className="text-muted-foreground text-[10px] tabular-nums opacity-70">
                    {items.length}
                  </span>
                </button>
                {expanded ? (
                  <div className="border-border ml-spacing-3-5 pl-spacing-2 flex flex-col border-l">
                    {items.map((option) => {
                      const selected = option.id === selectedScope?.id
                      return (
                        <button
                          key={option.id}
                          role="option"
                          aria-selected={selected}
                          onClick={() => navigateToScope(option.id)}
                          className={cn(
                            'body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors',
                            selected && 'nav-glass-selected-purple',
                          )}
                        >
                          {scopeOptionIcon(option)}
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {option.label}
                          </span>
                          {selected ? <Check className="icon-xs text-primary shrink-0" /> : null}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
