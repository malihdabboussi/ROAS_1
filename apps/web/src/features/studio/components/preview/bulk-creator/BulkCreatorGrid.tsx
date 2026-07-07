'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCheck, RefreshCw, RotateCcw, Send, X, XCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

export interface BulkVariation {
  id: string
  imageUrl: string
  status: 'pending' | 'accepted' | 'rejected'
  strategy: string
  isGenerating?: boolean
}

interface BulkCreatorGridProps {
  variations: BulkVariation[]
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onAcceptAll: () => void
  onRejectAll: () => void
  onRegenerate?: (id: string, presetName?: string, customPrompt?: string) => void
  isRegenerating?: Set<string>
  onStartOver?: () => void
}

const STRATEGY_LABELS: Record<string, string> = {
  color_mood_shift: 'Color Shift',
  layout_rearrangement: 'Layout',
  background_treatment: 'Background',
  typography_style: 'Typography',
  visual_intensity: 'Intensity',
  framing_change: 'Framing',
  custom: 'Custom',
}

const QUICK_PRESETS = [
  { name: 'add_urgency', label: 'Add Urgency' },
  { name: 'stronger_hook', label: 'Stronger Hook' },
  { name: 'feature_offer', label: 'Feature Offer' },
  { name: 'bolder_cta', label: 'Bolder CTA' },
  { name: 'more_contrast', label: 'More Contrast' },
  { name: 'different_angle', label: 'Different Angle' },
]

export function BulkCreatorGrid({
  variations,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onRegenerate,
  isRegenerating,
  onStartOver,
}: BulkCreatorGridProps) {
  const [selectedId, setSelectedId] = useState<string>(variations[0]?.id ?? '')
  const [showRegen, setShowRegen] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const regenInputRef = useRef<HTMLInputElement>(null)

  const acceptedCount = variations.filter((v) => v.status === 'accepted').length
  const pendingCount = variations.filter((v) => v.status === 'pending').length
  const totalCount = variations.length
  const selected = variations.find((v) => v.id === selectedId) ?? variations[0]
  const isSelectedRegenerating = !!(selected && isRegenerating?.has(selected.id))

  const handlePresetClick = (presetName: string) => {
    if (!selected) return
    setSelectedPreset(presetName)
    onRegenerate?.(selected.id, presetName)
    setShowRegen(false)
    setSelectedPreset(null)
  }

  const handleCustomRegenerate = () => {
    if (!selected || !customPrompt.trim()) return
    onRegenerate?.(selected.id, undefined, customPrompt.trim())
    setCustomPrompt('')
    setShowRegen(false)
    setSelectedPreset(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="body-2 font-semibold">
            {acceptedCount} of {totalCount} accepted
          </span>
          {pendingCount > 0 && (
            <span className="body-3 text-muted-foreground">({pendingCount} pending)</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip label="Accept all" side="bottom">
            <button
              type="button"
              onClick={onAcceptAll}
              className="text-muted-foreground p-1 transition-colors hover:text-[var(--color-accent)]"
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip label="Reject all" side="bottom">
            <button
              type="button"
              onClick={onRejectAll}
              className="text-muted-foreground p-1 transition-colors hover:text-orange-400"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          {onStartOver && (
            <Tooltip label="Start over" side="bottom">
              <button
                type="button"
                onClick={onStartOver}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Main image */}
      {selected && (
        <div className="relative overflow-hidden rounded-lg">
          <div className="relative aspect-square w-full">
            {selected.isGenerating || isSelectedRegenerating ? (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg bg-white/5">
                <VibeyLoadingOrb size="lg" />
              </div>
            ) : (
              <img
                src={selected.imageUrl}
                alt={`Variation - ${STRATEGY_LABELS[selected.strategy] ?? selected.strategy}`}
                className="absolute inset-0 h-full w-full rounded-lg object-contain"
              />
            )}
          </div>

          {/* Actions overlay on main image */}
          {!selected.isGenerating && !isSelectedRegenerating && (
            <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1">
              {onRegenerate && (
                <Tooltip label="Regenerate" side="top">
                  <button
                    type="button"
                    onClick={() => setShowRegen(!showRegen)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-all hover:bg-black/70"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </Tooltip>
              )}
              <Tooltip label="Reject" side="top">
                <button
                  type="button"
                  onClick={() => onReject(selected.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                    selected.status === 'rejected'
                      ? 'chip-glass-orange'
                      : 'bg-black/50 text-white hover:bg-black/70'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </Tooltip>
              <Tooltip label="Accept" side="top">
                <button
                  type="button"
                  onClick={() => onAccept(selected.id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                    selected.status === 'accepted'
                      ? 'chip-glass-green'
                      : 'bg-black/50 text-white hover:bg-black/70'
                  }`}
                >
                  <Check className="h-4 w-4" />
                </button>
              </Tooltip>
            </div>
          )}

          {/* Regen slide-up */}
          <AnimatePresence>
            {showRegen && (
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onAnimationComplete={() => regenInputRef.current?.focus({ preventScroll: true })}
                className="card-glass-panel rounded-t-spacing-3 absolute inset-x-0 bottom-0 z-30 flex flex-col gap-2 p-3"
              >
                <div className="flex items-center gap-1">
                  <input
                    ref={regenInputRef}
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCustomRegenerate()
                      if (e.key === 'Escape') setShowRegen(false)
                    }}
                    placeholder="Describe changes..."
                    className="chip-glass-neutral body-3 h-8 flex-1 rounded-lg px-3 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCustomRegenerate}
                    className="btn-icon-glass flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegen(false)}
                    className="btn-icon-glass flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {QUICK_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handlePresetClick(preset.name)}
                      className={`body-3 rounded-lg px-2 py-1.5 text-center transition-all ${
                        selectedPreset === preset.name
                          ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                          : 'chip-glass-neutral hover:border-white/20'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-1.5 lg:grid-cols-6">
        {variations.map((variation) => {
          const isActive = variation.id === selectedId
          const borderClass = isActive
            ? 'ring-2 ring-white/60'
            : variation.status === 'accepted'
              ? 'ring-2 ring-[var(--color-accent)]/60'
              : variation.status === 'rejected'
                ? 'ring-1 ring-orange-500/40 opacity-40'
                : 'ring-1 ring-white/10'

          return (
            <button
              key={variation.id}
              type="button"
              onClick={() => {
                setSelectedId(variation.id)
              }}
              className={`relative overflow-hidden rounded-md transition-all ${borderClass}`}
            >
              {variation.isGenerating || isRegenerating?.has(variation.id) ? (
                <div className="flex aspect-square items-center justify-center overflow-hidden bg-white/5">
                  <VibeyLoadingOrb size="sm" />
                </div>
              ) : (
                <img
                  src={variation.imageUrl}
                  alt={STRATEGY_LABELS[variation.strategy] ?? variation.strategy}
                  className="aspect-square w-full object-cover"
                />
              )}
              {variation.status === 'accepted' && !isActive && (
                <div className="chip-glass-green absolute bottom-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full">
                  <Check className="h-2 w-2" />
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
