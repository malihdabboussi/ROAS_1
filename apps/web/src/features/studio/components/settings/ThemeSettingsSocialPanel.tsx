'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { SocialLinks } from '@/features/themes/types'

export interface ThemeSettingsSocialPanelProps {
  socialLinks: SocialLinks | null
  setSocialLinks: Dispatch<SetStateAction<SocialLinks | null>>
}

const SOCIAL_FIELDS = [
  { key: 'website', label: 'Website', placeholder: 'https://yourdomain.com' },
  { key: 'instagram', label: 'Instagram', placeholder: '@yourhandle' },
  { key: 'facebook', label: 'Facebook', placeholder: '@yourpage or URL' },
  { key: 'twitter', label: 'X (Twitter)', placeholder: '@yourhandle' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: '/in/yourprofile or company URL' },
  { key: 'youtube', label: 'YouTube', placeholder: '@yourchannel or URL' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@yourhandle' },
  { key: 'pinterest', label: 'Pinterest', placeholder: '@yourhandle or URL' },
  { key: 'threads', label: 'Threads', placeholder: '@yourhandle' },
  { key: 'bluesky', label: 'Bluesky', placeholder: '@yourhandle.bsky.social' },
] as const

export function ThemeSettingsSocialPanel({
  socialLinks,
  setSocialLinks,
}: ThemeSettingsSocialPanelProps) {
  return (
    <div>
      <div className="space-y-spacing-6 sm:space-y-spacing-8">
        <div>
          <h3 className="body-1 mb-spacing-2 font-semibold text-[var(--color-foreground)]">
            Social Profiles
          </h3>
          <p className="typo-caption mb-spacing-4 text-[var(--color-muted-foreground)]">
            Add your social media handles so agents use them consistently across all assets.
          </p>
          <div className="space-y-spacing-4">
            {SOCIAL_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="body-3 mb-spacing-2 block font-medium text-[var(--color-muted-foreground)]">
                  {field.label}
                </label>
                <input
                  value={socialLinks?.[field.key] || ''}
                  onChange={(e) =>
                    setSocialLinks((prev) => ({
                      ...prev,
                      [field.key]: e.target.value || null,
                    }))
                  }
                  placeholder={field.placeholder}
                  className="input-glass body-2 w-full"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
