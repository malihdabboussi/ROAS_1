#!/bin/bash

set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
HOOK="$SCRIPT_DIR/../hooks/guard-git.sh"
TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/guard-git-test.XXXXXX") || exit 1
ORIGIN="$TEST_ROOT/origin.git"
REPO="$TEST_ROOT/repo"
RESULT="$TEST_ROOT/result.txt"
PASS_COUNT=0
FAIL_COUNT=0

cleanup() {
  case "$TEST_ROOT" in
    "${TMPDIR:-/tmp}"/guard-git-test.*) rm -rf -- "$TEST_ROOT" ;;
  esac
}
trap cleanup EXIT HUP INT TERM

git init -q --bare "$ORIGIN" || exit 1
git init -q "$REPO" || exit 1
git -C "$REPO" config user.name "Guard Test"
git -C "$REPO" config user.email "guard@example.invalid"
git -C "$REPO" checkout -q -b main
: >"$REPO/seed.txt"
git -C "$REPO" add seed.txt
git -C "$REPO" commit -q -m seed
git -C "$REPO" remote add origin "$ORIGIN"
git -C "$REPO" push -q -u origin main
git --git-dir="$ORIGIN" symbolic-ref HEAD refs/heads/main
git -C "$REPO" remote set-head origin -a >/dev/null 2>&1
git -C "$REPO" checkout -q -b feature
git -C "$REPO" push -q -u origin feature
git -C "$REPO" checkout -q main

run_case() {
  case_name=$1
  expected=$2
  candidate=$3
  override=${4-}

  set +e
  python3 -c 'import json, sys; print(json.dumps({"tool_input": {"command": sys.argv[1]}}))' "$candidate" |
    (cd "$REPO" && GUARD_GIT_DEFAULT_BRANCH="$override" bash "$HOOK") >"$RESULT" 2>&1
  actual=$?
  set -e

  if [ "$actual" -eq "$expected" ]; then
    printf 'PASS %s\n' "$case_name"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    printf 'FAIL %s expected=%s actual=%s\n' "$case_name" "$expected" "$actual"
    sed 's/^/  /' "$RESULT"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

set -e

run_case "block direct default push" 2 "git push origin main"
run_case "block HEAD to default" 2 "git push origin HEAD:main"
run_case "block full default ref" 2 "git push origin refs/heads/main"
run_case "block forced refspec marker" 2 "git push origin +main"
run_case "block feature to default" 2 "git push origin feature:main"
run_case "block delete default" 2 "git push origin --delete main"
run_case "block lone delete default" 2 "git push --delete main"
run_case "block colon delete default" 2 "git push origin :main"
run_case "block repo option default" 2 "git push --repo origin main"
run_case "block force" 2 "git push --force origin feature"
run_case "block force with lease" 2 "git push --force-with-lease origin feature"
run_case "block implicit upstream default" 2 "git push"
run_case "block all" 2 "git push origin --all"
run_case "block mirror" 2 "git push origin --mirror"
run_case "block unresolved tags" 2 "git push origin --tags"
run_case "block env prefix" 2 "env SAMPLE_FLAG=1 git push origin main"
run_case "block command prefix" 2 "command git push origin main"
run_case "block bash c default push" 2 "bash -c 'git push origin main'"
run_case "block bash lc default push" 2 "bash -lc 'git push origin main'"
run_case "block sh c PR merge" 2 "sh -c 'gh pr merge 123'"
run_case "block eval default push" 2 'eval "git push origin main"'
run_case "block command substitution default push" 2 'echo $(git push origin main)'
run_case "block backtick PR merge" 2 'echo `gh pr merge 123`'
run_case "block shell function default push" 2 'publish() { git push origin main; }; publish'

GIT_PATH=$(command -v git)
run_case "block absolute git path" 2 "$GIT_PATH push origin main"
run_case "block git C" 2 "git -C $REPO push origin main"
run_case "block git dir equals" 2 "git --git-dir=$REPO/.git push origin main"
run_case "block git dir separate" 2 "git --git-dir $REPO/.git push origin main"
run_case "block chained command" 2 "printf ok && git push origin main"
run_case "block chained cd commit" 2 "cd $REPO && git commit -m blocked"
run_case "block trunk override" 2 "git push origin trunk" "trunk"

git -C "$REPO" config alias.publish "push origin main"
run_case "block expanded git alias" 2 "git publish"
git -C "$REPO" config alias.shell-publish "!git push origin main"
run_case "block expanded shell alias" 2 "git shell-publish"
git -C "$REPO" config alias.function-publish '!f() { /usr/bin/git push origin main; }; f'
run_case "block embedded shell alias" 2 "git function-publish"

git -C "$REPO" config remote.origin.push refs/heads/feature:refs/heads/main
git -C "$REPO" checkout -q feature
run_case "block configured push destination" 2 "git push origin"
git -C "$REPO" config --unset-all remote.origin.push
git -C "$REPO" config remote.origin.push refs/heads/feature:refs/heads/feature
run_case "allow configured feature destination" 0 "git push origin"
git -C "$REPO" config --unset-all remote.origin.push

git -C "$REPO" checkout -q main
git -C "$REPO" config push.default current
run_case "block configured push default current" 2 "git push origin"
git -C "$REPO" config --unset push.default
run_case "block commit on default" 2 "git commit -m blocked"
git -C "$REPO" checkout -q --detach HEAD
run_case "block commit on detached HEAD" 2 "git commit -m blocked"
git -C "$REPO" checkout -q feature

run_case "block gh pr merge" 2 "gh pr merge 123"
run_case "allow feature push" 0 "git push -u origin feature"
run_case "allow implicit feature push" 0 "git push origin"
run_case "allow feature commit" 0 "git commit -m allowed"
run_case "allow git status" 0 "git status --short"
run_case "allow non-git command" 0 "printf harmless"

printf 'RESULT pass=%s fail=%s\n' "$PASS_COUNT" "$FAIL_COUNT"
if [ "$FAIL_COUNT" -ne 0 ]; then
  exit 1
fi
