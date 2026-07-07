# Pattern Analysis Actions

All actions use `vibey_backend`. Every Brain action must include `brain_type`. Examples use `brain_type: "user_default"`; when working on an agent, customer, company, or explicit non-default brain target, use that `brain_type` and include `brain_id`.

## Belief Patterns

### get_brain_belief_patterns

Read belief patterns. Default returns emerging, active, and challenged.

```json
{ "action": "get_brain_belief_patterns", "label": "Reading belief patterns", "data": { "brain_type": "user_default" } }
```

Filter by status:

```json
{
  "action": "get_brain_belief_patterns",
  "label": "Reading active beliefs",
  "data": { "brain_type": "user_default", "status": "active", "limit": 20 }
}
```

### create_brain_belief_pattern

Create a new belief pattern. Strength determines initial status.

```json
{
  "action": "create_brain_belief_pattern",
  "label": "Recording new belief pattern",
  "data": {
    "brain_type": "user_default",
    "pattern_name": "resistance to scaling",
    "description": "Repeated concern about growing too fast without infrastructure.",
    "emotional_signature": {
      "dominant_emotion": "anxiety",
      "avg_valence": -0.6,
      "avg_intensity": 0.7
    },
    "supporting_memories": ["uuid-1", "uuid-2", "uuid-3"],
    "strength": 0.5
  }
}
```

### update_brain_belief_pattern

Update a belief pattern when new evidence reinforces, challenges, or changes it.

```json
{
  "action": "update_brain_belief_pattern",
  "label": "Reinforcing belief with new evidence",
  "data": {
    "brain_type": "user_default",
    "id": "UUID",
    "strength": 0.8,
    "status": "active"
  }
}
```

### archive_brain_belief_pattern

Set a belief to resolved when it no longer applies.

```json
{ "action": "archive_brain_belief_pattern", "label": "Archiving resolved belief", "data": { "brain_type": "user_default", "id": "UUID" } }
```

### merge_brain_belief_patterns

Merge overlapping beliefs. Supporting memories are combined into the primary belief and the secondary belief is archived.

```json
{
  "action": "merge_brain_belief_patterns",
  "label": "Merging overlapping beliefs",
  "data": {
    "brain_type": "user_default",
    "primary_id": "UUID",
    "secondary_id": "UUID",
    "description": "Optional merged description overriding both originals"
  }
}
```

### connect_brain_belief_to_memory

Add a memory to a belief's supporting evidence.

```json
{ "action": "connect_brain_belief_to_memory", "label": "Adding evidence to belief", "data": { "brain_type": "user_default", "belief_id": "UUID", "memory_id": "UUID" } }
```

### disconnect_brain_belief_from_memory

Remove a memory from a belief's supporting evidence.

```json
{ "action": "disconnect_brain_belief_from_memory", "label": "Removing evidence from belief", "data": { "brain_type": "user_default", "belief_id": "UUID", "memory_id": "UUID" } }
```

## Perspectives

### get_brain_perspectives

Read perspectives. Default returns emerging and active perspectives.

```json
{ "action": "get_brain_perspectives", "label": "Reading perspectives", "data": { "brain_type": "user_default" } }
```

### create_brain_perspective

Create a perspective when 3+ beliefs align into a coherent worldview.

```json
{
  "action": "create_brain_perspective",
  "label": "Creating new perspective",
  "data": {
    "brain_type": "user_default",
    "name": "Bootstrap purist",
    "description": "Believes sustainable growth comes from organic revenue and careful spending.",
    "narrative_md": "This perspective formed after repeated concerns about paid growth and team expansion...",
    "beliefs": ["belief-uuid-1", "belief-uuid-2", "belief-uuid-3"],
    "influence_areas": ["spending", "growth strategy", "hiring"],
    "blind_spots": "May miss opportunities where strategic paid spend accelerates organic growth",
    "strength": 0.6
  }
}
```

### update_brain_perspective

Update a perspective when the worldview shifts.

```json
{
  "action": "update_brain_perspective",
  "label": "Updating perspective narrative",
  "data": {
    "brain_type": "user_default",
    "id": "UUID",
    "narrative_md": "Updated narrative reflecting new evidence...",
    "strength": 0.7
  }
}
```

### archive_brain_perspective

Archive a perspective when it has transformed or no longer applies.

```json
{ "action": "archive_brain_perspective", "label": "Archiving transformed perspective", "data": { "brain_type": "user_default", "id": "UUID" } }
```

### connect_brain_belief_to_perspective

Add a belief to a perspective.

```json
{ "action": "connect_brain_belief_to_perspective", "label": "Connecting belief to perspective", "data": { "brain_type": "user_default", "perspective_id": "UUID", "belief_id": "UUID" } }
```

### disconnect_brain_belief_from_perspective

Remove a belief from a perspective.

```json
{ "action": "disconnect_brain_belief_from_perspective", "label": "Disconnecting belief from perspective", "data": { "brain_type": "user_default", "perspective_id": "UUID", "belief_id": "UUID" } }
```

## Brain Log

### log_brain_event

Record pattern analysis work.

```json
{
  "action": "log_brain_event",
  "label": "Logging pattern detection",
  "data": {
    "brain_type": "user_default",
    "event_type": "detect_pattern",
    "summary": "Detected 2 new beliefs and reinforced 3 existing ones from 5 updated pages"
  }
}
```

Use `event_type: 'synthesize_perspective'` when the primary work is perspective creation or update.
