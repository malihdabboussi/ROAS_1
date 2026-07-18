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
          'One native visual Doc shows every locked line as editable HTML in the approved brand system.',
        endState: `"${WEBINAR_FLOW_DOCS.validateMessagingStatics}" exists as an editable native visual Doc linked to this subtask.`,
        ecology: `Load roas-ad-design. Use the approved Validate Messaging lines verbatim. Save one native Doc titled "${WEBINAR_FLOW_DOCS.validateMessagingStatics}", then call generate_visual_html on that Doc so the light, dark, and bold cuts remain editable in the Space. Do not call create_ad yet. Do not render PNGs, save PDFs, or leave loose files.`,
      }),
      outputContract: docContract(WEBINAR_FLOW_DOCS.validateMessagingStatics),
    },
    'creative',
    'Lux created editable Validate Messaging statics in a native visual Doc.',
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
        ecology: `Load roas-image-brief. Save exactly "${WEBINAR_FLOW_DOCS.imageBriefs}". Brief only the photographic or illustrative concepts that belong in the image-generation lane. Keep Validate Messaging text statics in roas-ad-design. Never create a PDF.`,
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
        ecology: `Load roas-image-brief and read "${WEBINAR_FLOW_DOCS.imageBriefs}". Call generate_image for each photographic or illustrative concept. Preserve the exact on-image text and brand constraints from the brief. Register every successful image immediately; do not wait for the whole batch before returning artifact references. Do not generate the Validate Messaging text statics.`,
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
      dependsOn: [afterCopy],
      assertionKeys: [],
      scheduledAt: null,
      publishToTaskList: true,
      intent: intent({
        why: 'Build the approved registration experience in the native funnel builder.',
        story: 'Lux turns approved copy into the client funnel without rewriting it.',
        sensory: 'The Funnels Space view contains the linked responsive funnel with approved copy.',
        endState: 'A native funnel exists in the Space Funnels view and links to this task.',
        ecology: `Load roas-funnel-design. Consume "${WEBINAR_FLOW_DOCS.landingPageCopy}" WITHOUT reshaping the copy. Build a native funnel artifact in the Funnels view and link it to this task. Do not deliver loose HTML or a PDF.`,
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
          'Load roas-webinar-deck. Build one native editable presentation titled "Webinar Deck Bones" with 10-20 slides only. Include title, promise, problem, big idea, mechanism, teaching framework/sections, proof, offer transition, and the complete offer stack: core product, bonuses, pricing/enrollment, guarantee if real, real scarcity, and CTA. This is bones, not a full deck. Never export PPTX or PDF. Link it to this task and the Presentations view.',
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
            'Review the Validate Messaging visual Doc and every generated image Deliverable. Approve the assets to continue, or request revisions by asset name with exact feedback. This gate does not publish or launch ads.',
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
        ecology: `Load ad-builder. Read "${WEBINAR_FLOW_DOCS.copyPackage}" and use only assets approved at ${WEBINAR_FLOW_GATES.creative}. Call create_ad once per approved copy-and-asset pairing with the current campaign_id and space_id. Link every ad to this subtask. Do not redesign assets and do not publish to Meta.`,
      }),
      outputContract: adContract('Approved Meta Ads — [Campaign]'),
    },
    'creative',
    'Blaze assembled approved copy and creative into native Meta ads.',
  )
}
