'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { ComposerSubscriptionModelsSubmenu } from '@/components/chat/model-picker/ComposerSubscriptionModelsSubmenu'
import {
  partitionModelOptions,
  resolveModelDisplayLabel,
} from '@/lib/chat/subscription-model-options'
import {
  ALL_VOICES,
  FEMALE_VOICES,
  isModelStrategyId,
  MALE_VOICES,
  MODEL_STRATEGIES,
} from '../../constants/team.constants'
import { clampDropdownLeft } from '../../lib/clamp-dropdown-left'
import { CommsSectionHeader } from './CommsSectionHeader'
import { DROPDOWN_CHEVRON, DROPDOWN_TRIGGER_CLASS } from './team-communication-tab.constants'
import type { TeamCommunicationTabProps } from './team-communication-tab.types'

interface TeamCommunicationModelVoiceSectionProps
  extends Pick<
    TeamCommunicationTabProps,
    | 'selectedModelId'
    | 'modelOptions'
    | 'communicationSaving'
    | 'modelDropdownOpen'
    | 'setModelDropdownOpen'
    | 'modelDropdownRef'
    | 'modelDropdownBtnRef'
    | 'modelDropdownPos'
    | 'handleCommunicationStrategyChange'
    | 'handleCommunicationModelChange'
    | 'handleVoiceChange'
  > {
  selected: NonNullable<TeamCommunicationTabProps['selected']>
  collapsed: boolean
  onToggle: () => void
  isReadOnly: boolean
}

export function TeamCommunicationModelVoiceSection({
  selected,
  selectedModelId,
  modelOptions,
  communicationSaving,
  modelDropdownOpen,
  setModelDropdownOpen,
  modelDropdownRef,
  modelDropdownBtnRef,
  modelDropdownPos,
  handleCommunicationStrategyChange,
  handleCommunicationModelChange,
  handleVoiceChange,
  collapsed,
  onToggle,
  isReadOnly,
}: TeamCommunicationModelVoiceSectionProps) {
  const subscriptionSubmenuRef = useRef<HTMLDivElement>(null)
  const { standardModels, subscriptionModels } = useMemo(
    () => partitionModelOptions(modelOptions),
    [modelOptions],
  )
  const [voiceDropdownOpen, setVoiceDropdownOpen] = useState(false)
  const voiceDropdownRef = useRef<HTMLDivElement>(null)
  const voiceDropdownBtnRef = useRef<HTMLButtonElement>(null)
  const [voiceDropdownPos, setVoiceDropdownPos] = useState({ top: 0, left: 0, width: 0 })

  const currentVoiceName =
    ((selected as unknown as Record<string, unknown> | null)?.voice_name as string | null) ?? null
  const currentVoice = currentVoiceName ? ALL_VOICES.find((v) => v.name === currentVoiceName) : null
  const selectedStrategy = isModelStrategyId(selectedModelId)
    ? MODEL_STRATEGIES.find((s) => s.id === selectedModelId)
    : undefined
  const modelSummaryLabel = isModelStrategyId(selectedModelId)
    ? (selectedStrategy?.label ?? 'Auto')
    : resolveModelDisplayLabel(selectedModelId, modelOptions)

  useLayoutEffect(() => {
    if (!voiceDropdownOpen || !voiceDropdownBtnRef.current) return
    const rect = voiceDropdownBtnRef.current.getBoundingClientRect()
    const width = Math.max(rect.width, 288)
    setVoiceDropdownPos({
      top: rect.bottom + 4,
      left: clampDropdownLeft(rect.left, width),
      width,
    })
  }, [voiceDropdownOpen])

  useEffect(() => {
    if (!voiceDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        voiceDropdownRef.current &&
        !voiceDropdownRef.current.contains(target) &&
        !target.closest('[data-voice-dropdown-portal]') &&
        !voiceDropdownBtnRef.current?.contains(target)
      ) {
        setVoiceDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [voiceDropdownOpen])

  return (
    <>
      <CommsSectionHeader title="Model & voice" collapsed={collapsed} onToggle={onToggle} first />
      {!collapsed ? (
        <div className="space-y-spacing-3 px-spacing-2 pb-spacing-1">
          <div
            ref={modelDropdownRef}
            className="gap-spacing-2 sm:gap-spacing-4 relative flex flex-col sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="body-4 text-muted-foreground/70 sm:pt-1.5">Model</p>
            <button
              ref={modelDropdownBtnRef}
              type="button"
              onClick={() => setModelDropdownOpen((prev) => !prev)}
              disabled={isReadOnly || communicationSaving}
              className={`${DROPDOWN_TRIGGER_CLASS} w-full min-w-28 max-w-full shrink-0 gap-1.5 sm:w-auto sm:min-w-60`}
            >
              <span
                className={`min-w-0 truncate font-medium ${
                  selectedStrategy?.textClass ?? 'text-foreground'
                }`}
              >
                {modelSummaryLabel}
              </span>
              <ChevronDown
                className={`${DROPDOWN_CHEVRON} transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {modelDropdownOpen &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  data-model-dropdown-portal
                  className="z-dropdown rounded-spacing-2 fixed shadow-lg"
                  style={{
                    top: modelDropdownPos.top,
                    left: modelDropdownPos.left,
                    width: modelDropdownPos.width,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div
                    className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 max-h-[320px] overflow-y-auto"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    <div className="space-y-spacing-0">
                      {MODEL_STRATEGIES.map((strategy) => {
                        const isSelected = selectedModelId === strategy.id
                        return (
                          <button
                            key={strategy.id}
                            type="button"
                            onClick={() => void handleCommunicationStrategyChange(strategy.id)}
                            className={`rounded-spacing-1 px-spacing-2 py-spacing-1 gap-spacing-2 hover:bg-hover-subtle flex w-full items-start justify-between text-left transition-all ${strategy.textClass}`}
                          >
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <span className="body-3 font-medium">{strategy.label}</span>
                              <span className="body-4 text-muted-foreground">
                                {strategy.description}
                              </span>
                            </div>
                            {isSelected && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                          </button>
                        )
                      })}
                      {subscriptionModels.length > 0 ? (
                        <ComposerSubscriptionModelsSubmenu
                          models={subscriptionModels}
                          selectedModelId={selectedModelId}
                          mainDropdownRef={modelDropdownRef}
                          submenuRef={subscriptionSubmenuRef}
                          onSelect={(modelId) => {
                            setModelDropdownOpen(false)
                            if (modelId !== selectedModelId) {
                              void handleCommunicationModelChange(modelId)
                            }
                          }}
                        />
                      ) : null}
                      {standardModels.length > 0 && (
                        <>
                          <div className="border-border my-1 border-t" />
                          <p className="body-4 text-muted-foreground/50 px-spacing-2 py-spacing-1">
                            Specific model
                          </p>
                          {standardModels.map((model) => {
                            const isSelected = model.id === selectedModelId
                            return (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => {
                                  setModelDropdownOpen(false)
                                  if (model.id !== selectedModelId) {
                                    void handleCommunicationModelChange(model.id)
                                  }
                                }}
                                className={`rounded-spacing-1 body-3 px-spacing-2 py-spacing-1 flex w-full items-center justify-between text-left transition-all ${
                                  isSelected
                                    ? 'bg-primary/10 text-foreground'
                                    : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                                }`}
                              >
                                <span className="truncate">{model.label}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                              </button>
                            )
                          })}
                        </>
                      )}
                    </div>
                  </div>
                </div>,
                document.body,
              )}
          </div>

          <div
            ref={voiceDropdownRef}
            className="gap-spacing-2 sm:gap-spacing-4 relative flex flex-col sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="body-4 text-muted-foreground/70 sm:pt-1.5">Voice</p>
            <button
              ref={voiceDropdownBtnRef}
              type="button"
              onClick={() => setVoiceDropdownOpen((prev) => !prev)}
              disabled={isReadOnly || communicationSaving}
              className={`${DROPDOWN_TRIGGER_CLASS} w-full min-w-0 max-w-full shrink-0 gap-1.5 sm:w-auto sm:min-w-[12rem] sm:max-w-[min(100%,20rem)]`}
            >
              <span className="min-w-0 truncate font-medium">
                {currentVoice
                  ? `${currentVoice.name} — ${currentVoice.tone}, ${currentVoice.pitch}`
                  : 'Auto'}
              </span>
              <ChevronDown
                className={`${DROPDOWN_CHEVRON} transition-transform ${voiceDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {voiceDropdownOpen &&
              typeof document !== 'undefined' &&
              createPortal(
                <div
                  data-voice-dropdown-portal
                  className="z-dropdown rounded-spacing-2 fixed shadow-lg"
                  style={{
                    top: voiceDropdownPos.top,
                    left: voiceDropdownPos.left,
                    width: voiceDropdownPos.width,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div
                    className="dropdown-menu-solid rounded-spacing-2 p-spacing-2 max-h-[380px] overflow-y-auto"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    <div className="space-y-spacing-0">
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceDropdownOpen(false)
                          if (currentVoiceName) void handleVoiceChange(null)
                        }}
                        className={`rounded-spacing-1 px-spacing-2 py-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                          !currentVoiceName
                            ? 'bg-primary/10 text-foreground'
                            : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                        }`}
                      >
                        <span>Auto</span>
                        {!currentVoiceName && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>

                      <div className="border-border my-1 border-t" />
                      <p className="body-4 text-muted-foreground/50 px-spacing-2 py-spacing-1">
                        Female
                      </p>
                      {FEMALE_VOICES.map((voice) => {
                        const isSelected = currentVoiceName === voice.name
                        return (
                          <button
                            key={voice.name}
                            type="button"
                            onClick={() => {
                              setVoiceDropdownOpen(false)
                              if (!isSelected) void handleVoiceChange(voice.name)
                            }}
                            className={`rounded-spacing-1 px-spacing-2 py-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                              isSelected
                                ? 'bg-primary/10 text-foreground'
                                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                            }`}
                          >
                            <span className="truncate">
                              {voice.name} — {voice.tone}, {voice.pitch}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                          </button>
                        )
                      })}

                      <div className="border-border my-1 border-t" />
                      <p className="body-4 text-muted-foreground/50 px-spacing-2 py-spacing-1">
                        Male
                      </p>
                      {MALE_VOICES.map((voice) => {
                        const isSelected = currentVoiceName === voice.name
                        return (
                          <button
                            key={voice.name}
                            type="button"
                            onClick={() => {
                              setVoiceDropdownOpen(false)
                              if (!isSelected) void handleVoiceChange(voice.name)
                            }}
                            className={`rounded-spacing-1 px-spacing-2 py-spacing-1 body-3 flex w-full items-center justify-between text-left transition-all ${
                              isSelected
                                ? 'bg-primary/10 text-foreground'
                                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                            }`}
                          >
                            <span className="truncate">
                              {voice.name} — {voice.tone}, {voice.pitch}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>,
                document.body,
              )}
          </div>
        </div>
      ) : null}
    </>
  )
}
