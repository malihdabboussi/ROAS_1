import { vi } from "vitest";
import type { PluginRegistry } from "../plugins/registry.js";
import { setActivePluginRegistry } from "../plugins/runtime.js";

export const registryState: { registry: PluginRegistry } = {
  registry: {
    plugins: [],
    tools: [],
    hooks: [],
    typedHooks: [],
    channels: [],
    providers: [],
    gatewayHandlers: {},
    httpHandlers: [],
    httpRoutes: [],
    cliRegistrars: [],
    services: [],
    commands: [],
    diagnostics: [],
  } as PluginRegistry,
};

export function setRegistry(registry: PluginRegistry) {
  registryState.registry = registry;
  setActivePluginRegistry(registry);
}

vi.mock("./server-plugins.js", async () => {
  const { setActivePluginRegistry: setActivePluginRegistryAt29 } =
    await import("../plugins/runtime.js");
  return {
    loadGatewayPlugins: (params: { baseMethods: string[] }) => {
      setActivePluginRegistryAt29(registryState.registry);
      return {
        pluginRegistry: registryState.registry,
        gatewayMethods: params.baseMethods ?? [],
      };
    },
  };
});
