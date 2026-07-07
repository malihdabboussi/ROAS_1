import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  createAdCampaign,
  createAdSet,
  createAvatar,
  createCampaignEmail,
  createForm,
  createFunnel,
  createOffer,
  createPresentation,
  createSequence,
  createSocialPost,
  fetchCampaignAdCampaigns,
} from '@/features/studio/services/artifact-preview.service'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import type { CreateFunnelType } from '../components/artifacts/funnels/CreateFunnelTypeModal'
import { SPACES_ACTIONS_TOAST_ERRORS } from '../config/spaces-toast-errors.config'
import { artifactConfigPatch, getArtifactConfig } from '../lib/artifact-view-config'
import { resolvePaidAdsHierarchyMode } from '../lib/paid-ads-display-mode'
import type { Space } from '../types'
import type { ArtifactViewBaseConfig, ViewDef } from '../types/space-schema'

const FUNNEL_CREATE_DEFAULT_NAME: Record<CreateFunnelType, string> = {
  'lead-magnet': 'Untitled Lead Magnet',
  'call-booking': 'Untitled Call Booking',
  webinar: 'Untitled Webinar',
  vsl: 'Untitled VSL',
  custom: 'Untitled Funnel',
}

function presentationNameFromHtmlFile(file: File) {
  const name = file.name
    .trim()
    .replace(/\.(html|htm)$/i, '')
    .trim()
  return name || 'Uploaded Presentation'
}

export function useSpaceArtifactActions(opts: {
  activeSpace: Space | null
  activeView: ViewDef | null
  isArtifactView: boolean
  handleViewPatch: (p: Partial<ViewDef>) => void | Promise<void>
}) {
  const { activeSpace, activeView, isArtifactView, handleViewPatch } = opts

  const artifactConfig = useMemo(() => getArtifactConfig(activeView), [activeView])

  const artifactGroupById = artifactConfig.group_by ?? activeView?.group_by

  const handleArtifactConfigPatch = useCallback(
    async (patch: Partial<ArtifactViewBaseConfig>) => {
      if (!activeView || !isArtifactView) return
      await Promise.resolve(handleViewPatch(artifactConfigPatch(activeView, patch)))
    },
    [activeView, isArtifactView, handleViewPatch],
  )

  const handleCreateFunnel = useCallback(
    async (funnelType: CreateFunnelType) => {
      const campaignId = activeSpace?.campaign_id
      if (!campaignId) return
      try {
        await createFunnel(campaignId, {
          name: FUNNEL_CREATE_DEFAULT_NAME[funnelType],
          funnel_type: funnelType,
          space_id: activeSpace?.id ?? null,
        })
        toast.success('Funnel created')
      } catch (err) {
        toast.error(
          sanitizeUserError(err, SPACES_ACTIONS_TOAST_ERRORS.CREATE_ARTIFACT_FAILED.userMessage),
        )
        throw err
      }
    },
    [activeSpace?.campaign_id, activeSpace?.id],
  )

  const handleCreateArtifact = useCallback(async () => {
    const campaignId = activeSpace?.campaign_id
    if (!campaignId || !activeView) return
    try {
      switch (activeView.type) {
        case 'funnels':
          return
        case 'forms':
          await createForm(campaignId, {
            name: 'Untitled Form',
            space_id: activeSpace?.id ?? null,
          })
          toast.success('Form created')
          break
        case 'websites':
          await createFunnel(campaignId, {
            name: 'Untitled Website',
            funnel_type: 'website',
            space_id: activeSpace?.id ?? null,
          })
          toast.success('Website created')
          break
        case 'offers':
          await createOffer(campaignId, undefined, activeSpace?.id ?? null)
          toast.success('Offer created')
          break
        case 'avatars':
          await createAvatar(campaignId, undefined, activeSpace?.id ?? null)
          toast.success('Avatar created')
          break
        case 'ad_campaigns':
          await createAdCampaign(campaignId, undefined, activeSpace?.id ?? null)
          toast.success('Ad campaign created')
          break
        case 'ads': {
          const mode = resolvePaidAdsHierarchyMode(activeView)
          if (mode === 'structure') {
            await createAdCampaign(campaignId, undefined, activeSpace?.id ?? null)
            toast.success('Ad campaign created')
          } else if (mode === 'ad_sets') {
            const camps = await fetchCampaignAdCampaigns(campaignId, activeSpace?.id ?? undefined)
            if (camps.length === 0) {
              toast.message('Create an ad campaign first')
              return
            }
            await createAdSet(camps[0]!.id, undefined, activeSpace?.id ?? null)
            toast.success('Ad set created')
          } else {
            toast.message('Create an ad inside an ad set for now.')
          }
          break
        }
        case 'sequences':
          await createSequence(campaignId, undefined, activeSpace?.id ?? null)
          toast.success('Sequence created')
          break
        case 'emails': {
          const spaceId = activeSpace?.id
          if (!spaceId) return
          await createCampaignEmail(campaignId, spaceId)
          toast.success('Email created')
          break
        }
        case 'presentations':
          await createPresentation(campaignId, undefined, activeSpace?.id ?? null)
          toast.success('Presentation created')
          break
        case 'social_posts':
          await createSocialPost(campaignId, 'instagram', activeSpace?.id ?? null)
          toast.success('Social post created')
          break
        default:
          break
      }
    } catch (err) {
      toast.error(
        sanitizeUserError(err, SPACES_ACTIONS_TOAST_ERRORS.CREATE_ARTIFACT_FAILED.userMessage),
      )
    }
  }, [activeSpace?.id, activeSpace?.campaign_id, activeView])

  const handleCreatePresentationFromHtml = useCallback(
    async (file: File) => {
      const campaignId = activeSpace?.campaign_id
      if (!campaignId) return
      try {
        const html = await file.text()
        await createPresentation(
          campaignId,
          presentationNameFromHtmlFile(file),
          activeSpace?.id ?? null,
          {
            files: [{ path: 'index.html', content: html, role: 'entry' }],
            entry_file: 'index.html',
          },
        )
        toast.success('Presentation imported')
      } catch (err) {
        toast.error(
          sanitizeUserError(err, SPACES_ACTIONS_TOAST_ERRORS.CREATE_ARTIFACT_FAILED.userMessage),
        )
      }
    },
    [activeSpace?.campaign_id, activeSpace?.id],
  )

  const artifactPrimaryLabel =
    activeView?.type === 'funnels'
      ? 'Funnel'
      : activeView?.type === 'forms'
        ? 'Form'
        : activeView?.type === 'websites'
          ? 'Website'
          : activeView?.type === 'offers'
            ? 'Offer'
            : activeView?.type === 'avatars'
              ? 'Avatar'
              : activeView?.type === 'ads'
                ? 'Ad'
                : activeView?.type === 'ad_campaigns'
                  ? 'Campaign'
                  : activeView?.type === 'sequences'
                    ? 'Sequence'
                    : activeView?.type === 'emails'
                      ? 'Email'
                      : activeView?.type === 'presentations'
                        ? 'Presentation'
                        : activeView?.type === 'social_posts'
                          ? 'Post'
                          : activeView?.type === 'all_artifacts'
                            ? 'Artifact'
                            : 'Artifact'

  return {
    artifactConfig,
    artifactGroupById,
    handleArtifactConfigPatch,
    handleCreateArtifact,
    handleCreatePresentationFromHtml,
    handleCreateFunnel,
    artifactPrimaryLabel,
  }
}
