'use client'

import { useMemo, useState } from 'react'
import { Check, Circle } from 'lucide-react'
import { SettingsSelect } from '@/components/ui/forms/SettingsSelect'
import { cn } from '@/lib/utils/cn'
import {
  filterIgOrganicScenes,
  IG_ORGANIC_APPROVED_EMOJIS,
  IG_ORGANIC_INDUSTRY_PACKS,
  type IgOrganicFootageFit,
  type IgOrganicIndustryPack,
} from '../config/ig-organic-video-scenes.config'
import type { IgOrganicVideoKickoffFields } from './playbooks/ig-organic-video'
import type { StaticAdProductionKickoffFields } from './playbooks/static-ad-production'
import { isStaticAdProductionValid, StaticAdProductionFields } from './StaticAdProductionFields'

export { EMPTY_STATIC_AD_FIELDS } from './StaticAdProductionFields'

export const EMPTY_IG_VIDEO_FIELDS: IgOrganicVideoKickoffFields = {
  copyMode: 'write_for_me',
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
    return isStaticAdProductionValid(staticFields)
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
    <StaticAdProductionFields fields={staticFields} onChange={onStaticChange} />
  ) : (
    <VideoFields fields={videoFields} onChange={onVideoChange} />
  )
}

function VideoFields({
  fields,
  onChange,
}: {
  fields: IgOrganicVideoKickoffFields
  onChange: (fields: IgOrganicVideoKickoffFields) => void
}) {
  const [footageFit, setFootageFit] = useState<IgOrganicFootageFit | 'all'>(
    fields.footageFit ?? 'all',
  )
  const [industryPack, setIndustryPack] = useState<IgOrganicIndustryPack | 'all'>(
    (fields.industryPack as IgOrganicIndustryPack | 'all' | undefined) ?? 'all',
  )
  const visibleScenes = useMemo(
    () =>
      filterIgOrganicScenes({
        fit: footageFit,
        industryPack: footageFit === 'industry_adjacent' ? industryPack : 'all',
      }),
    [footageFit, industryPack],
  )
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
        <div className="mt-spacing-2 gap-spacing-2 flex flex-wrap">
          {(
            [
              { value: 'all', label: 'All fits' },
              { value: 'lifestyle', label: 'Lifestyle' },
              { value: 'industry_adjacent', label: 'Industry-adjacent' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'button-compact',
                footageFit === option.value ? 'button-glass-primary' : 'button-glass-neutral',
              )}
              onClick={() => {
                setFootageFit(option.value)
                if (option.value !== 'industry_adjacent') setIndustryPack('all')
                onChange({
                  ...fields,
                  footageFit: option.value,
                  industryPack: option.value === 'industry_adjacent' ? industryPack : undefined,
                })
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {footageFit === 'industry_adjacent' ? (
          <div className="mt-spacing-2 gap-spacing-2 flex flex-wrap">
            <button
              type="button"
              className={cn(
                'button-compact',
                industryPack === 'all' ? 'button-glass-primary' : 'button-glass-neutral',
              )}
              onClick={() => {
                setIndustryPack('all')
                onChange({ ...fields, footageFit, industryPack: undefined })
              }}
            >
              All industries
            </button>
            {IG_ORGANIC_INDUSTRY_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className={cn(
                  'button-compact',
                  industryPack === pack.id ? 'button-glass-primary' : 'button-glass-neutral',
                )}
                onClick={() => {
                  setIndustryPack(pack.id)
                  onChange({ ...fields, footageFit, industryPack: pack.id })
                }}
              >
                {pack.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="border-border mt-spacing-2 p-spacing-2 gap-spacing-1 rounded-spacing-2 grid border sm:grid-cols-2">
          {visibleScenes.map((scene) => {
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
            <SettingsSelect
              value={fields.emoji}
              ariaLabel="Apple-style emoji"
              options={IG_ORGANIC_APPROVED_EMOJIS.map((emoji) => ({
                value: emoji,
                label: emoji,
              }))}
              onChange={(emoji) => onChange({ ...fields, emoji })}
            />
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
