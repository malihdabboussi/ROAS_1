import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { RequestScope } from '@vibey/api-shared'
import { ProjectFilesController } from './controllers/project-files.controller'
import { ProjectRuntimeRepository } from './repositories/project-runtime.repository'
import { ProjectFilesService } from './services/project-files.service'

function createProjectQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return query
}

function createController(result: { data: unknown; error: unknown }) {
  const query = createProjectQuery(result)
  const supabase = {
    from: vi.fn(() => query),
    storage: {
      from: vi.fn(),
    },
  }
  const modalFileIo = {
    listProjectFiles: vi.fn(),
    readProjectFile: vi.fn(),
  }
  const projectFilesService = new ProjectFilesService(
    modalFileIo as never,
    new ProjectRuntimeRepository({ client: supabase } as never),
  )

  return {
    controller: new ProjectFilesController(projectFilesService),
    modalFileIo,
    query,
    supabase,
  }
}

const personalScope: RequestScope = {
  userId: 'user-1',
  orgId: null,
  orgRole: null,
}

describe('ProjectFilesController', () => {
  it('rejects project file reads before touching the sandbox when ownership check fails', async () => {
    const { controller, modalFileIo, query } = createController({ data: null, error: null })

    await expect(controller.getAllFiles(personalScope, 'project-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    )

    expect(query.eq).toHaveBeenCalledWith('id', 'project-1')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(query.is).toHaveBeenCalledWith('org_id', null)
    expect(modalFileIo.listProjectFiles).not.toHaveBeenCalled()
    expect(modalFileIo.readProjectFile).not.toHaveBeenCalled()
  })

  it('uses the authorized project row when falling back to storage', async () => {
    const { controller, modalFileIo, supabase } = createController({
      data: {
        id: 'project-1',
        storage_path: 'user-1/project-1',
        manifest: { files: ['app/page.tsx', 'pnpm-lock.yaml'] },
      },
      error: null,
    })
    const download = vi.fn().mockResolvedValue({
      data: { text: vi.fn().mockResolvedValue('export default function Page() {}') },
      error: null,
    })
    supabase.storage.from.mockReturnValue({ download })
    modalFileIo.listProjectFiles.mockResolvedValue([])

    const result = await controller.getAllFiles(personalScope, 'project-1')

    expect(download).toHaveBeenCalledWith('user-1/project-1/app/page.tsx')
    expect(result).toEqual({
      success: true,
      files: { '/app/page.tsx': 'export default function Page() {}' },
      entryPoint: '/app/page.tsx',
    })
  })
})
