#!/usr/bin/env bash
# 校验 AGENTS.md 二级标题集合 + 顺序 + 章节行预算。
# Shell adapter，行为等价于 scripts/check-agents-structure.mjs。
# 依赖：bash 4+ / jq / awk。共用 agents-md.config.json 真源。

set -euo pipefail

ROOT="$(cd "${AGENTS_MD_ROOT:-$(dirname "$0")/../..}" && pwd)"
CONFIG="$ROOT/agents-md.config.json"
AGENTS_MD="$ROOT/AGENTS.md"

expected=$(jq -r '.expectedHeadings[]' "$CONFIG")
limits=$(jq -r '.sectionLineLimits | to_entries[] | "\(.key)\t\(.value)"' "$CONFIG")
# Node 的 totalLines = split('\n').length，等价于 (wc -l) + 1（含末尾空串占位）。
total_lines=$(( $(wc -l < "$AGENTS_MD") + 1 ))

awk -v expected="$expected" -v limits="$limits" -v total_lines="$total_lines" '
BEGIN {
  n_exp = split(expected, exp_arr, "\n")
  if (n_exp > 0 && exp_arr[n_exp] == "") n_exp--
  n_lim = split(limits, lim_lines, "\n")
  for (i = 1; i <= n_lim; i++) {
    if (lim_lines[i] == "") continue
    pos = index(lim_lines[i], "\t")
    if (pos == 0) continue
    lim_map[substr(lim_lines[i], 1, pos - 1)] = substr(lim_lines[i], pos + 1) + 0
  }
}
/^## / {
  title = substr($0, 4)
  sub(/[ \t\r]+$/, "", title)
  n_head++
  headings[n_head] = title
  head_line[n_head] = NR - 1
}
END {
  nf = 0
  if (n_head != n_exp) failures[++nf] = sprintf("expected %d ## headings, found %d", n_exp, n_head)
  max_len = (n_head > n_exp) ? n_head : n_exp
  for (i = 1; i <= max_len; i++) {
    act = (i <= n_head) ? headings[i] : "<missing>"
    expt = (i <= n_exp) ? exp_arr[i] : "<missing>"
    if (act != expt) failures[++nf] = sprintf("heading %d: expected \"%s\", found \"%s\"", i, expt, act)
  }
  for (i = 1; i <= n_head; i++) {
    t = headings[i]
    if (!(t in lim_map)) continue
    end = (i < n_head) ? head_line[i+1] : total_lines
    len = end - head_line[i]
    if (len > lim_map[t]) failures[++nf] = sprintf("section \"%s\" exceeds line budget: %d > %d", t, len, lim_map[t])
  }
  if (nf == 0) {
    print "AGENTS.md structure check PASSED"
    exit 0
  }
  print "AGENTS.md structure check FAILED:" > "/dev/stderr"
  print "" > "/dev/stderr"
  for (i = 1; i <= nf; i++) print "  " failures[i] > "/dev/stderr"
  exit 1
}
' "$AGENTS_MD"
