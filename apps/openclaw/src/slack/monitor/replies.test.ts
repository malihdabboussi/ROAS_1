import { describe, expect, it, vi } from "vitest";
import { deliverSlackSlashReplies } from "./replies.js";

describe("deliverSlackSlashReplies", () => {
  it("passes native Slack table blocks to slash command responses", async () => {
    const respond = vi.fn().mockResolvedValue(undefined);

    await deliverSlackSlashReplies({
      replies: [
        {
          text: `
Here is the table

| Name | Value |
| ---- | ----- |
| A    | 1     |
`.trim(),
        },
      ],
      respond,
      ephemeral: true,
      textLimit: 4000,
      tableMode: "code",
    });

    expect(respond).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Here is the table"),
        response_type: "ephemeral",
        blocks: expect.arrayContaining([expect.objectContaining({ type: "table" })]),
      }),
    );
  });

  it("skips empty and silent slash replies", async () => {
    const respond = vi.fn().mockResolvedValue(undefined);

    await deliverSlackSlashReplies({
      replies: [{ text: "" }, { text: "NO_REPLY" }],
      respond,
      ephemeral: false,
      textLimit: 4000,
      tableMode: "code",
    });

    expect(respond).not.toHaveBeenCalled();
  });
});
