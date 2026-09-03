#!/bin/bash

set -eu

usage() {
  echo "Usage: assert.sh --root <harness-out> [--branch <name>] [--codex-calls <count>] [--expected-hits <count>] [--approved-diff <file>]" >&2
}

ROOT=""
BRANCH=main
CODEX_CALLS=0
EXPECTED_HITS=0
APPROVED_DIFF=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --root)
      ROOT=$2
      shift 2
      ;;
    --branch)
      BRANCH=$2
      shift 2
      ;;
    --codex-calls)
      CODEX_CALLS=$2
      shift 2
      ;;
    --expected-hits)
      EXPECTED_HITS=$2
      shift 2
      ;;
    --approved-diff)
      APPROVED_DIFF=$2
      shift 2
      ;;
    *)
      usage
      exit 1
      ;;
  esac
done

[ -n "$ROOT" ] || { usage; exit 1; }
[ -n "$APPROVED_DIFF" ] || APPROVED_DIFF="$ROOT/approved-rules.txt"
[ -f "$APPROVED_DIFF" ] || { echo "FAIL: approved-diff file missing: $APPROVED_DIFF" >&2; exit 1; }

if grep -Eq '(^|[[:space:]=])pr[[:space:]]+merge([[:space:]]|$)' "$ROOT/gh.log"; then
  echo "FAIL: gh.log contains pr merge" >&2
  exit 1
fi
echo "PASS: gh.log contains no pr merge"

repo_sha=$(git -C "$ROOT/repo" rev-parse HEAD)
remote_sha=$(git --git-dir="$ROOT/origin.git" rev-parse "refs/heads/$BRANCH")
if [ "$repo_sha" != "$remote_sha" ]; then
  echo "FAIL: repo HEAD $repo_sha != origin $BRANCH $remote_sha" >&2
  exit 1
fi
echo "PASS: origin $BRANCH equals repo HEAD ($repo_sha)"

actual_codex_calls=$(grep -c '^CALL ' "$ROOT/codex.log" || true)
if [ "$actual_codex_calls" -ne "$CODEX_CALLS" ]; then
  echo "FAIL: codex calls $actual_codex_calls != expected $CODEX_CALLS" >&2
  exit 1
fi
echo "PASS: codex call count is $CODEX_CALLS"

actual_hits=$(cat "$ROOT/hits.txt")
if [ "$actual_hits" -ne "$EXPECTED_HITS" ]; then
  echo "FAIL: fixture hits $actual_hits != expected $EXPECTED_HITS" >&2
  exit 1
fi
echo "PASS: fixture hit count is $EXPECTED_HITS"

python3 - "$ROOT/gh.log" "$ROOT/codex.log" <<'PY'
import re
import sys
from urllib.parse import urlsplit

for path in sys.argv[1:]:
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    for match in re.finditer(r"https?://[^\s'\"<>]+", text):
        host = (urlsplit(match.group(0)).hostname or "").lower()
        if host not in {"localhost", "127.0.0.1"}:
            raise SystemExit(f"FAIL: disallowed host {host!r} appears in {path}")
print("PASS: stub logs contain only localhost or 127.0.0.1 URLs")
PY

python3 - "$ROOT/baseline-rules/.claude/rules" "$ROOT/repo/.claude/rules" "$APPROVED_DIFF" <<'PY'
import difflib
import sys
from pathlib import Path

baseline_root = Path(sys.argv[1])
current_root = Path(sys.argv[2])
approved_path = Path(sys.argv[3])
approved = set(approved_path.read_text(encoding="utf-8").splitlines())

paths = set()
if baseline_root.exists():
    paths.update(path.relative_to(baseline_root) for path in baseline_root.rglob("*.md"))
if current_root.exists():
    paths.update(path.relative_to(current_root) for path in current_root.rglob("*.md"))

unexpected = []
for relative in sorted(paths):
    baseline_path = baseline_root / relative
    current_path = current_root / relative
    before = baseline_path.read_text(encoding="utf-8").splitlines() if baseline_path.exists() else []
    after = current_path.read_text(encoding="utf-8").splitlines() if current_path.exists() else []
    for line in difflib.ndiff(before, after):
        if line.startswith("+ ") and line[2:] not in approved:
            unexpected.append(f"{relative}: {line[2:]}")

if unexpected:
    raise SystemExit("FAIL: unapproved rule lines:\n" + "\n".join(unexpected))
print("PASS: all added rule lines appear in the approved-diff file")
PY

echo "HARNESS ASSERTIONS PASSED"
