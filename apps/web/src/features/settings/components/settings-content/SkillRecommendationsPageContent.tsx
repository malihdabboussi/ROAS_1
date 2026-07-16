'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Switch from '@/components/ui/forms/switch'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useOrgStore } from '@/lib/org'
import {
  fetchSkillRecommendationSettings,
  updateSkillRecommendationSettings,
} from '@/lib/skill-recommendations'

export default function SkillRecommendationsPageContent() {
  const isOrgContext = useOrgStore((s) => s.isOrgContext())
  const canEdit = useOrgStore((s) => s.hasMinRole('admin'))
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const settings = await fetchSkillRecommendationSettings()
      setEnabled(settings.enabled)
    } catch {
      toast.error('Failed to load skill recommendations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggle = useCallback(
    async (nextEnabled: boolean) => {
      if (!canEdit || saving) return
      setSaving(true)
      setEnabled(nextEnabled)
      try {
        const settings = await updateSkillRecommendationSettings(nextEnabled)
        setEnabled(settings.enabled)
      } catch {
        toast.error('Failed to update skill recommendations')
        void load()
      } finally {
        setSaving(false)
      }
    },
    [canEdit, load, saving],
  )

  if (loading) {
    return (
      <div className="p-spacing-4 sm:p-spacing-8 flex h-full min-h-0 items-center justify-center">
        <VibeyLoadingOrb state="processing" size="sm" />
      </div>
    )
  }

  return (
    <div className="p-spacing-4 sm:p-spacing-8 gap-spacing-6 flex flex-col">
      <div className="gap-spacing-4 flex items-start justify-between">
        <div className="min-w-0">
          <h1 className="title-h5 text-foreground">SKILL RECOMMENDATIONS</h1>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            Detect repeated agent patterns and ask Jaime to draft skill or agent-file proposals when
            enough evidence appears.
          </p>
          {!isOrgContext ? (
            <p className="body-4 text-muted-foreground mt-spacing-2">
              Switch to a workspace to manage skill recommendations.
            </p>
          ) : !canEdit ? (
            <p className="body-4 text-muted-foreground mt-spacing-2">
              Only workspace admins can change this setting.
            </p>
          ) : null}
        </div>
      </div>

      <div className="surface-card card-elevated border-border rounded-spacing-3 border">
        <div className="px-spacing-4 py-spacing-4 gap-spacing-4 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="body-2 text-foreground font-medium">
              Jaime-reviewed agent improvements
            </p>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              When enabled, ROAS stores lightweight workflow metadata after chat turns. This
              collection is token-free. Credits can be used only after enough similar runs are
              detected and Jaime analyzes the repeated pattern.
            </p>
            <p className="body-4 text-muted-foreground mt-spacing-2">
              No change is applied automatically. Customer-visible proposals are limited to
              org-owned skills, skill resources, and ROLE.md, IDENTITY.md, or SOUL.md updates.
              Platform and system-agent issues stay internal.
            </p>
          </div>
          <Switch
            checked={enabled}
            disabled={!isOrgContext || !canEdit || saving}
            onCheckedChange={(checked) => void toggle(checked)}
            className="shrink-0"
          />
        </div>
      </div>
    </div>
  )
}
