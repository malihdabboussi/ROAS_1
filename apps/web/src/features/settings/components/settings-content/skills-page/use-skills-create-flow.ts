'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { extractDocumentText } from '@/features/brain/services/sk.service'
import {
  createAgentSkill,
  createAgentSkillResource,
  uploadSkillAsset,
} from '@/features/mission-control/services/missions.service'
import { updateSkillRecommendationStatus } from '@/features/skill-recommendations/services/skill-recommendations.service'
import type { SkillRecommendation } from '@/features/skill-recommendations/types'
import { dispatchTeamHrChatCompose } from '@/lib/agents/side-chat-compose'
import { RETRY_CONFIGS, withRetry } from '@/lib/utils/retry'
import type { DraftResource } from './skills-page.types'
import { buildDraftResourceTree, parseSkillMdFrontmatter, toSkillKey } from './skills-page.utils'

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

function isLikelyHeading(line: string): boolean {
  if (line.length > 90) return false
  if (/[.!?]$/.test(line)) return false
  const words = line.split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.length > 10) return false
  const meaningfulWords = words.filter((word) => /[A-Za-z]/.test(word))
  if (meaningfulWords.length === 0) return false
  return meaningfulWords.every((word) => /^[A-Z0-9][A-Za-z0-9/&()'"-]*$/.test(word))
}

function splitLongParagraph(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [text]
  const paragraphs: string[] = []
  let current = ''

  for (const sentence of sentences) {
    const next = sentence.trim()
    if (!next) continue
    if ((current + ' ' + next).trim().length > 420 && current) {
      paragraphs.push(current.trim())
      current = next
    } else {
      current = `${current} ${next}`.trim()
    }
  }

  if (current) paragraphs.push(current.trim())
  return paragraphs
}

function formatExtractedDocumentReference(filename: string, rawText: string): string {
  const title = documentStem(filename)
  const cleaned = rawText
    .replace(/\r/g, '')
    .replace(/-\n(?=\w)/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleaned) return `# ${title}\n`

  const sourceLines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^page\s+\d+$/i.test(line) && !/^\d+$/.test(line))

  const lines = sourceLines.length > 1 ? sourceLines : splitLongParagraph(cleaned)
  const blocks: string[] = []
  let paragraph = ''

  const flushParagraph = () => {
    if (!paragraph.trim()) return
    blocks.push(...splitLongParagraph(paragraph.trim()))
    paragraph = ''
  }

  for (const line of lines) {
    if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      flushParagraph()
      blocks.push(line.replace(/^•\s+/, '- '))
      continue
    }

    if (isLikelyHeading(line)) {
      flushParagraph()
      blocks.push(`## ${line}`)
      continue
    }

    paragraph = `${paragraph} ${line}`.trim()
    if (/[.!?]$/.test(line) || paragraph.length > 420) flushParagraph()
  }

  flushParagraph()

  return `# ${title}\n\n${blocks.join('\n\n')}\n`
}

async function buildUploadedDraftResource(
  file: File,
  relPath: string,
  readFile: (file: File) => Promise<string>,
  nextDraftId: () => string,
): Promise<DraftResource> {
  if (isExtractableDocument(file)) {
    const content = await extractDocumentText(file)
    const stem = documentStem(file.name)
    return {
      id: nextDraftId(),
      file_path: relPath.includes('/')
        ? relPath.replace(/\.[^.]+$/, '.md')
        : `references/${stem}.md`,
      content: formatExtractedDocumentReference(file.name, content),
      content_type: 'text/markdown',
      file: null,
    }
  }

  if (isTextResourceFile(file)) {
    const content = await readFile(file)
    const file_path =
      relPath.includes('/') || relPath.startsWith('assets/') ? relPath : `references/${relPath}`
    return {
      id: nextDraftId(),
      file_path,
      content,
      content_type: file.type || 'text/plain',
      file: null,
    }
  }

  const file_path = relPath.includes('/') ? relPath : `assets/${file.name}`
  return {
    id: nextDraftId(),
    file_path,
    content: null,
    content_type: file.type || 'application/octet-stream',
    file,
  }
}

export function useSkillsCreateFlow({
  selectedAgentKey,
  setSelectedAgentKey,
  setSkillsView,
  loadSkills,
  refreshSkills,
}: {
  selectedAgentKey: string
  setSelectedAgentKey: (agentKey: string) => void
  setSkillsView: (viewKey: 'all' | string) => void
  loadSkills: (agentKey: string) => Promise<void>
  refreshSkills?: () => void
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [addSkillMenuOpen, setAddSkillMenuOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftMarkdown, setDraftMarkdown] = useState('')
  const [draftResources, setDraftResources] = useState<DraftResource[]>([])
  const [draftSelectedResourceId, setDraftSelectedResourceId] = useState<string | null>(null)
  const [draftExpandedFolders, setDraftExpandedFolders] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [draftAddFilesOpen, setDraftAddFilesOpen] = useState(false)
  const [addingRefName, setAddingRefName] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [draftRecommendationId, setDraftRecommendationId] = useState<string | null>(null)
  const addRefInputRef = useRef<HTMLInputElement | null>(null)
  const skillUploadInputRef = useRef<HTMLInputElement | null>(null)
  const assetInputRef = useRef<HTMLInputElement | null>(null)
  const draftIdCounter = useRef(0)

  const draftResourceTree = useMemo(() => buildDraftResourceTree(draftResources), [draftResources])

  const resetCreateDialog = useCallback(() => {
    setDraftName('')
    setDraftDescription('')
    setDraftMarkdown('')
    setDraftResources([])
    setDraftSelectedResourceId(null)
    setDraftExpandedFolders(new Set())
    setCreateError(null)
    setDraftAddFilesOpen(false)
    setAddingRefName(null)
    setDraftRecommendationId(null)
  }, [])

  const focusAgentForSkillActions = useCallback(
    (agentKey: string) => {
      setSelectedAgentKey(agentKey)
      setSkillsView(agentKey)
    },
    [setSelectedAgentKey, setSkillsView],
  )

  const openCreateFresh = useCallback(() => {
    resetCreateDialog()
    setAddSkillMenuOpen(false)
    setCreateOpen(true)
  }, [resetCreateDialog])

  const openCreateForAgent = useCallback(
    (agentKey: string) => {
      focusAgentForSkillActions(agentKey)
      resetCreateDialog()
      setAddSkillMenuOpen(false)
      setCreateOpen(true)
    },
    [focusAgentForSkillActions, resetCreateDialog],
  )

  const triggerUploadForAgent = useCallback(
    (agentKey: string) => {
      focusAgentForSkillActions(agentKey)
      setAddSkillMenuOpen(false)
      skillUploadInputRef.current?.click()
    },
    [focusAgentForSkillActions],
  )

  const openCreateWithJaime = useCallback(
    (target?: { agentKey: string; agentName?: string | null }) => {
      setAddSkillMenuOpen(false)
      const agentKey = target?.agentKey.trim()
      const agentName = target?.agentName?.trim()
      const agentPart = agentKey
        ? ` for ${agentName || agentKey} (agent_key: ${agentKey})`
        : agentName
          ? ` for ${agentName}`
          : ''
      dispatchTeamHrChatCompose({
        text: `/skill-creator Create a new skill${agentPart} about `,
        newConversation: true,
      })
    },
    [],
  )

  const nextDraftId = useCallback(() => {
    draftIdCounter.current += 1
    return `draft-${draftIdCounter.current}`
  }, [])

  const openCreateFromRecommendation = useCallback(
    (recommendation: SkillRecommendation) => {
      focusAgentForSkillActions(recommendation.target_agent_key)
      resetCreateDialog()
      setAddSkillMenuOpen(false)
      setDraftRecommendationId(recommendation.id)
      setDraftName(recommendation.name)
      setDraftDescription(recommendation.description)
      setDraftMarkdown(recommendation.markdown_content)
      const resources: DraftResource[] = recommendation.resources.map((resource) => ({
        id: nextDraftId(),
        file_path: resource.file_path,
        content: resource.content,
        content_type: resource.content_type,
        file: null,
      }))
      setDraftResources(resources)
      if (resources.length > 0) {
        const folders = new Set<string>()
        for (const resource of resources) {
          const parts = resource.file_path.split('/')
          let path = ''
          for (let i = 0; i < parts.length - 1; i++) {
            path = path ? `${path}/${parts[i]}` : parts[i]!
            folders.add(path)
          }
        }
        setDraftExpandedFolders(folders)
      }
      setCreateOpen(true)
    },
    [focusAgentForSkillActions, nextDraftId, resetCreateDialog],
  )

  const handleUploadSkillFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArr = [...files]
      let skillMdFile: File | null = null
      const resourceFiles: File[] = []
      let rootPrefix = ''

      if (fileArr.length > 0 && fileArr[0]!.webkitRelativePath) {
        const firstPath = fileArr[0]!.webkitRelativePath
        const parts = firstPath.split('/')
        if (parts.length > 1) rootPrefix = parts[0]! + '/'
      }

      for (const f of fileArr) {
        const relPath = f.webkitRelativePath ? f.webkitRelativePath.replace(rootPrefix, '') : f.name
        if (relPath.toLowerCase() === 'skill.md' || relPath.toLowerCase().endsWith('/skill.md')) {
          skillMdFile = f
        } else {
          resourceFiles.push(f)
        }
      }

      const readFile = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(reader.error)
          reader.readAsText(file)
        })

      void (async () => {
        setExtracting(true)
        resetCreateDialog()
        setAddSkillMenuOpen(false)
        setCreateError(null)

        try {
          if (skillMdFile) {
            const text = await readFile(skillMdFile)
            const parsed = parseSkillMdFrontmatter(text)
            setDraftName(parsed.name)
            setDraftDescription(parsed.description)
            setDraftMarkdown(parsed.markdown_content)
          }

          const newResources: DraftResource[] = []
          for (const f of resourceFiles) {
            const relPath = f.webkitRelativePath
              ? f.webkitRelativePath.replace(rootPrefix, '')
              : f.name
            const built = await buildUploadedDraftResource(f, relPath, readFile, nextDraftId)
            newResources.push(built)
          }

          setDraftResources(newResources)
          if (newResources.length > 0) {
            const folders = new Set<string>()
            for (const r of newResources) {
              const parts = r.file_path.split('/')
              let p = ''
              for (let i = 0; i < parts.length - 1; i++) {
                p = p ? `${p}/${parts[i]}` : parts[i]!
                folders.add(p)
              }
            }
            setDraftExpandedFolders(folders)
          }

          setCreateOpen(true)
        } catch (e) {
          setCreateError(e instanceof Error ? e.message : 'Failed to process files')
          setCreateOpen(true)
        } finally {
          setExtracting(false)
        }
      })()
    },
    [resetCreateDialog, nextDraftId],
  )

  const handleUploadSingleFiles = useCallback(
    (files: FileList | File[]) => {
      void (async () => {
        setExtracting(true)
        setAddSkillMenuOpen(false)
        resetCreateDialog()
        setCreateError(null)

        const fileArr = [...files]

        const readFile = (file: File): Promise<string> =>
          new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(reader.error)
            reader.readAsText(file)
          })

        let skillMdFile: File | null = null
        for (const f of fileArr) {
          if (f.name.toLowerCase() === 'skill.md') {
            skillMdFile = f
            break
          }
        }

        const usedForSkill = new Set<File>()
        if (skillMdFile) usedForSkill.add(skillMdFile)

        if (!skillMdFile) {
          const mds = fileArr.filter((f) => f.name.toLowerCase().endsWith('.md'))
          if (mds.length >= 1) {
            skillMdFile = mds[0]!
            usedForSkill.add(skillMdFile)
          }
        }

        let resourceFiles = fileArr.filter((f) => !usedForSkill.has(f))

        try {
          if (skillMdFile) {
            const text = await readFile(skillMdFile)
            const parsed = parseSkillMdFrontmatter(text)
            setDraftName(parsed.name)
            setDraftDescription(parsed.description)
            setDraftMarkdown(parsed.markdown_content)
          } else if (fileArr.length === 1) {
            const f = fileArr[0]!
            const ext = f.name.toLowerCase().split('.').pop() ?? ''
            if (ext === 'md') {
              const text = await readFile(f)
              const parsed = parseSkillMdFrontmatter(text)
              setDraftName(parsed.name)
              setDraftDescription(parsed.description)
              setDraftMarkdown(parsed.markdown_content)
              resourceFiles = []
            } else if (ext === 'pdf' || ext === 'doc' || ext === 'docx') {
              const text = await extractDocumentText(f)
              setDraftMarkdown(text)
              resourceFiles = []
            } else {
              resourceFiles = [f]
            }
          } else {
            const nonMd = fileArr.filter((f) => !f.name.toLowerCase().endsWith('.md'))
            const allExtractable =
              nonMd.length === fileArr.length &&
              nonMd.every((f) => {
                const ext = f.name.toLowerCase().split('.').pop() ?? ''
                return ext === 'pdf' || ext === 'doc' || ext === 'docx'
              })
            if (allExtractable && nonMd.length > 0) {
              const extracts: string[] = []
              for (const f of nonMd) {
                extracts.push(await extractDocumentText(f))
              }
              setDraftMarkdown(extracts.join('\n\n---\n\n'))
              resourceFiles = []
            }
          }

          const newResources: DraftResource[] = []
          for (const f of resourceFiles) {
            const built = await buildUploadedDraftResource(f, f.name, readFile, nextDraftId)
            newResources.push(built)
          }

          setDraftResources(newResources)
          if (newResources.length > 0) {
            const folders = new Set<string>()
            for (const r of newResources) {
              const parts = r.file_path.split('/')
              let p = ''
              for (let i = 0; i < parts.length - 1; i++) {
                p = p ? `${p}/${parts[i]}` : parts[i]!
                folders.add(p)
              }
            }
            setDraftExpandedFolders(folders)
          }

          setCreateOpen(true)
        } catch (e) {
          setCreateError(e instanceof Error ? e.message : 'Failed to process file')
          setCreateOpen(true)
        } finally {
          setExtracting(false)
        }
      })()
    },
    [resetCreateDialog, nextDraftId],
  )

  const handleUploadSkill = useCallback(
    (files: FileList | File[]) => {
      const fileArr = [...files]
      if (fileArr.some((f) => f.webkitRelativePath)) {
        handleUploadSkillFiles(files)
        return
      }
      handleUploadSingleFiles(files)
    },
    [handleUploadSkillFiles, handleUploadSingleFiles],
  )

  const startAddReference = useCallback(() => {
    setAddingRefName('references/')
    setTimeout(() => addRefInputRef.current?.focus(), 0)
  }, [])

  const commitAddReference = useCallback(() => {
    const filePath = addingRefName?.trim()
    setAddingRefName(null)
    if (!filePath) return
    const id = nextDraftId()
    setDraftResources((prev) => [
      ...prev,
      { id, file_path: filePath, content: '', content_type: 'text/markdown', file: null },
    ])
    setDraftSelectedResourceId(id)
    const parts = filePath.split('/')
    if (parts.length > 1) {
      setDraftExpandedFolders((prev) => {
        const next = new Set(prev)
        let p = ''
        for (let i = 0; i < parts.length - 1; i++) {
          p = p ? `${p}/${parts[i]}` : parts[i]!
          next.add(p)
        }
        return next
      })
    }
  }, [addingRefName, nextDraftId])

  const handleAddAssetFiles = useCallback(
    (files: FileList | File[]) => {
      const newResources: DraftResource[] = []
      for (const f of [...files]) {
        newResources.push({
          id: nextDraftId(),
          file_path: `assets/${f.name}`,
          content: null,
          content_type: f.type || 'application/octet-stream',
          file: f,
        })
      }
      setDraftResources((prev) => [...prev, ...newResources])
      setDraftAddFilesOpen(false)
      if (newResources.length > 0) {
        setDraftExpandedFolders((prev) => new Set(prev).add('assets'))
      }
    },
    [nextDraftId],
  )

  const handleDeleteDraftResource = useCallback(
    (id: string) => {
      setDraftResources((prev) => prev.filter((r) => r.id !== id))
      if (draftSelectedResourceId === id) setDraftSelectedResourceId(null)
    },
    [draftSelectedResourceId],
  )

  const handleCreateSkill = useCallback(async () => {
    const skillKey = toSkillKey(draftName)
    if (!skillKey || !draftName.trim()) {
      setCreateError('Skill name is required')
      return
    }

    setCreating(true)
    setCreateError(null)

    // Account/org catalog ownership — not tied to the selected agent tab.
    const { ACCOUNT_SKILL_AGENT_KEY } = await import('@/lib/agents/skill-catalog')
    const catalogAgentKey = ACCOUNT_SKILL_AGENT_KEY

    try {
      await withRetry(
        () =>
          createAgentSkill(catalogAgentKey, {
            skill_key: skillKey,
            name: draftName.trim(),
            description: draftDescription.trim(),
            markdown_content: draftMarkdown,
            is_enabled: true,
          }),
        RETRY_CONFIGS.API_CALL,
      )

      for (const r of draftResources) {
        if (r.file) {
          await withRetry(
            () => uploadSkillAsset(catalogAgentKey, skillKey, r.file!),
            RETRY_CONFIGS.API_CALL,
          )
        } else {
          await withRetry(
            () =>
              createAgentSkillResource(catalogAgentKey, skillKey, {
                file_path: r.file_path,
                content: r.content ?? undefined,
                content_type: r.content_type ?? undefined,
              }),
            RETRY_CONFIGS.API_CALL,
          )
        }
      }

      if (refreshSkills) refreshSkills()
      else await loadSkills(selectedAgentKey || catalogAgentKey)
      if (draftRecommendationId) {
        await updateSkillRecommendationStatus(draftRecommendationId, 'converted').catch(() => {})
      }
      setCreateOpen(false)
      resetCreateDialog()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create skill')
    } finally {
      setCreating(false)
    }
  }, [
    selectedAgentKey,
    draftName,
    draftDescription,
    draftMarkdown,
    draftResources,
    draftRecommendationId,
    loadSkills,
    refreshSkills,
    resetCreateDialog,
  ])

  return {
    createOpen,
    setCreateOpen,
    addSkillMenuOpen,
    setAddSkillMenuOpen,
    draftName,
    setDraftName,
    draftDescription,
    setDraftDescription,
    draftMarkdown,
    setDraftMarkdown,
    draftResources,
    setDraftResources,
    draftSelectedResourceId,
    setDraftSelectedResourceId,
    draftExpandedFolders,
    setDraftExpandedFolders,
    creating,
    createError,
    draftAddFilesOpen,
    setDraftAddFilesOpen,
    addingRefName,
    setAddingRefName,
    addRefInputRef,
    skillUploadInputRef,
    assetInputRef,
    draftResourceTree,
    resetCreateDialog,
    openCreateFresh,
    openCreateForAgent,
    triggerUploadForAgent,
    openCreateWithJaime,
    openCreateFromRecommendation,
    handleUploadSkill,
    extracting,
    startAddReference,
    commitAddReference,
    handleAddAssetFiles,
    handleDeleteDraftResource,
    handleCreateSkill,
  }
}
