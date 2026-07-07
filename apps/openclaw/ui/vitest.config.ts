import type { BrowserProviderOption } from "vitest/node";
import { defineConfig } from "vitest/config";

// Keep this as a runtime require so root typecheck does not need to resolve browser provider types.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { playwright } = require("@vitest/browser-playwright") as {
  playwright: () => BrowserProviderOption;
};

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: "chromium", name: "chromium" }],
      headless: true,
      ui: false,
    },
  },
});
