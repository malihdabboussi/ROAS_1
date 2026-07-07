import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Job } from 'bullmq'
import type { AgentKey, MissionJobData, MissionPhase, MissionStatus } from '../../types'
import { humanizeMissionError } from '../../utils/mission-humanize-error'
import { AgentSignalService } from '../agent-signal.service'
import { MissionStateRepository } from '../persistence/mission-state.repository'

@Injectable()
export class MissionPhaseSupportService {
  constructor(
    private readonly configService: ConfigService,
    private readonly stateRepo: MissionStateRepository,
    private readonly agentSignalService: AgentSignalService,
  ) {}

  getTimeoutMs(): number {
    return Number(this.configService.get<number>('missions.executionTimeoutMs') || 600000)
  }

  getExecutionAbsoluteMaxMs(): number {
    return Number(this.configService.get<number>('missions.executionAbsoluteMaxMs') || 5_400_000)
  }

  /**
   * Inactivity window resets on `touch()`; absolute max from first touch is not reset.
   * Use with streaming OpenClaw: pass `signal` into fetch and call `touch` on each SSE event.
   */
  createExecutionDeadline(params: {
    inactivityMs: number
    absoluteMaxMs: number
    timeoutMessage: string
    absoluteTimeoutMessage: string
  }): {
    signal: AbortSignal
    /** Same controller as `signal`; use with SubtaskAbortRegistry for instant external abort */
    controller: AbortController
    touch: () => void
    wrap: <T>(promise: Promise<T>) => Promise<T>
    dispose: () => void
  } {
    const ac = new AbortController()
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null
    let absoluteTimer: ReturnType<typeof setTimeout> | null = null
    let rejectFn: ((e: Error) => void) | null = null

    const clearTimers = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      if (absoluteTimer) clearTimeout(absoluteTimer)
      inactivityTimer = null
      absoluteTimer = null
    }

    const fail = (msg: string) => {
      ac.abort()
      rejectFn?.(new Error(msg))
    }

    const touch = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(() => fail(params.timeoutMessage), params.inactivityMs)
    }

    touch()
    absoluteTimer = setTimeout(() => fail(params.absoluteTimeoutMessage), params.absoluteMaxMs)

    return {
      signal: ac.signal,
      controller: ac,
      touch,
      wrap: <T>(promise: Promise<T>) =>
        new Promise<T>((resolve, reject) => {
          rejectFn = reject
          promise.then(
            (v) => {
              clearTimers()
              resolve(v)
            },
            (e) => {
              clearTimers()
              reject(e)
            },
          )
        }),
      dispose: clearTimers,
    }
  }

  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
    abortController?: AbortController,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        abortController?.abort()
        reject(new Error(timeoutMessage))
      }, timeoutMs)
      promise
        .then((value) => {
          clearTimeout(timeoutId)
          resolve(value)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          reject(error)
        })
    })
  }

  async handlePhaseError(
    supabase: SupabaseClient,
    mission: Record<string, any>,
    agentKey: AgentKey,
    errorMessage: string,
    job: Job<MissionJobData>,
  ) {
    const attempts = Number(job.opts.attempts || 3)
    const nextRetryCount = Number(job.attemptsMade || 0) + 1
    const isFinalAttempt = nextRetryCount >= attempts
    const finalStatus: MissionStatus = nextRetryCount >= attempts ? 'failed' : 'error'
    const humanizedError = humanizeMissionError(errorMessage, agentKey, isFinalAttempt)

    await this.stateRepo.updateAgentStatus(
      supabase,
      mission.user_id,
      agentKey,
      'idle',
      mission.org_id ?? null,
    )

    if (!isFinalAttempt) {
      const latest = await this.stateRepo.getMission(
        supabase,
        String(mission.id),
        String(mission.user_id),
        mission.org_id ?? null,
      )
      const preserveStatus = this.resolvePreserveStatus(
        String(latest.status || mission.status),
        job.data.phase,
      )
      await this.stateRepo.updateMissionState(supabase, mission.id, {
        status: preserveStatus,
        error: null,
        current_agent_key: null,
        retry_count: nextRetryCount,
        progress_notes: humanizedError,
      })
      return
    }

    await this.stateRepo.updateMissionState(supabase, mission.id, {
      status: finalStatus,
      error: humanizedError,
      current_agent_key: agentKey,
      retry_count: nextRetryCount,
    })
    await this.stateRepo.insertLog(
      supabase,
      mission,
      'mission.failed',
      mission.status,
      finalStatus,
      {
        error: humanizedError,
        _internal_error: errorMessage,
        retryCount: nextRetryCount,
        attempts,
      },
      agentKey,
    )
    await this.agentSignalService
      .emitSignal(
        String(mission.user_id),
        'mission_failed',
        1.8,
        {
          mission_id: String(mission.id),
          status: finalStatus,
          retry_count: nextRetryCount,
        },
        mission.campaign_id ? String(mission.campaign_id) : undefined,
        mission.org_id ?? null,
      )
      .catch(() => {})
  }

  private resolvePreserveStatus(latestStatus: string, phase: MissionPhase): MissionStatus {
    const s = latestStatus as MissionStatus
    if (s === 'error' || s === 'failed') {
      if (phase === 'review') return 'review'
      if (phase === 'plan') return 'planning'
      return 'in_progress'
    }
    return s
  }
}
