'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { BadgeCheck, Check, Loader2, Plus, RefreshCw, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import {
  reportSocialResearchError,
  socialResearchContext,
} from '../../lib/report-social-research-error'
import {
  getConnectedSocialHandle,
  parseSocialHandle,
  searchSocialAccounts,
  type SocialAccountSearchResult,
} from '../../services/social-research.service'
import type { SocialPlatform, SocialResearchConfig } from '../../types/space-schema'
import {
  cachedSocialProfileImageUrl,
  proxiedSocialMediaUrl,
} from '../social-research/social-image-proxy'

interface AccountTrackerProps {
  config: SocialResearchConfig
  /** Defaults to 'instagram' so existing call sites keep working without churn. */
  platform?: SocialPlatform
  onAddAccount: (handle: string) => Promise<void>
  onSyncAccount: (handle: string) => Promise<void>
  onRemoveAccount: (handle: string) => Promise<void>
  /** When set, row click toggles "show in grid" (`people_hidden_handles`); small check after the name. */
  onPatchConfig?: (patch: Partial<SocialResearchConfig>) => void
}

type AccountActionKey = `${SocialPlatform}:${string}`

function accountActionKey(platform: SocialPlatform, handle: string): AccountActionKey {
  return `${platform}:${handle.toLowerCase()}`
}

function parseAccountActionKey(key: AccountActionKey): {
  platform: SocialPlatform
  handle: string
} {
  const colon = key.indexOf(':')
  return {
    platform: key.slice(0, colon) as SocialPlatform,
    handle: key.slice(colon + 1),
  }
}

const _globalSyncingHandles = new Set<AccountActionKey>()
const _globalAddingHandles = new Set<AccountActionKey>()
let _globalSyncListeners = new Set<() => void>()
function notifySyncListeners() {
  _globalSyncListeners.forEach((fn) => fn())
}

export function AccountTracker(props: Readonly<AccountTrackerProps>) {
  const {
    config,
    platform = 'instagram',
    onAddAccount,
    onSyncAccount,
    onRemoveAccount,
    onPatchConfig,
  } = props
  const [inputValue, setInputValue] = useState('')
  const [, forceRender] = useState(0)
  const [removingHandle, setRemovingHandle] = useState<string | null>(null)

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1)
    _globalSyncListeners.add(listener)
    return () => {
      _globalSyncListeners.delete(listener)
    }
  }, [])
  const [connectedHandle, setConnectedHandle] = useState<string | null>(null)

  const [searchResults, setSearchResults] = useState<SocialAccountSearchResult[]>([])
  const [, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getConnectedSocialHandle(platform)
      .then(setConnectedHandle)
      .catch(() => setConnectedHandle(null))
  }, [platform])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const _runAccountSearch = useCallback(async () => {
    const raw = inputValue.trim()
    const looksLikeUrl =
      raw.toLowerCase().includes('instagram.com') ||
      raw.toLowerCase().includes('tiktok.com') ||
      raw.toLowerCase().includes('youtube.com') ||
      raw.toLowerCase().includes('youtu.be') ||
      raw.toLowerCase().includes('x.com') ||
      raw.toLowerCase().includes('twitter.com')
    const searchQuery = looksLikeUrl ? parseSocialHandle(platform, raw) : raw
    if (!searchQuery || searchQuery.length < 3) {
      toast.error('Enter at least 3 characters (or paste a profile URL), then Search')
      return
    }
    setSearching(true)
    setSearchResults([])
    setDropdownOpen(false)
    try {
      const results = await searchSocialAccounts(platform, searchQuery)
      setSearchResults(results)
      setDropdownOpen(results.length > 0)
      if (results.length === 0) {
        toast.info('No matches — try exact @handle or use Add')
      }
    } catch (err) {
      setSearchResults([])
      reportSocialResearchError(
        'account_search_failed',
        err,
        socialResearchContext(undefined, platform, { query: searchQuery }),
      )
      toast.error(sanitizeUserError(err, 'Search failed'))
    } finally {
      setSearching(false)
    }
  }, [inputValue, platform])
  void _runAccountSearch

  const addHandle = useCallback(
    (handle: string) => {
      const parsed = parseSocialHandle(platform, handle).toLowerCase()
      if (!parsed) return
      if (config.tracked_accounts.some((a) => a.handle.toLowerCase() === parsed)) {
        toast.error(`@${parsed} is already tracked`)
        return
      }
      const pendingKey = accountActionKey(platform, parsed)
      if (_globalAddingHandles.has(pendingKey)) return
      _globalAddingHandles.add(pendingKey)
      notifySyncListeners()
      setDropdownOpen(false)
      setSearchResults([])
      setInputValue('')

      void (async () => {
        try {
          await onAddAccount(parsed)
          toast.success(`Added @${parsed}`)
        } catch (err) {
          reportSocialResearchError(
            'account_add_failed',
            err,
            socialResearchContext(undefined, platform, { handle: parsed }),
          )
          toast.error(`Failed to add @${parsed} — try again.`)
        } finally {
          _globalAddingHandles.delete(pendingKey)
          notifySyncListeners()
        }
      })()
    },
    [config.tracked_accounts, onAddAccount, platform],
  )

  const handleSync = useCallback(
    (handle: string) => {
      const h = handle.toLowerCase()
      const pendingKey = accountActionKey(platform, h)
      if (_globalSyncingHandles.has(pendingKey)) return
      _globalSyncingHandles.add(pendingKey)
      notifySyncListeners()

      void (async () => {
        try {
          await onSyncAccount(handle)
          toast.success(`Synced @${handle}`)
        } catch (err) {
          reportSocialResearchError(
            'account_sync_failed',
            err,
            socialResearchContext(undefined, platform, { handle }),
          )
          toast.error(`Failed to sync @${handle}`)
        } finally {
          _globalSyncingHandles.delete(pendingKey)
          notifySyncListeners()
        }
      })()
    },
    [onSyncAccount, platform],
  )

  const handleRemove = useCallback(
    async (handle: string) => {
      setRemovingHandle(handle)
      try {
        await onRemoveAccount(handle)
        toast.success(`Removed @${handle}`)
      } catch (err) {
        reportSocialResearchError(
          'account_remove_failed',
          err,
          socialResearchContext(undefined, platform, { handle }),
        )
        toast.error(`Failed to remove @${handle}`)
      } finally {
        setRemovingHandle(null)
      }
    },
    [onRemoveAccount, platform],
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Add input */}
      <div ref={wrapperRef} className="relative flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <div className="rounded-spacing-2 flex items-center gap-1.5 border border-[rgba(52,211,153,0.4)] bg-transparent px-2 focus-within:border-[rgba(52,211,153,0.7)] dark:border-[rgba(52,211,153,0.25)] dark:focus-within:border-[rgba(52,211,153,0.5)]">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setSearchResults([])
                  setDropdownOpen(false)
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setDropdownOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addHandle(inputValue)
                  }
                  if (e.key === 'Escape') setDropdownOpen(false)
                }}
                placeholder="@handle or URL"
                className="h-7 min-w-0 flex-1 bg-transparent text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
              />
            </div>

            {dropdownOpen && searchResults.length > 0 && (
              <div className="dropdown-menu-solid absolute left-0 top-full z-[99999] mt-1 w-full rounded-xl py-1">
                {searchResults.map((result) => {
                  const alreadyTracked = config.tracked_accounts.some(
                    (a) => a.handle.toLowerCase() === result.username.toLowerCase(),
                  )
                  const pendingAddKey = accountActionKey(platform, result.username)
                  return (
                    <button
                      key={result.pk || result.username}
                      type="button"
                      disabled={alreadyTracked || _globalAddingHandles.has(pendingAddKey)}
                      onClick={() => void addHandle(result.username)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--color-hover-subtle)] disabled:opacity-40"
                    >
                      {result.profile_pic_url ? (
                        <img
                          src={
                            proxiedSocialMediaUrl(platform, result.profile_pic_url) ??
                            result.profile_pic_url
                          }
                          alt={result.username}
                          className="h-6 w-6 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-hover-subtle)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                          {result.username[0]}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-xs font-medium text-[var(--foreground)]">
                            @{result.username}
                          </span>
                          {result.is_verified && (
                            <BadgeCheck className="h-3 w-3 shrink-0 text-blue-400" />
                          )}
                        </div>
                        {result.full_name && (
                          <p className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                            {result.full_name}
                          </p>
                        )}
                      </div>
                      {alreadyTracked && (
                        <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
                          Added
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => addHandle(inputValue)}
            disabled={!inputValue.trim()}
            className="badge-glass badge-glass-green rounded-spacing-2 flex h-7 items-center gap-1 px-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {connectedHandle &&
          !config.tracked_accounts.some(
            (a) => a.handle.toLowerCase() === connectedHandle.toLowerCase(),
          ) && (
            <button
              type="button"
              onClick={() => addHandle(connectedHandle)}
              disabled={_globalAddingHandles.has(accountActionKey(platform, connectedHandle))}
              className="flex items-center gap-1.5 self-start rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--foreground)]"
            >
              <User className="h-3 w-3" />
              Add my account (@{connectedHandle})
            </button>
          )}
      </div>

      {/* Tracked accounts list */}
      <div className="space-y-0.5">
        {[..._globalAddingHandles]
          .map(parseAccountActionKey)
          .filter(
            ({ platform: pendingPlatform, handle: h }) =>
              pendingPlatform === platform &&
              !config.tracked_accounts.some((a) => a.handle.toLowerCase() === h),
          )
          .map(({ handle: h }) => (
            <div
              key={`adding-${platform}-${h}`}
              className="flex items-center gap-2 rounded-md px-1.5 py-1.5 opacity-60"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-hover-subtle)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
                {h[0]}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--foreground)]">
                @{h}
              </span>
              <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[var(--color-muted-foreground)]" />
            </div>
          ))}
        {config.tracked_accounts.map((account) => {
          const hl = account.handle.toLowerCase()
          const syncingKey = accountActionKey(platform, account.handle)
          const hiddenSet = new Set(
            (config.people_hidden_handles ?? []).map((h) =>
              parseSocialHandle(platform, h).toLowerCase(),
            ),
          )
          const showInGrid = !hiddenSet.has(hl)

          const toggleShowInGrid = () => {
            if (!onPatchConfig) return
            const next = new Set(
              (config.people_hidden_handles ?? []).map((h) =>
                parseSocialHandle(platform, h).toLowerCase(),
              ),
            )
            if (showInGrid) next.add(hl)
            else next.delete(hl)
            const arr = [...next].sort()
            onPatchConfig({ people_hidden_handles: arr.length ? arr : undefined })
          }

          const cachedAvatarUrl = cachedSocialProfileImageUrl(platform, account)
          const avatar = cachedAvatarUrl ? (
            <img
              src={cachedAvatarUrl}
              alt={account.handle}
              className="h-6 w-6 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-hover-subtle)] text-[10px] font-bold uppercase text-[var(--color-muted-foreground)]">
              {account.handle[0]}
            </span>
          )

          return (
            <div
              key={account.handle}
              role={onPatchConfig ? 'button' : undefined}
              tabIndex={onPatchConfig ? 0 : undefined}
              onClick={onPatchConfig ? () => toggleShowInGrid() : undefined}
              onKeyDown={
                onPatchConfig
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleShowInGrid()
                      }
                    }
                  : undefined
              }
              className={`group flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-[var(--color-hover-subtle)] ${
                onPatchConfig ? 'cursor-pointer' : ''
              }`}
            >
              {avatar}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <span className="truncate text-xs font-medium text-[var(--foreground)]">
                    @{account.handle}
                  </span>
                  {account.follower_count != null && account.follower_count > 0 && (
                    <span className="ml-1.5 text-[10px] text-[var(--color-muted-foreground)]">
                      {account.follower_count >= 1000
                        ? `${(account.follower_count / 1000).toFixed(0)}K`
                        : account.follower_count}
                    </span>
                  )}
                </div>
                {onPatchConfig ? (
                  showInGrid ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-[rgb(52,211,153)]"
                      strokeWidth={2.75}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="inline-flex h-3.5 w-3.5 shrink-0 rounded-sm border border-[var(--border)] opacity-45"
                      aria-hidden
                    />
                  )
                ) : null}
              </div>
              <div
                className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleSync(account.handle)}
                  disabled={_globalSyncingHandles.has(syncingKey)}
                  className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
                  title="Re-sync"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${_globalSyncingHandles.has(syncingKey) ? 'animate-spin' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(account.handle)}
                  disabled={removingHandle === account.handle}
                  className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-red-400 disabled:opacity-50"
                  title="Remove"
                >
                  {removingHandle === account.handle ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          )
        })}
        {config.tracked_accounts.length === 0 && (
          <p className="py-3 text-center text-xs text-[var(--color-muted-foreground)]">
            No accounts tracked yet
          </p>
        )}
      </div>
    </div>
  )
}
