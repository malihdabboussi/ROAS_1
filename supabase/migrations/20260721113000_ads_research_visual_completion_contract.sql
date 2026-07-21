BEGIN;

UPDATE public.agent_skills
SET markdown_content = replace(
      markdown_content,
      $old$6. **Depth** — default: standard brief (3-5 references). "Deep" on request: 8-10 references + organic layer.$old$,
      $new$6. **Depth** — default outside a mission: standard brief (3-5 references). "Deep" on request: 8-10 references + organic layer. An Ads Research mission overrides this with at least 12 visual references across at least 3 saved searches or advertisers.$new$
    ) || $contract$

### Ads Research mission completion contract

When the active mission uses `playbook_id: ads-research`:

1. Run at least 3 distinct topic or advertiser searches with `run_ads_research_search`.
2. Save at least 12 usable visual references total and confirm every response reports `saved_search_created: true`.
3. Keep every saved search linked to the current mission. Preserve the thumbnail or creative snapshot, advertiser, format, angle, source URL, relevance, and extracted pattern for every reference.
4. Do not complete the market-research subtask with only a document. If the quota cannot be saved, block with the exact provider or data limitation.
$contract$,
    updated_at = now()
WHERE skill_key = 'roas-market-research'
  AND markdown_content NOT LIKE '%### Ads Research mission completion contract%';

UPDATE public.skill_library
SET markdown_content = replace(
      markdown_content,
      $old$6. **Depth** — default: standard brief (3-5 references). "Deep" on request: 8-10 references + organic layer.$old$,
      $new$6. **Depth** — default outside a mission: standard brief (3-5 references). "Deep" on request: 8-10 references + organic layer. An Ads Research mission overrides this with at least 12 visual references across at least 3 saved searches or advertisers.$new$
    ) || $contract$

### Ads Research mission completion contract

When the active mission uses `playbook_id: ads-research`:

1. Run at least 3 distinct topic or advertiser searches with `run_ads_research_search`.
2. Save at least 12 usable visual references total and confirm every response reports `saved_search_created: true`.
3. Keep every saved search linked to the current mission. Preserve the thumbnail or creative snapshot, advertiser, format, angle, source URL, relevance, and extracted pattern for every reference.
4. Do not complete the market-research subtask with only a document. If the quota cannot be saved, block with the exact provider or data limitation.
$contract$,
    updated_at = now()
WHERE skill_key = 'roas-market-research'
  AND markdown_content NOT LIKE '%### Ads Research mission completion contract%';

COMMIT;
