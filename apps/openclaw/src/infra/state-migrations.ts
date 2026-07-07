export type { LegacyStateDetection } from "./state-migrations.detection.js";
export { detectLegacyStateMigrations } from "./state-migrations.detection.js";
export {
  autoMigrateLegacyStateDir,
  resetAutoMigrateLegacyStateDirForTest,
} from "./state-migrations.state-dir.js";
export {
  migrateLegacyAgentDir,
  runLegacyStateMigrations,
} from "./state-migrations.legacy-assets.js";
export {
  autoMigrateLegacyAgentDir,
  autoMigrateLegacyState,
  resetAutoMigrateLegacyAgentDirForTest,
  resetAutoMigrateLegacyStateForTest,
} from "./state-migrations.auto.js";
