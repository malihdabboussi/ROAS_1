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
| work-truck-dawn | Work truck at dawn | Pickup truck bed with closed tool bags on gravel at a jobsite, orange dawn light, no people, no readable logos | Steady industrial chill | industry_adjacent | trades-home-services |  |  |
| workshop-bench | Workshop bench | Worn wooden workbench, open metal tool chest, coiled extension cord, soft shop fluorescent glow, no people, no readable labels | Grounded acoustic | industry_adjacent | trades-home-services |  |  |
| service-van-driveway | Service van in driveway | Clean white work van parked in a suburban driveway at morning, house exterior soft focus, no people, no readable company logos | Bright practical upbeat | industry_adjacent | trades-home-services |  |  |
| studio-floor-morning | Fitness studio floor | Empty group-fitness studio, mirrored wall, rolled mats stacked neatly, soft morning window light, no people, no logos | Motivational upbeat | industry_adjacent | health-fitness |  |  |
| outdoor-track-lane | Outdoor track lane | Empty running-track lane lines, soft-focus bleachers, cool morning outdoor light, candid handheld framing, no people | Energetic ambient | industry_adjacent | health-fitness |  |  |
| recovery-zone-floor | Recovery zone floor | Foam rollers and kettlebells on black rubber gym flooring beside a window, practical training space, no people, no readable branding | Focused lofi | industry_adjacent | health-fitness |  |  |
| agency-desk-morning | Agency desk morning | Clean office desk with a closed dark laptop, coffee mug, and neat paper stack, soft daylight through blinds, no readable screens or documents, no people | Calm professional ambient | industry_adjacent | professional-services |  |  |
| client-waiting-chairs | Client waiting chairs | Two waiting-area chairs and a small side table with a plant beside frosted glass, quiet professional lobby light, no people, no readable signs | Soft piano chill | industry_adjacent | professional-services |  |  |
| suburban-office-arrival | Suburban office arrival | POV walking across a modest suburban office parking lot toward a plain single-story office exterior, daytime, no people, no readable building signs | Steady confident | industry_adjacent | professional-services |  |  |
| staged-living-room | Staged living room | Bright staged living room with sofa, coffee table, and large windows, empty open-house ready interior, soft daylight, no people, no readable signs | Bright pop upbeat | industry_adjacent | real-estate-mortgage |  |  |
| listing-front-porch | Listing front porch | Suburban home front porch and landscaped walkway at morning curb-appeal light, candid handheld framing, no people, no readable address numbers or signs | Easy acoustic | industry_adjacent | real-estate-mortgage |  |  |
| loan-desk-morning | Loan desk morning | Clean mortgage or loan-officer desk with closed laptop, coffee, and neat unmarked folder stack, soft office daylight, no readable screens or documents, no people | Calm professional ambient | industry_adjacent | real-estate-mortgage |  |  |
| coach-notebook-desk | Coach notebook desk | Open notebook and pen beside a coffee mug on a clean coaching desk, soft morning window light, no readable handwriting, no people | Focused lofi | industry_adjacent | coaching |  |  |
| workshop-chair-circle | Workshop chair circle | Empty circle of simple chairs in a bright workshop room ready for a coaching session, soft daylight, no people, no readable posters | Steady confident | industry_adjacent | coaching |  |  |
| blank-teaching-board | Blank teaching board | Blank whiteboard or flip chart on a stand in a bright teaching room, empty chairs soft focus, no readable writing, no people | Motivational upbeat | industry_adjacent | coaching |  |  |
| creator-ring-light-desk | Creator ring-light desk | Content desk with soft ring-light glow and phone on a small tripod, closed laptop, candid creator setup, no readable screens, no people | Clean upbeat | industry_adjacent | social-media-influencer |  |  |
| creator-backdrop-shelf | Creator backdrop shelf | Aesthetic shelf backdrop with plants and neutral decor ready for filming, soft indoor light, influencer content corner, no people, no readable book spines | Soft pop chill | industry_adjacent | social-media-influencer |  |  |
| cafe-content-corner | Cafe content corner | Closed laptop and iced drink on a cafe table by a window, handheld content-creator corner, warm cafe light, no people, no readable logos | Lofi | industry_adjacent | social-media-influencer |  |  |
$references$,
  content_type = 'text/markdown'
WHERE skill_key = 'ig-organic-video-ad'
  AND file_path = 'references/stock-backgrounds.md';

DO $migration$
DECLARE
  old_body text;
  new_body text;
  old_stage text;
  new_stage text;
BEGIN
  SELECT markdown_content
  INTO old_body
  FROM public.skill_library
  WHERE skill_key = 'ig-organic-video-ad'
  FOR UPDATE;

  IF old_body IS NULL THEN
    RAISE EXCEPTION 'ig-organic-video-ad skill is missing';
  END IF;

  -- Prefer replacing the expanded Stage 2 block from the prior industry migration when present.
  old_stage := $old$## Stage 2: Resolve footage

Read `references/stock-backgrounds.md`.

Choose footage fit before scene IDs when kickoff does not already lock them:

- Ask for `footage_fit`: `lifestyle` or `industry_adjacent` when the offer vertical is unclear.
- Prefer `industry_adjacent` for insurance, agencies, trades, home services, fitness studios/gyms, clinics, and auto shops.
- Prefer `lifestyle` for luxury, travel, aspirational creator, or when the user asks for beach/pool/jet energy.
- When `industry_pack` is set, only use scenes from that pack.

- With `reuse_when_available`, use the clean preset video URL whenever the selected scene has one. This is the default because it saves credits and preserves a proven organic look.
- With `generate_new`, or when no preset exists, use the direct Higgsfield MCP.
- Industry-adjacent scenes currently ship without clean presets — generate them with Higgsfield until presets are added.
- Do not accept person, product, or location reference uploads for this format. Those belong to future static-ad formats.$old$;

  new_stage := $new$## Stage 2: Resolve footage

Read `references/stock-backgrounds.md`.

Choose footage fit before scene IDs when kickoff does not already lock them:

- Ask for `footage_fit`: `lifestyle` or `industry_adjacent` when the offer vertical is unclear.
- Prefer `industry_adjacent` for insurance, agencies, trades/home services, fitness, real estate/mortgage, coaching, and social/influencer offers.
- Prefer `lifestyle` for luxury, travel, aspirational creator leisure, or when the user asks for beach/pool/jet energy.
- When `industry_pack` is set, only use scenes from that pack.

- With `reuse_when_available`, use the clean preset video URL whenever the selected scene has one. This is the default because it saves credits and preserves a proven organic look.
- With `generate_new`, or when no preset exists, use the direct Higgsfield MCP.
- Industry-adjacent scenes currently ship without clean presets — generate them with Higgsfield until presets are added.
- Do not accept person, product, or location reference uploads for this format. Those belong to future static-ad formats.$new$;

  IF position(old_stage in old_body) > 0 THEN
    new_body := replace(old_body, old_stage, new_stage);
  ELSIF position('real-estate-mortgage' in old_body) > 0 AND position('social-media-influencer' in old_body) > 0 THEN
    new_body := old_body;
  ELSE
    new_body := replace(old_body, old_stage, new_stage);
    IF new_body = old_body THEN
      -- Fallback: patch preference bullets if Stage 2 already diverged.
      new_body := replace(
        old_body,
        'Prefer `industry_adjacent` for insurance, agencies, trades, home services, fitness studios/gyms, clinics, and auto shops.',
        'Prefer `industry_adjacent` for insurance, agencies, trades/home services, fitness, real estate/mortgage, coaching, and social/influencer offers.'
      );
      IF new_body = old_body THEN
        RAISE EXCEPTION 'ig-organic-video-ad industry pack v2 instructions did not match';
      END IF;
    END IF;
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
