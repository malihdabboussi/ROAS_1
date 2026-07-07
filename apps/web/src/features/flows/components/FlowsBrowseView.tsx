'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Brain,
  Calendar,
  CheckSquare,
  ClipboardList,
  Loader2,
  Package,
  Plus,
  Users,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AutomationIntegrationLogo,
  AutomationTemplateVisual,
  getTemplateNavFilterLogoPath,
} from '@/components/flows/AutomationTemplateVisual'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchAutomationTemplates,
  installAutomationTemplate,
} from '@/lib/flows/automation-template-api'
import {
  countTemplatesForNavFilter,
  filterAutomationTemplates,
  TEMPLATE_NAV_SECTIONS,
  type TemplateNavFilterId,
} from '@/lib/flows/automation-template-nav'
import type {
  AutomationTemplatePreset,
  AutomationTemplateTriggerGroup,
} from '@/lib/flows/automation-templates'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { cn } from '@/lib/utils/cn'
import { FlowBrowseTemplatesMockup, FlowEmptyState } from './FlowEmptyMockups'

const TEMPLATE_NAV_HIDE_EMPTY_SECTIONS = new Set(['Connected apps', 'Internal triggers'])

function templateTriggerGroupIcon(group: AutomationTemplateTriggerGroup) {
  switch (group) {
    case 'forms':
      return ClipboardList
    case 'contacts':
      return Users
    case 'tasks':
      return CheckSquare
    case 'artifacts':
      return Package
    case 'schedule':
      return Calendar
    case 'brain':
      return Brain
  }
}

function templatePresetIcon(template: AutomationTemplatePreset) {
  if (template.triggerGroup) return templateTriggerGroupIcon(template.triggerGroup)
  return Zap
}

export function FlowsBrowseView({
  spaceId,
  onInstalled,
  onCreateBlank,
}: {
  spaceId?: string | null
  onInstalled: (flowId: string) => void
  onCreateBlank: () => void
}) {
  const [templateNavFilter, setTemplateNavFilter] = useState<TemplateNavFilterId>('all')
  const [templatePresets, setTemplatePresets] = useState<AutomationTemplatePreset[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [installingTemplateId, setInstallingTemplateId] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    try {
      setTemplatePresets(await fetchAutomationTemplates(spaceId))
    } catch {
      toast.error('Could not load flow templates')
    } finally {
      setTemplatesLoading(false)
    }
  }, [spaceId])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  const visibleTemplatePresets = useMemo(
    () => filterAutomationTemplates(templateNavFilter, templatePresets),
    [templateNavFilter, templatePresets],
  )

  const handleInstall = async (template: AutomationTemplatePreset) => {
    if (!spaceId) return
    setInstallingTemplateId(template.id)
    try {
      const created = await installAutomationTemplate<{ id: string }>(spaceId, template.id)
      toast.success('Flow installed from template')
      onInstalled(created.id)
    } finally {
      setInstallingTemplateId(null)
    }
  }

  if (templatesLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <VibeyLoadingOrb text="Loading templates…" state="processing" size="md" />
      </div>
    )
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)] overflow-hidden">
      <aside className="border-border bg-muted/10 rounded-spacing-3 m-3 mr-0 flex min-h-0 flex-col overflow-hidden border">
        <div className="p-spacing-2 shrink-0">
          <button
            type="button"
            onClick={onCreateBlank}
            disabled={!spaceId}
            className="badge-glass badge-glass-green body-3 rounded-spacing-2 gap-spacing-2 px-spacing-3 py-spacing-2 flex w-full items-center justify-center font-semibold transition-opacity hover:opacity-90"
            aria-label={FLOWS_UI.addFlow}
            title={!spaceId ? FLOWS_UI.selectSpaceForBrowse : undefined}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            {FLOWS_UI.addFlow}
          </button>
        </div>
        <div className="scrollbar-hide gap-spacing-6 p-spacing-2 flex min-h-0 flex-1 flex-col overflow-y-auto pt-0">
          {TEMPLATE_NAV_SECTIONS.map((section, sectionIndex) => {
            const visibleItems = section.items.filter((item) => {
              if (!TEMPLATE_NAV_HIDE_EMPTY_SECTIONS.has(section.title)) return true
              return countTemplatesForNavFilter(item.id, templatePresets) > 0
            })
            if (visibleItems.length === 0) return null
            return (
              <div key={section.title}>
                {sectionIndex > 0 ? <div className="border-border mb-spacing-3 border-t" /> : null}
                <div className="px-spacing-3 pb-spacing-1 pt-spacing-1">
                  <span className="typo-section-label text-muted-foreground">{section.title}</span>
                </div>
                <div>
                  {visibleItems.map((item) => {
                    const selected = item.id === templateNavFilter
                    const count = countTemplatesForNavFilter(item.id, templatePresets)
                    const navLogo = getTemplateNavFilterLogoPath(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTemplateNavFilter(item.id)}
                        className={cn(
                          'nav-glass-hover-purple body-3 rounded-spacing-2 py-spacing-1 gap-spacing-2 px-spacing-3 flex w-full items-center justify-between text-left transition-all',
                          selected
                            ? 'nav-glass-selected-purple nav-glass-text-purple'
                            : 'text-muted-foreground',
                        )}
                      >
                        <span className="gap-spacing-2 flex min-w-0 items-center">
                          {navLogo ? (
                            <AutomationIntegrationLogo
                              src={navLogo}
                              name={item.label}
                              className="h-spacing-4 w-spacing-4"
                            />
                          ) : null}
                          <span className="min-w-0 truncate">{item.label}</span>
                        </span>
                        <span className="typo-caption text-muted-foreground shrink-0">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </aside>
      <div className="p-spacing-3 min-h-0 overflow-y-auto">
        {visibleTemplatePresets.length === 0 ? (
          <FlowEmptyState
            mockup={<FlowBrowseTemplatesMockup />}
            title={FLOWS_UI.templatesEmptyTitle}
            description={FLOWS_UI.templatesEmptyDescription}
          />
        ) : (
          <div className="gap-spacing-3 grid grid-cols-1 md:grid-cols-2">
            {visibleTemplatePresets.map((template) => {
              const PresetIcon = templatePresetIcon(template)
              const installing = installingTemplateId === template.id
              const installDisabled = !!installingTemplateId || !spaceId
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => void handleInstall(template)}
                  disabled={installDisabled}
                  aria-busy={installing}
                  title={!spaceId ? FLOWS_UI.selectSpaceForBrowse : undefined}
                  className="section-card rounded-spacing-3 p-spacing-4 gap-spacing-3 hover:bg-hover-subtle flex h-full cursor-pointer flex-col items-stretch text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="gap-spacing-2 flex items-center">
                    <AutomationTemplateVisual template={template} FallbackIcon={PresetIcon} />
                    <span className="body-2 text-foreground min-w-0 flex-1 font-semibold leading-snug">
                      {template.title}
                    </span>
                    {installing ? (
                      <span className="badge-glass badge-glass-sm badge-glass-blue gap-spacing-1 inline-flex shrink-0 items-center">
                        <Loader2 className="icon-xs animate-spin" />
                        Installing
                      </span>
                    ) : null}
                  </span>
                  <span className="body-3 text-muted-foreground line-clamp-3 block">
                    {template.description}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
