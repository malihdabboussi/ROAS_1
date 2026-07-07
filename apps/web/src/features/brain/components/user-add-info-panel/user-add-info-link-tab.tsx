'use client'

import { ExternalLink, GraduationCap, Loader2, X } from 'lucide-react'
import { TabsContent } from '@/components/ui/navigation/tabs'

export interface UserAddInfoLinkTabProps {
  linkUrl: string
  onLinkUrlChange: (v: string) => void
  linkDetection: { supported: boolean; platform?: string } | null
  rememberingLink: boolean
  onRememberLink: () => void
}

export function UserAddInfoLinkTab({
  linkUrl,
  onLinkUrlChange,
  linkDetection,
  rememberingLink,
  onRememberLink,
}: UserAddInfoLinkTabProps) {
  return (
    <TabsContent value="link" className="space-y-spacing-2 mt-0">
      <div className="relative">
        <input
          type="url"
          placeholder="Paste URL (YouTube, article, social...)"
          value={linkUrl}
          onChange={(e) => onLinkUrlChange(e.target.value)}
          className="h-spacing-10 px-spacing-3 body-3 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border pr-8"
        />
        {linkUrl && (
          <button
            type="button"
            onClick={() => onLinkUrlChange('')}
            className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {linkDetection && (
        <div
          className={`body-4 rounded-spacing-2 px-spacing-2 py-spacing-2 ${linkDetection.supported ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}
        >
          {linkDetection.supported ? (
            <span className="flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {linkDetection.platform} link detected
            </span>
          ) : (
            <span>
              {linkDetection.platform} content is not supported yet. Try pasting the text directly,
              uploading a PDF, or linking to a web article.
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        disabled={rememberingLink || !linkUrl.trim()}
        onClick={onRememberLink}
        className="button-glass-accent body-3 py-spacing-2 flex w-full items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-40"
      >
        <span className="relative z-10 flex items-center gap-2">
          {rememberingLink ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Extracting knowledge...
            </>
          ) : (
            <>
              <GraduationCap className="h-3.5 w-3.5" />
              Train
            </>
          )}
        </span>
      </button>
    </TabsContent>
  )
}
