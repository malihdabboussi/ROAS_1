# Prompt cache validation (post-refactor)

Run against production/analytics DB (e.g. `ai_usage_events` on Vibey2.0 project).

## Cache rate by feature (rolling window)

```sql
SELECT feature,
  ROUND(100.0 * SUM(COALESCE(cache_read_tokens, 0)) /
    NULLIF(SUM(input_tokens) + SUM(COALESCE(cache_read_tokens, 0)), 0), 2) AS token_cache_pct,
  COUNT(*) AS events,
  COUNT(*) FILTER (WHERE cache_read_tokens > 0) AS events_with_cache_read
FROM ai_usage_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY feature
ORDER BY events DESC;
```

## Expected direction (not guarantees)

- **chat**: higher share of cache read vs pre-change; system prefix stable per conversation.
- **mission**: non-zero cache read after deploy; was ~0% when every call used a unique inline system prompt.

## Event-level spot check

```sql
SELECT id, feature, model_name, input_tokens, cache_read_tokens, cache_write_tokens, created_at
FROM ai_usage_events
WHERE feature IN ('chat', 'mission')
ORDER BY created_at DESC
LIMIT 50;
```
