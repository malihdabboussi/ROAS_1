import { Injectable, Logger } from '@nestjs/common'
import type { SendFn } from './openclaw-proxy.service'

interface StreamMirrorEvent {
  type: string
  payloadJson: string
}

interface PreRunStreamEvent {
  type: string
  payload: Record<string, unknown>
}

export interface ChatStreamMirrorState {
  enabled: boolean
  diagnostic: string
  liveEvents: StreamMirrorEvent[]
  redisEvents: StreamMirrorEvent[]
  preRunEvents: PreRunStreamEvent[]
}

@Injectable()
export class ChatStreamMirrorService {
  createState(options: { enabled: boolean; diagnostic: string }): ChatStreamMirrorState {
    return {
      enabled: options.enabled,
      diagnostic: options.diagnostic,
      liveEvents: [],
      redisEvents: [],
      preRunEvents: [],
    }
  }

  recordLiveEvent(
    state: ChatStreamMirrorState,
    type: string,
    payload: Record<string, unknown>,
  ): void {
    if (!state.enabled) return
    state.liveEvents.push({ type, payloadJson: this.serializePayload(payload) })
  }

  recordRedisEvent(
    state: ChatStreamMirrorState,
    type: string,
    payload: Record<string, unknown>,
  ): void {
    if (!state.enabled) return
    state.redisEvents.push({ type, payloadJson: this.serializePayload(payload) })
  }

  async sendPreRunEvent(
    state: ChatStreamMirrorState,
    type: string,
    payload: Record<string, unknown>,
    send: SendFn,
  ): Promise<void> {
    this.recordLiveEvent(state, type, payload)
    state.preRunEvents.push({ type, payload })
    await send(type, payload)
  }

  async flushPreRunEvents(
    state: ChatStreamMirrorState,
    appendRunEventOnly: (
      type: string,
      data: Record<string, unknown>,
    ) => Promise<string | null>,
  ): Promise<void> {
    for (const event of state.preRunEvents) {
      await appendRunEventOnly(event.type, event.payload)
    }
    state.preRunEvents.length = 0
  }

  verify(state: ChatStreamMirrorState, terminalType: 'done' | 'error', logger: Logger): void {
    if (!state.enabled) return
    if (state.redisEvents.length === 0) {
      logger.warn(
        `[ChatRunRedisShadow] no redis events captured terminal=${terminalType} ${state.diagnostic} live=${state.liveEvents.length}`,
      )
      return
    }
    const mismatchIndex = state.liveEvents.findIndex((live, index) => {
      const redis = state.redisEvents[index]
      return !redis || live.type !== redis.type || live.payloadJson !== redis.payloadJson
    })
    if (mismatchIndex !== -1 || state.liveEvents.length !== state.redisEvents.length) {
      logger.warn(
        `[ChatRunRedisShadow] mismatch terminal=${terminalType} ${state.diagnostic} live=${state.liveEvents.length} redis=${state.redisEvents.length} firstMismatch=${mismatchIndex}`,
      )
      return
    }
    logger.log(
      `[ChatRunRedisShadow] match terminal=${terminalType} ${state.diagnostic} events=${state.liveEvents.length}`,
    )
  }

  private serializePayload(payload: Record<string, unknown>): string {
    try {
      return JSON.stringify(payload ?? {})
    } catch {
      return '[unserializable]'
    }
  }
}
