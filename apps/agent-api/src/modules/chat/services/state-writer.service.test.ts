import { describe, expect, it, vi } from 'vitest'
import { StateWriterService } from './state-writer.service'

describe('StateWriterService', () => {
  it('returns a compact state reminder when persisted state has real content', async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        state_content: [
          '# STATE.md - Current Working State',
          '',
          '## Active Work',
          'Build the thing',
          '## Recent Actions',
          'Moved the file',
        ].join('\n'),
      },
      error: null,
    }))
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle,
    }
    const service = new StateWriterService({ client: { from: vi.fn(() => query) } } as any)

    await expect(service.readStateReminder('user-1', 'vibey')).resolves.toContain(
      'CURRENT_STATE:',
    )
    expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'user-1')
    expect(query.eq).toHaveBeenNthCalledWith(2, 'agent_id', 'vibey')
  })
})
