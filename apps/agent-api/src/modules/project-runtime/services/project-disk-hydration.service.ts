import { Injectable, Logger } from '@nestjs/common'
import { ProjectRuntimeRepository } from '../repositories/project-runtime.repository'
import { ModalFileIoService } from './modal-file-io.service'
import { ProjectStorageSyncService } from './project-storage-sync.service'

@Injectable()
export class ProjectDiskHydrationService {
  private readonly logger = new Logger(ProjectDiskHydrationService.name)

  constructor(
    private readonly modalFileIo: ModalFileIoService,
    private readonly storageSync: ProjectStorageSyncService,
    private readonly repository: ProjectRuntimeRepository,
  ) {}

  /**
   * Loads manifest-listed files from the `projects` bucket into the local project directory.
   * @returns Number of files successfully written.
   */
  async hydrateProjectFilesFromStorage(projectId: string): Promise<number> {
    try {
      const { data: project, error } = await this.repository.findHydrationProject(projectId)

      if (error || !project?.storage_path) return 0

      if (!project.storage_path.endsWith(projectId)) {
        this.logger.error(
          `[${projectId}] Hydration skipped: storage_path does not end with project id`,
        )
        return 0
      }

      const fileList = this.getManifestFiles(project.manifest as Record<string, unknown>)
      if (fileList.length === 0) return 0

      this.logger.log(`[${projectId}] Hydrating ${fileList.length} files from storage`)

      const downloaded = await this.storageSync.downloadAllFiles(project.storage_path, fileList)
      await this.modalFileIo.ensureProjectDir(projectId)
      for (const [filePath, content] of downloaded) {
        await this.modalFileIo.writeProjectFile(projectId, filePath, content)
      }

      this.logger.log(`[${projectId}] Hydrated ${downloaded.size} files to disk`)
      return downloaded.size
    } catch (err) {
      this.logger.warn(
        `[${projectId}] Hydration failed: ${err instanceof Error ? err.message : String(err)}`,
      )
      return 0
    }
  }

  private getManifestFiles(manifest: Record<string, unknown> | null): string[] {
    if (!manifest || typeof manifest !== 'object') return []
    const files = manifest.files
    if (!Array.isArray(files)) return []
    return files.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
  }
}
