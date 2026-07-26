'use client'

import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import {
  IG_ORGANIC_APPROVED_EMOJIS,
  IG_ORGANIC_VIDEO_SCENES,
} from '../config/ig-organic-video-scenes.config'
import { STATIC_AD_FORMATS } from '../config/static-ad-formats.config'
import type { IgOrganicVideoKickoffFields } from './playbooks/ig-organic-video'
import type { StaticAdProductionKickoffFields } from './playbooks/static-ad-production'

export const EMPTY_STATIC_AD_FIELDS: StaticAdProductionKickoffFields = {
  selectedFormatIds: ['myth_vs_system'],
  quantity: 1,
  aspectRatio: '4:5',
  copyMode: 'use_my_copy',
  exactCopy: '',
  offerContext: '',
  personStrategy: 'generate',
  referenceAssets: [],
}

export const EMPTY_IG_VIDEO_FIELDS: IgOrganicVideoKickoffFields = {
  copyMode: 'use_my_copy',
  sourceStrategy: 'reuse_when_available',
  selectedSceneIds: ['golden-hour-infinity-pool', 'hillside-pool-terrace'],
  pillLine: 'Free Training',
  headline: '',
  highlightPhrase: '',
  ctaLine: 'Tap Below For More Info',
  emoji: '👇',
  offerContext: '',
}

export function isAdProductionPlaybookValid(
  selected: 'static' | 'video',
  staticFields: StaticAdProductionKickoffFields,
  videoFields: IgOrganicVideoKickoffFields,
) {
  if (selected === 'static') {
    const hasCopy =
      staticFields.copyMode === 'use_my_copy'
        ? Boolean(staticFields.exactCopy?.trim())
        : Boolean(staticFields.offerContext.trim())
    return staticFields.selectedFormatIds.length > 0 && hasCopy
  }
  const hasCopy =
    videoFields.copyMode === 'use_my_copy'
      ? Boolean(videoFields.headline.trim())
      : Boolean(videoFields.offerContext.trim())
  return videoFields.selectedSceneIds.length > 0 && hasCopy
}

export function StartAdProductionPlaybookFields({
  selected,
  staticFields,
  videoFields,
  onStaticChange,
  onVideoChange,
}: {
  selected: 'static' | 'video'
  staticFields: StaticAdProductionKickoffFields
  videoFields: IgOrganicVideoKickoffFields
  onStaticChange: (fields: StaticAdProductionKickoffFields) => void
  onVideoChange: (fields: IgOrganicVideoKickoffFields) => void
}) {
  return selected === 'static' ? (
    <StaticFields fields={staticFields} onChange={onStaticChange} />
  ) : (
    <VideoFields fields={videoFields} onChange={onVideoChange} />
  )
}

function StaticFields({
  fields,
  onChange,
}: {
  fields: StaticAdProductionKickoffFields
  onChange: (fields: StaticAdProductionKickoffFields) => void
}) {
  const copyValue = fields.copyMode === 'use_my_copy' ? fields.exactCopy || '' : fields.offerContext
  return (
    <div className="space-y-spacing-4">
      <div className="gap-spacing-3 grid sm:grid-cols-3">
        <label className="space-y-spacing-2 block sm:col-span-2">
          <span className="body-3 text-foreground font-medium">Format</span>
          <select
            className="input-glass body-3 h-spacing-9 w-full"
            value={fields.selectedFormatIds[0]}
            onChange={(event) => onChange({ ...fields, selectedFormatIds: [event.target.value] })}
          >
            {STATIC_AD_FORMATS.map((format) => (
              <option key={format.id} value={format.id}>
                {format.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-spacing-2 block">
          <span className="body-3 text-foreground font-medium">Finished ads</span>
          <input
            aria-label="Finished ads"
            type="number"
            min={1}
            max={10}
            className="input-glass body-3 h-spacing-9 w-full"
            value={fields.quantity}
            onChange={(event) =>
              onChange({
                ...fields,
                quantity: Math.min(10, Math.max(1, Number(event.target.value) || 1)),
              })
            }
          />
        </label>
      </div>
      <ToggleRow
        label="Size"
        options={[
          { value: '4:5', label: '4:5 Feed' },
          { value: '9:16', label: '9:16 Story' },
        ]}
        selected={fields.aspectRatio}
        onSelect={(aspectRatio) =>
          onChange({ ...fields, aspectRatio: aspectRatio as '4:5' | '9:16' })
        }
      />
      <ToggleRow
        label="Copy source"
        options={[
          { value: 'use_my_copy', label: 'Use exact copy' },
          { value: 'write_for_me', label: 'Write for me' },
        ]}
        selected={fields.copyMode}
        onSelect={(copyMode) =>
          onChange({
            ...fields,
            copyMode: copyMode as StaticAdProductionKickoffFields['copyMode'],
          })
        }
      />
      <TextArea
        label={fields.copyMode === 'use_my_copy' ? 'Exact copy' : 'Offer and audience context'}
        value={copyValue}
        onChange={(value) =>
          onChange(
            fields.copyMode === 'use_my_copy'
              ? { ...fields, exactCopy: value }
              : { ...fields, offerContext: value },
          )
        }
      />
    </div>
  )
}

function VideoFields({
  fields,
  onChange,
}: {
  fields: IgOrganicVideoKickoffFields
  onChange: (fields: IgOrganicVideoKickoffFields) => void
}) {
  const toggleScene = (sceneId: string) => {
    const selectedSceneIds = fields.selectedSceneIds.includes(sceneId)
      ? fields.selectedSceneIds.filter((id) => id !== sceneId)
      : [...fields.selectedSceneIds, sceneId]
    onChange({ ...fields, selectedSceneIds })
  }
  return (
    <div className="space-y-spacing-4">
      <div>
        <p className="body-3 text-foreground font-medium">Scenes</p>
        <p className="body-4 text-muted-foreground">
          Each selected scene produces one finished video.
        </p>
        <div className="border-border mt-spacing-2 p-spacing-2 gap-spacing-1 rounded-spacing-2 grid border sm:grid-cols-2">
          {IG_ORGANIC_VIDEO_SCENES.map((scene) => {
            const active = fields.selectedSceneIds.includes(scene.id)
            return (
              <button
                key={scene.id}
                type="button"
                aria-pressed={active}
                className={cn(
                  'body-4 text-foreground px-spacing-2 py-spacing-1 gap-spacing-2 rounded-spacing-1 flex items-center text-left',
                  active ? 'nav-glass-selected-purple' : 'hover:bg-hover-subtle',
                )}
                onClick={() => toggleScene(scene.id)}
              >
                {active ? (
                  <Check className="icon-xs text-primary shrink-0" />
                ) : (
                  <Circle className="icon-xs text-muted-foreground shrink-0" />
                )}
                <span className="truncate">{scene.name}</span>
              </button>
            )
          })}
        </div>
      </div>
      <ToggleRow
        label="Footage"
        options={[
          { value: 'reuse_when_available', label: 'Reuse presets first' },
          { value: 'generate_new', label: 'Generate all new' },
        ]}
        selected={fields.sourceStrategy}
        onSelect={(sourceStrategy) =>
          onChange({
            ...fields,
            sourceStrategy: sourceStrategy as IgOrganicVideoKickoffFields['sourceStrategy'],
          })
        }
      />
      <ToggleRow
        label="Copy source"
        options={[
          { value: 'use_my_copy', label: 'Use exact copy' },
          { value: 'write_for_me', label: 'Write for me' },
        ]}
        selected={fields.copyMode}
        onSelect={(copyMode) =>
          onChange({
            ...fields,
            copyMode: copyMode as IgOrganicVideoKickoffFields['copyMode'],
          })
        }
      />
      {fields.copyMode === 'write_for_me' ? (
        <TextArea
          label="Offer and audience context"
          value={fields.offerContext}
          onChange={(offerContext) => onChange({ ...fields, offerContext })}
        />
      ) : (
        <div className="gap-spacing-3 grid sm:grid-cols-2">
          <InputField
            label="Blue pill"
            value={fields.pillLine}
            onChange={(pillLine) => onChange({ ...fields, pillLine })}
          />
          <InputField
            label="Headline"
            value={fields.headline}
            onChange={(headline) => onChange({ ...fields, headline })}
          />
          <InputField
            label="Red highlight phrase"
            value={fields.highlightPhrase}
            onChange={(highlightPhrase) => onChange({ ...fields, highlightPhrase })}
          />
          <InputField
            label="CTA"
            value={fields.ctaLine}
            onChange={(ctaLine) => onChange({ ...fields, ctaLine })}
          />
          <label className="space-y-spacing-2 block">
            <span className="body-3 text-foreground font-medium">Apple-style emoji</span>
            <select
              className="input-glass body-3 h-spacing-9 w-full"
              value={fields.emoji}
              onChange={(event) => onChange({ ...fields, emoji: event.target.value })}
            >
              {IG_ORGANIC_APPROVED_EMOJIS.map((emoji) => (
                <option key={emoji} value={emoji}>
                  {emoji}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  selected: string
  onSelect: (value: string) => void
}) {
  return (
    <div>
      <p className="body-3 text-foreground font-medium">{label}</p>
      <div className="gap-spacing-2 mt-spacing-2 flex flex-wrap">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              'button-compact',
              selected === option.value ? 'button-glass-primary' : 'button-glass-neutral',
            )}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-spacing-2 block">
      <span className="body-3 text-foreground font-medium">{label}</span>
      <input
        className="input-glass body-3 h-spacing-9 w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-spacing-2 block">
      <span className="body-3 text-foreground font-medium">{label}</span>
      <textarea
        className="input-glass body-3 text-foreground h-spacing-24 w-full resize-y"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
