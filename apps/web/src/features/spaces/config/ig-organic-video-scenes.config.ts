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

  // Industry-adjacent: trades & home services
  {
    id: 'trades-truck-dawn',
    name: 'Work truck at dawn',
    promptSeed:
      'Pickup truck bed with closed tool bags on gravel at a jobsite, orange dawn light, no people, no readable logos',
    musicVibe: 'Steady industrial chill',
    fit: 'industry_adjacent',
    industryPack: 'trades-home-services',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055144_76b255bc-29c7-41ca-b513-48791812c085.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/c0567be1-effb-4dda-96e7-55092e4b00bf.png',
  },
  {
    id: 'trades-workshop-bench',
    name: 'Workshop bench',
    promptSeed:
      'Worn wooden workbench, open metal tool chest, coiled extension cord, soft shop fluorescent glow, no people, no readable labels',
    musicVibe: 'Grounded acoustic',
    fit: 'industry_adjacent',
    industryPack: 'trades-home-services',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055146_d76083fb-b011-49bf-8e2f-afc61992dbdc.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_053621_3d84aec6-a2f1-4694-b0ba-89b0baa6360f.png',
  },
  {
    id: 'trades-van-driveway',
    name: 'Service van in driveway',
    promptSeed:
      'Clean white work van parked in a suburban driveway at morning, house exterior soft focus, no people, no readable company logos',
    musicVibe: 'Bright practical upbeat',
    fit: 'industry_adjacent',
    industryPack: 'trades-home-services',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055536_ad509afd-7145-4bd4-98eb-0ac38b985fa4.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/4817be31-dced-43fc-a2c9-42ccc59098b4.png',
  },

  // Industry-adjacent: health & fitness
  {
    id: 'fit-morning-gym',
    name: 'Morning gym',
    promptSeed: 'Dumbbell rack, sunrise through windows, empty gym',
    musicVibe: 'Motivational upbeat',
    fit: 'industry_adjacent',
    industryPack: 'health-fitness',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033032_784b8ea0-d619-4707-b4c8-5ac694bba321.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/7614ea8a-2044-4533-bd3d-d83fa5db1c0a.png',
  },
  {
    id: 'fit-exercise-studio',
    name: 'Exercise studio',
    promptSeed:
      'Empty group-fitness studio, mirrored wall, rolled mats stacked neatly, soft morning window light, no people, no logos',
    musicVibe: 'Motivational upbeat',
    fit: 'industry_adjacent',
    industryPack: 'health-fitness',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055522_8793c9e6-d16b-42cd-adc5-038dbb617867.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_053927_c0c057f8-6d48-4077-be9b-f37e54cb6032.png',
  },
  {
    id: 'fit-recovery-corner',
    name: 'Recovery corner',
    promptSeed:
      'Foam rollers and kettlebells on black rubber gym flooring beside a window, practical training space, no people, no readable branding',
    musicVibe: 'Focused lofi',
    fit: 'industry_adjacent',
    industryPack: 'health-fitness',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055524_2459afb5-2bcf-4be5-bb63-725905770f74.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054733_65b94b90-6cd9-4706-adc9-0f3e42e948c5.png',
  },

  // Industry-adjacent: insurance & professional services
  {
    id: 'wc-open-office-golden',
    name: 'Open office golden hour',
    promptSeed:
      'Open-plan office desks and chairs in warm golden-hour window light, empty white-collar workspace, no people, no readable screens or signs',
    musicVibe: 'Calm professional ambient',
    fit: 'industry_adjacent',
    industryPack: 'professional-services',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_050454_6a8044f0-219e-4f6d-9101-fa2581ad0714.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/2e27c1f6-60bb-4538-a649-5b4fbab65763.png',
  },
  {
    id: 'wc-conference-morning',
    name: 'Conference room morning',
    promptSeed:
      'Empty conference table and chairs in a bright morning meeting room, soft daylight, no people, no readable whiteboards or screens',
    musicVibe: 'Soft piano chill',
    fit: 'industry_adjacent',
    industryPack: 'professional-services',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_050456_56d0debd-2871-448b-8f1e-8ecec2f9b4c6.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/1f5e3856-339d-40ae-90ef-c988d8c69bea.png',
  },
  {
    id: 'wc-exec-office-sunlit',
    name: 'Sunlit executive office',
    promptSeed:
      'Sunlit executive office desk with closed laptop and chair, soft window light, quiet professional interior, no people, no readable documents',
    musicVibe: 'Steady confident',
    fit: 'industry_adjacent',
    industryPack: 'professional-services',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_050459_0e88acaa-ece3-4913-a223-bf1d0a1057d2.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/d2d9f8de-421a-42e3-b463-df27bdbd83b4.png',
  },

  // Industry-adjacent: real estate & mortgage
  {
    id: 're-staged-living-room',
    name: 'Staged living room',
    promptSeed:
      'Bright staged living room with sofa, coffee table, and large windows, empty open-house ready interior, soft daylight, no people, no readable signs',
    musicVibe: 'Bright pop upbeat',
    fit: 'industry_adjacent',
    industryPack: 'real-estate-mortgage',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055124_91fb012a-1de3-4af9-9324-872c3c606345.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054227_558afed4-718d-4b6c-86d6-1ce9fd76c907.png',
  },
  {
    id: 're-curb-appeal-exterior',
    name: 'Curb appeal exterior',
    promptSeed:
      'Suburban home front porch and landscaped walkway at morning curb-appeal light, candid handheld framing, no people, no readable address numbers or signs',
    musicVibe: 'Easy acoustic',
    fit: 'industry_adjacent',
    industryPack: 'real-estate-mortgage',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055126_c0ec3d44-3a0f-46b3-aaaa-3691f27a55fa.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054229_e3d36a79-00ca-400e-b84a-c5a6d4a491b2.png',
  },
  {
    id: 're-modern-kitchen',
    name: 'Modern kitchen listing',
    promptSeed:
      'Bright modern staged kitchen with island and stainless appliances, open-house ready interior, soft daylight, no people, no readable magnets or papers',
    musicVibe: 'Bright pop upbeat',
    fit: 'industry_adjacent',
    industryPack: 'real-estate-mortgage',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055129_dd235ab9-1e38-4b9c-b1dc-6e0b557fc163.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054231_1cbf3073-b4f3-4e4e-bc09-3ca99cb668f9.png',
  },

  // Industry-adjacent: coaching
  {
    id: 'coach-session-room',
    name: 'Coaching session room',
    promptSeed:
      'Empty circle of simple chairs in a bright workshop room ready for a coaching session, soft daylight, no people, no readable posters',
    musicVibe: 'Steady confident',
    fit: 'industry_adjacent',
    industryPack: 'coaching',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055130_9a0ed65e-aa56-4dfc-b0bc-c71766a047e8.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_053609_8745ecec-1cf6-48ce-891f-45ed0f7cf581.png',
  },
  {
    id: 'coach-study-corner',
    name: 'Coach study corner',
    promptSeed:
      'Open notebook and pen beside a coffee mug on a clean coaching desk, soft morning window light, no readable handwriting, no people',
    musicVibe: 'Focused lofi',
    fit: 'industry_adjacent',
    industryPack: 'coaching',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055132_34dcc7b8-b804-4c43-87c0-0318b54d7c4f.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054233_a50296c1-1178-47d1-b025-b3f685a6fbf0.png',
  },
  {
    id: 'coach-cozy-corner',
    name: 'Cozy coaching corner',
    promptSeed:
      'Cozy coaching corner with armchair, side table, and soft lamp light ready for a one-on-one session, no people, no readable books or posters',
    musicVibe: 'Soft piano chill',
    fit: 'industry_adjacent',
    industryPack: 'coaching',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055134_e111af2c-6d4a-4bbc-b29e-1953ebef6d2e.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054342_2302ec37-1038-4fe4-bb90-c6cef3010969.png',
  },

  // Industry-adjacent: social / influencer
  {
    id: 'creator-ring-light',
    name: 'Creator ring-light desk',
    promptSeed:
      'Content desk with soft ring-light glow and small camera on a tripod, closed laptop, candid creator setup, no readable screens, no people',
    musicVibe: 'Clean upbeat',
    fit: 'industry_adjacent',
    industryPack: 'social-media-influencer',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055526_08378466-eae3-4685-b4f7-00ee2341713a.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_053740_0e0420cd-1f97-4988-9af5-6a92c04d4f8a.png',
  },
  {
    id: 'creator-shelf-corner',
    name: 'Creator shelf corner',
    promptSeed:
      'Aesthetic shelf backdrop with plants and neutral decor ready for filming, soft indoor light, influencer content corner, no people, no readable book spines',
    musicVibe: 'Soft pop chill',
    fit: 'industry_adjacent',
    industryPack: 'social-media-influencer',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055528_cccfa5ee-74c0-452a-90ad-d186dbb67f87.mp4',
    presetStillUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054735_c2ccb4c1-b374-49e5-ba81-aae729e183d0.png',
  },
  {
    id: 'creator-cafe-window',
    name: 'Creator cafe window',
    promptSeed:
      'Closed laptop and iced drink on a cafe table by a window, handheld content-creator corner, warm cafe light, no people, no readable logos',
    musicVibe: 'Lofi',
    fit: 'industry_adjacent',
    industryPack: 'social-media-influencer',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055530_d6392615-c33b-425a-a6ee-6bc4c57a9ae9.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/387b29de-a564-48bb-bc48-8d5642285cf4.png',
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
