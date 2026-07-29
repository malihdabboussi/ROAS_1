BEGIN;

DO $migration$
DECLARE
  old_body text;
  new_body text;
  installed_copy_count integer;
BEGIN
  SELECT markdown_content
  INTO old_body
  FROM public.skill_library
  WHERE skill_key = 'static-ad-book'
  FOR UPDATE;

  IF old_body IS NULL THEN
    RAISE EXCEPTION 'static-ad-book skill is missing';
  END IF;

  IF strpos(old_body, 'If the user doesn''t name a format, pick 2-3 using the picker below and say why.') = 0 THEN
    RAISE EXCEPTION 'static-ad-book automatic format-picking instruction was not found';
  END IF;

  new_body := replace(
    old_body,
    '1. **Intake**: client/offer, ICP, the copy (or get it from roas-ad-copy / roas-ad-kit), and which format(s). If the user doesn''t name a format, pick 2-3 using the picker below and say why.',
    $selection_gate$1. **Intake**: gather the client/offer, ICP, and copy, or get the copy from
   `roas-ad-copy` / `roas-ad-kit`. Before creating any visual, complete the creative direction
   gate below unless `playbook_kickoff` or the user's request already contains an explicit choice.

### Creative direction gate

The Static Ad Production Builder and chat use the same choices. In chat, present choices with
`ask_clarification`; do not replace the card with a prose list. A user may click a choice or reply
with its number or name. Treat those replies as the matching choice and continue.

Skip this gate only when:
- `playbook_kickoff.production_mode` exists. It is authoritative because the user already chose in
  the Builder.
- The user explicitly named a production mode or one of the format ids below.

Do not treat "yes", "sure", "make them", or agreement to "turn this into a static" as a creative
direction choice. Do not call `generate_image`, `process_media`, or any final rendering action until
the required choices are complete.

First ask exactly:

```json
{"action":"ask_clarification","label":"Choose static ad production type","data":{"title":"Choose a static ad direction","intro_message":"Pick a production type before I create the visuals. You can click one or reply 1, 2, or 3.","questions":[{"id":"static_ad_production_mode","text":"Which kind of static ad should I create?","type":"single_choice","required":true,"options":[{"id":"validate_messaging","label":"Validate messaging angles","description":"Text-led ads that turn approved message angles into clear visual hooks."},{"id":"image_brief","label":"Image brief","description":"Build a qualified image brief, then generate the finished visual ads."},{"id":"static_ad_book","label":"Static ad book","description":"Use proven layouts such as chat receipt, myth vs. system, and offer stack."}]}]}}
```

Then follow the selected lane:

- `validate_messaging`: load and follow `roas-ad-design`. Do not choose a Static Ad Book format.
- `image_brief`: load and follow `roas-image-brief`, including its qualification gate. Do not choose
  a Static Ad Book format.
- `static_ad_book`: ask for the format family, then ask for one or more formats in that family. The
  staged questions keep each card focused and within the five-option clarification limit.

Ask the family question exactly:

```json
{"action":"ask_clarification","label":"Choose static ad format family","data":{"title":"Choose an ad format family","intro_message":"Pick the kind of layout you want to explore. You can click one or reply 1, 2, or 3.","questions":[{"id":"static_ad_family","text":"Which family should I use?","type":"single_choice","required":true,"options":[{"id":"person","label":"Person-led","description":"Founder, expert, customer, workshop, or event creative."},{"id":"receipt","label":"Proof and authority","description":"Social proof, message receipts, and editorial authority."},{"id":"graphic","label":"Graphic","description":"Direct-response concepts built around contrast, news-style hooks, or the offer."}]}]}}
```

After the family answer, ask one `multiple_choice` question using only the matching options:

- `person`: `hero_framing` (Hero framing), `identity_callout` (Identity callout), `case_study`
  (Case study), `workshop_event` (Workshop or event).
- `receipt`: `tweet_receipt` (Tweet receipt), `chat_receipt` (Chat receipt), `press_authority`
  (Press authority).
- `graphic`: `fake_news` (News-style hook), `myth_vs_system` (Myth vs. system), `offer_stack`
  (Offer stack).

Copy each option's description from the Format picker below into the clarification card. After the
user selects the format(s), briefly confirm the chosen direction and only then continue to person
source, imagery, and rendering.$selection_gate$
  );

  IF new_body = old_body THEN
    RAISE EXCEPTION 'static-ad-book creative direction gate did not change';
  END IF;

  IF strpos(new_body, '"static_ad_production_mode"') = 0
    OR strpos(new_body, '"validate_messaging"') = 0
    OR strpos(new_body, '"image_brief"') = 0
    OR strpos(new_body, '"static_ad_book"') = 0
    OR strpos(new_body, '"static_ad_family"') = 0
    OR strpos(new_body, '`hero_framing`') = 0
    OR strpos(new_body, '`chat_receipt`') = 0
    OR strpos(new_body, '`myth_vs_system`') = 0
  THEN
    RAISE EXCEPTION 'static-ad-book creative direction gate is incomplete';
  END IF;

  UPDATE public.agent_skills
  SET
    markdown_content = new_body,
    updated_at = now()
  WHERE skill_key = 'static-ad-book'
    AND markdown_content = old_body;

  GET DIAGNOSTICS installed_copy_count = ROW_COUNT;

  UPDATE public.skill_library
  SET
    markdown_content = new_body,
    updated_at = now()
  WHERE skill_key = 'static-ad-book';

  RAISE NOTICE 'Updated static-ad-book library and % unedited installed copies',
    installed_copy_count;
END
$migration$;

COMMIT;
