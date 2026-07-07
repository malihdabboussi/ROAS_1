import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronRight, Globe } from 'lucide-react'
import type { LlmModelOption } from '../shared/types'
import { sendExtensionMessage } from '../shared/chrome-utils'
import { positionFloatingMenuFromAnchorRect } from './floating-menu-anchor'
import { Tooltip } from '../ui/Tooltip'

type RecordingState = 'idle' | 'starting' | 'recording' | 'finishing'
const MIC_BLOCKED_MESSAGE =
  'Microphone access is blocked. Allow microphone in Chrome settings and try again.'
const SUBSCRIPTION_MODELS_MENU_LABEL = 'OpenAI Subscription'

function isSubscriptionModel(option: LlmModelOption): boolean {
  return option.id.startsWith('openai-codex/')
}

function partitionModelOptions(modelOptions: LlmModelOption[]): {
  standardModels: LlmModelOption[]
  subscriptionModels: LlmModelOption[]
} {
  const standardModels: LlmModelOption[] = []
  const subscriptionModels: LlmModelOption[] = []
  for (const option of modelOptions) {
    if (isSubscriptionModel(option)) subscriptionModels.push(option)
    else standardModels.push(option)
  }
  return { standardModels, subscriptionModels }
}

function formatSubscriptionModelDisplayLabel(option: LlmModelOption): string {
  const stripped = option.label.replace(/^OpenAI Subscription\s+/i, '').trim()
  return stripped.length > 0 ? stripped : option.label
}

const MODEL_STRATEGIES = [
  {
    id: 'auto:economy',
    label: 'Economy',
    description: 'Best for lighter tasks and cost savings',
    chipClass: 'chip-glass-green',
    textClass: 'text-chip-strategy-green',
  },
  {
    id: 'auto',
    label: 'Auto',
    description: 'Best for balanced quality and cost',
    chipClass: 'chip-glass-blue',
    textClass: 'text-chip-strategy-blue',
  },
  {
    id: 'auto:power',
    label: 'Power',
    description: 'Best for complex tasks and maximum quality',
    chipClass: 'chip-glass-purple',
    textClass: 'text-chip-strategy-purple',
  },
] as const

type ModelStrategyId = (typeof MODEL_STRATEGIES)[number]['id']

function isModelStrategyId(value: string | null | undefined): value is ModelStrategyId {
  return value === 'auto' || value === 'auto:economy' || value === 'auto:power'
}

const VIEWPORT_MARGIN = 8

interface Props {
  onSend: (text: string, model?: string) => void
  onStop: () => void
  streaming: boolean
  disabled: boolean
  pageContext: boolean
  onTogglePage: () => void
  hasPage: boolean
  conversationId: string | null
  defaultModel?: string | null
  campaignModelStrategy?: string | null
}

export function ChatComposer({
  onSend,
  onStop,
  streaming,
  disabled,
  pageContext,
  onTogglePage,
  hasPage,
  conversationId,
  defaultModel = null,
  campaignModelStrategy = null,
}: Props) {
  const [text, setText] = useState('')
  const [recState, setRecState] = useState<RecordingState>('idle')
  const [recSeconds, setRecSeconds] = useState(0)
  const [recError, setRecError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const cancelRef = useRef<boolean>(false)
  const skipChromePermissionRequestRef = useRef<boolean>(false)
  const speechRecognitionRef = useRef<any>(null)
  const recordingActiveRef = useRef<boolean>(false)
  const baseTextBeforeRecordingRef = useRef<string>('')
  const liveTranscriptRef = useRef<string>('')
  const loggedLiveTranscriptRef = useRef<boolean>(false)

  const [modelOptions, setModelOptions] = useState<LlmModelOption[]>([])
  const [selectedComposerModel, setSelectedComposerModel] = useState<string | null>(null)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [modelDropdownPos, setModelDropdownPos] = useState({ top: 0, left: 0 })
  const [specificModelSubmenuOpen, setSpecificModelSubmenuOpen] = useState(false)
  const [specificModelSubmenuPos, setSpecificModelSubmenuPos] = useState({ top: 0, left: 0 })
  const [subscriptionSubmenuOpen, setSubscriptionSubmenuOpen] = useState(false)
  const [subscriptionSubmenuPos, setSubscriptionSubmenuPos] = useState({ top: 0, left: 0 })
  const specificModelSubmenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subscriptionSubmenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modelButtonRef = useRef<HTMLButtonElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const specificModelRowRef = useRef<HTMLDivElement>(null)
  const specificModelSubmenuRef = useRef<HTMLDivElement>(null)
  const subscriptionModelRowRef = useRef<HTMLDivElement>(null)
  const subscriptionSubmenuRef = useRef<HTMLDivElement>(null)

  const inheritedModel =
    typeof defaultModel === 'string' && defaultModel.trim().length > 0
      ? defaultModel.trim()
      : typeof campaignModelStrategy === 'string' && campaignModelStrategy.trim().length > 0
        ? campaignModelStrategy.trim()
        : 'auto'

  const activeComposerModel = selectedComposerModel ?? inheritedModel
  const { standardModels, subscriptionModels } = partitionModelOptions(modelOptions)
  const activeComposerModelLabel = isModelStrategyId(activeComposerModel)
    ? (MODEL_STRATEGIES.find((strategy) => strategy.id === activeComposerModel)?.label ?? 'Auto')
    : (() => {
        const option = modelOptions.find((row) => row.id === activeComposerModel)
        if (!option) return 'Custom'
        if (isSubscriptionModel(option)) return formatSubscriptionModelDisplayLabel(option)
        return option.label
      })()
  const activeComposerChipClass = isModelStrategyId(activeComposerModel)
    ? (MODEL_STRATEGIES.find((strategy) => strategy.id === activeComposerModel)?.chipClass ??
      'chip-glass-blue')
    : 'chip-glass-neutral'

  useEffect(() => {
    setSelectedComposerModel(null)
  }, [conversationId, defaultModel])

  useEffect(() => {
    let cancelled = false
    void sendExtensionMessage<{ ok: boolean; models?: LlmModelOption[] }>({ type: 'FETCH_LLM_MODELS' })
      .then((res) => {
        if (cancelled || !res.ok || !res.models) return
        setModelOptions(res.models)
      })
      .catch(() => {
        if (!cancelled) setModelOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const updateModelDropdownPosition = useCallback(() => {
    if (!modelButtonRef.current) return
    const rect = modelButtonRef.current.getBoundingClientRect()
    const menuWidth = 240
    const menuHeightCap = 320
    const measured = modelDropdownRef.current?.offsetHeight
    const menuHeight = Math.min(
      Math.max(measured && measured > 0 ? measured : 0, 140),
      menuHeightCap,
    )
    setModelDropdownPos(
      positionFloatingMenuFromAnchorRect(rect, {
        menuWidth,
        menuHeight,
        gap: VIEWPORT_MARGIN,
        viewportMargin: VIEWPORT_MARGIN,
      }),
    )
  }, [])

  /** Anchor to main model panel’s right edge (narrow side panel); avoids flyout sitting under the main menu. */
  const updateSpecificModelSubmenuPosition = useCallback(() => {
    if (!specificModelRowRef.current || !modelDropdownRef.current) return
    const rowRect = specificModelRowRef.current.getBoundingClientRect()
    const mainRect = modelDropdownRef.current.getBoundingClientRect()
    const menuWidth = 220
    const menuHeight = 280
    const gap = 4
    const m = VIEWPORT_MARGIN

    const rightEdge = mainRect.right + gap
    const fitsRight = rightEdge + menuWidth + m <= window.innerWidth
    const left = fitsRight
      ? rightEdge
      : Math.max(m, mainRect.left - menuWidth - gap)

    const maxTop = window.innerHeight - menuHeight - m
    const top = Math.min(Math.max(m, rowRect.top), maxTop)

    setSpecificModelSubmenuPos({ top, left })
  }, [])

  const updateSubscriptionSubmenuPosition = useCallback(() => {
    if (!subscriptionModelRowRef.current || !modelDropdownRef.current) return
    const rowRect = subscriptionModelRowRef.current.getBoundingClientRect()
    const mainRect = modelDropdownRef.current.getBoundingClientRect()
    const menuWidth = 220
    const menuHeight = 280
    const gap = 4
    const m = VIEWPORT_MARGIN

    const rightEdge = mainRect.right + gap
    const fitsRight = rightEdge + menuWidth + m <= window.innerWidth
    const left = fitsRight
      ? rightEdge
      : Math.max(m, mainRect.left - menuWidth - gap)

    const maxTop = window.innerHeight - menuHeight - m
    const top = Math.min(Math.max(m, rowRect.top), maxTop)

    setSubscriptionSubmenuPos({ top, left })
  }, [])

  const toggleModelDropdown = useCallback(() => {
    updateModelDropdownPosition()
    setModelDropdownOpen((prev) => !prev)
  }, [updateModelDropdownPosition])

  useLayoutEffect(() => {
    if (!modelDropdownOpen) return
    updateModelDropdownPosition()
  }, [modelDropdownOpen, updateModelDropdownPosition])

  useEffect(() => {
    if (!modelDropdownOpen) return
    const reposition = () => updateModelDropdownPosition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [modelDropdownOpen, updateModelDropdownPosition])

  useLayoutEffect(() => {
    if (!specificModelSubmenuOpen) return
    updateSpecificModelSubmenuPosition()
  }, [specificModelSubmenuOpen, updateSpecificModelSubmenuPosition])

  useEffect(() => {
    if (!specificModelSubmenuOpen) return
    const reposition = () => updateSpecificModelSubmenuPosition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [specificModelSubmenuOpen, updateSpecificModelSubmenuPosition])

  useLayoutEffect(() => {
    if (!subscriptionSubmenuOpen) return
    updateSubscriptionSubmenuPosition()
  }, [subscriptionSubmenuOpen, updateSubscriptionSubmenuPosition])

  useEffect(() => {
    if (!subscriptionSubmenuOpen) return
    const reposition = () => updateSubscriptionSubmenuPosition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [subscriptionSubmenuOpen, updateSubscriptionSubmenuPosition])

  useEffect(() => {
    if (!modelDropdownOpen) {
      setSpecificModelSubmenuOpen(false)
      setSubscriptionSubmenuOpen(false)
    }
  }, [modelDropdownOpen])

  useEffect(() => {
    if (!modelDropdownOpen && !specificModelSubmenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        modelDropdownOpen &&
        !modelDropdownRef.current?.contains(target) &&
        !modelButtonRef.current?.contains(target) &&
        !specificModelSubmenuRef.current?.contains(target) &&
        !subscriptionSubmenuRef.current?.contains(target)
      ) {
        setModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [modelDropdownOpen, specificModelSubmenuOpen])

  const normalizeMicError = (err: unknown): string => {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') return MIC_BLOCKED_MESSAGE
      if (err.name === 'NotFoundError') return 'No microphone was found on this device.'
      if (err.name === 'NotReadableError')
        return 'Microphone is currently in use by another app.'
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (/permission dismissed|notallowed/i.test(msg)) return MIC_BLOCKED_MESSAGE
    if (/not found|no audio/i.test(msg)) return 'No microphone was found on this device.'
    return msg || 'Microphone unavailable'
  }

  const requestAudioCapturePermission = async (): Promise<boolean> => {
    if (typeof chrome === 'undefined' || !chrome.permissions?.request || !chrome.permissions?.contains) {
      return true
    }
    const alreadyGranted = await new Promise<boolean>((resolve) => {
      chrome.permissions.contains({ permissions: ['audioCapture'] }, (granted) => {
        if (chrome.runtime.lastError) return resolve(false)
        resolve(Boolean(granted))
      })
    })
    if (alreadyGranted) return true
    if (skipChromePermissionRequestRef.current) {
      return true
    }
    return new Promise<boolean>((resolve) => {
      chrome.permissions.request({ permissions: ['audioCapture'] }, (granted) => {
        const lastErrorMessage = chrome.runtime.lastError?.message ?? null
        if (
          typeof lastErrorMessage === 'string' &&
          /Only permissions specified in the manifest may be requested/i.test(lastErrorMessage)
        ) {
          skipChromePermissionRequestRef.current = true
        }
        if (chrome.runtime.lastError) return resolve(true)
        resolve(Boolean(granted))
      })
    })
  }

  const openExtensionMicSettings = () => {
    const extensionPage = chrome.runtime.getURL('sidepanel.html')
    const settingsUrl = `chrome://settings/content/siteDetails?site=${encodeURIComponent(extensionPage)}`
    chrome.tabs.create({ url: settingsUrl }, () => {
      if (!chrome.runtime.lastError) return
      chrome.tabs.create({ url: extensionPage })
    })
  }

  const stopLiveRecognition = () => {
    const recognition = speechRecognitionRef.current
    if (!recognition) return
    try {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.stop()
    } catch {
      /* ignore */
    }
    speechRecognitionRef.current = null
  }

  const startLiveRecognition = () => {
    const ctor =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .SpeechRecognition ??
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any })
        .webkitSpeechRecognition

    if (!ctor) {
      return
    }

    const recognition = new ctor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let nextTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        const alt = event.results[i]?.[0]
        if (alt?.transcript) nextTranscript += `${alt.transcript} `
      }
      nextTranscript = nextTranscript.trim().replace(/\s+/g, ' ')
      liveTranscriptRef.current = nextTranscript

      const base = baseTextBeforeRecordingRef.current
      const nextText = base
        ? nextTranscript
          ? `${base}${base.endsWith(' ') ? '' : ' '}${nextTranscript}`
          : base
        : nextTranscript
      setText(nextText)

      if (nextTranscript && !loggedLiveTranscriptRef.current) {
        loggedLiveTranscriptRef.current = true
      }
    }
    recognition.onerror = (_event: any) => {}

    recognition.onend = () => {
      if (!recordingActiveRef.current) return
      try {
        recognition.start()
      } catch (_e) {
        /* ignore */
      }
    }

    try {
      recognition.start()
      speechRecognitionRef.current = recognition
    } catch (_e) {
      /* ignore */
    }
  }

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  useEffect(resize, [text, resize])

  const submit = () => {
    const v = text.trim()
    if (!v || streaming || disabled) return
    onSend(v, activeComposerModel)
    setText('')
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const teardownStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result
        if (typeof result !== 'string') return reject(new Error('Invalid audio data'))
        const comma = result.indexOf(',')
        resolve(comma >= 0 ? result.slice(comma + 1) : result)
      }
      reader.onerror = () => reject(reader.error ?? new Error('Read error'))
      reader.readAsDataURL(blob)
    })

  const pickMime = (): string => {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    for (const m of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m
    }
    return ''
  }

  const startRecording = async () => {
    if (recState !== 'idle' || streaming || disabled) return
    setRecError(null)
    setRecState('starting')
    cancelRef.current = false
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone is not available in this browser context.')
      }
      await requestAudioCapturePermission()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = pickMime()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      recorderRef.current = rec
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }
      rec.onstop = async () => {
        clearTimer()
        teardownStream()
        if (cancelRef.current) {
          recorderRef.current = null
          chunksRef.current = []
          setText(baseTextBeforeRecordingRef.current)
          liveTranscriptRef.current = ''
          baseTextBeforeRecordingRef.current = ''
          setRecState('idle')
          setRecSeconds(0)
          return
        }
        const mimeType = rec.mimeType || mime || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        recorderRef.current = null
        chunksRef.current = []
        if (blob.size === 0) {
          setRecState('idle')
          setRecSeconds(0)
          return
        }
        setRecState('finishing')
        try {
          const base64 = await blobToBase64(blob)
          const res = await sendExtensionMessage<{ ok: boolean; text?: string; error?: string }>({
            type: 'TRANSCRIBE_AUDIO',
            audioBase64: base64,
            mimeType,
          })
          if (res.ok && res.text) {
            const appended = res.text.trim()
            if (appended) {
              const base = baseTextBeforeRecordingRef.current
              const merged = base
                ? `${base}${base.endsWith(' ') ? '' : ' '}${appended}`
                : appended
              setText(merged)
              requestAnimationFrame(() => ref.current?.focus())
            }
          } else if (!res.ok) {
            setRecError(res.error ?? 'Transcription failed')
          }
        } catch (e) {
          setRecError(normalizeMicError(e))
        } finally {
          liveTranscriptRef.current = ''
          baseTextBeforeRecordingRef.current = ''
          setRecState('idle')
          setRecSeconds(0)
        }
      }
      rec.start()
      baseTextBeforeRecordingRef.current = text
      liveTranscriptRef.current = ''
      loggedLiveTranscriptRef.current = false
      recordingActiveRef.current = true
      startLiveRecognition()
      setRecState('recording')
      const startedAt = Date.now()
      timerRef.current = window.setInterval(() => {
        setRecSeconds(Math.floor((Date.now() - startedAt) / 1000))
      }, 250)
    } catch (e) {
      teardownStream()
      recordingActiveRef.current = false
      stopLiveRecognition()
      recorderRef.current = null
      chunksRef.current = []
      setRecState('idle')
      setRecSeconds(0)
      setRecError(normalizeMicError(e))
    }
  }

  const stopRecording = () => {
    if (recState !== 'recording') return
    recordingActiveRef.current = false
    stopLiveRecognition()
    const rec = recorderRef.current
    if (rec && rec.state === 'recording') rec.stop()
  }

  const cancelRecording = () => {
    if (recState !== 'recording') return
    cancelRef.current = true
    recordingActiveRef.current = false
    stopLiveRecognition()
    const rec = recorderRef.current
    if (rec && rec.state === 'recording') rec.stop()
  }

  useEffect(
    () => () => {
      clearTimer()
      recordingActiveRef.current = false
      stopLiveRecognition()
      teardownStream()
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        try {
          recorderRef.current.stop()
        } catch {
          /* ignore */
        }
      }
    },
    [clearTimer, teardownStream],
  )

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const recording = recState === 'recording'
  const finishing = recState === 'finishing'
  const starting = recState === 'starting'
  const micBlocked = recError === MIC_BLOCKED_MESSAGE

  const modelMenu =
    modelDropdownOpen &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        ref={modelDropdownRef}
        className="dropdown-menu-solid z-dropdown ext-model-dropdown-main fixed py-spacing-1"
        style={{ top: modelDropdownPos.top, left: modelDropdownPos.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ext-model-dropdown-scroll">
          <div className="px-spacing-2 py-spacing-1">
            {MODEL_STRATEGIES.map((strategy) => {
              const isSelected = activeComposerModel === strategy.id
              return (
                <button
                  key={strategy.id}
                  type="button"
                  onClick={() => {
                    setSelectedComposerModel(strategy.id)
                    setModelDropdownOpen(false)
                  }}
                  className={`rounded-spacing-2 px-spacing-2 py-spacing-1 gap-spacing-2 hover-bg-studio-subtle flex w-full items-start justify-between text-left transition-all ${strategy.textClass}`}
                >
                  <div className="flex min-w-0 flex-col gap-0-5">
                    <span className="body-3 font-medium">{strategy.label}</span>
                    <span className="body-4 text-muted-foreground">{strategy.description}</span>
                  </div>
                  {isSelected && <Check className="icon-3-5 mt-spacing-1 shrink-0" aria-hidden="true" />}
                </button>
              )
            })}
            {subscriptionModels.length > 0 ? (
              <div
                ref={subscriptionModelRowRef}
                className="relative"
                onMouseEnter={() => {
                  if (subscriptionSubmenuTimeoutRef.current) {
                    clearTimeout(subscriptionSubmenuTimeoutRef.current)
                    subscriptionSubmenuTimeoutRef.current = null
                  }
                  setSubscriptionSubmenuOpen(true)
                }}
                onMouseLeave={() => {
                  subscriptionSubmenuTimeoutRef.current = setTimeout(() => {
                    setSubscriptionSubmenuOpen(false)
                    subscriptionSubmenuTimeoutRef.current = null
                  }, 150)
                }}
              >
                <button
                  type="button"
                  className="rounded-spacing-2 body-3 px-spacing-2 py-spacing-1 text-muted-foreground hover-bg-studio-subtle hover-text-foreground flex w-full items-center justify-between text-left transition-all"
                >
                  <span>{SUBSCRIPTION_MODELS_MENU_LABEL}</span>
                  {subscriptionModels.some((option) => option.id === activeComposerModel) ? (
                    <Check className="icon-3-5 shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="icon-3-5 shrink-0" aria-hidden="true" />
                  )}
                </button>
                {subscriptionSubmenuOpen &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <div
                      ref={subscriptionSubmenuRef}
                      className="dropdown-menu-solid z-dropdown rounded-spacing-2 px-spacing-2 py-spacing-1 fixed overflow-y-auto ext-specific-model-flyout"
                      style={{
                        top: subscriptionSubmenuPos.top,
                        left: subscriptionSubmenuPos.left,
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseEnter={() => {
                        if (subscriptionSubmenuTimeoutRef.current) {
                          clearTimeout(subscriptionSubmenuTimeoutRef.current)
                          subscriptionSubmenuTimeoutRef.current = null
                        }
                        setSubscriptionSubmenuOpen(true)
                      }}
                      onMouseLeave={() => {
                        subscriptionSubmenuTimeoutRef.current = setTimeout(() => {
                          setSubscriptionSubmenuOpen(false)
                          subscriptionSubmenuTimeoutRef.current = null
                        }, 150)
                      }}
                    >
                      {subscriptionModels.map((option) => {
                        const isSelected = activeComposerModel === option.id
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setSelectedComposerModel(option.id)
                              setModelDropdownOpen(false)
                              setSubscriptionSubmenuOpen(false)
                            }}
                            className={`rounded-spacing-2 body-3 px-spacing-2 py-spacing-1 flex w-full items-center justify-between text-left transition-all ${
                              isSelected
                                ? 'bg-primary-subtle-10 text-foreground'
                                : 'text-muted-foreground hover-bg-studio-subtle hover-text-foreground'
                            }`}
                          >
                            <span className="text-truncate">
                              {formatSubscriptionModelDisplayLabel(option)}
                            </span>
                            {isSelected && (
                              <Check className="icon-3-5 shrink-0" aria-hidden="true" />
                            )}
                          </button>
                        )
                      })}
                    </div>,
                    document.body,
                  )}
              </div>
            ) : null}
            {standardModels.length > 0 ? (
            <div
              ref={specificModelRowRef}
              className="relative"
              onMouseEnter={() => {
                if (specificModelSubmenuTimeoutRef.current) {
                  clearTimeout(specificModelSubmenuTimeoutRef.current)
                  specificModelSubmenuTimeoutRef.current = null
                }
                setSpecificModelSubmenuOpen(true)
              }}
              onMouseLeave={() => {
                specificModelSubmenuTimeoutRef.current = setTimeout(() => {
                  setSpecificModelSubmenuOpen(false)
                  specificModelSubmenuTimeoutRef.current = null
                }, 150)
              }}
            >
              <button
                type="button"
                className="rounded-spacing-2 body-3 px-spacing-2 py-spacing-1 text-muted-foreground hover-bg-studio-subtle hover-text-foreground flex w-full items-center justify-between text-left transition-all"
              >
                <span>Specific model</span>
                {!isModelStrategyId(activeComposerModel) &&
                standardModels.some((option) => option.id === activeComposerModel) ? (
                  <Check className="icon-3-5 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronRight className="icon-3-5 shrink-0" aria-hidden="true" />
                )}
              </button>
              {specificModelSubmenuOpen &&
                standardModels.length > 0 &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    ref={specificModelSubmenuRef}
                    className="dropdown-menu-solid z-dropdown rounded-spacing-2 px-spacing-2 py-spacing-1 fixed overflow-y-auto ext-specific-model-flyout"
                    style={{
                      top: specificModelSubmenuPos.top,
                      left: specificModelSubmenuPos.left,
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseEnter={() => {
                      if (specificModelSubmenuTimeoutRef.current) {
                        clearTimeout(specificModelSubmenuTimeoutRef.current)
                        specificModelSubmenuTimeoutRef.current = null
                      }
                      setSpecificModelSubmenuOpen(true)
                    }}
                    onMouseLeave={() => {
                      specificModelSubmenuTimeoutRef.current = setTimeout(() => {
                        setSpecificModelSubmenuOpen(false)
                        specificModelSubmenuTimeoutRef.current = null
                      }, 150)
                    }}
                  >
                    {standardModels.map((option) => {
                      const isSelected = activeComposerModel === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSelectedComposerModel(option.id)
                            setModelDropdownOpen(false)
                            setSpecificModelSubmenuOpen(false)
                          }}
                          className={`rounded-spacing-2 body-3 px-spacing-2 py-spacing-1 flex w-full items-center justify-between text-left transition-all ${
                            isSelected
                              ? 'bg-primary-subtle-10 text-foreground'
                              : 'text-muted-foreground hover-bg-studio-subtle hover-text-foreground'
                          }`}
                        >
                          <span className="text-truncate">{option.label}</span>
                          {isSelected && <Check className="icon-3-5 shrink-0" aria-hidden="true" />}
                        </button>
                      )
                    })}
                  </div>,
                  document.body,
                )}
            </div>
            ) : null}
          </div>
        </div>
      </div>,
      document.body,
    )

  return (
    <div className="input-glass chat-composer-root relative flex flex-col overflow-hidden">
      <div>
        <div className="relative min-w-0 w-full px-spacing-3 pt-spacing-1">
          <textarea
            ref={ref}
            className="body-2 text-foreground caret-accent chat-composer-textarea chat-composer-textarea--footer-row relative w-full resize-none bg-transparent whitespace-pre-wrap break-words"
            placeholder={
              recording
                ? 'Listening…'
                : finishing
                  ? 'Transcribing…'
                  : starting
                    ? 'Starting…'
                    : 'Message Vibey…'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            disabled={disabled || recording || finishing || starting}
          />
          <div className="chat-composer-inner-controls">
            <div className="min-w-0 ext-composer-model-slot">
              <button
                ref={modelButtonRef}
                type="button"
                onClick={toggleModelDropdown}
                disabled={starting || finishing}
                className={`${activeComposerChipClass} flex h-8 max-w-full items-center gap-1 rounded-full px-spacing-2 transition-all`}
                aria-label="Model strategy"
              >
                <span className="typo-caption font-medium text-truncate">{activeComposerModelLabel}</span>
                <ChevronDown className="icon-3-5 shrink-0" aria-hidden="true" />
              </button>
              {modelMenu}
            </div>
            <div className="ext-chat-rec-info flex flex-1 justify-center">
              {recording && (
                <>
                  <span className="ext-chat-rec-dot" aria-hidden="true" />
                  <span className="body-4 text-muted-foreground ext-chat-rec-time">{fmtTime(recSeconds)}</span>
                </>
              )}
              {finishing && <span className="body-4 text-muted-foreground">Transcribing…</span>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {hasPage && !recording && !finishing && (
                <Tooltip label={pageContext ? 'Page context on' : 'Page context off'}>
                  <button
                    type="button"
                    className={`btn-icon-glass ${
                      pageContext ? 'ext-page-context-on' : 'ext-page-context-off'
                    }`}
                    onClick={onTogglePage}
                    aria-label={pageContext ? 'Page context on' : 'Page context off'}
                  >
                    <Globe className="icon-3-5" aria-hidden="true" />
                  </button>
                </Tooltip>
              )}
              {recording ? (
                <>
                  <Tooltip label="Cancel">
                    <button
                      type="button"
                      className="btn-icon-glass-destructive"
                      onClick={cancelRecording}
                      aria-label="Cancel recording"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip label="Stop">
                    <button
                      type="button"
                      className="btn-icon-glass-destructive"
                      onClick={stopRecording}
                      aria-label="Stop recording"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </button>
                  </Tooltip>
                </>
              ) : streaming ? (
                <Tooltip label="Stop generating">
                  <button type="button" className="btn-icon-glass" onClick={onStop} aria-label="Stop generating">
                    <svg className="icon-3-5" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                </Tooltip>
              ) : (
                <>
                  <Tooltip label="Voice input">
                    <button
                      type="button"
                      className="btn-icon-glass"
                      disabled={disabled || finishing || starting}
                      onClick={() => void startRecording()}
                      aria-label="Voice input"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 10a7 7 0 0 0 14 0" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                        <line x1="8" y1="22" x2="16" y2="22" />
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip label="Send message">
                    <button
                      type="button"
                      className="button-glass-accent button-glass-accent--icon"
                      disabled={!text.trim() || disabled || finishing || starting}
                      onClick={submit}
                      aria-label="Send message"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </div>
        {recError && !recording && !finishing && (
          <div className="px-spacing-4 pb-spacing-1">
            <div className="body-4 text-destructive">{recError}</div>
            {micBlocked && (
              <div className="ext-row">
                <button type="button" className="ext-link" onClick={() => void startRecording()}>
                  Retry permission prompt
                </button>
                <button type="button" className="ext-link" onClick={openExtensionMicSettings}>
                  Open extension site settings
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
