import { Injectable } from '@nestjs/common'

@Injectable()
export class GoogleDriveContentCacheService {
  private static readonly MAX_ITEMS = 200
  private readonly contentCache = new Map<string, unknown>()

  get<T>(key: string): T | null {
    const value = this.contentCache.get(key)
    if (!value) return null
    this.contentCache.delete(key)
    this.contentCache.set(key, value)
    return value as T
  }

  set(key: string, value: unknown): void {
    if (this.contentCache.has(key)) {
      this.contentCache.delete(key)
    }
    this.contentCache.set(key, value)
    while (this.contentCache.size > GoogleDriveContentCacheService.MAX_ITEMS) {
      const oldestKey = this.contentCache.keys().next().value
      if (!oldestKey) break
      this.contentCache.delete(oldestKey)
    }
  }
}
