'use client'

import { useState } from 'react'
import { Check, Copy, Globe } from 'lucide-react'
import { Switch } from '@/components/ui/forms/switch'
import type { MissionAgent } from '@/lib/agents'

export function PublicPageSection({
  agent,
  userPublicSlug,
  onToggle,
  onSlugAssign: _onSlugAssign,
}: {
  agent: MissionAgent
  userPublicSlug: string | null
  onToggle: (agentKey: string, enabled: boolean) => Promise<void>
  onSlugAssign: (slug: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const isEnabled = !!(agent as unknown as Record<string, unknown>).public_page_enabled

  const publicUrl = userPublicSlug ? `${userPublicSlug}.govibey.com/a/${agent.agent_key}` : null

  const handleToggle = async (enabled: boolean) => {
    setSaving(true)
    try {
      await onToggle(agent.agent_key, enabled)
    } finally {
      setSaving(false)
    }
  }

  const handleCopy = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(`https://${publicUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="pt-spacing-3 mt-spacing-3 border-t border-border">
      <p className="body-4 text-muted-foreground/60 mb-spacing-2 uppercase tracking-wide">
        Public Page
      </p>
      <div className="rounded-spacing-2 px-spacing-3 py-spacing-2 flex items-center justify-between border border-border bg-surface-subtle">
        <div>
          <div className="gap-spacing-2 flex items-center">
            <Globe className="text-foreground size-4" aria-hidden />
            <span className="body-3 text-foreground font-medium">Share agent publicly</span>
          </div>
          <p className="body-4 text-muted-foreground/60 mt-0.5">
            Anyone with the link can chat with this agent
          </p>
        </div>
        <Switch
          checked={isEnabled}
          disabled={saving}
          onCheckedChange={(val) => void handleToggle(val)}
        />
      </div>
      {isEnabled && publicUrl && (
        <div className="mt-spacing-2 flex items-center gap-2">
          <div className="body-4 text-foreground flex-1 truncate rounded-lg border border-border bg-surface-subtle px-3 py-2">
            {publicUrl}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="btn-icon-glass rounded-spacing-2 flex h-9 w-9 items-center justify-center"
            title="Copy link"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}
      {isEnabled && !publicUrl && (
        <p className="body-4 text-muted-foreground mt-spacing-2">Setting up your public link...</p>
      )}
    </div>
  )
}
