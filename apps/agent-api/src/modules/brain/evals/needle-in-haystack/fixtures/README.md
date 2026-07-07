# Brain Needle-In-Haystack Eval Fixtures

This directory contains tiny deterministic Brain needle-in-haystack fixtures plus the YC demo golden set.

**Live dataset inventory:** [`../../datasets/foundry-yc-demo-baseline.md`](../../datasets/foundry-yc-demo-baseline.md)

The combined suite currently has 106 cases: 6 tiny deterministic fixtures and 100 YC demo cases pinned to real Foundry Creative Brain row IDs. Each case pins expected evidence IDs so retrieval changes can be measured before and after implementation.

**Space retrieval fixtures** live in [`../../space-retrieval/fixtures/`](../space-retrieval/fixtures/README.md) (separate index from Brain memory).

Eval data levels:

1. Tiny golden fixtures: synthetic, deterministic, checked into the repo.
2. YC demo account: seeded demo data with pinned Brain/source row IDs.
3. Production-like data: anonymized or redacted only after explicit approval.

Public benchmark order:

1. LongMemEval S
2. Sufficient Context
3. LoCoMo
4. BEAM 100K
5. BEAM 1M / 10M

## YC Demo Golden Set 100 Standard

The YC demo suite is the internal world-class Brain needle-in-haystack standard. It covers all four Brain families and all hard evidence-finding categories that usually break production memory systems.

Families covered:

- User Brain
- Agent Brain
- Customer Brain
- Company Brain
- Shared/cross-Brain retrieval

Required categories:

- `factual_recall`: direct evidence recall.
- `paraphrase`: abstract or synonym-heavy wording.
- `exact_title`: proper nouns, product names, titles, and exact phrases.
- `multi_hop`: answer requires two or more evidence rows.
- `temporal`: current-state retrieval with older/adjacent decoys.
- `abstention`: no sufficient evidence should be returned.
- `negative_decoy`: similar but wrong evidence must not win.
- `cross_brain`: evidence spans Brain families.
- `cognition`: narrative pages and belief patterns.
- `shared_access`: shared/cross-family access behavior.

The target is 100% by category, not just aggregate recall. A needle-in-haystack change is not considered world-class if it improves easy factual recall while regressing paraphrase, decoy resistance, abstention, or cross-Brain cases.
