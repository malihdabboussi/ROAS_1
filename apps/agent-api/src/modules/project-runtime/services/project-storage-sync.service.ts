import { Injectable, Logger } from '@nestjs/common'
import { ProjectRuntimeRepository } from '../repositories/project-runtime.repository'

interface SyncJob {
  projectId: string
  storagePath: string
  filePath: string
  content: string
  operation: 'upsert' | 'delete'
  retries: number
}

const MAX_RETRIES = 3
const DEBOUNCE_MS = 2_000

@Injectable()
export class ProjectStorageSyncService {
  private readonly logger = new Logger(ProjectStorageSyncService.name)
  private readonly pendingJobs = new Map<string, SyncJob>()
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private flushing = false

  constructor(private readonly repository: ProjectRuntimeRepository) {}

  queueUpsert(projectId: string, storagePath: string, filePath: string, content: string): void {
    const key = `${projectId}:${filePath}`
    this.pendingJobs.set(key, {
      projectId,
      storagePath,
      filePath,
      content,
      operation: 'upsert',
      retries: 0,
    })
    this.scheduleFlush()
  }

  queueDelete(projectId: string, storagePath: string, filePath: string): void {
    const key = `${projectId}:${filePath}`
    this.pendingJobs.set(key, {
      projectId,
      storagePath,
      filePath,
      content: '',
      operation: 'delete',
      retries: 0,
    })
    this.scheduleFlush()
  }

  async queueManifestUpdate(
    projectId: string,
    userId: string,
    manifest: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.repository.updateManifest(projectId, userId, manifest)
    } catch (err) {
      this.logger.warn(`[Sync] Failed to update manifest for ${projectId}: ${err}`)
    }
  }

  private scheduleFlush(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => void this.flush(), DEBOUNCE_MS)
  }

  async flush(): Promise<void> {
    if (this.flushing) return
    this.flushing = true

    const jobs = Array.from(this.pendingJobs.values())
    this.pendingJobs.clear()

    if (jobs.length === 0) {
      this.flushing = false
      return
    }

    this.logger.log(`[Sync] Flushing ${jobs.length} pending file operations`)

    const failedJobs: SyncJob[] = []

    for (const job of jobs) {
      try {
        if (job.operation === 'upsert') {
          await this.uploadFile(job)
        } else {
          await this.deleteFile(job)
        }
      } catch (err) {
        job.retries++
        if (job.retries < MAX_RETRIES) {
          failedJobs.push(job)
          this.logger.warn(
            `[Sync] Failed ${job.operation} ${job.filePath} (attempt ${job.retries}/${MAX_RETRIES}): ${err}`,
          )
        } else {
          this.logger.error(
            `[Sync] Permanently failed ${job.operation} ${job.filePath} after ${MAX_RETRIES} attempts`,
          )
        }
      }
    }

    for (const job of failedJobs) {
      const key = `${job.projectId}:${job.filePath}`
      if (!this.pendingJobs.has(key)) {
        this.pendingJobs.set(key, job)
      }
    }

    if (failedJobs.length > 0) {
      this.scheduleFlush()
    }

    this.flushing = false
  }

  private async uploadFile(job: SyncJob): Promise<void> {
    const contentType = this.detectContentType(job.filePath)
    const { error } = await this.repository.uploadProjectFile(
      job.storagePath,
      job.filePath,
      job.content,
      contentType,
    )
    if (error) throw new Error(error.message)
  }

  private async deleteFile(job: SyncJob): Promise<void> {
    const { error } = await this.repository.deleteProjectFile(job.storagePath, job.filePath)
    if (error) throw new Error(error.message)
  }

  private detectContentType(filePath: string): string {
    if (filePath.endsWith('.json')) return 'application/json'
    if (filePath.endsWith('.ts')) return 'text/typescript'
    if (filePath.endsWith('.tsx')) return 'text/tsx'
    if (filePath.endsWith('.js')) return 'text/javascript'
    if (filePath.endsWith('.jsx')) return 'text/jsx'
    if (filePath.endsWith('.css')) return 'text/css'
    if (filePath.endsWith('.html')) return 'text/html'
    if (filePath.endsWith('.md')) return 'text/markdown'
    return 'text/plain'
  }

  async downloadAllFiles(storagePath: string, files: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>()
    const CONCURRENCY = 10
    let active = 0
    const queue: Array<() => void> = []
    const next = () => {
      if (queue.length > 0 && active < CONCURRENCY) {
        active++
        queue.shift()!()
      }
    }
    const limit = <T>(fn: () => Promise<T>): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const run = () =>
          fn()
            .then(resolve, reject)
            .finally(() => {
              active--
              next()
            })
        queue.push(run)
        next()
      })

    await Promise.allSettled(
      files.map((filePath) =>
        limit(async () => {
          const fullPath = `${storagePath}/${filePath}`
          const { data, error } = await this.repository.downloadProjectFile(storagePath, filePath)
          if (error || !data) {
            this.logger.warn(`[Sync] Failed to download ${fullPath}: ${error?.message}`)
            return
          }
          result.set(filePath, await data.text())
        }),
      ),
    )
    return result
  }
}
