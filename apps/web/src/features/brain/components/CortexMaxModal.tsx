'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchBeliefPatterns,
  fetchBrainTimelines,
  fetchCompanyCortexObjects,
  fetchCustomerAvatars,
  fetchCustomerBrainView,
  fetchNarrativePages,
  fetchPerspectives,
  toggleCortexMax,
} from '../services/brain.service'
import type {
  BeliefPattern,
  BrainTimeline,
  CompanyCortexObject,
  CustomerAvatar,
  CustomerBrainView,
  NarrativePage,
  Perspective,
} from '../types'
import { CortexMaxBannerCompounds } from './cortex-max-banners/CortexMaxBannerCompounds'
import { CortexMaxBannerIdentity } from './cortex-max-banners/CortexMaxBannerIdentity'
import { CortexMaxBannerLibrary } from './cortex-max-banners/CortexMaxBannerLibrary'
import { CortexMaxBrainView } from './CortexMaxBrainView'
import { CortexMaxIcon } from './CortexMaxIcon'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

interface CortexMaxModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brainId: string | null
  memoryCount: number
  onToggled?: (enabled: boolean) => void
  /**
   * Cortex cognition is always scoped by brain_id.
   */
  scopeType?: 'user' | 'customer' | 'agent' | 'campaign' | 'company' | 'shared'
}

export default function CortexMaxModal({
  open,
  onOpenChange,
  brainId,
  memoryCount,
  onToggled,
  scopeType = 'user',
}: CortexMaxModalProps) {
  const [cortexMax, setCortexMax] = useState(false)
  const [pages, setPages] = useState<NarrativePage[]>([])
  const [timelines, setTimelines] = useState<BrainTimeline[]>([])
  const [beliefs, setBeliefs] = useState<BeliefPattern[]>([])
  const [perspectives, setPerspectives] = useState<Perspective[]>([])
  const [customerAvatars, setCustomerAvatars] = useState<CustomerAvatar[]>([])
  const [customerView, setCustomerView] = useState<CustomerBrainView | null>(null)
  const [companyObjects, setCompanyObjects] = useState<CompanyCortexObject[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [toggling, setToggling] = useState(false)
  const loadRequestIdRef = useRef(0)

  const resetContent = useCallback(() => {
    setPages([])
    setTimelines([])
    setBeliefs([])
    setPerspectives([])
    setCustomerAvatars([])
    setCustomerView(null)
    setCompanyObjects([])
  }, [])

  const loadPages = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current
    if (!brainId) {
      resetContent()
      setCortexMax(false)
      setLoading(false)
      setInitialLoaded(true)
      return
    }
    setLoading(true)
    setCortexMax(false)
    resetContent()
    try {
      const isCustomer = scopeType === 'customer'
      const isCompany = scopeType === 'company'
      const [
        res,
        timelineRes,
        beliefRows,
        perspectiveRows,
        avatarRows,
        customerViewRes,
        companyRows,
      ] = await Promise.all([
          fetchNarrativePages(brainId),
          fetchBrainTimelines(brainId).catch(
            () => ({ success: true, cortex_max: false, timelines: [] as BrainTimeline[] }),
          ),
          fetchBeliefPatterns(brainId).catch(() => [] as BeliefPattern[]),
          fetchPerspectives(brainId).catch(() => [] as Perspective[]),
          isCustomer
            ? fetchCustomerAvatars(brainId).catch(() => [] as CustomerAvatar[])
            : Promise.resolve([] as CustomerAvatar[]),
          isCustomer
            ? fetchCustomerBrainView(brainId).catch(() => null as CustomerBrainView | null)
            : Promise.resolve(null as CustomerBrainView | null),
          isCompany
            ? fetchCompanyCortexObjects().catch(() => [] as CompanyCortexObject[])
            : Promise.resolve([] as CompanyCortexObject[]),
        ])
      if (requestId !== loadRequestIdRef.current) return
      if (!res.success) throw new Error(res.error ?? 'Failed to load Cortex Max.')
      setCortexMax(res.cortex_max)
      setPages(res.pages ?? [])
      setTimelines(timelineRes.success ? (timelineRes.timelines ?? []) : [])
      setBeliefs(beliefRows)
      setPerspectives(perspectiveRows)
      setCustomerAvatars(avatarRows)
      setCustomerView(customerViewRes)
      setCompanyObjects(companyRows)
    } catch {
      setCortexMax(false)
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false)
        setInitialLoaded(true)
      }
    }
  }, [brainId, resetContent, scopeType])

  useEffect(() => {
    if (open && brainId) {
      setInitialLoaded(false)
      setLoading(true)
      setCortexMax(false)
      resetContent()
      loadPages()
    } else if (open && !brainId) {
      loadRequestIdRef.current += 1
      resetContent()
      setCortexMax(false)
      setLoading(false)
      setInitialLoaded(true)
    }
  }, [open, brainId, loadPages, resetContent])

  const handleSetCortexMax = async (nextEnabled: boolean) => {
    if (!brainId) return
    setToggling(true)
    try {
      const res = await toggleCortexMax(brainId, nextEnabled)
      if (!res.success) throw new Error(res.error ?? 'Failed to toggle Cortex Max.')
      setCortexMax(res.cortex_max)
      onToggled?.(res.cortex_max)
      if (res.cortex_max) {
        toast.success(
          res.initial_sync_triggered
            ? 'Cortex Max enabled. Initial library sync started.'
            : 'Cortex Max enabled.',
        )
        void loadPages()
      } else {
        toast.success('Cortex Max disabled.')
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Failed to toggle Cortex Max.'))
    } finally {
      setToggling(false)
    }
  }

  const handleToggle = () => {
    void handleSetCortexMax(!cortexMax)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-modal-overlay" />
        <DialogPrimitive.Content className="surface-bg fixed inset-4 z-50 mx-auto my-auto flex max-w-[1280px] flex-col overflow-hidden rounded-[32px] border border-border shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:h-[85vh] md:max-h-[820px] md:w-[1280px] md:-translate-x-1/2 md:-translate-y-1/2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Cortex Max</DialogPrimitive.Title>
          </VisuallyHidden.Root>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            {!initialLoaded ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <div className="h-12 w-12">
                  <VibeyLoadingOrb state="processing" size="sm" />
                </div>
              </div>
            ) : !cortexMax ? (
              <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-8 pb-8 text-center">
                <DialogPrimitive.Close className="btn-icon-bare btn-close-absolute z-10 rounded-lg">
                  <X className="icon-sm" />
                </DialogPrimitive.Close>
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <CortexMaxIcon size="md" />
                    <h2
                      className="flex items-center gap-1.5"
                      style={{
                        fontFamily: 'var(--font-site-headline)',
                        fontWeight: 800,
                        fontSize: '22px',
                        letterSpacing: '2px',
                      }}
                    >
                      <span className="text-foreground">CORTEX</span>
                      <span className="cortex-max-gradient-text">MAX</span>
                    </h2>
                  </div>
                </div>
                <div className="max-w-2xl">
                  <h3
                    className="mb-3"
                    style={{
                      fontFamily: 'var(--font-site-headline)',
                      fontWeight: 900,
                      fontSize: '32px',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                    }}
                  >
                    <span className="text-foreground tracking-tight">YOUR BRAIN </span>
                    <span className="cortex-max-gradient-text tracking-tight">COMES ALIVE</span>
                  </h3>
                  <p className="body-1 text-muted-foreground px-4 font-medium leading-relaxed">
                    {memoryCount > 0
                      ? `Atlas takes your ${memoryCount} memories and transforms them into a living intelligence. A structured knowledge library that compounds every second, so your agents don't just process data, they develop real intuition.`
                      : "Atlas transforms every interaction into a living intelligence. A structured knowledge library that compounds every second, so your agents don't just process data, they develop real intuition."}
                  </p>
                </div>
                <div className="grid w-full grid-cols-3 gap-10 px-16">
                  {[
                    {
                      title: 'Knowledge that connects',
                      description:
                        'Every memory becomes part of a living library. Organized, cross-referenced, and ready for any agent the moment they need it.',
                      banner: <CortexMaxBannerLibrary />,
                    },
                    {
                      title: 'Identity, not just facts',
                      description:
                        'Your agents develop a genuine point of view on your business. The longer they work, the more it feels like they truly understand you.',
                      banner: <CortexMaxBannerIdentity />,
                    },
                    {
                      title: 'Compounds forever',
                      description:
                        'Every correction, every conversation, every campaign makes the brain sharper. The value builds invisibly and accelerates over time.',
                      banner: <CortexMaxBannerCompounds />,
                    },
                  ].map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
                      className="card-glass flex flex-col overflow-hidden rounded-2xl border border-border"
                    >
                      <div className="card-glass-panel relative h-[220px] shrink-0 overflow-hidden border-b border-border">
                        {card.banner}
                      </div>
                      <div className="flex flex-col gap-3 p-8">
                        <p className="title-h6 text-foreground font-bold tracking-tight">
                          {card.title}
                        </p>
                        <p className="body-2 text-muted-foreground leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <button
                  onClick={() => void handleSetCortexMax(true)}
                  disabled={toggling}
                  className="button-glass-purple relative overflow-hidden rounded-2xl px-12 py-4 text-lg font-bold shadow-[0_20px_50px_-10px_rgba(139,92,246,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent" />
                  {toggling ? (
                    'Enabling...'
                  ) : (
                    <div className="flex items-center gap-3">
                      <span>Enable</span>
                      <span
                        className="cortex-max-gradient-text"
                        style={{
                          fontFamily: 'var(--font-site-headline)',
                          fontWeight: 900,
                          letterSpacing: '1px',
                        }}
                      >
                        MAX
                      </span>
                    </div>
                  )}
                </button>
              </div>
            ) : loading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <div className="h-12 w-12">
                  <VibeyLoadingOrb state="processing" size="sm" />
                </div>
                <p className="body-2 text-muted-foreground">Loading your library...</p>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="border-border flex items-center justify-between border-b px-6 py-3">
                  <div className="flex items-center gap-2">
                    <CortexMaxIcon size="sm" />
                    <span
                      className="flex items-center gap-1"
                      style={{
                        fontFamily: 'var(--font-site-headline)',
                        fontWeight: 800,
                        fontSize: '15px',
                        letterSpacing: '2px',
                      }}
                    >
                      <span className="text-foreground">CORTEX</span>
                      <span className="cortex-max-gradient-text">MAX</span>
                    </span>
                    {pages.length + timelines.length > 0 && (
                      <span className="body-4 text-muted-foreground ml-1">
                        {pages.length} pages / {timelines.length} timelines
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={cortexMax}
                      onClick={handleToggle}
                      disabled={toggling}
                      className={`switch-glass-cortex-max h-5 w-9 rounded-full ${toggling ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`switch-glass-primary-thumb block h-4 w-4 rounded-full ${cortexMax ? 'translate-x-4' : 'translate-x-0.5'}`}
                      />
                    </button>
                    <DialogPrimitive.Close className="btn-icon-bare rounded-lg">
                      <X className="icon-sm" />
                    </DialogPrimitive.Close>
                  </div>
                </div>
                <CortexMaxBrainView
                  pages={pages}
                  timelines={timelines}
                  beliefs={beliefs}
                  perspectives={perspectives}
                  customerAvatars={customerAvatars}
                  customerView={customerView}
                  companyObjects={companyObjects}
                  scopeType={scopeType}
                />
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
