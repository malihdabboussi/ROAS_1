'use client'

import { BookOpen, Library, Loader2, Plus } from 'lucide-react'
import type { TrainableBrainTarget } from '@/features/brain/hooks/use-trainable-brains'
import { cn } from '@/lib/utils/cn'
import { BrainTrainTargetSelect } from './BrainTrainTargetSelect'
import type { SourceKey } from './types'

interface SourceRailUploadItem {
  key: SourceKey
  label: string
  icon: typeof BookOpen
}

export interface SourceRailIntegrationItem {
  key: SourceKey
  label: string
  logoSrc: string
}

const SOURCE_RAIL_UPLOAD: SourceRailUploadItem[] = [{ key: 'add', label: 'Add', icon: Plus }]

export const TRAINING_SOURCE_RAIL_INTEGRATIONS: SourceRailIntegrationItem[] = [
  { key: 'drive', label: 'Google Drive', logoSrc: '/Integrations/GoogleDrive.png' },
  { key: 'dropbox', label: 'Dropbox', logoSrc: '/Integrations/Dropbox.png' },
  { key: 'fathom', label: 'Fathom', logoSrc: '/Integrations/Fathom.png' },
  { key: 'fireflies', label: 'Fireflies', logoSrc: '/Integrations/Fireflies.png' },
]

export const TRAINING_INTEGRATION_KEYS = [
  'drive',
  'dropbox',
  'fathom',
  'fireflies',
] as const satisfies readonly SourceKey[]

export function TrainingSourceRail({
  showBrainPicker,
  pickerTargets,
  activeScopeIds,
  onSelectedScopeIdsChange,
  activeSource,
  onActiveSourceChange,
  integrationsStatusReady,
  connectedIntegrationRailItems,
  onOpenIntegrationsLibrary,
}: {
  showBrainPicker: boolean
  pickerTargets: TrainableBrainTarget[]
  activeScopeIds: string[]
  onSelectedScopeIdsChange?: (scopeIds: string[]) => void
  activeSource: SourceKey
  onActiveSourceChange: (source: SourceKey) => void
  integrationsStatusReady: boolean
  connectedIntegrationRailItems: SourceRailIntegrationItem[]
  onOpenIntegrationsLibrary: () => void
}) {
  return (
    <div className="p-spacing-2 gap-spacing-3 flex min-h-0 flex-col">
      {showBrainPicker && onSelectedScopeIdsChange ? (
        <BrainTrainTargetSelect
          targets={pickerTargets}
          values={activeScopeIds}
          onChange={onSelectedScopeIdsChange}
        />
      ) : null}
      <nav className="border-border bg-secondary rounded-spacing-3 flex min-h-0 flex-1 flex-col overflow-hidden border">
        <div className="scrollbar-hide p-spacing-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mb-spacing-3 space-y-0.5">
            {SOURCE_RAIL_UPLOAD.map((item) => {
              const Icon = item.icon
              const active = activeSource === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onActiveSourceChange(item.key)}
                  className={cn(
                    'nav-glass-hover-purple body-3 rounded-spacing-2 py-spacing-1 px-spacing-3 gap-spacing-2 flex w-full items-center text-left transition-all',
                    active
                      ? 'nav-glass-selected-purple nav-glass-text-purple'
                      : 'text-muted-foreground',
                  )}
                >
                  <Icon className="icon-md shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-0.5">
            <div className="px-spacing-3 pb-spacing-1 pt-spacing-1">
              <span className="typo-section-label text-muted-foreground">Integrations</span>
            </div>
            {!integrationsStatusReady ? (
              <div className="body-4 text-muted-foreground gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center">
                <Loader2 className="icon-sm shrink-0 animate-spin" aria-hidden />
                <span>Checking connections…</span>
              </div>
            ) : (
              <>
                {connectedIntegrationRailItems.length === 0 ? (
                  <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex flex-col">
                    <div className="gap-spacing-1 flex items-start">
                      <Library
                        className="text-muted-foreground mt-spacing-0-5 icon-sm shrink-0"
                        aria-hidden
                      />
                      <p className="body-4 text-muted-foreground leading-snug">
                        No integrations connected. Connect Drive, Dropbox, Fathom, or Fireflies to
                        import here.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenIntegrationsLibrary}
                      className="button-glass-neutral body-4 py-spacing-1 inline-flex w-full items-center justify-center rounded-spacing-2 font-medium"
                    >
                      Browse integrations
                    </button>
                  </div>
                ) : (
                  connectedIntegrationRailItems.map((item) => {
                    const active = activeSource === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => onActiveSourceChange(item.key)}
                        className={cn(
                          'nav-glass-hover-purple rounded-spacing-2 py-spacing-1 px-spacing-3 gap-spacing-2 flex w-full items-center text-left transition-all',
                          active
                            ? 'nav-glass-selected-purple nav-glass-text-purple'
                            : 'text-muted-foreground',
                        )}
                      >
                        <img
                          src={item.logoSrc}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded-spacing-1 object-contain"
                        />
                        <span className="body-3 min-w-0 flex-1 truncate">{item.label}</span>
                      </button>
                    )
                  })
                )}
                <button
                  type="button"
                  onClick={onOpenIntegrationsLibrary}
                  className="nav-glass-hover-purple text-muted-foreground rounded-spacing-2 py-spacing-1 px-spacing-3 hover:text-foreground gap-spacing-2 flex w-full items-center text-left transition-all"
                >
                  <Plus className="icon-md shrink-0" aria-hidden />
                  <span className="body-3 min-w-0 flex-1 truncate">Add More</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
