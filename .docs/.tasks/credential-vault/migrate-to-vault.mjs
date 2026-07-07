#!/usr/bin/env node
/**
 * Migrate credentials from TOOLS.md into credential_vault.
 * Run on server: cd /root/nexus-api && node migrate-to-vault.mjs
 * Requires: CREDENTIAL_VAULT_ENCRYPTION_KEY, DATABASE_URL, FATHOM_API_KEY in .env
 * Uses direct pg connection to bypass RLS (postgres role has policy).
 */
import "dotenv/config";
import pg from "pg";
import { createCipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  const raw = process.env.CREDENTIAL_VAULT_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("CREDENTIAL_VAULT_ENCRYPTION_KEY required");
  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length >= 32) return buf.subarray(0, 32);
  } catch {}
  return Buffer.from(raw.slice(0, 32).padEnd(32, "0"), "utf8");
}

function encrypt(plaintext) {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]).toString("base64");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const MEMBER_IDS = {
  bolt: "165d3bb0-0a3b-4c81-94e0-ae39fddd9873",
  echo: "96252105-bb4a-45c4-a5e5-5c0e583e3e73",
  pulse: "06a21d7f-d155-4b57-b047-721c15b03ca7",
  wave: "cf92b249-d05e-43f3-a2c2-fd769b076db9",
  clawd: "9a3dffbb-d321-469c-bc4d-b7e5d749bd16",
  nova: "276f85ee-2cd4-4699-a9aa-eef675505d0b",
  aria: "2d4a674a-9278-48f9-ba39-f7c8f9096b3f",
  atlas: "145e59f5-a12f-48e3-92b9-f744a9a85391",
  sage: "47e5709e-5ca6-478e-ab10-a5ba9c9a8f1a",
  vibe: "545c2f73-b4f5-4008-ad1a-4a8141f036a0",
  finn: "5e6cd25f-b8a1-4e95-801e-f4f9c98ebb36",
};

// Use scope 'default' for services without scope (avoids Postgres UNIQUE null handling)
const CREDENTIALS = [
  { service_key: "shopify", scope: "healing_waves", value: "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", agents: ["bolt", "echo", "pulse", "wave", "clawd"] },
  { service_key: "kit", scope: "default", value: "kit_a95554958ec4915245254daa5a1094c7", agents: ["echo", "nova", "pulse", "wave"] },
  { service_key: "manychat", scope: "healing_waves", value: "1961342:35281d7c43d3dc426e62a92ea8a95068", agents: ["echo", "wave"] },
  { service_key: "stripe", scope: "live", value: "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", agents: ["echo", "pulse"] },
  { service_key: "fathom", scope: "default", value: process.env.FATHOM_API_KEY, agents: ["aria", "atlas"] },
  { service_key: "elevenlabs", scope: "default", value: "sk_8d9602e95791ae02206da78941d1d63efd82b9481e6dd1fc", agents: ["wave", "clawd", "sage"] },
  { service_key: "youtube", scope: "default", value: "AIzaSyD5kxZuMwgrss40vN7Nto9-dWZdjW8z7lk", agents: ["sage", "clawd"] },
  { service_key: "cloudflare", scope: "default", value: "mzzh6bLXgx2qXR0rzwXllKBCma5YhGeLKc1o5o2D", agents: ["vibe", "clawd"] },
  { service_key: "vercel", scope: "default", value: "K3Dyqx8Fy2y9FTRQMH3wCyol", agents: ["vibe", "clawd"] },
  { service_key: "github", scope: "default", value: "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", agents: ["clawd"] },
  { service_key: "airtable", scope: "default", value: "patgpawrWUbQqYbIE.629432d4d3f377e3afefc7a786e6dedb21fe95de7ea05a8502ae1077ac6aacfd", agents: ["clawd"] },
  { service_key: "n8n", scope: "default", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1YzI1NDFhZS00Y2ZlLTRlNTktYjdmZi04ZTE3MTI2NjQ5NjgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcwMTIwODgyfQ.ooVW-gPq8eVS-O42nF-UJL98xhU3DFsT_fTC8HJsSkE", agents: ["clawd"] },
  { service_key: "quickbooks", scope: "default", value: "1Y1Tm3fv7HWt8LQ0Y6vb8Qqdb9eGRMtOREaNOHiI", agents: ["finn"] },
];

async function main() {
  const client = await pool.connect();
  try {
    for (const c of CREDENTIALS) {
      if (!c.value) {
        console.warn(`Skipping ${c.service_key}:${c.scope || "default"} - no value`);
        continue;
      }
      const allowed_agents = c.agents.map((a) => MEMBER_IDS[a]).filter(Boolean);
      const encrypted_value = encrypt(c.value);
      await client.query(
        `INSERT INTO credential_vault (service_key, scope, encrypted_value, allowed_agents, revoked)
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT (service_key, scope) DO UPDATE SET
           encrypted_value = EXCLUDED.encrypted_value,
           allowed_agents = EXCLUDED.allowed_agents,
           updated_at = now()`,
        [c.service_key, c.scope, encrypted_value, allowed_agents]
      );
      console.log(`OK ${c.service_key}:${c.scope} -> ${allowed_agents.length} agents`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
