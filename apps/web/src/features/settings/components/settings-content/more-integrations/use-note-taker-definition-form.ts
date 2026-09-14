'use client'

import { useCallback, useState } from 'react'
import { SETTINGS_TOAST_ERRORS } from '@/features/settings/config/settings-toast-errors.config'
import {
  createNoteTakerDefinition,
  previewNoteTakerDefinition,
  type NoteTakerDefinitionInput,
  type NoteTakerPreviewResult,
} from '@/lib/integrations/meeting-provider-definitions'

/** Same rule as the API: dot paths, `[]` marks an array to iterate. */
export const FIELD_PATH_PATTERN = /^[A-Za-z0-9_$-]+(\[\])?(\.[A-Za-z0-9_$-]+(\[\])?)*$/

export type NoteTakerFormState = {
  displayName: string
  description: string
  logoUrl: string
  signatureScheme: 'none' | 'hmac_sha256'
  signatureHeader: string
  signatureEncoding: 'hex' | 'base64'
  signaturePrefix: string
  signatureKeyEncoding: 'utf8' | 'base64'
  eventTypePath: string
  acceptValues: string
  deliveryIdPath: string
  externalIdPath: string
  titlePath: string
  startTimePath: string
  endTimePath: string
  hostEmailPath: string
  sourceUrlPath: string
  summaryPath: string
  participantsPath: string
  participantEmailPath: string
  transcriptPath: string
  transcriptSpeakerPath: string
  transcriptTextPath: string
  transcriptTimestampPath: string
  actionsPath: string
  actionTextPath: string
  samplePayload: string
}

export const EMPTY_NOTE_TAKER_FORM: NoteTakerFormState = {
  displayName: '',
  description: '',
  logoUrl: '',
  signatureScheme: 'hmac_sha256',
  signatureHeader: '',
  signatureEncoding: 'hex',
  signaturePrefix: '',
  signatureKeyEncoding: 'utf8',
  eventTypePath: '',
  acceptValues: '',
  deliveryIdPath: '',
  externalIdPath: '',
  titlePath: '',
  startTimePath: '',
  endTimePath: '',
  hostEmailPath: '',
  sourceUrlPath: '',
  summaryPath: '',
  participantsPath: '',
  participantEmailPath: '',
  transcriptPath: '',
  transcriptSpeakerPath: '',
  transcriptTextPath: '',
  transcriptTimestampPath: '',
  actionsPath: '',
  actionTextPath: '',
  samplePayload: '',
}

export type NoteTakerFormErrors = Partial<Record<keyof NoteTakerFormState, string>>

const REQUIRED_PATHS: Array<keyof NoteTakerFormState> = [
  'externalIdPath',
  'transcriptPath',
  'transcriptTextPath',
]
const OPTIONAL_PATHS: Array<keyof NoteTakerFormState> = [
  'eventTypePath',
  'deliveryIdPath',
  'titlePath',
  'startTimePath',
  'endTimePath',
  'hostEmailPath',
  'sourceUrlPath',
  'summaryPath',
  'participantsPath',
  'participantEmailPath',
  'transcriptSpeakerPath',
  'transcriptTimestampPath',
  'actionsPath',
  'actionTextPath',
]

const optional = (value: string): string | undefined => (value.trim() ? value.trim() : undefined)

/** Client-side validation and the exact API body; the API validates again. */
export function buildDefinitionInput(
  state: NoteTakerFormState,
): { ok: true; input: NoteTakerDefinitionInput } | { ok: false; errors: NoteTakerFormErrors } {
  const errors: NoteTakerFormErrors = {}
  if (state.displayName.trim().length < 2) errors.displayName = 'Give the tool a name'
  if (state.logoUrl.trim() && !/^https?:\/\//i.test(state.logoUrl.trim())) {
    errors.logoUrl = 'Logo must be an https address'
  }
  if (
    state.signatureScheme === 'hmac_sha256' &&
    !/^[A-Za-z0-9-]+$/.test(state.signatureHeader.trim())
  ) {
    errors.signatureHeader = 'Header name, for example X-Signature'
  }
  for (const key of REQUIRED_PATHS) {
    if (!FIELD_PATH_PATTERN.test(state[key].trim()))
      errors[key] = 'Required, for example meeting.id'
  }
  for (const key of OPTIONAL_PATHS) {
    const value = state[key].trim()
    if (value && !FIELD_PATH_PATTERN.test(value)) errors[key] = 'Use a dot path like a.b[].c'
  }
  if (state.actionsPath.trim() && !state.actionTextPath.trim()) {
    errors.actionTextPath = 'Where is the text inside each action item?'
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const acceptValues = state.acceptValues
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const input: NoteTakerDefinitionInput = {
    displayName: state.displayName.trim(),
    ...(optional(state.description) ? { description: state.description.trim() } : {}),
    ...(optional(state.logoUrl) ? { logoUrl: state.logoUrl.trim() } : {}),
    signature:
      state.signatureScheme === 'none'
        ? { scheme: 'none' }
        : {
            scheme: 'hmac_sha256',
            header: state.signatureHeader.trim(),
            encoding: state.signatureEncoding,
            ...(optional(state.signaturePrefix) ? { prefix: state.signaturePrefix.trim() } : {}),
            keyEncoding: state.signatureKeyEncoding,
          },
    event: {
      ...(optional(state.eventTypePath) ? { eventTypePath: state.eventTypePath.trim() } : {}),
      ...(acceptValues.length > 0 ? { acceptValues } : {}),
      ...(optional(state.deliveryIdPath) ? { deliveryIdPath: state.deliveryIdPath.trim() } : {}),
    },
    fieldMap: {
      externalId: state.externalIdPath.trim(),
      ...(optional(state.titlePath) ? { title: state.titlePath.trim() } : {}),
      ...(optional(state.startTimePath) ? { startTime: state.startTimePath.trim() } : {}),
      ...(optional(state.endTimePath) ? { endTime: state.endTimePath.trim() } : {}),
      ...(optional(state.hostEmailPath) ? { hostEmail: state.hostEmailPath.trim() } : {}),
      ...(optional(state.sourceUrlPath) ? { sourceUrl: state.sourceUrlPath.trim() } : {}),
      ...(optional(state.summaryPath) ? { summary: state.summaryPath.trim() } : {}),
      ...(optional(state.participantsPath)
        ? {
            participants: {
              path: state.participantsPath.trim(),
              ...(optional(state.participantEmailPath)
                ? { email: state.participantEmailPath.trim() }
                : {}),
            },
          }
        : {}),
      transcript: {
        path: state.transcriptPath.trim(),
        text: state.transcriptTextPath.trim(),
        ...(optional(state.transcriptSpeakerPath)
          ? { speaker: state.transcriptSpeakerPath.trim() }
          : {}),
        ...(optional(state.transcriptTimestampPath)
          ? { timestamp: state.transcriptTimestampPath.trim() }
          : {}),
      },
      ...(optional(state.actionsPath)
        ? { actions: { path: state.actionsPath.trim(), text: state.actionTextPath.trim() } }
        : {}),
    },
  }
  return { ok: true, input }
}

export function parseSamplePayload(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export function useNoteTakerDefinitionForm(
  onCreated: (created: { slug: string; displayName: string }) => void,
) {
  const [state, setState] = useState<NoteTakerFormState>(EMPTY_NOTE_TAKER_FORM)
  const [errors, setErrors] = useState<NoteTakerFormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<NoteTakerPreviewResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const setField = useCallback(
    <K extends keyof NoteTakerFormState>(key: K, value: NoteTakerFormState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    },
    [],
  )

  const reset = useCallback(() => {
    setState(EMPTY_NOTE_TAKER_FORM)
    setErrors({})
    setSubmitError(null)
    setPreview(null)
    setPreviewError(null)
  }, [])

  const runPreview = useCallback(async () => {
    const built = buildDefinitionInput(state)
    if (!built.ok) {
      setErrors(built.errors)
      return
    }
    const sample = parseSamplePayload(state.samplePayload)
    if (!sample) {
      setErrors((prev) => ({ ...prev, samplePayload: 'Paste one JSON object the tool would send' }))
      return
    }
    setPreviewing(true)
    setPreviewError(null)
    try {
      setPreview(await previewNoteTakerDefinition(built.input, sample))
    } catch (err) {
      setPreviewError(
        err instanceof Error && err.message
          ? err.message
          : SETTINGS_TOAST_ERRORS.NOTE_TAKER_PREVIEW_FAILED.userMessage,
      )
    } finally {
      setPreviewing(false)
    }
  }, [state])

  const submit = useCallback(async () => {
    const built = buildDefinitionInput(state)
    if (!built.ok) {
      setErrors(built.errors)
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await createNoteTakerDefinition(built.input)
      onCreated(created)
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : SETTINGS_TOAST_ERRORS.NOTE_TAKER_SAVE_FAILED.userMessage,
      )
    } finally {
      setSubmitting(false)
    }
  }, [state, onCreated])

  return {
    state,
    errors,
    setField,
    reset,
    submitting,
    submitError,
    submit,
    previewing,
    preview,
    previewError,
    runPreview,
  }
}
