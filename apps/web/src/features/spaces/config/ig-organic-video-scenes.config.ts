export type IgOrganicScene = {
  id: string
  name: string
  promptSeed: string
  musicVibe: string
  presetVideoUrl?: string
  presetStillUrl?: string
}

export const IG_ORGANIC_VIDEO_SCENES: readonly IgOrganicScene[] = [
  {
    id: 'golden-hour-infinity-pool',
    name: 'Golden-hour infinity pool',
    promptSeed: 'Pool terrace, lounge chairs, hills, warm evening light',
    musicVibe: 'Chill ambient',
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
  },
  {
    id: 'private-jet-cabin',
    name: 'Private jet cabin',
    promptSeed: 'Window seat POV, cream leather, clouds outside the window',
    musicVibe: 'Smooth luxury lounge',
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
  },
  {
    id: 'rooftop-dinner',
    name: 'Rooftop dinner at dusk',
    promptSeed: 'Set table, wine glasses, and city-light bokeh at dusk',
    musicVibe: 'Warm jazz chill',
  },
  {
    id: 'beach-laptop',
    name: 'Laptop by the beach',
    promptSeed: 'Dark closed laptop on a wooden table, turquoise water, iced coffee',
    musicVibe: 'Tropical house chill',
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
  },
  {
    id: 'morning-gym',
    name: 'Morning gym',
    promptSeed: 'Dumbbell rack, sunrise through windows, empty gym',
    musicVibe: 'Motivational upbeat',
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
  },
  {
    id: 'yacht-deck',
    name: 'Yacht deck',
    promptSeed: 'White deck, open water, wake behind the boat',
    musicVibe: 'Summer upbeat',
  },
  {
    id: 'hotel-suite-morning',
    name: 'Hotel suite morning',
    promptSeed: 'Room-service tray, robe on the bed, city view',
    musicVibe: 'Soft piano chill',
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
  },
  {
    id: 'golf-course',
    name: 'Golf course',
    promptSeed: 'Cart POV down a cypress-lined fairway in late afternoon',
    musicVibe: 'Easy acoustic',
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
  },
  {
    id: 'plane-window',
    name: '35k-feet window',
    promptSeed: 'Plane window and wing over clouds at sunset',
    musicVibe: 'Dreamy ambient',
  },
  {
    id: 'luxury-hotel-valet',
    name: 'Valet at luxury hotel',
    promptSeed: 'Grand hotel porte-cochere at dusk, luxury car, warm lobby glow',
    musicVibe: 'Smooth luxury lounge',
    presetVideoUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033045_a88b8be2-dc12-42a2-bca5-f74a960b3a3b.mp4',
    presetStillUrl:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/6cd21baf-a9fe-4c30-ba79-3ece3da0098c.png',
  },
] as const

export const IG_ORGANIC_APPROVED_EMOJIS = ['👇', '⏰', '✅', '🚨', '🙌'] as const
