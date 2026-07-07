import { InjectQueue } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import type { Queue } from 'bullmq'
import {
  DRIVE_SYNC_QUEUE,
  type DriveSyncJobData,
  type DriveSyncJobResult,
} from './types/drive-sync.types'

@Injectable()
export class DriveSyncQueue {
  constructor(
    @InjectQueue(DRIVE_SYNC_QUEUE)
    private readonly queue: Queue<DriveSyncJobData, DriveSyncJobResult>,
  ) {}

  async enqueue(
    payload: DriveSyncJobData,
    options?: { jobId?: string; delay?: number },
  ): Promise<void> {
    await this.queue.add('run-drive-sync', payload, {
      jobId: options?.jobId,
      delay: options?.delay,
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
    })
  }
}
