'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'
import WaveSurfer from 'wavesurfer.js'
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { transcribeBackendApi } from '@/lib/services/transcribe-backend-api'

interface SimpleChatAudioRecorderProps {
  isRecording: boolean
  onTranscriptionUpdate: (text: string, delta?: string) => void
  onTranscriptionComplete: (text: string, delta?: string) => void
  onError?: (message: string) => void
  insertionMode?: boolean
}

export function SimpleChatAudioRecorder({
  isRecording,
  onTranscriptionUpdate,
  onTranscriptionComplete,
  onError,
  insertionMode = false,
}: SimpleChatAudioRecorderProps) {
  const [recordingTime, setRecordingTime] = useState(0)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'recording' | 'finishing'>('idle')

  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const recordPluginRef = useRef<any>(null)
  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const deepgramConnectionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<{
    audioContext: AudioContext
    processor: any
    source: any
  } | null>(null)
  const mountedRef = useRef(true)
  const connectionGenerationRef = useRef<number>(0)
  const currentConnectionGenerationRef = useRef<number>(0)
  const isSettingUpRef = useRef<boolean>(false)
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const setupPromiseRef = useRef<Promise<any> | null>(null)
  const resolveSetupRef = useRef<((conn: any) => void) | null>(null)
  const rejectSetupRef = useRef<((e: any) => void) | null>(null)
  const startingRef = useRef<boolean>(false)
  const lastSetupErrorRef = useRef<string | null>(null)
  const sessionStartTsRef = useRef<number | null>(null)
  const postedUsageRef = useRef<boolean>(false)
  const usedModelRef = useRef<string>('nova-2')

  const accumulatedTextRef = useRef<string>('')
  const sessionTextRef = useRef<string>('')
  const forceCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamStopFinalizedRef = useRef(false)

  const cleanup = useCallback(() => {
    if (forceCompleteTimerRef.current) {
      clearTimeout(forceCompleteTimerRef.current)
      forceCompleteTimerRef.current = null
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.processor.disconnect()
        audioContextRef.current.source.disconnect()
        audioContextRef.current.audioContext.close()
      } catch {}
      audioContextRef.current = null
    }

    if (recordPluginRef.current) {
      try {
        recordPluginRef.current.stopRecording()
        recordPluginRef.current.stopMic()
      } catch {}
      recordPluginRef.current = null
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current)
      keepAliveIntervalRef.current = null
    }

    startingRef.current = false
    isSettingUpRef.current = false
    setupPromiseRef.current = null
    resolveSetupRef.current = null
    rejectSetupRef.current = null

    if (wavesurferRef.current) {
      try {
        wavesurferRef.current.destroy()
      } catch {}
      wavesurferRef.current = null
    }

    if (deepgramConnectionRef.current) {
      try {
        deepgramConnectionRef.current.removeAllListeners()
        deepgramConnectionRef.current.finish()
      } catch {}
      deepgramConnectionRef.current = null
    }
  }, [])

  const setupDeepgram = useCallback(async () => {
    try {
      if (deepgramConnectionRef.current && deepgramConnectionRef.current.getReadyState() === 1) {
        return deepgramConnectionRef.current
      }
      if (setupPromiseRef.current) {
        return await setupPromiseRef.current
      }
      if (isSettingUpRef.current) {
        if (setupPromiseRef.current) return await setupPromiseRef.current
      }
      isSettingUpRef.current = true
      setupPromiseRef.current = new Promise<any>((resolve, reject) => {
        resolveSetupRef.current = resolve
        rejectSetupRef.current = reject
      })
      const connectionGeneration = ++connectionGenerationRef.current
      currentConnectionGenerationRef.current = connectionGeneration

      setStatus('connecting')

      const data = await transcribeBackendApi.getStreamConfig()

      if (!data.success || !data.apiKey) throw new Error('No API key received from server')

      const deepgram = createClient(data.apiKey)

      const config = {
        model: data.config.model || 'nova-2',
        interim_results: true,
        smart_format: true,
        language: data.config.language || 'en-US',
        encoding: 'linear16',
        sample_rate: 48000,
        endpointing: 600,
        utterance_end_ms: 1800,
        vad_events: false,
        punctuate: true,
      }

      usedModelRef.current = config.model
      const connection = deepgram.listen.live(config)

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'))
        }, 20000)

        connection.on(LiveTranscriptionEvents.Open, () => {
          clearTimeout(timeout)
          resolve()
        })

        connection.on(LiveTranscriptionEvents.Error, (error) => {
          clearTimeout(timeout)
          reject(error)
        })
      })

      connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        if (
          currentConnectionGenerationRef.current !== connectionGeneration ||
          !mountedRef.current
        ) {
          return
        }

        const alternatives = data?.channel?.alternatives || []
        if (alternatives.length === 0) return

        const transcript = alternatives[0]?.transcript || ''
        const isFinal = Boolean(data?.is_final)

        if (transcript && transcript.trim()) {
          if (isFinal) {
            const trimmed = transcript.trim()

            sessionTextRef.current = sessionTextRef.current
              ? `${sessionTextRef.current} ${trimmed}`
              : trimmed

            if (insertionMode) {
              onTranscriptionUpdate('', sessionTextRef.current)
            } else {
              accumulatedTextRef.current = accumulatedTextRef.current
                ? `${accumulatedTextRef.current} ${trimmed}`
                : trimmed
              onTranscriptionUpdate(accumulatedTextRef.current, sessionTextRef.current)
            }
          } else {
            const trimmed = transcript.trim()
            const sessionPreview = sessionTextRef.current
              ? `${sessionTextRef.current} ${trimmed}`
              : trimmed

            if (insertionMode) {
              onTranscriptionUpdate('', sessionPreview)
            } else {
              const completePreview = accumulatedTextRef.current
                ? `${accumulatedTextRef.current} ${trimmed}`
                : trimmed
              onTranscriptionUpdate(completePreview, sessionPreview)
            }
          }
        }
      })

      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        // No-op: UtteranceEnd signals a pause in speech, not session end.
        // Text accumulates via the Transcript handler; session ends only
        // when the user clicks Stop (triggering Close).
      })

      // TODO: Phase 2 - TTS response playback
      // After agent responds, convert text → speech and auto-play.
      // Option A: Deepgram TTS — simpler, same provider, use deepgram.speak.request()
      // Option B: ElevenLabs — higher quality, needs separate API key
      // Implementation: listen for agent response in chat, call TTS API, play via Audio()

      connection.on(LiveTranscriptionEvents.Close, () => {
        deepgramConnectionRef.current = null
        if (!postedUsageRef.current) {
          postedUsageRef.current = true
          const startedAt = sessionStartTsRef.current
          const endedAt = Date.now()
          const durationSeconds = startedAt
            ? Math.max(1, (endedAt - startedAt) / 1000)
            : recordingTime
          const model = usedModelRef.current
          transcribeBackendApi
            .trackStreamUsage({
              durationSeconds,
              model,
              metadata: { session_type: 'streaming', reported_by: 'client' },
            })
            .catch(() => {})
        }
        if (currentConnectionGenerationRef.current === connectionGeneration) {
          streamStopFinalizedRef.current = true
          if (insertionMode) {
            onTranscriptionComplete('', sessionTextRef.current ?? '')
          } else {
            onTranscriptionComplete(accumulatedTextRef.current, sessionTextRef.current ?? '')
          }
          if (forceCompleteTimerRef.current) {
            clearTimeout(forceCompleteTimerRef.current)
            forceCompleteTimerRef.current = null
          }
          cleanup()
          if (mountedRef.current) {
            setStatus('idle')
            setRecordingTime(0)
          }
          currentConnectionGenerationRef.current = 0
          accumulatedTextRef.current = ''
          sessionTextRef.current = ''
        }
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current)
          keepAliveIntervalRef.current = null
        }
      })

      if (currentConnectionGenerationRef.current === connectionGeneration) {
        deepgramConnectionRef.current = connection
      }

      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current)
        keepAliveIntervalRef.current = null
      }
      const keepAlive = setInterval(() => {
        if (
          deepgramConnectionRef.current &&
          currentConnectionGenerationRef.current === connectionGeneration
        ) {
          try {
            deepgramConnectionRef.current.keepAlive()
          } catch (error) {
            clearInterval(keepAlive)
          }
        } else {
          clearInterval(keepAlive)
        }
      }, 3000)
      keepAliveIntervalRef.current = keepAlive

      try {
        resolveSetupRef.current?.(connection)
      } catch {}
      setupPromiseRef.current = null
      lastSetupErrorRef.current = null
      return connection
    } catch (error: any) {
      setStatus('idle')
      cleanup()
      lastSetupErrorRef.current = error?.message || 'Failed to setup Deepgram'
      if (lastSetupErrorRef.current !== 'Session cancelled') {
        try {
          if (lastSetupErrorRef.current !== null) {
            onError?.(lastSetupErrorRef.current)
          }
        } catch {}
      }
      try {
        rejectSetupRef.current?.(error)
      } catch {}
      setupPromiseRef.current = null
      return null
    } finally {
      isSettingUpRef.current = false
    }
  }, [onTranscriptionUpdate, onTranscriptionComplete, cleanup])

  const setupAudioStreaming = useCallback((stream: MediaStream, connection: any) => {
    const audioContext = new AudioContext({ sampleRate: 48000 })
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)
      const buffer = new ArrayBuffer(input.length * 2)
      const view = new DataView(buffer)

      let floatSample
      for (let i = 0; i < input.length; i++) {
        floatSample = Math.max(-1, Math.min(1, input[i]!))
        view.setInt16(i * 2, floatSample < 0 ? floatSample * 0x8000 : floatSample * 0x7fff, true)
      }

      if (connection && connection.getReadyState() === 1) {
        try {
          connection.send(buffer)
        } catch (error) {}
      }
    }

    source.connect(processor)
    processor.connect(audioContext.destination)

    audioContextRef.current = { audioContext, processor, source }

    return { audioContext, processor, source }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      if (startingRef.current || status !== 'idle') {
        return
      }
      startingRef.current = true
      streamStopFinalizedRef.current = false
      cleanup()

      if (insertionMode) {
        sessionTextRef.current = ''
      } else {
        accumulatedTextRef.current = ''
        sessionTextRef.current = ''
      }
      setRecordingTime(0)
      setStatus('connecting')

      const connection = await setupDeepgram()
      if (!connection) {
        if (lastSetupErrorRef.current === 'Session cancelled') {
          setStatus('idle')
          cleanup()
          return
        }
        throw new Error('Failed to connect to Deepgram')
      }

      setStatus('recording')
      sessionStartTsRef.current = Date.now()
      postedUsageRef.current = false

      await new Promise((resolve) => setTimeout(resolve, 100))

      if (!waveformContainerRef.current) {
        throw new Error('Container not found')
      }

      const wavesurfer = WaveSurfer.create({
        container: waveformContainerRef.current,
        waveColor: 'var(--color-primary)',
        progressColor: 'var(--color-primary)',
        barWidth: 3,
        barGap: 2,
        barRadius: 8,
        height: 32,
        normalize: true,
        interact: false,
      })

      const recordPlugin = wavesurfer.registerPlugin(
        RecordPlugin.create({
          scrollingWaveform: true,
          scrollingWaveformWindow: 10,
          renderRecordedAudio: false,
          mimeType: 'audio/webm',
        }),
      )

      wavesurferRef.current = wavesurfer
      recordPluginRef.current = recordPlugin

      const stream = await recordPlugin.startMic()
      streamRef.current = stream
      recordPlugin.renderMicStream(stream)

      setupAudioStreaming(stream, connection)

      await recordPlugin.startRecording()

      timerRef.current = setInterval(() => {
        const t0 = sessionStartTsRef.current
        if (t0 != null) {
          setRecordingTime(Math.floor((Date.now() - t0) / 1000))
        }
      }, 250)
    } catch (error: any) {
      setStatus('idle')
      cleanup()
      const msg = error?.message || 'Failed to start recording'
      if (
        msg !== 'Failed to connect to Deepgram' ||
        lastSetupErrorRef.current !== 'Session cancelled'
      ) {
        try {
          onError?.(msg)
        } catch {}
      }
    } finally {
      startingRef.current = false
    }
  }, [setupDeepgram, setupAudioStreaming, cleanup])

  const stopRecording = useCallback(() => {
    streamStopFinalizedRef.current = false
    setStatus('finishing')

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (deepgramConnectionRef.current) {
      try {
        deepgramConnectionRef.current.finish()
      } catch (error) {}
    }

    if (forceCompleteTimerRef.current) {
      clearTimeout(forceCompleteTimerRef.current)
      forceCompleteTimerRef.current = null
    }

    forceCompleteTimerRef.current = setTimeout(() => {
      if (streamStopFinalizedRef.current) {
        forceCompleteTimerRef.current = null
        return
      }
      streamStopFinalizedRef.current = true
      if (insertionMode) {
        onTranscriptionComplete('', sessionTextRef.current ?? '')
      } else {
        onTranscriptionComplete(accumulatedTextRef.current, sessionTextRef.current ?? '')
      }
      cleanup()
      if (mountedRef.current) {
        setStatus('idle')
        setRecordingTime(0)
      }
      currentConnectionGenerationRef.current = 0
      accumulatedTextRef.current = ''
      sessionTextRef.current = ''
      forceCompleteTimerRef.current = null
    }, 5000)
  }, [onTranscriptionComplete, cleanup])

  useEffect(() => {
    if (isRecording && status === 'idle') {
      startRecording()
    } else if (!isRecording && status === 'recording') {
      stopRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [cleanup])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex w-full items-center gap-2">
      {status === 'connecting' && (
        <div className="flex items-center gap-2">
          <VibeyChatOrb state="processing" style="elastic" />
          <span className="text-muted-foreground text-sm">Connecting...</span>
        </div>
      )}

      {status === 'finishing' && (
        <div className="flex items-center gap-2">
          <VibeyChatOrb state="processing" style="elastic" />
          <span className="text-muted-foreground text-sm">Finishing transcription...</span>
        </div>
      )}

      {status === 'recording' && (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <span className="text-muted-foreground font-mono text-xs">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}

      <div
        ref={waveformContainerRef}
        className={`bg-muted/30 h-8 flex-1 overflow-hidden rounded ${
          status === 'recording' ? 'block' : 'hidden'
        }`}
      />
    </div>
  )
}
