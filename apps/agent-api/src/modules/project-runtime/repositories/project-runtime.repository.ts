import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope, SupabaseServiceClient, type RequestScope } from '@vibey/api-shared'

export type ProjectFileAccessRow = {
  id: string
  storage_path: string
  manifest: Record<string, unknown> | null
}

type StorageResult<T = unknown> = Promise<{ data: T | null; error: { message?: string } | null }>

@Injectable()
export class ProjectRuntimeRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  get client(): SupabaseClient {
    return this.svc.client
  }

  async findProjectForRestart(scope: RequestScope, projectId: string) {
    let query = this.svc.client.from('project_repos').select('id, user_id').eq('id', projectId)
    query = applyOwnerScope(query, scope)
    return query.maybeSingle()
  }

  async markProjectStarting(projectId: string, userId: string) {
    return this.svc.client
      .from('project_repos')
      .update({ deploy_status: 'starting', deploy_error: null })
      .eq('id', projectId)
      .eq('user_id', userId)
  }

  async markProjectRunning(projectId: string) {
    return this.svc.client
      .from('project_repos')
      .update({
        status: 'running',
        deploy_status: 'running',
        deploy_error: null,
        last_deployed_at: new Date().toISOString(),
      })
      .eq('id', projectId)
  }

  async markProjectRestartError(projectId: string, error: string) {
    return this.svc.client
      .from('project_repos')
      .update({
        deploy_status: 'error',
        deploy_error: error,
      })
      .eq('id', projectId)
  }

  async findProjectFileAccess(scope: RequestScope, projectId: string) {
    const projectQuery = this.svc.client
      .from('project_repos')
      .select('id, storage_path, manifest')
      .eq('id', projectId)
    const query = applyOwnerScope(projectQuery, scope)
    return query.maybeSingle() as unknown as Promise<{
      data: ProjectFileAccessRow | null
      error: unknown
    }>
  }

  async downloadProjectStorageFile(storagePath: string, filePath: string): StorageResult<Blob> {
    return this.svc.client.storage.from('projects').download(`${storagePath}/${filePath}`)
  }

  async findHydrationProject(projectId: string) {
    return this.svc.client
      .from('project_repos')
      .select('storage_path, manifest')
      .eq('id', projectId)
      .maybeSingle()
  }

  async updateManifest(projectId: string, userId: string, manifest: Record<string, unknown>) {
    return this.svc.client
      .from('project_repos')
      .update({ manifest, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', userId)
  }

  async uploadProjectFile(
    storagePath: string,
    filePath: string,
    content: string,
    contentType: string,
  ): StorageResult {
    return this.svc.client.storage
      .from('projects')
      .upload(`${storagePath}/${filePath}`, content, { upsert: true, contentType })
  }

  async deleteProjectFile(storagePath: string, filePath: string): StorageResult {
    return this.svc.client.storage.from('projects').remove([`${storagePath}/${filePath}`])
  }

  async downloadProjectFile(storagePath: string, filePath: string): StorageResult<Blob> {
    return this.svc.client.storage.from('projects').download(`${storagePath}/${filePath}`)
  }

  async findAgentCallProject(projectId: string) {
    return this.svc.client
      .from('project_repos')
      .select('user_id, org_id')
      .eq('id', projectId)
      .maybeSingle()
  }
}
