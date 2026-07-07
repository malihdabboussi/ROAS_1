import { User } from 'lucide-react'
import {
  DEMO_BOTTOM_SORT,
  DEMO_TOP_SORT,
  formatDemoKey as formatKey,
  isSimpleDemoValue as isSimpleValue,
  normalizeDemoKey,
  partitionDemographics,
  sortDemoEntries,
} from '../../utils/avatar-demographics-hero.layout'
import type { JsonPath } from './avatar-preview-persona-types'
import { FieldSectionLabel, LabeledBlock, LabeledStat, PersonaValue } from './AvatarPreviewPersonaValue'

function resolveDemographicSlot(
  obj: Record<string, unknown>,
  canonicalKey: string,
): { storageKey: string; value: unknown; kind: 'simple' | 'complex' } {
  for (const [k, v] of Object.entries(obj)) {
    if (normalizeDemoKey(k) !== canonicalKey) continue
    if (v != null && !isSimpleValue(v)) {
      return { storageKey: k, value: v, kind: 'complex' }
    }
    if (v == null || v === '' || (typeof v === 'string' && v.trim() === '')) {
      return { storageKey: k, value: '', kind: 'simple' }
    }
    return { storageKey: k, value: v, kind: 'simple' }
  }
  return { storageKey: canonicalKey, value: '', kind: 'simple' }
}

function buildAllSimpleSlotsForEdit(
  demographicsObj: Record<string, unknown>,
  sortOrder: string[],
): [string, unknown][] {
  const out: [string, unknown][] = []
  for (const canonicalKey of sortOrder) {
    const { storageKey, value, kind } = resolveDemographicSlot(demographicsObj, canonicalKey)
    if (kind === 'complex') continue
    out.push([storageKey, value])
  }
  return out
}

function DemographicSimpleGrid({
  entries,
  editMode,
  pathPrefix,
  onPersonaChange,
}: {
  entries: [string, unknown][]
  editMode: boolean
  pathPrefix: JsonPath
  onPersonaChange: (path: JsonPath, value: unknown) => void
}) {
  if (entries.length === 0) return null
  if (!editMode) {
    return (
      <div className="gap-x-spacing-6 gap-y-spacing-4 grid grid-cols-1 sm:grid-cols-2">
        {entries.map(([k, v]) => (
          <LabeledStat key={k} label={formatKey(k)} value={String(v).replace(/\u2014/g, '-')} />
        ))}
      </div>
    )
  }
  return (
    <div className="gap-x-spacing-6 gap-y-spacing-4 grid grid-cols-1 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k}>
          <FieldSectionLabel>{formatKey(k)}</FieldSectionLabel>
          <textarea
            className="body-2 w-full h-spacing-14 whitespace-pre-wrap rounded-spacing-2 border border-border bg-background p-spacing-2 text-foreground outline-none"
            value={String(v).replace(/\u2014/g, '-')}
            onChange={(e) => onPersonaChange([...pathPrefix, k], e.target.value)}
            aria-label={formatKey(k)}
          />
        </div>
      ))}
    </div>
  )
}

function AvatarPortrait({ avatarImage }: { avatarImage?: string }) {
  return (
    <div className="flex shrink-0 justify-center sm:justify-start">
      {avatarImage ? (
        <img
          src={avatarImage}
          alt="Avatar portrait"
          className="rounded-spacing-3 h-spacing-32 aspect-square object-cover"
        />
      ) : (
        <div className="rounded-spacing-3 h-spacing-32 flex aspect-square items-center justify-center bg-secondary">
          <User className="icon-lg text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

export function AvatarPreviewHeroCard({
  pd,
  editMode,
  onPersonaChange,
}: {
  pd: Record<string, unknown>
  editMode: boolean
  onPersonaChange: (path: JsonPath, value: unknown) => void
}) {
  const demoRaw = pd.demographics
  const demographicsObj =
    demoRaw && typeof demoRaw === 'object' && !Array.isArray(demoRaw)
      ? (demoRaw as Record<string, unknown>)
      : undefined
  const demographicsArr = Array.isArray(demoRaw) ? demoRaw : null
  const avatarImage = typeof pd.avatar_image === 'string' ? pd.avatar_image : undefined

  if (!demographicsObj && !demographicsArr && !avatarImage && !editMode) return null

  if (demographicsArr) {
    return (
      <div className="card-glass rounded-spacing-3">
        <div className="space-y-spacing-6 p-spacing-4 sm:p-spacing-5 md:p-spacing-6">
          <div className="gap-spacing-5 sm:gap-spacing-6 flex flex-col items-center sm:flex-row sm:items-start">
            <AvatarPortrait avatarImage={avatarImage} />
          </div>
          <div>
            <FieldSectionLabel>Demographics</FieldSectionLabel>
            <div className="mt-spacing-2">
              <PersonaValue
                value={demographicsArr}
                path={['demographics']}
                editMode={editMode}
                onPersonaChange={onPersonaChange}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const demoDict: Record<string, unknown> | null = demographicsObj ?? (editMode ? {} : null)

  if (demoDict === null) {
    return (
      <div className="card-glass rounded-spacing-3">
        <div className="p-spacing-4 sm:p-spacing-5 md:p-spacing-6 flex justify-center">
          <AvatarPortrait avatarImage={avatarImage} />
        </div>
      </div>
    )
  }

  const { top, bottom, other } = partitionDemographics(demoDict)
  const topSimple = sortDemoEntries(top.filter(([, v]) => isSimpleValue(v)), DEMO_TOP_SORT)
  const topComplex = sortDemoEntries(top.filter(([, v]) => !isSimpleValue(v)), DEMO_TOP_SORT)
  const bottomSimple = sortDemoEntries(bottom.filter(([, v]) => isSimpleValue(v)), DEMO_BOTTOM_SORT)
  const bottomComplex = sortDemoEntries(bottom.filter(([, v]) => !isSimpleValue(v)), DEMO_BOTTOM_SORT)
  const otherSimple = sortDemoEntries(other.filter(([, v]) => isSimpleValue(v)), [])
  const otherComplex = sortDemoEntries(other.filter(([, v]) => !isSimpleValue(v)), [])

  const hasLowerBand =
    topComplex.length > 0 ||
    bottomSimple.length > 0 ||
    bottomComplex.length > 0 ||
    otherSimple.length > 0 ||
    otherComplex.length > 0

  const topSimpleForGrid = editMode ? buildAllSimpleSlotsForEdit(demoDict, DEMO_TOP_SORT) : topSimple
  const bottomSimpleForGrid = editMode
    ? buildAllSimpleSlotsForEdit(demoDict, DEMO_BOTTOM_SORT)
    : bottomSimple

  return (
    <div className="card-glass rounded-spacing-3">
      <div className="p-spacing-4 sm:p-spacing-5 md:p-spacing-6">
        <div className="gap-spacing-5 sm:gap-spacing-6 flex flex-col sm:flex-row sm:items-start">
          <AvatarPortrait avatarImage={avatarImage} />
          <div className="min-w-0 flex-1">
            <DemographicSimpleGrid
              entries={topSimpleForGrid}
              editMode={editMode}
              pathPrefix={['demographics']}
              onPersonaChange={onPersonaChange}
            />
          </div>
        </div>

        {hasLowerBand || editMode ? (
          <div className="mt-spacing-6 space-y-spacing-6 pt-spacing-6 border-border border-t">
            {topComplex.map(([k, v]) => (
              <LabeledBlock key={k} label={formatKey(k)}>
                <PersonaValue
                  value={v}
                  path={['demographics', k]}
                  editMode={editMode}
                  onPersonaChange={onPersonaChange}
                />
              </LabeledBlock>
            ))}
            <DemographicSimpleGrid
              entries={bottomSimpleForGrid}
              editMode={editMode}
              pathPrefix={['demographics']}
              onPersonaChange={onPersonaChange}
            />
            {bottomComplex.map(([k, v]) => (
              <LabeledBlock key={k} label={formatKey(k)}>
                <PersonaValue
                  value={v}
                  path={['demographics', k]}
                  editMode={editMode}
                  onPersonaChange={onPersonaChange}
                />
              </LabeledBlock>
            ))}
            <DemographicSimpleGrid
              entries={otherSimple}
              editMode={editMode}
              pathPrefix={['demographics']}
              onPersonaChange={onPersonaChange}
            />
            {otherComplex.map(([k, v]) => (
              <LabeledBlock key={k} label={formatKey(k)}>
                <PersonaValue value={v} path={['demographics', k]} editMode={editMode} onPersonaChange={onPersonaChange} />
              </LabeledBlock>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
