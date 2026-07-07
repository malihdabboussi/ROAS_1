import '@testing-library/jest-dom/vitest'
import { TextEncoder as NodeTextEncoder, TextDecoder } from 'util'
import { vi } from 'vitest'

class TextEncoder extends NodeTextEncoder {
  override encode(input?: string): Uint8Array {
    const r = super.encode(input ?? '')
    return Uint8Array.from(r)
  }
}

Object.assign(globalThis, { TextDecoder, TextEncoder })

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    get length() {
      return store.size
    },
  } as unknown as Storage
}

// Vitest + Node can provide a non-DOM localStorage implementation. Zustand persist expects
// Storage-like methods (getItem/setItem/removeItem). Ensure a stable implementation.
const hasValidLocalStorage =
  typeof window !== 'undefined' &&
  typeof (window as any).localStorage?.getItem === 'function' &&
  typeof (window as any).localStorage?.setItem === 'function' &&
  typeof (window as any).localStorage?.removeItem === 'function'

if (!hasValidLocalStorage && typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: createMemoryStorage(),
    configurable: true,
  })
}
