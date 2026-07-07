'use client'

import { backendFetch, backendGet, backendPut } from '@/lib/api/backend-client'

export async function listProjectFiles(projectId: string): Promise<{
  files: string[]
  entryPoint: string
}> {
  const result = await backendGet<{ success: boolean; files: string[]; entryPoint: string }>(
    `/api/projects/${projectId}/files`,
  )
  return {
    files: Array.isArray(result.files) ? result.files : [],
    entryPoint: result.entryPoint || 'App.tsx',
  }
}

export async function downloadProjectFile(projectId: string, path: string): Promise<string> {
  const encoded = encodeURIComponent(path)
  const result = await backendGet<{ success: boolean; file: { path: string; content: string } }>(
    `/api/projects/${projectId}/files?path=${encoded}`,
  )
  return typeof result.file?.content === 'string' ? result.file.content : ''
}

const SKIP_PATTERNS = [
  /^pnpm-lock\.yaml$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^bun\.lock$/,
  /^node_modules\//,
  /^\.next\//,
  /^dist\//,
  /^\.git\//,
  /^tsconfig\.tsbuildinfo$/,
]

function shouldSkipFile(path: string): boolean {
  const normalized = path.replace(/^\/+/, '')
  return SKIP_PATTERNS.some((pattern) => pattern.test(normalized))
}

export async function buildSandpackFileMap(projectId: string): Promise<{
  files: Record<string, string>
  entryPoint: string
}> {
  const { files, entryPoint } = await listProjectFiles(projectId)
  const downloadable = files.filter((p) => !shouldSkipFile(p))
  const results = await Promise.allSettled(
    downloadable.map(async (path) => ({
      key: normalizeSandpackPath(path),
      content: await downloadProjectFile(projectId, path),
    })),
  )
  const fileMap: Record<string, string> = {}
  for (const result of results) {
    if (result.status === 'fulfilled') {
      fileMap[result.value.key] = result.value.content
    }
  }
  return { files: fileMap, entryPoint: normalizeSandpackPath(entryPoint) }
}

export interface ProjectFileMap {
  files: Record<string, string>
  entryPoint: string
}

const AGENT_FILES_RETRY_DELAY_MS = 800

async function fetchProjectFilesFromAgentDisk(projectId: string): Promise<ProjectFileMap | null> {
  try {
    const result = await backendGet<{
      success: boolean
      files: Record<string, string>
      entryPoint: string
    }>(`/api/project-files/${projectId}`)
    if (result.files && Object.keys(result.files).length > 0) {
      return { files: result.files, entryPoint: result.entryPoint || '/App.tsx' }
    }
  } catch {
    /* agent disk read failed — caller may retry after runtime wake */
  }
  return null
}

export async function fetchAllProjectFiles(projectId: string): Promise<ProjectFileMap> {
  let fromAgent = await fetchProjectFilesFromAgentDisk(projectId)
  if (fromAgent) return fromAgent
  await new Promise((r) => setTimeout(r, AGENT_FILES_RETRY_DELAY_MS))
  fromAgent = await fetchProjectFilesFromAgentDisk(projectId)
  if (fromAgent) return fromAgent
  return buildSandpackFileMap(projectId)
}

export async function saveProjectFile(
  projectId: string,
  path: string,
  content: string,
): Promise<void> {
  await backendPut(`/api/projects/${projectId}/files`, {
    path: denormalizeSandpackPath(path),
    content,
  })
}

export async function deleteProjectFile(projectId: string, path: string): Promise<void> {
  const response = await backendFetch(`/api/projects/${projectId}/files`, {
    method: 'DELETE',
    body: JSON.stringify({ path: denormalizeSandpackPath(path) }),
  })
  if (!response.ok) throw new Error(`Backend error ${response.status}`)
}

export function normalizeSandpackPath(path: string): string {
  const p = path.trim().replace(/^\/+/, '')
  return p ? `/${p}` : '/App.tsx'
}

export function denormalizeSandpackPath(path: string): string {
  return path.replace(/^\/+/, '')
}
