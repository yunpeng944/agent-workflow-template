#!/usr/bin/env bash
# 扫描 AGENTS.md / README.md / docs/**.md 中路径引用，报告不存在的路径。
# Shell adapter，对齐 adapters/node/check_refs.mjs 的 path-ref 部分。
# 不实现项目特异的 CLI 命令扫描（universal contract 之外，由下游 lane 自加）。
# 依赖：bash 4+ / jq / awk / realpath。共用 agents-md.config.json 真源。

set -euo pipefail

ROOT="$(cd "${AGENTS_MD_ROOT:-$(dirname "$0")/../..}" && pwd)"
CONFIG="$ROOT/agents-md.config.json"

readarray -t KNOWN < <(jq -r '.knownPrefixes[]' "$CONFIG")
readarray -t RUNTIME < <(jq -r '.runtimePrefixes[]' "$CONFIG")
readarray -t GENERATED < <(jq -r '.generatedPrefixes[]' "$CONFIG")
readarray -t ABSENT < <(jq -r '.intentionallyAbsentRefs[]' "$CONFIG")
readarray -t EXCLUDE < <(jq -r '.scanExcludeDirs // [] | .[]' "$CONFIG")

starts_with_any() {
  local s="$1" p
  shift
  for p in "$@"; do
    [[ -z "$p" ]] && continue
    [[ "$s" == "$p"* ]] && return 0
  done
  return 1
}

is_excluded_dir() {
  local rel="$1" p
  for p in "${EXCLUDE[@]+"${EXCLUDE[@]}"}"; do
    [[ -z "$p" ]] && continue
    [[ "$rel" == "$p" || "$rel" == "$p"/* ]] && return 0
  done
  return 1
}

# Collect markdown files: AGENTS.md, README.md, docs/**.md (skip excludes).
files=()
[[ -f "$ROOT/AGENTS.md" ]] && files+=("$ROOT/AGENTS.md")
[[ -f "$ROOT/README.md" ]] && files+=("$ROOT/README.md")
if [[ -d "$ROOT/docs" ]]; then
  while IFS= read -r -d '' f; do
    rel="${f#"$ROOT"/}"
    parent="$(dirname "$rel")"
    is_excluded_dir "$parent" || files+=("$f")
  done < <(find "$ROOT/docs" -type f -name '*.md' -print0 | sort -z)
fi

# Extract refs from one file: each output line is "<path>\t<source>".
extract_refs() {
  local file="$1"
  local rel="${file#"$ROOT"/}"
  local source_dir
  source_dir="$(dirname "$file")"
  awk -v source="$rel" -v source_dir="$source_dir" -v root="$ROOT" \
      -v known="$(IFS='|'; echo "${KNOWN[*]+"${KNOWN[*]}"}")" '
  BEGIN {
    n_known = split(known, kn, "|")
  }
  {
    s = $0
    while (match(s, /`[^`]+`/)) {
      ref = substr(s, RSTART + 1, RLENGTH - 2)
      s = substr(s, RSTART + RLENGTH)
      if (!index(ref, "/")) continue
      if (index(ref, "*") || index(ref, "<") || index(ref, " ")) continue
      for (i = 1; i <= n_known; i++) {
        if (kn[i] != "" && index(ref, kn[i]) == 1) { print ref "\t" source; break }
      }
    }
    s = $0
    while (match(s, /\[[^]]*\]\([^)[:space:]]+\)/)) {
      seg = substr(s, RSTART, RLENGTH)
      s = substr(s, RSTART + RLENGTH)
      paren = index(seg, "(")
      raw = substr(seg, paren + 1, length(seg) - paren - 1)
      hash = index(raw, "#")
      if (hash > 0) raw = substr(raw, 1, hash - 1)
      if (raw == "") continue
      if (substr(raw, 1, 1) == "/") continue
      if (match(raw, /^[a-zA-Z][a-zA-Z0-9+.\-]*:/)) continue
      cmd = "realpath --relative-to=\"" root "\" -m \"" source_dir "/" raw "\""
      cmd | getline norm
      close(cmd)
      if (norm == "" || substr(norm, 1, 2) == "..") continue
      print norm "\t" source
    }
  }
  ' "$file"
}

# Dedup by path, keep first source.
declare -A first_source
order=()
while IFS=$'\t' read -r path source; do
  [[ -z "$path" ]] && continue
  if [[ -z "${first_source[$path]+x}" ]]; then
    first_source["$path"]="$source"
    order+=("$path")
  fi
done < <(for f in "${files[@]+"${files[@]}"}"; do extract_refs "$f"; done)

dead_paths=()
dead_sources=()
for path in "${order[@]+"${order[@]}"}"; do
  if starts_with_any "$path" "${RUNTIME[@]+"${RUNTIME[@]}"}" \
    || starts_with_any "$path" "${GENERATED[@]+"${GENERATED[@]}"}"; then
    continue
  fi
  in_absent=0
  for a in "${ABSENT[@]+"${ABSENT[@]}"}"; do
    [[ "$path" == "$a" ]] && in_absent=1 && break
  done
  (( in_absent )) && continue
  [[ -e "$ROOT/$path" ]] || { dead_paths+=("$path"); dead_sources+=("${first_source[$path]}"); }
done

if (( ${#dead_paths[@]} == 0 )); then
  echo "Markdown reference check PASSED — ${#order[@]} path refs checked, 0 dead."
  exit 0
fi

{
  echo "Markdown reference check FAILED — ${#dead_paths[@]} dead ref(s):"
  echo ""
  for i in "${!dead_paths[@]}"; do
    echo "  DEAD: ${dead_paths[$i]} (referenced by ${dead_sources[$i]})"
  done
} >&2
exit 1
