import { Injectable, Logger } from '@nestjs/common'
import { SandboxesRepository } from '../repositories/sandboxes.repository'
import { SandboxService } from './sandbox.service'

@Injectable()
export class SandboxIdleManagerService {
  private readonly logger = new Logger(SandboxIdleManagerService.name)
  private readonly IDLE_THRESHOLD_MS = parseInt(
    process.env.SANDBOX_IDLE_THRESHOLD_MS ?? String(15 * 60 * 1000),
    10,
  )

  constructor(
    private readonly sandboxService: SandboxService,
    private readonly repository: SandboxesRepository,
  ) {}

  async checkIdleSandboxes(): Promise<{ checked: number; terminated: number }> {
    const cutoff = new Date(Date.now() - this.IDLE_THRESHOLD_MS).toISOString()

    const idleProjects = await this.repository.listIdleProjects(cutoff)

    if (!idleProjects?.length) {
      return { checked: 0, terminated: 0 }
    }

    this.logger.log(`Found ${idleProjects.length} idle sandbox(es) to terminate`)
    let terminated = 0

    for (const project of idleProjects) {
      try {
        await this.sandboxService.terminate(this.repository.getServiceClient(), project.id)
        terminated++
      } catch (err) {
        this.logger.error(`Failed to terminate sandbox for project ${project.id}: ${err}`)
      }
    }

    return { checked: idleProjects.length, terminated }
  }
}
