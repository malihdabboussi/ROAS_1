import os from "node:os";
import path from "node:path";
import type { OpenClawConfig } from "../config/config.js";
import type { SessionScope } from "../config/sessions/types.js";
import { resolveDefaultAgentId } from "../agents/agent-scope.js";
import { resolveOAuthDir, resolveStateDir } from "../config/paths.js";
import { DEFAULT_ACCOUNT_ID, DEFAULT_MAIN_KEY, normalizeAgentId } from "../routing/session-key.js";
import {
  existsDir,
  fileExists,
  readSessionStoreJson5,
  safeReadDir,
} from "./state-migrations.fs.js";
import { listLegacySessionKeys } from "./state-migrations.session-store.js";

export type LegacyStateDetection = {
  targetAgentId: string;
  targetMainKey: string;
  targetScope?: SessionScope;
  stateDir: string;
  oauthDir: string;
  sessions: {
    legacyDir: string;
    legacyStorePath: string;
    targetDir: string;
    targetStorePath: string;
    hasLegacy: boolean;
    legacyKeys: string[];
  };
  agentDir: {
    legacyDir: string;
    targetDir: string;
    hasLegacy: boolean;
  };
  whatsappAuth: {
    legacyDir: string;
    targetDir: string;
    hasLegacy: boolean;
  };
  pairingAllowFrom: {
    legacyTelegramPath: string;
    targetTelegramPath: string;
    hasLegacyTelegram: boolean;
  };
  preview: string[];
};

export async function detectLegacyStateMigrations(params: {
  cfg: OpenClawConfig;
  env?: NodeJS.ProcessEnv;
  homedir?: () => string;
}): Promise<LegacyStateDetection> {
  const env = params.env ?? process.env;
  const homedir = params.homedir ?? os.homedir;
  const stateDir = resolveStateDir(env, homedir);
  const oauthDir = resolveOAuthDir(env, stateDir);

  const targetAgentId = normalizeAgentId(resolveDefaultAgentId(params.cfg));
  const rawMainKey = params.cfg.session?.mainKey;
  const targetMainKey =
    typeof rawMainKey === "string" && rawMainKey.trim().length > 0
      ? rawMainKey.trim()
      : DEFAULT_MAIN_KEY;
  const targetScope = params.cfg.session?.scope;

  const sessionsLegacyDir = path.join(stateDir, "sessions");
  const sessionsLegacyStorePath = path.join(sessionsLegacyDir, "sessions.json");
  const sessionsTargetDir = path.join(stateDir, "agents", targetAgentId, "sessions");
  const sessionsTargetStorePath = path.join(sessionsTargetDir, "sessions.json");
  const legacySessionEntries = safeReadDir(sessionsLegacyDir);
  const hasLegacySessions =
    fileExists(sessionsLegacyStorePath) ||
    legacySessionEntries.some((e) => e.isFile() && e.name.endsWith(".jsonl"));

  const targetSessionParsed = fileExists(sessionsTargetStorePath)
    ? readSessionStoreJson5(sessionsTargetStorePath)
    : { store: {}, ok: true };
  const legacyKeys = targetSessionParsed.ok
    ? listLegacySessionKeys({
        store: targetSessionParsed.store,
        agentId: targetAgentId,
        mainKey: targetMainKey,
        scope: targetScope,
      })
    : [];

  const legacyAgentDir = path.join(stateDir, "agent");
  const targetAgentDir = path.join(stateDir, "agents", targetAgentId, "agent");
  const hasLegacyAgentDir = existsDir(legacyAgentDir);

  const targetWhatsAppAuthDir = path.join(oauthDir, "whatsapp", DEFAULT_ACCOUNT_ID);
  const hasLegacyWhatsAppAuth =
    fileExists(path.join(oauthDir, "creds.json")) &&
    !fileExists(path.join(targetWhatsAppAuthDir, "creds.json"));
  const legacyTelegramAllowFromPath = path.join(oauthDir, "telegram-allowFrom.json");
  const targetTelegramAllowFromPath = path.join(
    oauthDir,
    `telegram-${DEFAULT_ACCOUNT_ID}-allowFrom.json`,
  );
  const hasLegacyTelegramAllowFrom =
    fileExists(legacyTelegramAllowFromPath) && !fileExists(targetTelegramAllowFromPath);

  const preview: string[] = [];
  if (hasLegacySessions) {
    preview.push(`- Sessions: ${sessionsLegacyDir} → ${sessionsTargetDir}`);
  }
  if (legacyKeys.length > 0) {
    preview.push(`- Sessions: canonicalize legacy keys in ${sessionsTargetStorePath}`);
  }
  if (hasLegacyAgentDir) {
    preview.push(`- Agent dir: ${legacyAgentDir} → ${targetAgentDir}`);
  }
  if (hasLegacyWhatsAppAuth) {
    preview.push(`- WhatsApp auth: ${oauthDir} → ${targetWhatsAppAuthDir} (keep oauth.json)`);
  }
  if (hasLegacyTelegramAllowFrom) {
    preview.push(
      `- Telegram pairing allowFrom: ${legacyTelegramAllowFromPath} → ${targetTelegramAllowFromPath}`,
    );
  }

  return {
    targetAgentId,
    targetMainKey,
    targetScope,
    stateDir,
    oauthDir,
    sessions: {
      legacyDir: sessionsLegacyDir,
      legacyStorePath: sessionsLegacyStorePath,
      targetDir: sessionsTargetDir,
      targetStorePath: sessionsTargetStorePath,
      hasLegacy: hasLegacySessions || legacyKeys.length > 0,
      legacyKeys,
    },
    agentDir: {
      legacyDir: legacyAgentDir,
      targetDir: targetAgentDir,
      hasLegacy: hasLegacyAgentDir,
    },
    whatsappAuth: {
      legacyDir: oauthDir,
      targetDir: targetWhatsAppAuthDir,
      hasLegacy: hasLegacyWhatsAppAuth,
    },
    pairingAllowFrom: {
      legacyTelegramPath: legacyTelegramAllowFromPath,
      targetTelegramPath: targetTelegramAllowFromPath,
      hasLegacyTelegram: hasLegacyTelegramAllowFrom,
    },
    preview,
  };
}
