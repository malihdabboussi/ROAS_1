# Agent Consolidation Audit (Server Reality Check)

**Source:** SSH to root@188.245.41.230 — Feb 16, 2026

**UPDATE (Feb 16):** Consolidated a = atlas. Removed "a" from OpenClaw, nexus-api auth. Atlas now has merged TOOLS.md (X, LinkedIn, Dream 100 from a). /root/agents/a archived to \_archive/.

---

## 1. OpenClaw Agents (what actually runs)

From `/root/.openclaw/openclaw.json` → `agents.list`:

| id    | workspace          |
| ----- | ------------------ |
| pixel | /root/agents/pixel |
| vibe  | /root/agents/vibe  |
| wave  | /root/agents/wave  |
| **a** | /root/agents/a     |
| bolt  | /root/agents/bolt  |
| sage  | /root/agents/sage  |
| aria  | /root/agents/aria  |
| z     | /root/agents/z     |
| finn  | /root/agents/finn  |
| kai   | /root/agents/kai   |
| vera  | /root/agents/vera  |
| echo  | /root/agents/echo  |
| nova  | /root/agents/nova  |
| pulse | /root/agents/pulse |
| vibey | /root/agents/vibey |

**Default workspace:** `/root/clawd` (Q — not in list; clawd is the primary Q context)

**Missing from OpenClaw:** `atlas`, `q` (q uses clawd as default)

---

## 2. nexus-api Auth Tokens (AGENT*TOKEN*\* in .env)

| Token             | In nexus-api |
| ----------------- | :----------: |
| AGENT_TOKEN_A     |      ✓       |
| AGENT_TOKEN_ARIA  |      ✓       |
| AGENT_TOKEN_ATLAS |      ✓       |
| AGENT_TOKEN_BOLT  |      ✓       |
| AGENT_TOKEN_ECHO  |      ✓       |
| AGENT_TOKEN_FINN  |      ✓       |
| AGENT_TOKEN_KAI   |      ✓       |
| AGENT_TOKEN_NOVA  |      ✓       |
| AGENT_TOKEN_PIXEL |      ✓       |
| AGENT_TOKEN_PULSE |      ✓       |
| AGENT_TOKEN_Q     |      ✓       |
| AGENT_TOKEN_SAGE  |      ✓       |
| AGENT_TOKEN_VERA  |      ✓       |
| AGENT_TOKEN_VIBE  |      ✓       |
| AGENT_TOKEN_VIBEY |      ✓       |
| AGENT_TOKEN_WAVE  |      ✓       |
| AGENT_TOKEN_Z     |      ✓       |

---

## 3. member_profiles (Supabase)

| id                                   | name  | role                      |
| ------------------------------------ | ----- | ------------------------- |
| 2d4a674a-9278-48f9-ba39-f7c8f9096b3f | Aria  | Client Specialist         |
| 145e59f5-a12f-48e3-92b9-f744a9a85391 | Atlas | Content Creator           |
| 165d3bb0-0a3b-4c81-94e0-ae39fddd9873 | Bolt  | Infrastructure Engineer   |
| 96252105-bb4a-45c4-a5e5-5c0e583e3e73 | Echo  | Email Copywriter          |
| 5e6cd25f-b8a1-4e95-801e-f4f9c98ebb36 | Finn  | CFO                       |
| 81c541fc-ce19-45a9-b772-37656171d999 | Kai   | Product Manager, Vibey V2 |
| 276f85ee-2cd4-4699-a9aa-eef675505d0b | Nova  | Visual Designer           |
| f5599ae5-9e9d-48b5-95e8-cbb5bcb4a3c0 | Pixel | Frontend Developer        |
| 06a21d7f-d155-4b57-b047-721c15b03ca7 | Pulse | Analytics                 |
| 9a3dffbb-d321-469c-bc4d-b7e5d749bd16 | Q     | COO                       |
| 47e5709e-5ca6-478e-ab10-a5ba9c9a8f1a | Sage  | AI Coach                  |
| a1b2c3d4-e5f6-7890-abcd-ef1234567890 | Sefy  | Founder                   |
| 6a4d06ea-680c-4e80-a3f6-8282596d9ec6 | Vera  | Brand Manager             |
| 545c2f73-b4f5-4008-ad1a-4a8141f036a0 | Vibe  | Lead Developer            |
| cf92b249-d05e-43f3-a2c2-fd769b076db9 | Wave  | Sound Engineer            |
| 60f07073-587b-407c-8749-6ba799cdbc14 | Z     | CEO, Healing Waves        |

**No "a" in member_profiles.** Only Atlas exists.

---

## 4. a vs atlas — Mismatch

| System              | a                                          | atlas                                      |
| ------------------- | ------------------------------------------ | ------------------------------------------ |
| **OpenClaw**        | ✓ In agents list, workspace /root/agents/a | ✗ Not in OpenClaw                          |
| **nexus-api auth**  | ✓ AGENT_TOKEN_A, member_id ef6c84d1...     | ✓ AGENT_TOKEN_ATLAS, member_id 145e59f5... |
| **member_profiles** | ✗ ef6c84d1... NOT in DB                    | ✓ Atlas (145e59f5...)                      |
| **Directory**       | /root/agents/a exists                      | /root/agents/atlas exists                  |

**auth.ts MEMBER_IDS.a** = `ef6c84d1-2efa-42f5-82f6-37ad6985167b` — **orphan** (no member_profiles row).

**a's TOOLS.md:** X/Twitter, LinkedIn, Dream 100 — Sefy's content. Uses "atlas-remote" browser (profile not in current OpenClaw config).

**atlas's TOOLS.md:** "Atlas's Integrations", member_id 145e59f5..., analyst role, Fathom, content platforms.

**q's TOOLS.md:** Lists "Atlas | Content (Sefy) | 145e59f5..."

---

## 5. Consolidation Recommendation

**If a = atlas (same agent):**

1. **Remove "a"** from OpenClaw, nexus-api auth
2. **Add "atlas"** to OpenClaw agents list (workspace /root/agents/atlas)
3. **Merge** /root/agents/a content into /root/agents/atlas (or vice versa)
4. **Delete** orphan member_id ef6c84d1... from auth.ts (or add "a" to member_profiles if keeping both)

**If a ≠ atlas (different agents):**

1. **Add "a"** to member_profiles (id: ef6c84d1..., name: "A", role: TBD)
2. **Add "atlas"** to OpenClaw if it should run

---

## 6. Canonical Agent List (for vault)

Based on **member_profiles** (source of truth for member_id):

| Agent | member_id                            | In OpenClaw | In nexus-api |
| ----- | ------------------------------------ | :---------: | :----------: |
| Aria  | 2d4a674a-9278-48f9-ba39-f7c8f9096b3f |      ✓      |      ✓       |
| Atlas | 145e59f5-a12f-48e3-92b9-f744a9a85391 |      ✗      |      ✓       |
| Bolt  | 165d3bb0-0a3b-4c81-94e0-ae39fddd9873 |      ✓      |      ✓       |
| Echo  | 96252105-bb4a-45c4-a5e5-5c0e583e3e73 |      ✓      |      ✓       |
| Finn  | 5e6cd25f-b8a1-4e95-801e-f4f9c98ebb36 |      ✓      |      ✓       |
| Kai   | 81c541fc-ce19-45a9-b772-37656171d999 |      ✓      |      ✓       |
| Nova  | 276f85ee-2cd4-4699-a9aa-eef675505d0b |      ✓      |      ✓       |
| Pixel | f5599ae5-9e9d-48b5-95e8-cbb5bcb4a3c0 |      ✓      |      ✓       |
| Pulse | 06a21d7f-d155-4b57-b047-721c15b03ca7 |      ✓      |      ✓       |
| Q     | 9a3dffbb-d321-469c-bc4d-b7e5d749bd16 |   (clawd)   |      ✓       |
| Sage  | 47e5709e-5ca6-478e-ab10-a5ba9c9a8f1a |      ✓      |      ✓       |
| Vera  | 6a4d06ea-680c-4e80-a3f6-8282596d9ec6 |      ✓      |      ✓       |
| Vibe  | 545c2f73-b4f5-4008-ad1a-4a8141f036a0 |      ✓      |      ✓       |
| Wave  | cf92b249-d05e-43f3-a2c2-fd769b076db9 |      ✓      |      ✓       |
| Z     | 60f07073-587b-407c-8749-6ba799cdbc14 |      ✓      |      ✓       |
| **a** | ef6c84d1-2efa-42f5-82f6-37ad6985167b |      ✓      |  ✓ (orphan)  |

**Decision needed:** Is "a" = Atlas? If yes, consolidate. If no, add "a" to member_profiles.
