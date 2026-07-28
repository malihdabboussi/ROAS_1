'use client'

import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { STATIC_AD_FORMATS, STATIC_AD_PRODUCTION_MODES } from '../config/static-ad-formats.config'
import { StaticAdFormatSelector } from './ads-research/StaticAdFormatSelector'
import {
  getStaticAdOutputCount,
  type StaticAdProductionKickoffFields,
  type StaticAdProductionMode,
} from './playbooks/static-ad-production'

const MAX_OUTPUTS = 10

export const EMPTY_STATIC_AD_FIELDS: StaticAdProductionKickoffFields = {
  productionMode: 'static_ad_book',
  selectedFormatIds: ['myth_vs_system'],
  formatVariationCounts: { myth_vs_system: 1 },
  quantity: 1,
  aspectRatio: '4:5',
  copyMode: 'write_for_me',
  exactCopy: '',
  exactCopyBySelection: {},
  offerContext: '',
  personStrategy: 'generate',
  referenceAssets: [],
}

export function isStaticAdProductionValid(fields: StaticAdProductionKickoffFields): boolean {
  const mode = fields.productionMode ?? 'static_ad_book'
  if (mode === 'static_ad_book' && fields.selectedFormatIds.length === 0) return false
  if (fields.copyMode === 'write_for_me') return Boolean(fields.offerContext.trim())

  return getExactCopyRows(fields).every((row) => Boolean(row.value.trim()))
}

export function StaticAdProductionFields({
  fields,
  onChange,
}: {
  fields: StaticAdProductionKickoffFields
  onChange: (fields: StaticAdProductionKickoffFields) => void
}) {
  const mode = fields.productionMode ?? 'static_ad_book'
  const finishedAds = getStaticAdOutputCount(fields)

  const setMode = (productionMode: StaticAdProductionMode) => {
    onChange({
      ...fields,
      productionMode,
      selectedFormatIds:
        productionMode === 'static_ad_book'
          ? fields.selectedFormatIds.length > 0
            ? fields.selectedFormatIds
            : ['myth_vs_system']
          : [],
      quantity: productionMode === 'static_ad_book' ? finishedAds : fields.quantity,
    })
  }

  const toggleFormat = (formatId: string) => {
    const selected = fields.selectedFormatIds.includes(formatId)
    if (!selected && finishedAds >= MAX_OUTPUTS) return
    const selectedFormatIds = selected
      ? fields.selectedFormatIds.filter((id) => id !== formatId)
      : [...fields.selectedFormatIds, formatId]
    const formatVariationCounts = { ...fields.formatVariationCounts }
    const exactCopyBySelection = { ...fields.exactCopyBySelection }
    if (selected) {
      delete formatVariationCounts[formatId]
      delete exactCopyBySelection[formatId]
    } else {
      formatVariationCounts[formatId] = 1
    }
    onChange({
      ...fields,
      selectedFormatIds,
      formatVariationCounts,
      exactCopyBySelection,
    })
  }

  const setFormatCount = (formatId: string, requested: number) => {
    const otherCount = fields.selectedFormatIds.reduce(
      (sum, id) =>
        id === formatId ? sum : sum + Math.max(1, fields.formatVariationCounts?.[id] ?? 1),
      0,
    )
    const count = Math.min(MAX_OUTPUTS - otherCount, Math.max(1, requested || 1))
    onChange({
      ...fields,
      formatVariationCounts: { ...fields.formatVariationCounts, [formatId]: count },
      exactCopyBySelection: resizeCopyRows(fields.exactCopyBySelection, formatId, count),
    })
  }

  return (
    <div className="space-y-spacing-4">
      <div>
        <p className="body-3 text-foreground font-medium">Production type</p>
        <div className="mt-spacing-2 gap-spacing-2 grid sm:grid-cols-3">
          {STATIC_AD_PRODUCTION_MODES.map((option) => {
            const selected = mode === option.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                className={cn(
                  'p-spacing-3 gap-spacing-2 rounded-spacing-2 flex items-start border text-left',
                  selected
                    ? 'card-glass-blue text-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-hover-subtle border-transparent',
                )}
                onClick={() => setMode(option.id)}
              >
                {selected ? (
                  <Check className="icon-sm text-primary mt-spacing-0-5 shrink-0" />
                ) : (
                  <Circle className="icon-sm text-muted-foreground mt-spacing-0-5 shrink-0" />
                )}
                <span>
                  <span className="body-3 text-foreground block font-medium">{option.name}</span>
                  <span className="body-4 text-muted-foreground block">{option.description}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {mode === 'static_ad_book' ? (
        <>
          <div>
            <p className="body-3 text-foreground font-medium">Ad formats</p>
            <p className="body-4 text-muted-foreground">
              Select one or more. Each starts with one variation.
            </p>
          </div>
          <StaticAdFormatSelector
            selectedFormatIds={fields.selectedFormatIds}
            onToggle={toggleFormat}
          />
          {fields.selectedFormatIds.length > 0 ? (
            <div className="gap-spacing-3 grid sm:grid-cols-2">
              {fields.selectedFormatIds.map((formatId) => {
                const format = STATIC_AD_FORMATS.find((item) => item.id === formatId)
                return (
                  <NumberField
                    key={formatId}
                    label={`${format?.name ?? formatId} variations`}
                    value={fields.formatVariationCounts?.[formatId] ?? 1}
                    onChange={(value) => setFormatCount(formatId, value)}
                  />
                )
              })}
            </div>
          ) : null}
          <p className="body-3 text-foreground">
            Finished ads: <span className="font-semibold">{finishedAds}</span>
          </p>
        </>
      ) : (
        <NumberField
          label="Finished ads"
          value={fields.quantity}
          onChange={(quantity) =>
            onChange({
              ...fields,
              quantity: Math.min(MAX_OUTPUTS, Math.max(1, quantity || 1)),
              exactCopyBySelection: resizeCopyRows(
                fields.exactCopyBySelection,
                mode,
                Math.min(MAX_OUTPUTS, Math.max(1, quantity || 1)),
              ),
            })
          }
        />
      )}

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
          { value: 'write_for_me', label: 'Write for me' },
          { value: 'use_my_copy', label: 'Use my exact copy' },
        ]}
        selected={fields.copyMode}
        onSelect={(copyMode) =>
          onChange({
            ...fields,
            copyMode: copyMode as StaticAdProductionKickoffFields['copyMode'],
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
        <div className="space-y-spacing-3">
          <p className="body-4 text-muted-foreground">Add the exact copy for every finished ad.</p>
          {getExactCopyRows(fields).map((row) => (
            <TextArea
              key={`${row.selectionKey}-${row.index}`}
              label={row.label}
              value={row.value}
              onChange={(value) =>
                onChange({
                  ...fields,
                  exactCopyBySelection: setCopyValue(
                    fields.exactCopyBySelection,
                    row.selectionKey,
                    row.index,
                    value,
                  ),
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function getExactCopyRows(fields: StaticAdProductionKickoffFields) {
  const mode = fields.productionMode ?? 'static_ad_book'
  const selections =
    mode === 'static_ad_book'
      ? fields.selectedFormatIds.map((formatId) => ({
          key: formatId,
          label: STATIC_AD_FORMATS.find((format) => format.id === formatId)?.name ?? formatId,
          count: Math.max(1, fields.formatVariationCounts?.[formatId] ?? 1),
        }))
      : [{ key: mode, label: 'Ad', count: Math.min(MAX_OUTPUTS, Math.max(1, fields.quantity)) }]

  return selections.flatMap((selection) =>
    Array.from({ length: selection.count }, (_, index) => ({
      selectionKey: selection.key,
      index,
      label: `${selection.label} — variation ${index + 1} exact copy`,
      value: fields.exactCopyBySelection?.[selection.key]?.[index] ?? '',
    })),
  )
}

function resizeCopyRows(current: Record<string, string[]> | undefined, key: string, count: number) {
  return {
    ...current,
    [key]: Array.from({ length: count }, (_, index) => current?.[key]?.[index] ?? ''),
  }
}

function setCopyValue(
  current: Record<string, string[]> | undefined,
  key: string,
  index: number,
  value: string,
) {
  const next = [...(current?.[key] ?? [])]
  next[index] = value
  return { ...current, [key]: next }
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="space-y-spacing-2 block">
      <span className="body-3 text-foreground font-medium">{label}</span>
      <input
        aria-label={label}
        type="number"
        min={1}
        max={MAX_OUTPUTS}
        className="input-glass body-3 h-spacing-9 w-full"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
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
        aria-label={label}
        className="input-glass body-3 text-foreground h-spacing-24 w-full resize-y"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
