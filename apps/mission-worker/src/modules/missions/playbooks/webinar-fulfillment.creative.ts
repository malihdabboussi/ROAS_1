import type { MissionPlaybookPlanResult } from './mission-playbook.types'
import {
  adContract,
  docContract,
  funnelContract,
  imageContract,
  intent,
  presentationContract,
  WEBINAR_FLOW_DOCS,
  WEBINAR_FLOW_GATES,
  WEBINAR_FLOW_TASKS,
} from './webinar-fulfillment.helpers'

type AddPlaybookSubtask = (
  task: MissionPlaybookPlanResult['subtasks'][number],
  category: string,
  statement: string,
) => void

export function addWebinarCreativeProduction(input: {
  add: AddPlaybookSubtask
  afterCopy: string
  designer: string
  adsManager: string
  human: string
  hasHuman: boolean
}): void {
  const { add, afterCopy, designer, adsManager, human, hasHuman } = input

  add(
    {
      id: 'st-ad-design',
      title: WEBINAR_FLOW_TASKS.staticAds,
      assignTo: designer,
      dependsOn: [afterCopy],
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Turn locked Validate Messaging lines into editable static creative.',
        story: 'Lux builds the non-generative text-led creative lane before ad assembly.',
        sensory:
          'Every locked identity-callout line appears as three individually reviewable 4:5 images: light, dark, and bold.',
        endState:
          'Every Validate Messaging cut exists as a numbered native image Deliverable in Space Media.',
        ecology: `Load the active Theme with list_themes/get_theme; block if required colors or fonts are absent. Load roas-ad-design. Read only the VALIDATE MESSAGING SET in "${WEBINAR_FLOW_DOCS.copyPackage}"; never substitute headlines, overlays, or proof claims. Each line must start with "If you've", "If you're", "If you are", or "If your"; block on invalid source copy. Call process_media once with operation render_validate_messaging, the verified Theme colors, and every line's exact text, highlight phrase, and optional factual stamp. The server renders light, dark, and bold PNGs and registers each PNG in Space Media. Do not call generate_visual_html, save_document, generate_image, or create_ad.`,
      }),
      outputContract: imageContract({
        requiredAction: 'process_media',
        source: WEBINAR_FLOW_DOCS.copyPackage,
        minimumCount: 3,
      }),
    },
    'creative',
    'Lux rendered the Validate Messaging statics as native image Deliverables.',
  )

  add(
    {
      id: 'st-image-brief',
      title: WEBINAR_FLOW_TASKS.imageBriefs,
      assignTo: designer,
      dependsOn: [afterCopy],
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Provide complete generation briefs for the remaining campaign visuals.',
        story: 'Lux creates paste-ready prompts without duplicating rendered static ads.',
        sensory:
          'Every brief specifies scene, style, lighting, palette, exact text, treatment, ratio, and avoid-list.',
        endState: `"${WEBINAR_FLOW_DOCS.imageBriefs}" exists as a native Doc linked to this task.`,
        ecology: `Call list_themes/get_theme and read THE PLAN plus the Copy Package. If strategy names approved logos, headshots, product, event, or platform assets but the Theme lacks them, block with the missing fields instead of substituting generic imagery. Load roas-image-brief. Every concept needs an Audience Lock (target and exclusions), Offer Lock (offer, funnel stage, delivery format/platform, factual timing), Asset Readiness, two audience cues (one explicit category cue plus one insider visual cue), and a Two-Second Test proving who it is for, what it offers, and why now. For live offers, show LIVE ON [known platform] with a factual live treatment; use official logos only from approved assets. Save exactly "${WEBINAR_FLOW_DOCS.imageBriefs}". Keep text statics in roas-ad-design; no PDF.`,
      }),
      outputContract: docContract(WEBINAR_FLOW_DOCS.imageBriefs),
    },
    'creative',
    'Image generation briefs exist in Space Docs.',
  )

  add(
    {
      id: 'st-generate-images',
      title: WEBINAR_FLOW_TASKS.generatedImages,
      assignTo: designer,
      dependsOn: ['st-image-brief'],
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Turn approved photographic and illustrative briefs into reviewable image assets.',
        story:
          'Lux runs the native image generator only for the concepts that need generated imagery.',
        sensory:
          'Each generated image appears as a timestamped Deliverable linked to this subtask and its source brief.',
        endState: 'Generated concept images exist as native image Deliverables for human review.',
        ecology: `Call list_themes/get_theme, load roas-image-brief, and read "${WEBINAR_FLOW_DOCS.imageBriefs}". Generate only concepts whose Audience Lock, Offer Lock, Asset Readiness, two audience cues, and Two-Second Test pass. Pass every approved asset reference and requested aspect ratio to generate_image; do not redraw logos or invent people. Reject a generic business metaphor when the category is not unmistakable without body copy. Preserve locked text, platform/live treatment, and brand constraints. Register each successful image immediately. Do not generate Validate Messaging text statics.`,
      }),
      outputContract: imageContract(),
    },
    'creative',
    'Lux generated the concept images from the approved image briefs.',
  )

  add(
    {
      id: 'st-funnel-design',
      title: WEBINAR_FLOW_TASKS.funnelDesign,
      assignTo: designer,
      dependsOn: [afterCopy, 'st-generate-images'],
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Build the approved registration experience in the native funnel builder.',
        story: 'Lux turns approved copy into the client funnel without rewriting it.',
        sensory:
          'The Funnels Space view contains one responsive funnel using approved copy and real campaign media.',
        endState:
          'One native funnel exists with attached logo, people/product imagery, and generated concepts linked to this task.',
        ecology: `Load funnel-site-design, then funnel-builder. Consume "${WEBINAR_FLOW_DOCS.landingPageCopy}" WITHOUT reshaping the copy. Call list_themes/get_theme and list_campaign_media. Resolve the active Theme logo, headshots, products, and generated concepts to media asset IDs; call attach_funnel_asset before authoring HTML, then reference bundle-relative asset paths. Never use placeholder boxes or labels such as "confirm from Drive". If required named media cannot be resolved, block with the exact missing assets instead of completing. Reuse the funnel already owned by this mission step on retry.`,
      }),
      outputContract: funnelContract(),
    },
    'funnel',
    'Native webinar funnel exists in the Funnels view.',
  )

  add(
    {
      id: 'st-deck-bones',
      title: WEBINAR_FLOW_TASKS.deckBones,
      assignTo: designer,
      dependsOn: [afterCopy],
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Create the most important editable slides now without pretending the full webinar deck is finished.',
        story: 'Lux builds the bones future production can expand.',
        sensory:
          'The presentation has a coherent visual system and the decisive teaching and offer slides.',
        endState:
          'A native editable presentation titled "Webinar Deck Bones" exists with 10-20 slides.',
        ecology:
          'Call list_themes and get_theme for the active campaign Theme, then use its theme_id, logo, colors, fonts, image assets, and design settings. Block if no active Theme exists. Load roas-webinar-deck. Build one native editable presentation titled "Webinar Deck Bones" with 10-20 slides only. Include title, promise, problem, big idea, mechanism, teaching framework/sections, proof, offer transition, and the complete offer stack: core product, bonuses, pricing/enrollment, guarantee if real, real scarcity, and CTA. This is bones, not a full deck. Never export PPTX or PDF. Link it to this task and the Presentations view.',
      }),
      outputContract: presentationContract('Webinar Deck Bones'),
    },
    'deck',
    'Webinar Deck Bones exists as a 10-20 slide native presentation.',
  )

  let afterCreative: string[] = ['st-ad-design', 'st-generate-images']
  if (hasHuman) {
    add(
      {
        id: 'st-gate-creative',
        title: WEBINAR_FLOW_GATES.creative,
        assignTo: human,
        dependsOn: afterCreative,
        assertionKeys: [],
        scheduledAt: null,
        intent: intent({
          why: 'Approve the visual assets before they are assembled into native ads.',
          story:
            'Review editable Validate Messaging statics and generated concept images in one checkpoint.',
          sensory:
            'Every asset is visible with its source copy or brief, and feedback names the exact asset and change.',
          endState: 'The approved creative set is ready for Blaze to assemble into Meta ads.',
          ecology:
            'Review every numbered Validate Messaging static and generated concept image Deliverable inline. Open image briefs or copy documents only when source detail is needed. Approve the assets to continue, or request revisions by numbered asset name with exact feedback. This gate does not publish or launch ads.',
        }),
      },
      'compliance',
      'Human approved the creative assets before native ad assembly.',
    )
    afterCreative = ['st-gate-creative']
  }

  add(
    {
      id: 'st-compile-ads',
      title: WEBINAR_FLOW_TASKS.compileAds,
      assignTo: adsManager,
      dependsOn: afterCreative,
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Combine approved copy and approved visual assets into native Meta ad records.',
        story: 'Blaze assembles the buying artifacts only after creative approval.',
        sensory:
          'Each native ad pairs approved primary text, headline, CTA, destination, and one approved image asset.',
        endState: 'Approved ads exist in the Space Meta Ads view and link back to this subtask.',
        ecology: `Call list_themes and get_theme for the active campaign Theme. Load ad-builder. Read "${WEBINAR_FLOW_DOCS.copyPackage}" and use only assets approved at ${WEBINAR_FLOW_GATES.creative}. Call create_ad once per approved copy-and-asset pairing with the current campaign_id, space_id, theme_id, and approved image_asset_id. Link every ad to this subtask. Do not create copy-only ad shells, redesign assets, or publish to Meta.`,
      }),
      outputContract: adContract('Approved Meta Ads — [Campaign]'),
    },
    'creative',
    'Blaze assembled approved copy and creative into native Meta ads.',
  )
}
