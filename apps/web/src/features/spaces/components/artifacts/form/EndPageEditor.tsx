'use client'

import { useState } from 'react'
import type { FormSettings } from '@/lib/forms/forms-api'
import { FormLogoPicker } from './FormLogoPicker'

const END_PAGE_TITLE_PLACEHOLDER = 'Thank you'
const END_PAGE_MESSAGE_PLACEHOLDER =
  'Your response was submitted. Write any closing message you want the respondent to see.'

interface EndPageEditorProps {
  settings: FormSettings
  onSettingsChange: (next: FormSettings) => void
  campaignId: string
  formId: string
}

export function EndPageEditor({
  settings,
  onSettingsChange,
  campaignId,
  formId,
}: EndPageEditorProps) {
  const [titleFocused, setTitleFocused] = useState(false)
  const [messageFocused, setMessageFocused] = useState(false)

  return (
    <div className="space-y-spacing-4 flex flex-col items-center text-center">
      <FormLogoPicker
        value={{
          icon: settings.end_page_icon,
          icon_color: settings.end_page_icon_color,
          icon_image_url: settings.end_page_icon_image_url,
        }}
        onChange={(next) =>
          onSettingsChange({
            ...settings,
            end_page_icon: next.icon,
            end_page_icon_color: next.icon_color,
            end_page_icon_image_url: next.icon_image_url,
          })
        }
        campaignId={campaignId}
        formId={formId}
        defaultIcon="check-circle-2"
      />

      <input
        value={settings.end_page_title ?? ''}
        onChange={(event) => onSettingsChange({ ...settings, end_page_title: event.target.value })}
        onFocus={() => setTitleFocused(true)}
        onBlur={() => setTitleFocused(false)}
        className="title-h2 text-foreground w-full bg-transparent text-center outline-none"
        placeholder={titleFocused ? '' : END_PAGE_TITLE_PLACEHOLDER}
      />

      <textarea
        value={settings.end_page_message ?? ''}
        onChange={(event) =>
          onSettingsChange({ ...settings, end_page_message: event.target.value })
        }
        onFocus={() => setMessageFocused(true)}
        onBlur={() => setMessageFocused(false)}
        className="body-3 text-muted-foreground min-h-spacing-32 w-full resize-y bg-transparent text-center outline-none"
        placeholder={messageFocused ? '' : END_PAGE_MESSAGE_PLACEHOLDER}
      />
    </div>
  )
}
