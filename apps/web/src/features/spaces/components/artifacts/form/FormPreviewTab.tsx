'use client'

import { useState, type CSSProperties } from 'react'
import { getIconColor, LucideIcon, type IconColorId } from '@/components/ui/icon-picker-shared'
import type { Form } from '@/lib/forms'
import { cn } from '@/lib/utils/cn'
import {
  readColor,
  readColorStyle,
  resolveButtonAccentHex,
  resolveButtonStyle,
  resolveCardStyle,
  resolveInputStyle,
  resolveSurfaceStyle,
  resolveTextStyle,
} from './form-preview-styles'
import { FormPagesRail } from './FormPagesRail'
import { FormPreviewFieldPreview, isFullRowPreviewQuestion } from './FormPreviewFieldPreview'

const DEFAULT_LOGO_ICON = 'square'
const DEFAULT_END_PAGE_ICON = 'check-circle-2'
const END_PAGE_TITLE_FALLBACK = 'Thank you'
const END_PAGE_MESSAGE_FALLBACK =
  'Your response was submitted. Write any closing message you want the respondent to see.'

export function FormPreviewTab({
  form,
  pagesRailCollapsed,
  onPagesRailCollapsedChange,
}: {
  form: Form
  pagesRailCollapsed: boolean
  onPagesRailCollapsedChange: (collapsed: boolean) => void
}) {
  const [previewPage, setPreviewPage] = useState<'start' | 'end'>('start')
  const schema = form.schema ?? { questions: [] }
  const settings = form.settings ?? {}
  const coverUrl =
    typeof settings.cover_url === 'string' && settings.cover_url.trim() ? settings.cover_url : null
  const coverFocalY = typeof settings.cover_focal_y === 'number' ? settings.cover_focal_y : 50
  const logoImageUrl =
    typeof settings.icon_image_url === 'string' && settings.icon_image_url.trim()
      ? settings.icon_image_url
      : null
  const iconName =
    typeof settings.icon === 'string' && settings.icon.trim() ? settings.icon : DEFAULT_LOGO_ICON
  const iconColor = getIconColor((settings.icon_color ?? 'default') as IconColorId)
  const theme = (settings.theme ?? 'light') as 'light' | 'dark'
  const bgColorId = readColor(settings.colors, 'background')
  const surfaceColorId = readColor(settings.colors, 'surface')
  const textColorId = readColor(settings.colors, 'text')
  const inputColorId = readColor(settings.colors, 'input')
  const buttonColorId = readColor(settings.colors, 'button')
  const bgStyleOverride = readColorStyle(settings.colors, 'background')
  const surfaceStyleOverride = readColorStyle(settings.colors, 'surface')
  const inputStyleOverride = readColorStyle(settings.colors, 'input')
  const buttonStyleOverride = readColorStyle(settings.colors, 'button')
  const surfaceStyle = resolveSurfaceStyle(bgColorId, theme, bgStyleOverride)
  const cardStyle = resolveCardStyle(surfaceColorId, theme, surfaceStyleOverride)
  const textStyle = resolveTextStyle(textColorId)
  const inputStyle = resolveInputStyle(inputColorId, theme, inputStyleOverride)
  const buttonStyle = resolveButtonStyle(buttonColorId, theme, buttonStyleOverride)
  const buttonHex = resolveButtonAccentHex(buttonColorId)
  const accentStyle: CSSProperties = { accentColor: buttonHex }
  const useCustomCard = Boolean(cardStyle)
  const cardClass = useCustomCard
    ? 'rounded-spacing-4 overflow-hidden border'
    : 'surface-card border-border rounded-spacing-4 overflow-hidden border'
  const cardCombinedStyle: CSSProperties = { ...(textStyle ?? {}), ...(cardStyle ?? {}) }
  const layout = settings.layout ?? 'one_column'
  const isTwoCol = layout === 'two_column'

  const endLogoImageUrl =
    typeof settings.end_page_icon_image_url === 'string' && settings.end_page_icon_image_url.trim()
      ? settings.end_page_icon_image_url
      : null
  const endIconName =
    typeof settings.end_page_icon === 'string' && settings.end_page_icon.trim()
      ? settings.end_page_icon
      : DEFAULT_END_PAGE_ICON
  const endIconColor = getIconColor((settings.end_page_icon_color ?? 'default') as IconColorId)
  const endTitle = settings.end_page_title?.trim() || END_PAGE_TITLE_FALLBACK
  const endMessage = settings.end_page_message?.trim() || END_PAGE_MESSAGE_FALLBACK

  return (
    <div className="gap-spacing-2 px-spacing-4 py-spacing-3 flex min-h-0 flex-1 overflow-hidden">
      <FormPagesRail
        activePage={previewPage}
        onSelectPage={setPreviewPage}
        collapsed={pagesRailCollapsed}
        onCollapsedChange={onPagesRailCollapsedChange}
      />

      <main className="border-border bg-background rounded-spacing-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border">
        <div
          className={cn(
            'p-spacing-8 min-h-0 flex-1 overflow-y-auto',
            !surfaceStyle && 'bg-background',
          )}
          style={surfaceStyle}
        >
          <div className="mx-auto max-w-3xl">
            {previewPage === 'end' ? (
              <div className={cardClass} style={cardCombinedStyle}>
                <div className="space-y-spacing-4 p-spacing-8 flex flex-col items-center text-center">
                  <div
                    className={
                      endLogoImageUrl
                        ? 'border-border flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border'
                        : `${endIconColor.glassClass} border-border flex h-10 w-10 items-center justify-center rounded-lg border`
                    }
                    aria-hidden
                  >
                    {endLogoImageUrl ? (
                      <img src={endLogoImageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <LucideIcon
                        name={endIconName}
                        className={`icon-sm ${endIconColor.textColor}`}
                      />
                    )}
                  </div>
                  <p className="title-h2 w-full">{endTitle}</p>
                  <p className="body-3 w-full max-w-xl whitespace-pre-wrap opacity-65">
                    {endMessage}
                  </p>
                </div>
              </div>
            ) : (
              <div className={cardClass} style={cardCombinedStyle}>
                {coverUrl ? (
                  <div className="border-border h-48 w-full overflow-hidden border-b">
                    <img
                      src={coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{ objectPosition: `center ${coverFocalY}%` }}
                    />
                  </div>
                ) : null}
                <div className="p-spacing-8">
                  <div className="space-y-spacing-3">
                    <div
                      className={
                        logoImageUrl
                          ? 'border-border flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border'
                          : `${iconColor.glassClass} border-border flex h-10 w-10 items-center justify-center rounded-lg border`
                      }
                      aria-hidden
                    >
                      {logoImageUrl ? (
                        <img src={logoImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <LucideIcon name={iconName} className={`icon-sm ${iconColor.textColor}`} />
                      )}
                    </div>
                    <input
                      value={schema.title ?? form.name}
                      readOnly
                      tabIndex={-1}
                      className="title-h2 w-full bg-transparent outline-none"
                      placeholder="Form title"
                    />
                    <textarea
                      value={schema.description ?? ''}
                      readOnly
                      tabIndex={-1}
                      className="body-3 min-h-spacing-16 w-full resize-none bg-transparent opacity-65 outline-none"
                      placeholder="Describe what this form collects"
                    />
                  </div>
                  <div
                    className={cn(
                      'mt-spacing-8',
                      isTwoCol ? 'gap-spacing-6 grid grid-cols-2' : 'space-y-spacing-6',
                    )}
                  >
                    {(schema.questions ?? [])
                      .filter((question) => !question.hidden)
                      .map((question) => {
                        const fullRow = isTwoCol && isFullRowPreviewQuestion(question.type)
                        const reserveDescription =
                          isTwoCol && !fullRow && question.type !== 'info_block'
                        return (
                          <div
                            key={question.id}
                            className={cn('space-y-spacing-2', fullRow && 'col-span-2')}
                          >
                            <label className="body-3 font-medium">
                              {question.label}
                              {question.required ? (
                                <span className="text-destructive"> *</span>
                              ) : null}
                            </label>
                            {question.description ? (
                              <p className="body-4 opacity-65">{question.description}</p>
                            ) : reserveDescription ? (
                              <p className="body-4 select-none text-transparent" aria-hidden>
                                &nbsp;
                              </p>
                            ) : null}
                            <FormPreviewFieldPreview
                              question={question}
                              isTwoCol={isTwoCol}
                              inputStyle={inputStyle}
                              accentStyle={accentStyle}
                            />
                          </div>
                        )
                      })}
                  </div>
                  <button
                    type="button"
                    disabled
                    className={cn(
                      'button-large mt-spacing-8 w-full',
                      !buttonStyle && 'button-glass-primary',
                    )}
                    style={buttonStyle}
                  >
                    {settings.button_label ?? 'Submit'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
