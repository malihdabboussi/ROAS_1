import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { CampaignsModule } from '../../campaigns.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_ARTIFACT_ROUTES = [
  'POST campaigns/:campaignId/offers -> createOffer',
  'POST campaigns/:campaignId/sequences -> createSequence',
  'POST campaigns/:campaignId/presentations -> createPresentation',
  'POST campaigns/:campaignId/avatars -> createAvatar',
  'GET campaigns/:campaignId/assets/summary -> getAssetSummary',
  'PATCH artifacts/:table/:id/move -> moveArtifact',
  'POST artifacts/:table/:id/copy -> copyArtifact',
  'POST artifacts/resolve-campaigns -> resolveArtifactCampaigns',
  'GET campaigns/:campaignId/offers -> listOffers',
  'GET campaigns/:campaignId/sequences -> listSequences',
  'GET campaigns/:campaignId/presentations -> listPresentations',
  'GET campaigns/:campaignId/avatars -> listAvatars',
  'GET campaigns/:campaignId/ads -> listAds',
  'GET campaigns/:campaignId/ad-campaigns -> listAdCampaigns',
  'POST campaigns/:campaignId/ad-campaigns -> createAdCampaign',
  'GET ad-campaigns/:id -> getAdCampaign',
  'GET ad-campaigns/:id/ads -> listAdCampaignAds',
  'GET ad-sets/:id/ads -> listAdSetAds',
  'PATCH ad-campaigns/:id -> updateAdCampaign',
  'POST ad-campaigns/:id/refresh-meta-status -> refreshAdCampaignMetaStatus',
  'POST ad-campaigns/:id/set-meta-status -> setAdCampaignMetaStatus',
  'POST ad-campaigns/:id/duplicate -> duplicateAdCampaign',
  'DELETE ad-campaigns/:id -> deleteAdCampaign',
  'DELETE campaigns/:campaignId/ungrouped-ads -> deleteUngroupedAds',
  'POST ad-campaigns/:id/ad-sets -> createAdSet',
  'GET ad-sets/:id -> getAdSet',
  'PATCH ad-sets/:id -> updateAdSet',
  'GET ad-sets/:id/delivery-estimate -> getAdSetDeliveryEstimate',
  'POST ad-sets/:id/refresh-meta-status -> refreshAdSetMetaStatus',
  'POST ad-sets/:id/set-meta-status -> setAdSetMetaStatus',
  'POST ad-sets/:adSetId/ads/bulk -> createAdsBulk',
  'POST ad-sets/:adSetId/ads/generate-variations -> generateAdVariations',
  'POST ad-sets/:adSetId/ads/regenerate-variation -> regenerateVariation',
  'POST ad-sets/:adSetId/ads/generate-copy -> generateAdCopy',
  'POST ad-sets/:id/duplicate -> duplicateAdSet',
  'DELETE ad-sets/:id -> deleteAdSet',
  'GET campaigns/:campaignId/documents -> listCampaignDocuments',
  'GET conversations/:conversationId/documents -> listConversationDocuments',
  'GET agents/:agentKey/documents -> listAgentDocuments',
  'GET offers/:id -> getOffer',
  'GET offers/:id/avatar -> getOfferAvatar',
  'GET sequences/:id -> getSequence',
  'PATCH sequences/:id/emails/:emailId/move -> moveSequenceEmail',
  'PATCH sequences/:id/emails/reorder -> reorderSequenceEmails',
  'POST sequences/:id/emails -> createSequenceEmail',
  'PATCH sequences/:id/emails/:emailId -> updateSequenceEmail',
  'GET presentations/:id -> getPresentation',
  'GET presentations/:id/files -> listOrGetPresentationFiles',
  'PUT presentations/:id/files -> upsertPresentationFile',
  'DELETE presentations/:id/files -> deletePresentationFile',
  'GET presentations/:id/assets -> listPresentationAssets',
  'POST presentations/:id/assets -> attachPresentationAsset',
  'DELETE presentations/:id/assets -> detachPresentationAsset',
  'GET presentations/:id/bundle -> getPresentationBundle',
  'GET presentations/:id/comments -> listPresentationComments',
  'PUT presentations/:id/comments/:commentId -> upsertPresentationComment',
  'PATCH presentations/:id/comments/:commentId -> updatePresentationComment',
  'DELETE presentations/:id/comments/:commentId -> deletePresentationComment',
  'GET avatars/:id -> getAvatar',
  'GET ads/:id -> getAd',
  'PATCH ads/:id -> updateAd',
  'POST ads/:id/refresh-meta-status -> refreshAdMetaStatus',
  'POST ads/:id/set-meta-status -> setAdMetaStatus',
  'POST ads/:id/duplicate -> duplicateAd',
  'POST ads/:id/clone -> cloneAdToAdSet',
  'DELETE ads/:id -> deleteAd',
  'GET documents/:id -> getDocument',
  'PATCH documents/:id -> updateDocument',
  'DELETE documents/:id -> deleteDocument',
  'GET funnels/:funnelId/blog-posts -> listBlogPosts',
  'GET funnels/:funnelId/blog-posts/:id -> getBlogPost',
  'GET blog-posts/:id -> getBlogPostById',
  'POST funnels/:funnelId/blog-posts -> createBlogPost',
  'PATCH blog-posts/:id -> updateBlogPost',
  'DELETE blog-posts/:id -> deleteBlogPost',
  'PATCH offers/:id -> updateOffer',
  'DELETE offers/:id -> deleteOffer',
  'PATCH sequences/:id -> updateSequence',
  'DELETE sequences/:id -> deleteSequence',
  'POST sequences/:id/sync-unsent -> syncSequenceUnsent',
  'POST presentations/:id/publish -> publishPresentation',
  'POST presentations/:id/unpublish -> unpublishPresentation',
  'PATCH presentations/:id -> updatePresentation',
  'DELETE presentations/:id -> deletePresentation',
  'PATCH avatars/:id -> updateAvatar',
  'DELETE avatars/:id -> deleteAvatar',
  'GET campaigns/:campaignId/social-posts -> listSocialPosts',
  'GET campaigns/:campaignId/schedule -> listCampaignSchedule',
  'POST campaigns/:campaignId/social-posts -> createSocialPost',
  'GET social-posts/:id -> getSocialPost',
  'PATCH social-posts/:id -> updateSocialPost',
  'POST social-posts/:id/schedule -> scheduleSocialPost',
  'POST social-posts/:id/unschedule -> unscheduleSocialPost',
  'DELETE social-posts/:id -> deleteSocialPost',
]

function collectRoutes(controllers: ControllerType[]): string[] {
  const expectedPaths = new Set(
    EXPECTED_ARTIFACT_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
  )
  return controllers.flatMap((controller) =>
    Object.getOwnPropertyNames(controller.prototype)
      .filter((methodName) => methodName !== 'constructor')
      .map((methodName) => {
        const handler = controller.prototype[methodName]
        const path = Reflect.getMetadata(PATH_METADATA, handler)
        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler)
        if (path === undefined || requestMethod === undefined) return null
        const route = `${METHOD_NAMES[requestMethod]} ${path}`
        if (!expectedPaths.has(route)) return null
        return `${route} -> ${methodName}`
      })
      .filter((route): route is string => route !== null),
  )
}

describe('Campaign artifacts controller route order', () => {
  it('keeps the existing artifact route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', CampaignsModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_ARTIFACT_ROUTES)
  })
})
