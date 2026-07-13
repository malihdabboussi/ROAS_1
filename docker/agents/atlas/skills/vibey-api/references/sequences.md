# Sequences

## prepare_email_send
**Required keys:** `email_id`

**Optional keys:** `email_id`, `to`, `subject`

**Types:** `email_id`: string, `to`: string, `subject`: string

Relevant skill: read `skills/email-sequence-builder/SKILL.md`. Email sequence work needs timing, message order, and copy strategy guidance. Read before creating, editing, preparing, or sending sequence emails.

Prepares a single broadcast email for user approval. User sees: email_send_confirm approval card in chat — email is NOT sent until user clicks approve. Returns an email_send_confirm UI block.

```json
{"action":"prepare_email_send","label":"Preparing your broadcast","data":{"sequence_email_id":"UUID"}}
```

## prepare_sequence_send
**Required keys:** `sequence_id`

**Optional keys:** `sequence_id`, `recipient_id`

**Types:** `sequence_id`: string, `recipient_id`: string

Relevant skill: read `skills/email-sequence-builder/SKILL.md`. Email sequence work needs timing, message order, and copy strategy guidance. Read before creating, editing, preparing, or sending sequence emails.

Prepares a full sequence schedule for user approval. User sees: email_send_confirm approval card in chat with full schedule — sequence is NOT activated until user approves.

```json
{"action":"prepare_sequence_send","label":"Preparing your sequence send","data":{"sequence_id":"UUID"}}
```
