import { describe, expect, it } from "vitest";
import {
  htmlToMarkdown,
  markdownToText,
  shrinkEmbeddedMedia,
} from "./web-fetch-utils.js";

describe("web-fetch-utils media extraction", () => {
  it("shrinks inline data-URI payloads without deleting the media token", () => {
    const huge = `data:image/webp;base64,${"A".repeat(5000)}`;
    const html = `<img src="${huge}" alt="Coach" />`;
    const shrunk = shrinkEmbeddedMedia(html);
    expect(shrunk).toContain("data:image/placeholder;base64,SHORT");
    expect(shrunk.length).toBeLessThan(html.length);
    expect(shrunk).not.toContain("AAAA");
  });

  it("keeps image presence and drops GHL PHOTO→IG placeholders", () => {
    const html = `
      <html><head><title>The LAB</title></head><body>
        <h2>Meet the Coaches</h2>
        <div>
          <img src="data:image/webp;base64,AAAA" alt="Gavin Ekstrom" />
          <span>PHOTO → IG</span>
          <p>Gavin Ekstrom</p>
        </div>
        <div>
          <img src="https://cdn.example.com/oleg.jpg" alt="Oleg Tkach" />
          <span>PHOTO -> IG</span>
          <p>Oleg Tkach</p>
        </div>
      </body></html>
    `;
    const { text, title } = htmlToMarkdown(html);
    expect(title).toBe("The LAB");
    expect(text).toContain("![Gavin Ekstrom](embedded-image)");
    expect(text).toContain("![Oleg Tkach](https://cdn.example.com/oleg.jpg)");
    expect(text).toContain("Gavin Ekstrom");
    expect(text).not.toMatch(/PHOTO\s*(?:→|->)\s*IG/i);
  });

  it("keeps image markers when converting markdown to plain text", () => {
    const text = markdownToText(
      "## Coaches\n\n![Gavin](embedded-image)\n\nPHOTO → IG\n\nGavin Ekstrom",
    );
    expect(text).toContain("[image: Gavin]");
    expect(text).toContain("Gavin Ekstrom");
    expect(text).not.toMatch(/PHOTO\s*(?:→|->)\s*IG/i);
  });
});
