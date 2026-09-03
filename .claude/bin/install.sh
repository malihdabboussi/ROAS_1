#!/bin/bash
set -eu
usage() {
  echo "Usage: install.sh --from <source-repo> [--to <target-repo>] [--config <file.json>] [--overwrite]" >&2
}
SOURCE_REPO=""
TARGET_REPO="$PWD"
CONFIG_FILE=""
OVERWRITE=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --from)
      [ "$#" -ge 2 ] || { usage; exit 1; }
      SOURCE_REPO=$2
      shift 2
      ;;
    --to)
      [ "$#" -ge 2 ] || { usage; exit 1; }
      TARGET_REPO=$2
      shift 2
      ;;
    --config)
      [ "$#" -ge 2 ] || { usage; exit 1; }
      CONFIG_FILE=$2
      shift 2
      ;;
    --overwrite)
      OVERWRITE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done
[ -n "$SOURCE_REPO" ] || { usage; exit 1; }
[ -d "$SOURCE_REPO" ] || { echo "Source repository not found: $SOURCE_REPO" >&2; exit 1; }
[ -d "$TARGET_REPO" ] || { echo "Target repository not found: $TARGET_REPO" >&2; exit 1; }
SOURCE_REPO=$(cd "$SOURCE_REPO" && pwd -P)
TARGET_REPO=$(cd "$TARGET_REPO" && pwd -P)
if [ -n "$CONFIG_FILE" ]; then
  [ -f "$CONFIG_FILE" ] || { echo "Config file not found: $CONFIG_FILE" >&2; exit 1; }
  CONFIG_FILE=$(cd "$(dirname "$CONFIG_FILE")" && printf '%s/%s\n' "$PWD" "$(basename "$CONFIG_FILE")")
fi
WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/claude-command-set.XXXXXX")
PAYLOAD_DIR="$WORK_DIR/payload"
mkdir -p "$PAYLOAD_DIR"
MUTATING=0
ROLLBACK_ARCHIVE="$WORK_DIR/rollback.tar"
CHANGED_PATHS="$WORK_DIR/changed-paths.txt"
EXISTING_PATHS="$WORK_DIR/existing-paths.txt"
NEW_PATHS="$WORK_DIR/new-paths.txt"
CREATED_DIRS="$WORK_DIR/created-dirs.txt"
BACKUP_DIR=""
BACKUP_ROOT_CREATED=0
: > "$CHANGED_PATHS"
: > "$EXISTING_PATHS"
: > "$NEW_PATHS"
: > "$CREATED_DIRS"
remove_exact_path() {
  path=$1
  if [ -d "$path" ] && [ ! -L "$path" ]; then
    rm -rf -- "$path"
  else
    rm -f -- "$path"
  fi
}
rollback() {
  while IFS= read -r rel; do
    [ -n "$rel" ] || continue
    remove_exact_path "$TARGET_REPO/$rel"
  done < "$CHANGED_PATHS"
  if [ -s "$EXISTING_PATHS" ] && [ -f "$ROLLBACK_ARCHIVE" ]; then
    tar -xf "$ROLLBACK_ARCHIVE" -C "$TARGET_REPO"
  fi
  pass=0
  while [ "$pass" -lt 10 ]; do
    while IFS= read -r dir; do
      [ -n "$dir" ] || continue
      rmdir "$dir" 2>/dev/null || true
    done < "$CREATED_DIRS"
    pass=$((pass + 1))
  done
  if [ -n "$BACKUP_DIR" ]; then
    remove_exact_path "$BACKUP_DIR"
  fi
  if [ "$BACKUP_ROOT_CREATED" -eq 1 ]; then
    rmdir "$TARGET_REPO/.claude/.install-backup" 2>/dev/null || true
  fi
}
cleanup() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$MUTATING" -eq 1 ]; then
    rollback
    echo "Install failed; all target changes were restored." >&2
  fi
  rm -rf -- "$WORK_DIR"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
portable_paths=(
  .claude/commands
  .claude/rules
  .claude/templates
  .claude/bin
  .claude/hooks
  .claude/README.md
  .claude/settings.json
)
if [ -n "$(git -C "$SOURCE_REPO" status --porcelain --untracked-files=all -- .claude 2>/dev/null || true)" ]; then
  echo "source has uncommitted .claude changes; using working tree" >&2
  existing_paths=()
  for rel in "${portable_paths[@]}"; do
    if [ -e "$SOURCE_REPO/$rel" ] || [ -L "$SOURCE_REPO/$rel" ]; then
      existing_paths+=("$rel")
    fi
  done
  [ "${#existing_paths[@]}" -gt 0 ] || { echo "No portable .claude paths found in source." >&2; exit 1; }
  (cd "$SOURCE_REPO" && tar -cf - "${existing_paths[@]}") | tar -xf - -C "$PAYLOAD_DIR"
else
  git -C "$SOURCE_REPO" archive HEAD -- \
    .claude/commands \
    .claude/rules \
    .claude/templates \
    .claude/bin \
    .claude/hooks \
    .claude/README.md \
    .claude/settings.json | tar -x -C "$PAYLOAD_DIR"
fi
if find "$PAYLOAD_DIR/.claude" -type l -print -quit | grep -q .; then
  echo "Portable .claude paths cannot contain symbolic links." >&2
  exit 1
fi
TEMPLATE="$PAYLOAD_DIR/.claude/templates/CLAUDE.md.template"
[ -f "$TEMPLATE" ] || { echo "Portable template missing: .claude/templates/CLAUDE.md.template" >&2; exit 1; }
DEFAULT_BRANCH=$(git -C "$TARGET_REPO" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)
if [ -z "$DEFAULT_BRANCH" ]; then
  DEFAULT_BRANCH=$(git -C "$TARGET_REPO" symbolic-ref --quiet --short HEAD 2>/dev/null || true)
fi
python3 - "$CONFIG_FILE" "$TEMPLATE" "$WORK_DIR/rendered-CLAUDE.md" "$WORK_DIR/surfaces.md" "$DEFAULT_BRANCH" "$TARGET_REPO" 3<&0 <<'PY'
import copy
import json
import os
import re
import sys
config_path, template_path, output_path, surfaces_path, default_branch, target_repo = sys.argv[1:]
allowed = {
    "PROJECT_NAME",
    "PROJECT_PURPOSE",
    "DEFAULT_BRANCH",
    "DOCS_DIR",
    "CHANGELOG_DIR",
    "DESIGN_GUIDE",
    "PR_TEMPLATE",
    "ALLOWED_TEST_HOSTS",
    "PREVIEW_PROVIDER",
    "DEPLOY_MAP",
}
array_keys = {"ALLOWED_TEST_HOSTS", "DEPLOY_MAP"}
if config_path:
    try:
        with open(config_path, encoding="utf-8") as handle:
            config = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Invalid config JSON: {exc}")
else:
    config = {}
if not isinstance(config, dict):
    raise SystemExit("Config must be a flat JSON object.")
unknown = sorted(set(config) - allowed)
if unknown:
    raise SystemExit("Unknown config keys: " + ", ".join(unknown))
config.setdefault("DEFAULT_BRANCH", default_branch)
config.setdefault("DESIGN_GUIDE", "none")
config.setdefault("PR_TEMPLATE", "none")
missing = [key for key in sorted(allowed) if key not in config or config[key] in (None, "")]
if missing and not os.isatty(3):
    raise SystemExit("Missing required config keys: " + ", ".join(missing))
prompt_stream = os.fdopen(3, "r", closefd=False)
def prompt(label):
    print(label, end="", file=sys.stderr, flush=True)
    value = prompt_stream.readline()
    if value == "":
        raise SystemExit("Interactive config input ended before all values were provided.")
    return value.rstrip("\n")
for key in missing:
    if key in array_keys:
        raw = prompt(f"{key} (JSON array): ")
        try:
            config[key] = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise SystemExit(f"Invalid JSON for {key}: {exc}")
    else:
        config[key] = prompt(f"{key}: ")
for key in allowed - array_keys:
    if not isinstance(config.get(key), str) or not config[key]:
        raise SystemExit(f"{key} must be a non-empty string.")
hosts = config.get("ALLOWED_TEST_HOSTS")
if not isinstance(hosts, list) or any(not isinstance(host, str) for host in hosts):
    raise SystemExit("ALLOWED_TEST_HOSTS must be an array of strings.")
deploy_map = config.get("DEPLOY_MAP")
if not isinstance(deploy_map, list):
    raise SystemExit("DEPLOY_MAP must be an array.")
for index, row in enumerate(deploy_map):
    if not isinstance(row, dict) or set(row) != {"surface", "provider", "trigger"}:
        raise SystemExit(
            f"DEPLOY_MAP[{index}] must contain only surface, provider, and trigger."
        )
    if any(not isinstance(row[key], str) for key in ("surface", "provider", "trigger")):
        raise SystemExit(f"DEPLOY_MAP[{index}] values must be strings.")
with open(template_path, encoding="utf-8") as handle:
    rendered = handle.read()
replacements = copy.deepcopy(config)
replacements["ALLOWED_TEST_HOSTS"] = (
    "\n".join(f"  - {host}" for host in hosts) if hosts else "  []"
)
replacements["DEPLOY_MAP"] = "\n".join(
    f"| {row['surface']} | {row['provider']} | {row['trigger']} |" for row in deploy_map
)
replacements["AGENTS_IMPORT"] = "@AGENTS.md" if os.path.isfile(os.path.join(target_repo, "AGENTS.md")) else ""
for key, value in replacements.items():
    rendered = rendered.replace("{{" + key + "}}", value)
unresolved = sorted(set(re.findall(r"\{\{[A-Z0-9_]+\}\}", rendered)))
if unresolved:
    raise SystemExit("Unresolved placeholders: " + ", ".join(unresolved))
start_marker = "<!-- claude-command-set:surfaces:start -->"
end_marker = "<!-- claude-command-set:surfaces:end -->"
start = rendered.find(start_marker)
end = rendered.find(end_marker)
if start < 0 or end < start:
    raise SystemExit("Rendered template is missing Repo surfaces markers.")
surfaces = rendered[start : end + len(end_marker)] + "\n"
with open(output_path, "w", encoding="utf-8") as handle:
    handle.write(rendered)
with open(surfaces_path, "w", encoding="utf-8") as handle:
    handle.write(surfaces)
PY
if grep -Eq '\{\{[A-Z0-9_]+\}\}' "$WORK_DIR/rendered-CLAUDE.md"; then
  echo "Rendered CLAUDE.md contains unresolved placeholders." >&2
  exit 1
fi
COLLISIONS="$WORK_DIR/collisions.txt"
: > "$COLLISIONS"
if [ -d "$PAYLOAD_DIR/.claude" ]; then
  find "$PAYLOAD_DIR/.claude" -type f -print | while IFS= read -r source_path; do
    rel=${source_path#"$PAYLOAD_DIR/"}
    [ "$rel" = ".claude/settings.json" ] && continue
    destination="$TARGET_REPO/$rel"
    if [ -e "$destination" ] || [ -L "$destination" ]; then
      if [ ! -f "$destination" ] || ! cmp -s "$source_path" "$destination"; then
        printf '%s\n' "$rel" >> "$COLLISIONS"
      fi
    fi
  done
fi
if [ -s "$COLLISIONS" ] && [ "$OVERWRITE" -ne 1 ]; then
  echo "Install aborted; differing destination paths:" >&2
  sed 's/^/  /' "$COLLISIONS" >&2
  exit 3
fi
SETTINGS_FINAL="$WORK_DIR/settings.final.json"
if [ -f "$PAYLOAD_DIR/.claude/settings.json" ]; then
  python3 - "$TARGET_REPO/.claude/settings.json" "$PAYLOAD_DIR/.claude/settings.json" "$SETTINGS_FINAL" <<'PY'
import copy
import json
import os
import sys
target_path, source_path, output_path = sys.argv[1:]
def load(path, required=False):
    if not os.path.exists(path) and not required:
        return {}
    try:
        with open(path, encoding="utf-8") as handle:
            value = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Invalid settings JSON at {path}: {exc}")
    if not isinstance(value, dict):
        raise SystemExit(f"Settings JSON at {path} must be an object.")
    return value
target = load(target_path)
source = load(source_path, required=True)
merged = copy.deepcopy(target)
for key, value in source.items():
    if key == "permissions" and isinstance(value, dict):
        permissions = merged.setdefault("permissions", {})
        if not isinstance(permissions, dict):
            raise SystemExit("Existing settings permissions must be an object.")
        for permission_key, permission_value in value.items():
            if permission_key in {"ask", "deny"}:
                if not isinstance(permission_value, list):
                    raise SystemExit(f"Source permissions.{permission_key} must be an array.")
                existing = permissions.setdefault(permission_key, [])
                if not isinstance(existing, list):
                    raise SystemExit(f"Existing permissions.{permission_key} must be an array.")
                for entry in permission_value:
                    if entry not in existing:
                        existing.append(entry)
            elif permission_key not in permissions:
                permissions[permission_key] = copy.deepcopy(permission_value)
    elif key == "hooks" and isinstance(value, dict):
        hooks = merged.setdefault("hooks", {})
        if not isinstance(hooks, dict):
            raise SystemExit("Existing settings hooks must be an object.")
        for hook_name, entries in value.items():
            if not isinstance(entries, list):
                raise SystemExit(f"Source hooks.{hook_name} must be an array.")
            existing = hooks.setdefault(hook_name, [])
            if not isinstance(existing, list):
                raise SystemExit(f"Existing hooks.{hook_name} must be an array.")
            for entry in entries:
                if entry not in existing:
                    existing.append(copy.deepcopy(entry))
    elif key == "omc":
        if "omc" not in merged:
            merged["omc"] = copy.deepcopy(value)
    elif key not in merged:
        merged[key] = copy.deepcopy(value)
with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(merged, handle, indent=2, ensure_ascii=False)
    handle.write("\n")
PY
fi
CLAUDE_ACTION="none"
if [ ! -e "$TARGET_REPO/CLAUDE.md" ]; then
  CLAUDE_ACTION="create"
  cp -p "$WORK_DIR/rendered-CLAUDE.md" "$WORK_DIR/CLAUDE.final.md"
else
  has_start=0
  has_end=0
  grep -Fq '<!-- claude-command-set:surfaces:start -->' "$TARGET_REPO/CLAUDE.md" && has_start=1
  grep -Fq '<!-- claude-command-set:surfaces:end -->' "$TARGET_REPO/CLAUDE.md" && has_end=1
  if [ "$has_start" -ne "$has_end" ]; then
    echo "Existing CLAUDE.md has an incomplete Repo surfaces marker block." >&2
    exit 1
  fi
fi
if [ -e "$TARGET_REPO/CLAUDE.md" ] && [ "$has_start" -eq 0 ]; then
  CLAUDE_ACTION="append"
  python3 - "$TARGET_REPO/CLAUDE.md" "$WORK_DIR/surfaces.md" "$WORK_DIR/CLAUDE.final.md" <<'PY'
import sys
current_path, surfaces_path, output_path = sys.argv[1:]
with open(current_path, encoding="utf-8") as handle:
    current = handle.read()
with open(surfaces_path, encoding="utf-8") as handle:
    surfaces = handle.read()
with open(output_path, "w", encoding="utf-8") as handle:
    handle.write(current.rstrip("\n") + "\n\n" + surfaces)
PY
fi
FILES_TO_INSTALL="$WORK_DIR/files-to-install.txt"
: > "$FILES_TO_INSTALL"
if [ -d "$PAYLOAD_DIR/.claude" ]; then
  find "$PAYLOAD_DIR/.claude" -type f -print | while IFS= read -r source_path; do
    rel=${source_path#"$PAYLOAD_DIR/"}
    [ "$rel" = ".claude/settings.json" ] && continue
    destination="$TARGET_REPO/$rel"
    if [ ! -f "$destination" ] || ! cmp -s "$source_path" "$destination"; then
      printf '%s\n' "$rel" >> "$FILES_TO_INSTALL"
    fi
  done
fi
if [ -f "$SETTINGS_FINAL" ] && { [ ! -f "$TARGET_REPO/.claude/settings.json" ] || ! cmp -s "$SETTINGS_FINAL" "$TARGET_REPO/.claude/settings.json"; }; then
  printf '%s\n' '.claude/settings.json' >> "$FILES_TO_INSTALL"
fi
if [ "$CLAUDE_ACTION" != "none" ]; then
  printf '%s\n' 'CLAUDE.md' >> "$FILES_TO_INSTALL"
  if [ "$CLAUDE_ACTION" = "append" ]; then
    printf '%s\n' 'CLAUDE.md.bak' >> "$FILES_TO_INSTALL"
  fi
fi
if [ ! -s "$FILES_TO_INSTALL" ]; then
  echo "No changes; command set is already installed."
  exit 0
fi
sort -u "$FILES_TO_INSTALL" > "$CHANGED_PATHS"
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  if [ -e "$TARGET_REPO/$rel" ] || [ -L "$TARGET_REPO/$rel" ]; then
    printf '%s\n' "$rel" >> "$EXISTING_PATHS"
  else
    printf '%s\n' "$rel" >> "$NEW_PATHS"
  fi
done < "$CHANGED_PATHS"
if [ -s "$EXISTING_PATHS" ]; then
  (cd "$TARGET_REPO" && tar -cf "$ROLLBACK_ARCHIVE" -T "$EXISTING_PATHS")
fi
MUTATING=1
if [ "$OVERWRITE" -eq 1 ] && [ -s "$COLLISIONS" ]; then
  timestamp=$(date -u +%Y%m%dT%H%M%SZ)
  BACKUP_DIR="$TARGET_REPO/.claude/.install-backup/$timestamp"
  if [ -e "$BACKUP_DIR" ]; then
    BACKUP_DIR="${BACKUP_DIR}-$$"
  fi
  if [ ! -d "$TARGET_REPO/.claude/.install-backup" ]; then
    BACKUP_ROOT_CREATED=1
  fi
  mkdir -p "$BACKUP_DIR"
  while IFS= read -r rel; do
    [ -n "$rel" ] || continue
    backup_rel=${rel#.claude/}
    mkdir -p "$BACKUP_DIR/$(dirname "$backup_rel")"
    (cd "$TARGET_REPO" && tar -cf - "$rel") | (cd "$BACKUP_DIR" && tar -xf -)
  done < "$COLLISIONS"
fi
ensure_parent() {
  parent=$1
  probe=$parent
  while [ ! -d "$probe" ]; do
    printf '%s\n' "$probe" >> "$CREATED_DIRS"
    probe=$(dirname "$probe")
  done
  mkdir -p "$parent"
}
copy_into_target() {
  source_path=$1
  rel=$2
  destination="$TARGET_REPO/$rel"
  ensure_parent "$(dirname "$destination")"
  if [ -e "$destination" ] || [ -L "$destination" ]; then
    remove_exact_path "$destination"
  fi
  cp -p "$source_path" "$destination"
}
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  if [ "$rel" = '.claude/settings.json' ] || [ "$rel" = 'CLAUDE.md' ] || [ "$rel" = 'CLAUDE.md.bak' ]; then
    continue
  fi
  copy_into_target "$PAYLOAD_DIR/$rel" "$rel"
done < "$FILES_TO_INSTALL"
if grep -Fxq '.claude/settings.json' "$FILES_TO_INSTALL"; then
  copy_into_target "$SETTINGS_FINAL" '.claude/settings.json'
fi
if [ "$CLAUDE_ACTION" = "append" ]; then
  copy_into_target "$TARGET_REPO/CLAUDE.md" 'CLAUDE.md.bak'
  copy_into_target "$WORK_DIR/CLAUDE.final.md" 'CLAUDE.md'
elif [ "$CLAUDE_ACTION" = "create" ]; then
  copy_into_target "$WORK_DIR/CLAUDE.final.md" 'CLAUDE.md'
fi
if [ "${CLAUDE_INSTALL_TEST_FAIL_AFTER_COPY:-0}" = "1" ]; then
  echo "Simulated installer failure after copy." >&2
  exit 1
fi
MUTATING=0
echo "Installed Claude command set into $TARGET_REPO"
sed 's/^/  /' "$FILES_TO_INSTALL"
if [ -n "$BACKUP_DIR" ]; then
  echo "Backups: $BACKUP_DIR"
fi
