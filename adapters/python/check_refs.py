#!/usr/bin/env python3
"""扫描 AGENTS.md / README.md / docs/**.md 中的路径引用，报告不存在的路径。

Python adapter，对齐 adapters/node/check_refs.mjs 的 path-ref 部分。
不实现项目特异的 CLI 命令扫描（universal contract 之外，由下游 lane 自加）。
共用 agents-md.config.json 真源；仅依赖 Python 3 标准库。
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(os.environ["AGENTS_MD_ROOT"]).resolve() if os.environ.get("AGENTS_MD_ROOT") else Path(__file__).resolve().parents[2]
CONFIG = json.loads((ROOT / "agents-md.config.json").read_text(encoding="utf-8"))
KNOWN_PREFIXES: list[str] = CONFIG["knownPrefixes"]
RUNTIME_PREFIXES: list[str] = CONFIG["runtimePrefixes"]
GENERATED_PREFIXES: list[str] = CONFIG["generatedPrefixes"]
INTENTIONALLY_ABSENT_REFS: set[str] = set(CONFIG["intentionallyAbsentRefs"])
SCAN_EXCLUDE_DIRS: list[str] = CONFIG.get("scanExcludeDirs", [])

BACKTICK_RE = re.compile(r"`([^`]+)`")
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
SCHEME_RE = re.compile(r"^[a-z][a-z0-9+.\-]*:", re.IGNORECASE)


def is_path_ref(ref: str) -> bool:
    if "/" not in ref:
        return False
    if "*" in ref or "<" in ref:
        return False
    if " " in ref:
        return False
    return any(ref.startswith(p) for p in KNOWN_PREFIXES)


def normalize_link(source_dir: Path, target: str) -> str | None:
    hash_idx = target.find("#")
    path = target[:hash_idx] if hash_idx >= 0 else target
    if not path:
        return None
    if SCHEME_RE.match(path):
        return None
    if path.startswith("/"):
        return None
    abs_path = (source_dir / path).resolve()
    try:
        rel = abs_path.relative_to(ROOT)
    except ValueError:
        return None
    return rel.as_posix()


def collect_markdown_files() -> list[Path]:
    files: list[Path] = [ROOT / "AGENTS.md", ROOT / "README.md"]
    docs_dir = ROOT / "docs"
    if docs_dir.exists():
        for path in sorted(docs_dir.rglob("*.md")):
            rel = path.relative_to(ROOT).as_posix()
            if any(rel == p or rel.startswith(p + "/") for p in SCAN_EXCLUDE_DIRS):
                continue
            # Also skip if any parent dir is in exclude list
            parent_rel = path.parent.relative_to(ROOT).as_posix()
            if any(parent_rel == p or parent_rel.startswith(p + "/") for p in SCAN_EXCLUDE_DIRS):
                continue
            files.append(path)
    return [f for f in files if f.exists() and f.is_file()]


def extract_refs(file_path: Path) -> list[tuple[str, str]]:
    md = file_path.read_text(encoding="utf-8")
    source = file_path.relative_to(ROOT).as_posix()
    source_dir = file_path.parent
    refs: list[tuple[str, str]] = []
    for match in BACKTICK_RE.finditer(md):
        ref = match.group(1)
        if is_path_ref(ref):
            refs.append((ref, source))
    for match in LINK_RE.finditer(md):
        normalized = normalize_link(source_dir, match.group(1))
        if normalized is not None:
            refs.append((normalized, source))
    return refs


def should_check_existence(path: str) -> bool:
    if any(path.startswith(p) for p in RUNTIME_PREFIXES):
        return False
    if any(path.startswith(p) for p in GENERATED_PREFIXES):
        return False
    if path in INTENTIONALLY_ABSENT_REFS:
        return False
    return True


def main() -> int:
    unique: dict[str, str] = {}
    for file_path in collect_markdown_files():
        for path, source in extract_refs(file_path):
            unique.setdefault(path, source)

    dead = [
        (path, source)
        for path, source in unique.items()
        if should_check_existence(path) and not (ROOT / path).exists()
    ]

    if dead:
        print(f"Markdown reference check FAILED — {len(dead)} dead ref(s):\n", file=sys.stderr)
        for path, source in dead:
            print(f"  DEAD: {path} (referenced by {source})", file=sys.stderr)
        return 1
    print(f"Markdown reference check PASSED — {len(unique)} path refs checked, 0 dead.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
