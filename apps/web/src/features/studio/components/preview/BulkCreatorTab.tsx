'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useCampaignMode } from '../../contexts/CampaignModeContext'
import {
  createAdsBulk,
  fetchCampaignAdCampaigns,
  generateAdCopy,
  generateAdVariations,
  regenerateAdVariation,
} from '../../services/artifact-preview.service'
import { createNewConversation, sendMessageStreaming } from '../../services/chat.service'
import { useChatStore } from '../../store/use-chat-store'
import { BulkCreatorActions } from './bulk-creator/BulkCreatorActions'
import { BulkCreatorCopy, type CopyVariation } from './bulk-creator/BulkCreatorCopy'
import { BulkCreatorGrid, type BulkVariation } from './bulk-creator/BulkCreatorGrid'
import { BulkCreatorSetup } from './bulk-creator/BulkCreatorSetup'

type Step = 'setup' | 'generating' | 'review' | 'copy' | 'done'

interface BaseCreative {
  id: string
  url: string
  name: string
}

interface BulkCreatorTabProps {
  campaignId: string
}

export function BulkCreatorTab({ campaignId }: BulkCreatorTabProps) {
  const { bulkCreatorAdSetId, setBulkCreatorAdSetId, bulkCreatorSession, setBulkCreatorSession } =
    useCampaignMode()

  const session = bulkCreatorSession
  const [step, setStep] = useState<Step>(session?.step ?? 'setup')
  const [adSetId, setAdSetId] = useState<string | null>(session?.adSetId ?? bulkCreatorAdSetId)
  const [adSets, setAdSets] = useState<Array<{ id: string; name: string }>>([])
  const [variations, setVariations] = useState<BulkVariation[]>(session?.variations ?? [])
  const [isCreating, setIsCreating] = useState(false)
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set())
  const [baseImageUrl, setBaseImageUrl] = useState<string>(session?.baseImageUrl ?? '')

  const [copyVariations, setCopyVariations] = useState<CopyVariation[]>(
    session?.copyVariations ?? [],
  )
  const [selectedCopyIndex, setSelectedCopyIndex] = useState<number | null>(
    session?.selectedCopyIndex ?? null,
  )
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false)
  const agentStatus = useChatStore((s) => s.agentStatusMessage)
  const activeTools = useChatStore((s) => s.activeTools)
  const agentPhase = useChatStore((s) => s.agentPhase)

  useEffect(() => {
    if (session?.step === 'generating') {
      setStep('setup')
      setVariations([])
      setBulkCreatorSession(null)
      toast.error('Generation was interrupted by refresh. Please generate again.')
    }
  }, [])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (step === 'setup') {
        setBulkCreatorSession(null)
      } else {
        setBulkCreatorSession({
          step,
          adSetId,
          variations,
          copyVariations,
          selectedCopyIndex,
          baseImageUrl,
        })
      }
    }, 300)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [
    step,
    adSetId,
    variations,
    copyVariations,
    selectedCopyIndex,
    baseImageUrl,
    setBulkCreatorSession,
  ])

  useEffect(() => {
    if (bulkCreatorAdSetId) {
      setAdSetId(bulkCreatorAdSetId)
    }
  }, [bulkCreatorAdSetId])

  // Load ad sets from campaign
  useEffect(() => {
    let cancelled = false
    fetchCampaignAdCampaigns(campaignId)
      .then((adCampaigns) => {
        if (cancelled) return
        const allSets: Array<{ id: string; name: string }> = []
        for (const ac of adCampaigns) {
          const sets = (ac as unknown as Record<string, unknown>).ad_sets as
            | Array<{ id: string; name: string }>
            | undefined
          if (sets) {
            for (const s of sets) {
              allSets.push({
                id: s.id,
                name: `${(ac as unknown as Record<string, unknown>).name} → ${s.name}`,
              })
            }
          }
        }
        setAdSets(allSets)
      })
      .catch(() => {
        /* ignore */
      })
    return () => {
      cancelled = true
    }
  }, [campaignId])

  const handleGenerate = useCallback(
    async (baseCreatives: BaseCreative[], variationCount: number) => {
      if (!adSetId) return

      setStep('generating')
      setBaseImageUrl(baseCreatives[0]?.url ?? '')

      // Create placeholder slots
      const strategies = [
        'color_mood_shift',
        'layout_rearrangement',
        'background_treatment',
        'typography_style',
        'visual_intensity',
        'framing_change',
      ]

      const totalVariations = baseCreatives.length * variationCount
      const placeholders: BulkVariation[] = Array.from({ length: totalVariations }, (_, i) => ({
        id: `pending-${i}`,
        imageUrl: '',
        status: 'pending' as const,
        strategy: strategies[i % strategies.length] ?? 'color_mood_shift',
        isGenerating: true,
      }))
      setVariations(placeholders)

      try {
        const BATCH_SIZE = 3
        const allResults: BulkVariation[] = []

        for (let i = 0; i < baseCreatives.length; i += BATCH_SIZE) {
          const batch = baseCreatives.slice(i, i + BATCH_SIZE)
          const batchResults = await Promise.all(
            batch.map((creative) =>
              generateAdVariations(adSetId, {
                baseImageUrl: creative.url,
                baseImageAssetId: creative.id,
                variationCount,
              }),
            ),
          )

          for (const result of batchResults) {
            const generated = (result.variations ?? []).map(
              (v: { id: string; imageUrl: string; strategy: string }) => ({
                id: v.id,
                imageUrl: v.imageUrl,
                status: 'pending' as const,
                strategy: v.strategy,
                isGenerating: false,
              }),
            )
            allResults.push(...generated)
          }
        }

        setVariations(allResults)
        setStep('review')
      } catch {
        toast.error('Failed to generate variations. Please try again.')
        setStep('setup')
      }
    },
    [adSetId],
  )

  const handleRegenerate = useCallback(
    async (variationId: string, presetName?: string, customPrompt?: string) => {
      if (!adSetId) return

      // Find the variation to get its base image
      const variation = variations.find((v) => v.id === variationId)
      if (!variation) return

      setRegeneratingIds((prev) => new Set(prev).add(variationId))
      try {
        const result = await regenerateAdVariation(adSetId, {
          baseImageUrl: baseImageUrl || variation.imageUrl,
          ...(presetName ? { presetName } : {}),
          ...(customPrompt ? { prompt: customPrompt } : {}),
        })

        setVariations((prev) =>
          prev.map((v) =>
            v.id === variationId
              ? {
                  ...v,
                  id: result.variation.id,
                  imageUrl: result.variation.imageUrl,
                  strategy: result.variation.strategy,
                  status: 'pending' as const,
                }
              : v,
          ),
        )
        toast.success('Variation regenerated')
      } catch {
        toast.error('Failed to regenerate variation')
      } finally {
        setRegeneratingIds((prev) => {
          const next = new Set(prev)
          next.delete(variationId)
          return next
        })
      }
    },
    [adSetId, baseImageUrl, variations],
  )

  const handleAccept = (id: string) => {
    setVariations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'accepted' as const } : v)),
    )
  }

  const handleReject = (id: string) => {
    setVariations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'rejected' as const } : v)),
    )
  }

  const handleAcceptAll = () => {
    setVariations((prev) =>
      prev.map((v) => (v.status === 'pending' ? { ...v, status: 'accepted' as const } : v)),
    )
  }

  const handleRejectAll = () => {
    setVariations((prev) =>
      prev.map((v) => (v.status === 'pending' ? { ...v, status: 'rejected' as const } : v)),
    )
  }

  const handleProceedToCopy = () => {
    setStep('copy')
    setCopyVariations([])
    setSelectedCopyIndex(null)
  }

  const handleGenerateCopy = useCallback(async () => {
    if (!adSetId) return
    setIsGeneratingCopy(true)
    setCopyVariations([])
    setSelectedCopyIndex(null)

    const accepted = variations.filter((v) => v.status === 'accepted')
    const imageUrls = accepted.map((v) => v.imageUrl).filter(Boolean)

    try {
      const convo = await createNewConversation({
        campaign_id: campaignId,
        title: 'Bulk Creator Copy',
      })
      const systemCtx = [
        '## MISSION: Generate Ad Copy (Bulk Creator)',
        '',
        'You have ONE job: write 3 ad copy variations and save them via generate_ad_copy.',
        '',
        'CONSTRAINTS:',
        '- You MUST ONLY call generate_ad_copy. Do NOT call any other action (no create_offer, no create_ad, no create_funnel, etc.).',
        '- Do NOT create, update, or delete any artifacts.',
        '- Do NOT ask questions. Just write the copy and call generate_ad_copy immediately.',
        '',
        'CONTEXT:',
        `- Ad Set ID: ${adSetId}`,
        imageUrls.length > 0
          ? `- Accepted creative images:\n${imageUrls.map((u) => `  ${u}`).join('\n')}`
          : '',
        '- Use the campaign offer, avatar, and brand context already in your system prompt.',
        '',
        'REQUIREMENTS:',
        '- Generate exactly 3 variations.',
        '- Each variation: { headline (5-12 words), primaryText (50-150 words), description (10-20 words) }.',
        '- Each variation must use a DIFFERENT angle: urgency, social proof, benefit-focused, curiosity, pain point, or transformation.',
        '- Write in second person ("you", "your"). Be specific with numbers and results.',
        '- Match the brand voice and tone from the campaign context.',
        '- NO generic phrases: "unlock your potential", "transform your life", "game-changer", "revolutionary".',
        '',
        'After writing, call: vibey_backend({ action: "generate_ad_copy", data: { variations: [...] } })',
      ]
        .filter(Boolean)
        .join('\n')

      const conversationId = await sendMessageStreaming({
        conversation_id: convo.id,
        campaign_id: campaignId,
        content: 'Generate 3 ad copy variations for my accepted ad creatives.',
        system_context: systemCtx,
        suppressUserMessage: true,
        model: 'google/gemini-3.5-flash',
      })

      const messages = useChatStore.getState().messagesByConversation[conversationId] ?? []
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
      const blocks =
        (lastAssistant?.metadata?.content_blocks_ordered as Array<Record<string, unknown>>) ?? []
      const copyBlock = blocks.find((b) => b.type === 'ad_copy_variations')
      const agentVariations = copyBlock?.variations as CopyVariation[] | undefined

      if (agentVariations && agentVariations.length > 0) {
        setCopyVariations(agentVariations)
      } else {
        const firstAccepted = accepted[0]
        const fallback = await generateAdCopy(adSetId, {
          imageUrl: firstAccepted?.imageUrl,
          count: 3,
        })
        setCopyVariations(fallback.variations ?? [])
      }
    } catch {
      try {
        const firstAccepted = variations.find((v) => v.status === 'accepted')
        const fallback = await generateAdCopy(adSetId, {
          imageUrl: firstAccepted?.imageUrl,
          count: 3,
        })
        setCopyVariations(fallback.variations ?? [])
      } catch {
        toast.error('Failed to generate copy. You can still create ads without copy.')
      }
    } finally {
      setIsGeneratingCopy(false)
    }
  }, [adSetId, campaignId, variations])

  const handleCreateAds = useCallback(async () => {
    if (!adSetId) return
    const accepted = variations.filter((v) => v.status === 'accepted')
    if (accepted.length === 0) return

    const selectedCopy = selectedCopyIndex !== null ? copyVariations[selectedCopyIndex] : undefined

    setIsCreating(true)
    try {
      await createAdsBulk(adSetId, {
        creatives: accepted.map((v) => ({ imageUrl: v.imageUrl })),
        ...(selectedCopy
          ? {
              template: {
                headline: selectedCopy.headline,
                primaryText: selectedCopy.primaryText,
              },
            }
          : {}),
      })
      toast.success(`Created ${accepted.length} ad${accepted.length > 1 ? 's' : ''} successfully.`)
      setStep('done')
    } catch {
      toast.error('Failed to create ads. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }, [adSetId, variations, selectedCopyIndex, copyVariations])

  const handleStartOver = () => {
    setStep('setup')
    setVariations([])
    setCopyVariations([])
    setSelectedCopyIndex(null)
    setBulkCreatorAdSetId(null)
    setBaseImageUrl('')
    setBulkCreatorSession(null)
  }

  const acceptedCount = variations.filter((v) => v.status === 'accepted').length

  return (
    <div className="card-glass rounded-spacing-3 mx-auto flex h-[calc(100%-24px)] min-h-0 max-w-lg flex-col overflow-hidden">
      {/* Tab Header */}
      <div className="border-border relative flex shrink-0 items-center justify-center border-b px-4 py-3">
        {step !== 'setup' && step !== 'done' && (
          <button
            type="button"
            onClick={handleStartOver}
            className="text-muted-foreground hover:text-foreground absolute left-4 flex items-center transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <span className="body-1 font-semibold">BULK CREATOR</span>
        {step !== 'setup' && step !== 'done' && (
          <div className="absolute right-4 flex items-center gap-1">
            {(['review', 'copy'] as const).map((s, i) => {
              const isActive = step === s || (step === 'generating' && s === 'review')
              const isPast = i < (['review', 'copy'] as const).indexOf(step as 'review' | 'copy')
              return (
                <div
                  key={s}
                  className={`h-1.5 w-6 rounded-full ${
                    isActive
                      ? 'chip-glass-blue'
                      : isPast
                        ? 'chip-glass-green'
                        : 'chip-glass-neutral'
                  }`}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-spacing-4 flex-1 overflow-y-auto">
        {step === 'setup' && (
          <BulkCreatorSetup
            campaignId={campaignId}
            adSetId={adSetId}
            adSets={adSets}
            onAdSetChange={setAdSetId}
            onGenerate={handleGenerate}
          />
        )}

        {step === 'generating' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
            <VibeyLoadingOrb size="md" />
            <span className="body-2 text-muted-foreground">
              Generating {variations.length} variations...
            </span>
          </div>
        )}

        {step === 'review' && (
          <div className="flex flex-col gap-4">
            <BulkCreatorGrid
              variations={variations}
              onAccept={handleAccept}
              onReject={handleReject}
              onAcceptAll={handleAcceptAll}
              onRejectAll={handleRejectAll}
              onRegenerate={handleRegenerate}
              isRegenerating={regeneratingIds}
              onStartOver={handleStartOver}
            />
            <BulkCreatorActions
              acceptedCount={acceptedCount}
              isCreating={false}
              onCreateAds={handleProceedToCopy}
              onStartOver={handleStartOver}
              createLabel={`Continue with ${acceptedCount} Creative${acceptedCount !== 1 ? 's' : ''}`}
            />
          </div>
        )}

        {step === 'copy' && (
          <div className="flex flex-col gap-4">
            <BulkCreatorCopy
              variations={copyVariations}
              selectedIndex={selectedCopyIndex}
              isGenerating={isGeneratingCopy}
              generatingStatus={
                activeTools[0]?.label ??
                agentStatus ??
                (agentPhase === 'thinking' ? 'Thinking...' : null)
              }
              onSelect={setSelectedCopyIndex}
              onGenerate={handleGenerateCopy}
              onSkip={handleCreateAds}
            />
            {copyVariations.length > 0 && (
              <BulkCreatorActions
                acceptedCount={acceptedCount}
                isCreating={isCreating}
                onCreateAds={handleCreateAds}
                onStartOver={handleStartOver}
              />
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="body-1 font-semibold">
                {acceptedCount} Ad{acceptedCount !== 1 ? 's' : ''} Created
              </p>
              <p className="body-2 text-muted-foreground mt-1">
                Your ads are now in the ad set. Check the Artifacts tab to view and edit them.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartOver}
              className="chip-glass-neutral h-spacing-10 rounded-spacing-3 flex items-center gap-2 px-6 font-semibold transition-all"
            >
              Create More
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
