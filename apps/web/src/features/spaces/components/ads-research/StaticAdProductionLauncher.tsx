'use client'

import { useMemo, useState } from 'react'
import { Check, Image as ImageIcon, Sparkles, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { MediaPickerModal } from '@/components/media'
import { createMission, type Mission, type MissionDeliverable } from '@/lib/missions'
import type { MediaAsset } from '@/lib/services/media-api'
import { cn } from '@/lib/utils/cn'
import { ADS_RESEARCH_MESSAGES } from '../../config/ads-research-messages.config'
import { STATIC_AD_FORMATS } from '../../config/static-ad-formats.config'
import {
  buildStaticAdProductionMissionPayload,
  type StaticAdReferenceAsset,
} from '../playbooks/static-ad-production'
import { StaticAdFormatSelector } from './StaticAdFormatSelector'

interface StaticAdProductionLauncherProps {
  campaignId: string
  spaceId: string
  sourceMissionId?: string
  sourceDeliverables?: MissionDeliverable[]
}

function toReferenceAsset(asset: MediaAsset): StaticAdReferenceAsset | null {
  if (!asset.public_url || !asset.mime_type.startsWith('image/')) return null
  return {
    id: asset.id,
    name: asset.name || asset.original_filename,
    url: asset.public_url,
    mimeType: asset.mime_type,
  }
}

export function StaticAdProductionLauncher({
  campaignId,
  spaceId,
  sourceMissionId,
  sourceDeliverables = [],
}: StaticAdProductionLauncherProps) {
  const [selectedFormatIds, setSelectedFormatIds] = useState<string[]>(['identity_callout'])
  const [quantity, setQuantity] = useState(3)
  const [aspectRatio, setAspectRatio] = useState<'4:5' | '9:16'>('4:5')
  const [copyMode, setCopyMode] = useState<'write_for_me' | 'use_my_copy'>('write_for_me')
  const [offerContext, setOfferContext] = useState('')
  const [exactCopy, setExactCopy] = useState('')
  const [personStrategy, setPersonStrategy] = useState<'use_uploaded' | 'generate'>('use_uploaded')
  const [referenceAssets, setReferenceAssets] = useState<StaticAdReferenceAsset[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mission, setMission] = useState<Mission | null>(null)

  const needsPerson = useMemo(
    () =>
      STATIC_AD_FORMATS.some(
        (format) => selectedFormatIds.includes(format.id) && format.needsPerson,
      ),
    [selectedFormatIds],
  )

  const toggleFormat = (formatId: string) => {
    setSelectedFormatIds((current) =>
      current.includes(formatId)
        ? current.filter((selectedId) => selectedId !== formatId)
        : [...current, formatId],
    )
  }

  const addAssets = (assets: MediaAsset[]) => {
    const incoming = assets
      .map(toReferenceAsset)
      .filter((asset): asset is StaticAdReferenceAsset => Boolean(asset))
    setReferenceAssets((current) => {
      const byId = new Map(current.map((asset) => [asset.id, asset]))
      incoming.forEach((asset) => byId.set(asset.id, asset))
      return [...byId.values()]
    })
  }

  const canSubmit =
    selectedFormatIds.length > 0 &&
    (copyMode === 'write_for_me'
      ? Boolean(offerContext.trim()) || sourceDeliverables.length > 0
      : Boolean(exactCopy.trim())) &&
    (!needsPerson || personStrategy === 'generate' || referenceAssets.length > 0)

  const startProduction = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const payload = buildStaticAdProductionMissionPayload({
        selectedFormatIds,
        quantity,
        aspectRatio,
        copyMode,
        exactCopy,
        offerContext,
        personStrategy,
        referenceAssets,
        sourceMissionId,
        sourceDeliverableIds: sourceDeliverables.map((deliverable) => deliverable.id),
      })
      const created = await createMission({
        ...payload,
        campaign_id: campaignId,
        space_id: spaceId,
      })
      setMission(created)
      toast.success(ADS_RESEARCH_MESSAGES.STATIC_PRODUCTION_STARTED)
    } catch {
      toast.error(ADS_RESEARCH_MESSAGES.STATIC_PRODUCTION_START_FAILED)
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
            <h2 className="body-2 text-foreground font-semibold">STATIC PRODUCTION STARTED</h2>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Lux is producing {quantity} ad{quantity === 1 ? '' : 's'}, checking the copy and
              imagery before rendering each final image.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="surface-card border-border p-spacing-4 gap-spacing-5 rounded-spacing-3 flex flex-col border">
        <div className="gap-spacing-3 flex items-start">
          <ImageIcon className="icon-md text-primary shrink-0" />
          <div>
            <h2 className="body-2 text-foreground font-semibold">CREATE STATIC ADS</h2>
            <p className="body-3 text-muted-foreground mt-spacing-1">
              Choose formats, quantity, copy source, and any approved person or product images.
            </p>
          </div>
        </div>

        <div className="gap-spacing-3 flex flex-col">
          <div>
            <p className="body-2 text-foreground font-semibold">1. Choose ad formats</p>
            <p className="body-4 text-muted-foreground">
              Select one or many. Variants are distributed across your selected formats.
            </p>
          </div>
          <StaticAdFormatSelector selectedFormatIds={selectedFormatIds} onToggle={toggleFormat} />
        </div>

        <div className="gap-spacing-3 grid sm:grid-cols-2">
          <label className="gap-spacing-2 flex flex-col">
            <span className="body-3 text-foreground font-medium">Number of finished ads</span>
            <input
              type="number"
              min={1}
              max={10}
              className="input-glass body-3 h-spacing-9"
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.min(10, Math.max(1, Number(event.target.value) || 1)))
              }
            />
          </label>
          <div>
            <p className="body-3 text-foreground font-medium">Size</p>
            <div className="gap-spacing-2 mt-spacing-2 flex">
              {(['4:5', '9:16'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  className={cn(
                    'button-compact',
                    aspectRatio === ratio ? 'button-glass-primary' : 'button-glass-neutral',
                  )}
                  onClick={() => setAspectRatio(ratio)}
                >
                  {ratio} {ratio === '4:5' ? 'Feed' : 'Story'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="gap-spacing-3 flex flex-col">
          <div>
            <p className="body-2 text-foreground font-semibold">2. Prepare copy</p>
            <p className="body-4 text-muted-foreground">
              Lux can write from the campaign and linked research, or preserve your exact copy.
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
          <label className="gap-spacing-2 flex flex-col">
            <span className="body-3 text-foreground font-medium">
              {copyMode === 'write_for_me' ? 'Offer and audience context' : 'Exact copy'}
            </span>
            <textarea
              className="input-glass body-3 h-spacing-24"
              value={copyMode === 'write_for_me' ? offerContext : exactCopy}
              onChange={(event) =>
                copyMode === 'write_for_me'
                  ? setOfferContext(event.target.value)
                  : setExactCopy(event.target.value)
              }
              placeholder={
                copyMode === 'write_for_me'
                  ? sourceDeliverables.length > 0
                    ? 'Optional. Lux can use the linked Ads Research recommendations.'
                    : 'Who is this for, what is the offer, and what should they do next?'
                  : 'Paste the copy and verified proof you want preserved.'
              }
            />
          </label>
        </div>

        <div className="gap-spacing-3 flex flex-col">
          <div>
            <p className="body-2 text-foreground font-semibold">3. Add approved images</p>
            <p className="body-4 text-muted-foreground">
              Add a founder, customer, product, or visual reference from Media. Person-led formats
              require a real upload or an explicit generated-person choice.
            </p>
          </div>
          {needsPerson ? (
            <div className="gap-spacing-2 flex flex-wrap">
              <button
                type="button"
                className={cn(
                  'button-compact',
                  personStrategy === 'use_uploaded'
                    ? 'button-glass-primary'
                    : 'button-glass-neutral',
                )}
                onClick={() => setPersonStrategy('use_uploaded')}
              >
                Use an uploaded person
              </button>
              <button
                type="button"
                className={cn(
                  'button-compact',
                  personStrategy === 'generate' ? 'button-glass-primary' : 'button-glass-neutral',
                )}
                onClick={() => setPersonStrategy('generate')}
              >
                Generate a person
              </button>
            </div>
          ) : null}
          <div className="gap-spacing-2 flex flex-wrap items-center">
            <button
              type="button"
              className="button-glass-neutral button-compact gap-spacing-2 inline-flex items-center"
              onClick={() => setPickerOpen(true)}
            >
              <Upload className="icon-sm" />
              Choose or upload images
            </button>
            {referenceAssets.map((asset) => (
              <span
                key={asset.id}
                className="badge-glass badge-glass-muted gap-spacing-1 inline-flex items-center"
              >
                {asset.name}
                <button
                  type="button"
                  aria-label={`Remove ${asset.name}`}
                  onClick={() =>
                    setReferenceAssets((current) =>
                      current.filter((candidate) => candidate.id !== asset.id),
                    )
                  }
                >
                  <X className="icon-xs" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="button-default button-glass-primary gap-spacing-2 inline-flex items-center self-start"
          disabled={!canSubmit || submitting}
          onClick={() => void startProduction()}
        >
          <Sparkles className="icon-sm" />
          {submitting
            ? 'Starting production…'
            : `Create ${quantity} static ad${quantity === 1 ? '' : 's'}`}
        </button>
      </section>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={() => undefined}
        onSelectAssets={(assets) => {
          addAssets(assets)
          setPickerOpen(false)
        }}
        onUploadedAsset={(asset) => addAssets([asset])}
        campaignId={campaignId}
        multiSelect
      />
    </>
  )
}
