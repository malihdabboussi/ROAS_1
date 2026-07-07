# Lint Actions

All actions use `vibey_backend`. Every Brain lint action must include `brain_type`. Examples use `brain_type: "user_default"`; when a job targets an Agent Brain, use `brain_type: "agent"` and include `brain_id`.

## Reading Lint Results

### get_brain_lint

Read health check findings. Default returns unresolved only.

```json
{ "action": "get_brain_lint", "label": "Reading brain health findings", "data": { "brain_type": "user_default" } }
```

Filter by check type:

```json
{
  "action": "get_brain_lint",
  "label": "Reading contradictions",
  "data": { "brain_type": "user_default", "check_type": "contradiction" }
}
```

Filter by severity:

```json
{
  "action": "get_brain_lint",
  "label": "Reading critical issues",
  "data": { "brain_type": "user_default", "severity": "critical" }
}
```

Include resolved:

```json
{
  "action": "get_brain_lint",
  "label": "Reading all findings",
  "data": { "brain_type": "user_default", "resolved": true, "limit": 50 }
}
```

## Triggering a Lint

### run_brain_lint

Manually trigger a brain health check. The job reads the selected durable brain target and records findings.

```json
{ "action": "run_brain_lint", "label": "Running brain health check", "data": { "brain_type": "user_default" } }
```

## Resolving Findings

### resolve_brain_lint

Mark a lint finding as resolved after fixing the underlying issue.

```json
{ "action": "resolve_brain_lint", "label": "Resolving lint finding", "data": { "brain_type": "user_default", "id": "UUID" } }
```

## Brain Log

### log_brain_event

Record the lint pass results.

```json
{
  "action": "log_brain_event",
  "label": "Logging lint pass",
  "data": {
    "brain_type": "user_default",
    "event_type": "lint_pass",
    "summary": "Lint pass: found 2 gaps, 1 stale page, 3 missing links. Fixed 1 gap and added 3 cross-references."
  }
}
```

## Page Actions

Use existing library actions to fix findings:

- `create_brain_page` for gap findings.
- `patch_brain_page` for stale findings.
- `link_brain_pages` for orphan and missing-link findings.
- `search_user_brain` to find User Brain evidence for User Brain gaps and stale checks.
- `get_brain_pages` to read page metadata.
