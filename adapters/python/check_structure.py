#!/usr/bin/env python3
"""校验 AGENTS.md 的二级标题集合、顺序与章节长度。

Python adapter，行为等价于 scripts/check-agents-structure.mjs。
共用 agents-md.config.json 真源；仅依赖 Python 3 标准库。
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(os.environ["AGENTS_MD_ROOT"]).resolve() if os.environ.get("AGENTS_MD_ROOT") else Path(__file__).resolve().parents[2]
CONFIG = json.loads((ROOT / "agents-md.config.json").read_text(encoding="utf-8"))
EXPECTED_HEADINGS: list[str] = CONFIG["expectedHeadings"]
SECTION_LINE_LIMITS: dict[str, int] = CONFIG["sectionLineLimits"]


def check_agents_structure(md: str) -> list[str]:
    failures: list[str] = []
    lines = md.split("\n")
    headings = [(line[3:].strip(), idx) for idx, line in enumerate(lines) if line.startswith("## ")]
    actual_titles = [title for title, _ in headings]

    if len(actual_titles) != len(EXPECTED_HEADINGS):
        failures.append(
            f"expected {len(EXPECTED_HEADINGS)} ## headings, found {len(actual_titles)}"
        )

    max_len = max(len(actual_titles), len(EXPECTED_HEADINGS))
    for i in range(max_len):
        actual = actual_titles[i] if i < len(actual_titles) else "<missing>"
        expected = EXPECTED_HEADINGS[i] if i < len(EXPECTED_HEADINGS) else "<missing>"
        if actual != expected:
            failures.append(f'heading {i + 1}: expected "{expected}", found "{actual}"')

    for idx, (title, line_idx) in enumerate(headings):
        if title not in SECTION_LINE_LIMITS:
            continue
        next_idx = headings[idx + 1][1] if idx + 1 < len(headings) else len(lines)
        length = next_idx - line_idx
        limit = SECTION_LINE_LIMITS[title]
        if length > limit:
            failures.append(f'section "{title}" exceeds line budget: {length} > {limit}')

    return failures


def main() -> int:
    md = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    failures = check_agents_structure(md)
    if failures:
        print("AGENTS.md structure check FAILED:", file=sys.stderr)
        for failure in failures:
            print(f"  {failure}", file=sys.stderr)
        return 1
    print("AGENTS.md structure check PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
