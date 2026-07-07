'use client'

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { extractDocumentText } from '@/features/brain/services/sk.service'
import {
  createAgentSkillResource,
  deleteAgentSkillResource,
  updateAgentSkillResource,
  uploadSkillAsset,
} from '@/features/mission-control/services/missions.service'
import type { MissionAgentSkill, MissionAgentSkillResource } from '@/features/mission-control/types'
import { isSkillWriteLockedAgent } from '@/lib/agents/system-agent-contracts'
import { RETRY_CONFIGS, withRetry } from '@/lib/utils/retry'
import { expandFoldersForFilePath } from './skills-page.utils'

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function isTextResourceFile(file: File): boolean {
  return (
    file.type.startsWith('text/') ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.json') ||
    file.name.endsWith('.txt') ||
    file.name.endsWith('.yaml') ||
    file.name.endsWith('.yml')
  )
}

function isExtractableDocument(file: File): boolean {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  return ext === 'pdf' || ext === 'doc' || ext === 'docx'
}

function documentStem(filename: string): string {
  return filename.replace(/\.[^.]+$/, '')
}

function formatExtractedDocumentReference(filename: string, rawText: string): string {
  const title = documentStem(filename)
  const cleaned = rawText
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!cleaned) return `# ${title}\n`
  return `# ${title}\n\n${cleaned}\n`
}

function uploadDestinationPath(file: File, folderPath?: string): string {
  const folder = folderPath?.replace(/\/$/, '') || 'references'
  if (isExtractableDocument(file)) {
    return `${folder}/${documentStem(file.name)}.md`
  }
  return `${folder}/${file.name}`
}

async function persistUploadedResourceFile(
  file: File,
  agentKey: string,
  skillKey: string,
  folderPath?: string,
): Promise<MissionAgentSkillResource> {
  if (isExtractableDocument(file)) {
    const content = await extractDocumentText(file)
    const filePath = uploadDestinationPath(file, folderPath)
    return withRetry(
      () =>
        createAgentSkillResource(agentKey, skillKey, {
          file_path: filePath,
          content: formatExtractedDocumentReference(file.name, content),
          content_type: 'text/markdown',
        }),
      RETRY_CONFIGS.API_CALL,
    )
  }

  if (isTextResourceFile(file)) {
    const content = await readTextFile(file)
    const filePath = uploadDestinationPath(file, folderPath)
    return withRetry(
      () =>
        createAgentSkillResource(agentKey, skillKey, {
          file_path: filePath,
          content,
          content_type: file.type || 'text/plain',
        }),
      RETRY_CONFIGS.API_CALL,
    )
  }

  return withRetry(() => uploadSkillAsset(agentKey, skillKey, file), RETRY_CONFIGS.API_CALL)
}

export function useSkillDetailResources({
  detailSkillResolved,
  detailResourceId,
  setDetailResourceId,
  setExpandedFolders,
  refreshSkills,
  moveSkillResourceOptimistically,
  deleteSkillResourceOptimistically,
}: {
  detailSkillResolved: MissionAgentSkill | null
  detailResourceId: string | null
  setDetailResourceId: Dispatch<SetStateAction<string | null>>
  setExpandedFolders: Dispatch<SetStateAction<Set<string>>>
  refreshSkills: () => void
  moveSkillResourceOptimistically: (
    resourceId: string,
    newFilePath: string,
  ) => {
    rollback: () => void
    applyPersisted: (resource: MissionAgentSkillResource) => void
  }
  deleteSkillResourceOptimistically: (resourceId: string) => { rollback: () => void }
}) {
  const [addResourceMenuOpen, setAddResourceMenuOpen] = useState(false)
  const [addingResourcePath, setAddingResourcePath] = useState<string | null>(null)
  const [resourceBusy, setResourceBusy] = useState(false)
  const resourceUploadInputRef = useRef<HTMLInputElement | null>(null)
  const folderUploadInputRef = useRef<HTMLInputElement | null>(null)
  const folderUploadPathRef = useRef<string | null>(null)
  const addResourcePathInputRef = useRef<HTMLInputElement | null>(null)

  const writeLocked = !detailSkillResolved || isSkillWriteLockedAgent(detailSkillResolved.agent_key)

  const afterResourceChange = useCallback(
    (resource: MissionAgentSkillResource) => {
      setExpandedFolders((prev) => expandFoldersForFilePath(resource.file_path, prev))
      setDetailResourceId(resource.id)
      refreshSkills()
    },
    [refreshSkills, setDetailResourceId, setExpandedFolders],
  )

  const startAddResourceManually = useCallback(() => {
    setAddResourceMenuOpen(false)
    setAddingResourcePath('references/')
    setTimeout(() => addResourcePathInputRef.current?.focus(), 0)
  }, [])

  const startAddResourceInFolder = useCallback(
    (folderPath: string) => {
      setAddResourceMenuOpen(false)
      const normalized = folderPath.endsWith('/') ? folderPath : `${folderPath}/`
      setAddingResourcePath(normalized)
      setExpandedFolders((prev) => {
        const next = new Set(prev)
        next.add(folderPath)
        return next
      })
      setTimeout(() => addResourcePathInputRef.current?.focus(), 0)
    },
    [setExpandedFolders],
  )

  const commitAddResourceManually = useCallback(async () => {
    const filePath = addingResourcePath?.trim()
    setAddingResourcePath(null)
    if (!filePath || filePath.endsWith('/') || !detailSkillResolved || writeLocked) return

    setResourceBusy(true)
    try {
      const created = await withRetry(
        () =>
          createAgentSkillResource(detailSkillResolved.agent_key, detailSkillResolved.skill_key, {
            file_path: filePath,
            content: '',
            content_type: 'text/markdown',
          }),
        RETRY_CONFIGS.API_CALL,
      )
      afterResourceChange(created)
    } finally {
      setResourceBusy(false)
    }
  }, [addingResourcePath, afterResourceChange, detailSkillResolved, writeLocked])

  const handleUploadResourceFile = useCallback(
    async (files: FileList | File[], folderPath?: string) => {
      const file = [...files][0]
      if (!file || !detailSkillResolved || writeLocked) return

      setAddResourceMenuOpen(false)
      setResourceBusy(true)
      try {
        const created = await persistUploadedResourceFile(
          file,
          detailSkillResolved.agent_key,
          detailSkillResolved.skill_key,
          folderPath,
        )
        afterResourceChange(created)
      } finally {
        setResourceBusy(false)
      }
    },
    [afterResourceChange, detailSkillResolved, writeLocked],
  )

  const uploadResourceFileToFolder = useCallback(
    (folderPath: string) => {
      folderUploadPathRef.current = folderPath
      setExpandedFolders((prev) => {
        const next = new Set(prev)
        next.add(folderPath)
        return next
      })
      setTimeout(() => folderUploadInputRef.current?.click(), 0)
    },
    [setExpandedFolders],
  )

  const saveResourceContent = useCallback(
    async (resource: MissionAgentSkillResource, content: string) => {
      if (!detailSkillResolved || writeLocked) return
      await withRetry(
        () =>
          createAgentSkillResource(detailSkillResolved.agent_key, detailSkillResolved.skill_key, {
            file_path: resource.file_path,
            content,
            content_type: resource.content_type ?? 'text/markdown',
          }),
        RETRY_CONFIGS.API_CALL,
      )
      refreshSkills()
    },
    [detailSkillResolved, refreshSkills, writeLocked],
  )

  const moveSkillResource = useCallback(
    async (resourceId: string, newFilePath: string) => {
      if (!detailSkillResolved || writeLocked) return
      const optimisticMove = moveSkillResourceOptimistically(resourceId, newFilePath)
      let previousExpandedFolders: Set<string> | null = null
      setExpandedFolders((prev) => {
        previousExpandedFolders = prev
        return expandFoldersForFilePath(newFilePath, prev)
      })
      setResourceBusy(true)
      try {
        const updated = await withRetry(
          () =>
            updateAgentSkillResource(
              detailSkillResolved.agent_key,
              detailSkillResolved.skill_key,
              resourceId,
              { file_path: newFilePath },
            ),
          RETRY_CONFIGS.API_CALL,
        )
        optimisticMove.applyPersisted(updated)
        setDetailResourceId(updated.id)
      } catch (error) {
        optimisticMove.rollback()
        if (previousExpandedFolders) setExpandedFolders(previousExpandedFolders)
        toast.error("Couldn't move that file. I put it back.")
        throw error
      } finally {
        setResourceBusy(false)
      }
    },
    [
      detailSkillResolved,
      moveSkillResourceOptimistically,
      setDetailResourceId,
      setExpandedFolders,
      writeLocked,
    ],
  )

  const renameSkillResource = useCallback(
    async (resourceId: string, currentPath: string) => {
      if (!detailSkillResolved || writeLocked) return
      const currentName = currentPath.split('/').pop() ?? currentPath
      const nextName = window.prompt('Rename file', currentName)?.trim()
      if (!nextName || nextName === currentName || nextName.includes('/')) return
      const parent = currentPath.includes('/')
        ? currentPath.slice(0, currentPath.lastIndexOf('/'))
        : ''
      const newFilePath = parent ? `${parent}/${nextName}` : nextName
      await moveSkillResource(resourceId, newFilePath)
    },
    [detailSkillResolved, moveSkillResource, writeLocked],
  )

  const deleteSkillResource = useCallback(
    async (resourceId: string) => {
      if (!detailSkillResolved || writeLocked) return
      const optimisticDelete = deleteSkillResourceOptimistically(resourceId)
      const wasSelected = detailResourceId === resourceId
      setResourceBusy(true)
      try {
        await withRetry(
          () =>
            deleteAgentSkillResource(
              detailSkillResolved.agent_key,
              detailSkillResolved.skill_key,
              resourceId,
            ),
          RETRY_CONFIGS.API_CALL,
        )
        if (wasSelected) setDetailResourceId(null)
      } catch (error) {
        optimisticDelete.rollback()
        toast.error("Couldn't delete that file.")
        throw error
      } finally {
        setResourceBusy(false)
      }
    },
    [
      deleteSkillResourceOptimistically,
      detailResourceId,
      detailSkillResolved,
      setDetailResourceId,
      writeLocked,
    ],
  )

  return {
    addResourceMenuOpen,
    setAddResourceMenuOpen,
    addingResourcePath,
    setAddingResourcePath,
    resourceBusy,
    resourceUploadInputRef,
    folderUploadInputRef,
    folderUploadPathRef,
    addResourcePathInputRef,
    writeLocked,
    startAddResourceManually,
    startAddResourceInFolder,
    commitAddResourceManually,
    handleUploadResourceFile,
    uploadResourceFileToFolder,
    saveResourceContent,
    moveSkillResource,
    renameSkillResource,
    deleteSkillResource,
  }
}
