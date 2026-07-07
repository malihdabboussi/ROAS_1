import * as fs from 'fs/promises'
import * as path from 'path'
import { Injectable, Logger } from '@nestjs/common'
import type { SyncManifestEntry, SyncResult } from './agent-sync.types'

@Injectable()
export class AgentSyncVerificationService {
  async verifySyncManifest(manifest: SyncManifestEntry[]): Promise<void> {
    for (const entry of manifest) {
      if (entry.status !== 'ok') continue
      try {
        await fs.access(entry.filePath)
      } catch {
        entry.status = 'failed'
        entry.error = 'written-but-missing'
      }
    }
  }

  async retryFailedEntries(
    manifest: SyncManifestEntry[],
  ): Promise<{ retried: number; retriedOk: number }> {
    const failed = manifest.filter((entry) => entry.status === 'failed')
    let retried = 0
    let retriedOk = 0
    for (const entry of failed) {
      retried++
      if (entry.content === undefined) {
        entry.error = 'retry-failed: missing content'
        continue
      }
      try {
        await fs.mkdir(path.dirname(entry.filePath), { recursive: true })
        await fs.writeFile(entry.filePath, entry.content, 'utf-8')
        entry.status = 'ok'
        entry.error = undefined
        retriedOk++
      } catch (err) {
        entry.error = `retry-failed: ${(err as Error).message}`
      }
    }
    return { retried, retriedOk }
  }

  buildSyncResult(
    manifest: SyncManifestEntry[],
    retried: number,
    retriedOk: number,
  ): SyncResult {
    const expected = manifest.length
    const succeeded = manifest.filter((entry) => entry.status === 'ok').length
    const failed = manifest
      .filter((entry) => entry.status === 'failed')
      .map((entry) => ({
        agentKey: entry.agentKey,
        filePath: entry.filePath,
        category: entry.category,
        error: entry.error,
      }))
    return { synced: succeeded, expected, failed, retried, retriedOk, healthy: failed.length === 0 }
  }

  async verifyAndRetry(input: {
    logger: Logger
    manifest: SyncManifestEntry[]
  }): Promise<SyncResult> {
    await this.verifySyncManifest(input.manifest)
    const failedBefore = input.manifest.filter((entry) => entry.status === 'failed').length
    let retried = 0
    let retriedOk = 0
    if (failedBefore > 0) {
      input.logger.warn(`[sync:verify] ${failedBefore} file(s) need retry`)
      const retryResult = await this.retryFailedEntries(input.manifest)
      retried = retryResult.retried
      retriedOk = retryResult.retriedOk
    }
    const result = this.buildSyncResult(input.manifest, retried, retriedOk)
    if (!result.healthy) {
      input.logger.error(
        `[sync:verify] ${result.failed.length} file(s) still failed after retry: ${result.failed.map((failure) => failure.filePath).join(', ')}`,
      )
    } else if (retried > 0) {
      input.logger.log(
        `[sync:verify] All ${result.expected} files verified OK (${retriedOk} recovered via retry)`,
      )
    } else {
      input.logger.log(`[sync:verify] All ${result.expected} files verified OK`)
    }
    return result
  }
}
