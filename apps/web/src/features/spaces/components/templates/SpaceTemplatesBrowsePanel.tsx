'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { LayoutGrid, X } from 'lucide-react'
import { getIconColor, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { listSpaceTemplates, type SpaceTemplate } from '../../services/space-templates.service'
import { filterSpaceTemplates, type SpaceTemplateNavFilterId } from './space-template-nav'
import { SpaceTemplatesNav } from './SpaceTemplatesNav'
import { UseTemplateConfirmDialog } from './UseTemplateConfirmDialog'

function getTemplateRoleColor(persona: string | null): IconColorId {
  switch (persona) {
    case 'solo':
    case 'startup':
    case 'founder':
      return 'purple'
    case 'sales':
    case 'cs':
      return 'green'
    case 'content':
      return 'purple'
    case 'marketing':
      return 'red'
    case 'ops':
      return 'blue'
    case 'agency':
      return 'muted'
    case 'research':
      return 'cyan'
    case 'dev':
      return 'orange'
    default:
      return 'purple'
  }
}

function TemplateTitleIcon({ template }: { template: SpaceTemplate }) {
  const palette = getIconColor(getTemplateRoleColor(template.persona))
  return (
    <div
      className={`${palette.glassClass} h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center`}
    >
      <LucideIcon name={template.icon} className={`icon-sm ${palette.textColor}`} />
    </div>
  )
}

export interface SpaceTemplatesBrowsePanelProps {
  open: boolean
  campaignId: string | null
  onClose: () => void
}

export function SpaceTemplatesBrowsePanel({
  open,
  campaignId,
  onClose,
}: SpaceTemplatesBrowsePanelProps) {
  const [templates, setTemplates] = useState<SpaceTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [templateNavFilter, setTemplateNavFilter] = useState<SpaceTemplateNavFilterId>('all')
  const [confirmTemplate, setConfirmTemplate] = useState<SpaceTemplate | null>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listSpaceTemplates()
      setTemplates(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPortalTarget(document.body)
  }, [])

  useEffect(() => {
    if (!open) return
    void load()
    setTemplateNavFilter('all')
    setConfirmTemplate(null)
  }, [open, load])

  const visibleTemplates = useMemo(
    () => filterSpaceTemplates(templateNavFilter, templates),
    [templateNavFilter, templates],
  )

  if (!open) return null

  const tree = (
    <div className="z-modal-dialog-root z-modal-layer-3 fixed inset-0 flex items-center justify-center">
      <div className="z-modal-dialog-backdrop-fill" onClick={onClose} role="presentation" />
      <div className="surface-card border-border z-modal-content rounded-spacing-4 relative mx-4 flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden border shadow-lg">
        <div className="px-spacing-6 py-spacing-4 flex shrink-0 items-center justify-between">
          <span className="gap-spacing-2 body-2 text-foreground flex items-center font-semibold">
            <LayoutGrid className="icon-lg text-muted-foreground" />
            Space templates
          </span>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="btn-icon-bare" aria-label="Close">
              <X className="icon-xs" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] overflow-hidden">
          <div className="p-spacing-2 min-h-0">
            <SpaceTemplatesNav
              templateNavFilter={templateNavFilter}
              onTemplateNavFilter={setTemplateNavFilter}
              templates={templates}
            />
          </div>
          <div className="p-spacing-2 pl-spacing-4 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="py-spacing-8 flex min-h-[200px] flex-col items-center justify-center">
                <VibeyLoadingOrb text="Loading templates…" state="processing" size="md" />
              </div>
            ) : visibleTemplates.length === 0 ? (
              <div className="py-spacing-8 flex min-h-[200px] flex-col items-center justify-center text-center">
                <p className="body-3 text-muted-foreground">No templates in this category.</p>
              </div>
            ) : (
              <div className="gap-spacing-3 grid grid-cols-2">
                {visibleTemplates.map((template) => (
                  <button
                    key={template.slug}
                    type="button"
                    onClick={() => setConfirmTemplate(template)}
                    className="section-card rounded-spacing-3 p-spacing-4 hover:bg-hover-subtle flex h-full cursor-pointer text-left transition-colors"
                  >
                    <div className="gap-spacing-3 flex min-w-0 flex-1 items-start">
                      <TemplateTitleIcon template={template} />
                      <div className="gap-spacing-1 flex min-w-0 flex-1 flex-col">
                        <span className="body-2 text-foreground min-w-0 font-semibold leading-snug">
                          {template.title}
                        </span>
                        <p className="body-3 text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <UseTemplateConfirmDialog
        open={confirmTemplate != null}
        template={confirmTemplate}
        campaignId={campaignId}
        onClose={() => setConfirmTemplate(null)}
        onCreated={() => onClose()}
      />
    </div>
  )

  return portalTarget ? createPortal(tree, portalTarget) : null
}
