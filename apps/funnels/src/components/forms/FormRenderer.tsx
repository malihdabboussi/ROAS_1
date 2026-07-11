'use client'

import { useEffect, useRef, useState } from 'react'
import * as LucideIcons from 'lucide-react'
import {
  effectiveFormSelectOptions,
  type PublicForm,
  type PublicFormQuestion,
} from '@/lib/resolve-form'
import { getContactSubfieldMeta, resolveContactSubfields } from './contact-subfields'
import {
  readFormColor,
  readFormColorStyle,
  resolveFormButtonHex,
  resolveFormButtonStyle,
  resolveFormCardStyle,
  resolveFormInputStyle,
  resolveFormSurfaceStyle,
  resolveFormTextHex,
  resolveFormTextStyle,
} from './form-color-presets'
import { TurnstileWidget } from './TurnstileWidget'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

/** Mirrors `ICON_COLORS` text colors from the web app. */
const ICON_COLOR_CLASS: Record<string, string> = {
  default: 'text-white/80',
  purple: 'text-violet-300',
  blue: 'text-blue-300',
  green: 'text-emerald-300',
  cyan: 'text-cyan-300',
  orange: 'text-orange-300',
  red: 'text-red-300',
  yellow: 'text-yellow-300',
  muted: 'text-white/60',
}

type Answers = Record<string, unknown>

function QuestionField({
  question,
  value,
  onChange,
  uploadToken,
  isTwoCol,
  inputStyle,
  buttonStyle,
  buttonHex,
  theme,
  strokeHex,
  hasError,
}: {
  question: PublicFormQuestion
  value: unknown
  onChange: (value: unknown) => void
  uploadToken: string
  isTwoCol: boolean
  inputStyle?: React.CSSProperties
  buttonStyle?: React.CSSProperties
  buttonHex: string
  theme: 'light' | 'dark'
  strokeHex: string
  hasError?: boolean
}) {
  const accentStyle: React.CSSProperties = { accentColor: buttonHex }
  const errorRingClass = hasError ? 'ring-1 ring-rose-400/60' : ''
  if (question.type === 'info_block') {
    return (
      <div className="rounded-lg bg-blue-500/10 p-4 text-sm text-blue-100">
        <strong>{question.label}</strong>
        {question.description ? (
          <p className="mt-1 text-blue-100/80">{question.description}</p>
        ) : null}
      </div>
    )
  }

  const defaultInputClass =
    'min-h-10 w-full rounded-lg border px-3 py-2 outline-none focus:border-violet-400'
  const fallbackInputClass = 'border-white/15 bg-black/20'
  const useDefaultBg = !inputStyle

  if (question.type === 'long_text') {
    return (
      <textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={question.placeholder ?? 'Enter text'}
        className={`min-h-28 w-full rounded-lg border px-3 py-2 outline-none focus:border-violet-400 ${useDefaultBg ? fallbackInputClass : ''} ${errorRingClass}`}
        style={inputStyle}
      />
    )
  }

  if (question.type === 'single_select' || question.type === 'multi_select') {
    const selected = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
    return (
      <div className="space-y-2">
        {effectiveFormSelectOptions(question.options).map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <input
              type={question.type === 'single_select' ? 'radio' : 'checkbox'}
              name={question.id}
              checked={selected.includes(option.id)}
              style={accentStyle}
              onChange={(event) => {
                if (question.type === 'single_select') {
                  onChange(option.id)
                  return
                }
                onChange(
                  event.target.checked
                    ? [...selected, option.id]
                    : selected.filter((id) => id !== option.id),
                )
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    )
  }

  if (question.type === 'checkbox') {
    const checked = value === true
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded"
          style={accentStyle}
        />
        {question.placeholder ?? 'Yes'}
      </label>
    )
  }

  if (question.type === 'contact') {
    const objectValue =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {}
    const subfields = resolveContactSubfields(question.contact_subfields)
    return (
      <div className={`grid gap-2 ${isTwoCol ? 'grid-cols-2' : ''}`}>
        {subfields.map((id) => {
          const meta = getContactSubfieldMeta(id)
          if (!meta) return null
          return (
            <input
              key={id}
              type={meta.inputType}
              value={typeof objectValue[id] === 'string' ? (objectValue[id] as string) : ''}
              onChange={(event) => onChange({ ...objectValue, [id]: event.target.value })}
              placeholder={meta.placeholder}
              className={`${defaultInputClass} ${useDefaultBg ? fallbackInputClass : ''} ${errorRingClass}`}
              style={inputStyle}
            />
          )
        })}
      </div>
    )
  }

  if (question.type === 'signature') {
    return (
      <SignatureInput
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
        uploadToken={uploadToken}
        inputStyle={inputStyle}
        buttonStyle={buttonStyle}
        theme={theme}
        strokeHex={strokeHex}
      />
    )
  }

  if (question.type === 'uploads') {
    return (
      <UploadInput
        value={value}
        onChange={onChange}
        uploadToken={uploadToken}
        buttonStyle={buttonStyle}
      />
    )
  }

  return (
    <input
      type={question.type === 'number' ? 'number' : question.type === 'dates' ? 'date' : 'text'}
      value={typeof value === 'string' || typeof value === 'number' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={question.placeholder ?? 'Enter text'}
      className={`${defaultInputClass} ${useDefaultBg ? fallbackInputClass : ''} ${errorRingClass}`}
      style={inputStyle}
    />
  )
}

function SignatureInput({
  value,
  onChange,
  uploadToken,
  inputStyle,
  buttonStyle,
  theme,
  strokeHex,
}: {
  value: string
  onChange: (value: string) => void
  uploadToken: string
  inputStyle?: React.CSSProperties
  buttonStyle?: React.CSSProperties
  theme: 'light' | 'dark'
  strokeHex: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)

  function draw(clientX: number, clientY: number) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = strokeHex
    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    onChange(canvas.toDataURL('image/png'))
  }

  async function uploadSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    const body = new FormData()
    body.append('file', new File([blob], 'signature.png', { type: 'image/png' }))
    const response = await fetch(`/api/form-upload?token=${encodeURIComponent(uploadToken)}`, {
      method: 'POST',
      body,
    })
    const result = await response.json().catch(() => null)
    if (result?.file?.url) onChange(result.file.url)
  }

  const useCustomCanvas = Boolean(inputStyle)
  const canvasFallbackClass =
    theme === 'light' ? 'border-slate-300 bg-slate-50' : 'border-white/15 bg-black/20'
  const useCustomBtn = Boolean(buttonStyle)
  const btnFallback = theme === 'light' ? 'bg-slate-200 text-slate-900' : 'bg-white/10 text-white'

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={640}
        height={180}
        className={`h-32 w-full rounded-lg border ${useCustomCanvas ? '' : canvasFallbackClass}`}
        style={inputStyle}
        onPointerDown={(event) => {
          drawingRef.current = true
          const ctx = canvasRef.current?.getContext('2d')
          const rect = canvasRef.current?.getBoundingClientRect()
          if (ctx && rect) ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top)
        }}
        onPointerMove={(event) => {
          if (drawingRef.current) draw(event.clientX, event.clientY)
        }}
        onPointerUp={() => {
          drawingRef.current = false
        }}
      />
      {value ? <p className="mt-1 text-xs opacity-65">Signature captured</p> : null}
      <button
        type="button"
        onClick={() => void uploadSignature()}
        className={`mt-2 rounded-lg px-3 py-1 text-xs font-medium ${useCustomBtn ? '' : btnFallback}`}
        style={buttonStyle}
      >
        Save signature
      </button>
    </div>
  )
}

function UploadInput({
  value,
  onChange,
  uploadToken,
  buttonStyle,
}: {
  value: unknown
  onChange: (value: unknown) => void
  uploadToken: string
  buttonStyle?: React.CSSProperties
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileName =
    value && typeof value === 'object' && 'name' in (value as Record<string, unknown>)
      ? String((value as Record<string, unknown>).name ?? '')
      : ''
  const useCustomBtn = Boolean(buttonStyle)
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-lg px-4 py-2 text-sm font-medium ${useCustomBtn ? '' : 'bg-violet-500 text-white'}`}
        style={buttonStyle}
      >
        Choose file
      </button>
      {fileName ? <span className="text-xs opacity-70">{fileName}</span> : null}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          const body = new FormData()
          body.append('file', file)
          const response = await fetch(
            `/api/form-upload?token=${encodeURIComponent(uploadToken)}`,
            { method: 'POST', body },
          )
          const result = await response.json().catch(() => null)
          onChange(result?.file ?? { name: file.name, size: file.size, mimeType: file.type })
        }}
      />
    </div>
  )
}

export function FormRenderer({ form, embed }: { form: PublicForm; embed?: boolean }) {
  const [answers, setAnswers] = useState<Answers>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)
  const [awaitingCaptcha, setAwaitingCaptcha] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const formRef = useRef<HTMLFormElement>(null)
  const questions = (form.schema.questions ?? []).filter((question) => !question.hidden)
  const buttonLabel =
    typeof form.settings.button_label === 'string' ? form.settings.button_label : 'Submit'
  const captchaEnabled = form.settings.show_recaptcha === true && Boolean(TURNSTILE_SITE_KEY)
  const captchaTheme: 'light' | 'dark' = form.settings.theme === 'light' ? 'light' : 'dark'

  const theme: 'light' | 'dark' =
    form.settings.theme === 'light' || form.settings.theme === 'dark'
      ? form.settings.theme
      : 'light'
  const colorsRecord =
    form.settings.colors && typeof form.settings.colors === 'object'
      ? (form.settings.colors as Record<string, unknown>)
      : undefined
  const surfaceStyle = resolveFormSurfaceStyle(
    readFormColor(colorsRecord, 'background'),
    theme,
    readFormColorStyle(colorsRecord, 'background'),
  )
  const cardStyle = resolveFormCardStyle(
    readFormColor(colorsRecord, 'surface'),
    theme,
    readFormColorStyle(colorsRecord, 'surface'),
  )
  const textStyle = resolveFormTextStyle(readFormColor(colorsRecord, 'text'))
  const inputStyle = resolveFormInputStyle(
    readFormColor(colorsRecord, 'input'),
    theme,
    readFormColorStyle(colorsRecord, 'input'),
  )
  const buttonStyle = resolveFormButtonStyle(
    readFormColor(colorsRecord, 'button'),
    theme,
    readFormColorStyle(colorsRecord, 'button'),
  )
  const buttonHex = resolveFormButtonHex(readFormColor(colorsRecord, 'button')) ?? '#a78bfa'
  const strokeHex =
    resolveFormTextHex(readFormColor(colorsRecord, 'text')) ??
    (theme === 'light' ? '#0f172a' : '#ffffff')
  const baseSurfaceClass = embed
    ? 'min-h-screen p-4'
    : `min-h-screen p-8 ${surfaceStyle ? '' : 'bg-neutral-950'}`
  const cardBaseClass = `mx-auto max-w-2xl overflow-hidden rounded-2xl border shadow-2xl ${cardStyle ? '' : 'border-white/10 bg-white/5'}`
  const coverUrl =
    typeof form.settings.cover_url === 'string' && form.settings.cover_url.trim()
      ? form.settings.cover_url
      : null
  const coverFocalY =
    typeof form.settings.cover_focal_y === 'number' ? form.settings.cover_focal_y : 50
  const startLogoImageUrl =
    typeof form.settings.icon_image_url === 'string' && form.settings.icon_image_url.trim()
      ? form.settings.icon_image_url
      : null
  const startIconName =
    typeof form.settings.icon === 'string' && form.settings.icon.trim()
      ? form.settings.icon
      : 'square'
  const startIconColor =
    typeof form.settings.icon_color === 'string' && form.settings.icon_color
      ? form.settings.icon_color
      : 'default'
  const cardCombinedStyle: React.CSSProperties = {
    ...(textStyle ?? (theme === 'light' ? { color: '#0f172a' } : { color: '#ffffff' })),
    ...(cardStyle ?? {}),
  }
  const isTwoCol = form.settings.layout === 'two_column'
  const fullRowTypes = new Set(['info_block', 'long_text', 'contact'])

  async function performSubmit(token: string | null) {
    setErrorMessage(null)
    setSubmitting(true)
    const response = await fetch(`/api/form-submit?token=${encodeURIComponent(form.share_token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers,
        ...(captchaEnabled && token ? { turnstile_token: token } : {}),
      }),
    })
    const result = await response.json().catch(() => ({}))
    setSubmitting(false)
    setAwaitingCaptcha(false)
    if (!response.ok) {
      setErrorMessage(
        typeof result?.message === 'string'
          ? result.message
          : 'Submission failed. Please try again.',
      )
      // Reset captcha so the user can retry with a fresh token
      setTurnstileToken(null)
      setTurnstileResetKey((value) => value + 1)
      return
    }
    if (typeof result.redirect_url === 'string' && result.redirect_url) {
      window.location.href = result.redirect_url
      return
    }
    setSubmitted(true)
  }

  function validateAnswers(): Record<string, string> {
    const errors: Record<string, string> = {}
    for (const q of questions) {
      if (!q.required) continue
      if (q.type === 'info_block') continue
      const raw = answers[q.id]

      if (q.type === 'checkbox') {
        if (raw !== true) errors[q.id] = 'Please check this box.'
        continue
      }
      if (q.type === 'contact') {
        const obj =
          raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {}
        const hasAny = Object.values(obj).some((v) =>
          typeof v === 'string' ? v.trim().length > 0 : v != null && v !== '',
        )
        if (!hasAny) errors[q.id] = 'Please fill at least one contact field.'
        continue
      }
      if (q.type === 'multi_select') {
        const arr = Array.isArray(raw) ? raw : []
        if (arr.length === 0) errors[q.id] = 'Please select at least one option.'
        continue
      }
      if (q.type === 'single_select') {
        if (raw == null || raw === '') errors[q.id] = 'Please select an option.'
        continue
      }
      if (q.type === 'uploads') {
        if (!raw) errors[q.id] = 'Please upload a file.'
        continue
      }
      if (typeof raw === 'string') {
        if (raw.trim() === '') errors[q.id] = 'This field is required.'
        continue
      }
      if (raw == null || raw === '') {
        errors[q.id] = 'This field is required.'
      }
    }
    return errors
  }

  function scrollToFirstError(errors: Record<string, string>) {
    const ids = questions.map((q) => q.id).filter((id) => Boolean(errors[id]))
    const firstId = ids[0]
    if (!firstId) return
    const root = formRef.current
    if (!root) return
    const node = root.querySelector(`[data-question-id="${firstId}"]`)
    if (node && 'scrollIntoView' in node) {
      ;(node as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function handleSubmitClick() {
    const errors = validateAnswers()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setErrorMessage(null)
      // Defer scroll until field-error nodes have rendered.
      requestAnimationFrame(() => scrollToFirstError(errors))
      return
    }
    setFieldErrors({})
    if (captchaEnabled && !turnstileToken) {
      setErrorMessage(null)
      setAwaitingCaptcha(true)
      return
    }
    void performSubmit(turnstileToken)
  }

  // When captcha is rendered after Submit click, fire the actual submit as
  // soon as Cloudflare returns a token.
  useEffect(() => {
    if (!awaitingCaptcha) return
    if (!turnstileToken) return
    if (submitting) return
    void performSubmit(turnstileToken)
    // performSubmit dependency intentionally omitted — captures latest answers via closure on next render
  }, [awaitingCaptcha, turnstileToken, submitting])

  if (submitted) {
    const endPageIcon =
      typeof form.settings.end_page_icon === 'string' ? form.settings.end_page_icon : null
    const endPageIconColor =
      typeof form.settings.end_page_icon_color === 'string'
        ? form.settings.end_page_icon_color
        : 'default'
    const endPageImageUrl =
      typeof form.settings.end_page_icon_image_url === 'string' &&
      form.settings.end_page_icon_image_url
        ? form.settings.end_page_icon_image_url
        : null
    const endPageTitle =
      typeof form.settings.end_page_title === 'string' && form.settings.end_page_title.trim()
        ? form.settings.end_page_title
        : 'Thank you'
    const endPageMessage =
      typeof form.settings.end_page_message === 'string' && form.settings.end_page_message.trim()
        ? form.settings.end_page_message
        : 'Your response was submitted.'
    return (
      <main className={baseSurfaceClass} style={surfaceStyle}>
        <div className={`${cardBaseClass} text-center`} style={cardCombinedStyle}>
          <div className="mb-6 flex justify-center">
            {endPageImageUrl ? (
              <img src={endPageImageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-xl border border-white/15 bg-white/5 ${
                  ICON_COLOR_CLASS[endPageIconColor] ?? ICON_COLOR_CLASS.default
                }`}
              >
                <FunnelLucideIcon name={endPageIcon ?? 'check-circle-2'} className="h-8 w-8" />
              </span>
            )}
          </div>
          <h1 className="text-3xl font-semibold">{endPageTitle}</h1>
          <p className="mx-auto mt-3 max-w-md whitespace-pre-wrap opacity-65">{endPageMessage}</p>
          {form.settings.show_resubmit_button === true ? (
            <button
              type="button"
              onClick={() => {
                setAnswers({})
                setSubmitted(false)
                setTurnstileToken(null)
                setTurnstileResetKey((value) => value + 1)
                setErrorMessage(null)
              }}
              className={`mt-8 inline-flex h-12 items-center justify-center rounded-xl px-6 font-semibold text-white ${
                buttonStyle ? '' : 'bg-violet-500'
              }`}
              style={buttonStyle}
            >
              Submit another response
            </button>
          ) : null}
        </div>
        <VibeyBrandingFooter theme={theme} />
      </main>
    )
  }

  return (
    <main className={baseSurfaceClass} style={surfaceStyle}>
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault()
          handleSubmitClick()
        }}
        className={cardBaseClass}
        style={cardCombinedStyle}
      >
        {coverUrl ? (
          <div className="h-48 w-full overflow-hidden border-b border-white/10">
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: `center ${coverFocalY}%` }}
            />
          </div>
        ) : null}
        <div className="p-8">
          <div className="mb-5">
            {startLogoImageUrl ? (
              <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-white/15">
                <img src={startLogoImageUrl} alt="" className="h-full w-full object-cover" />
              </span>
            ) : (
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 ${
                  ICON_COLOR_CLASS[startIconColor] ?? ICON_COLOR_CLASS.default
                }`}
              >
                <FunnelLucideIcon name={startIconName} className="h-5 w-5" />
              </span>
            )}
          </div>
          <h1 className="text-3xl font-semibold">{form.schema.title || form.name}</h1>
          {form.schema.description ? (
            <p className="mt-2 opacity-65">{form.schema.description}</p>
          ) : null}
          <div className={`mt-8 ${isTwoCol ? 'grid grid-cols-2 gap-6' : 'space-y-6'}`}>
            {questions.map((question) => {
              const fullRow = isTwoCol && fullRowTypes.has(question.type)
              const reserveDescription = isTwoCol && !fullRow && question.type !== 'info_block'
              const hasError = Boolean(fieldErrors[question.id])
              return (
                <div
                  key={question.id}
                  data-question-id={question.id}
                  className={`space-y-2${fullRow ? 'col-span-2' : ''}`}
                >
                  <label className="block text-sm font-medium">
                    {question.label}
                    {question.required ? (
                      <span className="text-rose-300 opacity-80"> *</span>
                    ) : null}
                  </label>
                  {question.description ? (
                    <p className="text-xs opacity-50">{question.description}</p>
                  ) : reserveDescription ? (
                    <p className="select-none text-xs text-transparent" aria-hidden>
                      &nbsp;
                    </p>
                  ) : null}
                  <QuestionField
                    question={question}
                    value={answers[question.id]}
                    uploadToken={form.share_token}
                    isTwoCol={isTwoCol}
                    inputStyle={inputStyle}
                    buttonStyle={buttonStyle}
                    buttonHex={buttonHex}
                    theme={theme}
                    strokeHex={strokeHex}
                    hasError={hasError}
                    onChange={(value) => {
                      setAnswers((prev) => ({ ...prev, [question.id]: value }))
                      if (fieldErrors[question.id]) {
                        setFieldErrors((prev) => {
                          const next = { ...prev }
                          delete next[question.id]
                          return next
                        })
                      }
                    }}
                  />
                  {hasError ? (
                    <p className="mt-1 text-xs font-medium text-rose-300">
                      {fieldErrors[question.id]}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
          {captchaEnabled && awaitingCaptcha ? (
            <div className="mt-6 flex flex-col items-center gap-2">
              <TurnstileWidget
                key={turnstileResetKey}
                siteKey={TURNSTILE_SITE_KEY}
                theme={captchaTheme}
                onToken={(token) => setTurnstileToken(token)}
              />
              <p className="text-xs opacity-65">Verifying you're human…</p>
            </div>
          ) : null}
          {errorMessage ? (
            <p className="mt-3 text-center text-sm text-rose-300">{errorMessage}</p>
          ) : null}
          <button
            type="submit"
            disabled={submitting || awaitingCaptcha}
            className={`mt-6 h-12 w-full rounded-xl font-semibold text-white disabled:opacity-60 ${
              buttonStyle ? '' : 'bg-violet-500'
            }`}
            style={buttonStyle}
          >
            {submitting ? 'Submitting...' : awaitingCaptcha ? 'Verifying…' : buttonLabel}
          </button>
        </div>
      </form>
      <VibeyBrandingFooter theme={theme} />
    </main>
  )
}

function FunnelLucideIcon({ name, className }: { name: string; className?: string }) {
  const componentName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const IconComponent = (
    LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>
  )[componentName]
  if (!IconComponent) return <LucideIcons.CheckCircle2 className={className} />
  return <IconComponent className={className} />
}

function VibeyBrandingFooter({ theme }: { theme: 'light' | 'dark' }) {
  const baseClass =
    theme === 'light'
      ? 'mx-auto mt-6 max-w-2xl text-center text-xs text-slate-500'
      : 'mx-auto mt-6 max-w-2xl text-center text-xs text-white/45'
  const linkClass =
    theme === 'light'
      ? 'text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline'
      : 'text-white/70 underline-offset-2 hover:text-white hover:underline'
  return (
    <p className={baseClass}>
      Powered by{' '}
      <a href="https://vibey.im" target="_blank" rel="noopener noreferrer" className={linkClass}>
        Vibey
      </a>
    </p>
  )
}
