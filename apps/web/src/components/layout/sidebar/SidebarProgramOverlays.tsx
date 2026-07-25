'use client'

import type { Dispatch, SetStateAction } from 'react'
import { toast } from 'sonner'
import { ShareModal } from '@/components/org'
import { useOrgStore } from '@/features/org/store/use-org-store'
import {
  deleteProgram,
  fetchPrograms,
  invalidateProgramsListCache,
  updateProgram,
  type Program,
} from '@/lib/programs'
import { SidebarDeleteProgramDialog } from './SidebarDeleteProgramDialog'
import type { SectionMenuAnchorRect } from './SidebarHqSpacesRows'
import { SidebarProgramMenuPortal } from './SidebarProgramMenuPortal'

type ProgramMenuState = {
  program: Program
  anchorRect: SectionMenuAnchorRect
} | null

export function SidebarProgramOverlays({
  programMenuFor,
  setProgramMenuFor,
  sharingProgram,
  setSharingProgram,
  deletingProgram,
  setDeletingProgram,
  deletingProgramBusy,
  setDeletingProgramBusy,
  setPrograms,
  onCreateCampaign,
}: {
  programMenuFor: ProgramMenuState
  setProgramMenuFor: Dispatch<SetStateAction<ProgramMenuState>>
  sharingProgram: Program | null
  setSharingProgram: Dispatch<SetStateAction<Program | null>>
  deletingProgram: Program | null
  setDeletingProgram: Dispatch<SetStateAction<Program | null>>
  deletingProgramBusy: boolean
  setDeletingProgramBusy: Dispatch<SetStateAction<boolean>>
  setPrograms: Dispatch<SetStateAction<Program[]>>
  onCreateCampaign: (programId: string | null) => void
}) {
  return (
    <>
      {programMenuFor ? (
        <SidebarProgramMenuPortal
          program={programMenuFor.program}
          anchorRect={programMenuFor.anchorRect}
          onClose={() => setProgramMenuFor(null)}
          onRename={
            programMenuFor.program.system_kind
              ? undefined
              : () => {
                  const next = window.prompt('Rename program', programMenuFor.program.name)
                  if (!next?.trim() || next.trim() === programMenuFor.program.name) return
                  void updateProgram(programMenuFor.program.id, { name: next.trim() })
                    .then((updated) => {
                      setPrograms((prev) =>
                        prev.map((program) =>
                          program.id === updated.id ? { ...program, ...updated } : program,
                        ),
                      )
                      toast.success('Program renamed')
                    })
                    .catch(() => toast.error('Could not rename program'))
                }
          }
          onCreateCampaign={() => onCreateCampaign(programMenuFor.program.id)}
          onShare={() => setSharingProgram(programMenuFor.program)}
          onDelete={
            programMenuFor.program.system_kind
              ? undefined
              : () => setDeletingProgram(programMenuFor.program)
          }
        />
      ) : null}

      {sharingProgram ? (
        <ShareModal
          open
          onClose={() => {
            setSharingProgram(null)
            void fetchPrograms().then(setPrograms)
          }}
          resourceType="program"
          resourceId={sharingProgram.id}
          resourceName={sharingProgram.name}
        />
      ) : null}

      <SidebarDeleteProgramDialog
        program={deletingProgram}
        busy={deletingProgramBusy}
        onClose={() => setDeletingProgram(null)}
        onConfirm={() => {
          if (!deletingProgram || deletingProgramBusy) return
          setDeletingProgramBusy(true)
          void deleteProgram(deletingProgram.id)
            .then(() => {
              invalidateProgramsListCache(useOrgStore.getState().activeOrgId)
              setPrograms((prev) => prev.filter((program) => program.id !== deletingProgram.id))
              window.dispatchEvent(new Event('roas:programs-changed'))
              toast.success('Program deleted')
              setDeletingProgram(null)
            })
            .catch(() => toast.error('Could not delete program'))
            .finally(() => setDeletingProgramBusy(false))
        }}
      />
    </>
  )
}
