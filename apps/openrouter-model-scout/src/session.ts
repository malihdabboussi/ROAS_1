import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ConversationState, StateAccessor } from '@openrouter/agent'

type SessionEvent =
  | { created_at: string; session_id: string; type: 'session' }
  | { created_at: string; text: string; type: 'user' }
  | {
      created_at: string
      model: string
      response_id: string
      text: string
      type: 'assistant'
    }
  | { created_at: string; state: ConversationState; type: 'agent_state' }

export class ModelScoutSession {
  private constructor(
    readonly id: string,
    readonly path: string,
    private lastResponseId?: string,
    private conversationState: ConversationState | null = null,
  ) {}

  get previousResponseId(): string | undefined {
    return this.conversationState?.previousResponseId ?? this.lastResponseId
  }

  get state(): StateAccessor {
    return {
      load: async () => this.conversationState,
      save: async (state) => {
        this.conversationState = state
        this.lastResponseId = state.previousResponseId
        await this.append({
          created_at: new Date().toISOString(),
          state,
          type: 'agent_state',
        })
      },
    }
  }

  static async create(sessionDir: string): Promise<ModelScoutSession> {
    await mkdir(sessionDir, { recursive: true })
    const id = randomUUID()
    const session = new ModelScoutSession(id, join(sessionDir, `${Date.now()}-${id}.jsonl`))
    await session.append({
      created_at: new Date().toISOString(),
      session_id: id,
      type: 'session',
    })
    return session
  }

  static async resumeLatest(sessionDir: string): Promise<ModelScoutSession | null> {
    await mkdir(sessionDir, { recursive: true })
    const files = (await readdir(sessionDir))
      .filter((name) => name.endsWith('.jsonl'))
      .sort()
      .reverse()
    const latest = files[0]
    if (!latest) return null

    const path = join(sessionDir, latest)
    const events = (await readFile(path, 'utf8'))
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as SessionEvent)
    const sessionEvent = events.find(
      (event): event is Extract<SessionEvent, { type: 'session' }> => event.type === 'session',
    )
    if (!sessionEvent) return null
    const assistantEvents = events.filter(
      (event): event is Extract<SessionEvent, { type: 'assistant' }> => event.type === 'assistant',
    )
    const stateEvents = events.filter(
      (event): event is Extract<SessionEvent, { type: 'agent_state' }> =>
        event.type === 'agent_state',
    )
    return new ModelScoutSession(
      sessionEvent.session_id,
      path,
      assistantEvents.at(-1)?.response_id,
      stateEvents.at(-1)?.state ?? null,
    )
  }

  async appendUser(text: string): Promise<void> {
    await this.append({ created_at: new Date().toISOString(), text, type: 'user' })
  }

  async appendAssistant(input: { model: string; responseId: string; text: string }): Promise<void> {
    this.lastResponseId = input.responseId
    await this.append({
      created_at: new Date().toISOString(),
      model: input.model,
      response_id: input.responseId,
      text: input.text,
      type: 'assistant',
    })
  }

  private async append(event: SessionEvent): Promise<void> {
    await appendFile(this.path, `${JSON.stringify(event)}\n`, 'utf8')
  }
}
