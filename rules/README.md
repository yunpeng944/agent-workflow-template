# Rules — Optional Task Constraints for wf-relay / wf-parallel

This directory holds optional rule files you can attach to `/wf-relay` or `/wf-parallel` invocations via the `@` syntax:

```
/wf-relay codex @rules/security.md <task>
/wf-parallel claude-codex @rules/review.md <task>
```

The host (Claude Code / Codex CLI) reads the file natively and includes its content in the dispatch prompt. The skill itself doesn't need any special handling.

## Available Rules

| File | When to use |
|---|---|
| `base.md` | Universal coding hygiene (file verification, scope discipline, validate) — apply to most coding tasks |
| `security.md` | Auth / token / credential / state file / cross-trust boundary changes |
| `refactor.md` | Large refactors (≥ 3 modules / ≥ 5 files / public API changes) |
| `review.md` | Reviewing external code / PRs / commits you didn't author |
| `research.md` | Open exploration / probes / technology selection without clear criteria |
| `debug.md` | Regression / CI red / known failing test diagnosis |

## Composing Rules

Stack multiple rules with multiple `@` references:

```
/wf-relay codex @rules/base.md @rules/security.md <task>
```

Each rule file is self-contained and explicitly references base.md when applicable—so stacking won't cause contradictions, but the executor will see all rules concatenated.

## Writing New Rules

Format guidelines:
- Open with `# <Name> Rules — <one-line use case>`
- Reference base.md if your rules extend it
- Group rules in `##` sections by theme
- Each rule is a single bullet—machine-checkable when possible (grep / counts / exit codes)
- Avoid prose; write directives
- 30-60 lines per file (keep concise so executor reads them in full)
- No stage prompts (that's the skill's job)
- No workflow descriptions (rules describe constraints, not how to orchestrate)

## What's NOT a Rule File

These are skill-level concerns, not rules:
- Stage topology (PLANNER → IMPLEMENTER → REVIEWER) — that's in `skills/wf-*.md`
- Multi-model dispatch mechanics — see `docs/workflows.md`
- Project-specific contracts / paths / commands — those go in AGENTS.md
