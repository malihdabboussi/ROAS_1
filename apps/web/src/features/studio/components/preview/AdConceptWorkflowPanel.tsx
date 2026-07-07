'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Loader2, Sparkles, Wand2, X } from 'lucide-react'
import { toast } from 'sonner'
import { extractConceptBodies } from '@/features/studio/utils/ad-concept-concepts'
import type { MediaAsset } from '@/lib/services/media-api'
import { generateAdConcepts, generateImageStream } from '@/lib/services/media-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

const LS_KEY = (adId: string) => `vibey-ad-ai-workflow:${adId}`

interface AdConceptWorkflowPanelProps {
  adId: string
  campaignId: string | null | undefined
  /** Gemini aspect: 1:1 feed, 9:16 story/reels */
  aspectRatio: '1:1' | '9:16'
  placementLabel: string
  headline: string
  primaryText: string
  onImageReady: (url: string, asset?: MediaAsset) => void
  themeHint?: string
}

export function AdConceptWorkflowPanel({
  adId,
  campaignId,
  aspectRatio,
  placementLabel,
  headline,
  primaryText,
  onImageReady,
  themeHint,
}: AdConceptWorkflowPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [audience, setAudience] = useState('')
  const [offerCta, setOfferCta] = useState('')
  const [brandGuidelines, setBrandGuidelines] = useState('')
  const [attachedAssets, setAttachedAssets] = useState('')
  const [reference, setReference] = useState('')
  const [conceptsText, setConceptsText] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [conceptsLoading, setConceptsLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(LS_KEY(adId)) === '1') {
        setExpanded(true)
      }
    } catch {
      /* ignore */
    }
  }, [adId])

  const persistExpanded = useCallback(
    (next: boolean) => {
      setExpanded(next)
      try {
        localStorage.setItem(LS_KEY(adId), next ? '1' : '0')
      } catch {
        /* ignore */
      }
    },
    [adId],
  )

  const conceptChunks = useMemo(() => extractConceptBodies(conceptsText), [conceptsText])

  const fillFromAdCopy = useCallback(() => {
    const h = headline.trim()
    const p = primaryText.trim()
    if (!h && !p) {
      toast.message('Add headline or primary text first')
      return
    }
    setOfferCta(
      [
        h ? `Headline (on-ad or hook direction): ${h}` : null,
        p
          ? `Primary message / body context: ${p.slice(0, 1200)}${p.length > 1200 ? '…' : ''}`
          : null,
      ]
        .filter(Boolean)
        .join('\n\n'),
    )
    toast.message('Offer / CTA field filled from ad copy')
  }, [headline, primaryText])

  const runConceptsFixed = useCallback(async () => {
    setConceptsLoading(true)
    try {
      const res = await generateAdConcepts({
        audience,
        offer_cta: offerCta,
        brand_guidelines: brandGuidelines,
        attached_asset_instructions: attachedAssets,
        reference_description: reference,
      })
      setConceptsText(res.text)
      const chunks = extractConceptBodies(res.text)
      if (chunks.length > 0) {
        toast.success('Concepts ready — tap Concept 1–4 to fill the image prompt')
      } else {
        toast.success(
          'Concepts ready — copy text into image prompt, or use **Concept 1** headings next run',
        )
      }
    } catch (e) {
      toast.error(sanitizeUserError(e, 'Concept generation failed'))
    } finally {
      setConceptsLoading(false)
    }
  }, [audience, offerCta, brandGuidelines, attachedAssets, reference])

  const runGeminiImage = useCallback(async () => {
    const p = imagePrompt.trim()
    if (p.length < 10) {
      toast.error('Add an image prompt (use a concept button or paste text)')
      return
    }
    const placementNote =
      aspectRatio === '9:16'
        ? '\n\nComposition: vertical 9:16 story/reels — full-bleed, mobile-first, safe margins top/bottom.'
        : '\n\nComposition: square 1:1 feed — strong center-weighted focal point.'
    setImageLoading(true)
    let completed = false
    try {
      await generateImageStream(
        {
          prompt: p + placementNote,
          aspect_ratio: aspectRatio,
          campaign_id: campaignId ?? undefined,
          category: 'ad-creative',
          tags: ['ad', 'visual-contrast', aspectRatio === '9:16' ? '9:16' : '1:1'],
        },
        {
          onComplete: (r) => {
            const u = r?.url ?? r?.asset?.public_url
            if (u) {
              completed = true
              onImageReady(u, r?.asset)
              toast.success(`Ad image generated (${placementLabel}, ${aspectRatio})`)
            }
          },
          onError: (msg) => toast.error(msg),
        },
      )
      if (!completed) {
        toast.error('No image returned')
      }
    } catch (e) {
      toast.error(sanitizeUserError(e, 'Image generation failed'))
    } finally {
      setImageLoading(false)
    }
  }, [imagePrompt, campaignId, onImageReady, aspectRatio, placementLabel])

  const clearOutputs = useCallback(() => {
    setConceptsText('')
    setImagePrompt('')
    toast.message('Cleared concepts & image prompt')
  }, [])

  return (
    <div className="border-border mt-spacing-4 pt-spacing-4 border-t">
      <button
        type="button"
        onClick={() => persistExpanded(!expanded)}
        className="hover:bg-hover-subtle body-3 text-foreground px-spacing-2 py-spacing-2 flex w-full items-center justify-between gap-2 rounded-lg text-left font-medium transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="text-primary h-4 w-4 shrink-0" />
          Generate with AI (visual contrast)
        </span>
        <ChevronDown
          className={`text-muted-foreground h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {!expanded ? (
        <p className="typo-caption text-muted-foreground px-spacing-2 pb-spacing-1">
          Opus → 4 concepts → Gemini static for{' '}
          <span className="text-foreground">{placementLabel}</span> ({aspectRatio}). Expand to run;
          your open/closed choice is remembered.
        </p>
      ) : (
        <div className="border-border bg-secondary/20 rounded-spacing-3 mt-spacing-2 p-spacing-4 space-y-4 border">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="typo-caption text-muted-foreground">
              Target: <span className="text-foreground font-medium">{placementLabel}</span> ·{' '}
              {aspectRatio} · Brief → concepts → image
            </p>
            {(conceptsText || imagePrompt) && (
              <button
                type="button"
                onClick={clearOutputs}
                className="typo-caption text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <X className="h-3 w-3" />
                Clear outputs
              </button>
            )}
          </div>
          {themeHint ? (
            <p className="typo-caption text-muted-foreground border-border rounded-spacing-1 border border-dashed px-2 py-1">
              {themeHint}
            </p>
          ) : null}

          <div className="space-y-2">
            <label className="body-4 text-muted-foreground">Target audience</label>
            <textarea
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="input-glass body-3 min-h-[56px] w-full resize-y"
              placeholder="Who they are, what they do, what keeps them up at night"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="body-4 text-muted-foreground">
                Offer / CTA (how it should look)
              </label>
              <button
                type="button"
                onClick={fillFromAdCopy}
                className="typo-caption text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Fill from ad copy
              </button>
            </div>
            <textarea
              value={offerCta}
              onChange={(e) => setOfferCta(e.target.value)}
              className="input-glass body-3 min-h-[56px] w-full resize-y"
              placeholder="e.g. Free book + shipping — 3D book cover bottom third"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <label className="body-4 text-muted-foreground">Brand / colors</label>
            <textarea
              value={brandGuidelines}
              onChange={(e) => setBrandGuidelines(e.target.value)}
              className="input-glass body-3 min-h-[44px] w-full resize-y"
              placeholder="Primary #hex, accent, or leave blank for dark cinematic default"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <label className="body-4 text-muted-foreground">
              Attached assets (headshot, product, book…)
            </label>
            <textarea
              value={attachedAssets}
              onChange={(e) => setAttachedAssets(e.target.value)}
              className="input-glass body-3 min-h-[56px] w-full resize-y"
              placeholder="e.g. Founder headshot — use in 2 concepts. Product hero on right."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <label className="body-4 text-muted-foreground">Reference / inspiration</label>
            <textarea
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="input-glass body-3 min-h-[44px] w-full resize-y"
              placeholder="Optional — describe an ad you like"
              rows={2}
            />
          </div>

          <button
            type="button"
            disabled={conceptsLoading}
            onClick={() => void runConceptsFixed()}
            className="button-glass-blue body-3 flex w-full items-center justify-center gap-2 rounded-lg py-2 font-medium disabled:opacity-50"
          >
            {conceptsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Generate 4 concepts (Opus)
          </button>

          {conceptsText ? (
            <div className="space-y-2">
              <label className="body-4 text-muted-foreground">Concept output</label>
              <textarea
                readOnly
                value={conceptsText}
                className="input-glass body-3 text-muted-foreground max-h-48 w-full resize-y"
                rows={8}
              />
              {conceptChunks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="body-4 text-muted-foreground w-full">Send to image prompt:</span>
                  {conceptChunks.map(({ n, body }, idx) => (
                    <button
                      key={`c-${idx}-${n}`}
                      type="button"
                      onClick={() => {
                        setImagePrompt(body)
                        toast.message(`Loaded concept ${n}`)
                      }}
                      className="bg-primary/15 text-primary hover:bg-primary/25 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
                    >
                      Concept {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="border-border border-t pt-3">
            <label className="body-4 text-muted-foreground mb-2 block">
              Image prompt (Gemini) · {placementLabel} {aspectRatio}
            </label>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="input-glass body-3 min-h-[120px] w-full resize-y"
              placeholder="Use Concept 1–4 above, or paste any full creative brief"
              rows={6}
            />
            <button
              type="button"
              disabled={imageLoading}
              onClick={() => void runGeminiImage()}
              className="button-glass-accent body-3 mt-2 flex w-full items-center justify-center gap-2 rounded-lg py-2 font-medium disabled:opacity-50"
            >
              {imageLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate image — {placementLabel} ({aspectRatio})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
