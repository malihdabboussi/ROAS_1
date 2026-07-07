import type { Dispatch, RefObject, SetStateAction } from 'react'
import { Loader2 } from 'lucide-react'
import {
  FieldStatus,
} from './ad-set-settings-panel-primitives'
import { AdSetInterestTargetingField } from './AdSetInterestTargetingField'
import type { FieldState } from './useAdSetSettingsFieldSaves'
import type { InterestSearchResult } from './useAdSetSettingsInterestSearch'

type MetaAudience = {
  id: string
  name: string
  subtype?: string
  approximate_count?: number
}

interface AdSetAudienceTargetingFieldProps {
  appearance: 'studio' | 'spaces'
  advantagePlusOn: boolean
  targeting: Record<string, unknown>
  fieldStates: Record<string, FieldState>
  inputClassName: string
  adAccountId: string | null
  metaAudiences: MetaAudience[]
  audiencesLoading: boolean
  includeAudienceSearch: string
  setIncludeAudienceSearch: Dispatch<SetStateAction<string>>
  excludeAudienceSearch: string
  setExcludeAudienceSearch: Dispatch<SetStateAction<string>>
  includeExpanded: boolean
  setIncludeExpanded: Dispatch<SetStateAction<boolean>>
  excludeExpanded: boolean
  setExcludeExpanded: Dispatch<SetStateAction<boolean>>
  interestSearch: string
  interestResults: InterestSearchResult[]
  interestSearchLoading: boolean
  interestInputRef: RefObject<HTMLInputElement | null>
  interestDropdownRef: RefObject<HTMLDivElement | null>
  interestDropdownOpen: boolean
  setInterestDropdownOpen: Dispatch<SetStateAction<boolean>>
  interestPos: { top: number; left: number; width: number }
  setInterestSearch: Dispatch<SetStateAction<string>>
  setInterestResults: Dispatch<SetStateAction<InterestSearchResult[]>>
  onInterestSearch: (query: string) => void
  onTargetingChange: (targeting: Record<string, unknown>, displayKey: string) => void
  formatNumber: (value: number) => string
}

export function AdSetAudienceTargetingField({
  appearance,
  advantagePlusOn,
  targeting,
  fieldStates,
  inputClassName,
  adAccountId,
  metaAudiences,
  audiencesLoading,
  includeAudienceSearch,
  setIncludeAudienceSearch,
  excludeAudienceSearch,
  setExcludeAudienceSearch,
  includeExpanded,
  setIncludeExpanded,
  excludeExpanded,
  setExcludeExpanded,
  interestSearch,
  interestResults,
  interestSearchLoading,
  interestInputRef,
  interestDropdownRef,
  interestDropdownOpen,
  setInterestDropdownOpen,
  interestPos,
  setInterestSearch,
  setInterestResults,
  onInterestSearch,
  onTargetingChange,
  formatNumber,
}: AdSetAudienceTargetingFieldProps) {
  const included = (targeting.custom_audiences ?? []) as Array<{ id: string; name?: string }>
  const excluded = (targeting.excluded_custom_audiences ?? []) as Array<{
    id: string
    name?: string
  }>
  const interests = (targeting.interests ?? []) as Array<{ id: string; name: string }>
  const allUsedIds = new Set([...included.map((a) => a.id), ...excluded.map((a) => a.id)])
  const existingInterestIds = new Set(interests.map((interest) => interest.id))
  const filteredInterestResults = interestResults.filter(
    (result) => !existingInterestIds.has(result.id),
  )
  const audienceFieldState =
    fieldStates.targeting_audiences ?? fieldStates.targeting_interests

  const resolveAudienceName = (id: string, name?: string) =>
    name || metaAudiences.find((audience) => audience.id === id)?.name || id

  const handleTurnOffAdvantage = () => {
    const targetingAutomation = (targeting.targeting_automation ?? {}) as Record<string, unknown>
    onTargetingChange(
      {
        ...targeting,
        targeting_automation: { ...targetingAutomation, advantage_audience: 0 },
      },
      'targeting_advantage',
    )
  }

  const handleRemoveAudience = (audienceId: string, mode: 'include' | 'exclude') => {
    const field = mode === 'include' ? 'custom_audiences' : 'excluded_custom_audiences'
    const current = ((targeting[field] ?? []) as Array<{ id: string; name?: string }>).filter(
      (audience) => audience.id !== audienceId,
    )
    onTargetingChange({ ...targeting, [field]: current }, 'targeting_audiences')
  }

  const handleAddAudience = (
    audience: { id: string; name: string },
    mode: 'include' | 'exclude',
  ) => {
    const field = mode === 'include' ? 'custom_audiences' : 'excluded_custom_audiences'
    const current = (targeting[field] ?? []) as Array<{ id: string; name?: string }>
    if (current.some((item) => item.id === audience.id)) return
    onTargetingChange(
      { ...targeting, [field]: [...current, { id: audience.id, name: audience.name }] },
      'targeting_audiences',
    )
    if (mode === 'include') setIncludeAudienceSearch('')
    else setExcludeAudienceSearch('')
  }

  const handleAddInterest = (interest: { id: string; name: string }) => {
    if (interests.some((item) => item.id === interest.id)) return
    onTargetingChange(
      { ...targeting, interests: [...interests, { id: interest.id, name: interest.name }] },
      'targeting_interests',
    )
    setInterestSearch('')
    setInterestResults([])
    setInterestDropdownOpen(false)
  }

  const handleRemoveInterest = (interestId: string) => {
    onTargetingChange(
      {
        ...targeting,
        interests: interests.filter((interest) => interest.id !== interestId),
      },
      'targeting_interests',
    )
  }

  const renderAudienceList = (mode: 'include' | 'exclude') => {
    const search = mode === 'include' ? includeAudienceSearch : excludeAudienceSearch
    const setSearch = mode === 'include' ? setIncludeAudienceSearch : setExcludeAudienceSearch
    const filteredAudiences = metaAudiences
      .filter((audience) => !allUsedIds.has(audience.id))
      .filter(
        (audience) =>
          !search || audience.name.toLowerCase().includes(search.toLowerCase()),
      )

    return (
      <div className="space-y-2 pl-2">
        <input
          autoFocus
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={inputClassName}
          placeholder="Search audiences..."
        />
        {audiencesLoading ? (
          <div className="flex items-center gap-2 py-2">
            <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
            <span className="typo-caption text-muted-foreground">Loading audiences...</span>
          </div>
        ) : !adAccountId ? (
          <p className="typo-caption text-muted-foreground">
            Connect a Meta ad account first (in campaign settings)
          </p>
        ) : filteredAudiences.length === 0 ? (
          <p className="typo-caption text-muted-foreground">
            {search ? 'No matching audiences' : 'No audiences available'}
          </p>
        ) : (
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {filteredAudiences.map((audience) => (
              <button
                key={audience.id}
                type="button"
                onClick={() =>
                  handleAddAudience({ id: audience.id, name: audience.name }, mode)
                }
                className="body-3 hover:bg-hover-subtle flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-foreground block truncate font-medium">
                    {audience.name}
                  </span>
                  <span className="typo-caption text-muted-foreground">
                    {audience.subtype ?? 'Custom'}
                    {audience.approximate_count != null
                      ? ` · ~${formatNumber(audience.approximate_count)}`
                      : ''}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <label className="body-3 text-foreground font-medium">Audiences</label>
          {audienceFieldState ? <FieldStatus state={audienceFieldState} /> : null}
        </div>
      </div>
      {advantagePlusOn ? (
        <div className="bg-secondary rounded-lg p-3">
          <p className="body-3 text-foreground font-medium">AI is managing your audience</p>
          <p className="typo-caption text-muted-foreground mt-1">
            AI will automatically find the best audience for your ads. Custom audience targeting is
            not recommended when AI Recommended is enabled.
          </p>
          <button
            type="button"
            className="typo-caption text-muted-foreground hover:text-foreground mt-2 underline underline-offset-2"
            onClick={handleTurnOffAdvantage}
          >
            Turn off AI Recommended to customize audience
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="typo-caption text-muted-foreground">
            Target or exclude specific Meta audiences. Leave empty to let Meta optimize broadly.
          </p>

          <div className="space-y-2">
            <div className="space-y-1">
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  includeExpanded ? 'chip-glass-blue' : 'button-glass-accent'
                }`}
                onClick={() => {
                  setIncludeExpanded((isExpanded) => !isExpanded)
                  setIncludeAudienceSearch('')
                }}
              >
                <span>+ Include Audience</span>
                {included.length > 0 && (
                  <span className="typo-caption opacity-70">{included.length} selected</span>
                )}
              </button>

              {includeExpanded && (
                <div className="space-y-2 py-1">
                  {included.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-2">
                      {included.map((audience) => (
                        <span
                          key={audience.id}
                          className="chip-glass-blue flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
                        >
                          {resolveAudienceName(audience.id, audience.name)}
                          <button
                            type="button"
                            onClick={() => handleRemoveAudience(audience.id, 'include')}
                            className="ml-0.5 opacity-60 hover:opacity-100"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {renderAudienceList('include')}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  excludeExpanded ? 'bg-destructive/10 text-destructive' : 'button-glass'
                }`}
                onClick={() => {
                  setExcludeExpanded((isExpanded) => !isExpanded)
                  setExcludeAudienceSearch('')
                }}
              >
                <span>− Exclude Audience</span>
                {excluded.length > 0 && (
                  <span className="typo-caption opacity-70">{excluded.length} selected</span>
                )}
              </button>

              {excludeExpanded && (
                <div className="space-y-2 py-1">
                  {excluded.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-2">
                      {excluded.map((audience) => (
                        <span
                          key={audience.id}
                          className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"
                        >
                          {resolveAudienceName(audience.id, audience.name)}
                          <button
                            type="button"
                            onClick={() => handleRemoveAudience(audience.id, 'exclude')}
                            className="ml-0.5 opacity-60 hover:opacity-100"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {renderAudienceList('exclude')}
                </div>
              )}
            </div>
          </div>

          <AdSetInterestTargetingField
            appearance={appearance}
            inputClassName={inputClassName}
            interests={interests}
            filteredInterestResults={filteredInterestResults}
            interestSearch={interestSearch}
            interestSearchLoading={interestSearchLoading}
            interestInputRef={interestInputRef}
            interestDropdownRef={interestDropdownRef}
            interestDropdownOpen={interestDropdownOpen}
            setInterestDropdownOpen={setInterestDropdownOpen}
            interestPos={interestPos}
            onInterestSearch={onInterestSearch}
            onAddInterest={handleAddInterest}
            onRemoveInterest={handleRemoveInterest}
            formatNumber={formatNumber}
          />
        </div>
      )}
    </div>
  )
}
