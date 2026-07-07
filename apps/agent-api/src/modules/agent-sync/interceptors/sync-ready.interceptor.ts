import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { from, Observable } from 'rxjs'
import { switchMap } from 'rxjs/operators'
import { AgentSyncService } from '../services/agent-sync.service'

/**
 * Nest interceptor that blocks request handling until machine identity is ready.
 *
 * Why: an agent-api machine can be reachable on HTTP (Nest listening, `/api/health`
 * returning 200) before `AgentSyncService.bootstrapAsync()` has resolved the
 * machine's USER_ID. Agent files are hydrated later by per-runtime readiness
 * checks after each request resolves its exact personal/org agent target.
 *
 * This interceptor is the last-line identity defense: apply it to every
 * agent-serving controller so early requests block (up to 30s) before scoped
 * runtime sync starts.
 *
 * Idempotent by design — `waitForSyncReady` returns immediately once the status
 * has resolved to 'ok' or 'failed'. Only requests arriving during the 'pending'
 * window actually await.
 *
 * Usage:
 *   @UseInterceptors(SyncReadyInterceptor)
 *   @Controller('chat')
 *   export class ChatController { ... }
 */
@Injectable()
export class SyncReadyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SyncReadyInterceptor.name)
  /** Max time to block before proceeding in degraded mode. Matches waitForSyncReady default. */
  private static readonly WAIT_TIMEOUT_MS = 30_000

  constructor(private readonly syncService: AgentSyncService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return from(this.syncService.waitForSyncReady(SyncReadyInterceptor.WAIT_TIMEOUT_MS)).pipe(
      switchMap(() => next.handle()),
    )
  }
}
