'use client'

import { cn } from '@/lib/utils/cn'
import type { SpaceTemplate } from '../../services/space-templates.service'
import {
  countTemplatesForNavFilter,
  SPACE_TEMPLATE_NAV_SECTIONS,
  type SpaceTemplateNavFilterId,
} from './space-template-nav'

export interface SpaceTemplatesNavProps {
  templateNavFilter: SpaceTemplateNavFilterId
  onTemplateNavFilter: (filterId: SpaceTemplateNavFilterId) => void
  templates: SpaceTemplate[]
}

export function SpaceTemplatesNav({
  templateNavFilter,
  onTemplateNavFilter,
  templates,
}: SpaceTemplatesNavProps) {
  return (
    <aside className="border-border bg-muted/10 rounded-spacing-3 flex h-full min-h-0 flex-col overflow-hidden border">
      <div className="scrollbar-hide gap-spacing-6 p-spacing-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {SPACE_TEMPLATE_NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.title}>
            {sectionIndex > 0 ? <div className="border-border mb-spacing-3 border-t" /> : null}
            <div className="px-3 pb-1 pt-1">
              <span className="text-[10px] font-medium tracking-wider text-[var(--color-muted-foreground)]">
                {section.title}
              </span>
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const selected = item.id === templateNavFilter
                const count = countTemplatesForNavFilter(item.id, templates)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTemplateNavFilter(item.id)}
                    className={cn(
                      'nav-glass-hover-purple body-3 rounded-spacing-2 flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-all',
                      selected
                        ? 'nav-glass-selected-purple nav-glass-text-purple'
                        : 'text-[var(--color-muted-foreground)]',
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="body-4 tabular-nums text-[var(--color-muted-foreground)]">
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
