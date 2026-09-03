#!/bin/bash

set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: setup.sh <out>" >&2
  exit 1
fi

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd -P)
SOURCE_REPO=$(cd "$SCRIPT_DIR/../.." && pwd -P)
OUT=$1

if [ -e "$OUT" ]; then
  echo "Harness output already exists: $OUT" >&2
  exit 1
fi

mkdir -p "$OUT/repo" "$OUT/bin" "$OUT/baseline-rules"
OUT=$(cd "$OUT" && pwd -P)

git init "$OUT/repo" >/dev/null
git -C "$OUT/repo" branch -M main
git -C "$OUT/repo" config user.name "Claude Harness"
git -C "$OUT/repo" config user.email "claude-harness@example.invalid"

bash "$SOURCE_REPO/.claude/bin/install.sh" \
  --from "$SOURCE_REPO" \
  --to "$OUT/repo" \
  --config "$SCRIPT_DIR/config.json"

cp -p "$SCRIPT_DIR/bin/gh" "$OUT/bin/gh"
cp -p "$SCRIPT_DIR/bin/codex" "$OUT/bin/codex"
chmod +x "$OUT/bin/gh" "$OUT/bin/codex"

: > "$OUT/gh.log"
: > "$OUT/codex.log"
: > "$OUT/hits.txt"
printf '0\n' > "$OUT/hits.txt"
: > "$OUT/approved-rules.txt"

if [ -d "$OUT/repo/.claude/rules" ]; then
  (cd "$OUT/repo" && tar -cf - .claude/rules) | (cd "$OUT/baseline-rules" && tar -xf -)
fi

git -C "$OUT/repo" add -- CLAUDE.md .claude
git -C "$OUT/repo" commit -m "Initialize command harness" >/dev/null
git init --bare "$OUT/origin.git" >/dev/null
git --git-dir="$OUT/origin.git" symbolic-ref HEAD refs/heads/main
git -C "$OUT/repo" remote add origin "$OUT/origin.git"
git -C "$OUT/repo" push -u origin main >/dev/null
git -C "$OUT/repo" remote set-head origin main

cat > "$OUT/env.sh" <<EOF
export HARNESS_ROOT='$OUT'
export COMMAND_SET_SOURCE='$SOURCE_REPO'
export PATH='$OUT/bin':\$PATH
export GH_STUB_PREVIEW=immediate
export CODEX_STUB_VERDICT=approve
EOF

HARNESS_ROOT="$OUT" python3 "$SCRIPT_DIR/fixture/serve.py" \
  --directory "$SCRIPT_DIR/fixture" \
  --state-dir "$OUT" \
  >"$OUT/fixture.log" 2>&1 &
server_pid=$!
printf '%s\n' "$server_pid" > "$OUT/fixture.pid"
sleep 1
if ! kill -0 "$server_pid" 2>/dev/null; then
  echo "Fixture server failed; see $OUT/fixture.log" >&2
  exit 1
fi

echo "Harness ready: $OUT"
echo "Run: source '$OUT/env.sh'"
echo "Repo: $OUT/repo"
echo "Fixture: http://localhost:8765/fixture.html"
echo "Stop fixture: kill $server_pid"
