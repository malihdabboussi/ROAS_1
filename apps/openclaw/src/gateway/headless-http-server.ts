import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server as HttpServer,
  type ServerResponse,
} from "node:http";
import { createServer as createHttpsServer } from "node:https";
import type { AuthRateLimiter } from "./auth-rate-limit.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import { loadConfig } from "../config/config.js";
import { createAuthRateLimiter } from "./auth-rate-limit.js";
import { authorizeGatewayBearerRequestOrReply } from "./http-auth-helpers.js";
import { sendJson, sendMethodNotAllowed, sendText } from "./http-common.js";
import { resolveGatewayListenHosts } from "./net.js";
import { resolveGatewayRuntimeConfig } from "./server-runtime-config.js";
import { listenGatewayHttpServer } from "./server/http-listen.js";
import { loadGatewayTlsRuntime } from "./server/tls.js";

type HeadlessHttpGatewayServer = {
  close: (opts?: { reason?: string; restartExpectedMs?: number | null }) => Promise<void>;
};

type GatewayHttpHandlers = {
  handleOpenResponsesHttpRequest: typeof import("./openresponses-http.js").handleOpenResponsesHttpRequest;
  handleOpenAiHttpRequest: typeof import("./openai-http.js").handleOpenAiHttpRequest;
};

let gatewayHttpHandlersPromise: Promise<GatewayHttpHandlers> | null = null;
let gatewayHttpHandlersPreloadScheduled = false;

function loadGatewayHttpHandlers(): Promise<GatewayHttpHandlers> {
  if (!gatewayHttpHandlersPromise) {
    const startedAt = performance.now();
    console.log("[gateway] headless HTTP handlers preload start");
    gatewayHttpHandlersPromise = Promise.all([
      import("./openresponses-http.js"),
      import("./openai-http.js"),
    ]).then(([openResponses, openAi]) => {
      console.log(
        `[gateway] headless HTTP handlers preload ready durationMs=${(performance.now() - startedAt).toFixed(1)}`,
      );
      return {
        handleOpenResponsesHttpRequest: openResponses.handleOpenResponsesHttpRequest,
        handleOpenAiHttpRequest: openAi.handleOpenAiHttpRequest,
      };
    });
  }
  return gatewayHttpHandlersPromise;
}

function scheduleGatewayHttpHandlersPreload(): void {
  if (gatewayHttpHandlersPreloadScheduled || gatewayHttpHandlersPromise) {
    return;
  }
  gatewayHttpHandlersPreloadScheduled = true;
  const rawDelayMs = Number(process.env.OPENCLAW_HEADLESS_HTTP_HANDLER_PRELOAD_DELAY_MS ?? 1000);
  const delayMs = Number.isFinite(rawDelayMs) && rawDelayMs >= 0 ? rawDelayMs : 1000;
  console.log(`[gateway] headless HTTP handlers preload scheduled delayMs=${delayMs.toFixed(0)}`);
  setTimeout(() => {
    void loadGatewayHttpHandlers().catch((err) => {
      gatewayHttpHandlersPromise = null;
      gatewayHttpHandlersPreloadScheduled = false;
      console.warn(`[gateway] headless HTTP handlers preload failed: ${String(err)}`);
    });
  }, delayMs);
}

function closeHttpServer(httpServer: HttpServer): Promise<void> {
  if (!httpServer.listening) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    httpServer.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function handleModelsRequest(params: {
  req: Parameters<typeof authorizeGatewayBearerRequestOrReply>[0]["req"];
  res: Parameters<typeof authorizeGatewayBearerRequestOrReply>[0]["res"];
  auth: ResolvedGatewayAuth;
  trustedProxies: string[];
  rateLimiter?: AuthRateLimiter;
}): Promise<boolean> {
  const requestPath = new URL(params.req.url ?? "/", "http://localhost").pathname;
  if (requestPath !== "/v1/models") {
    return false;
  }
  if (params.req.method !== "GET") {
    sendMethodNotAllowed(params.res, "GET");
    return true;
  }
  const authorized = await authorizeGatewayBearerRequestOrReply({
    req: params.req,
    res: params.res,
    auth: params.auth,
    trustedProxies: params.trustedProxies,
    rateLimiter: params.rateLimiter,
  });
  if (!authorized) {
    return true;
  }
  sendJson(params.res, 200, {
    object: "list",
    data: [
      {
        id: "openclaw",
        object: "model",
        created: 0,
        owned_by: "openclaw",
      },
    ],
  });
  scheduleGatewayHttpHandlersPreload();
  return true;
}

export async function startHeadlessHttpGatewayServer(
  port = 18789,
): Promise<HeadlessHttpGatewayServer> {
  process.env.OPENCLAW_GATEWAY_PORT = String(port);

  const cfgAtStart = loadConfig();
  const runtimeConfig = await resolveGatewayRuntimeConfig({
    cfg: cfgAtStart,
    port,
  });
  const gatewayTls = await loadGatewayTlsRuntime(cfgAtStart.gateway?.tls);
  if (cfgAtStart.gateway?.tls?.enabled && !gatewayTls.enabled) {
    throw new Error(gatewayTls.error ?? "gateway tls: failed to enable");
  }

  const rateLimitConfig = cfgAtStart.gateway?.auth?.rateLimit;
  const authRateLimiter = rateLimitConfig ? createAuthRateLimiter(rateLimitConfig) : undefined;
  const httpServers: HttpServer[] = [];
  const bindHosts = await resolveGatewayListenHosts(runtimeConfig.bindHost);

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (String(req.headers.upgrade ?? "").toLowerCase() === "websocket") {
      return;
    }

    try {
      const configSnapshot = loadConfig();
      const trustedProxies = configSnapshot.gateway?.trustedProxies ?? [];
      if (
        await handleModelsRequest({
          req,
          res,
          auth: runtimeConfig.resolvedAuth,
          trustedProxies,
          rateLimiter: authRateLimiter,
        })
      ) {
        return;
      }
      const handlers = await loadGatewayHttpHandlers();
      if (runtimeConfig.openResponsesEnabled) {
        if (
          await handlers.handleOpenResponsesHttpRequest(req, res, {
            auth: runtimeConfig.resolvedAuth,
            config: runtimeConfig.openResponsesConfig,
            trustedProxies,
            rateLimiter: authRateLimiter,
          })
        ) {
          return;
        }
      }
      if (runtimeConfig.openAiChatCompletionsEnabled) {
        if (
          await handlers.handleOpenAiHttpRequest(req, res, {
            auth: runtimeConfig.resolvedAuth,
            trustedProxies,
            rateLimiter: authRateLimiter,
          })
        ) {
          return;
        }
      }
      sendText(res, 404, "Not Found");
    } catch {
      sendText(res, 500, "Internal Server Error");
    }
  };

  for (const host of bindHosts) {
    const httpServer = gatewayTls.enabled
      ? createHttpsServer(gatewayTls.tlsOptions!, (req, res) => {
          void handleRequest(req, res);
        })
      : createHttpServer((req, res) => {
          void handleRequest(req, res);
        });
    httpServer.on("upgrade", (_req, socket) => {
      socket.destroy();
    });
    try {
      await listenGatewayHttpServer({
        httpServer,
        bindHost: host,
        port,
      });
      httpServers.push(httpServer);
    } catch (err) {
      if (host === bindHosts[0]) {
        throw err;
      }
      console.warn(`gateway: failed to bind loopback alias ${host}:${port} (${String(err)})`);
    }
  }

  if (httpServers.length === 0) {
    throw new Error("Headless HTTP gateway failed to start");
  }

  const scheme = gatewayTls.enabled ? "https" : "http";
  console.log(
    `[gateway] headless HTTP gateway listening on ${scheme}://${bindHosts[0]}:${port} (PID ${process.pid})`,
  );

  return {
    close: async () => {
      authRateLimiter?.dispose();
      await Promise.all(httpServers.map((httpServer) => closeHttpServer(httpServer)));
    },
  };
}
