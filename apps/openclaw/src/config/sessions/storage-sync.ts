/**
 * Session Storage Sync
 *
 * Syncs JSONL session transcript files to/from durable storage
 * so sessions survive Fly.io machine restarts.
 *
 * - Download: before SessionManager.open() — restores session from durable storage
 * - Upload: after run completes — persists updated session to durable storage
 *
 * Routes through Agent API (localhost:3003) which proxies to Supabase Storage.
 * OpenClaw never touches Supabase directly.
 */

import fs from "node:fs";
import path from "node:path";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("sessions/storage-sync");

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

function getBackendUrl(): string {
  return process.env.VIBEY_BACKEND_URL?.trim() || "http://localhost:3003";
}

function sanitizeId(id: string): string {
  return encodeURIComponent(id.replace(/[^a-zA-Z0-9._-]/g, "_"));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries: number = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }
  throw lastError ?? new Error("fetch failed");
}

/**
 * Download a session JSONL from durable storage to local disk.
 * Returns true if the file was downloaded, false if it didn't exist in storage.
 */
export async function downloadSessionTranscript(params: {
  sessionFile: string;
  agentId: string;
  sessionId: string;
}): Promise<boolean> {
  if (fs.existsSync(params.sessionFile)) {
    return false;
  }

  const backendUrl = getBackendUrl();
  const agentId = sanitizeId(params.agentId);
  const sessionId = sanitizeId(params.sessionId);
  const url = `${backendUrl}/api/sessions/transcript/${agentId}/${sessionId}`;

  try {
    const res = await fetchWithRetry(url, {
      method: "GET",
      headers: { "x-openclaw-internal": "true" },
    });

    if (res.status === 404) {
      return false;
    }

    if (!res.ok) {
      log.warn(
        `storage-sync download failed: ${res.status} ${res.statusText} agentId=${params.agentId} sessionId=${params.sessionId}`,
      );
      return false;
    }

    const content = await res.text();
    if (!content.trim()) {
      return false;
    }

    await fs.promises.mkdir(path.dirname(params.sessionFile), { recursive: true });
    await fs.promises.writeFile(params.sessionFile, content, "utf-8");
    log.info(
      `storage-sync downloaded session: ${params.agentId}/${params.sessionId} -> ${params.sessionFile} (${content.length} bytes)`,
    );
    return true;
  } catch (err) {
    log.warn(
      `storage-sync download error: ${err instanceof Error ? err.message : String(err)} agentId=${params.agentId} sessionId=${params.sessionId}`,
    );
    return false;
  }
}

/**
 * Upload a session JSONL from local disk to durable storage.
 */
export async function uploadSessionTranscript(params: {
  sessionFile: string;
  agentId: string;
  sessionId: string;
}): Promise<boolean> {
  if (!fs.existsSync(params.sessionFile)) {
    return false;
  }

  const backendUrl = getBackendUrl();
  const agentId = sanitizeId(params.agentId);
  const sessionId = sanitizeId(params.sessionId);
  const url = `${backendUrl}/api/sessions/transcript/${agentId}/${sessionId}`;

  try {
    const content = await fs.promises.readFile(params.sessionFile, "utf-8");
    if (!content.trim()) {
      return false;
    }

    const res = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "x-openclaw-internal": "true",
        "Content-Type": "application/octet-stream",
      },
      body: content,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      log.warn(
        `storage-sync upload failed: ${res.status} ${res.statusText} agentId=${params.agentId} sessionId=${params.sessionId} err=${errText.slice(0, 200)}`,
      );
      return false;
    }

    log.info(
      `storage-sync uploaded session: ${params.sessionFile} -> ${params.agentId}/${params.sessionId} (${content.length} bytes)`,
    );
    return true;
  } catch (err) {
    log.warn(
      `storage-sync upload error: ${err instanceof Error ? err.message : String(err)} agentId=${params.agentId} sessionId=${params.sessionId}`,
    );
    return false;
  }
}

/**
 * Download the sessions.json store file from durable storage.
 */
export async function downloadSessionStore(params: {
  storePath: string;
  agentId: string;
}): Promise<boolean> {
  if (fs.existsSync(params.storePath)) {
    return false;
  }

  const backendUrl = getBackendUrl();
  const agentId = sanitizeId(params.agentId);
  const url = `${backendUrl}/api/sessions/store/${agentId}`;

  try {
    const res = await fetchWithRetry(url, {
      method: "GET",
      headers: { "x-openclaw-internal": "true" },
    });

    if (res.status === 404) {
      return false;
    }

    if (!res.ok) {
      return false;
    }

    const content = await res.text();
    if (!content.trim()) {
      return false;
    }

    await fs.promises.mkdir(path.dirname(params.storePath), { recursive: true });
    await fs.promises.writeFile(params.storePath, content, "utf-8");
    log.info(`storage-sync downloaded store: ${params.agentId} -> ${params.storePath}`);
    return true;
  } catch (err) {
    log.warn(
      `storage-sync store download error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

/**
 * Upload the sessions.json store file to durable storage.
 */
export async function uploadSessionStore(params: {
  storePath: string;
  agentId: string;
}): Promise<boolean> {
  if (!fs.existsSync(params.storePath)) {
    return false;
  }

  const backendUrl = getBackendUrl();
  const agentId = sanitizeId(params.agentId);
  const url = `${backendUrl}/api/sessions/store/${agentId}`;

  try {
    const content = await fs.promises.readFile(params.storePath, "utf-8");
    if (!content.trim()) {
      return false;
    }

    const res = await fetchWithRetry(url, {
      method: "PUT",
      headers: {
        "x-openclaw-internal": "true",
        "Content-Type": "application/json",
      },
      body: content,
    });

    if (!res.ok) {
      return false;
    }

    log.info(`storage-sync uploaded store: ${params.storePath} -> ${params.agentId}`);
    return true;
  } catch (err) {
    log.warn(
      `storage-sync store upload error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}
