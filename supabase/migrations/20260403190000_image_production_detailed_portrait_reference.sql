-- image-production: global reference for high-fidelity documentary-style portrait prompting
-- Resource uses agent_key '*' so it merges on sync; vibey + designer gain the skill so funnels/sites get the files.

DELETE FROM agent_skill_resources
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key = '*'
  AND skill_key = 'image-production'
  AND file_path = 'references/detailed-portrait-prompting.md';

INSERT INTO agent_skill_resources (user_id, org_id, agent_key, skill_key, file_path, content)
VALUES (
  NULL,
  NULL,
  '*',
  'image-production',
  'references/detailed-portrait-prompting.md',
  $portrait_ref$
# Detailed portrait prompting (editorial / documentary realism)

Use this after steps 1–3 in `SKILL.md` (purpose, dimensions, brand). It extends **step 4 — prompt craft** when the user needs a **human portrait** for funnels, websites, hero sections, ads, or social — especially when they want **texture, culture-specific accuracy, and “National Geographic” realism** instead of plastic AI glamor.

---

## Prompt anatomy (build in this order)

1. **Subject + demographic** — age range, role/context if relevant; be specific without stereotypes.
2. **Skin and surface truth** — wrinkles, pores, sun weathering, pigmentation, spots; explicitly forbid beauty smoothing when realism is the goal.
3. **Eyes + gaze** — color, age-related detail, lashes; direction of gaze (e.g. calm, direct-to-camera).
4. **Wardrobe + cultural dress** — name the garment types and materials (e.g. handwoven cloth, drape, pattern direction). Match the brief; do not invent sacred or ceremonial regalia unless the user asked.
5. **Accessories** — jewelry metal patina, beads, modest props; keep consistent with region/era in the brief.
6. **Light + environment** — e.g. soft outdoor daylight, golden hour, realistic shadows; avoid studio glow unless the brief asks.
7. **Camera + optics** — focal length (e.g. 85mm), depth of field, background separation, “high texture fidelity.”
8. **Negative prompt** — run a second block or comma list: beauty filters, CGI sheen, wrong ethnicity/costume mix, watermark, low-res, blown HDR, etc.

---

## Gold-standard example (full positive prompt)

*Illustrative pattern only — swap identity, region, and wardrobe to match the user’s brief. This is the density and structure to aim for.*

```
Documentary realism, National Geographic editorial portrait style, extremely high texture fidelity.

Subject: elderly Nigerian Yoruba woman, 75–80 years old, dignified presence. Extreme facial detail: deep forehead wrinkles, crow's feet, pronounced nasolabial folds, micro-wrinkles on cheeks and chin, sun-weathered skin, natural hyperpigmentation, visible pores and age spots. No retouching, no smoothing, no beauty filter.

Eyes: dark brown eyes with age-softened clarity, warm amber undertones in the iris, sparse natural lashes, subtle yellowing of the sclera; calm, direct eye contact with camera.

Wardrobe: traditional Nigerian gele-style head tie and buba blouse in handwoven aso-oke fabric — deep indigo-navy base with burgundy and gold-tan vertical stripes; natural textile weave visible.

Accessories: small aged gold stud earrings; single strand of irregular dark coral beads.

Lighting and lens: natural outdoor daylight, soft golden hour, realistic shadow falloff on face; 85mm lens, shallow depth of field, subject sharp, background softly blurred, no cinematic bloom or HDR glow.
```

### Negative prompt (companion list)

```
beauty filter, smooth skin, retouched face, young skin, CGI look, AI plastic skin, waxy texture, plastic texture, studio beauty lighting, cinematic glow, HDR, bloom, heavy blur, noise, low resolution, oversaturated colors, color shift, watermark, compression artifacts, modern Western casual outfit wrong for subject, wrong cultural jewelry, cartoon, illustration,
```

---

## Adaptation rules

- **Brief-first** — Never paste the example subject if the user asked for someone else. Keep the **structure**, replace **facts**.
- **Respect + accuracy** — Cultural details must match the user’s intent; when unsure, ask one clarifying question instead of guessing patterns or mixing regions.
- **End use** — For web heroes, mention readable negative space if text will overlay (see main `SKILL.md`).
- **Model limits** — If hands/full body are needed, add extra hand and pose constraints; portraits here focus on face-first framing.

---
$portrait_ref$
);

-- Funnels, websites, and designer-delivered pages: same skill body as media_producer so reference files sync.
INSERT INTO agent_skills (user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled)
SELECT
  NULL,
  NULL,
  agents.agent_key,
  src.skill_key,
  src.name,
  src.description,
  src.markdown_content,
  true
FROM agent_skills AS src
CROSS JOIN (VALUES ('vibey'), ('designer')) AS agents(agent_key)
WHERE src.user_id IS NULL
  AND src.org_id IS NULL
  AND src.agent_key = 'media_producer'
  AND src.skill_key = 'image-production'
  AND NOT EXISTS (
    SELECT 1
    FROM agent_skills AS e
    WHERE e.user_id IS NULL
      AND e.org_id IS NULL
      AND e.agent_key = agents.agent_key
      AND e.skill_key = 'image-production'
  );
