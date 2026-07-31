# ROAS Model Scout

Terminal agent for inspecting OpenRouter’s live model catalog and comparing exact model IDs,
pricing, context windows, modalities, and tool support.

It uses `@openrouter/agent` for the agent loop. The default model is
`openrouter/auto-beta`, restricted to the approved low-cost pool:

- `openai/gpt-5.6-luna`
- `openai/gpt-5.6-terra`
- `z-ai/glm-5.2`

The Auto Beta plugin uses a cost-quality value of 9. This favors inexpensive models but is
not a spending cap. Fixed model IDs can be selected with `/model`.

## Run

Set a fresh credential outside the repository:

```bash
export OPENROUTER_INTERACTIVE_API_KEY=...
pnpm --filter @roas/openrouter-model-scout start
```

The legacy `OPENROUTER_API_KEY` name remains a fallback. Never commit either value.

## Commands

- `/models [query]` searches the live catalog.
- `/model [id]` shows or changes the active model.
- `/classifiers` explains the difference between reporting classifiers and Auto Beta routing.
- `/new` starts a new append-only JSONL session.
- `/help` displays commands.
- `/exit` closes the agent.

Custom classifiers are workspace reporting features. OpenRouter currently documents
workspace-admin creation through its Classifiers UI; it does not document a public
classifier-management endpoint. Auto Beta’s prompt classifier is programmatic and is
configured in this agent with approved models and a cost-quality preference.
