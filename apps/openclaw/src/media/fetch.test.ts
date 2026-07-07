import { describe, expect, it, vi } from "vitest";
import { fetchRemoteMedia } from "./fetch.js";

function makeStream(chunks: Uint8Array[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

describe("fetchRemoteMedia", () => {
  it("rejects when content-length exceeds maxBytes", async () => {
    const lookupFn = vi.fn(async () => [{ address: "93.184.216.34", family: 4 as const }]);
    const fetchImpl = async () =>
      new Response(makeStream([new Uint8Array([1, 2, 3, 4, 5])]), {
        status: 200,
        headers: { "content-length": "5" },
      });

    await expect(
      fetchRemoteMedia({
        url: "https://example.com/file.bin",
        fetchImpl,
        maxBytes: 4,
        lookupFn: lookupFn as never,
      }),
    ).rejects.toThrow("exceeds maxBytes");
  });

  it("rejects when streamed payload exceeds maxBytes", async () => {
    const lookupFn = vi.fn(async () => [{ address: "93.184.216.34", family: 4 as const }]);
    const fetchImpl = async () =>
      new Response(makeStream([new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])]), {
        status: 200,
      });

    await expect(
      fetchRemoteMedia({
        url: "https://example.com/file.bin",
        fetchImpl,
        maxBytes: 4,
        lookupFn: lookupFn as never,
      }),
    ).rejects.toThrow("exceeds maxBytes");
  });

  it("enforces the default media size limit when maxBytes is omitted", async () => {
    const lookupFn = vi.fn(async () => [{ address: "93.184.216.34", family: 4 as const }]);
    const fetchImpl = async () =>
      new Response(makeStream([new Uint8Array([1])]), {
        status: 200,
        headers: { "content-length": String(200_000_000) },
      });

    await expect(
      fetchRemoteMedia({
        url: "https://example.com/file.bin",
        fetchImpl,
        lookupFn: lookupFn as never,
      }),
    ).rejects.toThrow("exceeds maxBytes");
  });

  it("bounds non-OK response bodies before building error snippets", async () => {
    const lookupFn = vi.fn(async () => [{ address: "93.184.216.34", family: 4 as const }]);
    let cancelCalled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(8192));
      },
      cancel() {
        cancelCalled = true;
      },
    });
    const fetchImpl = async () => new Response(body, { status: 500 });

    await expect(
      fetchRemoteMedia({
        url: "https://example.com/file.bin",
        fetchImpl,
        lookupFn: lookupFn as never,
        maxBytes: 1024,
      }),
    ).rejects.toThrow("Failed to fetch media");
    expect(cancelCalled).toBe(true);
  });

  it("blocks private IP literals before fetching", async () => {
    const fetchImpl = vi.fn();
    await expect(
      fetchRemoteMedia({
        url: "http://127.0.0.1/secret.jpg",
        fetchImpl,
        maxBytes: 1024,
      }),
    ).rejects.toThrow(/private|internal|blocked/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
