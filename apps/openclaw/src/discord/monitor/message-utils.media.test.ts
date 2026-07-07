import type { Message } from "@buape/carbon";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchRemoteMedia = vi.fn();
const saveMediaBuffer = vi.fn();

vi.mock("../../media/fetch.js", () => ({
  fetchRemoteMedia: (...args: unknown[]) => fetchRemoteMedia(...args),
}));

vi.mock("../../media/store.js", () => ({
  saveMediaBuffer: (...args: unknown[]) => saveMediaBuffer(...args),
}));

const { resolveMediaList } = await import("./message-utils.js");

function asMessage(payload: Record<string, unknown>): Message {
  return payload as unknown as Message;
}

describe("resolveMediaList", () => {
  beforeEach(() => {
    fetchRemoteMedia.mockReset();
    saveMediaBuffer.mockReset();
  });

  it("passes the caller maxBytes limit to remote Discord attachment fetches", async () => {
    fetchRemoteMedia.mockResolvedValueOnce({
      buffer: Buffer.from("image"),
      contentType: "image/png",
      fileName: "image.png",
    });
    saveMediaBuffer.mockResolvedValueOnce({
      path: "/tmp/image.png",
      contentType: "image/png",
    });

    const result = await resolveMediaList(
      asMessage({
        attachments: [
          {
            url: "https://cdn.discordapp.com/image.png",
            content_type: "image/png",
            filename: "image.png",
          },
        ],
      }),
      5_000_000,
    );

    expect(fetchRemoteMedia).toHaveBeenCalledWith(expect.objectContaining({ maxBytes: 5_000_000 }));
    expect(result).toEqual([
      { path: "/tmp/image.png", contentType: "image/png", placeholder: "<media:image>" },
    ]);
  });
});
