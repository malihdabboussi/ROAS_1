import JSZip from "jszip";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { isPathWithinBase } from "../../test/helpers/paths.js";
import { captureEnv } from "../test-utils/env.js";

describe("media store", () => {
  let store: typeof import("./store.js");
  let home = "";
  let envSnapshot: ReturnType<typeof captureEnv>;

  beforeAll(async () => {
    envSnapshot = captureEnv([
      "HOME",
      "USERPROFILE",
      "HOMEDRIVE",
      "HOMEPATH",
      "OPENCLAW_STATE_DIR",
    ]);
    home = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-test-home-"));
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    process.env.OPENCLAW_STATE_DIR = path.join(home, ".openclaw");
    if (process.platform === "win32") {
      const match = home.match(/^([A-Za-z]:)(.*)$/);
      if (match) {
        process.env.HOMEDRIVE = match[1];
        process.env.HOMEPATH = match[2] || "\\";
      }
    }
    await fs.mkdir(path.join(home, ".openclaw"), { recursive: true });
    store = await import("./store.js");
  });

  afterAll(async () => {
    envSnapshot.restore();
    try {
      await fs.rm(home, { recursive: true, force: true });
    } catch {
      // ignore cleanup failures in tests
    }
  });

  async function withTempStore<T>(
    fn: (store: typeof import("./store.js"), home: string) => Promise<T>,
  ): Promise<T> {
    return await fn(store, home);
  }

  it("creates and returns media directory", async () => {
    await withTempStore(async (storeAt54, homeAt54) => {
      const dir = await storeAt54.ensureMediaDir();
      expect(isPathWithinBase(homeAt54, dir)).toBe(true);
      expect(path.normalize(dir)).toContain(`${path.sep}.openclaw${path.sep}media`);
      const stat = await fs.stat(dir);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  it("saves buffers and enforces size limit", async () => {
    await withTempStore(async (storeAt64) => {
      const buf = Buffer.from("hello");
      const saved = await storeAt64.saveMediaBuffer(buf, "text/plain");
      const savedStat = await fs.stat(saved.path);
      expect(savedStat.size).toBe(buf.length);
      expect(saved.contentType).toBe("text/plain");
      expect(saved.path.endsWith(".txt")).toBe(true);

      const jpeg = await sharp({
        create: { width: 2, height: 2, channels: 3, background: "#123456" },
      })
        .jpeg({ quality: 80 })
        .toBuffer();
      const savedJpeg = await storeAt64.saveMediaBuffer(jpeg, "image/jpeg");
      expect(savedJpeg.contentType).toBe("image/jpeg");
      expect(savedJpeg.path.endsWith(".jpg")).toBe(true);

      const huge = Buffer.alloc(5 * 1024 * 1024 + 1);
      await expect(storeAt64.saveMediaBuffer(huge)).rejects.toThrow("Media exceeds 5MB limit");
    });
  });

  it("copies local files and cleans old media", async () => {
    await withTempStore(async (storeAt87, homeAt87) => {
      const srcFile = path.join(homeAt87, "tmp-src.txt");
      await fs.mkdir(homeAt87, { recursive: true });
      await fs.writeFile(srcFile, "local file");
      const saved = await storeAt87.saveMediaSource(srcFile);
      expect(saved.size).toBe(10);
      const savedStat = await fs.stat(saved.path);
      expect(savedStat.isFile()).toBe(true);
      expect(path.extname(saved.path)).toBe(".txt");

      // make the file look old and ensure cleanOldMedia removes it
      const past = Date.now() - 10_000;
      await fs.utimes(saved.path, past / 1000, past / 1000);
      await storeAt87.cleanOldMedia(1);
      await expect(fs.stat(saved.path)).rejects.toThrow();
    });
  });

  it("sets correct mime for xlsx by extension", async () => {
    await withTempStore(async (storeAt106, homeAt106) => {
      const xlsxPath = path.join(homeAt106, "sheet.xlsx");
      await fs.mkdir(homeAt106, { recursive: true });
      await fs.writeFile(xlsxPath, "not really an xlsx");

      const saved = await storeAt106.saveMediaSource(xlsxPath);
      expect(saved.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(path.extname(saved.path)).toBe(".xlsx");
    });
  });

  it("renames media based on detected mime even when extension is wrong", async () => {
    await withTempStore(async (storeAt120, homeAt120) => {
      const pngBytes = await sharp({
        create: { width: 2, height: 2, channels: 3, background: "#00ff00" },
      })
        .png()
        .toBuffer();
      const bogusExt = path.join(homeAt120, "image-wrong.bin");
      await fs.writeFile(bogusExt, pngBytes);

      const saved = await storeAt120.saveMediaSource(bogusExt);
      expect(saved.contentType).toBe("image/png");
      expect(path.extname(saved.path)).toBe(".png");

      const buf = await fs.readFile(saved.path);
      expect(buf.equals(pngBytes)).toBe(true);
    });
  });

  it("sniffs xlsx mime for zip buffers and renames extension", async () => {
    await withTempStore(async (storeAt139, homeAt139) => {
      const zip = new JSZip();
      zip.file(
        "[Content_Types].xml",
        '<Types><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
      );
      zip.file("xl/workbook.xml", "<workbook/>");
      const fakeXlsx = await zip.generateAsync({ type: "nodebuffer" });
      const bogusExt = path.join(homeAt139, "sheet.bin");
      await fs.writeFile(bogusExt, fakeXlsx);

      const saved = await storeAt139.saveMediaSource(bogusExt);
      expect(saved.contentType).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(path.extname(saved.path)).toBe(".xlsx");
    });
  });

  it("prefers header mime extension when sniffed mime lacks mapping", async () => {
    await withTempStore(async (_store, homeAt159) => {
      vi.resetModules();
      vi.doMock("./mime.js", async () => {
        const actual = await vi.importActual<typeof import("./mime.js")>("./mime.js");
        return {
          ...actual,
          detectMime: vi.fn(async () => "audio/opus"),
        };
      });

      try {
        const storeWithMock = await import("./store.js");
        const buf = Buffer.from("fake-audio");
        const saved = await storeWithMock.saveMediaBuffer(buf, "audio/ogg; codecs=opus");
        expect(path.extname(saved.path)).toBe(".ogg");
        expect(saved.path.startsWith(homeAt159)).toBe(true);
      } finally {
        vi.doUnmock("./mime.js");
      }
    });
  });

  describe("extractOriginalFilename", () => {
    it("extracts original filename from embedded pattern", async () => {
      await withTempStore(async (storeAt183) => {
        // Pattern: {original}---{uuid}.{ext}
        const filename = "report---a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf";
        const result = storeAt183.extractOriginalFilename(`/path/to/${filename}`);
        expect(result).toBe("report.pdf");
      });
    });

    it("handles uppercase UUID pattern", async () => {
      await withTempStore(async (storeAt192) => {
        const filename = "Document---A1B2C3D4-E5F6-7890-ABCD-EF1234567890.docx";
        const result = storeAt192.extractOriginalFilename(`/media/inbound/${filename}`);
        expect(result).toBe("Document.docx");
      });
    });

    it("falls back to basename for non-matching patterns", async () => {
      await withTempStore(async (storeAt200) => {
        // UUID-only filename (legacy format)
        const uuidOnly = "a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf";
        expect(storeAt200.extractOriginalFilename(`/path/${uuidOnly}`)).toBe(uuidOnly);

        // Regular filename without embedded pattern
        expect(storeAt200.extractOriginalFilename("/path/to/regular.txt")).toBe("regular.txt");

        // Filename with --- but invalid UUID part
        expect(storeAt200.extractOriginalFilename("/path/to/foo---bar.txt")).toBe("foo---bar.txt");
      });
    });

    it("preserves original name with special characters", async () => {
      await withTempStore(async (storeAt214) => {
        const filename = "报告_2024---a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf";
        const result = storeAt214.extractOriginalFilename(`/media/${filename}`);
        expect(result).toBe("报告_2024.pdf");
      });
    });
  });

  describe("saveMediaBuffer with originalFilename", () => {
    it("embeds original filename in stored path when provided", async () => {
      await withTempStore(async (mediaStore) => {
        const buf = Buffer.from("test content");
        const saved = await mediaStore.saveMediaBuffer(
          buf,
          "text/plain",
          "inbound",
          5 * 1024 * 1024,
          "report.txt",
        );

        // Should contain the original name and a UUID pattern
        expect(saved.id).toMatch(/^report---[a-f0-9-]{36}\.txt$/);
        expect(saved.path).toContain("report---");

        // Should be able to extract original name
        const extracted = mediaStore.extractOriginalFilename(saved.path);
        expect(extracted).toBe("report.txt");
      });
    });

    it("sanitizes unsafe characters in original filename", async () => {
      await withTempStore(async (mediaStore) => {
        const buf = Buffer.from("test");
        // Filename with unsafe chars: < > : " / \ | ? *
        const saved = await mediaStore.saveMediaBuffer(
          buf,
          "text/plain",
          "inbound",
          5 * 1024 * 1024,
          "my<file>:test.txt",
        );

        // Unsafe chars should be replaced with underscores
        expect(saved.id).toMatch(/^my_file_test---[a-f0-9-]{36}\.txt$/);
      });
    });

    it("truncates long original filenames", async () => {
      await withTempStore(async (mediaStore) => {
        const buf = Buffer.from("test");
        const longName = "a".repeat(100) + ".txt";
        const saved = await mediaStore.saveMediaBuffer(
          buf,
          "text/plain",
          "inbound",
          5 * 1024 * 1024,
          longName,
        );

        // Original name should be truncated to 60 chars
        const baseName = path.parse(saved.id).name.split("---")[0];
        expect(baseName.length).toBeLessThanOrEqual(60);
      });
    });

    it("falls back to UUID-only when originalFilename not provided", async () => {
      await withTempStore(async (mediaStore) => {
        const buf = Buffer.from("test");
        const saved = await mediaStore.saveMediaBuffer(buf, "text/plain", "inbound");

        // Should be UUID-only pattern (legacy behavior)
        expect(saved.id).toMatch(/^[a-f0-9-]{36}\.txt$/);
        expect(saved.id).not.toContain("---");
      });
    });
  });
});
