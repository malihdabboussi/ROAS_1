import { useCallback, useEffect, useRef, useState } from 'react'
import {
  META_PUBLISH_VALIDATION_MESSAGES,
  STUDIO_INLINE_ERRORS,
} from '@/features/studio/config/studio-inline-errors.config'
import {
  fetchMetaInstagramAccountsForPage,
  fetchMetaPixels,
} from '../../../services/artifact-preview.service'
import { fetchCampaign, updateCampaign } from '../../../services/campaign.service'
import { executeMetaPublish } from './execute-meta-publish'
import type {
  MetaPublishConfig,
  MetaPublishModalProps,
  MetaPublishStep,
  MetaPublishSummary,
  ValidationCheck,
} from './meta-publish-modal.types'
import {
  createMetaPublishMutable,
  runMetaPublishValidationPartA,
} from './meta-publish-validation-part-a'
import { runMetaPublishValidationPartB } from './meta-publish-validation-part-b'

export function useMetaPublishModal({
  open,
  adId,
  adCampaignId,
  onPublished,
  defaultAdAccountId,
  defaultPageId,
  defaultInstagramUserId,
  platformCampaignId,
}: Omit<MetaPublishModalProps, 'onClose'>) {
  const [step, setStep] = useState<MetaPublishStep>('validating')
  const [checks, setChecks] = useState<ValidationCheck[]>([])
  const [msgIndex, setMsgIndex] = useState(0)
  const [msgVisible, setMsgVisible] = useState(true)

  const [adAccounts, setAdAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [pages, setPages] = useState<Array<{ id: string; name: string }>>([])
  const [igAccounts, setIgAccounts] = useState<Array<{ id: string; username?: string }>>([])
  const [pixels, setPixels] = useState<Array<{ id: string; name: string }>>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedPageId, setSelectedPageId] = useState('')
  const [selectedInstagramUserId, setSelectedInstagramUserId] = useState('')
  const [selectedPixelId, setSelectedPixelId] = useState('')
  const [customEventType, setCustomEventType] = useState('PURCHASE')
  const [linkedCampaignId, setLinkedCampaignId] = useState<string | null>(null)
  const [linkedCampaignMetadata, setLinkedCampaignMetadata] = useState<Record<string, unknown>>({})
  const [publishConfig, setPublishConfig] = useState<MetaPublishConfig>({})
  const [summary, setSummary] = useState<MetaPublishSummary | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const hasRun = useRef(false)

  const updateCheck = useCallback((id: string, update: Partial<ValidationCheck>) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, ...update } : c)))
  }, [])

  const runValidation = useCallback(async () => {
    const m = createMetaPublishMutable(
      adCampaignId,
      defaultAdAccountId,
      defaultPageId,
      defaultInstagramUserId,
    )
    const cont = await runMetaPublishValidationPartA(
      {
        adId,
        adCampaignId,
        updateCheck,
        setChecks,
        setStep,
        setPublishError,
        setAdAccounts,
        setPages,
        setSelectedAccountId,
        setSelectedPageId,
        setIgAccounts,
        setSelectedInstagramUserId,
      },
      m,
    )
    if (!cont) return
    await runMetaPublishValidationPartB(
      {
        adCampaignId,
        updateCheck,
        setSelectedAccountId,
        setSelectedPageId,
        setSelectedPixelId,
        setCustomEventType,
        setLinkedCampaignId,
        setLinkedCampaignMetadata,
        setPublishConfig,
        setSummary,
        setStep,
      },
      m,
    )
  }, [adCampaignId, adId, defaultAdAccountId, defaultInstagramUserId, defaultPageId, updateCheck])

  useEffect(() => {
    if (!open || step !== 'ready' || !selectedAccountId) return
    let cancelled = false
    const loadPixels = async () => {
      try {
        const fetchedPixels = await fetchMetaPixels(selectedAccountId)
        if (cancelled) return
        setPixels(fetchedPixels)
        if (!fetchedPixels.some((pixel) => pixel.id === selectedPixelId)) {
          setSelectedPixelId('')
        }
      } catch {
        if (cancelled) return
        setPixels([])
        setSelectedPixelId('')
      }
    }
    void loadPixels()
    return () => {
      cancelled = true
    }
  }, [open, selectedAccountId, selectedPixelId, step])

  useEffect(() => {
    if (!open || step !== 'ready' || !selectedPageId) return
    let cancelled = false
    const loadIgAccounts = async () => {
      try {
        const accounts = await fetchMetaInstagramAccountsForPage(selectedPageId)
        if (cancelled) return
        setIgAccounts(accounts)
        if (!accounts.some((a) => a.id === selectedInstagramUserId)) {
          setSelectedInstagramUserId(accounts[0]?.id ?? '')
        }
      } catch {
        if (cancelled) return
        setIgAccounts([])
        setSelectedInstagramUserId('')
      }
    }
    void loadIgAccounts()
    return () => {
      cancelled = true
    }
  }, [open, step, selectedPageId, selectedInstagramUserId])

  useEffect(() => {
    if (!open) {
      hasRun.current = false
      return
    }
    if (hasRun.current) return
    hasRun.current = true
    void runValidation()
  }, [open, runValidation])

  useEffect(() => {
    if (step !== 'validating') return
    setMsgIndex(0)
    setMsgVisible(true)
    const interval = setInterval(() => {
      setMsgVisible(false)
      setTimeout(() => {
        setMsgIndex((prev) =>
          prev < META_PUBLISH_VALIDATION_MESSAGES.length - 1 ? prev + 1 : prev,
        )
        setMsgVisible(true)
      }, 300)
    }, 2200)
    return () => clearInterval(interval)
  }, [step])

  const handlePublish = useCallback(async () => {
    const isCampaignMode = !!adCampaignId
    if (!selectedAccountId || !selectedPageId || !selectedInstagramUserId) return
    setStep('publishing')
    setPublishError(null)
    try {
      await executeMetaPublish({
        isCampaignMode,
        adId,
        adCampaignId,
        selectedAccountId,
        selectedPageId,
        selectedInstagramUserId,
        selectedPixelId,
        customEventType,
        linkedCampaignId,
        linkedCampaignMetadata,
        publishConfig,
      })
      setStep('success')
      onPublished?.()
      if (platformCampaignId) {
        try {
          const campaign = await fetchCampaign(platformCampaignId)
          const existingConfig = (campaign.config ?? {}) as Record<string, unknown>
          await updateCampaign(platformCampaignId, {
            config: {
              ...existingConfig,
              meta_defaults: {
                meta_ad_account_id: selectedAccountId,
                meta_page_id: selectedPageId,
                meta_instagram_user_id: selectedInstagramUserId,
                meta_pixel_id: selectedPixelId || null,
              },
            },
          })
        } catch {
          // Non-blocking: defaults save failed
        }
      }
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : STUDIO_INLINE_ERRORS.PUBLISH_FAILED)
      setStep('error')
    }
  }, [
    adCampaignId,
    adId,
    customEventType,
    linkedCampaignId,
    linkedCampaignMetadata,
    onPublished,
    platformCampaignId,
    selectedAccountId,
    selectedInstagramUserId,
    selectedPageId,
    selectedPixelId,
    publishConfig,
  ])

  const allPassed = checks.length > 0 && checks.every((c) => c.status === 'passed')
  const anyFailed = checks.some((c) => c.status === 'failed')
  const isValidating = step === 'validating'

  return {
    step,
    checks,
    msgIndex,
    msgVisible,
    adAccounts,
    pages,
    igAccounts,
    pixels,
    selectedAccountId,
    setSelectedAccountId,
    selectedPageId,
    setSelectedPageId,
    selectedInstagramUserId,
    setSelectedInstagramUserId,
    selectedPixelId,
    setSelectedPixelId,
    summary,
    publishError,
    handlePublish,
    allPassed,
    anyFailed,
    isValidating,
  }
}
