import { ArrowLeft } from 'lucide-react'
import { HrInsightsMobileSection } from './HrInsightsMobileSection'
import { ReadyEmployeeFilterTabs } from './ReadyEmployeeFilterTabs'
import { ReadyEmployeeLibraryList } from './ReadyEmployeeLibraryList'
import { ReadyEmployeeProfileDetail } from './ReadyEmployeeProfileDetail'
import type { ReadyEmployeesModalViewModel } from './use-ready-employees-modal'

type ModalState = ReadyEmployeesModalViewModel

export interface ReadyEmployeesModalMobileProps extends ModalState {
  onClose: () => void
}

export function ReadyEmployeesModalMobile({
  onClose,
  hrAgent,
  hrInsights,
  hrInsightsLoading,
  hrCollapsed,
  setHrCollapsed,
  highlightedHire,
  getDisplayName,
  handleGetHrInsights,
  selected,
  loading,
  filteredProfiles,
  selectedRoleKey,
  selectRole,
  teamFilter,
  setTeamFilter,
  mobileLibView,
  setMobileLibView,
  handleHire,
  hireLoading,
  hireTeams,
  selectedTeamId,
  setSelectedTeamId,
  isProfileLocked,
}: ReadyEmployeesModalMobileProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-background)]">
      {mobileLibView === 'detail' && selected ? (
        <>
          <div className="flex items-center gap-3 px-3 pb-1 pt-3">
            <button
              type="button"
              onClick={() => setMobileLibView('list')}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
              {getDisplayName(selected)}
            </span>
            <div className="w-spacing-8" />
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <ReadyEmployeeProfileDetail
              profile={selected}
              getDisplayName={getDisplayName}
              hireLoading={hireLoading}
              onHire={handleHire}
              hireDisabled={hireTeams.length === 0 || isProfileLocked(selected)}
              hireControl={
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="border-subtle body-3 text-foreground mb-spacing-2 w-full rounded-spacing-2 border bg-transparent px-spacing-3 py-spacing-2 outline-none"
                >
                  {hireTeams.length === 0 ? (
                    <option value="">No team available</option>
                  ) : (
                    hireTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))
                  )}
                </select>
              }
              showFooterHire
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 px-3 pb-1 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Back to team"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="body-2 min-w-0 flex-1 truncate text-center font-medium text-[var(--color-foreground)]">
              Hire Library
            </span>
            <div className="w-spacing-8" />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {hrAgent && (
              <HrInsightsMobileSection
                hrAgent={hrAgent}
                hrInsights={hrInsights}
                hrInsightsLoading={hrInsightsLoading}
                hrCollapsed={hrCollapsed}
                setHrCollapsed={setHrCollapsed}
                highlightedHire={highlightedHire}
                getDisplayName={getDisplayName}
                onGetHrInsights={handleGetHrInsights}
              />
            )}

            <ReadyEmployeeFilterTabs
              variant="mobile"
              teamFilter={teamFilter}
              onChange={setTeamFilter}
            />

            <ReadyEmployeeLibraryList
              variant="mobile"
              loading={loading}
              filteredProfiles={filteredProfiles}
              selectedRoleKey={selectedRoleKey}
              getDisplayName={getDisplayName}
              onSelectRole={(roleKey) => {
                selectRole(roleKey)
                setMobileLibView('detail')
              }}
              isProfileLocked={isProfileLocked}
            />
          </div>
        </>
      )}
    </div>
  )
}
