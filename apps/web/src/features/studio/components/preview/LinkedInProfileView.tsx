'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchIntegrationStatus,
  fetchLinkedInProfile,
  type LinkedInProfileData,
} from '../../services/artifact-preview.service'

export function LinkedInProfileView() {
  const [profile, setProfile] = useState<LinkedInProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [status, profileData] = await Promise.all([
        fetchIntegrationStatus('linkedin'),
        fetchLinkedInProfile(),
      ])
      setConnected(status.connected)
      if (!status.connected) {
        setError('Connect LinkedIn in Settings to view your profile.')
        return
      }
      setProfile(profileData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb size="md" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground text-sm">{error}</p>
        {connected === false && (
          <a
            href="/settings?tab=manage"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Connect LinkedIn
          </a>
        )}
      </div>
    )
  }

  const firstName = profile?.localizedFirstName ?? ''
  const lastName = profile?.localizedLastName ?? ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Your profile'
  const headline = profile?.headline ?? ''
  const picUrl = profile?.profilePicture?.displayImage
  const company = profile?.company ?? ''
  const location = profile?.location ?? ''
  const followersCount = profile?.followersCount ?? 0
  const connectionsCount = profile?.connectionsCount ?? 0
  const profileUrl = 'https://www.linkedin.com/in/me'

  return (
    <div className="flex h-full justify-center overflow-auto p-4">
      <div className="card-glass border-border rounded-spacing-3 mx-auto w-full max-w-[390px] overflow-hidden border">
        <div className="h-20 bg-blue-600" />
        <div className="relative px-4 pb-4">
          <div className="-mt-12 flex flex-col items-center">
            {picUrl ? (
              <img
                src={picUrl}
                alt=""
                className="h-24 w-24 rounded-full border-4 border-white object-cover"
              />
            ) : (
              <div className="text-muted-foreground bg-muted/50 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white text-2xl font-semibold">
                {fullName.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div className="mt-3 w-full text-center">
              <h2 className="text-foreground text-lg font-semibold">{fullName}</h2>
              {headline && (
                <p className="text-muted-foreground mt-1 max-w-full break-words text-sm">
                  {headline}
                </p>
              )}
              {company && <p className="text-muted-foreground mt-1 text-sm">{company}</p>}
              {location && <p className="text-muted-foreground mt-0.5 text-xs">{location}</p>}
              {(followersCount > 0 || connectionsCount > 0) && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {followersCount > 0 && `${followersCount.toLocaleString()} followers`}
                  {followersCount > 0 && connectionsCount > 0 && ' • '}
                  {connectionsCount > 0 && `${connectionsCount}+ connections`}
                </p>
              )}
            </div>
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground border-border mt-3 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View on LinkedIn
          </a>
        </div>
      </div>
    </div>
  )
}
