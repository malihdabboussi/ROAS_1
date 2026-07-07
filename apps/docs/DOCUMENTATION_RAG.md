# Docs semantic RAG (Supabase + Gemini)

## Env (Vercel / local for `apps/docs`)

| Variable                                               | Where              | Purpose                                      |
| ------------------------------------------------------ | ------------------ | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                             | Server + client OK | Supabase project URL                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY` | Server route       | Anon key for `search_public_docs_chunks` RPC |
| `GEMINI_API_KEY`                                       | Server only        | Embed + answer generation                    |

Optional:

| Variable               | Default                      | Purpose               |
| ---------------------- | ---------------------------- | --------------------- |
| `DOCS_EMBEDDING_MODEL` | `gemini-embedding-2` | Query embedding model |
| `DOCS_ASK_MODEL`       | `gemini-3-flash-preview`     | Answer LLM            |

## Indexer (local / CI)

| Variable                    | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `GEMINI_API_KEY`            | Chunk embeddings                             |
| `SUPABASE_URL`              | Same project as docs                         |
| `SUPABASE_SERVICE_ROLE_KEY` | Insert/delete rows (never in browser)        |
| `DOCS_INDEX_RUN_ID`         | Optional; default git short SHA or timestamp |

```bash
cd apps/docs
pnpm index:supabase
```

## API

- `POST /api/docs-search` — JSON `{ "query": "..." }` → `{ citations: [...] }`
- `POST /api/docs-ask` — JSON `{ "query": "...", "history": [{ "role","content" }] }` → `text/event-stream` SSE lines `data: {"text":"..."}`

## Verification (manual)

1. Apply migration `20260331180000_public_docs_chunks.sql` on Supabase.
2. Run `pnpm index:supabase` with keys; confirm rows exist for one `index_run_id`.
3. As anon SQL: `select count(*) from public.public_docs_chunks` should fail if RLS blocks direct select (no policy).
4. Call RPC from SQL as anon role emulator if available, or use `POST /api/docs-search` after indexing.
5. Rate limit: more than 30 `POST /api/docs-ask` per minute per IP → expect `429`.
