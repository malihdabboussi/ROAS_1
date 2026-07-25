import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FunnelPageBundle } from '../services/artifact-preview.service'
import { useFunnelDesignChatStore } from './use-funnel-design-chat-store'

const serviceMocks = vi.hoisted(() => ({
  saveFunnelFile: vi.fn(),
}))

vi.mock('../services/artifact-preview.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/artifact-preview.service')>()),
  saveFunnelFile: serviceMocks.saveFunnelFile,
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const bundle = {
  files: [{ path: 'index.html', content: 'initial', funnel_page_id: 'page-1' }],
  shared_files: [],
} as unknown as FunnelPageBundle

describe('funnel design save queue', () => {
  beforeEach(() => {
    serviceMocks.saveFunnelFile.mockReset()
    useFunnelDesignChatStore.getState().clearSession()
    useFunnelDesignChatStore.getState().registerSession({
      funnelId: 'funnel-1',
      funnelName: 'Test funnel',
    })
    useFunnelDesignChatStore.getState().setBundle(bundle)
  })

  it('persists edits to the same file in order so an older request cannot win', async () => {
    const first = deferred<{ path: string; content: string }>()
    const second = deferred<{ path: string; content: string }>()
    serviceMocks.saveFunnelFile
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    useFunnelDesignChatStore.getState().saveFile('index.html', 'first')
    useFunnelDesignChatStore.getState().saveFile('index.html', 'second')
    await vi.waitFor(() => expect(serviceMocks.saveFunnelFile).toHaveBeenCalledTimes(1))

    first.resolve({ path: 'index.html', content: 'first' })
    await vi.waitFor(() => expect(serviceMocks.saveFunnelFile).toHaveBeenCalledTimes(2))
    expect(serviceMocks.saveFunnelFile.mock.calls[1]?.[2]).toBe('second')

    second.resolve({ path: 'index.html', content: 'second' })
    await vi.waitFor(() => expect(useFunnelDesignChatStore.getState().saveStatus).toBe('saved'))
    expect(useFunnelDesignChatStore.getState().bundle?.files[0]?.content).toBe('second')
  })
})
