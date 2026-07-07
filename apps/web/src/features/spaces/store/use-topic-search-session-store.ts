'use client'

import { create } from 'zustand'
import {
  createSavedTopicSearch,
  scoreTopicCreators,
  searchSocialTopic,
  topicCreatorKey,
  updateSavedTopicSearch,
  type SavedTopicSearch,
  type TopicSearchResultItem,
} from '../services/social-research.service'
import {
  reportSocialResearchError,
  socialResearchContext,
} from '../lib/report-social-research-error'
import type { SocialPlatform } from '../types/space-schema'

const SCORE_BATCH_SIZE = 4

/**
 * Self-heal: a transient backend/transport blip (cold start, redeploy, reset)
 * shouldn't surface as a hard error. Retry the search a few times — staying in
 * the loading state — before giving up. The server caches results per query, so
 * these retries don't re-charge credits.
 */
const SEARCH_MAX_ATTEMPTS = 4
const SEARCH_RETRY_DELAYS_MS = [1500, 3500, 6000]

const sleepMs = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Only transport-class failures are worth waiting out; 4xx (bad query/platform) fail fast. */
function isTransientSearchError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('backend unavailable') ||
    msg.includes('backend error 5') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504') ||
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('timed out')
  )
}

export type TopicSortMode = 'relevance' | 'outlier_score' | 'play_count'

/**
 * One live topic-search session per research view (`spaceId:viewId`).
 *
 * Sessions live in a module-level store — NOT component state — so a search
 * (and its progressive outlier scoring) keeps running while the user works in
 * other tabs. Re-mounting the panel re-subscribes to whatever state the
 * session reached in the background.
 */
export interface TopicSearchSession {
  platform: SocialPlatform
  query: string
  activeQuery: string
  results: TopicSearchResultItem[]
  nextCursor: string | null
  searching: boolean
  loadingMore: boolean
  error: string | null
  /** Creator keys with a baseline fetch currently in flight (spinner chips). */
  scoringKeys: string[]
  /** Creator keys already scored or failed — never re-requested this session. */
  settledCreatorKeys: string[]
  /** media_ids bookmarked into the research feed during this session. */
  savedIds: string[]
  sortMode: TopicSortMode
  minOutlier: number
  /** Monotonic guard — a new search invalidates responses from the previous one. */
  runId: number
  /** Searches auto-save on run; this is the durable row receiving async updates. */
  savedSearchId: string | null
  /** The space the session belongs to — needed for background persistence. */
  spaceId: string
  /** Bumps when an auto-save lands, so the sidebar list can reload. */
  autoSavedAt: number | null
}

export function emptyTopicSearchSession(platform: SocialPlatform): TopicSearchSession {
  return {
    platform,
    query: '',
    activeQuery: '',
    results: [],
    nextCursor: null,
    searching: false,
    loadingMore: false,
    error: null,
    scoringKeys: [],
    settledCreatorKeys: [],
    savedIds: [],
    sortMode: 'relevance',
    minOutlier: 1,
    runId: 0,
    savedSearchId: null,
    spaceId: '',
    autoSavedAt: null,
  }
}

interface TopicSearchSessionStore {
  sessions: Record<string, TopicSearchSession>
  getSession: (key: string, platform: SocialPlatform) => TopicSearchSession
  patchSession: (key: string, patch: Partial<TopicSearchSession>) => void
  clearSession: (key: string, platform: SocialPlatform) => void
  runSearch: (key: string, spaceId: string, platform: SocialPlatform, query: string) => void
  loadMore: (key: string, spaceId: string) => void
  /** Resume a frozen saved search as the live session (load-more, re-scoring). */
  hydrateFromSavedSearch: (key: string, spaceId: string, saved: SavedTopicSearch) => void
}

const PERSIST_DEBOUNCE_MS = 1500

export const useTopicSearchSessionStore = create<TopicSearchSessionStore>((set, get) => {
  const read = (key: string): TopicSearchSession | undefined => get().sessions[key]
  const persistTimers = new Map<string, ReturnType<typeof setTimeout>>()

  /** Debounced: pushes the session's current results onto its auto-saved row. */
  const schedulePersist = (key: string) => {
    const existing = persistTimers.get(key)
    if (existing) clearTimeout(existing)
    persistTimers.set(
      key,
      setTimeout(() => {
        persistTimers.delete(key)
        const session = read(key)
        if (!session?.savedSearchId || !session.spaceId) return
        void updateSavedTopicSearch(session.spaceId, session.savedSearchId, {
          results: session.results,
          next_cursor: session.nextCursor,
        }).catch((err) => {
          reportSocialResearchError(
            'topic_search_persist_failed',
            err,
            socialResearchContext(session.spaceId, session.platform, {
              saved_search_id: session.savedSearchId,
            }),
            'warn',
          )
        })
      }, PERSIST_DEBOUNCE_MS),
    )
  }

  /** Auto-save on run — best effort; the live session keeps working if it fails. */
  const autoSaveSearch = async (key: string, runId: number) => {
    const session = read(key)
    if (!session || session.runId !== runId || session.results.length === 0) return
    try {
      const created: SavedTopicSearch = await createSavedTopicSearch(session.spaceId, {
        platform: session.platform,
        title: session.activeQuery,
        query: session.activeQuery,
        filters: { sort_mode: session.sortMode },
        items: session.results,
        next_cursor: session.nextCursor,
      })
      const current = read(key)
      if (!current || current.runId !== runId) return
      set((state) => ({
        sessions: {
          ...state.sessions,
          [key]: { ...current, savedSearchId: created.id, autoSavedAt: Date.now() },
        },
      }))
      // Scoring may have settled while the auto-save was in flight — flush the
      // scores now that the row id exists.
      if (current.scoringKeys.length === 0) schedulePersist(key)
    } catch (err) {
      reportSocialResearchError(
        'topic_search_auto_save_failed',
        err,
        socialResearchContext(session.spaceId, session.platform, { query: session.activeQuery }),
        'warn',
      )
    }
  }

  const write = (key: string, patch: Partial<TopicSearchSession>) => {
    set((state) => {
      const current = state.sessions[key]
      if (!current) return state
      return { sessions: { ...state.sessions, [key]: { ...current, ...patch } } }
    })
  }

  const applyScores = (
    key: string,
    runId: number,
    scores: Array<{ key: string; baseline_median: number | null }>,
  ) => {
    const session = read(key)
    if (!session || session.runId !== runId) return
    const byKey = new Map(scores.map((s) => [s.key, s.baseline_median]))
    const results = session.results.map((item) => {
      const creatorKey = topicCreatorKey(item.creator)
      if (!byKey.has(creatorKey)) return item
      const median = byKey.get(creatorKey)
      if (median == null || median === 0) return item
      return {
        ...item,
        baseline_median: median,
        outlier_score: Math.round((item.play_count / median) * 100) / 100,
      }
    })
    const scoredKeys = new Set(scores.map((s) => s.key))
    const remainingScoringKeys = session.scoringKeys.filter((k) => !scoredKeys.has(k))
    write(key, {
      results,
      scoringKeys: remainingScoringKeys,
      settledCreatorKeys: [...new Set([...session.settledCreatorKeys, ...scoredKeys])],
    })
    // Persist once when scoring settles — per-round writes would re-read and
    // re-write the full snapshot row 2-3 times per search for no extra durability.
    if (remainingScoringKeys.length === 0) schedulePersist(key)
  }

  const scoreItems = async (
    key: string,
    spaceId: string,
    runId: number,
    platform: SocialPlatform,
    items: TopicSearchResultItem[],
  ) => {
    const session = read(key)
    if (!session || session.runId !== runId) return
    const settled = new Set(session.settledCreatorKeys)
    const pending = new Map<string, TopicSearchResultItem['creator']>()
    for (const item of items) {
      if (item.outlier_score != null) continue
      if (!item.creator.handle && !item.creator.channel_id) continue
      const creatorKey = topicCreatorKey(item.creator)
      if (settled.has(creatorKey) || pending.has(creatorKey)) continue
      pending.set(creatorKey, item.creator)
    }
    if (pending.size === 0) return
    write(key, {
      scoringKeys: [...new Set([...(read(key)?.scoringKeys ?? []), ...pending.keys()])],
    })
    const creators = [...pending.values()]
    for (let i = 0; i < creators.length; i += SCORE_BATCH_SIZE) {
      if (read(key)?.runId !== runId) return
      const batch = creators.slice(i, i + SCORE_BATCH_SIZE)
      try {
        const scores = await scoreTopicCreators(platform, spaceId, batch)
        applyScores(key, runId, scores)
      } catch (err) {
        reportSocialResearchError(
          'topic_search_score_failed',
          err,
          socialResearchContext(spaceId, platform, {
            creator_count: batch.length,
          }),
          'warn',
        )
        applyScores(
          key,
          runId,
          batch.map((c) => ({ key: topicCreatorKey(c), baseline_median: null })),
        )
      }
    }
  }

  return {
    sessions: {},

    getSession: (key, platform) => read(key) ?? emptyTopicSearchSession(platform),

    patchSession: (key, patch) => {
      set((state) => {
        const current = state.sessions[key] ?? emptyTopicSearchSession('youtube')
        return { sessions: { ...state.sessions, [key]: { ...current, ...patch } } }
      })
    },

    hydrateFromSavedSearch: (key, spaceId, saved) => {
      set((state) => ({
        sessions: {
          ...state.sessions,
          [key]: {
            ...emptyTopicSearchSession(saved.platform),
            query: saved.query,
            activeQuery: saved.query,
            results: saved.results,
            nextCursor: saved.next_cursor,
            sortMode: saved.filters.sort_mode ?? 'outlier_score',
            minOutlier: saved.filters.min_outlier_score ?? 1,
            // Creators already scored in the snapshot must not be re-fetched.
            settledCreatorKeys: [
              ...new Set(
                saved.results
                  .filter((r) => r.outlier_score != null)
                  .map((r) => topicCreatorKey(r.creator)),
              ),
            ],
            savedSearchId: saved.id,
            spaceId,
            runId: (state.sessions[key]?.runId ?? 0) + 1,
          },
        },
      }))
    },

    clearSession: (key, platform) => {
      const timer = persistTimers.get(key)
      if (timer) {
        clearTimeout(timer)
        persistTimers.delete(key)
      }
      set((state) => ({
        sessions: {
          ...state.sessions,
          // Bump runId so in-flight responses from the cleared session are dropped.
          [key]: {
            ...emptyTopicSearchSession(platform),
            runId: (state.sessions[key]?.runId ?? 0) + 1,
          },
        },
      }))
    },

    runSearch: (key, spaceId, platform, query) => {
      const q = query.trim()
      const existing = read(key)
      if (!q || existing?.searching) return
      const runId = (existing?.runId ?? 0) + 1
      set((state) => ({
        sessions: {
          ...state.sessions,
          [key]: {
            ...emptyTopicSearchSession(platform),
            query: q,
            searching: true,
            runId,
            spaceId,
          },
        },
      }))
      void (async () => {
        let lastErr: unknown
        for (let attempt = 0; attempt < SEARCH_MAX_ATTEMPTS; attempt++) {
          // Bail if a newer search (or a clear) superseded this run mid-retry.
          if (read(key)?.runId !== runId) return
          try {
            const page = await searchSocialTopic(platform, spaceId, q)
            if (read(key)?.runId !== runId) return
            write(key, {
              activeQuery: q,
              results: page.items,
              nextCursor: page.nextCursor,
              searching: false,
            })
            void autoSaveSearch(key, runId)
            void scoreItems(key, spaceId, runId, platform, page.items)
            return
          } catch (err) {
            lastErr = err
            const canRetry = attempt < SEARCH_MAX_ATTEMPTS - 1 && isTransientSearchError(err)
            if (!canRetry) break
            // Stay in the loading state and wait out the blip; the server cache
            // makes the next attempt free if the upstream call already landed.
            await sleepMs(SEARCH_RETRY_DELAYS_MS[attempt] ?? 6000)
          }
        }
        if (read(key)?.runId !== runId) return
        reportSocialResearchError(
          'topic_search_failed',
          lastErr,
          socialResearchContext(spaceId, platform, { query: q }),
        )
        write(key, {
          searching: false,
          error: "That search didn't go through — give it another shot.",
        })
      })()
    },

    loadMore: (key, spaceId) => {
      const session = read(key)
      if (!session || !session.nextCursor || session.loadingMore || !session.activeQuery) return
      const { runId, platform, activeQuery, nextCursor } = session
      write(key, { loadingMore: true })
      void (async () => {
        try {
          const page = await searchSocialTopic(platform, spaceId, activeQuery, nextCursor)
          const current = read(key)
          if (!current || current.runId !== runId) return
          const seen = new Set(current.results.map((i) => i.media_id))
          write(key, {
            results: [...current.results, ...page.items.filter((i) => !seen.has(i.media_id))],
            nextCursor: page.nextCursor,
            loadingMore: false,
          })
          schedulePersist(key)
          void scoreItems(key, spaceId, runId, platform, page.items)
        } catch (err) {
          if (read(key)?.runId !== runId) return
          reportSocialResearchError(
            'topic_search_load_more_failed',
            err,
            socialResearchContext(spaceId, platform, { query: activeQuery }),
          )
          write(key, { loadingMore: false, error: "Couldn't load more results — try again." })
        }
      })()
    },
  }
})
