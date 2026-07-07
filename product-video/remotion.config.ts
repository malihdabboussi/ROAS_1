/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import path from "node:path";
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.overrideWebpackConfig((currentConfiguration) => {
  const withTailwind = enableTailwind(currentConfiguration);
  const prevAlias = withTailwind.resolve?.alias;
  const aliasObject =
    prevAlias && typeof prevAlias === "object" && !Array.isArray(prevAlias)
      ? prevAlias
      : {};
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      alias: {
        ...aliasObject,
        "@": path.resolve(__dirname, "src/web-library"),
      },
    },
  };
});
