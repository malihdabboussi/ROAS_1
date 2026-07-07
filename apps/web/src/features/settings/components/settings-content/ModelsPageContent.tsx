'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import Switch from '@/components/ui/forms/switch'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useOrgStore } from '@/features/org/store/use-org-store'
import {
  fetchWorkspaceModelPreferences,
  updateWorkspaceModelPreferences,
  type WorkspaceLlmModel,
} from '@/features/settings/services/models-settings.service'
import { TOOLBAR_DOCK_SLOT_SPRING } from '@/lib/ui/toolbar-motion'

const INPUT_MODALITY_LABELS: Record<string, string> = {
  image: 'Images',
  file: 'Files & PDFs',
  video: 'Video',
  audio: 'Audio',
}

function formatInputModalities(modalities: string[]): string {
  const nonText = modalities.filter((modality) => modality !== 'text')
  if (nonText.length === 0) return 'Text only'
  return nonText
    .map((modality) => {
      const label = INPUT_MODALITY_LABELS[modality]
      if (label) return label
      return modality.charAt(0).toUpperCase() + modality.slice(1)
    })
    .join(' · ')
}

function formatModelMetaLine(model: WorkspaceLlmModel): string {
  const contextLabel =
    model.contextOptions[0]?.label ?? `${Math.round(model.contextWindow / 1000)}K`
  return `${contextLabel} context · ${formatInputModalities(model.inputModalities)}`
}

function sortModels(models: WorkspaceLlmModel[]): WorkspaceLlmModel[] {
  return [...models].sort((a, b) => {
    const providerCompare = a.provider.localeCompare(b.provider)
    if (providerCompare !== 0) return providerCompare
    return a.label.localeCompare(b.label)
  })
}

export default function ModelsPageContent() {
  const isOrgContext = useOrgStore((s) => s.isOrgContext())
  const canEdit = useOrgStore((s) => s.hasMinRole('admin'))
  const [models, setModels] = useState<WorkspaceLlmModel[]>([])
  const [loading, setLoading] = useState(true)
  const [savingModelId, setSavingModelId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const prefs = await fetchWorkspaceModelPreferences()
      setModels(prefs.models)
    } catch {
      toast.error('Failed to load models')
      setModels([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visibleModels = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = query
      ? models.filter(
          (model) =>
            model.label.toLowerCase().includes(query) ||
            model.provider.toLowerCase().includes(query) ||
            model.id.toLowerCase().includes(query),
        )
      : models
    return sortModels(filtered)
  }, [models, search])

  const handleToggle = useCallback(
    async (modelId: string, nextEnabled: boolean) => {
      if (!canEdit) return
      const currentEnabled = models.filter((model) => model.enabled).map((model) => model.id)
      const nextEnabledIds = nextEnabled
        ? [...new Set([...currentEnabled, modelId])]
        : currentEnabled.filter((id) => id !== modelId)

      if (nextEnabledIds.length === 0) {
        toast.error('At least one model must stay enabled')
        return
      }

      setSavingModelId(modelId)
      setModels((prev) =>
        prev.map((model) => (model.id === modelId ? { ...model, enabled: nextEnabled } : model)),
      )

      try {
        const updated = await updateWorkspaceModelPreferences(nextEnabledIds)
        setModels(updated.models)
      } catch {
        toast.error('Failed to update model')
        void load()
      } finally {
        setSavingModelId(null)
      }
    },
    [canEdit, load, models],
  )

  if (loading) {
    return (
      <div className="p-spacing-4 sm:p-spacing-8 flex h-full min-h-[320px] items-center justify-center">
        <VibeyLoadingOrb state="processing" size="sm" />
      </div>
    )
  }

  return (
    <div className="p-spacing-4 sm:p-spacing-8 space-y-spacing-6">
      <div className="gap-spacing-4 flex items-start justify-between">
        <div className="min-w-0">
          <h1 className="title-h5 text-foreground">MODELS</h1>
          <p className="body-3 text-muted-foreground mt-spacing-1 max-w-[640px]">
            Choose which models appear in the composer picker for this workspace. Turn models on
            when you need them.
          </p>
          {!isOrgContext ? (
            <p className="body-4 text-muted-foreground mt-spacing-2">
              Switch to a workspace to save model preferences.
            </p>
          ) : !canEdit ? (
            <p className="body-4 text-muted-foreground mt-spacing-2">
              Only workspace admins can change which models are enabled.
            </p>
          ) : null}
        </div>

        <div className="flex h-7 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {searchOpen ? (
              <motion.div
                key="models-search-field"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <input
                  autoFocus
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onBlur={() => {
                    if (!search.trim()) setSearchOpen(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setSearch('')
                      setSearchOpen(false)
                    }
                  }}
                  placeholder="Search…"
                  className="w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
                />
              </motion.div>
            ) : (
              <motion.div
                key="models-search-icon"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <Tooltip label="Search" side="bottom" triggerClassName="flex h-full items-center">
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => setSearchOpen(true)}
                      className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                      aria-label="Search models"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="surface-card card-elevated border-border rounded-spacing-3 border">
        {visibleModels.length === 0 ? (
          <div className="px-spacing-4 py-spacing-6">
            <p className="body-3 text-muted-foreground">No models match your search.</p>
          </div>
        ) : (
          <div className="divide-border divide-y">
            {visibleModels.map((model) => {
              const isSaving = savingModelId === model.id
              return (
                <div
                  key={model.id}
                  className="px-spacing-4 py-spacing-3 gap-spacing-3 flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="body-3 text-foreground truncate font-medium">{model.label}</p>
                    <p className="body-4 text-muted-foreground mt-spacing-1">
                      {formatModelMetaLine(model)}
                    </p>
                  </div>
                  <Switch
                    checked={model.enabled}
                    disabled={!canEdit || !isOrgContext || isSaving}
                    onCheckedChange={(checked) => void handleToggle(model.id, checked)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
