import path from "node:path";
import type { LookupFn, SsrFPolicy } from "../infra/net/ssrf.js";
import { fetchWithSsrFGuard } from "../infra/net/fetch-guard.js";
import { maxBytesForKind } from "./constants.js";
import { detectMime, extensionForMime } from "./mime.js";
import { readResponseWithLimit } from "./read-response-with-limit.js";

type FetchMediaResult = {
  buffer: Buffer;
  contentType?: string;
  fileName?: string;
};

export type MediaFetchErrorCode = "max_bytes" | "http_error" | "fetch_failed";

export class MediaFetchError extends Error {
  readonly code: MediaFetchErrorCode;

  constructor(code: MediaFetchErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "MediaFetchError";
  }
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type FetchMediaOptions = {
  url: string;
  fetchImpl?: FetchLike;
  filePathHint?: string;
  maxBytes?: number;
  maxRedirects?: number;
  ssrfPolicy?: SsrFPolicy;
  lookupFn?: LookupFn;
};

const ERROR_BODY_SNIPPET_MAX_BYTES = 4096;

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function parseContentDispositionFileName(header?: string | null): string | undefined {
  if (!header) {
    return undefined;
  }
  const starMatch = /filename\*\s*=\s*([^;]+)/i.exec(header);
  if (starMatch?.[1]) {
    const cleaned = stripQuotes(starMatch[1].trim());
    const encoded = cleaned.split("''").slice(1).join("''") || cleaned;
    try {
      return path.basename(decodeURIComponent(encoded));
    } catch {
      return path.basename(encoded);
    }
  }
  const match = /filename\s*=\s*([^;]+)/i.exec(header);
  if (match?.[1]) {
    return path.basename(stripQuotes(match[1].trim()));
  }
  return undefined;
}

async function readErrorBodySnippet(
  res: Response,
  maxBytes: number,
  maxChars = 200,
): Promise<string | undefined> {
  try {
    const buffer = await readResponseWithLimit(
      res,
      Math.min(maxBytes, ERROR_BODY_SNIPPET_MAX_BYTES),
      {
        onOverflow: () => new MediaFetchError("max_bytes", "Error response body exceeds limit"),
      },
    );
    const text = buffer.toString("utf8");
    if (!text) {
      return undefined;
    }
    const collapsed = text.replace(/\s+/g, " ").trim();
    if (!collapsed) {
      return undefined;
    }
    if (collapsed.length <= maxChars) {
      return collapsed;
    }
    return `${collapsed.slice(0, maxChars)}...`;
  } catch {
    return undefined;
  }
}

export async function fetchRemoteMedia(options: FetchMediaOptions): Promise<FetchMediaResult> {
  const { url, fetchImpl, filePathHint, maxBytes, maxRedirects, ssrfPolicy, lookupFn } = options;
  const effectiveMaxBytes =
    typeof maxBytes === "number" && Number.isFinite(maxBytes) && maxBytes > 0
      ? maxBytes
      : maxBytesForKind("unknown");

  let res: Response;
  let finalUrl = url;
  let release: (() => Promise<void>) | null = null;
  try {
    const result = await fetchWithSsrFGuard({
      url,
      fetchImpl,
      maxRedirects,
      policy: ssrfPolicy,
      lookupFn,
    });
    res = result.response;
    finalUrl = result.finalUrl;
    release = result.release;
  } catch (err) {
    throw new MediaFetchError("fetch_failed", `Failed to fetch media from ${url}: ${String(err)}`);
  }

  try {
    if (!res.ok) {
      const statusText = res.statusText ? ` ${res.statusText}` : "";
      const redirected = finalUrl !== url ? ` (redirected to ${finalUrl})` : "";
      let detail = `HTTP ${res.status}${statusText}`;
      if (!res.body) {
        detail = `HTTP ${res.status}${statusText}; empty response body`;
      } else {
        const snippet = await readErrorBodySnippet(res, effectiveMaxBytes);
        if (snippet) {
          detail += `; body: ${snippet}`;
        }
      }
      throw new MediaFetchError(
        "http_error",
        `Failed to fetch media from ${url}${redirected}: ${detail}`,
      );
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      const length = Number(contentLength);
      if (Number.isFinite(length) && length > effectiveMaxBytes) {
        throw new MediaFetchError(
          "max_bytes",
          `Failed to fetch media from ${url}: content length ${length} exceeds maxBytes ${effectiveMaxBytes}`,
        );
      }
    }

    const buffer = await readResponseWithLimit(res, effectiveMaxBytes, {
      onOverflow: ({ maxBytes: overflowMaxBytes, res: overflowRes }) =>
        new MediaFetchError(
          "max_bytes",
          `Failed to fetch media from ${overflowRes.url || url}: payload exceeds maxBytes ${overflowMaxBytes}`,
        ),
    });
    let fileNameFromUrl: string | undefined;
    try {
      const parsed = new URL(finalUrl);
      const base = path.basename(parsed.pathname);
      fileNameFromUrl = base || undefined;
    } catch {
      // ignore parse errors; leave undefined
    }

    const headerFileName = parseContentDispositionFileName(res.headers.get("content-disposition"));
    let fileName =
      headerFileName || fileNameFromUrl || (filePathHint ? path.basename(filePathHint) : undefined);

    const filePathForMime =
      headerFileName && path.extname(headerFileName) ? headerFileName : (filePathHint ?? finalUrl);
    const contentType = await detectMime({
      buffer,
      headerMime: res.headers.get("content-type"),
      filePath: filePathForMime,
    });
    if (fileName && !path.extname(fileName) && contentType) {
      const ext = extensionForMime(contentType);
      if (ext) {
        fileName = `${fileName}${ext}`;
      }
    }

    return {
      buffer,
      contentType: contentType ?? undefined,
      fileName,
    };
  } finally {
    if (release) {
      await release();
    }
  }
}
