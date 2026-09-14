#!/usr/bin/env bash
# Move every connected Fathom account's webhook from the legacy door
# (/api/integrations/fathom/webhook) to the shared meeting door
# (/api/integrations/meetings/webhooks/fathom/<connection key>).
#
# Usage:
#   API_URL=https://api.roas.io INTERNAL_API_TOKEN=... bash scripts/roas/reregister-fathom-webhooks.sh
#
# Prints the list of migrated user ids and any failures. Safe to re-run: a
# connection that already carries a webhook key keeps it, only the Fathom-side
# webhook is recreated.
set -euo pipefail

: "${API_URL:?Set API_URL, for example https://api.roas.io}"
: "${INTERNAL_API_TOKEN:?Set INTERNAL_API_TOKEN (never paste it into logs)}"

curl -fsS -X POST "${API_URL%/}/api/integrations/fathom/internal/reregister-webhooks" \
  -H "Authorization: Bearer ${INTERNAL_API_TOKEN}" \
  -H 'Content-Type: application/json' \
  | python3 -m json.tool
