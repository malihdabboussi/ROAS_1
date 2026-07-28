export type IgOrganicFootageFit = 'lifestyle' | 'industry_adjacent'

export type IgOrganicIndustryPack =
  | 'trades-home-services'
  | 'health-fitness'
  | 'professional-services'
  | 'real-estate-mortgage'
  | 'coaching'
  | 'social-media-influencer'

export type IgOrganicScene = {
  id: string
  name: string
  promptSeed: string
  musicVibe: string
  fit: IgOrganicFootageFit
  industryPack?: IgOrganicIndustryPack
  presetVideoUrl?: string
  presetStillUrl?: string
}

export const IG_ORGANIC_INDUSTRY_PACKS: ReadonlyArray<{
  id: IgOrganicIndustryPack
  label: string
  description: string
}> = [
  {
    id: 'trades-home-services',
    label: 'Trades & home services',
    description:
      'Jobsite, workshop, and driveway service worlds for contractors and home-service operators.',
  },
  {
    id: 'health-fitness',
    label: 'Health & fitness',
    description: 'Local gym, studio, and outdoor training — practical, not luxury travel.',
  },
  {
    id: 'professional-services',
    label: 'Insurance & professional',
    description: 'Agency, insurance, and office-adjacent settings without luxury lifestyle cues.',
  },
  {
    id: 'real-estate-mortgage',
    label: 'Real estate & mortgage',
    description: 'Listings, open houses, and loan-officer / investor education buyer worlds.',
  },
  {
    id: 'coaching',
    label: 'Coaching',
    description:
      'Sales, men’s, and general coaching spaces — notebooks, workshops, and teaching rooms.',
  },
  {
    id: 'social-media-influencer',
    label: 'Social / influencer',
    description: 'Creator setups and content corners for influencer-style social media offers.',
  },
] as const

export const IG_ORGANIC_VIDEO_SCENES: readonly IgOrganicScene[] = [
  {
    id: 'golden-hour-infinity-pool',
    name: 'Golden-hour infinity pool',
    promptSeed: 'Pool terrace, lounge chairs, hills, warm evening light',
    musicVibe: 'Chill ambient',
    fit: 'lifestyle',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_003101_2e049fa6-6f75-43a4-a77c-e68e77022ba0.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/00dbdb3f-9491-4fb9-b644-eceec84475ee.png',
  },
  {
    id: 'hillside-pool-terrace',
    name: 'Hillside pool terrace',
    promptSeed: 'Hillside pool terrace, planters, lounge chair, warm evening light',
    musicVibe: 'Chill ambient',
    fit: 'lifestyle',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_004922_6c4276c8-dad4-457a-9cda-1d68c6a903c8.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/be041616-4600-41dd-9e04-5bfa79b623b1.png',
  },
  {
    id: 'luxury-car-step-out',
    name: 'Luxury car step-out',
    promptSeed: 'POV hand opening a G-Wagon or Rolls door in a modern driveway, no face',
    musicVibe: 'Upbeat hip-hop',
    fit: 'lifestyle',
  },
  {
    id: 'private-jet-cabin',
    name: 'Private jet cabin',
    promptSeed: 'Window seat POV, cream leather, clouds outside the window',
    musicVibe: 'Smooth luxury lounge',
    fit: 'lifestyle',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033030_6ffbb202-097b-4074-9fbc-0e5ed9d01942.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/26e5a447-8730-43c0-a323-398fb7f4361d.png',
  },
  {
    id: 'jet-boarding',
    name: 'Jet boarding',
    promptSeed: 'Tarmac steps up to a private jet at golden hour',
    musicVibe: 'Upbeat confident',
    fit: 'lifestyle',
  },
  {
    id: 'rooftop-dinner',
    name: 'Rooftop dinner at dusk',
    promptSeed: 'Set table, wine glasses, and city-light bokeh at dusk',
    musicVibe: 'Warm jazz chill',
    fit: 'lifestyle',
  },
  {
    id: 'beach-laptop',
    name: 'Laptop by the beach',
    promptSeed: 'Dark closed laptop on a wooden table, turquoise water, iced coffee',
    musicVibe: 'Tropical house chill',
    fit: 'lifestyle',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033017_9546947b-efaf-4b02-886d-6b6a90e38cd8.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/bdc76acd-40b0-4bd8-93ba-4bdcc841f664.png',
  },
  {
    id: 'penthouse-night',
    name: 'Penthouse night view',
    promptSeed: 'Floor-to-ceiling windows, city lights, moody interior',
    musicVibe: 'Dark ambient luxe',
    fit: 'lifestyle',
  },
  {
    id: 'morning-gym',
    name: 'Morning gym',
    promptSeed: 'Dumbbell rack, sunrise through windows, empty gym',
    musicVibe: 'Motivational upbeat',
    fit: 'lifestyle',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033032_784b8ea0-d619-4707-b4c8-5ac694bba321.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/7614ea8a-2044-4533-bd3d-d83fa5db1c0a.png',
  },
  {
    id: 'coffee-shop-deep-work',
    name: 'Coffee-shop deep work',
    promptSeed: 'Latte art, open notebook, warm cafe light',
    musicVibe: 'Lofi',
    fit: 'lifestyle',
  },
  {
    id: 'yacht-deck',
    name: 'Yacht deck',
    promptSeed: 'White deck, open water, wake behind the boat',
    musicVibe: 'Summer upbeat',
    fit: 'lifestyle',
  },
  {
    id: 'hotel-suite-morning',
    name: 'Hotel suite morning',
    promptSeed: 'Room-service tray, robe on the bed, city view',
    musicVibe: 'Soft piano chill',
    fit: 'lifestyle',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033019_8af0feee-6f19-41a6-991d-c386b11a8e66.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/e52d48db-73fe-4176-9187-ec707a128412.png',
  },
  {
    id: 'desert-drive',
    name: 'Desert drive',
    promptSeed: 'Windshield POV, open road at sunset',
    musicVibe: 'Cinematic chill',
    fit: 'lifestyle',
  },
  {
    id: 'golf-course',
    name: 'Golf course',
    promptSeed: 'Cart POV down a cypress-lined fairway in late afternoon',
    musicVibe: 'Easy acoustic',
    fit: 'lifestyle',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033043_aa502e8a-8ea0-44c8-989f-6ef1a8e56ec8.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/13abcba6-7a5f-41f9-9ce1-ea584a4977cd.png',
  },
  {
    id: 'modern-listing',
    name: 'Modern listing walkthrough',
    promptSeed: 'Bright, staged open-plan interior',
    musicVibe: 'Bright pop upbeat',
    fit: 'lifestyle',
  },
  {
    id: 'plane-window',
    name: '35k-feet window',
    promptSeed: 'Plane window and wing over clouds at sunset',
    musicVibe: 'Dreamy ambient',
    fit: 'lifestyle',
  },
  {
    id: 'luxury-hotel-valet',
    name: 'Valet at luxury hotel',
    promptSeed: 'Grand hotel porte-cochere at dusk, luxury car, warm lobby glow',
    musicVibe: 'Smooth luxury lounge',
    fit: 'lifestyle',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033045_a88b8be2-dc12-42a2-bca5-f74a960b3a3b.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/6cd21baf-a9fe-4c30-ba79-3ece3da0098c.png',
  },

  // Industry-adjacent: trades & home services (merged)
  {
    id: 'work-truck-dawn',
    name: 'Work truck at dawn',
    promptSeed:
      'Pickup truck bed with closed tool bags on gravel at a jobsite, orange dawn light, no people, no readable logos',
    musicVibe: 'Steady industrial chill',
    fit: 'industry_adjacent',
    industryPack: 'trades-home-services',
  },
  {
    id: 'workshop-bench',
    name: 'Workshop bench',
    promptSeed:
      'Worn wooden workbench, open metal tool chest, coiled extension cord, soft shop fluorescent glow, no people, no readable labels',
    musicVibe: 'Grounded acoustic',
    fit: 'industry_adjacent',
    industryPack: 'trades-home-services',
  },
  {
    id: 'service-van-driveway',
    name: 'Service van in driveway',
    promptSeed:
      'Clean white work van parked in a suburban driveway at morning, house exterior soft focus, no people, no readable company logos',
    musicVibe: 'Bright practical upbeat',
    fit: 'industry_adjacent',
    industryPack: 'trades-home-services',
  },

  // Industry-adjacent: health & fitness
  {
    id: 'studio-floor-morning',
    name: 'Fitness studio floor',
    promptSeed:
      'Empty group-fitness studio, mirrored wall, rolled mats stacked neatly, soft morning window light, no people, no logos',
    musicVibe: 'Motivational upbeat',
    fit: 'industry_adjacent',
    industryPack: 'health-fitness',
  },
  {
    id: 'outdoor-track-lane',
    name: 'Outdoor track lane',
    promptSeed:
      'Empty running-track lane lines, soft-focus bleachers, cool morning outdoor light, candid handheld framing, no people',
    musicVibe: 'Energetic ambient',
    fit: 'industry_adjacent',
    industryPack: 'health-fitness',
  },
  {
    id: 'recovery-zone-floor',
    name: 'Recovery zone floor',
    promptSeed:
      'Foam rollers and kettlebells on black rubber gym flooring beside a window, practical training space, no people, no readable branding',
    musicVibe: 'Focused lofi',
    fit: 'industry_adjacent',
    industryPack: 'health-fitness',
  },

  // Industry-adjacent: insurance & professional services
  {
    id: 'agency-desk-morning',
    name: 'Agency desk morning',
    promptSeed:
      'Clean office desk with a closed dark laptop, coffee mug, and neat paper stack, soft daylight through blinds, no readable screens or documents, no people',
    musicVibe: 'Calm professional ambient',
    fit: 'industry_adjacent',
    industryPack: 'professional-services',
  },
  {
    id: 'client-waiting-chairs',
    name: 'Client waiting chairs',
    promptSeed:
      'Two waiting-area chairs and a small side table with a plant beside frosted glass, quiet professional lobby light, no people, no readable signs',
    musicVibe: 'Soft piano chill',
    fit: 'industry_adjacent',
    industryPack: 'professional-services',
  },
  {
    id: 'suburban-office-arrival',
    name: 'Suburban office arrival',
    promptSeed:
      'POV walking across a modest suburban office parking lot toward a plain single-story office exterior, daytime, no people, no readable building signs',
    musicVibe: 'Steady confident',
    fit: 'industry_adjacent',
    industryPack: 'professional-services',
  },

  // Industry-adjacent: real estate & mortgage
  {
    id: 'staged-living-room',
    name: 'Staged living room',
    promptSeed:
      'Bright staged living room with sofa, coffee table, and large windows, empty open-house ready interior, soft daylight, no people, no readable signs',
    musicVibe: 'Bright pop upbeat',
    fit: 'industry_adjacent',
    industryPack: 'real-estate-mortgage',
  },
  {
    id: 'listing-front-porch',
    name: 'Listing front porch',
    promptSeed:
      'Suburban home front porch and landscaped walkway at morning curb-appeal light, candid handheld framing, no people, no readable address numbers or signs',
    musicVibe: 'Easy acoustic',
    fit: 'industry_adjacent',
    industryPack: 'real-estate-mortgage',
  },
  {
    id: 'loan-desk-morning',
    name: 'Loan desk morning',
    promptSeed:
      'Clean mortgage or loan-officer desk with closed laptop, coffee, and neat unmarked folder stack, soft office daylight, no readable screens or documents, no people',
    musicVibe: 'Calm professional ambient',
    fit: 'industry_adjacent',
    industryPack: 'real-estate-mortgage',
  },

  // Industry-adjacent: coaching (sales, men’s, general)
  {
    id: 'coach-notebook-desk',
    name: 'Coach notebook desk',
    promptSeed:
      'Open notebook and pen beside a coffee mug on a clean coaching desk, soft morning window light, no readable handwriting, no people',
    musicVibe: 'Focused lofi',
    fit: 'industry_adjacent',
    industryPack: 'coaching',
  },
  {
    id: 'workshop-chair-circle',
    name: 'Workshop chair circle',
    promptSeed:
      'Empty circle of simple chairs in a bright workshop room ready for a coaching session, soft daylight, no people, no readable posters',
    musicVibe: 'Steady confident',
    fit: 'industry_adjacent',
    industryPack: 'coaching',
  },
  {
    id: 'blank-teaching-board',
    name: 'Blank teaching board',
    promptSeed:
      'Blank whiteboard or flip chart on a stand in a bright teaching room, empty chairs soft focus, no readable writing, no people',
    musicVibe: 'Motivational upbeat',
    fit: 'industry_adjacent',
    industryPack: 'coaching',
  },

  // Industry-adjacent: social / influencer
  {
    id: 'creator-ring-light-desk',
    name: 'Creator ring-light desk',
    promptSeed:
      'Content desk with soft ring-light glow and phone on a small tripod, closed laptop, candid creator setup, no readable screens, no people',
    musicVibe: 'Clean upbeat',
    fit: 'industry_adjacent',
    industryPack: 'social-media-influencer',
  },
  {
    id: 'creator-backdrop-shelf',
    name: 'Creator backdrop shelf',
    promptSeed:
      'Aesthetic shelf backdrop with plants and neutral decor ready for filming, soft indoor light, influencer content corner, no people, no readable book spines',
    musicVibe: 'Soft pop chill',
    fit: 'industry_adjacent',
    industryPack: 'social-media-influencer',
  },
  {
    id: 'cafe-content-corner',
    name: 'Cafe content corner',
    promptSeed:
      'Closed laptop and iced drink on a cafe table by a window, handheld content-creator corner, warm cafe light, no people, no readable logos',
    musicVibe: 'Lofi',
    fit: 'industry_adjacent',
    industryPack: 'social-media-influencer',
  },
] as const

export const IG_ORGANIC_APPROVED_EMOJIS = ['👇', '⏰', '✅', '🚨', '🙌'] as const

export function filterIgOrganicScenes(options?: {
  fit?: IgOrganicFootageFit | 'all'
  industryPack?: IgOrganicIndustryPack | 'all'
}): IgOrganicScene[] {
  const fit = options?.fit ?? 'all'
  const industryPack = options?.industryPack ?? 'all'
  return IG_ORGANIC_VIDEO_SCENES.filter((scene) => {
    if (fit !== 'all' && scene.fit !== fit) return false
    if (industryPack !== 'all' && scene.industryPack !== industryPack) return false
    return true
  })
}
