# RBAC Action Matrix

Generated from artifact-capability.policy.ts. Machine-verified.

---

## Capability Categories

Cross-domain action groups that domains compose from. Future: per-agent toggleable via config.enabled_categories.

| Category | Actions | Count |
|---|---|---|
| `CAT_DOCUMENTS` | save_document, create_pdf, list_documents, get_document, update_document | 5 |
| `CAT_MEMORY` | save_memory, search_memory, resolve_agent_sk_brain, search_sk_entries, ingest_sk_text, ingest_sk_link | 6 |
| `CAT_INTEGRATIONS` | get_integration, search_available_integrations, initiate_integration_connect, check_integration_connection, get_capabilities, use_integration | 6 |
| `CAT_COMMUNICATION` | send_user_message, save_member_note, get_member_notes | 3 |
| `CAT_MCP_READ` | list_mcp_servers, list_mcp_tools, use_mcp_tool, list_mcp_resources, read_mcp_resource | 5 |
| `CAT_CUSTOM_OBJECTS` | list_object_types, get_object_type, create_object, update_object, list_objects, get_object, delete_object | 7 |
| `CAT_STATE` | patch_state | 1 |
| `CAT_SKILLS_BASELINE` | list_agent_skills, create_agent_skill, update_agent_skill, delete_agent_skill | 4 |
| `CAT_MEDIA_CONSUMER` | analyze_video, extract_url_transcript, get_media_generation_status, get_video_status, process_media | 5 |
| `CAT_MEDIA_CREATOR` | generate_image, generate_video | 2 |

## Domain Category Composition

| Domain | Categories Included |
|---|---|
| **Managed baseline** (marketing, analyst, developer, operations) | mission_read, delegation_read, CAT_DOCUMENTS, CAT_MEMORY, CAT_INTEGRATIONS, CAT_COMMUNICATION, CAT_MCP_READ, CAT_CUSTOM_OBJECTS, CAT_STATE, CAT_SKILLS_BASELINE, CAT_MEDIA_CONSUMER |
| **Support** | CAT_DOCUMENTS, CAT_MEMORY, CAT_COMMUNICATION, CAT_MEDIA_CONSUMER, CAT_MEDIA_CREATOR |
| **Management** (system agents) | Profile-specific allowlists (not category-based) |

## Action Counts Per Profile

| Profile | Actions |
|---|---|
| Vibey (CEO) | 173/220 |
| HR | 7/220 |
| Atlas (Brain Scholar) | 53/220 |
| marketing/employee | 129/220 |
| marketing/manager | 134/220 |
| marketing/c_level | 142/220 |
| analyst/employee | 74/220 |
| analyst/manager | 77/220 |
| analyst/c_level (CFO) | 84/220 |
| developer/employee | 68/220 |
| developer/manager | 71/220 |
| developer/c_level | 80/220 |
| operations/employee | 79/220 |
| operations/manager | 99/220 |
| operations/c_level | 101/220 |
| support/employee | 21/220 |

## Hierarchy Verification

| Domain | Employee | Manager | C-Level | Valid |
|---|---|---|---|---|
| marketing | 129 | 134 | 142 | Yes |
| analyst | 74 | 77 | 84 | Yes |
| developer | 68 | 71 | 80 | Yes |
| operations | 79 | 99 | 101 | Yes |

## Support Baseline (21 actions)

**CAT_DOCUMENTS** (5):
- `save_document`
- `create_pdf`
- `list_documents`
- `get_document`
- `update_document`

**CAT_MEMORY** (6):
- `save_memory`
- `search_memory`
- `search_sk_entries`
- `resolve_agent_sk_brain`
- `ingest_sk_text`
- `ingest_sk_link`

**CAT_COMMUNICATION** (3):
- `send_user_message`
- `save_member_note`
- `get_member_notes`

**CAT_MEDIA_CONSUMER** (5):
- `get_media_generation_status`
- `get_video_status`
- `analyze_video`
- `extract_url_transcript`
- `process_media`

**CAT_MEDIA_CREATOR** (2):
- `generate_image`
- `generate_video`

Support does NOT get: MCP, integrations, custom objects, state, skills, missions, delegation, team management.

## Design Rules

- **Mission management is Vibey-only.** No domain agent at any level can create/update/manage missions.
- **Delete actions are Vibey-only.** No managed agent can delete assets.
- **Support agents have no skill management.** SKILL_ACTIONS are not added for support domain.
- **Unmatched agents are denied.** inferCapabilityDomain returns null if no domain pattern matches. Agents must have explicit config.capability_domain or match a known pattern.
- **System agents use management domain.** Vibey, HR, Atlas have domain=management with profile-specific allowlists that bypass domain resolution.

## Future: Per-Agent Category Toggles

Categories are designed to be independently toggleable per agent. A future "Advanced Settings" UI could store enabled categories in `config.enabled_categories` (e.g. `["documents", "memory", "media_consumer"]`) and the policy resolver would compose the allowlist from those categories + the domain-specific set. This enables fine-grained control without creating new domain types.

## Orphan Actions

`patch_ad` -- exists in VALID_ACTIONS but no profile grants access. Pending cleanup.

