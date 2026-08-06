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
    <aside className="border-border bg-muted/10 rounded-spacing-3 flex h-auto min-h-0 flex-col overflow-hidden border md:h-full">
      <div className="scrollbar-hide gap-spacing-2 p-spacing-2 md:gap-spacing-6 flex min-h-0 flex-1 flex-row overflow-x-auto md:flex-col md:overflow-y-auto md:overflow-x-hidden">
        {SPACE_TEMPLATE_NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.title} className="flex shrink-0 md:block">
            {sectionIndex > 0 ? (
              <div className="border-border mb-spacing-3 hidden border-t md:block" />
            ) : null}
            <div className="hidden px-3 pb-1 pt-1 md:block">
              <span className="text-[10px] font-medium tracking-wider text-[var(--color-muted-foreground)]">
                {section.title}
              </span>
            </div>
            <div className="gap-spacing-1 flex md:block md:space-y-0.5">
              {section.items.map((item) => {
                const selected = item.id === templateNavFilter
                const count = countTemplatesForNavFilter(item.id, templates)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTemplateNavFilter(item.id)}
                    className={cn(
                      'nav-glass-hover-purple body-3 rounded-spacing-2 flex w-max shrink-0 items-center justify-between gap-2 px-3 py-1.5 text-left transition-all md:w-full',
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
