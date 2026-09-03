#!/bin/bash

# Claude Code PreToolUse guard. The hook payload is JSON on stdin.
# Python provides structural JSON and shell-token parsing; git itself remains the
# authority for aliases, branch state, configured refspecs, and upstreams.
python3 - 3<&0 <<'PY'
import json
import os
import re
import shlex
import subprocess
import sys


def deny(reason):
    print("guard-git: " + reason, file=sys.stderr)
    raise SystemExit(2)


try:
    payload = json.load(os.fdopen(3))
except Exception:
    deny("hook payload is not valid JSON")

command = payload.get("tool_input", {}).get("command", "")
if not isinstance(command, str) or not command:
    deny("hook payload does not contain a Bash command")


def split_segments(value):
    segments = []
    current = []
    quote = None
    escaped = False
    index = 0
    while index < len(value):
        char = value[index]
        if escaped:
            current.append(char)
            escaped = False
            index += 1
            continue
        if char == "\\" and quote != "'":
            current.append(char)
            escaped = True
            index += 1
            continue
        if quote:
            current.append(char)
            if char == quote:
                quote = None
            index += 1
            continue
        if char in ("'", '"'):
            quote = char
            current.append(char)
            index += 1
            continue
        if char in (";", "|", "&", "\n"):
            part = "".join(current).strip()
            if part:
                segments.append(part)
            current = []
            if index + 1 < len(value) and value[index + 1] == char and char != "\n":
                index += 1
            index += 1
            continue
        current.append(char)
        index += 1
    part = "".join(current).strip()
    if part:
        segments.append(part)
    return segments


def shell_tokens(segment):
    try:
        return shlex.split(segment, posix=True)
    except ValueError:
        return []


assignment = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")


def unwrap(tokens):
    index = 0
    while index < len(tokens) and assignment.match(tokens[index]):
        index += 1
    while index < len(tokens):
        name = os.path.basename(tokens[index])
        if name == "env":
            index += 1
            while index < len(tokens):
                token = tokens[index]
                if token == "--":
                    index += 1
                    break
                if token in ("-u", "--unset"):
                    index += 2
                    continue
                if token.startswith("-") or assignment.match(token):
                    index += 1
                    continue
                break
            continue
        if name == "command":
            index += 1
            while index < len(tokens) and tokens[index].startswith("-"):
                index += 1
            continue
        if name == "sudo":
            index += 1
            while index < len(tokens):
                token = tokens[index]
                if token == "--":
                    index += 1
                    break
                if token in ("-u", "-g", "-h", "-p", "-C", "-T", "-r", "-t"):
                    index += 2
                    continue
                if token.startswith("-"):
                    index += 1
                    continue
                break
            continue
        break
    if index >= len(tokens):
        return None, []
    return os.path.basename(tokens[index]), tokens[index + 1 :]


def run_git(prefix, args):
    try:
        result = subprocess.run(
            ["git"] + prefix + args,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
        )
    except OSError:
        return 127, ""
    return result.returncode, result.stdout.strip()


def parse_git_prefix(args):
    prefix = []
    index = 0
    options_with_value = {"-C", "-c", "--git-dir", "--work-tree", "--namespace"}
    while index < len(args):
        token = args[index]
        if token == "--":
            index += 1
            break
        if token in options_with_value:
            if index + 1 >= len(args):
                return prefix, None, []
            prefix.extend((token, args[index + 1]))
            index += 2
            continue
        if any(token.startswith(option + "=") for option in ("--git-dir", "--work-tree", "--namespace")):
            prefix.append(token)
            index += 1
            continue
        if token in ("--bare", "--no-pager", "--paginate", "--literal-pathspecs", "--no-literal-pathspecs"):
            prefix.append(token)
            index += 1
            continue
        if token.startswith("-"):
            prefix.append(token)
            index += 1
            continue
        return prefix, token, args[index + 1 :]
    return prefix, None, []


def default_branch(prefix):
    override = os.environ.get("GUARD_GIT_DEFAULT_BRANCH", "").strip()
    if override:
        return override.replace("refs/heads/", "", 1)
    code, value = run_git(prefix, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"])
    if code == 0 and value:
        return value.split("/", 1)[-1]
    for candidate in ("main", "master", "trunk"):
        local_code, _ = run_git(prefix, ["show-ref", "--verify", "--quiet", "refs/heads/" + candidate])
        remote_code, _ = run_git(prefix, ["show-ref", "--verify", "--quiet", "refs/remotes/origin/" + candidate])
        if local_code == 0 or remote_code == 0:
            return candidate
    return "main"


def current_branch(prefix):
    code, value = run_git(prefix, ["symbolic-ref", "--short", "-q", "HEAD"])
    return value if code == 0 and value else None


def branch_name(ref, remote=None):
    value = ref.lstrip("+")
    if value.startswith("refs/heads/"):
        return value[len("refs/heads/") :]
    if value.startswith("heads/"):
        return value[len("heads/") :]
    if value.startswith("refs/remotes/"):
        pieces = value.split("/", 3)
        return pieces[3] if len(pieces) == 4 else value
    if remote and value.startswith(remote + "/"):
        return value[len(remote) + 1 :]
    return value


def refspec_destination(refspec, delete_mode=False, remote=None):
    value = refspec.lstrip("+")
    if value.startswith("^"):
        return None
    if delete_mode and ":" not in value:
        return branch_name(value, remote)
    if ":" in value:
        destination = value.split(":", 1)[1]
        return branch_name(destination, remote) if destination else None
    return branch_name(value, remote)


def is_default(destination, default):
    return destination == default or destination == "refs/heads/" + default


def configured_remote(prefix, branch, explicit):
    if explicit:
        return explicit
    if branch:
        for key in ("branch.%s.pushRemote" % branch, "remote.pushDefault", "branch.%s.remote" % branch):
            code, value = run_git(prefix, ["config", "--get", key])
            if code == 0 and value and value != ".":
                return value
    return "origin"


def implicit_destinations(prefix, remote, default):
    code, configured = run_git(prefix, ["config", "--get-all", "remote.%s.push" % remote])
    if code == 0 and configured:
        destinations = []
        for refspec in configured.splitlines():
            destination = refspec_destination(refspec, remote=remote)
            if destination is None:
                return None
            destinations.append(destination)
        return destinations

    branch = current_branch(prefix)
    code, mode = run_git(prefix, ["config", "--get", "push.default"])
    if code != 0 or not mode:
        mode = "simple"
    if mode == "nothing":
        return []
    if mode == "current":
        return [branch] if branch else None
    if mode in ("upstream", "simple"):
        if not branch:
            return None
        code, upstream = run_git(prefix, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"])
        if code != 0 or not upstream:
            return None
        return [branch_name(upstream, remote)]
    if mode == "matching":
        code, branches = run_git(prefix, ["for-each-ref", "--format=%(refname:short)", "refs/heads"])
        if code != 0 or not branches:
            return None
        return branches.splitlines()
    return None


def inspect_push(prefix, args):
    default = default_branch(prefix)
    force = False
    delete_mode = False
    all_mode = False
    mirror_mode = False
    tags_mode = False
    remote_option = None
    positional = []
    index = 0
    value_options = {"--repo", "--receive-pack", "--exec", "-o", "--push-option"}
    while index < len(args):
        token = args[index]
        if token == "--":
            positional.extend(args[index + 1 :])
            break
        if token == "-f" or token.startswith("--force") or (token.startswith("-") and not token.startswith("--") and "f" in token[1:]):
            force = True
        if token in ("-d", "--delete"):
            delete_mode = True
        if token == "--all":
            all_mode = True
        if token == "--mirror":
            mirror_mode = True
        if token == "--tags":
            tags_mode = True
        if token in value_options:
            if token == "--repo" and index + 1 < len(args):
                remote_option = args[index + 1]
            index += 2
            continue
        if token.startswith("--repo="):
            remote_option = token.split("=", 1)[1]
            index += 1
            continue
        if any(token.startswith(option + "=") for option in ("--receive-pack", "--exec", "--push-option")):
            index += 1
            continue
        if token.startswith("-"):
            index += 1
            continue
        positional.append(token)
        index += 1

    if force:
        deny("force pushes are forbidden")

    if remote_option is not None:
        explicit_remote = remote_option
        refspecs = positional
    else:
        explicit_remote = positional[0] if positional else None
        refspecs = positional[1:] if positional else []
    branch = current_branch(prefix)
    remote = configured_remote(prefix, branch, explicit_remote)

    if delete_mode and remote_option is None and len(positional) == 1:
        if is_default(branch_name(positional[0]), default):
            deny("deletion of default branch '%s' is forbidden" % default)

    if mirror_mode:
        deny("mirror pushes cannot prove all destinations are non-default")
    if all_mode:
        code, branches = run_git(prefix, ["for-each-ref", "--format=%(refname:short)", "refs/heads"])
        if code != 0 or not branches:
            deny("--all push destinations could not be resolved")
        destinations = branches.splitlines()
    elif refspecs:
        destinations = []
        for refspec in refspecs:
            destination = refspec_destination(refspec, delete_mode=delete_mode, remote=remote)
            if destination is None:
                deny("push destination could not be resolved")
            destinations.append(destination)
    elif tags_mode:
        deny("implicit --tags push destinations cannot be proven branch-safe")
    else:
        destinations = implicit_destinations(prefix, remote, default)
        if destinations is None:
            deny("implicit push destinations could not be resolved")

    for destination in destinations:
        if is_default(destination, default):
            deny("push to default branch '%s' is forbidden" % default)


def inspect_git(args, depth=0):
    if depth > 10:
        deny("git alias expansion exceeded the safety limit")
    prefix, subcommand, rest = parse_git_prefix(args)
    if not subcommand:
        return

    code, alias = run_git(prefix, ["config", "--get", "alias." + subcommand])
    if code == 0 and alias:
        if alias.startswith("!"):
            inspect_shell_alias(alias[1:])
            return
        try:
            expanded = shlex.split(alias, posix=True) + rest
        except ValueError:
            deny("git alias '%s' could not be parsed" % subcommand)
        inspect_git(prefix + expanded, depth + 1)
        return

    if subcommand == "push":
        inspect_push(prefix, rest)
    elif subcommand == "commit":
        branch = current_branch(prefix)
        if branch is None:
            deny("git commit is forbidden on detached HEAD")
        default = default_branch(prefix)
        if branch == default:
            deny("git commit is forbidden on default branch '%s'" % default)


def inspect_shell_alias(value):
    for segment in split_segments(value):
        tokens = shell_tokens(segment)
        for index, token in enumerate(tokens):
            executable = os.path.basename(token)
            if executable == "git":
                inspect_git(tokens[index + 1 :])
            elif executable == "gh":
                tail = tokens[index + 1 :]
                if "pr" in tail and "merge" in tail[tail.index("pr") + 1 :]:
                    deny("gh pr merge is forbidden")


def inspect_command(value, depth=0):
    if depth > 10:
        deny("nested shell inspection exceeded the safety limit")
    if ("$(" in value or "`" in value) and re.search(r"(^|[^A-Za-z0-9_])(git|gh)([^A-Za-z0-9_]|$)", value):
        deny("git or gh inside command substitution cannot be proven safe")
    git_context = []
    logical_cwd = os.getcwd()
    for segment in split_segments(value):
        tokens = shell_tokens(segment)
        executable, args = unwrap(tokens)
        if executable == "cd":
            if len(args) == 1 and args[0] not in ("-", "--"):
                target = os.path.expanduser(args[0])
                if not os.path.isabs(target):
                    target = os.path.join(logical_cwd, target)
                logical_cwd = os.path.normpath(target)
                git_context = ["-C", logical_cwd]
            else:
                git_context = ["-C", "__guard_git_unresolved_directory__"]
        elif executable == "git":
            inspect_git(git_context + args)
        elif executable == "gh":
            try:
                pr_index = args.index("pr")
                merge_index = args.index("merge", pr_index + 1)
            except ValueError:
                continue
            if merge_index > pr_index:
                deny("gh pr merge is forbidden")

        for index, token in enumerate(tokens):
            nested_executable = os.path.basename(token)
            if nested_executable == "git" and not (executable == "git" and index == 0):
                inspect_git(tokens[index + 1 :])
            elif nested_executable == "gh" and not (executable == "gh" and index == 0):
                tail = tokens[index + 1 :]
                if "pr" in tail and "merge" in tail[tail.index("pr") + 1 :]:
                    deny("gh pr merge is forbidden")
            elif nested_executable in {"bash", "dash", "ksh", "sh", "zsh"}:
                shell_args = tokens[index + 1 :]
                for command_index, shell_arg in enumerate(shell_args):
                    is_command_flag = shell_arg == "-c" or bool(re.fullmatch(r"-[^-]*c[^-]*", shell_arg))
                    if is_command_flag and command_index + 1 < len(shell_args):
                        inspect_command(shell_args[command_index + 1], depth + 1)
                        break
            elif nested_executable == "eval":
                inspect_command(" ".join(tokens[index + 1 :]), depth + 1)


inspect_command(command)
raise SystemExit(0)
PY
