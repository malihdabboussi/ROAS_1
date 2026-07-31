import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ConversationState } from '@openrouter/agent'
import { describe, expect, it } from 'vitest'
import { ModelScoutSession } from './session.js'

describe('ModelScoutSession', () => {
  it('persists append-only JSONL and resumes the latest response id', async () => {
    const sessionDir = await mkdtemp(join(tmpdir(), 'model-scout-'))
    const session = await ModelScoutSession.create(sessionDir)

    await session.appendUser('Find the cheapest tool model')
    await session.appendAssistant({
      model: 'openai/gpt-5.6-luna',
      responseId: 'response-1',
      text: 'Use Luna.',
    })

    const resumed = await ModelScoutSession.resumeLatest(sessionDir)
    expect(resumed?.previousResponseId).toBe('response-1')
    expect(resumed?.id).toBe(session.id)

    const lines = (await readFile(session.path, 'utf8')).trim().split('\n')
    expect(lines).toHaveLength(3)
    expect(JSON.parse(lines[2] ?? '{}')).toMatchObject({
      type: 'assistant',
      response_id: 'response-1',
    })
  })

  it('persists and resumes the Agent SDK conversation state', async () => {
    const sessionDir = await mkdtemp(join(tmpdir(), 'model-scout-state-'))
    const session = await ModelScoutSession.create(sessionDir)
    const state = {
      createdAt: Date.now(),
      id: session.id,
      messages: [],
      previousResponseId: 'response-state-1',
      status: 'complete',
      updatedAt: Date.now(),
    } satisfies ConversationState

    await session.state.save(state)

    const resumed = await ModelScoutSession.resumeLatest(sessionDir)
    await expect(resumed?.state.load()).resolves.toMatchObject({
      id: session.id,
      previousResponseId: 'response-state-1',
      status: 'complete',
    })
  })
})
