#!/usr/bin/env bash
# agent-workflow-template — multi-adapter 调度脚本（zero-dep POSIX bash）
#
# 用法:
#   ./tasks.sh <target>                            # 默认 ADAPTER=shell
#   ADAPTER=python  ./tasks.sh <target>            # 切 python lane
#   ADAPTER=node    ./tasks.sh <target>            # 切 node lane
#
# Target:
#   validate            check-structure + check-refs + sync-skills-check
#   check-structure     AGENTS.md heading / line-budget lint
#   check-refs          markdown path-ref existence
#   sync-skills         regenerate .claude/skills + .agents/skills mirrors
#   sync-skills-check   verify mirrors are in sync (no write)
#   parity              [optional · needs Node 22+] cross-adapter parity test
#   help                show this help
#
# 行为契约见 adapters/README.md；wf-* skill 选择见 docs/workflows.md。

set -euo pipefail

ADAPTER="${ADAPTER:-shell}"
PYTHON="${PYTHON:-python3}"
NODE="${NODE:-node}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

case "$ADAPTER" in
  shell)
    RUN_STRUCT=(bash adapters/shell/check_structure.sh)
    RUN_REFS=(bash adapters/shell/check_refs.sh)
    RUN_SYNC=(bash adapters/shell/sync_skills.sh)
    ;;
  python)
    RUN_STRUCT=("$PYTHON" adapters/python/check_structure.py)
    RUN_REFS=("$PYTHON" adapters/python/check_refs.py)
    RUN_SYNC=("$PYTHON" adapters/python/sync_skills.py)
    ;;
  node)
    RUN_STRUCT=("$NODE" adapters/node/check_structure.mjs)
    RUN_REFS=("$NODE" adapters/node/check_refs.mjs)
    RUN_SYNC=("$NODE" adapters/node/sync_skills.mjs)
    ;;
  *)
    echo "Unknown ADAPTER='$ADAPTER'; use shell|python|node" >&2
    exit 1
    ;;
esac

target="${1:-help}"

case "$target" in
  help|-h|--help)
    cat <<'EOF'
agent-workflow-template — multi-adapter 调度脚本（zero-dep POSIX bash）

用法:
  ./tasks.sh <target>                            # 默认 ADAPTER=shell
  ADAPTER=python  ./tasks.sh <target>            # 切 python lane
  ADAPTER=node    ./tasks.sh <target>            # 切 node lane

Target:
  validate            check-structure + check-refs + sync-skills-check
  check-structure     AGENTS.md heading / line-budget lint
  check-refs          markdown path-ref existence
  sync-skills         regenerate .claude/skills + .agents/skills mirrors
  sync-skills-check   verify mirrors are in sync (no write)
  parity              [optional · needs Node 22+] cross-adapter parity test
  help                show this help

行为契约见 adapters/README.md；wf-* skill 选择见 docs/workflows.md。
EOF
    ;;
  check-structure)
    "${RUN_STRUCT[@]}"
    ;;
  check-refs)
    "${RUN_REFS[@]}"
    ;;
  sync-skills)
    "${RUN_SYNC[@]}"
    ;;
  sync-skills-check)
    "${RUN_SYNC[@]}" --check
    ;;
  validate)
    "${RUN_STRUCT[@]}"
    "${RUN_REFS[@]}"
    "${RUN_SYNC[@]}" --check
    echo "✓ ./tasks.sh validate passed (ADAPTER=$ADAPTER)"
    ;;
  parity)
    "$NODE" --test tools/adapter-parity.test.mjs
    ;;
  *)
    echo "Unknown target: $target" >&2
    echo "Run './tasks.sh help' to list targets." >&2
    exit 1
    ;;
esac
