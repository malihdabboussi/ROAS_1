import { describe, expect, it, vi } from 'vitest'
import { ArtifactProjectsService } from './artifact-projects.service'

function makeRuntime() {
  const modalFileIo = {
    ensureProjectDir: vi.fn(),
    writeProjectFile: vi.fn(async () => undefined),
    readProjectFile: vi.fn(async () => 'secret file'),
    deleteProjectFile: vi.fn(async () => undefined),
    listProjectFiles: vi.fn(async () => ['README.md']),
    runInstall: vi.fn(async () => undefined),
    runProjectValidation: vi.fn(async () => []),
    getProjectLogs: vi.fn(async () => ({ stdout: 'logs', stderr: '' })),
    searchProjectFiles: vi.fn(async () => []),
    listProjectDirectory: vi.fn(async () => []),
  }
  const storageSync = {
    queueUpsert: vi.fn(),
    queueDelete: vi.fn(),
    queueManifestUpdate: vi.fn(async () => undefined),
  }
  const service = new ArtifactProjectsService()
  service.setRuntimeServices(modalFileIo as never, storageSync as never)
  return { service, modalFileIo, storageSync }
}

function makeTarget(project: Record<string, unknown> | null, events: string[] = []) {
  return {
    parseConversationId: vi.fn(() => null),
    resolveUserId: vi.fn(() => 'user-1'),
    streamRegistry: null,
    mainApiCall: vi.fn(async (method: string, path: string) => {
      if (method === 'GET' && path === '/api/projects/project-1') {
        events.push('authorize')
        return project ? { project } : null
      }
      if (method === 'PATCH' && path === '/api/projects/project-1') {
        events.push('patch-project')
        return { success: true }
      }
      if (method === 'POST' && path === '/api/sandboxes/project-1/ensure-running') {
        events.push('ensure-running')
        return { status: 'running', tunnelUrl: 'https://preview.example' }
      }
      return { success: true }
    }),
  }
}

describe('ArtifactProjectsService runtime authorization', () => {
  it('rejects read_file before touching Modal when project ownership cannot be verified', async () => {
    const { service, modalFileIo } = makeRuntime()
    const target = makeTarget(null)
    const handlers = service.getHandlers(target as never)

    const result = (await handlers.read_file(
      { project_id: 'project-1', path: 'README.md' },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error)).toMatch(/not found|access denied/i)
    expect(target.mainApiCall).toHaveBeenCalledWith('GET', '/api/projects/project-1', 'session-1')
    expect(modalFileIo.readProjectFile).not.toHaveBeenCalled()
  })

  it('rejects create_file before touching Modal when project ownership cannot be verified', async () => {
    const { service, modalFileIo } = makeRuntime()
    const target = makeTarget(null)
    const handlers = service.getHandlers(target as never)

    const result = (await handlers.create_file(
      { project_id: 'project-1', path: 'README.md', content: 'hello' },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error)).toMatch(/not found|access denied/i)
    expect(modalFileIo.writeProjectFile).not.toHaveBeenCalled()
    expect(modalFileIo.listProjectFiles).not.toHaveBeenCalled()
  })

  it('rejects list_project_files before touching Modal when project ownership cannot be verified', async () => {
    const { service, modalFileIo } = makeRuntime()
    const target = makeTarget(null)
    const handlers = service.getHandlers(target as never)

    const result = (await handlers.list_project_files(
      { project_id: 'project-1' },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error)).toMatch(/not found|access denied/i)
    expect(modalFileIo.listProjectFiles).not.toHaveBeenCalled()
  })

  it('authorizes before writing Modal files and queues storage with the authorized project path', async () => {
    const events: string[] = []
    const { service, modalFileIo, storageSync } = makeRuntime()
    modalFileIo.writeProjectFile.mockImplementation(async () => {
      events.push('write-modal')
    })
    modalFileIo.listProjectFiles.mockImplementation(async () => {
      events.push('list-modal')
      return ['README.md']
    })
    const target = makeTarget({ id: 'project-1', storage_path: 'user-1/project-1' }, events)
    const handlers = service.getHandlers(target as never)

    const result = (await handlers.update_file(
      { project_id: 'project-1', path: 'README.md', content: 'hello' },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(true)
    expect(events.slice(0, 3)).toEqual(['authorize', 'write-modal', 'list-modal'])
    expect(storageSync.queueUpsert).toHaveBeenCalledWith(
      'project-1',
      'user-1/project-1',
      'README.md',
      'hello',
    )
  })

  it('authorizes patch_file before reading or writing Modal files', async () => {
    const { service, modalFileIo } = makeRuntime()
    const target = makeTarget(null)
    const handlers = service.getHandlers(target as never)

    const result = (await handlers.patch_file(
      { project_id: 'project-1', path: 'README.md', find: 'old', replace: 'new' },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error)).toMatch(/not found|access denied/i)
    expect(modalFileIo.readProjectFile).not.toHaveBeenCalled()
    expect(modalFileIo.writeProjectFile).not.toHaveBeenCalled()
  })

  it('authorizes search_project_files before touching Modal search', async () => {
    const { service, modalFileIo } = makeRuntime()
    const target = makeTarget(null)
    const handlers = service.getHandlers(target as never)

    const result = (await handlers.search_project_files(
      { project_id: 'project-1', query: 'secret' },
      'session-1',
    )) as Record<string, unknown>

    expect(result.success).toBe(false)
    expect(String(result.error)).toMatch(/not found|access denied/i)
    expect(modalFileIo.searchProjectFiles).not.toHaveBeenCalled()
  })
})
