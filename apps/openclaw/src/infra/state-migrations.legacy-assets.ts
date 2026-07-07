import fs from "node:fs";
import path from "node:path";
import type { LegacyStateDetection } from "./state-migrations.detection.js";
import {
  ensureDir,
  existsDir,
  fileExists,
  isLegacyWhatsAppAuthFile,
  safeReadDir,
} from "./state-migrations.fs.js";
import { migrateLegacySessions } from "./state-migrations.legacy-sessions.js";

function emptyDirOrMissing(dir: string): boolean {
  if (!existsDir(dir)) {
    return true;
  }
  return safeReadDir(dir).length === 0;
}

function removeDirIfEmpty(dir: string) {
  if (!existsDir(dir)) {
    return;
  }
  if (!emptyDirOrMissing(dir)) {
    return;
  }
  try {
    fs.rmdirSync(dir);
  } catch {
    // ignore
  }
}

export async function migrateLegacyAgentDir(
  detected: LegacyStateDetection,
  now: () => number,
): Promise<{ changes: string[]; warnings: string[] }> {
  const changes: string[] = [];
  const warnings: string[] = [];
  if (!detected.agentDir.hasLegacy) {
    return { changes, warnings };
  }

  ensureDir(detected.agentDir.targetDir);

  const entries = safeReadDir(detected.agentDir.legacyDir);
  for (const entry of entries) {
    const from = path.join(detected.agentDir.legacyDir, entry.name);
    const to = path.join(detected.agentDir.targetDir, entry.name);
    if (fs.existsSync(to)) {
      continue;
    }
    try {
      fs.renameSync(from, to);
      changes.push(`Moved agent file ${entry.name} → agents/${detected.targetAgentId}/agent`);
    } catch (err) {
      warnings.push(`Failed moving ${from}: ${String(err)}`);
    }
  }

  removeDirIfEmpty(detected.agentDir.legacyDir);
  if (!emptyDirOrMissing(detected.agentDir.legacyDir)) {
    const backupDir = path.join(
      detected.stateDir,
      "agents",
      detected.targetAgentId,
      `agent.legacy-${now()}`,
    );
    try {
      fs.renameSync(detected.agentDir.legacyDir, backupDir);
      warnings.push(`Left legacy agent dir at ${backupDir}`);
    } catch (err) {
      warnings.push(`Failed relocating legacy agent dir: ${String(err)}`);
    }
  }

  return { changes, warnings };
}

async function migrateLegacyWhatsAppAuth(
  detected: LegacyStateDetection,
): Promise<{ changes: string[]; warnings: string[] }> {
  const changes: string[] = [];
  const warnings: string[] = [];
  if (!detected.whatsappAuth.hasLegacy) {
    return { changes, warnings };
  }

  ensureDir(detected.whatsappAuth.targetDir);

  const entries = safeReadDir(detected.whatsappAuth.legacyDir);
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (entry.name === "oauth.json") {
      continue;
    }
    if (!isLegacyWhatsAppAuthFile(entry.name)) {
      continue;
    }
    const from = path.join(detected.whatsappAuth.legacyDir, entry.name);
    const to = path.join(detected.whatsappAuth.targetDir, entry.name);
    if (fileExists(to)) {
      continue;
    }
    try {
      fs.renameSync(from, to);
      changes.push(`Moved WhatsApp auth ${entry.name} → whatsapp/default`);
    } catch (err) {
      warnings.push(`Failed moving ${from}: ${String(err)}`);
    }
  }

  return { changes, warnings };
}

async function migrateLegacyTelegramPairingAllowFrom(
  detected: LegacyStateDetection,
): Promise<{ changes: string[]; warnings: string[] }> {
  const changes: string[] = [];
  const warnings: string[] = [];
  if (!detected.pairingAllowFrom.hasLegacyTelegram) {
    return { changes, warnings };
  }

  const legacyPath = detected.pairingAllowFrom.legacyTelegramPath;
  const targetPath = detected.pairingAllowFrom.targetTelegramPath;
  try {
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(legacyPath, targetPath);
    changes.push(`Copied Telegram pairing allowFrom → ${targetPath}`);
  } catch (err) {
    warnings.push(`Failed migrating Telegram pairing allowFrom (${legacyPath}): ${String(err)}`);
  }

  return { changes, warnings };
}

export async function runLegacyStateMigrations(params: {
  detected: LegacyStateDetection;
  now?: () => number;
}): Promise<{ changes: string[]; warnings: string[] }> {
  const now = params.now ?? (() => Date.now());
  const detected = params.detected;
  const sessions = await migrateLegacySessions(detected, now);
  const agentDir = await migrateLegacyAgentDir(detected, now);
  const whatsappAuth = await migrateLegacyWhatsAppAuth(detected);
  const telegramPairingAllowFrom = await migrateLegacyTelegramPairingAllowFrom(detected);
  return {
    changes: [
      ...sessions.changes,
      ...agentDir.changes,
      ...whatsappAuth.changes,
      ...telegramPairingAllowFrom.changes,
    ],
    warnings: [
      ...sessions.warnings,
      ...agentDir.warnings,
      ...whatsappAuth.warnings,
      ...telegramPairingAllowFrom.warnings,
    ],
  };
}
