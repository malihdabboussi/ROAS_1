---
name: Brain Library Lint
description: Holistic health check of the brain library. Finds missing pages, stale content, contradictions, orphans, and shallow pages.
---

# Brain Library Lint (Health Check)

You step back from incremental syncs and look at the entire library. Incremental jobs see a small batch at a time; this job catches themes, gaps, stale pages, contradictions, and missing links that only appear from the whole picture.

## The Six Checks

### 1. Missing Pages (gap)

Memory clusters that deserve a page but do not have one yet.

How to detect: use `search_user_brain` with broad topic queries across domains you know exist in the brain. Compare results against the library index. If 3+ memories cluster around a topic with no corresponding page, that is a gap.

How to fix: create a new page via `create_brain_page`. Use `search_user_brain` to pull in related memories as source material. Add the page to the index and link related pages.

Severity: `warning` if 3-5 memories, `critical` if 6+.

### 2. Stale Pages (stale)

Pages that have not been updated in 30+ days while new related memories likely exist.

How to detect: check page `updated_at` dates from `get_brain_pages`. For any page older than 30 days, use `search_user_brain` with the page topic to see if newer memories should be incorporated.

How to fix: read the page, read the new memories, then update the page via `patch_brain_page`.

Severity: `info` if 30-60 days, `warning` if 60+.

### 3. Contradictions (contradiction)

Two pages that say opposite or conflicting things.

How to detect: read pages for claims that disagree. A strategy shift may not be an error; it may need a narrative reconciliation.

How to fix: update affected pages to tell the evolution story. Contradictions are useful because they show growth. Do not delete one side; narrate the arc.

Severity: `warning` for soft contradictions, `critical` for hard contradictions in the same timeframe.

Use timelines and temporal fields before calling something a contradiction. A belief from 2024 and a different belief from 2026 may be evolution, not conflict. If the contradiction represents a true shift or resolution, mark it as timeline-worthy.

### 4. Orphan Pages (orphan)

Pages with zero cross-references to other pages.

How to detect: for each page, check whether it has links through the link system.

How to fix: use `link_brain_pages` to create meaningful connections.

Severity: `info`.

### 5. Shallow Pages (shallow)

Pages built from fewer than 3 source memories.

How to detect: check `source_refs` on each page from `get_brain_pages`.

How to fix: use `search_user_brain` to find additional evidence. If more exists, enrich the page via `patch_brain_page`. If the topic is genuinely thin, record it without forcing content.

Severity: `info` if 1-2 sources, `warning` if 0 sources.

### 6. Missing Cross-References (missing_link)

Pages that clearly relate to each other but have no link.

How to detect: read page titles and summaries for obvious relationships.

How to fix: use `link_brain_pages` with an appropriate relationship type.

Severity: `info`.

## Workflow

1. Read the full library with `get_brain_pages`.
2. Read the current library index.
3. Run each check in order: gaps, stale, contradictions, orphans, shallow, missing links.
4. Fix what can be fixed safely; record the rest.
5. Log the lint pass via `log_brain_event` with `event_type: 'lint_pass'`.

Use agent-brain search tools only when the lint job explicitly targets an Agent Brain.

## Quality Rules

- Do not create pages from thin evidence just to close a gap.
- Treat contradictions as growth signals when the timeline supports that interpretation.
- Stale does not mean wrong.
- Orphan pages in a small library are normal.
- Search generously; the brain may have evidence you have not seen since the last lint.

## Actions Reference

Read `references/actions.md` for the complete action reference with parameters.
