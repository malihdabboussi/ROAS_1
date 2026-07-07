# Brain / Gemini billing — activity checklist (for Q&A)

Use this list to ask questions **one item at a time**. Each row is a real user-facing or system activity tied to brain/Gemini work we discussed.

**Legend (today’s code, high level):**

- **Backend Gemini** = Nest `EmbeddingService` paths (embed / small JSON LLM) on agent-api (and related).
- **OCR plan** = separate Gemini OCR for PDF/DOC/image text extraction (other plan).
- **Atlas / chat** = mission or OpenClaw model usage (different billing path from backend `EmbeddingService`).

---

## 1. Save a memory from chat (`save_memory`)

- **What:** Agent or flow writes a memory row to the brain (DB insert).
- **Backend Gemini on this step:** No — `createMemory` does not call embed/LLM on save in current code.
- **Notes:** Chat/mission tokens for *deciding* to call the tool are separate (OpenClaw/transcript path).

---

## 2. Search the brain / vector memory search

- **What:** User or agent searches memories; query is embedded for similarity search.
- **Backend Gemini:** Yes — embedding the query.
- **Credits (EmbeddingService):** Intended via `processDirectTextUsage` but **blocked** on agent-api until `pendingBrainUserId` / billing context is wired.

---

## 3. Scholar / SK knowledge ingest (text, training, `ns_sk_*`)

- **What:** Chunk text, extract entries with Gemini, embed rows, save SK entries.
- **Backend Gemini:** Yes — many LLM + embedding calls per ingest.
- **Credits:** **Also** a separate **bulk estimate** charge (`sk_ingest`) per completed ingest — do not stack blindly with per-call billing.

---

## 4. Conversation → memories pipeline

- **What:** Process a transcript/session into extracted memories (LLM + embeddings).
- **Backend Gemini:** Yes.
- **Credits:** Same agent-api `EmbeddingService` billing gap unless wired + check for other charges on that flow.

---

## 5. Document ingestion (brain document pipeline)

- **What:** Ingest document content into brain processing (chunk/extract/embed paths).
- **Backend Gemini:** Yes on processing steps.
- **Credits:** Same `EmbeddingService` billing gap unless wired; check for overlapping charges.

---

## 6. Crystallization / structured brain extraction

- **What:** Turn brain content into structured JSON-style output via small Gemini LLM.
- **Backend Gemini:** Yes (`callGemini`).
- **Credits:** Same `EmbeddingService` billing gap unless wired.

---

## 7. Memory tagging / classification (e.g. emotional tagging)

- **What:** Post-process memories with LLM prompts.
- **Backend Gemini:** Yes where that service runs.
- **Credits:** Same `EmbeddingService` billing gap unless wired.

---

## 8. Brain context / RAG-style query embedding

- **What:** Embed user (or system) text to retrieve relevant brain snippets for answers.
- **Backend Gemini:** Yes — embeddings.
- **Credits:** Same `EmbeddingService` billing gap unless wired.

---

## 9. Campaign / artifact scholar flows

- **What:** Artifact pipelines that query or enrich brain content (embeddings / LLM depending on action).
- **Backend Gemini:** Often yes.
- **Credits:** Same `EmbeddingService` billing gap unless wired; may combine with other artifact billing — verify per action.

---

## 10. Atlas missions (library sync, worker-driven brain jobs)

- **What:** Long-running missions; Atlas uses tools and/or backend actions.
- **Atlas / chat LLM:** Usually billed as mission/chat usage when the model runs in OpenClaw.
- **Backend Gemini:** Only if the mission path calls Nest services that use `EmbeddingService` (case-by-case).

---

## 11. Document OCR fallback (PDF / DOC / PPTX / images)

- **What:** When local text extraction fails or PPTX, call Gemini to read file bytes.
- **Separate plan:** Wire `billing` into OCR + avoid double charge with other steps in same user action.
- **Credits today:** OCR `processDirectTextUsage` gated on `pendingOcrUserId` — effectively off until wired.

---

## Open decisions (cross-cutting)

- **SK ingest:** Choose **either** bulk `sk_ingest` estimate **or** token-accurate per-call charges (or redesign) — not both unadjusted.
- **Agent-api `EmbeddingService`:** Replace dead `pendingBrainUserId` with explicit per-call `billing` (recommended).

---

_Add questions under each numbered section or in chat referencing the number (e.g. “Question on #3”)._
