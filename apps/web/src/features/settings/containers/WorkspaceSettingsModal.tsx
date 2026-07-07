'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import {
  ArrowLeft,
  Brain,
  Cable,
  Cpu,
  Globe,
  Mail,
  Plug,
  Rocket,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useUserRole } from '@/hooks/use-user-role'
import type { WorkspaceSettingsSection } from '@/lib/settings/workspace-settings-modal-context'

const DynamicLoadingFallback = () => (
  <div className="flex h-full items-center justify-center">
    <VibeyLoadingOrb state="processing" size="sm" />
  </div>
)

const PropertiesPageContent = dynamic(
  () => import('../components/settings-content/PropertiesPageContent'),
  {
    ssr: false,
    loading: DynamicLoadingFallback,
  },
)
const IntegrationsPageContent = dynamic(
  () => import('../components/settings-content/IntegrationsPageContent'),
  { ssr: false, loading: DynamicLoadingFallback },
)
const ApiKeysPageContent = dynamic(
  () => import('../components/settings-content/ApiKeysPageContent'),
  {
    ssr: false,
    loading: DynamicLoadingFallback,
  },
)
const DomainsPageContent = dynamic(
  () => import('../components/settings-content/DomainsPageContent'),
  {
    ssr: false,
    loading: DynamicLoadingFallback,
  },
)
const EmailSettingsPageContent = dynamic(
  () => import('../components/settings-content/EmailSettingsPageContent'),
  { ssr: false, loading: DynamicLoadingFallback },
)
const BrainPageContent = dynamic(() => import('../components/settings-content/BrainPageContent'), {
  ssr: false,
  loading: DynamicLoadingFallback,
})
const McpPageContent = dynamic(() => import('../components/settings-content/McpPageContent'), {
  ssr: false,
  loading: DynamicLoadingFallback,
})
const AutopilotPageContent = dynamic(
  () => import('../components/settings-content/AutopilotPageContent'),
  {
    ssr: false,
    loading: DynamicLoadingFallback,
  },
)
const ModelsPageContent = dynamic(() => import('../components/settings-content/ModelsPageContent'), {
  ssr: false,
  loading: DynamicLoadingFallback,
})
const SkillRecommendationsPageContent = dynamic(
  () => import('../components/settings-content/SkillRecommendationsPageContent'),
  { ssr: false, loading: DynamicLoadingFallback },
)

interface NavItem {
  id: WorkspaceSettingsSection
  label: string
  icon: React.ComponentType<{ className?: string }>
  chip?: string
}

interface NavCategory {
  title: string
  items: NavItem[]
}

function buildNavCategories(showBrain: boolean, showAutopilot: boolean): NavCategory[] {
  const categories: NavCategory[] = [
    {
      title: 'Platform',
      items: [
        { id: 'properties', label: 'Properties', icon: Settings },
        { id: 'integrations', label: 'Integrations', icon: Plug },
        { id: 'mcp', label: 'MCP Servers', icon: Cable },
        { id: 'domains', label: 'Domains', icon: Globe },
      ],
    },
  ]
  const intelligenceItems: NavItem[] = []
  if (showBrain) {
    intelligenceItems.push({ id: 'brain', label: 'Brain', icon: Brain })
  }
  intelligenceItems.push({ id: 'models', label: 'Models', icon: Cpu })
  intelligenceItems.push({
    id: 'skill-recommendations',
    label: 'Skill recommendations',
    icon: Sparkles,
  })
  if (showAutopilot) {
    intelligenceItems.push({
      id: 'autopilot',
      label: 'Autopilot',
      icon: Rocket,
      chip: 'Admin only',
    })
  }
  categories.push({
    title: 'Intelligence',
    items: intelligenceItems,
  })
  categories.push({
    title: 'Communications',
    items: [{ id: 'email', label: 'Email', icon: Mail }],
  })
  return categories
}

interface WorkspaceSettingsModalProps {
  open: boolean
  onClose: () => void
  initialSection?: WorkspaceSettingsSection
}

export function WorkspaceSettingsModal({
  open,
  onClose,
  initialSection = 'properties',
}: WorkspaceSettingsModalProps) {
  const { role } = useUserRole()
  const showBrain = true
  const showAutopilot = role === 'admin'
  const navCategories = useMemo(
    () => buildNavCategories(showBrain, showAutopilot),
    [showAutopilot, showBrain],
  )
  const [activeSection, setActiveSection] = useState<WorkspaceSettingsSection>(initialSection)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (open) {
      const safeSection =
        (initialSection === 'brain' && !showBrain) ||
        (initialSection === 'autopilot' && !showAutopilot)
          ? 'properties'
          : initialSection
      setActiveSection(safeSection)
    }
  }, [open, initialSection, showAutopilot, showBrain])

  const allNavItems = navCategories.flatMap((c) => c.items)

  const renderContent = () => {
    switch (activeSection) {
      case 'properties':
        return <PropertiesPageContent />
      case 'integrations':
        return <IntegrationsPageContent />
      case 'mcp':
        return <McpPageContent />
      case 'api-keys':
        return <ApiKeysPageContent />
      case 'domains':
        return <DomainsPageContent />
      case 'email':
        return <EmailSettingsPageContent />
      case 'brain':
        return <BrainPageContent />
      case 'models':
        return <ModelsPageContent />
      case 'skill-recommendations':
        return <SkillRecommendationsPageContent />
      case 'autopilot':
        if (!showAutopilot) return <PropertiesPageContent />
        return <AutopilotPageContent />
      default:
        return <PropertiesPageContent />
    }
  }

  if (!open) return null

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-background)]">
        <div className="flex items-center gap-3 px-3 pb-1 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
            Workspace Settings
          </span>
          <div className="w-spacing-8" />
        </div>
        <div className="flex items-center justify-center gap-1 overflow-x-auto px-3 py-2">
          {allNavItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`gap-spacing-2 h-spacing-8 rounded-spacing-3 flex shrink-0 items-center transition-all duration-[600ms] ease-in-out ${
                  activeSection === item.id
                    ? 'chip-glass-blue px-spacing-3'
                    : 'chip-glass-neutral px-spacing-2'
                }`}
              >
                <Icon className="h-4 w-4" />
                {activeSection === item.id && (
                  <>
                    <span className="body-2 whitespace-nowrap font-semibold">{item.label}</span>
                    {item.chip ? (
                      <span className="badge-glass badge-glass-muted body-4 rounded-spacing-2 px-2 py-0.5">
                        {item.chip}
                      </span>
                    ) : null}
                  </>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{renderContent()}</div>
      </div>
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-inert" />
        <DialogPrimitive.Content className="z-modal-layer-3 z-modal-dialog-root fixed inset-0 flex items-center justify-center overflow-visible">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Workspace Settings</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div
            className="z-modal-dialog-backdrop-fill"
            role="presentation"
            aria-hidden
            onClick={onClose}
          />

          <div className="p-spacing-4 pointer-events-none relative z-10 flex h-full min-h-0 w-full items-center justify-center">
            <div
              className="pointer-events-auto relative flex h-[90vh] w-full max-w-[1400px] items-start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="surface-card wizard-container-border rounded-spacing-4 relative flex h-full w-full flex-col overflow-hidden">
                <div className="px-spacing-4 py-spacing-3 flex items-center justify-between">
                  <h2 className="typo-caption text-muted-foreground uppercase">
                    Workspace Settings
                  </h2>
                  <button type="button" onClick={onClose} className="btn-icon-bare">
                    <X className="icon-sm" />
                  </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                  <div className="hidden md:block">
                    <aside className="surface-card relative z-40 flex h-full w-[240px] flex-col">
                      <nav className="px-spacing-3 py-spacing-4 space-y-spacing-1 flex-1 overflow-y-auto">
                        {navCategories.map((category, categoryIndex) => (
                          <div key={category.title}>
                            {categoryIndex > 0 && (
                              <div className="border-border mt-spacing-4 mb-spacing-2 border-t" />
                            )}
                            <div className="typo-caption text-muted-foreground mb-spacing-1 px-spacing-3 uppercase">
                              {category.title}
                            </div>
                            <div className="space-y-spacing-1">
                              {category.items.map((item) => {
                                const Icon = item.icon
                                const isActive = activeSection === item.id
                                return (
                                  <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`gap-spacing-2 px-spacing-3 py-spacing-2 body-2 group flex w-full items-center text-left font-medium transition-all duration-200 ${
                                      isActive
                                        ? 'nav-glass-selected-purple nav-glass-text-purple'
                                        : 'text-muted-foreground nav-glass-hover-purple border border-transparent'
                                    } rounded-spacing-2 relative`}
                                  >
                                    <Icon className="icon-sm" />
                                    <span>{item.label}</span>
                                    {item.chip ? (
                                      <span className="badge-glass badge-glass-muted body-4 rounded-spacing-2 ml-auto px-2 py-0.5">
                                        {item.chip}
                                      </span>
                                    ) : null}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </nav>
                    </aside>
                  </div>

                  <main className="surface-card rounded-tl-spacing-3 h-full min-w-0 flex-1 overflow-hidden">
                    <div className="surface-bg h-full overflow-auto">{renderContent()}</div>
                  </main>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
