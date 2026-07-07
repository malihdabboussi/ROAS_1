# Agent → Credential Matrix

**Purpose:** Decide which agent gets which credential via the vault.  
**Current state:** Secrets are in TOOLS.md (plaintext) or .env.  
**Target:** Vault in DB; agents call backend; backend uses secret; agent never sees it.

---

## Service Inventory (what exists today)

| Service                 | Key Type         | Currently In                                 | Notes                                         |
| ----------------------- | ---------------- | -------------------------------------------- | --------------------------------------------- |
| **Nexus API**           | Bearer token     | .env (AGENT*TOKEN*\*)                        | Per-agent; auth middleware maps token → agent |
| **Shopify (HW)**        | Access Token     | TOOLS.md (bolt, echo, pulse, wave, clawd)    | healing-waves.myshopify.com                   |
| **Kit/ConvertKit (HW)** | API Key          | TOOLS.md (echo, nova, pulse, wave)           | kit_a95554958ec4915245254daa5a1094c7          |
| **ManyChat (HW)**       | API Key          | TOOLS.md (echo, wave)                        | 1961342:35281d7c43d3dc426e62a92ea8a95068      |
| **Stripe (Live)**       | Secret Key       | TOOLS.md (echo, pulse)                       | sk_live_51RVYor...                            |
| **Fathom**              | API Key          | .env (nexus-api) + TOOLS.md (aria, atlas)    | Aria has own key in TOOLS.md                  |
| **ElevenLabs**          | API Key          | TOOLS.md (wave, clawd), openclaw.json (sage) | Sefy voice clone, TTS                         |
| **YouTube Data API**    | API Key          | TOOLS.md (sage, clawd)                       | AIzaSyD5kxZuMwgrss40vN7Nto9-dWZdjW8z7lk       |
| **Cloudflare**          | API Token        | .env (vibe), TOOLS.md (clawd)                | Zone DNS, zones                               |
| **Vercel**              | Token            | .env (vibe), TOOLS.md (clawd)                | Deploy, projects                              |
| **GitHub**              | Token            | TOOLS.md (clawd)                             | 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      |
| **Airtable**            | Token            | TOOLS.md (clawd)                             | patgpawrWUbQqYbIE...                          |
| **n8n**                 | API Key          | TOOLS.md (clawd)                             | Workflow automation                           |
| **Supabase (Nexus)**    | DB URL + key     | .env (nexus-api)                             | DATABASE_URL, SUPABASE_SERVICE_KEY            |
| **Supabase (VibeyV2)**  | DB URL + keys    | TOOLS.md (clawd)                             | Direct DB access                              |
| **QuickBooks**          | Client Secret    | TOOLS.md (finn)                              | 1Y1Tm3fv7HWt8LQ0Y6vb8Qqdb9eGRMtOREaNOHiI      |
| **LastPass**            | Master Password  | TOOLS.md (clawd, finn, vibe)                 | Per-agent vaults                              |
| **Google (gog)**        | Keyring password | .bashrc                                      | OAuth, Gmail, Calendar, Drive                 |
| **Fathom Webhook**      | Webhook Secret   | .env + TOOLS.md (aria)                       | whsec\_\*                                     |

---

## Agent → Credential Assignment (YOU DECIDE)

**Instructions:** Put `✓` in ASSIGN column if that agent should get vault-backed access. CURRENT = who has it today (in TOOLS.md).

### External APIs (agent calls backend → backend uses credential)

| Service          | CURRENT (has it today)         | ASSIGN (you decide) |
| ---------------- | ------------------------------ | ------------------- |
| Shopify (HW)     | bolt, echo, pulse, wave, clawd |                     |
| Kit/ConvertKit   | echo, nova, pulse, wave        |                     |
| ManyChat (HW)    | echo, wave                     |                     |
| Stripe (Live)    | echo, pulse                    |                     |
| Fathom           | aria, atlas (atlas uses .env)  |                     |
| ElevenLabs       | wave, clawd, sage (openclaw)   |                     |
| YouTube Data API | sage, clawd                    |                     |
| Cloudflare       | vibe, clawd                    |                     |
| Vercel           | vibe, clawd                    |                     |
| GitHub           | clawd                          |                     |
| Airtable         | clawd                          |                     |
| n8n              | clawd                          |                     |
| QuickBooks       | finn                           |                     |

**Per-agent ASSIGN grid** (fill ✓ where agent gets access):

| Service          | aria | atlas | bolt | echo | finn | kai | nova | pixel | pulse | sage | vera | vibe | vibey | wave |  z  | clawd |
| ---------------- | :--: | :---: | :--: | :--: | :--: | :-: | :--: | :---: | :---: | :--: | :--: | :--: | :---: | :--: | :-: | :---: |
| Shopify (HW)     |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| Kit/ConvertKit   |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| ManyChat (HW)    |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| Stripe (Live)    |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| Fathom           |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| ElevenLabs       |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| YouTube Data API |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| Cloudflare       |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| Vercel           |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| GitHub           |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| Airtable         |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| n8n              |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |
| QuickBooks       |      |       |      |      |      |     |      |       |       |      |      |      |       |      |     |       |

### Passwords / Session-based (may stay in .env or separate flow)

| Service                 | CURRENT                 | ASSIGN |
| ----------------------- | ----------------------- | ------ |
| LastPass (own vault)    | finn, vibe, wave, clawd |        |
| Wave Email              | wave                    |        |
| Insight Timer (4 accts) | wave                    |        |
| QA Test (Vibey)         | kai                     |        |

### Nexus API (already per-agent via AGENT*TOKEN*\*)

No change — each agent has own token in .env, backend maps token → agent. Vault is for _external_ service credentials.

---

## Agent → Platforms (CURRENT — who has what today)

| Agent         | member_id                            | Platforms (API credentials in TOOLS.md today)                                                                          |
| ------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **aria**      | 2d4a674a-9278-48f9-ba39-f7c8f9096b3f | Fathom (Inbar MD), Nexus API                                                                                           |
| **atlas**     | 145e59f5-a12f-48e3-92b9-f744a9a85391 | Fathom (via .env), Nexus API                                                                                           |
| **bolt**      | 165d3bb0-0a3b-4c81-94e0-ae39fddd9873 | Shopify (HW), Nexus API                                                                                                |
| **echo**      | 96252105-bb4a-45c4-a5e5-5c0e583e3e73 | Kit, ManyChat (HW), Stripe (Live), Shopify (HW), Nexus API                                                             |
| **finn**      | 5e6cd25f-b8a1-4e95-801e-f4f9c98ebb36 | QuickBooks, LastPass, Nexus API                                                                                        |
| **kai**       | 81c541fc-ce19-45a9-b772-37656171d999 | Shopify (HW), QA Test (Vibey), Nexus API                                                                               |
| **nova**      | 276f85ee-2cd4-4699-a9aa-eef675505d0b | Kit, Nexus API                                                                                                         |
| **pixel**     | f5599ae5-9e9d-48b5-95e8-cbb5bcb4a3c0 | Nexus API only                                                                                                         |
| **pulse**     | 06a21d7f-d155-4b57-b047-721c15b03ca7 | Kit, Stripe (Live), Shopify (HW), Nexus API                                                                            |
| **sage**      | 47e5709e-5ca6-478e-ab10-a5ba9c9a8f1a | ElevenLabs (openclaw), YouTube Data API, Nexus API                                                                     |
| **vera**      | 6a4d06ea-680c-4e80-a3f6-8282596d9ec6 | Nexus API only                                                                                                         |
| **vibe**      | 545c2f73-b4f5-4008-ad1a-4a8141f036a0 | Cloudflare, Vercel, LastPass, Nexus API                                                                                |
| **vibey**     | — (Vibey product)                    | Own backend; not Nexus vault                                                                                           |
| **wave**      | cf92b249-d05e-43f3-a2c2-fd769b076db9 | Kit, ManyChat (HW), ElevenLabs, Shopify (HW), LastPass, Wave Email, Insight Timer (4), Nexus API                       |
| **z**         | 60f07073-587b-407c-8749-6ba799cdbc14 | Nexus API only                                                                                                         |
| **clawd** (Q) | 9a3dffbb-d321-469c-bc4d-b7e5d749bd16 | Shopify, Cloudflare, Vercel, GitHub, Airtable, n8n, ElevenLabs, YouTube, Fathom, Supabase (Nexus + VibeyV2), Nexus API |

---

## Agent Roles (from auth.ts)

| Agent                     | Role          | memberId                                      |
| ------------------------- | ------------- | --------------------------------------------- |
| q, z, kai, vera           | admin         | full CRUD                                     |
| vibe, pixel, bolt         | developer     | read all, create/update quests, SOPs, content |
| wave, aria, a, echo, nova | content       | read all, create/update quests, SOPs, content |
| atlas, pulse              | analyst       | read-only + progress entries                  |
| sage, finn                | admin         | full CRUD                                     |
| vibey                     | developer     | memberId null (Vibey product)                 |
| clawd                     | (Q's context) | uses Q member ID                              |

---

## Scoping: Shared vs Per-Agent

Some credentials are **shared** (multiple agents, same key):

- Shopify (HW): bolt, echo, pulse, wave, clawd — all use same store token
- Kit/ConvertKit: echo, nova, pulse, wave — same HW email list
- Stripe (Live): echo, pulse — same HW billing

**Vault options:**

- **Option A:** One vault row per (service, scope) — e.g. `shopify_healing_waves`. Grant `agent_id` list or `scope=healing-waves` + role check.
- **Option B:** One vault row per (agent_id, service) — duplicate the key for each agent. Simpler but redundant.

Recommend **Option A** for shared keys; **Option B** for agent-specific (e.g. LastPass, Vercel).

---

## Next Steps

1. **Fill in the matrix** — Put ✓ where each agent should get vault access.
2. **TOOLS.md** — Use vault section (see `TOOLS-VAULT-SECTION.md`). Agents call `GET /api/vault/capabilities` to discover, `POST /api/vault/execute` to use. No plaintext keys in TOOLS.md.

---

## File Locations (for migration)

| Agent | TOOLS.md Path               |
| ----- | --------------------------- |
| aria  | /root/agents/aria/TOOLS.md  |
| atlas | /root/agents/atlas/TOOLS.md |
| bolt  | /root/agents/bolt/TOOLS.md  |
| echo  | /root/agents/echo/TOOLS.md  |
| finn  | /root/agents/finn/TOOLS.md  |
| kai   | /root/agents/kai/TOOLS.md   |
| nova  | /root/agents/nova/TOOLS.md  |
| pixel | /root/agents/pixel/TOOLS.md |
| pulse | /root/agents/pulse/TOOLS.md |
| sage  | /root/agents/sage/TOOLS.md  |
| vera  | /root/agents/vera/TOOLS.md  |
| vibe  | /root/agents/vibe/TOOLS.md  |
| vibey | /root/agents/vibey/TOOLS.md |
| wave  | /root/agents/wave/TOOLS.md  |
| z     | /root/agents/z/TOOLS.md     |
| clawd | /root/clawd/TOOLS.md        |
