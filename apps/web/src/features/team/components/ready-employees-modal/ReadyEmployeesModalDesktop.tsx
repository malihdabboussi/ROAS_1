import { X } from 'lucide-react'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { ResizableDivider } from '@/features/studio/components/layout/ResizableDivider'
import { HrInsightsDesktopColumn } from './HrInsightsDesktopColumn'
import { ReadyEmployeeFilterTabs } from './ReadyEmployeeFilterTabs'
import { ReadyEmployeeLibraryList } from './ReadyEmployeeLibraryList'
import { ReadyEmployeeProfileDetail } from './ReadyEmployeeProfileDetail'
import type { ReadyEmployeesModalViewModel } from './use-ready-employees-modal'

type ModalState = ReadyEmployeesModalViewModel

export interface ReadyEmployeesModalDesktopProps extends ModalState {
  onClose: () => void
}

export function ReadyEmployeesModalDesktop({
  onClose,
  loading,
  error,
  previewKey,
  containerRef,
  libraryWidthPercent,
  isDragging,
  handleMouseDown,
  hrAgent,
  filteredProfiles,
  selected,
  selectedRoleKey,
  getDisplayName,
  selectRole,
  teamFilter,
  setTeamFilter,
  handleHire,
  hireLoading,
  handleHireFromRecommendation,
  handleGetHrInsights,
  hrInsights,
  hrInsightsLoading,
  highlightedHire,
  hireTeams,
  selectedTeamId,
  setSelectedTeamId,
  isProfileLocked,
}: ReadyEmployeesModalDesktopProps) {
  return (
    <div className="px-spacing-4 bg-modal-overlay fixed inset-0 z-50 flex items-center justify-center">
      <div className="surface-card border-subtle rounded-spacing-4 p-spacing-4 md:p-spacing-6 flex h-[90vh] w-full max-w-[1600px] flex-col border">
        <div className="mb-spacing-4 flex shrink-0 items-center justify-between">
          <div>
            <h2 className="title-h3 text-foreground uppercase">READY EMPLOYEE LIBRARY</h2>
            <p className="body-3 text-muted-foreground">
              Hire premade team roles with preloaded skills and profiles.
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-bare rounded-spacing-3">
            <X className="icon-md" />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <div className="scale-[2.5]">
              <VibeyChatOrb state="processing" style="elastic" />
            </div>
            <p className="body-2 text-shimmer-gradient mt-6">Loading ready employees...</p>
          </div>
        ) : (
          <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden">
            <div
              className={`gap-spacing-4 flex min-h-0 ${isDragging ? '' : 'transition-[width] duration-150 ease-in-out'}`}
              style={{ width: `${libraryWidthPercent}%` }}
            >
              <div className="surface-card border-subtle rounded-spacing-3 flex w-[320px] shrink-0 flex-col overflow-hidden border">
                <ReadyEmployeeFilterTabs
                  variant="sidebar"
                  teamFilter={teamFilter}
                  onChange={setTeamFilter}
                />
                <ReadyEmployeeLibraryList
                  variant="desktop"
                  loading={false}
                  filteredProfiles={filteredProfiles}
                  selectedRoleKey={selectedRoleKey}
                  getDisplayName={getDisplayName}
                  onSelectRole={selectRole}
                  isProfileLocked={isProfileLocked}
                />
              </div>

              <div className="surface-card border-subtle rounded-spacing-3 flex min-w-0 flex-1 flex-col overflow-hidden border">
                {selected ? (
                  <div
                    key={previewKey}
                    className="animate-tab-enter p-spacing-4 flex-1 overflow-y-auto"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    <ReadyEmployeeProfileDetail
                      profile={selected}
                      getDisplayName={getDisplayName}
                      hireLoading={hireLoading}
                    />
                  </div>
                ) : (
                  <p className="body-3 text-muted-foreground py-12 text-center">
                    Select a role to preview
                  </p>
                )}
              </div>
            </div>

            {hrAgent && <ResizableDivider onMouseDown={handleMouseDown} isDragging={isDragging} />}

            {hrAgent && (
              <div
                className={`px-spacing-4 flex min-h-0 shrink-0 flex-col overflow-hidden ${isDragging ? '' : 'transition-[width] duration-150 ease-in-out'}`}
                style={{ width: `${100 - libraryWidthPercent}%` }}
              >
                <HrInsightsDesktopColumn
                  hrAgent={hrAgent}
                  hrInsights={hrInsights}
                  hrInsightsLoading={hrInsightsLoading}
                  highlightedHire={highlightedHire}
                  getDisplayName={getDisplayName}
                  onGetHrInsights={handleGetHrInsights}
                  onHireFromRecommendation={handleHireFromRecommendation}
                  hireLoading={hireLoading}
                />
              </div>
            )}
          </div>
        )}

        <div className="pt-spacing-4 flex shrink-0 items-center justify-end">
          {error && <p className="body-3 text-destructive mr-auto">{error}</p>}
          {selected && !loading && (
            <div className="gap-spacing-2 flex items-center">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="border-subtle body-3 text-foreground rounded-spacing-2 px-spacing-3 py-spacing-2 border bg-transparent outline-none"
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
              <button
                type="button"
                onClick={() => void handleHire()}
                disabled={hireLoading || hireTeams.length === 0 || isProfileLocked(selected)}
                className="button-glass-primary rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 disabled:opacity-50"
              >
                {hireLoading ? 'Hiring...' : `Hire ${getDisplayName(selected)}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
