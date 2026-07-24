'use client'

import { useMemo, useState } from 'react'
import { Check, Circle, Film, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createMission, type Mission, type MissionDeliverable } from '@/lib/missions'
import { cn } from '@/lib/utils/cn'
import { ADS_RESEARCH_MESSAGES } from '../../config/ads-research-messages.config'
import {
  IG_ORGANIC_APPROVED_EMOJIS,
  IG_ORGANIC_VIDEO_SCENES,
} from '../../config/ig-organic-video-scenes.config'
import { buildIgOrganicVideoMissionPayload } from '../playbooks/ig-organic-video'

interface IgOrganicVideoProductionLauncherProps {
  campaignId: string
  spaceId: string
  sourceMissionId?: string
  sourceDeliverables?: MissionDeliverable[]
}

export function IgOrganicVideoProductionLauncher({
  campaignId,
  spaceId,
  sourceMissionId,
  sourceDeliverables = [],
}: IgOrganicVideoProductionLauncherProps) {
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>(['golden-hour-infinity-pool'])
  const [copyMode, setCopyMode] = useState<'write_for_me' | 'use_my_copy'>('write_for_me')
  const [sourceStrategy, setSourceStrategy] = useState<'reuse_when_available' | 'generate_new'>(
    'reuse_when_available',
  )
  const [pillLine, setPillLine] = useState('Free Training')
  const [headline, setHeadline] = useState('')
  const [highlightPhrase, setHighlightPhrase] = useState('')
  const [ctaLine, setCtaLine] = useState('Tap Below For More Info')
  const [emoji, setEmoji] = useState<(typeof IG_ORGANIC_APPROVED_EMOJIS)[number]>('👇')
  const [offerContext, setOfferContext] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mission, setMission] = useState<Mission | null>(null)

  const presetCount = useMemo(
    () =>
      IG_ORGANIC_VIDEO_SCENES.filter(
        (scene) => selectedSceneIds.includes(scene.id) && scene.presetVideoUrl,
      ).length,
    [selectedSceneIds],
  )

  const toggleScene = (sceneId: string) => {
    setSelectedSceneIds((current) =>
      current.includes(sceneId)
        ? current.filter((selectedId) => selectedId !== sceneId)
        : [...current, sceneId],
    )
  }

  const canSubmit =
    selectedSceneIds.length > 0 &&
    (copyMode === 'write_for_me'
      ? Boolean(offerContext.trim()) || sourceDeliverables.length > 0
      : Boolean(headline.trim()))

  const startProduction = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const payload = buildIgOrganicVideoMissionPayload({
        copyMode,
        sourceStrategy,
        selectedSceneIds,
        pillLine,
        headline,
        highlightPhrase,
        ctaLine,
        emoji,
        offerContext,
        sourceMissionId,
        sourceDeliverableIds: sourceDeliverables.map((deliverable) => deliverable.id),
      })
      const created = await createMission({
        ...payload,
        campaign_id: campaignId,
        space_id: spaceId,
      })
      setMission(created)
      toast.success(ADS_RESEARCH_MESSAGES.VIDEO_PRODUCTION_STARTED)
    } catch {
      toast.error(ADS_RESEARCH_MESSAGES.VIDEO_PRODUCTION_START_FAILED)
    } finally {
      setSubmitting(false)
    }
  }

  if (mission) {
    return (
      <section className="surface-card border-border p-spacing-4 rounded-spacing-3 border">
        <div className="gap-spacing-3 flex items-start">
          <Check className="icon-md text-success shrink-0" />
          <div>
            <h2 className="body-2 text-foreground font-semibold">VIDEO PRODUCTION STARTED</h2>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Lux will write or verify the copy first, reuse approved footage where possible, and
              stop for Higgsfield connection access if it is not connected.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="surface-card border-border p-spacing-4 gap-spacing-5 rounded-spacing-3 flex flex-col border">
      <div className="gap-spacing-3 flex items-start">
        <Film className="icon-md text-primary shrink-0" />
        <div>
          <h2 className="body-2 text-foreground font-semibold">CREATE VIDEO ADS</h2>
          <p className="body-3 text-muted-foreground mt-spacing-1">
            Build organic Instagram Story videos from reusable footage or generate a new scene.
          </p>
        </div>
      </div>

      <div className="gap-spacing-3 flex flex-col">
        <div>
          <p className="body-2 text-foreground font-semibold">1. Choose scenes</p>
          <p className="body-4 text-muted-foreground">
            Select one or many. The number selected is the number of video variants produced.
          </p>
        </div>
        <div className="gap-spacing-2 grid sm:grid-cols-2 lg:grid-cols-3">
          {IG_ORGANIC_VIDEO_SCENES.map((scene) => {
            const selected = selectedSceneIds.includes(scene.id)
            return (
              <button
                key={scene.id}
                type="button"
                className={cn(
                  'border-border p-spacing-3 gap-spacing-2 rounded-spacing-2 flex items-start border text-left',
                  selected ? 'bg-hover-subtle' : 'bg-secondary',
                )}
                aria-pressed={selected}
                onClick={() => toggleScene(scene.id)}
              >
                {selected ? (
                  <Check className="icon-sm text-primary mt-spacing-0-5 shrink-0" />
                ) : (
                  <Circle className="icon-sm text-muted-foreground mt-spacing-0-5 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="body-3 text-foreground block font-medium">{scene.name}</span>
                  <span className="body-4 text-muted-foreground block">
                    {scene.presetVideoUrl ? 'Clean preset ready' : 'Generate with Higgsfield'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="gap-spacing-2 flex flex-wrap">
          <button
            type="button"
            className={cn(
              'button-compact',
              sourceStrategy === 'reuse_when_available'
                ? 'button-glass-primary'
                : 'button-glass-neutral',
            )}
            onClick={() => setSourceStrategy('reuse_when_available')}
          >
            Reuse presets first ({presetCount})
          </button>
          <button
            type="button"
            className={cn(
              'button-compact',
              sourceStrategy === 'generate_new' ? 'button-glass-primary' : 'button-glass-neutral',
            )}
            onClick={() => setSourceStrategy('generate_new')}
          >
            Generate all new
          </button>
        </div>
      </div>

      <div className="gap-spacing-3 flex flex-col">
        <div>
          <p className="body-2 text-foreground font-semibold">2. Prepare copy</p>
          <p className="body-4 text-muted-foreground">
            Copy is approved before any footage is generated or rendered.
          </p>
        </div>
        <div className="gap-spacing-2 flex flex-wrap">
          <button
            type="button"
            className={cn(
              'button-compact',
              copyMode === 'write_for_me' ? 'button-glass-primary' : 'button-glass-neutral',
            )}
            onClick={() => setCopyMode('write_for_me')}
          >
            Write it for me
          </button>
          <button
            type="button"
            className={cn(
              'button-compact',
              copyMode === 'use_my_copy' ? 'button-glass-primary' : 'button-glass-neutral',
            )}
            onClick={() => setCopyMode('use_my_copy')}
          >
            Use my exact copy
          </button>
        </div>

        {copyMode === 'write_for_me' ? (
          <label className="gap-spacing-2 flex flex-col">
            <span className="body-3 text-foreground font-medium">Offer and audience context</span>
            <textarea
              className="input-glass body-3 h-spacing-24"
              value={offerContext}
              onChange={(event) => setOfferContext(event.target.value)}
              placeholder={
                sourceDeliverables.length > 0
                  ? 'Optional. Lux can use the linked Ads Research recommendations.'
                  : 'Who is this for, what is the offer, and what should they do next?'
              }
            />
          </label>
        ) : (
          <div className="gap-spacing-3 grid lg:grid-cols-2">
            <label className="gap-spacing-2 flex flex-col">
              <span className="body-3 text-foreground font-medium">Blue pill</span>
              <input
                className="input-glass body-3 h-spacing-9"
                value={pillLine}
                onChange={(event) => setPillLine(event.target.value)}
              />
            </label>
            <label className="gap-spacing-2 flex flex-col">
              <span className="body-3 text-foreground font-medium">Headline</span>
              <input
                className="input-glass body-3 h-spacing-9"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
              />
            </label>
            <label className="gap-spacing-2 flex flex-col">
              <span className="body-3 text-foreground font-medium">Red highlight phrase</span>
              <input
                className="input-glass body-3 h-spacing-9"
                value={highlightPhrase}
                onChange={(event) => setHighlightPhrase(event.target.value)}
              />
            </label>
            <label className="gap-spacing-2 flex flex-col">
              <span className="body-3 text-foreground font-medium">CTA</span>
              <input
                className="input-glass body-3 h-spacing-9"
                value={ctaLine}
                onChange={(event) => setCtaLine(event.target.value)}
              />
            </label>
          </div>
        )}

        <div>
          <p className="body-3 text-foreground font-medium">Apple-style emoji</p>
          <div className="gap-spacing-2 mt-spacing-2 flex flex-wrap">
            {IG_ORGANIC_APPROVED_EMOJIS.map((option) => (
              <button
                key={option}
                type="button"
                className={cn(
                  'button-compact',
                  emoji === option ? 'button-glass-primary' : 'button-glass-neutral',
                )}
                aria-pressed={emoji === option}
                onClick={() => setEmoji(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="button-default button-glass-primary gap-spacing-2 inline-flex items-center self-start"
        disabled={!canSubmit || submitting}
        onClick={() => void startProduction()}
      >
        <Sparkles className="icon-sm" />
        {submitting ? 'Starting production…' : 'Create video ads'}
      </button>
    </section>
  )
}
