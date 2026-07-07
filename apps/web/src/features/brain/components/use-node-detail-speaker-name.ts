import { useEffect, useState } from 'react'
import { backendGet } from '@/lib/api/backend-client'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function useNodeDetailSpeakerName(speaker: string | undefined): string | null {
  const [speakerName, setSpeakerName] = useState<string | null>(null)

  useEffect(() => {
    if (!speaker) {
      setSpeakerName(null)
      return
    }
    if (!UUID_RE.test(speaker)) {
      setSpeakerName(speaker)
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const response = await backendGet<{
          profile: {
            full_name: string
            email: string | null
            avatar_url: string | null
          } | null
        }>(`/api/profile/${encodeURIComponent(speaker)}`)
        if (cancelled) return
        if (response.profile?.full_name) setSpeakerName(response.profile.full_name)
        else if (response.profile?.email) setSpeakerName(response.profile.email)
        else setSpeakerName(null)
      } catch {
        if (cancelled) return
        setSpeakerName(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [speaker])

  return speakerName
}
