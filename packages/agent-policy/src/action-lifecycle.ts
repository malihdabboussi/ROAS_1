export const ON_HOLD_PROMPTMODE_ACTIONS = [
  'create_project',
  'get_project',
  'list_projects',
  'create_file',
  'update_file',
  'read_file',
  'delete_file',
  'list_project_files',
  'update_project_deps',
  'import_github_repo',
  'get_project_logs',
  'restart_project',
  'fetch_project_url',
  'patch_file',
  'search_project_files',
  'list_project_directory',
  'get_project_errors',
  'validate_project',
  'supabase_list_tables',
  'supabase_run_sql',
  'supabase_create_table',
  'supabase_insert_rows',
  'supabase_update_rows',
  'supabase_delete_rows',
] as const

export type OnHoldPromptModeAction = (typeof ON_HOLD_PROMPTMODE_ACTIONS)[number]

const ON_HOLD_PROMPTMODE_ACTION_SET = new Set<string>(ON_HOLD_PROMPTMODE_ACTIONS)

export function isPromptModeActionOnHold(action: string): action is OnHoldPromptModeAction {
  return ON_HOLD_PROMPTMODE_ACTION_SET.has(action)
}

export function filterPromptModeActiveActions<T extends string>(actions: Iterable<T>): T[] {
  return [...actions].filter((action) => !isPromptModeActionOnHold(action))
}
