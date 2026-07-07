'use client'

import { useCallback, useState } from 'react'
import { ImagePlus, Info, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { VibeyLoadingSphereSimple } from '@/components/vibey/vibey-loading-sphere-simple'
import { backendPatch } from '@/lib/api/backend-client'
import { ONBOARDING_TOAST_ERRORS } from '../config/onboarding-toast-errors.config'

type StylePreset = 'bold' | 'balanced' | 'calm'
type AvatarMode = 'animation' | 'portrait'

const STYLE_PRESETS: Record<StylePreset, { label: string; description: string }> = {
  bold: { label: 'Bold & Direct', description: 'No-nonsense, metric-driven, action-oriented' },
  balanced: {
    label: 'Balanced',
    description: 'Professional but approachable, clear communication',
  },
  calm: { label: 'Calm & Steady', description: 'Thoughtful, measured, focused on process' },
}

interface OnboardingCustomizeProps {
  onComplete: (style: StylePreset, avatarMode: AvatarMode, avatarUrl: string | null) => void
  onBack: () => void
  orgName?: string | null
}

export function OnboardingCustomize({ onComplete, onBack, orgName }: OnboardingCustomizeProps) {
  const [style, setStyle] = useState<StylePreset>('balanced')
  const [avatarMode, setAvatarMode] = useState<AvatarMode>('animation')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false)

  const handleGeneratePortrait = useCallback(async () => {
    if (isGeneratingAvatar) return
    setIsGeneratingAvatar(true)
    try {
      const { backendPost } = await import('@/lib/api/backend-client')
      const result = await backendPost<{ success: boolean; url?: string }>(
        '/api/agents/generate-avatar/onboarding',
        {},
      )
      if (result.success && result.url) {
        setAvatarUrl(result.url)
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : ONBOARDING_TOAST_ERRORS.PORTRAIT_GENERATION_FAILED.userMessage,
      )
    } finally {
      setIsGeneratingAvatar(false)
    }
  }, [isGeneratingAvatar])

  const handleContinue = () => {
    if (avatarMode === 'portrait' && !avatarUrl && !isGeneratingAvatar) {
      void handleGeneratePortrait()
      return
    }
    void backendPatch('/api/profile/onboarding', {
      onboarding_data: {
        style,
        avatar_mode: avatarMode,
        avatar_url: avatarUrl,
        onboarding_step: 'questions',
      },
    })
    onComplete(style, avatarMode, avatarUrl)
  }

  return (
    <AuthOrbShell
      showHeroOrb={false}
      showQuoteFooter={false}
      panelClassName="card-glass-full container-modal-onboarding-customize w-full"
    >
      <div className="w-full">
        <div className="mb-spacing-8 text-center">
          <h2 className="title-h1 text-foreground">
            CUSTOMIZE YOUR{' '}
            <span className="vibey-shine-text bg-clip-text text-transparent">VIBEY</span>
          </h2>
        </div>

        {orgName && (
          <div className="mb-spacing-6 gap-spacing-3 rounded-spacing-2 border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-spacing-3 flex items-start border">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            <p className="body-3 text-muted-foreground">
              Setting up a dedicated Vibey for{' '}
              <span className="text-foreground font-medium">{orgName}</span>. Your personal Vibey
              stays as is, this one leads your organization&apos;s team.
            </p>
          </div>
        )}

        <div className="mb-spacing-6 gap-spacing-4 flex flex-col items-center sm:flex-row sm:items-start">
          <div className="rounded-spacing-3 flex h-44 w-44 shrink-0 items-center justify-center overflow-hidden border border-border bg-white/5">
            {avatarMode === 'portrait' ? (
              isGeneratingAvatar ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="origin-center scale-[5]">
                    <VibeyChatOrb state="processing" style="elastic" />
                  </div>
                </div>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="icon-lg text-muted-foreground/20" />
              )
            ) : (
              <div className="h-full min-h-0 w-full">
                <VibeyLoadingSphereSimple
                  size="medium"
                  state="idle"
                  showBackground={false}
                  clipToCircle={false}
                />
              </div>
            )}
          </div>
          <div className="gap-spacing-3 flex flex-1 flex-col">
            <div className="flex items-center justify-between">
              <p className="body-3 text-muted-foreground font-medium uppercase tracking-wide">
                Avatar
              </p>
              {avatarMode === 'portrait' && avatarUrl && (
                <button
                  type="button"
                  onClick={() => void handleGeneratePortrait()}
                  disabled={isGeneratingAvatar}
                  className="body-3 text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`icon-xs ${isGeneratingAvatar ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAvatarMode('portrait')}
              className={`rounded-spacing-2 p-spacing-3 border text-left transition-all ${
                avatarMode === 'portrait' ? 'chip-glass-blue' : 'border-subtle hover-subtle'
              }`}
            >
              <p className="text-foreground body-2 font-medium">AI Portrait</p>
              <p className="body-3 text-muted-foreground">Generate a unique face</p>
            </button>
            <button
              type="button"
              onClick={() => setAvatarMode('animation')}
              className={`rounded-spacing-2 p-spacing-3 border text-left transition-all ${
                avatarMode === 'animation' ? 'chip-glass-blue' : 'border-subtle hover-subtle'
              }`}
            >
              <p className="text-foreground body-2 font-medium">3D Animation</p>
              <p className="body-3 text-muted-foreground">Keep the animated orb</p>
            </button>
          </div>
        </div>

        <div>
          <label className="body-2 text-muted-foreground mb-spacing-2 block">
            Communication Style
          </label>
          <div className="gap-spacing-2 flex flex-col">
            {(Object.entries(STYLE_PRESETS) as [StylePreset, (typeof STYLE_PRESETS)['bold']][]).map(
              ([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setStyle(key)}
                  className={`rounded-spacing-2 p-spacing-3 border text-left transition-all ${
                    style === key ? 'chip-glass-blue' : 'border-subtle hover-subtle'
                  }`}
                >
                  <p className="text-foreground body-2 font-medium">{preset.label}</p>
                  <p className="body-3 text-muted-foreground">{preset.description}</p>
                </button>
              ),
            )}
          </div>
        </div>

        <div className="mt-spacing-8 gap-spacing-3 flex">
          <button
            onClick={onBack}
            className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-spacing-2 py-spacing-3 flex-1"
          >
            Back
          </button>
          <button
            onClick={handleContinue}
            disabled={isGeneratingAvatar}
            className={`rounded-spacing-2 py-spacing-3 flex-1 font-semibold transition-all ${
              !isGeneratingAvatar
                ? 'button-glass-accent'
                : 'surface-glass text-muted-foreground cursor-not-allowed opacity-50'
            }`}
          >
            <span className="relative z-10">
              {isGeneratingAvatar
                ? 'Generating portrait…'
                : avatarMode === 'portrait' && !avatarUrl
                  ? 'Generate Portrait'
                  : 'Continue'}
            </span>
          </button>
        </div>
      </div>
    </AuthOrbShell>
  )
}
