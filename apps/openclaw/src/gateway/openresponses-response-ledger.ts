import fs from "node:fs/promises";
import path from "node:path";
import { resolveStateDir } from "../config/paths.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("gateway/openresponses-ledger");

const LEDGER_VERSION = 1;
const MAX_ENTRIES = 5_000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type OpenResponsesLedgerStore = {
  version: number;
  entries: Record<string, OpenResponsesLedgerEntry>;
  providerIndex: Record<string, string>;
};

export type OpenResponsesLedgerEntry = {
  responseId: string;
  providerResponseId?: string;
  parentResponseId?: string;
  sessionKey: string;
  agentId: string;
  status: "completed" | "failed" | "incomplete" | "in_progress" | "cancelled";
  createdAt: number;
};

const DEFAULT_STORE: OpenResponsesLedgerStore = {
  version: LEDGER_VERSION,
  entries: {},
  providerIndex: {},
};

let writeQueue: Promise<void> = Promise.resolve();

function resolveLedgerPath(): string {
  return path.join(resolveStateDir(), "gateway", "openresponses-response-ledger.json");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeStore(raw: unknown): OpenResponsesLedgerStore {
  if (!isRecord(raw)) {
    return structuredClone(DEFAULT_STORE);
  }
  const entriesRaw = isRecord(raw.entries) ? raw.entries : {};
  const providerIndexRaw = isRecord(raw.providerIndex) ? raw.providerIndex : {};
  const entries: Record<string, OpenResponsesLedgerEntry> = {};
  for (const [responseId, value] of Object.entries(entriesRaw)) {
    if (!isRecord(value)) {
      continue;
    }
    const sessionKey = typeof value.sessionKey === "string" ? value.sessionKey : "";
    const agentId = typeof value.agentId === "string" ? value.agentId : "";
    if (!responseId || !sessionKey || !agentId) {
      continue;
    }
    entries[responseId] = {
      responseId,
      sessionKey,
      agentId,
      status:
        value.status === "completed" ||
        value.status === "failed" ||
        value.status === "incomplete" ||
        value.status === "in_progress" ||
        value.status === "cancelled"
          ? value.status
          : "completed",
      createdAt: typeof value.createdAt === "number" ? value.createdAt : Date.now(),
      ...(typeof value.providerResponseId === "string"
        ? { providerResponseId: value.providerResponseId }
        : {}),
      ...(typeof value.parentResponseId === "string"
        ? { parentResponseId: value.parentResponseId }
        : {}),
    };
  }
  const providerIndex: Record<string, string> = {};
  for (const [providerResponseId, responseId] of Object.entries(providerIndexRaw)) {
    if (!providerResponseId || typeof responseId !== "string") {
      continue;
    }
    if (entries[responseId]) {
      providerIndex[providerResponseId] = responseId;
    }
  }
  return {
    version: typeof raw.version === "number" ? raw.version : LEDGER_VERSION,
    entries,
    providerIndex,
  };
}

async function loadLedgerStore(): Promise<OpenResponsesLedgerStore> {
  const ledgerPath = resolveLedgerPath();
  try {
    const raw = await fs.readFile(ledgerPath, "utf-8");
    return normalizeStore(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

async function saveLedgerStore(store: OpenResponsesLedgerStore): Promise<void> {
  const ledgerPath = resolveLedgerPath();
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
  const tmpPath = `${ledgerPath}.${process.pid}.${Date.now()}.tmp`;
  const serialized = JSON.stringify(store, null, 2);
  await fs.writeFile(tmpPath, serialized, { encoding: "utf-8", mode: 0o600 });
  await fs.rename(tmpPath, ledgerPath);
}

function pruneStore(store: OpenResponsesLedgerStore): OpenResponsesLedgerStore {
  const now = Date.now();
  const minCreatedAt = now - MAX_AGE_MS;
  const entriesByCreatedAt = Object.values(store.entries).toSorted(
    (a, b) => b.createdAt - a.createdAt,
  );
  const kept = entriesByCreatedAt
    .filter((entry) => entry.createdAt >= minCreatedAt)
    .slice(0, MAX_ENTRIES);
  const nextEntries: Record<string, OpenResponsesLedgerEntry> = {};
  const nextProviderIndex: Record<string, string> = {};
  for (const entry of kept) {
    nextEntries[entry.responseId] = entry;
    if (entry.providerResponseId) {
      nextProviderIndex[entry.providerResponseId] = entry.responseId;
    }
  }
  return {
    version: LEDGER_VERSION,
    entries: nextEntries,
    providerIndex: nextProviderIndex,
  };
}

async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return await next;
}

export async function recordOpenResponsesLedgerEntry(
  entry: OpenResponsesLedgerEntry,
): Promise<void> {
  await withWriteLock(async () => {
    const store = await loadLedgerStore();
    store.entries[entry.responseId] = entry;
    if (entry.providerResponseId) {
      store.providerIndex[entry.providerResponseId] = entry.responseId;
    }
    const pruned = pruneStore(store);
    await saveLedgerStore(pruned);
  }).catch((err) => {
    log.warn("failed to persist openresponses ledger entry", {
      error: String(err),
      responseId: entry.responseId,
    });
  });
}

export async function findOpenResponsesLedgerEntry(
  previousResponseId: string,
): Promise<OpenResponsesLedgerEntry | null> {
  const requested = previousResponseId.trim();
  if (!requested) {
    return null;
  }
  const store = await loadLedgerStore();
  const direct = store.entries[requested];
  if (direct) {
    return direct;
  }
  const mappedResponseId = store.providerIndex[requested];
  if (!mappedResponseId) {
    return null;
  }
  return store.entries[mappedResponseId] ?? null;
}
