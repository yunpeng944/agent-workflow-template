#!/usr/bin/env bash
# 读 skills/<name>.md 真源 → 生成 .claude/skills/ 与 .agents/skills/ 镜像。
# Shell adapter，行为等价于 adapters/node/sync_skills.mjs。
# --check 模式仅校验产物与真源一致，不写入。
# 依赖：bash 4+ / jq / awk。共用 agents-md.config.json 真源。

set -euo pipefail

ROOT="$(cd "${AGENTS_MD_ROOT:-$(dirname "$0")/../..}" && pwd)"
CONFIG="$ROOT/agents-md.config.json"
readarray -t MIRROR_ROOTS < <(jq -r '.mirrorRoots[]' "$CONFIG")

CHECK_MODE=0
unknown=()
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_MODE=1 ;;
    *) unknown+=("$arg") ;;
  esac
done
if (( ${#unknown[@]} > 0 )); then
  echo "unknown arguments: ${unknown[*]}" >&2
  exit 1
fi

KEBAB_RE='^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
HEADER_PREFIX='<!-- generated · do not edit · source:'

skills_dir="$ROOT/skills"
if [[ ! -d "$skills_dir" ]]; then
  echo "skills/: directory not found" >&2
  exit 1
fi

mapfile -t skill_files < <(find "$skills_dir" -maxdepth 1 -type f -name '*.md' ! -name 'README.md' | sort)
if (( ${#skill_files[@]} == 0 )); then
  echo "skills/: no skill source files found" >&2
  exit 1
fi

# Parse frontmatter scalars (name, description) + extract verbatim frontmatter block + body.
# Sets globals: NAME / DESC / FM_BLOCK / BODY.
# FM_BLOCK 含起始和结束的 `---` 行，用于 verbatim 透传额外字段（如 disable-model-invocation）。
parse_skill() {
  local file="$1"
  local fm fm_block body
  fm=$(awk 'NR==1 && $0=="---" { in_fm=1; next } in_fm && $0=="---" { exit } in_fm { print }' "$file")
  fm_block=$(awk 'NR==1 && $0=="---" { in_fm=1; print; next }
                  in_fm && $0=="---" { print; exit }
                  in_fm { print }' "$file")
  body=$(awk 'state==2 { print; next }
              NR==1 && $0=="---" { state=1; next }
              state==1 && $0=="---" { state=2 }' "$file")
  NAME=""
  DESC=""
  while IFS= read -r line; do
    case "$line" in
      name:*)
        NAME="${line#name:}"; NAME="${NAME# }"; NAME="${NAME% }" ;;
      description:*)
        DESC="${line#description:}"; DESC="${DESC# }"; DESC="${DESC% }" ;;
    esac
  done <<< "$fm"
  body="${body//$'\r\n'/$'\n'}"
  [[ "${body:0:1}" == $'\n' ]] && body="${body:1}"
  FM_BLOCK="$fm_block"
  BODY="$body"
}

validate_skill() {
  local source="$1" stem="$2"
  local fails=()
  if [[ -z "$NAME" ]]; then
    fails+=("name is required")
  else
    [[ "$NAME" != "${NAME## }" || "$NAME" != "${NAME%% }" ]] && fails+=("name must not contain leading or trailing whitespace")
    [[ "$NAME" =~ $KEBAB_RE ]] || fails+=("name must be kebab-case")
    [[ "$NAME" == "$stem" ]] || fails+=("name must match filename stem \"$stem\"")
  fi
  if [[ -z "$DESC" ]]; then
    fails+=("description is required")
  else
    [[ "$DESC" != "${DESC## }" || "$DESC" != "${DESC%% }" ]] && fails+=("description must not contain leading or trailing whitespace")
    (( ${#DESC} > 500 )) && fails+=("description must be <= 500 chars, got ${#DESC}")
  fi
  if (( ${#fails[@]} > 0 )); then
    local joined=""
    for f in "${fails[@]}"; do
      [[ -n "$joined" ]] && joined+="; "
      joined+="$f"
    done
    echo "$source: $joined" >&2
    return 1
  fi
}

build_generated() {
  local fm_block="$1" body="$2" stem="$3"
  printf '%s\n\n%s skills/%s.md -->\n\n%s\n' \
    "$fm_block" "$HEADER_PREFIX" "$stem" "$body"
}

mismatches=()
written=0
for file in "${skill_files[@]}"; do
  stem="$(basename "$file" .md)"
  source_rel="skills/$stem.md"
  parse_skill "$file"
  validate_skill "$source_rel" "$stem" || exit 1
  generated=$(build_generated "$FM_BLOCK" "$BODY" "$stem")
  for mr in "${MIRROR_ROOTS[@]}"; do
    target="$ROOT/$mr/$NAME/SKILL.md"
    rel="$mr/$NAME/SKILL.md"
    if (( CHECK_MODE )); then
      if [[ ! -f "$target" ]]; then
        mismatches+=("$rel missing")
      else
        actual=$(cat "$target")
        [[ "$actual" != "$generated" ]] && mismatches+=("$rel diverges from $source_rel")
      fi
    else
      mkdir -p "$(dirname "$target")"
      printf '%s\n' "$generated" > "$target"
      written=$((written + 1))
    fi
  done
done

if (( CHECK_MODE )); then
  if (( ${#mismatches[@]} > 0 )); then
    {
      echo "sync-skills check FAILED:"
      for m in "${mismatches[@]}"; do echo "  $m"; done
    } >&2
    exit 1
  fi
  echo "sync-skills check PASSED"
  exit 0
fi
echo "sync-skills wrote $written mirror files"
