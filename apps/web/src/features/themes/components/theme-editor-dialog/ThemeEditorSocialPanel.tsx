'use client'

import type { Dispatch, SetStateAction } from 'react'
import type { SocialLinks } from '../../types'
import { THEME_EDITOR_SOCIAL_FIELDS } from './theme-editor-dialog.constants'

export interface ThemeEditorSocialPanelProps {
  socialLinks: SocialLinks | null
  setSocialLinks: Dispatch<SetStateAction<SocialLinks | null>>
}

export function ThemeEditorSocialPanel({
  socialLinks,
  setSocialLinks,
}: ThemeEditorSocialPanelProps) {
  return (
    <div className="space-y-spacing-6 max-w-xl">
      <div>
        <h3 className="body-1 mb-spacing-2 font-semibold text-[var(--color-foreground)]">
          Social Profiles
        </h3>
        <p className="typo-caption mb-spacing-4 text-[var(--color-muted-foreground)]">
          Add your social media handles so agents use them consistently across all assets.
        </p>
        <div className="space-y-spacing-4">
          {THEME_EDITOR_SOCIAL_FIELDS.map((field) => (
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
  )
}
