BEGIN;

UPDATE public.skill_library_resources
SET
  content = $references$# IG Organic Scene Library

Use the preset video when available and `source_strategy` is `reuse_when_available`. The matching still is a start frame for a new motion variant.

## Footage fit

- `lifestyle`: aspirational / emotional backdrops (pools, travel, luxury leisure).
- `industry_adjacent`: buyer-world settings for ROAS educator clients (trades/home, fitness, insurance/professional, real estate/mortgage, coaching, social/influencer).

When the client's offer matches an industry pack, prefer `industry_adjacent` unless the user explicitly asks for lifestyle. If `footage_fit` or `industry_pack` is present in kickoff, filter to that subset before choosing scenes.

### Industry packs

- **trades-home-services** (Trades & home services): Jobsite, workshop, and driveway service worlds for contractors and home-service operators.
- **health-fitness** (Health & fitness): Local gym, studio, and outdoor training — practical, not luxury travel.
- **professional-services** (Insurance & professional): Agency, insurance, and office-adjacent settings without luxury lifestyle cues.
- **real-estate-mortgage** (Real estate & mortgage): Listings, open houses, and loan-officer / investor education buyer worlds.
- **coaching** (Coaching): Sales, men’s, and general coaching spaces — notebooks, workshops, and teaching rooms.
- **social-media-influencer** (Social / influencer): Creator setups and content corners for influencer-style social media offers.

All industry-adjacent scenes below currently have clean preset videos and matching stills.

| ID | Scene | Prompt seed | Music vibe | Fit | Industry pack | Preset video | Matching still |
|---|---|---|---|---|---|---|---|
| golden-hour-infinity-pool | Golden-hour infinity pool | Pool terrace, lounge chairs, hills, warm evening light | Chill ambient | lifestyle |  | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_003101_2e049fa6-6f75-43a4-a77c-e68e77022ba0.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/00dbdb3f-9491-4fb9-b644-eceec84475ee.png |
| hillside-pool-terrace | Hillside pool terrace | Hillside pool terrace, planters, lounge chair, warm evening light | Chill ambient | lifestyle |  | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_004922_6c4276c8-dad4-457a-9cda-1d68c6a903c8.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/be041616-4600-41dd-9e04-5bfa79b623b1.png |
| luxury-car-step-out | Luxury car step-out | POV hand opening a G-Wagon or Rolls door in a modern driveway, no face | Upbeat hip-hop | lifestyle |  |  |  |
| private-jet-cabin | Private jet cabin | Window seat POV, cream leather, clouds outside the window | Smooth luxury lounge | lifestyle |  | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033030_6ffbb202-097b-4074-9fbc-0e5ed9d01942.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/26e5a447-8730-43c0-a323-398fb7f4361d.png |
| jet-boarding | Jet boarding | Tarmac steps up to a private jet at golden hour | Upbeat confident | lifestyle |  |  |  |
| rooftop-dinner | Rooftop dinner at dusk | Set table, wine glasses, and city-light bokeh at dusk | Warm jazz chill | lifestyle |  |  |  |
| beach-laptop | Laptop by the beach | Dark closed laptop on a wooden table, turquoise water, iced coffee | Tropical house chill | lifestyle |  | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033017_9546947b-efaf-4b02-886d-6b6a90e38cd8.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/bdc76acd-40b0-4bd8-93ba-4bdcc841f664.png |
| penthouse-night | Penthouse night view | Floor-to-ceiling windows, city lights, moody interior | Dark ambient luxe | lifestyle |  |  |  |
| morning-gym | Morning gym | Dumbbell rack, sunrise through windows, empty gym | Motivational upbeat | lifestyle |  | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033032_784b8ea0-d619-4707-b4c8-5ac694bba321.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/7614ea8a-2044-4533-bd3d-d83fa5db1c0a.png |
| coffee-shop-deep-work | Coffee-shop deep work | Latte art, open notebook, warm cafe light | Lofi | lifestyle |  |  |  |
| yacht-deck | Yacht deck | White deck, open water, wake behind the boat | Summer upbeat | lifestyle |  |  |  |
| hotel-suite-morning | Hotel suite morning | Room-service tray, robe on the bed, city view | Soft piano chill | lifestyle |  | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033019_8af0feee-6f19-41a6-991d-c386b11a8e66.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/e52d48db-73fe-4176-9187-ec707a128412.png |
| desert-drive | Desert drive | Windshield POV, open road at sunset | Cinematic chill | lifestyle |  |  |  |
| golf-course | Golf course | Cart POV down a cypress-lined fairway in late afternoon | Easy acoustic | lifestyle |  | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033043_aa502e8a-8ea0-44c8-989f-6ef1a8e56ec8.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/13abcba6-7a5f-41f9-9ce1-ea584a4977cd.png |
| modern-listing | Modern listing walkthrough | Bright, staged open-plan interior | Bright pop upbeat | lifestyle |  |  |  |
| plane-window | 35k-feet window | Plane window and wing over clouds at sunset | Dreamy ambient | lifestyle |  |  |  |
| luxury-hotel-valet | Valet at luxury hotel | Grand hotel porte-cochere at dusk, luxury car, warm lobby glow | Smooth luxury lounge | lifestyle |  | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033045_a88b8be2-dc12-42a2-bca5-f74a960b3a3b.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/6cd21baf-a9fe-4c30-ba79-3ece3da0098c.png |
| trades-truck-dawn | Work truck at dawn | Pickup truck bed with closed tool bags on gravel at a jobsite, orange dawn light, no people, no readable logos | Steady industrial chill | industry_adjacent | trades-home-services | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055144_76b255bc-29c7-41ca-b513-48791812c085.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/c0567be1-effb-4dda-96e7-55092e4b00bf.png |
| trades-workshop-bench | Workshop bench | Worn wooden workbench, open metal tool chest, coiled extension cord, soft shop fluorescent glow, no people, no readable labels | Grounded acoustic | industry_adjacent | trades-home-services | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055146_d76083fb-b011-49bf-8e2f-afc61992dbdc.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_053621_3d84aec6-a2f1-4694-b0ba-89b0baa6360f.png |
| trades-van-driveway | Service van in driveway | Clean white work van parked in a suburban driveway at morning, house exterior soft focus, no people, no readable company logos | Bright practical upbeat | industry_adjacent | trades-home-services | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055536_ad509afd-7145-4bd4-98eb-0ac38b985fa4.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/4817be31-dced-43fc-a2c9-42ccc59098b4.png |
| fit-morning-gym | Morning gym | Dumbbell rack, sunrise through windows, empty gym | Motivational upbeat | industry_adjacent | health-fitness | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260724_033032_784b8ea0-d619-4707-b4c8-5ac694bba321.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/7614ea8a-2044-4533-bd3d-d83fa5db1c0a.png |
| fit-exercise-studio | Exercise studio | Empty group-fitness studio, mirrored wall, rolled mats stacked neatly, soft morning window light, no people, no logos | Motivational upbeat | industry_adjacent | health-fitness | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055522_8793c9e6-d16b-42cd-adc5-038dbb617867.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_053927_c0c057f8-6d48-4077-be9b-f37e54cb6032.png |
| fit-recovery-corner | Recovery corner | Foam rollers and kettlebells on black rubber gym flooring beside a window, practical training space, no people, no readable branding | Focused lofi | industry_adjacent | health-fitness | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055524_2459afb5-2bcf-4be5-bb63-725905770f74.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054733_65b94b90-6cd9-4706-adc9-0f3e42e948c5.png |
| wc-open-office-golden | Open office golden hour | Open-plan office desks and chairs in warm golden-hour window light, empty white-collar workspace, no people, no readable screens or signs | Calm professional ambient | industry_adjacent | professional-services | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_050454_6a8044f0-219e-4f6d-9101-fa2581ad0714.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/2e27c1f6-60bb-4538-a649-5b4fbab65763.png |
| wc-conference-morning | Conference room morning | Empty conference table and chairs in a bright morning meeting room, soft daylight, no people, no readable whiteboards or screens | Soft piano chill | industry_adjacent | professional-services | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_050456_56d0debd-2871-448b-8f1e-8ecec2f9b4c6.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/1f5e3856-339d-40ae-90ef-c988d8c69bea.png |
| wc-exec-office-sunlit | Sunlit executive office | Sunlit executive office desk with closed laptop and chair, soft window light, quiet professional interior, no people, no readable documents | Steady confident | industry_adjacent | professional-services | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_050459_0e88acaa-ece3-4913-a223-bf1d0a1057d2.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/d2d9f8de-421a-42e3-b463-df27bdbd83b4.png |
| re-staged-living-room | Staged living room | Bright staged living room with sofa, coffee table, and large windows, empty open-house ready interior, soft daylight, no people, no readable signs | Bright pop upbeat | industry_adjacent | real-estate-mortgage | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055124_91fb012a-1de3-4af9-9324-872c3c606345.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054227_558afed4-718d-4b6c-86d6-1ce9fd76c907.png |
| re-curb-appeal-exterior | Curb appeal exterior | Suburban home front porch and landscaped walkway at morning curb-appeal light, candid handheld framing, no people, no readable address numbers or signs | Easy acoustic | industry_adjacent | real-estate-mortgage | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055126_c0ec3d44-3a0f-46b3-aaaa-3691f27a55fa.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054229_e3d36a79-00ca-400e-b84a-c5a6d4a491b2.png |
| re-modern-kitchen | Modern kitchen listing | Bright modern staged kitchen with island and stainless appliances, open-house ready interior, soft daylight, no people, no readable magnets or papers | Bright pop upbeat | industry_adjacent | real-estate-mortgage | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055129_dd235ab9-1e38-4b9c-b1dc-6e0b557fc163.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054231_1cbf3073-b4f3-4e4e-bc09-3ca99cb668f9.png |
| coach-session-room | Coaching session room | Empty circle of simple chairs in a bright workshop room ready for a coaching session, soft daylight, no people, no readable posters | Steady confident | industry_adjacent | coaching | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055130_9a0ed65e-aa56-4dfc-b0bc-c71766a047e8.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_053609_8745ecec-1cf6-48ce-891f-45ed0f7cf581.png |
| coach-study-corner | Coach study corner | Open notebook and pen beside a coffee mug on a clean coaching desk, soft morning window light, no readable handwriting, no people | Focused lofi | industry_adjacent | coaching | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055132_34dcc7b8-b804-4c43-87c0-0318b54d7c4f.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054233_a50296c1-1178-47d1-b025-b3f685a6fbf0.png |
| coach-cozy-corner | Cozy coaching corner | Cozy coaching corner with armchair, side table, and soft lamp light ready for a one-on-one session, no people, no readable books or posters | Soft piano chill | industry_adjacent | coaching | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055134_e111af2c-6d4a-4bbc-b29e-1953ebef6d2e.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054342_2302ec37-1038-4fe4-bb90-c6cef3010969.png |
| creator-ring-light | Creator ring-light desk | Content desk with soft ring-light glow and small camera on a tripod, closed laptop, candid creator setup, no readable screens, no people | Clean upbeat | industry_adjacent | social-media-influencer | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055526_08378466-eae3-4685-b4f7-00ee2341713a.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_053740_0e0420cd-1f97-4988-9af5-6a92c04d4f8a.png |
| creator-shelf-corner | Creator shelf corner | Aesthetic shelf backdrop with plants and neutral decor ready for filming, soft indoor light, influencer content corner, no people, no readable book spines | Soft pop chill | industry_adjacent | social-media-influencer | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055528_cccfa5ee-74c0-452a-90ad-d186dbb67f87.mp4 | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_054735_c2ccb4c1-b374-49e5-ba81-aae729e183d0.png |
| creator-cafe-window | Creator cafe window | Closed laptop and iced drink on a cafe table by a window, handheld content-creator corner, warm cafe light, no people, no readable logos | Lofi | industry_adjacent | social-media-influencer | https://d8j0ntlcm91z4.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/hf_20260728_055530_d6392615-c33b-425a-a6ee-6bc4c57a9ae9.mp4 | https://d2ol7oe51mr4n9.cloudfront.net/user_3Fe3Yh0ymZtnffOIdKsgGZqxI87/387b29de-a564-48bb-bc48-8d5642285cf4.png |
$references$,
  content_type = 'text/markdown'
WHERE skill_key = 'ig-organic-video-ad'
  AND file_path = 'references/stock-backgrounds.md';

DO $migration$
DECLARE
  old_body text;
  new_body text;
BEGIN
  SELECT markdown_content
  INTO old_body
  FROM public.skill_library
  WHERE skill_key = 'ig-organic-video-ad'
  FOR UPDATE;

  IF old_body IS NULL THEN
    RAISE EXCEPTION 'ig-organic-video-ad skill is missing';
  END IF;

  new_body := replace(
    old_body,
    'Industry-adjacent scenes currently ship without clean presets — generate them with Higgsfield until presets are added.',
    'Industry-adjacent scenes now ship with clean presets — reuse them when `reuse_when_available` is selected.'
  );

  IF new_body = old_body AND position('Industry-adjacent scenes now ship with clean presets' in old_body) = 0 THEN
    -- Accept either prior wording variants.
    new_body := replace(
      old_body,
      'Industry-adjacent scenes currently ship without clean presets',
      'Industry-adjacent scenes now ship with clean presets — reuse them when available; only generate_new spends Higgsfield credits'
    );
  END IF;

  IF new_body = old_body AND position('now ship with clean presets' in old_body) = 0 THEN
    RAISE EXCEPTION 'ig-organic-video-ad preset reuse guidance did not match';
  END IF;

  UPDATE public.agent_skills
  SET
    markdown_content = new_body,
    updated_at = now()
  WHERE skill_key = 'ig-organic-video-ad';

  UPDATE public.skill_library
  SET
    markdown_content = new_body,
    updated_at = now()
  WHERE skill_key = 'ig-organic-video-ad';
END
$migration$;

COMMIT;
