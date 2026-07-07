import type { OpenClawConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { detectLegacyStateMigrations } from "./state-migrations.detection.js";
import { migrateLegacyAgentDir } from "./state-migrations.legacy-assets.js";
import { migrateLegacySessions } from "./state-migrations.legacy-sessions.js";
import { autoMigrateLegacyStateDir, type MigrationLogger } from "./state-migrations.state-dir.js";

let autoMigrateChecked = false;

export function resetAutoMigrateLegacyStateForTest() {
  autoMigrateChecked = false;
}

export function resetAutoMigrateLegacyAgentDirForTest() {
  resetAutoMigrateLegacyStateForTest();
}

export async function autoMigrateLegacyAgentDir(params: {
  cfg: OpenClawConfig;
  env?: NodeJS.ProcessEnv;
  homedir?: () => string;
  log?: MigrationLogger;
  now?: () => number;
}): Promise<{
  migrated: boolean;
  skipped: boolean;
  changes: string[];
  warnings: string[];
}> {
  return await autoMigrateLegacyState(params);
}

export async function autoMigrateLegacyState(params: {
  cfg: OpenClawConfig;
  env?: NodeJS.ProcessEnv;
  homedir?: () => string;
  log?: MigrationLogger;
  now?: () => number;
}): Promise<{
  migrated: boolean;
  skipped: boolean;
  changes: string[];
  warnings: string[];
}> {
  if (autoMigrateChecked) {
    return { migrated: false, skipped: true, changes: [], warnings: [] };
  }
  autoMigrateChecked = true;

  const env = params.env ?? process.env;
  const stateDirResult = await autoMigrateLegacyStateDir({
    env,
    homedir: params.homedir,
    log: params.log,
  });
  if (env.OPENCLAW_AGENT_DIR?.trim() || env.PI_CODING_AGENT_DIR?.trim()) {
    return {
      migrated: stateDirResult.migrated,
      skipped: true,
      changes: stateDirResult.changes,
      warnings: stateDirResult.warnings,
    };
  }

  const detected = await detectLegacyStateMigrations({
    cfg: params.cfg,
    env,
    homedir: params.homedir,
  });
  if (!detected.sessions.hasLegacy && !detected.agentDir.hasLegacy) {
    return {
      migrated: stateDirResult.migrated,
      skipped: false,
      changes: stateDirResult.changes,
      warnings: stateDirResult.warnings,
    };
  }

  const now = params.now ?? (() => Date.now());
  const sessions = await migrateLegacySessions(detected, now);
  const agentDir = await migrateLegacyAgentDir(detected, now);
  const changes = [...stateDirResult.changes, ...sessions.changes, ...agentDir.changes];
  const warnings = [...stateDirResult.warnings, ...sessions.warnings, ...agentDir.warnings];

  const logger = params.log ?? createSubsystemLogger("state-migrations");
  if (changes.length > 0) {
    logger.info(`Auto-migrated legacy state:\n${changes.map((entry) => `- ${entry}`).join("\n")}`);
  }
  if (warnings.length > 0) {
    logger.warn(
      `Legacy state migration warnings:\n${warnings.map((entry) => `- ${entry}`).join("\n")}`,
    );
  }

  return {
    migrated: changes.length > 0,
    skipped: false,
    changes,
    warnings,
  };
}
