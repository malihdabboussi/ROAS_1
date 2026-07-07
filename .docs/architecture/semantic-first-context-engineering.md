# Semantic-First Context Engineering

Last updated: 2026-05-21
Status: research and architecture reference; not yet implemented as a unified platform layer.

## Purpose

This document captures the current best-practice direction for making Vibey a semantic-first platform.

It exists so future agents can understand the target model without redoing internet research or re-reading the entire codebase discussion.

The key conclusion:

```text
Do not build "naive RAG everywhere."
Build a context engineering layer:
semantic retrieval + lexical retrieval + object graph + reranking + sufficiency checks + agentic search.
```

## Executive Summary

RAG is still useful, but the old version of RAG is not enough:

```text
old RAG = chunk documents -> embed chunks -> vector search -> stuff chunks into prompt
```

The better model is:

```text
context engineering = decide what the model needs to know for this task,
then retrieve, rank, verify, and compose the smallest sufficient context.
```

For Vibey, this means:

- Keep normal database tables as the source of truth.
- Add a scoped semantic object/chunk index for searchable app objects.
- Combine semantic embeddings with exact keyword search.
- Preserve relationships between objects instead of flattening everything into disconnected chunks.
- Use reranking before sending context to an LLM.
- Check whether retrieved context is sufficient before answering.
- Give agents one high-level semantic search action instead of forcing them to manually list campaigns, then spaces, then docs, then read each document.

## Current Vibey Reality

The current codebase already has partial semantic systems, but not a universal semantic-first layer.

### Existing Semantic Paths

These paths already use embeddings or vector search:

| Area | Current behavior |
| --- | --- |
| User Brain | `search_user_brain` embeds the query and searches `ns_memories` / snapshots. |
| Agent Brain | `search_agent_brain` embeds the query and calls `search_sk_entries`. |
| Company Brain | `search_company_brain` tries semantic RPC first, then falls back to text search. |
| Uploaded media/PDF assets | `read_document` with `mode=search` embeds the query and searches `media_asset_chunks`. |
| Integration discovery | `search_available_integrations` uses capability embeddings when available. |

Relevant files:

- `apps/agent-api/src/modules/brain/services/embedding.service.ts`
- `apps/agent-api/src/modules/brain/repositories/memories.repository.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-legacy-team-brain.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-brain-scholar.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-company-cortex.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-missions-media.service.ts`
- `apps/api/src/modules/media/services/media-indexer.service.ts`
- `supabase/migrations/20260420201000_media_asset_chunks_vector.sql`

### Existing Non-Semantic Paths

These regular app actions are currently list/read style, not semantic search:

| Action | Current behavior |
| --- | --- |
| `list_campaigns` | Calls `GET /api/campaigns`. |
| `list_spaces` | Reads `spaces` ordered by `updated_at`. |
| `list_tasks` | Reads `space_items` by `space_id`, status, assignee, parent, etc. |
| `list_documents` | Reads docs from `space_items` where `custom_data->_view_type = doc`, plus `conversation_documents`. |
| `read_space_document` | Reads one selected space doc body. |
| `list_missions` | Reads `missions` rows or calls the missions API. |
| Channels | No generic `list_channels` or `search_channels` artifact action was found in `apps/agent-api/src/modules/artifacts`. |

Relevant files:

- `apps/agent-api/src/modules/artifacts/services/artifact-action.registry.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-documents.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-tasks.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-missions.service.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-north-star.service.ts`

Practical current limitation:

```text
"Vibey, find the doc that talks about XYZ"

Today, for Space docs:
list_campaigns -> list_spaces -> list_documents -> read_space_document -> inspect content

There is no unified semantic search across Space docs/tasks/missions/campaigns/channels.
```

## What Semantic-First Means For Vibey

Semantic-first does not mean replacing every API endpoint with vector search.

It means adding a dedicated semantic/context layer beside the normal app layer:

```text
Normal app tables remain source of truth:
campaigns, spaces, space_items, missions, messages, media_assets, ns_memories, etc.

Semantic index becomes the "find by meaning" layer:
semantic_objects / semantic_chunks
```

The normal CRUD/list APIs should continue to exist. The semantic layer should answer discovery questions:

- "Find the doc about launch positioning."
- "Which task mentions the creator onboarding issue?"
- "What campaign had the customer avatar problem?"
- "What did we decide about pricing?"
- "Where did this mission produce the final deliverable?"
- "Show everything related to the Google Drive migration."

## Recommended Target Architecture

### 1. Semantic Object Index

Create a universal index for all searchable objects.

Suggested table shape:

```text
semantic_objects
- id
- scope_type: "personal" | "org"
- user_id
- org_id
- source_type: "campaign" | "space" | "space_doc" | "task" | "mission" | "message" | "media_asset" | "brain_memory" | "company_brain_object" | "customer_memory"
- source_id
- parent_type
- parent_id
- title
- summary
- content
- metadata
- content_hash
- embedding
- indexed_at
- source_updated_at
```

Use this for small objects or object-level summaries.

Examples:

```text
source_type = "task"
title = "Prepare launch notes"
content = "Task in May Launch campaign. Description: prepare go-to-market launch notes..."
```

```text
source_type = "campaign"
title = "CreatorText.io May Launch"
content = "Campaign for CreatorText.io. Purpose: launch creator offer..."
```

### 2. Semantic Chunk Index

For large content, use chunks.

Suggested table shape:

```text
semantic_chunks
- id
- semantic_object_id
- scope_type
- user_id
- org_id
- source_type
- source_id
- chunk_index
- page_number
- title
- contextual_prefix
- raw_chunk
- embedded_text
- metadata
- embedding
- indexed_at
```

`embedded_text` should not be a naked chunk. It should combine context plus raw text.

Bad:

```text
The launch should start in May.
```

Good:

```text
This chunk is from the "CreatorText.io May Launch" campaign strategy doc in the "Launch Planning" space. It describes recommended timing for the go-to-market plan.

The launch should start in May.
```

This follows Anthropic's Contextual Retrieval guidance.

### 3. Relationship Graph

Semantic search should not flatten Vibey's product model.

Vibey has relationships:

```text
org -> campaign -> space -> document
org -> campaign -> mission -> deliverable
space -> task -> comments/activity
channel -> messages -> brainstorm -> agents
customer -> contact -> customer memory
brain -> memory -> belief/perspective/page
```

Preserve these as structured edges.

Suggested table:

```text
semantic_edges
- id
- org_id
- user_id
- from_source_type
- from_source_id
- to_source_type
- to_source_id
- relation_type: "belongs_to" | "mentions" | "created_by" | "derived_from" | "references" | "delivered_by" | "assigned_to"
- confidence
- metadata
- created_at
```

This allows GraphRAG-style traversal:

```text
semantic search finds a doc
-> graph shows the doc belongs to a space
-> space belongs to a campaign
-> campaign has related missions and tasks
```

### 4. Hybrid Retrieval

Do not rely only on vector similarity.

Use at least:

```text
semantic vector search
+ keyword/BM25/full-text search
+ structured filters
+ graph expansion
```

Why:

- Vector search is good for meaning.
- Keyword search is better for exact names, IDs, error codes, product names, file titles, emails, and proper nouns.
- Structured filters are required for permissions and product scope.
- Graph expansion is required for context around the matched object.

### 5. Reranking

Initial retrieval should return more candidates than the final context needs.

Recommended flow:

```text
query
-> embed query
-> vector search top 50-100
-> keyword/full-text search top 50
-> merge/dedupe
-> graph expand top candidates
-> rerank top 20-40
-> select final 5-15 evidence blocks
```

Reranking can be an LLM/reranker model step or a cheaper scoring function at first.

### 6. Context Sufficiency Check

Before answering, check whether retrieved context actually contains enough information.

This is not the same as relevance.

Relevant but insufficient:

```text
Question: "What did we decide about launch pricing?"
Retrieved context: "We discussed launch pricing yesterday."
```

Sufficient:

```text
Question: "What did we decide about launch pricing?"
Retrieved context: "Decision: launch at $49/mo for the first cohort, then test $79/mo after 20 customers."
```

If context is insufficient, the agent should:

1. Search again with a refined query.
2. Traverse related objects.
3. Read the original object.
4. Ask a clarifying question or say it cannot know.

### 7. Agentic Search Tool

Agents should get one first-class search action instead of manually walking the product tree.

Suggested action:

```text
semantic_search
```

Suggested input:

```json
{
  "query": "document about launch pricing",
  "scope": "current",
  "source_types": ["space_doc", "task", "mission"],
  "campaign_id": "optional",
  "space_id": "optional",
  "limit": 10,
  "include_related": true
}
```

Suggested result:

```json
{
  "success": true,
  "query": "document about launch pricing",
  "results": [
    {
      "source_type": "space_doc",
      "source_id": "UUID",
      "title": "Launch Pricing Strategy",
      "snippet": "Decision: launch at $49/mo...",
      "score": 0.91,
      "scope": {
        "org_id": "UUID",
        "campaign_id": "UUID",
        "space_id": "UUID"
      },
      "retrieve_via": {
        "action": "read_space_document",
        "data": {
          "space_id": "UUID",
          "document_id": "UUID"
        }
      },
      "related": [
        {
          "source_type": "campaign",
          "source_id": "UUID",
          "relation_type": "belongs_to",
          "title": "CreatorText.io May Launch"
        }
      ]
    }
  ],
  "context_sufficient": true
}
```

## Personal And Org Scope Model

Do not create one global semantic index for all users.

Use scoped search:

```text
Personal scope:
scope_type = "personal"
user_id = current user
org_id = null

Org scope:
scope_type = "org"
org_id = current org
user_id = owner/creator when needed
```

Search must always filter by access rights before returning results.

Minimum filters:

- `user_id` for personal data.
- `org_id` for org data.
- Campaign/space visibility rules.
- Agent/team capability policy when the caller is an agent.
- RLS or equivalent server-side authorization.

Hard rule:

```text
Semantic search must never return a result that the caller could not load through the normal app/API path.
```

## Research Summary

### Anthropic: Contextual Retrieval

Source: https://www.anthropic.com/engineering/contextual-retrieval

Main points:

- Traditional RAG often destroys context by embedding isolated chunks.
- Contextual Retrieval prepends short chunk-specific context before embedding and before BM25 indexing.
- Anthropic describes two techniques:
  - Contextual Embeddings
  - Contextual BM25
- They report:
  - Contextual embeddings reduced top-20 retrieval failure rate by 35%.
  - Contextual embeddings + Contextual BM25 reduced failure rate by 49%.
  - Adding reranking reduced failure rate by 67%.
- They recommend hybrid embeddings + BM25 rather than embeddings alone.
- They note that if a knowledge base is small enough to fit in the context window, including the whole thing may be simpler than RAG.

Vibey implication:

```text
When indexing a Space doc, task, mission, or campaign, embed contextualized chunks, not raw detached text.
```

### Google Research: Sufficient Context

Source: https://research.google/blog/deeper-insights-into-retrieval-augmented-generation-the-role-of-sufficient-context/

Main points:

- Retrieval relevance is not enough.
- The important question is whether retrieved context is sufficient to answer the user query.
- Context can be relevant but still insufficient.
- Google describes an LLM-based "sufficient context" autorater.
- If context is insufficient, systems should retrieve more, rerank, or abstain.
- Adding context can increase hallucination if the context is relevant but incomplete.

Vibey implication:

```text
semantic_search should expose whether returned context is enough.
Agents should not confidently answer when search found weak or incomplete evidence.
```

### Microsoft GraphRAG

Sources:

- https://www.microsoft.com/en-us/research/blog/graphrag-unlocking-llm-discovery-on-narrative-private-data/
- https://microsoft.github.io/graphrag/query/local_search/
- https://microsoft.github.io/graphrag/query/global_search/

Main points:

- GraphRAG builds and uses a knowledge graph around entities, relationships, and communities.
- Local Search is useful for entity-specific questions.
- Global Search is useful for dataset-wide synthesis questions.
- Graph structure helps when answers require relationships across many pieces of information, not just one similar chunk.

Vibey implication:

```text
App objects already form a graph. Do not discard it.
Campaign -> Space -> Doc -> Task -> Mission relationships should be part of retrieval.
```

### LlamaIndex: Agentic Retrieval / Query Planning

Source: https://docs.llamaindex.ai/en/stable/optimizing/agentic_strategies/agentic_strategies/

Main points:

- Agentic retrieval layers routing, query transformation, sub-questions, and tool use on top of RAG.
- A data agent can decide which retrieval tool to call, transform the query, and iterate when first retrieval is not enough.

Vibey implication:

```text
Vibey should not do a single blind search call.
Vibey should plan retrieval: search broadly, narrow scope, read originals, verify sufficiency.
```

### Context Engineering / Karpathy-Style Framing

Useful reference:

- https://contextpatterns.com/

Main idea:

```text
The hard part is not the prompt wording.
The hard part is programmatically filling the model context window with the right information for the next step.
```

Vibey implication:

```text
"Semantic-first" should really mean "context-first."
Search is only one step. The final product quality depends on what context we assemble.
```

## Standard For Future Vibey Work

Any future semantic-first implementation should follow these standards.

### Standard 1: Normal Tables Stay Source Of Truth

Do not move product data into a vector table as the canonical record.

Source tables remain:

- `campaigns`
- `spaces`
- `space_items`
- `missions`
- `mission_deliverables`
- `messages`
- `conversation_documents`
- `media_assets`
- `ns_memories`
- `company_cortex_objects`
- Customer brain memory rows

Semantic tables are derived indexes.

### Standard 2: Every Indexed Object Needs An Adapter

Each source type needs an adapter:

```text
extract title
extract content
build contextual prefix
build metadata
resolve scope
resolve permissions
resolve original read action
handle update/delete
```

Suggested adapters:

| Source type | Adapter responsibility |
| --- | --- |
| `campaign` | Index campaign name, purpose, config, strategy, core context. |
| `space` | Index title, schema, campaign relation, description/settings. |
| `space_doc` | Index title, `doc_body`, `notes`, Drive metadata, folder hierarchy. |
| `task` | Index title, description, notes, custom fields, comments/activity summary. |
| `mission` | Index title, brief, description, output, status, agent assignment. |
| `mission_deliverable` | Index title, content, content_json, file metadata. |
| `message` | Index channel/thread messages with sender/time/channel context. |
| `media_asset` | Reuse/extend `media_asset_chunks`. |
| `brain_memory` | Either federate existing Brain search or mirror into semantic object index. |
| `company_brain_object` | Index object title/truth plus relations. |
| `customer_memory` | Index customer memories with contact/customer scope. |

### Standard 3: Index On Create/Update/Delete

Every source mutation should eventually update the semantic index.

Options:

```text
Synchronous for small cheap objects:
task title update -> update semantic object

Async for large/expensive objects:
doc/media/message import -> enqueue semantic indexing job
```

At minimum:

- On create: insert semantic object/chunks.
- On update: recompute changed chunks/object summary.
- On delete/archive: delete or mark semantic rows inactive.
- On permission/scope change: update scope fields or reindex.

### Standard 4: Backfill Existing Data

The first implementation needs a backfill job:

```text
backfill campaigns
backfill spaces
backfill space docs
backfill tasks
backfill missions
backfill mission deliverables
backfill channel/messages if included
backfill selected brain objects if federated search is not enough
```

Backfill must be resumable and idempotent:

```text
content_hash prevents duplicate rows
source_updated_at detects stale rows
batch cursor supports retries
```

### Standard 5: Hybrid Search Is Required

Search should return merged candidates from:

```text
vector similarity
full-text / BM25-style lexical matching
structured filters
graph expansion
```

Do not ship embeddings-only search as the platform standard.

### Standard 6: Result Contract Must Be Stable

All semantic results should have:

```text
source_type
source_id
title
snippet
score
match_reason
scope
metadata
retrieve_via
related
```

`retrieve_via` is critical for agents:

```json
{
  "action": "read_space_document",
  "data": {
    "space_id": "UUID",
    "document_id": "UUID"
  }
}
```

This lets an agent move from search result to canonical source object.

### Standard 7: Agents Search First, Then Read

For discovery questions:

```text
semantic_search first
read original source only after finding likely targets
answer only after enough context is present
```

For direct ID/title requests:

```text
use structured get/list action directly
```

### Standard 8: Do Not Confuse Brain With Semantic Object Search

Brain is a semantic memory layer.

Semantic object search is a product-wide discovery layer.

They can federate, but they are not the same thing.

```text
User Brain: durable memories, insights, facts, beliefs.
Semantic Object Index: app objects and their content.
```

Example:

```text
User asks: "What did we decide about launch pricing?"

Search should likely query:
- semantic objects: docs, tasks, missions, messages
- brain memories: decisions, insights
- company/customer brain if in org/customer context
```

## Implementation Phases

### Phase 1: Read-Only Semantic Search For Space Docs

Start narrow.

Scope:

- `space_doc` only.
- Personal and org scope.
- Index `space_items` where `custom_data->_view_type = doc`.
- Use `doc_body`, fallback `notes`.
- Add `semantic_search` action with `source_types=["space_doc"]`.
- Return `retrieve_via=read_space_document`.

Why:

- This directly fixes the practical pain: finding a specific doc by meaning.
- Existing docs are plain DB rows today.
- The source table and read action are already clear.

### Phase 2: Add Tasks, Missions, Campaigns, Spaces

Add:

- `task`
- `mission`
- `mission_deliverable`
- `campaign`
- `space`

Add graph edges:

```text
space_doc belongs_to space
space belongs_to campaign
task belongs_to space
mission belongs_to campaign
mission_deliverable belongs_to mission
```

### Phase 3: Hybrid Retrieval + Reranking

Add:

- Full-text index.
- Rank fusion between vector and keyword results.
- Reranking layer.
- Search telemetry.

### Phase 4: Context Sufficiency

Add:

- `context_sufficient` classifier.
- Retry/refine search behavior.
- Agent instruction: do not answer from insufficient context.

### Phase 5: GraphRAG-Style Synthesis

Add:

- Local graph expansion around matched objects.
- Global/org-level synthesis for "what are the main themes?" questions.
- Community/theme summaries if needed.

## Questions To Resolve Before Implementation

1. Should `semantic_objects` and `semantic_chunks` live in `public`, or a private schema with service-role access and SECURITY DEFINER RPCs?
2. Should Brain memories be mirrored into the semantic object index or federated from existing Brain search?
3. Which model should generate contextual prefixes: Gemini, Claude, or a cheaper internal summarizer?
4. Should context prefix generation be required for every chunk, or only for long documents?
5. What reranker should be used first: LLM-based, Voyage/Cohere-style, or custom scoring?
6. Should channel messages be indexed by default, or only after org/user opt-in?
7. How should deleted/private/permission-changed objects be removed from the semantic index?
8. What is the minimum result score for an agent to trust the result?
9. How do we expose semantic search to non-Vibey agents with limited domains?
10. Should `semantic_search` be a single action or split into `semantic_search`, `semantic_read`, and `semantic_explain_context`?

## Hard Rules

- Do not call this "done" after only adding vector rows.
- Do not embed raw chunks without source context.
- Do not use semantic search without permission filters.
- Do not make semantic index rows the source of truth.
- Do not remove existing structured list/get actions.
- Do not rely on embeddings alone.
- Do not let agents answer if retrieved context is relevant but insufficient.
- Do not hide source objects; every result must point back to the canonical row/read action.

## One-Line Target

```text
Vibey should become semantic-first by adding a scoped context engineering layer over the app graph, not by replacing the app with naive RAG.
```
