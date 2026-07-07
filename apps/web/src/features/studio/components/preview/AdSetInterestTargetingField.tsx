import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { SettingsField } from './ad-set-settings-panel-primitives'
import type { InterestSearchResult } from './useAdSetSettingsInterestSearch'

interface AdSetInterestTargetingFieldProps {
  appearance: 'studio' | 'spaces'
  inputClassName: string
  interests: Array<{ id: string; name: string }>
  filteredInterestResults: InterestSearchResult[]
  interestSearch: string
  interestSearchLoading: boolean
  interestInputRef: RefObject<HTMLInputElement | null>
  interestDropdownRef: RefObject<HTMLDivElement | null>
  interestDropdownOpen: boolean
  setInterestDropdownOpen: (open: boolean) => void
  interestPos: { top: number; left: number; width: number }
  onInterestSearch: (query: string) => void
  onAddInterest: (interest: { id: string; name: string }) => void
  onRemoveInterest: (interestId: string) => void
  formatNumber: (value: number) => string
}

export function AdSetInterestTargetingField({
  appearance,
  inputClassName,
  interests,
  filteredInterestResults,
  interestSearch,
  interestSearchLoading,
  interestInputRef,
  interestDropdownRef,
  interestDropdownOpen,
  setInterestDropdownOpen,
  interestPos,
  onInterestSearch,
  onAddInterest,
  onRemoveInterest,
  formatNumber,
}: AdSetInterestTargetingFieldProps) {
  return (
    <SettingsField appearance={appearance} label="Interests">
      <div className="space-y-2">
        <p className="typo-caption text-muted-foreground">
          Search Meta&apos;s interest categories to target people based on their interests,
          activities, and pages they like.
        </p>

        {interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {interests.map((interest) => (
              <span
                key={interest.id}
                className="chip-glass-blue flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
              >
                {interest.name}
                <button
                  type="button"
                  onClick={() => onRemoveInterest(interest.id)}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        <div>
          <input
            ref={interestInputRef}
            type="text"
            value={interestSearch}
            onChange={(event) => {
              onInterestSearch(event.target.value)
              if (!interestDropdownOpen) setInterestDropdownOpen(true)
            }}
            onFocus={() => {
              if (interestSearch.trim()) setInterestDropdownOpen(true)
            }}
            className={inputClassName}
            placeholder="Search interests (e.g. Entrepreneurship, Fitness...)"
          />
          {interestDropdownOpen &&
            (filteredInterestResults.length > 0 || interestSearchLoading) &&
            createPortal(
              <div
                ref={interestDropdownRef}
                className="z-dropdown rounded-spacing-2 border-border surface-card p-spacing-2 fixed max-h-60 overflow-y-auto border shadow-lg"
                style={{
                  top: interestPos.top,
                  left: interestPos.left,
                  width: interestPos.width,
                }}
              >
                {interestSearchLoading ? (
                  <div className="px-spacing-2 py-spacing-2 text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="body-3">Searching...</span>
                  </div>
                ) : (
                  <div className="space-y-spacing-1">
                    {filteredInterestResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => onAddInterest({ id: result.id, name: result.name })}
                        className="gap-spacing-2 px-spacing-2 py-spacing-2 rounded-spacing-1 body-3 hover:bg-hover-subtle flex w-full items-center justify-between text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-foreground font-medium">{result.name}</span>
                          {result.audience_size_lower_bound != null &&
                            result.audience_size_upper_bound != null && (
                              <span className="typo-caption text-muted-foreground ml-2">
                                {formatNumber(result.audience_size_lower_bound)} –{' '}
                                {formatNumber(result.audience_size_upper_bound)}
                              </span>
                            )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>,
              document.body,
            )}
        </div>
      </div>
    </SettingsField>
  )
}
