import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import type { RequestScope } from '@vibey/api-shared'
import {
  ProjectRuntimeRepository,
  type ProjectFileAccessRow,
} from '../repositories/project-runtime.repository'
import { ModalFileIoService } from './modal-file-io.service'

type AuthorizedProject = ProjectFileAccessRow

const SKIP_PATTERNS = [
  /^pnpm-lock\.yaml$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^bun\.lock$/,
  /^tsconfig\.tsbuildinfo$/,
  /^next-env\.d\.ts$/,
]

function shouldSkip(filePath: string): boolean {
  const name = filePath.split('/').pop() ?? filePath
  return SKIP_PATTERNS.some((p) => p.test(name))
}

@Injectable()
export class ProjectFilesService {
  private readonly logger = new Logger(ProjectFilesService.name)

  constructor(
    private readonly modalFileIo: ModalFileIoService,
    private readonly repository: ProjectRuntimeRepository,
  ) {}

  async getAllFiles(scope: RequestScope, projectId: string) {
    const project = await this.authorizeProjectAccess(projectId, scope)
    let filePaths: string[] = []
    let sandboxAvailable = true

    try {
      filePaths = await this.modalFileIo.listProjectFiles(projectId)
    } catch {
      sandboxAvailable = false
      this.logger.log(`[${projectId}] No sandbox running — reading from Supabase Storage`)
    }

    if (!sandboxAvailable || filePaths.length === 0) {
      return this.readFromStorage(project)
    }

    const filtered = filePaths.filter((p) => !shouldSkip(p))

    const files: Record<string, string> = {}
    await Promise.all(
      filtered.map(async (filePath) => {
        try {
          const content = await this.modalFileIo.readProjectFile(projectId, filePath)
          files[`/${filePath}`] = content
        } catch {
          this.logger.warn(`[${projectId}] Failed to read ${filePath}, skipping`)
        }
      }),
    )

    const entryPoint = this.resolveEntryPoint(filtered)
    return { success: true, files, entryPoint }
  }

  private async authorizeProjectAccess(
    projectId: string,
    scope: RequestScope,
  ): Promise<AuthorizedProject> {
    const { data: project, error } = await this.repository.findProjectFileAccess(scope, projectId)

    if (error) {
      throw new ForbiddenException('Project access verification failed')
    }
    if (!project?.storage_path) {
      throw new ForbiddenException('Project not found or access denied')
    }

    return project as AuthorizedProject
  }

  private async readFromStorage(project: AuthorizedProject) {
    const projectId = project.id
    if (!project.storage_path) {
      return { success: true, files: {}, entryPoint: '/App.tsx' }
    }

    const manifest = project.manifest as { files?: string[] } | null
    const fileList = (manifest?.files ?? []).filter(
      (f): f is string => typeof f === 'string' && f.trim().length > 0,
    )
    const filtered = fileList.filter((p) => !shouldSkip(p))

    const files: Record<string, string> = {}
    await Promise.all(
      filtered.map(async (filePath) => {
        try {
          const { data, error } = await this.repository.downloadProjectStorageFile(
            project.storage_path,
            filePath,
          )
          if (error || !data) return
          files[`/${filePath}`] = await data.text()
        } catch {
          this.logger.warn(`[${projectId}] Storage read failed for ${filePath}`)
        }
      }),
    )

    const entryPoint = this.resolveEntryPoint(filtered)
    return { success: true, files, entryPoint }
  }

  private resolveEntryPoint(filePaths: string[]): string {
    const candidates = ['app/page.tsx', 'app/page.jsx', 'src/App.tsx', 'src/App.jsx', 'App.tsx']
    for (const c of candidates) {
      if (filePaths.includes(c)) return `/${c}`
    }
    return filePaths[0] ? `/${filePaths[0]}` : '/App.tsx'
  }
}
