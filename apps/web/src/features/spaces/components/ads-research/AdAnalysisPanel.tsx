'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bookmark,
  BookmarkCheck,
  Clock,
  ExternalLink,
  Eye,
  Film,
  Globe,
  Layers,
  Loader2,
  Megaphone,
  Minimize2,
  Play,
  Tag,
  Target,
  Users,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import {
  ADS_PLATFORM_LABELS,
  getAdDetails,
  type AdBreakdown,
  type AdSearchResultItem,
} from '../../services/ads-research.service'
import { adAnalysisRunKey, useAdAnalysisRunStore } from '../../store/use-ad-analysis-run-store'
import { CollapsibleSection } from '../analysis/CollapsibleSection'
import {
  formatReadableMultiline,
  splitTranscriptParagraphs,
} from '../instagram-research/ig-display-text'
import { adResultExternalLink } from './AdResultCard'

interface AdAnalysisPanelProps {
  ad: AdSearchResultItem
  spaceId: string
  onClose: () => void
  saved: boolean
  saving: boolean
  /** Hidden when undefined (e.g. opened from the Saved ads grid). */
  onSave?: () => void
  /** Persists analysis fields (transcript/breakdown/details) onto the snapshot or item. */
  onAdPatch?: (patch: Partial<AdSearchResultItem>) => void | Promise<void>
}

type AdAnalysisTab = 'script' | 'formula' | 'ad_data'

const BEAT_PURPOSE_LABELS: Record<string, string> = {
  hook: 'HOOK',
  problem: 'PROBLEM',
  agitate: 'AGITATE',
  demo: 'DEMO',
  proof: 'PROOF',
  offer: 'OFFER',
  cta: 'CTA',
  other: 'BEAT',
}

function formatLabel(format: AdSearchResultItem['format']): string {
  if (format === 'video') return 'Video'
  if (format === 'image') return 'Image'
  if (format === 'carousel') return 'Carousel'
  if (format === 'text') return 'Text'
  return 'Ad'
}

function dateLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </span>
      <span className="text-xs font-medium text-[var(--foreground)]">{value}</span>
    </div>
  )
}

function ChipList({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className="badge-glass badge-glass-muted rounded-full px-2 py-0.5 text-xs font-medium"
        >
          {value}
        </span>
      ))}
    </div>
  )
}

function AdAnalysisTabBar({
  active,
  onChange,
}: {
  active: AdAnalysisTab
  onChange: (tab: AdAnalysisTab) => void
}) {
  const tabs: Array<{ id: AdAnalysisTab; label: string }> = [
    { id: 'script', label: 'Script' },
    { id: 'formula', label: 'Formula' },
    { id: 'ad_data', label: 'Ad data' },
  ]
  return (
    <div className="flex shrink-0 gap-1 border-b border-[var(--border)] px-2 pt-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'body-3 rounded-t-md px-3 py-2 font-medium transition-colors',
            active === tab.id
              ? 'border-b-2 border-[var(--color-primary)] text-[var(--foreground)]'
              : 'text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

/** Decorative stack matching IgContentAnalyzeMockup — ads flavored. */
function AdAnalyzeMockup() {
  return (
    <div aria-hidden className="relative mx-auto h-44 w-full max-w-[18rem] select-none">
      <div className="bg-muted-foreground absolute left-1/2 top-1/2 -z-10 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-3xl" />
      <div className="card-glass absolute left-1 top-8 flex h-[4.25rem] w-[6.5rem] -rotate-6 flex-col overflow-hidden p-0 opacity-45 shadow-lg">
        <div className="border-border bg-muted flex h-6 shrink-0 items-center border-b px-2 opacity-90">
          <Megaphone className="h-3 w-3 text-[var(--color-muted-foreground)] opacity-50" />
        </div>
        <div className="bg-secondary border-border min-h-0 flex-1 border-t-0" />
      </div>
      <div className="card-glass absolute left-1/2 top-3 flex h-[8.25rem] w-[11.5rem] -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="border-border bg-muted flex h-7 shrink-0 items-center justify-between border-b px-2.5 opacity-90">
          <div className="flex items-center gap-1.5">
            <Target className="h-3 w-3 text-[var(--color-muted-foreground)] opacity-50" />
            <div className="bg-muted-foreground h-2 w-12 rounded-full opacity-25" />
          </div>
          <div className="bg-muted-foreground h-2.5 w-9 rounded-full opacity-15" />
        </div>
        <div className="flex min-h-0 flex-1 gap-2 p-2">
          <div className="border-border bg-secondary w-[36%] shrink-0 rounded-md border" />
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-0.5">
            <div className="bg-muted-foreground h-1.5 w-full rounded-full opacity-20" />
            <div className="bg-muted-foreground h-1 w-[88%] rounded-full opacity-15" />
            <div className="bg-muted-foreground h-1 w-3/5 rounded-full opacity-15" />
            <div className="relative mt-auto pt-1">
              <div className="bg-primary h-7 w-full rounded-md opacity-35" />
              <div className="absolute bottom-1 right-2">
                <Zap className="h-3 w-3 text-[var(--color-muted-foreground)] opacity-60 drop-shadow-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdAnalysisPanel({
  ad: initialAd,
  spaceId,
  onClose,
  saved,
  saving,
  onSave,
  onAdPatch,
}: AdAnalysisPanelProps) {
  const [visible, setVisible] = useState(true)
  const [videoExpanded, setVideoExpanded] = useState(false)
  // Analysis fields accumulate locally so the panel reflects them immediately.
  const [ad, setAd] = useState<AdSearchResultItem>(initialAd)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [tab, setTab] = useState<AdAnalysisTab>('script')
  const [openScriptHook, setOpenScriptHook] = useState(true)
  const [openScriptCopy, setOpenScriptCopy] = useState(true)
  const [openFormulaAngle, setOpenFormulaAngle] = useState(true)
  const [openFormulaAudience, setOpenFormulaAudience] = useState(true)
  const [openFormulaPain, setOpenFormulaPain] = useState(true)
  const [openFormulaStructure, setOpenFormulaStructure] = useState(true)
  const [openFormulaOffer, setOpenFormulaOffer] = useState(true)
  const [openFormulaWhy, setOpenFormulaWhy] = useState(true)
  const [openFormulaSteal, setOpenFormulaSteal] = useState(true)
  const [openAdDataTargeting, setOpenAdDataTargeting] = useState(true)
  const [openAdDataVariants, setOpenAdDataVariants] = useState(true)
  const [openAdDataDetails, setOpenAdDataDetails] = useState(true)

  // Parent owns the persisted ad (snapshot results / space item). Syncing from
  // the prop means an Analyze run that finished while this panel was closed —
  // or that lands while it's open — shows up without a remount.
  useEffect(() => {
    setAd(initialAd)
  }, [initialAd])

  // The run itself lives in a module store keyed by ad, so closing the panel
  // mid-run loses nothing: persistence happens in the store's onDone, and a
  // reopened panel picks the running/error state back up.
  const runKey = adAnalysisRunKey(spaceId, initialAd)
  const run = useAdAnalysisRunStore((s) => s.runs[runKey])
  const startBreakdown = useAdAnalysisRunStore((s) => s.startBreakdown)
  const clearRunError = useAdAnalysisRunStore((s) => s.clearError)
  const analyzing = run?.status === 'running'
  const analyzeError = run?.status === 'error' ? run.error : null

  const requestClose = useCallback(() => {
    setVisible(false)
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (videoExpanded) setVideoExpanded(false)
      else requestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose, videoExpanded])

  const copyText = useCallback((text: string, label: string) => {
    void navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`))
  }, [])

  // Marketer analysis: transcript (video ads) + LLM formula breakdown.
  const handleAnalyze = useCallback(() => {
    if (analyzing) return
    clearRunError(runKey)
    startBreakdown(runKey, spaceId, ad, async (patch) => {
      await onAdPatch?.(patch)
    })
  }, [ad, analyzing, clearRunError, onAdPatch, runKey, spaceId, startBreakdown])

  // Secondary: raw platform transparency data (targeting, variants).
  const handleLoadDetails = useCallback(async () => {
    if (detailsLoading) return
    setDetailsLoading(true)
    setDetailsError(null)
    try {
      const fetched = await getAdDetails(spaceId, ad.platform, {
        ad_id: ad.ad_id,
        details_token: ad.details_token ?? null,
        advertiser_id: ad.advertiser_id ?? null,
      })
      // Google search results carry no media — lift it from the variations
      // (heterogeneous: some image-only, some text-only).
      const videoVar = fetched.variations.find((v) => v.video_url)
      const imageVar = fetched.variations.find((v) => v.image_url)
      const patch: Partial<AdSearchResultItem> = {
        details: fetched,
        ...(!ad.video_url && videoVar?.video_url ? { video_url: videoVar.video_url } : {}),
        ...(!ad.image_url && (videoVar?.image_url || imageVar?.image_url)
          ? { image_url: videoVar?.image_url ?? imageVar!.image_url }
          : {}),
      }
      setAd((prev) => ({ ...prev, ...patch }))
      await onAdPatch?.(patch)
    } catch {
      setDetailsError("Couldn't load the platform data. Try again.")
    } finally {
      setDetailsLoading(false)
    }
  }, [ad, detailsLoading, onAdPatch, spaceId])

  const breakdown = ad.breakdown ?? null
  const details = ad.details ?? null
  const externalLink = adResultExternalLink(ad)
  const shownLabel = dateLabel(ad.last_shown ?? ad.first_shown)
  const transcriptParagraphs = ad.transcript ? splitTranscriptParagraphs(ad.transcript) : []

  const scriptHookTranscriptCopy = useMemo(() => {
    const parts: string[] = []
    if (breakdown?.hook) {
      const hookLines: string[] = []
      if (breakdown.hook.quote) hookLines.push(`"${breakdown.hook.quote}"`)
      hookLines.push(`Technique: ${breakdown.hook.technique}`)
      parts.push(`Hook:\n${hookLines.join('\n')}`)
    }
    if (ad.transcript) parts.push(`Script:\n${ad.transcript}`)
    if (parts.length === 0) return null
    return parts.join('\n\n')
  }, [ad.transcript, breakdown?.hook])

  const formulaAngleCopyText = useMemo(() => (breakdown ? breakdown.angle : null), [breakdown])
  const formulaAudienceCopyText = useMemo(
    () => (breakdown ? breakdown.target_audience : null),
    [breakdown],
  )
  const formulaPainCopyText = useMemo(
    () => (breakdown ? breakdown.pain_or_desire : null),
    [breakdown],
  )
  const formulaStructureCopyText = useMemo(() => {
    if (!breakdown) return null
    const lines = [`Framework: ${breakdown.framework}`]
    breakdown.beats.forEach((beat, index) => {
      lines.push(
        `${index + 1}. ${beat.title} (${BEAT_PURPOSE_LABELS[beat.purpose] ?? 'BEAT'})\n${beat.summary}`,
      )
    })
    return lines.join('\n\n')
  }, [breakdown])
  const formulaOfferCopyText = useMemo(() => {
    if (!breakdown) return null
    const lines: string[] = []
    if (breakdown.offer) lines.push(`Offer: ${breakdown.offer}`)
    if (breakdown.cta) lines.push(`CTA: ${breakdown.cta}`)
    return lines.length > 0 ? lines.join('\n') : null
  }, [breakdown])
  const formulaWhyCopyText = useMemo(() => (breakdown ? breakdown.why_it_works : null), [breakdown])
  const formulaStealCopyText = useMemo(() => {
    if (!breakdown || breakdown.steal_this.length === 0) return null
    return breakdown.steal_this.map((pattern) => `- ${pattern}`).join('\n')
  }, [breakdown])

  const adDataTargetingCopyText = useMemo(() => {
    const targeting = details?.targeting
    if (!targeting) return null
    const hasTargeting =
      targeting.locations.length > 0 ||
      targeting.age_ranges.length > 0 ||
      targeting.genders.length > 0 ||
      targeting.audience_size !== null ||
      targeting.signals.length > 0
    if (!hasTargeting) return null
    const lines: string[] = []
    if (targeting.audience_size) lines.push(`Audience size: ${targeting.audience_size}`)
    if (targeting.age_ranges.length > 0) lines.push(`Ages: ${targeting.age_ranges.join(', ')}`)
    if (targeting.genders.length > 0) lines.push(`Genders: ${targeting.genders.join(', ')}`)
    targeting.locations.forEach((loc) => {
      lines.push(`${loc.name}${loc.detail ? `: ${loc.detail}` : ''}`)
    })
    if (targeting.signals.length > 0) lines.push(`Signals: ${targeting.signals.join(', ')}`)
    return lines.join('\n')
  }, [details?.targeting])

  const adDataDetailsCopyText = useMemo(() => {
    if (!details) return null
    const firstShownLabel = dateLabel(details.first_shown ?? ad.first_shown)
    const lastShownLabel = dateLabel(details.last_shown ?? ad.last_shown)
    const lines: string[] = []
    if (details.advertiser_name) lines.push(`Advertiser: ${details.advertiser_name}`)
    if (details.advertiser_about) lines.push(`About: ${details.advertiser_about}`)
    if (details.page_category) lines.push(`Category: ${details.page_category}`)
    if (details.ig_username) {
      lines.push(
        `Instagram: @${details.ig_username}${details.ig_followers != null ? ` (${details.ig_followers.toLocaleString('en-US')} followers)` : ''}`,
      )
    }
    if (details.page_likes != null)
      lines.push(`Page likes: ${details.page_likes.toLocaleString('en-US')}`)
    if (details.advertiser_location) lines.push(`Location: ${details.advertiser_location}`)
    if (details.payer) lines.push(`Paid for by: ${details.payer}`)
    if (details.topic) lines.push(`Topic: ${details.topic}`)
    if (details.total_impressions) lines.push(`Impressions: ${details.total_impressions}`)
    if (firstShownLabel) lines.push(`First shown: ${firstShownLabel}`)
    if (lastShownLabel) lines.push(`Last shown: ${lastShownLabel}`)
    return lines.length > 0 ? lines.join('\n') : null
  }, [ad.first_shown, details])

  const renderScriptTab = () => (
    <div className="px-2 pt-1">
      <CollapsibleSection
        id="ad-script-hook"
        title="Hook + script"
        open={openScriptHook}
        onToggle={() => setOpenScriptHook((open) => !open)}
        copyLabel="Hook + script"
        copyText={scriptHookTranscriptCopy}
        onCopy={copyText}
      >
        <div className="space-y-4">
          <div>
            <h3 className="body-3 mb-2 text-[var(--color-muted-foreground)]">Hook</h3>
            {breakdown?.hook ? (
              <div className="space-y-2 text-sm leading-relaxed text-[var(--foreground)]">
                {breakdown.hook.quote ? (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                    <p className="whitespace-pre-wrap break-words font-medium">
                      &ldquo;{breakdown.hook.quote}&rdquo;
                    </p>
                  </div>
                ) : null}
                <p className="text-[var(--color-muted-foreground)]">{breakdown.hook.technique}</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Run Analyze to extract the hook.
              </p>
            )}
          </div>
          <div>
            <h3 className="body-3 mb-2 text-[var(--color-muted-foreground)]">Script</h3>
            {transcriptParagraphs.length > 0 ? (
              <div className="space-y-3">
                {transcriptParagraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className="break-words text-sm leading-relaxed text-[var(--foreground)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {ad.format === 'video'
                  ? 'No script could be transcribed from this video.'
                  : 'This is not a video ad. The ad copy section has the full text.'}
              </p>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {ad.creative_text ? (
        <CollapsibleSection
          id="ad-script-copy"
          title="Ad copy"
          open={openScriptCopy}
          onToggle={() => setOpenScriptCopy((open) => !open)}
          copyLabel="Ad copy"
          copyText={ad.creative_text}
          onCopy={copyText}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)]">
            {formatReadableMultiline(ad.creative_text)}
          </p>
        </CollapsibleSection>
      ) : null}
    </div>
  )

  const renderFormulaTab = (bd: AdBreakdown) => (
    <div className="px-2 pt-1">
      <CollapsibleSection
        id="ad-formula-angle"
        title="Angle"
        open={openFormulaAngle}
        onToggle={() => setOpenFormulaAngle((open) => !open)}
        copyLabel="Angle"
        copyText={formulaAngleCopyText}
        onCopy={copyText}
      >
        <p className="text-sm leading-relaxed text-[var(--foreground)]">{bd.angle}</p>
      </CollapsibleSection>

      <CollapsibleSection
        id="ad-formula-audience"
        title="Target audience"
        open={openFormulaAudience}
        onToggle={() => setOpenFormulaAudience((open) => !open)}
        copyLabel="Target audience"
        copyText={formulaAudienceCopyText}
        onCopy={copyText}
      >
        <p className="text-sm leading-relaxed text-[var(--foreground)]">{bd.target_audience}</p>
      </CollapsibleSection>

      <CollapsibleSection
        id="ad-formula-pain"
        title="Pain / desire"
        open={openFormulaPain}
        onToggle={() => setOpenFormulaPain((open) => !open)}
        copyLabel="Pain / desire"
        copyText={formulaPainCopyText}
        onCopy={copyText}
      >
        <p className="text-sm leading-relaxed text-[var(--foreground)]">{bd.pain_or_desire}</p>
      </CollapsibleSection>

      <CollapsibleSection
        id="ad-formula-structure"
        title="Structure"
        open={openFormulaStructure}
        onToggle={() => setOpenFormulaStructure((open) => !open)}
        copyLabel="Structure"
        copyText={formulaStructureCopyText}
        onCopy={copyText}
      >
        <div className="space-y-3">
          <span className="badge-glass badge-glass-muted inline-flex rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider">
            {bd.framework}
          </span>
          {bd.beats.length > 0 ? (
            <ol className="space-y-3 pl-0 text-sm leading-relaxed text-[var(--foreground)]">
              {bd.beats.map((beat, index) => (
                <li
                  key={`${beat.title}-${index}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {index + 1}. {beat.title}
                    </p>
                    <span className="badge-glass badge-glass-muted shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider">
                      {BEAT_PURPOSE_LABELS[beat.purpose] ?? 'BEAT'}
                    </span>
                  </div>
                  <p className="mt-1">{beat.summary}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">No structure beats.</p>
          )}
        </div>
      </CollapsibleSection>

      {bd.offer || bd.cta ? (
        <CollapsibleSection
          id="ad-formula-offer"
          title="Offer & CTA"
          open={openFormulaOffer}
          onToggle={() => setOpenFormulaOffer((open) => !open)}
          copyLabel="Offer & CTA"
          copyText={formulaOfferCopyText}
          onCopy={copyText}
        >
          <div className="space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
            {bd.offer ? (
              <div>
                <p className="body-3 mb-1 text-[var(--color-muted-foreground)]">Offer</p>
                <p>{bd.offer}</p>
              </div>
            ) : null}
            {bd.cta ? (
              <div>
                <p className="body-3 mb-1 text-[var(--color-muted-foreground)]">CTA</p>
                <p>{bd.cta}</p>
              </div>
            ) : null}
          </div>
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection
        id="ad-formula-why"
        title="Why it works"
        open={openFormulaWhy}
        onToggle={() => setOpenFormulaWhy((open) => !open)}
        copyLabel="Why it works"
        copyText={formulaWhyCopyText}
        onCopy={copyText}
      >
        <p className="text-sm leading-relaxed text-[var(--foreground)]">{bd.why_it_works}</p>
      </CollapsibleSection>

      {bd.steal_this.length > 0 ? (
        <CollapsibleSection
          id="ad-formula-steal"
          title="Steal this"
          open={openFormulaSteal}
          onToggle={() => setOpenFormulaSteal((open) => !open)}
          copyLabel="Steal this"
          copyText={formulaStealCopyText}
          onCopy={copyText}
        >
          <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--foreground)]">
            {bd.steal_this.map((pattern, index) => (
              <li key={index} className="flex items-start gap-2">
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span>{pattern}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}

      <div className="flex items-center justify-between px-3 py-3">
        <span className="text-[10px] text-[var(--color-muted-foreground)]">
          Generated {new Date(bd.generated_at).toLocaleString()}
        </span>
      </div>
    </div>
  )

  const renderAdDataTab = () => {
    if (!details) {
      return (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <p className="body-3 text-muted-foreground max-w-sm">
            Pull the platform transparency data: targeting, regions, and creative variants.
          </p>
          {detailsError ? (
            <p className="body-3 text-[var(--color-destructive)]">{detailsError}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void handleLoadDetails()}
            disabled={detailsLoading}
            className="badge-glass badge-glass-muted rounded-spacing-2 inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {detailsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {detailsLoading ? 'Loading…' : 'Load platform data'}
          </button>
        </div>
      )
    }

    const targeting = details.targeting
    const hasTargeting =
      targeting !== null &&
      (targeting.locations.length > 0 ||
        targeting.age_ranges.length > 0 ||
        targeting.genders.length > 0 ||
        targeting.audience_size !== null ||
        targeting.signals.length > 0)
    const firstShownLabel = dateLabel(details.first_shown ?? ad.first_shown)
    const lastShownLabel = dateLabel(details.last_shown ?? ad.last_shown)

    return (
      <div className="px-2 pt-1">
        {hasTargeting ? (
          <CollapsibleSection
            id="ad-data-targeting"
            title="Targeting"
            open={openAdDataTargeting}
            onToggle={() => setOpenAdDataTargeting((open) => !open)}
            copyLabel="Targeting"
            copyText={adDataTargetingCopyText}
            onCopy={copyText}
          >
            <div className="space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
              {targeting!.audience_size ? (
                <StatRow
                  icon={<Users className="h-3 w-3" />}
                  label="Audience size"
                  value={targeting!.audience_size}
                />
              ) : null}
              {targeting!.age_ranges.length > 0 ? (
                <ChipList values={targeting!.age_ranges} />
              ) : null}
              {targeting!.genders.length > 0 ? <ChipList values={targeting!.genders} /> : null}
              {targeting!.locations.length > 0 ? (
                <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] px-3">
                  {targeting!.locations.slice(0, 12).map((loc) => (
                    <StatRow
                      key={loc.name}
                      icon={<Globe className="h-3 w-3" />}
                      label={loc.name}
                      value={loc.detail ?? '-'}
                    />
                  ))}
                </div>
              ) : null}
              {targeting!.signals.length > 0 ? <ChipList values={targeting!.signals} /> : null}
            </div>
          </CollapsibleSection>
        ) : null}

        {details.variations.length > 0 ? (
          <CollapsibleSection
            id="ad-data-variants"
            title={`Creative variants (${details.variations.length})`}
            open={openAdDataVariants}
            onToggle={() => setOpenAdDataVariants((open) => !open)}
            copyLabel="Creative variants"
            copyText={null}
            onCopy={copyText}
          >
            <div className="grid grid-cols-2 gap-2">
              {details.variations.slice(0, 8).map((variation, index) => (
                <div
                  key={`${variation.title ?? variation.text ?? 'variant'}-${index}`}
                  className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--color-secondary)]"
                >
                  {variation.image_url ? (
                    <img
                      src={variation.image_url}
                      alt={variation.title ?? ''}
                      className="aspect-video w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="space-y-1 p-2">
                    {variation.title ? (
                      <p className="truncate text-xs font-medium text-[var(--foreground)]">
                        {variation.title}
                      </p>
                    ) : null}
                    {variation.text ? (
                      <p className="line-clamp-2 text-[11px] text-[var(--color-muted-foreground)]">
                        {variation.text}
                      </p>
                    ) : null}
                    {variation.cta ? (
                      <span className="badge-glass badge-glass-muted inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                        {variation.cta}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        ) : null}

        <CollapsibleSection
          id="ad-data-details"
          title="Details"
          open={openAdDataDetails}
          onToggle={() => setOpenAdDataDetails((open) => !open)}
          copyLabel="Details"
          copyText={adDataDetailsCopyText}
          onCopy={copyText}
        >
          <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] px-3">
            {details.advertiser_name ? (
              <StatRow
                icon={<Megaphone className="h-3 w-3" />}
                label="Advertiser"
                value={details.advertiser_name}
              />
            ) : null}
            {details.advertiser_about ? (
              <StatRow
                icon={<Tag className="h-3 w-3" />}
                label="About"
                value={details.advertiser_about}
              />
            ) : null}
            {details.page_category ? (
              <StatRow
                icon={<Tag className="h-3 w-3" />}
                label="Category"
                value={details.page_category}
              />
            ) : null}
            {details.ig_username ? (
              <StatRow
                icon={<Users className="h-3 w-3" />}
                label="Instagram"
                value={`@${details.ig_username}${details.ig_followers != null ? ` · ${details.ig_followers.toLocaleString('en-US')} followers` : ''}`}
              />
            ) : null}
            {details.page_likes != null ? (
              <StatRow
                icon={<Users className="h-3 w-3" />}
                label="Page likes"
                value={details.page_likes.toLocaleString('en-US')}
              />
            ) : null}
            {details.advertiser_location ? (
              <StatRow
                icon={<Globe className="h-3 w-3" />}
                label="Location"
                value={details.advertiser_location}
              />
            ) : null}
            {details.payer ? (
              <StatRow
                icon={<Wallet className="h-3 w-3" />}
                label="Paid for by"
                value={details.payer}
              />
            ) : null}
            {details.topic ? (
              <StatRow icon={<Tag className="h-3 w-3" />} label="Topic" value={details.topic} />
            ) : null}
            {details.total_impressions ? (
              <StatRow
                icon={<Eye className="h-3 w-3" />}
                label="Impressions"
                value={details.total_impressions}
              />
            ) : null}
            {firstShownLabel ? (
              <StatRow
                icon={<Clock className="h-3 w-3" />}
                label="First shown"
                value={firstShownLabel}
              />
            ) : null}
            {lastShownLabel ? (
              <StatRow
                icon={<Clock className="h-3 w-3" />}
                label="Last shown"
                value={lastShownLabel}
              />
            ) : null}
          </div>
        </CollapsibleSection>
      </div>
    )
  }

  return (
    <AnimatePresence onExitComplete={onClose}>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[99999] flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-modal-overlay"
            onClick={requestClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          <motion.div
            className="rounded-l-spacing-2 relative ml-auto flex h-full w-full max-w-xl flex-col overflow-hidden border-l border-[var(--border)] bg-[var(--color-background)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between px-4 py-3">
              <span className="badge-glass badge-glass-orange rounded-full px-2 py-0.5 text-xs font-semibold">
                {ADS_PLATFORM_LABELS[ad.platform]}
              </span>
              <div className="flex items-center gap-1">
                {onSave ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!saved && !saving) onSave()
                    }}
                    title={saved ? 'Saved to space' : 'Save ad to space'}
                    className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : saved ? (
                      <BookmarkCheck className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </button>
                ) : null}
                {externalLink ? (
                  <a
                    href={externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open ad"
                    className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={requestClose}
                  className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Expanded video overlay */}
              <AnimatePresence>
                {videoExpanded && ad.video_url && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.4, y: -20, borderRadius: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0, borderRadius: 0 }}
                    exit={{ opacity: 0, scale: 0.4, y: -20, borderRadius: 12 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute inset-0 z-10 flex flex-col bg-black"
                  >
                    <div className="relative flex-1">
                      <video
                        src={ad.video_url}
                        controls
                        autoPlay
                        playsInline
                        className="h-full w-full object-contain"
                        poster={ad.image_url ?? undefined}
                      />
                      <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.15 }}
                          onClick={() => setVideoExpanded(false)}
                          className="rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
                        >
                          <Minimize2 className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Compact media + stats row */}
              <div className="flex shrink-0 gap-4 p-4">
                <div className="flex w-[110px] shrink-0 flex-col gap-1.5">
                  <div
                    className={cn(
                      'relative w-full overflow-hidden rounded-lg bg-black/20',
                      ad.platform === 'tiktok' ? 'aspect-[9/16]' : 'aspect-[9/8]',
                    )}
                  >
                    {ad.image_url ? (
                      <>
                        <img
                          src={ad.image_url}
                          alt={ad.creative_text ?? ad.ad_id}
                          className="h-full w-full object-cover"
                        />
                        {ad.video_url && (
                          <button
                            type="button"
                            onClick={() => setVideoExpanded(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40"
                          >
                            <Play className="h-6 w-6 text-white" fill="white" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--color-muted-foreground)]">
                        <Megaphone className="h-6 w-6 opacity-30" />
                      </div>
                    )}
                  </div>
                  {ad.advertiser_name ? (
                    <div className="w-full text-center">
                      <p
                        className="truncate text-xs font-medium text-[var(--foreground)]"
                        title={ad.advertiser_name}
                      >
                        {ad.advertiser_name}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col justify-center">
                  <div className="divide-y divide-[var(--border)]">
                    <StatRow
                      icon={<Film className="h-3 w-3" />}
                      label="Format"
                      value={formatLabel(ad.format)}
                    />
                    {ad.days_running != null && (
                      <StatRow
                        icon={<Clock className="h-3 w-3" />}
                        label="Days running"
                        value={`${ad.days_running}d`}
                      />
                    )}
                    {ad.variant_count != null && ad.variant_count > 1 && (
                      <StatRow
                        icon={<Layers className="h-3 w-3" />}
                        label="Active copies"
                        value={`×${ad.variant_count}`}
                      />
                    )}
                    {ad.is_active != null && (
                      <StatRow
                        icon={<Zap className="h-3 w-3" />}
                        label="Status"
                        value={
                          <span style={ad.is_active ? { color: '#34d399' } : undefined}>
                            {ad.is_active ? 'Active' : 'Inactive'}
                          </span>
                        }
                      />
                    )}
                    {ad.reach_estimate && (
                      <StatRow
                        icon={<Users className="h-3 w-3" />}
                        label="Est. audience"
                        value={ad.reach_estimate}
                      />
                    )}
                    {shownLabel && (
                      <StatRow
                        icon={<Eye className="h-3 w-3" />}
                        label="Last shown"
                        value={shownLabel}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Analyze CTA / tabbed analysis */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[var(--border)]">
                {!breakdown ? (
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
                    <AdAnalyzeMockup />
                    <div className="mt-4 flex max-w-sm flex-col items-center gap-3 text-center">
                      <p className="body-3 text-[var(--color-muted-foreground)]">
                        {ad.format === 'video'
                          ? 'Extract the full script, hook, ad formula, offer, and steal-worthy patterns in one run.'
                          : 'Deconstruct the hook, angle, ad formula, offer, and steal-worthy patterns in one run.'}
                      </p>
                      {analyzeError ? (
                        <p className="body-3 text-[var(--color-destructive)]">{analyzeError}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleAnalyze()}
                        disabled={analyzing}
                        className="badge-glass badge-glass-green rounded-spacing-2 inline-flex items-center px-4 py-2.5 text-xs font-semibold text-emerald-400 transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {analyzing
                          ? ad.format === 'video'
                            ? 'Transcribing & analyzing…'
                            : 'Analyzing…'
                          : 'Analyze ad'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <AdAnalysisTabBar active={tab} onChange={setTab} />
                    <div className="min-h-0 flex-1 overflow-y-auto pb-4">
                      {tab === 'script' && renderScriptTab()}
                      {tab === 'formula' && renderFormulaTab(breakdown)}
                      {tab === 'ad_data' && renderAdDataTab()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
