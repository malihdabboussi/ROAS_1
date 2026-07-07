import fs from "node:fs";
import path from "node:path";
import type { SessionEntry } from "../config/sessions.js";
import type { LegacyStateDetection } from "./state-migrations.detection.js";
import { saveSessionStore } from "../config/sessions.js";
import { buildAgentMainSessionKey } from "../routing/session-key.js";
import {
  ensureDir,
  existsDir,
  fileExists,
  readSessionStoreJson5,
  safeReadDir,
  type SessionEntryLike,
} from "./state-migrations.fs.js";
import {
  canonicalizeSessionStore,
  mergeSessionEntry,
  normalizeSessionEntry,
  pickLatestLegacyDirectEntry,
} from "./state-migrations.session-store.js";

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

export async function migrateLegacySessions(
  detected: LegacyStateDetection,
  now: () => number,
): Promise<{ changes: string[]; warnings: string[] }> {
  const changes: string[] = [];
  const warnings: string[] = [];
  if (!detected.sessions.hasLegacy) {
    return { changes, warnings };
  }

  ensureDir(detected.sessions.targetDir);

  const legacyParsed = fileExists(detected.sessions.legacyStorePath)
    ? readSessionStoreJson5(detected.sessions.legacyStorePath)
    : { store: {}, ok: true };
  const targetParsed = fileExists(detected.sessions.targetStorePath)
    ? readSessionStoreJson5(detected.sessions.targetStorePath)
    : { store: {}, ok: true };
  const legacyStore = legacyParsed.store;
  const targetStore = targetParsed.store;

  const canonicalizedTarget = canonicalizeSessionStore({
    store: targetStore,
    agentId: detected.targetAgentId,
    mainKey: detected.targetMainKey,
    scope: detected.targetScope,
  });
  const canonicalizedLegacy = canonicalizeSessionStore({
    store: legacyStore,
    agentId: detected.targetAgentId,
    mainKey: detected.targetMainKey,
    scope: detected.targetScope,
  });

  const merged: Record<string, SessionEntryLike> = {
    ...canonicalizedTarget.store,
  };
  for (const [key, entry] of Object.entries(canonicalizedLegacy.store)) {
    merged[key] = mergeSessionEntry({
      existing: merged[key],
      incoming: entry,
      preferIncomingOnTie: false,
    });
  }

  const mainKey = buildAgentMainSessionKey({
    agentId: detected.targetAgentId,
    mainKey: detected.targetMainKey,
  });
  if (!merged[mainKey]) {
    const latest = pickLatestLegacyDirectEntry(legacyStore);
    if (latest?.sessionId) {
      merged[mainKey] = latest;
      changes.push(`Migrated latest direct-chat session → ${mainKey}`);
    }
  }

  if (!legacyParsed.ok) {
    warnings.push(
      `Legacy sessions store unreadable; left in place at ${detected.sessions.legacyStorePath}`,
    );
  }

  if (
    (legacyParsed.ok || targetParsed.ok) &&
    (Object.keys(legacyStore).length > 0 || Object.keys(targetStore).length > 0)
  ) {
    const normalized: Record<string, SessionEntry> = {};
    for (const [key, entry] of Object.entries(merged)) {
      const normalizedEntry = normalizeSessionEntry(entry);
      if (!normalizedEntry) {
        continue;
      }
      normalized[key] = normalizedEntry;
    }
    await saveSessionStore(detected.sessions.targetStorePath, normalized, {
      skipMaintenance: true,
    });
    changes.push(`Merged sessions store → ${detected.sessions.targetStorePath}`);
    if (canonicalizedTarget.legacyKeys.length > 0) {
      changes.push(`Canonicalized ${canonicalizedTarget.legacyKeys.length} legacy session key(s)`);
    }
  }

  const entries = safeReadDir(detected.sessions.legacyDir);
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    if (entry.name === "sessions.json") {
      continue;
    }
    const from = path.join(detected.sessions.legacyDir, entry.name);
    const to = path.join(detected.sessions.targetDir, entry.name);
    if (fileExists(to)) {
      continue;
    }
    try {
      fs.renameSync(from, to);
      changes.push(`Moved ${entry.name} → agents/${detected.targetAgentId}/sessions`);
    } catch (err) {
      warnings.push(`Failed moving ${from}: ${String(err)}`);
    }
  }

  if (legacyParsed.ok) {
    try {
      if (fileExists(detected.sessions.legacyStorePath)) {
        fs.rmSync(detected.sessions.legacyStorePath, { force: true });
      }
    } catch {
      // ignore
    }
  }

  removeDirIfEmpty(detected.sessions.legacyDir);
  const legacyLeft = safeReadDir(detected.sessions.legacyDir).filter((e) => e.isFile());
  if (legacyLeft.length > 0) {
    const backupDir = `${detected.sessions.legacyDir}.legacy-${now()}`;
    try {
      fs.renameSync(detected.sessions.legacyDir, backupDir);
      warnings.push(`Left legacy sessions at ${backupDir}`);
    } catch {
      // ignore
    }
  }

  return { changes, warnings };
}
