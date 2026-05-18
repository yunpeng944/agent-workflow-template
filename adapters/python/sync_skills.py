#!/usr/bin/env python3
"""读 skills/<name>.md 真源 → 生成 .claude/skills/ 与 .agents/skills/ 镜像。

Python adapter，行为等价于 adapters/node/sync_skills.mjs。
--check 模式仅校验产物与真源一致，不写入。
共用 agents-md.config.json 真源；frontmatter 手工解析，零 pip 依赖。
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(os.environ["AGENTS_MD_ROOT"]).resolve() if os.environ.get("AGENTS_MD_ROOT") else Path(__file__).resolve().parents[2]
CONFIG = json.loads((ROOT / "agents-md.config.json").read_text(encoding="utf-8"))
MIRROR_ROOTS: list[str] = CONFIG["mirrorRoots"]

KEBAB_CASE_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
GENERATED_HEADER = "<!-- generated · do not edit · source:"


def parse_frontmatter(content: str) -> tuple[dict[str, str], str, str]:
    """解析 YAML 风格 frontmatter；同时保留 frontmatter 块字面量供 verbatim 透传。

    返回：(parsed_data, frontmatter_block_verbatim, body_after_frontmatter)
    frontmatter_block 含起始和结束的 ``---`` 行。
    """
    if not content.startswith("---\n"):
        return {}, "", content
    end = content.find("\n---\n", 4)
    if end < 0:
        return {}, "", content
    fm_text = content[4:end]
    frontmatter_block = content[: end + len("\n---")]
    body = content[end + 5 :]
    data: dict[str, str] = {}
    for line in fm_text.split("\n"):
        if ":" in line:
            key, _, value = line.partition(":")
            data[key.strip()] = value.strip()
    return data, frontmatter_block, body


def normalize_body(body: str) -> str:
    if body.startswith("\n"):
        body = body[1:]
    return body.replace("\r\n", "\n").rstrip("\n")


def validate_skill(source_path: str, stem: str, data: dict[str, str]) -> None:
    failures: list[str] = []
    name = data.get("name")
    description = data.get("description")

    if not isinstance(name, str) or not name.strip():
        failures.append("name is required")
    else:
        if name != name.strip():
            failures.append("name must not contain leading or trailing whitespace")
        if not KEBAB_CASE_RE.match(name):
            failures.append("name must be kebab-case")
        if name != stem:
            failures.append(f'name must match filename stem "{stem}"')

    if not isinstance(description, str) or not description.strip():
        failures.append("description is required")
    else:
        if description != description.strip():
            failures.append("description must not contain leading or trailing whitespace")
        if len(description) > 500:
            failures.append(f"description must be <= 500 chars, got {len(description)}")

    if failures:
        raise ValueError(f"{source_path}: {'; '.join(failures)}")


def read_skill_sources() -> list[dict[str, str]]:
    skills_dir = ROOT / "skills"
    if not skills_dir.exists():
        raise FileNotFoundError("skills/: directory not found")

    entries = sorted(
        path
        for path in skills_dir.iterdir()
        if path.is_file() and path.suffix == ".md" and path.name != "README.md"
    )
    if not entries:
        raise FileNotFoundError("skills/: no skill source files found")

    skills: list[dict[str, str]] = []
    for path in entries:
        source_rel = path.relative_to(ROOT).as_posix()
        stem = path.stem
        data, frontmatter_block, body = parse_frontmatter(path.read_text(encoding="utf-8"))
        validate_skill(source_rel, stem, data)
        normalized = normalize_body(body)
        generated = (
            f"{frontmatter_block}\n"
            "\n"
            f"{GENERATED_HEADER} {source_rel} -->\n"
            "\n"
            f"{normalized}\n"
        )
        skills.append({"name": data["name"], "source": source_rel, "generated": generated})
    return skills


def target_paths(name: str) -> list[Path]:
    return [ROOT / mirror_root / name / "SKILL.md" for mirror_root in MIRROR_ROOTS]


def write_mirrors(skills: list[dict[str, str]]) -> None:
    for skill in skills:
        for target in target_paths(skill["name"]):
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(skill["generated"], encoding="utf-8")


def check_mirrors(skills: list[dict[str, str]]) -> list[str]:
    mismatches: list[str] = []
    for skill in skills:
        for target in target_paths(skill["name"]):
            rel = target.relative_to(ROOT).as_posix()
            if not target.exists():
                mismatches.append(f"{rel} missing")
                continue
            actual = target.read_text(encoding="utf-8")
            if actual != skill["generated"]:
                mismatches.append(f"{rel} diverges from {skill['source']}")
    return mismatches


def main() -> int:
    args = sys.argv[1:]
    check_mode = "--check" in args
    extras = [arg for arg in args if arg != "--check"]
    if extras:
        print(f"unknown arguments: {' '.join(extras)}", file=sys.stderr)
        return 1

    try:
        skills = read_skill_sources()
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    if check_mode:
        mismatches = check_mirrors(skills)
        if mismatches:
            print("sync-skills check FAILED:", file=sys.stderr)
            for mismatch in mismatches:
                print(f"  {mismatch}", file=sys.stderr)
            return 1
        print("sync-skills check PASSED")
        return 0

    write_mirrors(skills)
    count = len(skills) * len(MIRROR_ROOTS)
    print(f"sync-skills wrote {count} mirror files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
