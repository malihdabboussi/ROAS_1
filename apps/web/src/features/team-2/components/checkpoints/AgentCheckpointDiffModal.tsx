'use client'

import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import type { AgentCheckpointDetail, AgentCheckpointSnapshot } from '../../services/agent-checkpoints.service'

interface AgentCheckpointDiffModalProps {
  open: boolean
  checkpoint: AgentCheckpointDetail | null
  previousCheckpoint: AgentCheckpointDetail | null
  onClose: () => void
}

interface SnapshotFile {
  key: string
  label: string
  before: string
  after: string
}

function filesFromSnapshots(
  before: AgentCheckpointSnapshot | null,
  after: AgentCheckpointSnapshot,
): SnapshotFile[] {
  const files = new Map<string, SnapshotFile>()
  for (const definition of before?.definitions ?? []) {
    files.set(`definition:${definition.file_name}`, {
      key: `definition:${definition.file_name}`,
      label: definition.file_name,
      before: definition.content,
      after: '',
    })
  }
  for (const definition of after.definitions) {
    const key = `definition:${definition.file_name}`
    files.set(key, {
      key,
      label: definition.file_name,
      before: files.get(key)?.before ?? '',
      after: definition.content,
    })
  }
  for (const skill of before?.skills ?? []) {
    files.set(`skill:${skill.skill_key}`, {
      key: `skill:${skill.skill_key}`,
      label: `Skill: ${skill.name || skill.skill_key}`,
      before: skill.markdown_content,
      after: '',
    })
  }
  for (const skill of after.skills) {
    const key = `skill:${skill.skill_key}`
    files.set(key, {
      key,
      label: `Skill: ${skill.name || skill.skill_key}`,
      before: files.get(key)?.before ?? '',
      after: skill.markdown_content,
    })
  }
  return Array.from(files.values())
}

function CodePane({ title, content }: { title: string; content: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-spacing-3 border border-subtle">
      <div className="border-border body-4 text-muted-foreground border-b px-spacing-3 py-spacing-2">
        {title}
      </div>
      <pre className="body-4 text-foreground min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-spacing-3">
        {content || 'No content'}
      </pre>
    </div>
  )
}

export function AgentCheckpointDiffModal({
  open,
  checkpoint,
  previousCheckpoint,
  onClose,
}: AgentCheckpointDiffModalProps) {
  const files = useMemo(
    () =>
      checkpoint
        ? filesFromSnapshots(previousCheckpoint?.snapshot ?? null, checkpoint.snapshot)
        : [],
    [checkpoint, previousCheckpoint],
  )
  const [active, setActive] = useState('')
  const activeKey = active || files[0]?.key || ''

  if (!open || !checkpoint) return null

  return createPortal(
    <div className="z-modal-backdrop-above flex items-center justify-center p-spacing-4">
      <div className="surface-card border-border flex h-[min(760px,90vh)] w-[min(1040px,94vw)] flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <header className="border-border flex items-center justify-between gap-spacing-3 border-b px-spacing-5 py-spacing-4">
          <div className="min-w-0">
            <h2 className="title-h6 text-foreground truncate">{checkpoint.summary}</h2>
            <p className="body-4 text-muted-foreground mt-spacing-1">Checkpoint details</p>
          </div>
          <button type="button" onClick={onClose} className="btn-icon-bare" aria-label="Close">
            <X className="icon-sm" />
          </button>
        </header>
        {files.length > 0 ? (
          <Tabs value={activeKey} onValueChange={setActive} className="min-h-0 flex-1 p-spacing-4">
            <TabsList variant="glass" className="mb-spacing-3 max-w-full overflow-x-auto">
              {files.map((file) => (
                <TabsTrigger key={file.key} value={file.key}>
                  {file.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {files.map((file) => (
              <TabsContent key={file.key} value={file.key} className="mt-0 min-h-0 flex-1">
                <div className="grid h-full min-h-0 grid-cols-1 gap-spacing-3 md:grid-cols-2">
                  <CodePane title="Before" content={file.before} />
                  <CodePane title="After" content={file.after} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center">
            No files in this checkpoint.
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
