#!/usr/bin/env bash
# agent-workflow-template — 调度脚本（zero-dep POSIX bash · 直调 Node lane）
#
# 用法:
#   ./tasks.sh <target>
#
# Target:
#   validate            test + check-structure + check-refs + sync-skills-check
#   test                run adapter unit tests (node --test, zero-dep)
#   check-structure     AGENTS.md heading / line-budget lint
#   check-refs          markdown path-ref existence
#   sync-skills         regenerate .claude/skills + .agents/skills mirrors
#   sync-skills-check   verify mirrors are in sync (no write)
#   help                show this help
#
# 行为契约见 adapters/README.md；wf-* skill 真源见 skills/。

set -euo pipefail

NODE="${NODE:-node}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

target="${1:-help}"

case "$target" in
  help|-h|--help)
    cat <<'EOF'
agent-workflow-template — 调度脚本（zero-dep POSIX bash · 直调 Node lane）

用法:
  ./tasks.sh <target>

Target:
  validate            test + check-structure + check-refs + sync-skills-check
  test                run adapter unit tests (node --test, zero-dep)
  check-structure     AGENTS.md heading / line-budget lint
  check-refs          markdown path-ref existence
  sync-skills         regenerate .claude/skills + .agents/skills mirrors
  sync-skills-check   verify mirrors are in sync (no write)
  help                show this help

行为契约见 adapters/README.md；wf-* skill 真源见 skills/。
EOF
    ;;
  check-structure)
    "$NODE" adapters/node/check_structure.mjs
    ;;
  check-refs)
    "$NODE" adapters/node/check_refs.mjs
    ;;
  sync-skills)
    "$NODE" adapters/node/sync_skills.mjs
    ;;
  sync-skills-check)
    "$NODE" adapters/node/sync_skills.mjs --check
    ;;
  test)
    "$NODE" --test adapters/node/*.test.mjs
    ;;
  validate)
    "$NODE" --test adapters/node/*.test.mjs
    "$NODE" adapters/node/check_structure.mjs
    "$NODE" adapters/node/check_refs.mjs
    "$NODE" adapters/node/sync_skills.mjs --check
    echo "✓ ./tasks.sh validate passed"
    ;;
  *)
    echo "Unknown target: $target" >&2
    echo "Run './tasks.sh help' to list targets." >&2
    exit 1
    ;;
esac
