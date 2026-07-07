'use client'

import {
  backendDelete,
  backendFetch,
  backendGet,
  backendPatch,
  backendPost,
} from '@/lib/api/backend-client'
import type { GitHubRepoSummary, ProjectRepo } from '../types'

export async function listProjects(): Promise<ProjectRepo[]> {
  const result = await backendGet<{ success: boolean; projects: ProjectRepo[] }>('/api/projects')
  return result.projects ?? []
}

export async function getProject(projectId: string): Promise<ProjectRepo> {
  const result = await backendGet<{ success: boolean; project: ProjectRepo }>(
    `/api/projects/${projectId}`,
  )
  return result.project
}

export async function createProject(input: {
  name: string
  description?: string
  conversation_id?: string | null
}): Promise<ProjectRepo> {
  const result = await backendPost<{ success: boolean; project: ProjectRepo }>(
    '/api/projects',
    input,
  )
  return result.project
}

export async function renameProject(projectId: string, name: string): Promise<ProjectRepo> {
  const result = await backendPatch<{ success: boolean; project: ProjectRepo }>(
    `/api/projects/${projectId}`,
    { name },
  )
  return result.project
}

export async function deleteProject(projectId: string): Promise<void> {
  await backendDelete(`/api/projects/${projectId}`)
}

export async function importGitHubProject(input: {
  repo_full_name: string
  branch?: string
}): Promise<ProjectRepo> {
  const result = await backendPost<{ success: boolean; project: ProjectRepo }>(
    '/api/projects/import/github',
    input,
  )
  return result.project
}

export async function listGitHubRepos(): Promise<GitHubRepoSummary[]> {
  const result = await backendGet<{ success: boolean; repos: GitHubRepoSummary[] }>(
    '/api/integrations/github/repos',
  )
  return result.repos ?? []
}

export async function restartProjectApp(projectId: string): Promise<void> {
  const response = await backendFetch(`/api/apps/${projectId}/restart`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error(`Failed to restart project (${response.status})`)
}

export async function publishProject(
  projectId: string,
): Promise<{ slug: string; publish_status: string }> {
  const result = await backendPost<{
    success: boolean
    slug: string
    publish_status: string
  }>(`/api/projects/${projectId}/publish`, {})
  return { slug: result.slug, publish_status: result.publish_status }
}

export async function unpublishProject(projectId: string): Promise<void> {
  await backendPost(`/api/projects/${projectId}/unpublish`, {})
}

export async function ensureSandboxRunning(
  projectId: string,
): Promise<{ tunnelUrl: string; sandboxId: string; status: string }> {
  return backendPost<{ tunnelUrl: string; sandboxId: string; status: string }>(
    `/api/sandboxes/${projectId}/ensure-running`,
    {},
  )
}

export async function connectProjectDomain(
  projectId: string,
  domainId: string,
): Promise<{ published_url: string | null }> {
  const result = await backendPost<{
    success: boolean
    published_url?: string | null
  }>('/api/domains/connect-project', {
    domain_id: domainId,
    project_id: projectId,
  })
  return { published_url: result.published_url ?? null }
}
