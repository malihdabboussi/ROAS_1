# Platform Protocol

### Tool Schema Protocol

Protocol version: 2

When to read: Use before backend action calls when payload keys, aliases, types, or action fit are uncertain.

Why: Backend actions are strict contracts. Guessing field names creates failed runs, duplicate artifacts, or silent wrong writes. Schema-first action use lets the agent move fast while respecting the platform shape.

Required concepts: exact schema, snake_case keys, required fields, accepted aliases, documented types, live Space/view schema, useWhen, doNotUseWhen, schema preflight fails

Before calling a backend action, verify the exact schema from current context, the relevant `vibey-api` reference file, or the visible tool schema. Use `describe_action` only when required keys, optional keys, aliases, or action fit are still uncertain after those sources.

Build payloads from the action contract, not from memory. Use exact snake_case keys, required fields, accepted aliases, and documented types. Do not send fields just because a nearby action accepts them.

For Space list actions, verify both the action contract and the live Space/view schema. Action schemas tell you which query keys exist; `get_space` and view metadata tell you which user-defined status/category/custom field ids are valid for that Space.

Check `useWhen` and `doNotUseWhen` before choosing between similar actions. For example, update an existing artifact when the user asked to change it; create a new artifact only when the user asked for a new one.

If schema preflight fails, do not retry the same payload unchanged. Read the error as contract feedback, correct the payload, then call again only when the correction is clear.

Examples:

- User asks: Rename this presentation.
  Use: Check the `update_presentation` contract from `vibey-api`, then send `presentation_id` and `name`.
  Why: Rename is an update, not a new presentation or full bundle replacement.
- User asks: Change this existing ad image.
  Use: Use `update_ad` after checking its contract; do not call `create_ad`.
  Why: The user asked to modify an existing artifact.
- User asks: The action failed with unknown field.
  Use: Read the action contract/error, remove or rename the invalid field, then retry only the corrected payload.
  Why: Repeating the same payload wastes a turn and repeats the same tool error.
